import { Request, Response } from 'express';
import { create } from 'youtube-dl-exec';
import { execSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// Find the best available yt-dlp binary (latest downloaded > pip > bundled)
const getYtDlpBinary = (): string => {
  const paths = [
    '/opt/render/project/src/yt-dlp',  // Downloaded by build command on Render
    '/usr/local/bin/yt-dlp',           // pip installed
    'yt-dlp'                           // system fallback
  ];

  for (const p of paths) {
    try {
      execSync(`${p} --version`, { stdio: 'ignore' });
      console.log('Using yt-dlp binary:', p);
      return p;
    } catch (_) { }
  }

  return 'yt-dlp';
};

const youtubedl = create(getYtDlpBinary());

// Copy cookies to writable /tmp — Render's /etc/secrets is READ-ONLY
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
  console.log(`Cookies copied from ${sourcePath} to ${tempPath}`);

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

    cookiesPath = getCookiesPath();

    const options: any = {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      extractorArgs: 'youtube:player_client=android,web',
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    };

    if (cookiesPath) {
      options.cookies = cookiesPath;
      console.log('Using cookies from:', cookiesPath);
    }

    const info: any = await youtubedl(url, options);

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      author: info.uploader || info.channel,
      lengthSeconds: info.duration?.toString(),
    });

  } catch (error: any) {
    console.error('Metadata Error:', error.message);
    res.status(500).json({
      error: 'Could not fetch video info. YouTube might be blocking request.'
    });
  } finally {
    if (cookiesPath && fs.existsSync(cookiesPath)) {
      fs.unlinkSync(cookiesPath);
    }
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
    console.log('Initiating download via yt-dlp for:', url);

    cookiesPath = getCookiesPath();

    const baseOptions: any = {
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      extractorArgs: 'youtube:player_client=android,web',
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    };

    if (cookiesPath) {
      baseOptions.cookies = cookiesPath;
      console.log('Using cookies from:', cookiesPath);
    }

    // Step 1 — get title
    const info: any = await youtubedl(url, {
      ...baseOptions,
      dumpSingleJson: true,
    });

    const title = info.title
      ?.replace(/[^\w\s.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'audio';

    console.log('Got metadata. Starting audio extraction for:', title);

    // Step 2 — download and convert to mp3
    await youtubedl(url, {
      ...baseOptions,
      format: 'bestaudio',
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      output: outputPath,
      ffmpegLocation: ffmpegPath || undefined,
      forceIpv4: true,
    });

    console.log('Extraction complete. Sending file to client:', finalFile);

    // Step 3 — send file then cleanup
    res.download(finalFile, `${title}.mp3`, (err) => {
      if (err) {
        console.error('Error during file transfer:', err.message);
      } else {
        console.log('File successfully transferred to client.');
      }

      if (fs.existsSync(finalFile)) {
        try {
          fs.unlinkSync(finalFile);
          console.log('Cleaned up temp file:', finalFile);
        } catch (cleanupErr) {
          console.error('Failed to clean up temp file:', cleanupErr);
        }
      }
    });

  } catch (error: any) {
    console.error('Download Error:', error.message);

    if (fs.existsSync(finalFile)) {
      try { fs.unlinkSync(finalFile); } catch (_) { }
    }

    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process YouTube stream' });
    }
  } finally {
    if (cookiesPath && fs.existsSync(cookiesPath)) {
      fs.unlinkSync(cookiesPath);
    }
  }
};