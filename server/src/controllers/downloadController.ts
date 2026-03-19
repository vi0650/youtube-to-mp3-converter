import { Request, Response } from 'express';
import ytDlp from 'yt-dlp-exec';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ---------------------------------------------------------------------------
// Helper: find cookies.txt — checks Render secret path first, then local
// ---------------------------------------------------------------------------
const getCookiePath = (): string | null => {
  const candidates = [
    '/etc/secrets/cookies.txt',                      // ✅ Render Secret Files
    path.resolve(process.cwd(), 'cookies.txt'),       // local dev
    path.resolve(process.cwd(), 'src/cookies.txt'),   // local alt
  ];
  const found = candidates.find(fs.existsSync) ?? null;
  console.log('[cookies]', found ? `Found at: ${found}` : 'NOT FOUND — no cookies will be used');
  return found;
};

const buildBaseOptions = () => {
  const cookiePath = getCookiePath();
  return {
    noCheckCertificates: true,
    noWarnings: true,
    extractorArgs: 'youtube:player_client=android_embedded,android,web',
    addHeader: [
      'referer:youtube.com',
      'user-agent:Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
    ],
    ...(cookiePath && { cookies: cookiePath }),  // only added if file exists
  };
};

// ---------------------------------------------------------------------------
// GET /metadata?url=...
// ---------------------------------------------------------------------------
export const getMetadata = async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  try {
    console.log('[yt-dlp] Fetching metadata for:', url);

    const info: any = await ytDlp(url, {
      dumpSingleJson: true,
      preferFreeFormats: true,
      ...buildBaseOptions(),
    } as any);

    return res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      author: info.uploader || info.channel,
      lengthSeconds: info.duration?.toString(),
    });
  } catch (error: any) {
    console.error('[yt-dlp] Metadata Error:', error.message);
    return res.status(500).json({
      error: 'Could not fetch video info. The video may be unavailable or region-locked.',
    });
  }
};

// ---------------------------------------------------------------------------
// GET /download?url=...
// ---------------------------------------------------------------------------
export const downloadMp3 = async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  const tempId = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const outputTemplate = path.join(os.tmpdir(), `yt_${tempId}.%(ext)s`);
  const finalMp3 = path.join(os.tmpdir(), `yt_${tempId}.mp3`);

  const cleanup = () => {
    [finalMp3, outputTemplate.replace('%(ext)s', 'webm'), outputTemplate.replace('%(ext)s', 'm4a')]
      .filter(fs.existsSync)
      .forEach((f) => {
        try { fs.unlinkSync(f); } catch (_) { }
      });
  };

  try {
    // ── Step 1: Fetch metadata for a clean filename ────────────────────────
    console.log('[yt-dlp] Fetching info for:', url);

    const info: any = await ytDlp(url, {
      dumpSingleJson: true,
      preferFreeFormats: true,
      ...buildBaseOptions(),
    } as any);

    const safeTitle = (info.title ?? 'audio')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);

    console.log('[yt-dlp] Downloading audio for:', safeTitle);

    // ── Step 2: Download + convert to MP3 ─────────────────────────────────
    await ytDlp(url, {
      format: 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best',
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      output: outputTemplate,
      ffmpegLocation: ffmpegPath ?? undefined,
      noPlaylist: true,
      preferFreeFormats: true,
      retries: 3,
      ...buildBaseOptions(),
    } as any);

    // ── Step 3: Verify the output file exists ─────────────────────────────
    if (!fs.existsSync(finalMp3)) {
      throw new Error(`Expected MP3 not found at: ${finalMp3}`);
    }

    console.log('[yt-dlp] Serving file to client:', finalMp3);

    // ── Step 4: Stream to client ──────────────────────────────────────────
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    res.download(finalMp3, `${safeTitle}.mp3`, (err) => {
      if (err) console.error('[stream] Transfer error:', err.message);
      else console.log('[stream] Delivered successfully.');
      cleanup();
    });

  } catch (error: any) {
    console.error('[yt-dlp] Download Error:', error.message);
    cleanup();

    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Failed to process the YouTube stream. The video may be restricted or unavailable.',
      });
    }
  }
};