import { Request, Response } from 'express';
import youtubedl from 'youtube-dl-exec';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

interface YtDlpInfo {
  title?: string;
  thumbnail?: string;
  uploader?: string;
  channel?: string;
  duration?: number;
}

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}/;

const isValidYouTubeUrl = (url: string): boolean => YOUTUBE_URL_REGEX.test(url);

const getCookiesPath = (): string | null => {
  const secretPath = '/etc/secrets/cookies.txt';
  const localPath = path.resolve(process.cwd(), 'cookies.txt');

  let sourcePath: string | null = null;

  if (fs.existsSync(secretPath)) {
    sourcePath = secretPath;
  } else if (fs.existsSync(localPath)) {
    sourcePath = localPath;
  }

  if (!sourcePath) return null;

  const tempPath = path.join(
    os.tmpdir(),
    `cookies_${crypto.randomUUID()}.txt`
  );

  fs.copyFileSync(sourcePath, tempPath);

  return tempPath;
};

const cleanupFile = (filePath: string | null): void => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore cleanup errors
    }
  }
};

export const getMetadata = async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  let cookiesPath: string | null = getCookiesPath();

  try {
    console.log('Fetching metadata using yt-dlp for:', url);

    const options: Record<string, unknown> = {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      extractorArgs: 'youtube:player_client=web,android',
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    };

    if (cookiesPath) {
      options.cookies = cookiesPath;
      console.log('Using cookies from:', cookiesPath);
    }

    const info = await youtubedl(url, options) as YtDlpInfo;

    cleanupFile(cookiesPath);
    cookiesPath = null;

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      author: info.uploader || info.channel,
      lengthSeconds: info.duration?.toString(),
    });
  } catch (error: any) {
    console.error('Metadata Error:', error.message);
    cleanupFile(cookiesPath);
    res.status(500).json({
      error: 'Could not fetch video info. YouTube might be blocking request.'
    });
  }
};

export const downloadMp3 = async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  const tempId = Date.now().toString() + Math.floor(Math.random() * 10000).toString();
  const outputPath = path.join(os.tmpdir(), `yt_${tempId}.%(ext)s`);
  const finalFile = path.join(os.tmpdir(), `yt_${tempId}.mp3`);

  let cookiesPath: string | null = getCookiesPath();

  try {
    console.log('Initiating download via yt-dlp to temp file for:', url);

    const commonHeaders = [
      'referer:youtube.com',
      'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    // Step 1: Fetch metadata separately to get the title reliably
    // (printJson + extractAudio conflict — yt-dlp may not return JSON after ffmpeg conversion)
    const infoOptions: Record<string, unknown> = {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      extractorArgs: 'youtube:player_client=web,android',
      addHeader: commonHeaders
    };

    if (cookiesPath) {
      infoOptions.cookies = cookiesPath;
    }

    const info = await youtubedl(url, infoOptions) as YtDlpInfo;
    const title = info.title?.replace(/[^\w\s.-]/g, ' ').replace(/\s+/g, ' ').trim() || 'audio';

    // Step 2: Download and extract audio
    const downloadOptions: Record<string, unknown> = {
      format: 'bestaudio/best',
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      output: outputPath,
      ffmpegLocation: ffmpegPath || undefined,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      extractorArgs: 'youtube:player_client=web,android',
      forceIpv4: true,
      addHeader: commonHeaders
    };

    if (cookiesPath) {
      downloadOptions.cookies = cookiesPath;
      console.log('Using cookies from:', cookiesPath);
    }

    await youtubedl(url, downloadOptions);

    cleanupFile(cookiesPath);
    cookiesPath = null;

    // Verify the MP3 file exists before serving
    if (!fs.existsSync(finalFile)) {
      throw new Error(`Converted MP3 not found at expected path: ${finalFile}`);
    }

    console.log('Extraction complete. Serving file to client:', finalFile);

    res.download(finalFile, `${title}.mp3`, (err) => {
      if (err) {
        console.error('Error during file transfer:', err.message);
      } else {
        console.log('File successfully transferred to client.');
      }
      cleanupFile(finalFile);
    });
  } catch (error: any) {
    console.error('Download Error:', error.message);
    cleanupFile(cookiesPath);
    cleanupFile(finalFile);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to process YouTube stream'
      });
    }
  }
};
