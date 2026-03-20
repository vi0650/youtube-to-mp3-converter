import { Request, Response } from 'express';
import youtubedl from 'youtube-dl-exec';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

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

export const getMetadata = async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  let cookiesPath: string | null = null;

  try {
    console.log('Fetching metadata using yt-dlp for:', url);
    const options: any = {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      extractorArgs: 'youtube:player_client=web,android',
      addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36']
    };

    const cookiesPath = getCookiesPath();

    if (cookiesPath) {
      options.cookies = cookiesPath;
      console.log('Using cookies from:', cookiesPath);
    }

    const info: any = await youtubedl(url, options);

    if (cookiesPath && fs.existsSync(cookiesPath)) {
      fs.unlinkSync(cookiesPath);
    }

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      author: info.uploader || info.channel,
      lengthSeconds: info.duration?.toString(),
    });
  } catch (error: any) {
    console.error('Metadata Error:', error.message);

    if (cookiesPath && fs.existsSync(cookiesPath)) {
      fs.unlinkSync(cookiesPath);
    }

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

  const tempId = Date.now().toString() + Math.floor(Math.random() * 10000).toString();
  const outputPath = path.join(os.tmpdir(), `yt_${tempId}.%(ext)s`);
  const finalFile = path.join(os.tmpdir(), `yt_${tempId}.mp3`);

  let cookiesPath: string | null = null;

  try {
    console.log('Initiating download via yt-dlp to temp file for:', url);

    // 1. Get info to construct the final filename
    const infoOptions: any = {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      extractorArgs: 'youtube:player_client=web,android',
      addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0']
    };

    const cookiesPath = getCookiesPath();
    if (cookiesPath) {
      infoOptions.cookies = cookiesPath;
      console.log('Using cookies from:', cookiesPath);
    }

    const info: any = await youtubedl(url, infoOptions);

    const title = info.title?.replace(/[^\w\s.-]/g, ' ').replace(/\s+/g, ' ').trim() || 'audio';

    console.log('Got video metadata. Starting audio extraction for:', title);

    // 2. Download and extract audio to the temporary file
    const downloadOptions: any = {
      format: 'bestaudio/best',
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      output: outputPath,
      ffmpegLocation: ffmpegPath || undefined,
      noCheckCertificates: true,
      noWarnings: true,
      extractorArgs: 'youtube:player_client=web,android',
      forceIpv4: true,
      addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64)']
    };

    if (cookiesPath) {
      downloadOptions.cookies = cookiesPath;
      console.log('Using cookies from:', cookiesPath);
    }
    await youtubedl(url, downloadOptions);

    if (cookiesPath && fs.existsSync(cookiesPath)) {
      fs.unlinkSync(cookiesPath);
    }

    const formats = await youtubedl(url, {
      listFormats: true
    });

    console.log(formats);

    console.log('Extraction complete. Serving file to client:', finalFile);

    // 3. Send the file to the client and delete it afterward
    res.download(finalFile, `${title}.mp3`, (err) => {
      if (err) {
        console.error('Error during file transfer:', err.message);
      } else {
        console.log('File successfully transferred to client.');
      }

      // Cleanup temp file
      if (fs.existsSync(finalFile)) {
        try {
          fs.unlinkSync(finalFile);
          console.log('Cleaned up temporary file:', finalFile);
        } catch (cleanupErr) {
          console.error('Failed to clean up temp file:', cleanupErr);
        }
      }
    });

  } catch (error: any) {
    console.error('Download Error:', error.message);

    if (cookiesPath && fs.existsSync(cookiesPath)) {
      fs.unlinkSync(cookiesPath);
    }

    if (fs.existsSync(finalFile)) {
      fs.unlinkSync(finalFile);
    }

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to process YouTube stream'
      });
    }
  }
};