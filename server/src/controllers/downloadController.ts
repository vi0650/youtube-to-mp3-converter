import { Request, Response } from 'express';
import ytdl, { Agent, createAgent } from '@distube/ytdl-core';
import ffmpeg from '../utils/ffmpeg';
import fs from 'fs';
import path from 'path';

// Parse Netscape cookies.txt format into cookie objects for ytdl-core
const parseCookiesTxt = (content: string) => {
  return content
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const parts = line.split('\t');
      if (parts.length < 7) return null;
      return {
        name: parts[5].trim(),
        value: parts[6].trim(),
        domain: parts[0].replace('#HttpOnly_', '').trim(),
        path: parts[2].trim(),
        secure: parts[3].trim() === 'TRUE',
        expires: parseInt(parts[4].trim()) || undefined,
        httpOnly: parts[0].startsWith('#HttpOnly_'),
      };
    })
    .filter(Boolean) as any[];
};

// Build a ytdl agent with cookies from Render secret file
const buildAgent = (): Agent | undefined => {
  const secretPath = '/etc/secrets/cookies.txt';
  const localPath = path.resolve(process.cwd(), 'cookies.txt');
  const cookiesPath = fs.existsSync(secretPath) ? secretPath
    : fs.existsSync(localPath) ? localPath : null;

  if (!cookiesPath) {
    console.warn('No cookies.txt found — YouTube requests may be blocked');
    return undefined;
  }

  try {
    const content = fs.readFileSync(cookiesPath, 'utf-8');
    const allCookies = parseCookiesTxt(content);
    // Only pass YouTube/Google auth cookies — other domains cause errors
    const cookies = allCookies.filter(c => {
      const d = c.domain.toLowerCase();
      return d === '.youtube.com' || d === 'youtube.com' ||
             d === '.google.com'  || d === 'google.com';
    });
    console.log(`Loaded ${cookies.length} YouTube cookies from ${cookiesPath}`);
    return createAgent(cookies);
  } catch (err) {
    console.error('Failed to build ytdl agent from cookies:', err);
    return undefined;
  }
};

const ytdlAgent = buildAgent();

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

// Parse ISO 8601 duration (e.g. PT4M13S) to total seconds
const parseDuration = (iso: string): number => {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const h = parseInt(match?.[1] || '0');
  const m = parseInt(match?.[2] || '0');
  const s = parseInt(match?.[3] || '0');
  return h * 3600 + m * 60 + s;
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

    // Fallback: use @distube/ytdl-core
    console.log('No YOUTUBE_API_KEY set — falling back to ytdl-core for metadata');
    const info = await ytdl.getInfo(cleanUrl, { agent: ytdlAgent });
    const details = info.videoDetails;

    return res.json({
      title: details.title,
      thumbnail: details.thumbnails?.at(-1)?.url,
      author: details.author?.name,
      lengthSeconds: details.lengthSeconds
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
    console.log('Fetching video info for:', cleanUrl);
    const info = await ytdl.getInfo(cleanUrl, { agent: ytdlAgent });
    const details = info.videoDetails;

    // Reject videos longer than 15 minutes
    if (parseInt(details.lengthSeconds) > 900) {
      return res.status(400).json({ error: 'Video too long. Maximum is 15 minutes.' });
    }

    const title = details.title.replace(/[^\w\s.-]/g, ' ').replace(/\s+/g, ' ').trim() || 'audio';

    console.log('Starting audio stream for:', title);

    // Stream audio directly from YouTube — no temp files
    // Use a custom filter to pick the best audio-only format
    const audioStream = ytdl(cleanUrl, {
      filter: (format) => format.hasAudio && !format.hasVideo,
      quality: 'highestaudio',
      agent: ytdlAgent
    });

    // Fix: client disconnect cancels the stream immediately
    req.on('close', () => {
      audioStream.destroy();
    });

    audioStream.on('error', (err) => {
      console.error('ytdl stream error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream audio from YouTube' });
      }
    });

    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    // Pipe through ffmpeg for MP3 conversion, stream directly to client
    ffmpeg(audioStream)
      .audioCodec('libmp3lame')
      .audioQuality(2)
      .format('mp3')
      .on('start', (cmd) => console.log('ffmpeg started:', cmd))
      .on('error', (err) => {
        console.error('ffmpeg error:', err.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to convert audio' });
        }
      })
      .on('end', () => console.log('ffmpeg conversion complete for:', title))
      .pipe(res, { end: true });

  } catch (error: any) {
    console.error('Download Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process YouTube stream' });
    }
  }
};
