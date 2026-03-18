import { Router } from 'express';
import { getMetadata, downloadMp3 } from '../controllers/downloadController';

const router = Router();

/**
 * @openapi
 * /api/metadata:
 *   get:
 *     summary: Retrieve video information before downloading.
 *     parameters:
 *       - in: query
 *         name: url
 *         schema:
 *           type: string
 *         required: true
 *         description: YouTube video URL.
 *     responses:
 *       200:
 *         description: Video metadata.
 */
router.get('/metadata', getMetadata);

/**
 * @openapi
 * /api/download:
 *   get:
 *     summary: Start downloading the MP3 audio.
 *     parameters:
 *       - in: query
 *         name: url
 *         schema:
 *           type: string
 *         required: true
 *         description: YouTube video URL.
 *     responses:
 *       200:
 *         description: MP3 audio file.
 */
router.get('/download', downloadMp3);

export default router;
