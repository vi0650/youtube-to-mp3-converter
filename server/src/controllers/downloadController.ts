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

  // Fix 1 (getMetadata): cookiesPath declared once in function scope so
  // catch block can always reach it — no inner const re-declaration
  let cookiesPath: string | null = getCookiesPath();

  try {
    console.log('Fetching metadata using yt-dlp for:', url);

    const options: any = {
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

    const info: any = await youtubedl(url, options);

    if (cookiesPath && fs.existsSync(cookiesPath)) {
      fs.unlinkSync(cookiesPath);
      cookiesPath = null;
    }

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      author: info.uploader || info.channel,
      lengthSeconds: info.duration?.toString(),
    });
  } catch (error: any) {
    console.error('Metadata Error:', error.message);

    // cookiesPath is the outer let — always visible here now
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

  // Fix 1 (downloadMp3): declared once here — catch block always sees the real value,
  // not the shadowed null from the old inner `const cookiesPath`
  let cookiesPath: string | null = getCookiesPath();

  try {
    console.log('Initiating download via yt-dlp to temp file for:', url);

    // Fix 2 + 3: Single yt-dlp call using printJson to get the title alongside
    // the download. Removes the separate infoOptions round-trip (was Bug 2) and
    // the debug listFormats call that was deleting the converted MP3 (was Bug 1/primary).
    const downloadOptions: any = {
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
      printJson: true, // returns metadata so title is available without a second call
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    };

    if (cookiesPath) {
      downloadOptions.cookies = cookiesPath;
      console.log('Using cookies from:', cookiesPath);
    }

    const info: any = await youtubedl(url, downloadOptions);

    if (cookiesPath && fs.existsSync(cookiesPath)) {
      fs.unlinkSync(cookiesPath);
      cookiesPath = null;
    }

    const title =
      info.title?.replace(/[^\w\s.-]/g, ' ').replace(/\s+/g, ' ').trim() ||
      'audio';

    console.log('Extraction complete. Serving file to client:', finalFile);

    // Send the file to the client and delete it afterward
    res.download(finalFile, `${title}.mp3`, (err) => {
      if (err) {
        console.error('Error during file transfer:', err.message);
      } else {
        console.log('File successfully transferred to client.');
      }

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

    // cookiesPath is the outer let — cleanup works correctly now
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