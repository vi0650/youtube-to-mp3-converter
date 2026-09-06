import { Request, Response } from 'express';
import ytDlp from 'youtube-dl-exec';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import os from 'os';
import path from 'path';

const getCookiesPath = (): string | undefined => {
  const secretPath = '/etc/secrets/cookies.txt';
  const localPath = path.resolve(process.cwd(), 'cookies.txt');
  const sourcePath = fs.existsSync(secretPath) ? secretPath
    : fs.existsSync(localPath) ? localPath : null;

  if (!sourcePath) {
    console.warn('No cookies.txt found - YouTube requests may be blocked');
    return undefined;
  }

  // Render secret files are read-only, but yt-dlp may update its cookie jar.
  if (sourcePath === secretPath) {
    const writablePath = path.join(os.tmpdir(), 'ytto-mp3-cookies.txt');
    fs.copyFileSync(sourcePath, writablePath);
    console.log(`Using YouTube cookies from ${sourcePath}`);
    return writablePath;
  }

  console.log(`Using YouTube cookies from ${sourcePath}`);
  return sourcePath;
};

const cookiesPath = getCookiesPath();
const publicExtractorOptions = {
  noCheckCertificates: true,
  noUpdate: true,
  noPlaylist: true,
  jsRuntimes: 'node' as const,
  remoteComponents: 'ejs:github' as const,
  ffmpegLocation: ffmpegStatic || undefined,
};
const authenticatedExtractorOptions = {
  ...publicExtractorOptions,
  ...(cookiesPath ? { cookies: cookiesPath } : {}),
};

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}/;

const isValidYouTubeUrl = (url: string): boolean => YOUTUBE_URL_REGEX.test(url);

const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (parsed.hostname.includes('youtu.be')) {
      return `https://youtu.be${parsed.pathname}`;
    }
    const videoId = parsed.searchParams.get('v');
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
  } catch {
    return url;
  }
};

const extractVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1).split('?')[0];
    }
    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
};

const parseDuration = (iso: string): number => {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return Number(match?.[1] || 0) * 3600 + Number(match?.[2] || 0) * 60 + Number(match?.[3] || 0);
};

export const getMetadata = async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  const cleanUrl = sanitizeUrl(url);
  const apiKey = process.env.YOUTUBE_API_KEY;

  try {
    // Use YouTube Data API v3 if key is available — fast and reliable
    if (apiKey) {
      const videoId = extractVideoId(cleanUrl);
      if (!videoId) {
        return res.status(400).json({ error: 'Could not extract video ID' });
      }

      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;
      const response = await fetch(apiUrl, { signal: AbortSignal.timeout(10_000) });
      const data = await response.json() as any;

      const item = data.items?.[0];
      if (!item) {
        return res.status(404).json({ error: 'Video not found' });
      }

      return res.json({
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        author: item.snippet.channelTitle,
        lengthSeconds: parseDuration(item.contentDetails.duration).toString()
      });
    }

    console.log('Fetching metadata with yt-dlp');
    const info = await ytDlp(cleanUrl, {
      ...authenticatedExtractorOptions,
      dumpSingleJson: true,
      skipDownload: true,
    }) as any;

    return res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      author: info.channel || info.uploader,
      lengthSeconds: String(info.duration || 0),
    });
  } catch (error: any) {
    console.error('Metadata Error:', error.message);
    return res.status(500).json({
      error: 'Could not fetch video info. The video may be unavailable.'
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

  const cleanUrl = sanitizeUrl(url);

  try {
    console.log('Starting yt-dlp MP3 stream for:', cleanUrl);
    const info = await ytDlp(cleanUrl, {
      ...publicExtractorOptions,
      dumpSingleJson: true,
      skipDownload: true,
    }) as any;

    // Reject videos longer than 15 minutes
    if ((info.duration || 0) > 900) {
      return res.status(400).json({ error: 'Video too long. Maximum is 15 minutes.' });
    }

    const title = String(info.title || 'audio').replace(/[^\w\s.-]/g, ' ').replace(/\s+/g, ' ').trim() || 'audio';

    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    const audioProcess = (ytDlp as any).exec(cleanUrl, {
      ...publicExtractorOptions,
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: '0',
      output: '-',
      quiet: true,
      noWarnings: true,
    });

    req.on('close', () => audioProcess.kill());
    audioProcess.stderr?.on('data', (chunk: Buffer) => console.error('yt-dlp:', chunk.toString().trim()));
    audioProcess.on('error', (err: Error) => {
      console.error('yt-dlp stream error:', err.message);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to stream audio from YouTube' });
    });
    audioProcess.catch((err: Error) => {
      console.error('yt-dlp process failed:', err.message);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to download audio from YouTube' });
      else res.destroy(err);
    });
    audioProcess.stdout.pipe(res);

  } catch (error: any) {
    console.error('Download Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process YouTube stream' });
    }
  }
};
