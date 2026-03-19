import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiReference } from '@scalar/express-api-reference';
import downloadRoutes from './routes/downloadRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'https://youtube2mp3-vi0650.vercel.app',
    'http://localhost:5173'
  ]
}));
app.use(express.json());

// Simple OpenAPI documentation spec for Scalar
const openApiSchema = {
  openapi: '3.0.0',
  info: {
    title: 'YT to MP3 Converter API',
    version: '1.0.0',
    description: 'API for converting YouTube videos to MP3 audio files.',
  },
  paths: {
    '/api/metadata': {
      get: {
        summary: 'Get video information',
        parameters: [
          {
            name: 'url',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'The YouTube URL to convert',
          },
        ],
        responses: {
          '200': {
            description: 'Returns video information like title and thumbnail',
          },
        },
      },
    },
    '/api/download': {
      get: {
        summary: 'Download YouTube audio as MP3',
        parameters: [
          {
            name: 'url',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'The YouTube URL to convert',
          },
        ],
        responses: {
          '200': {
            description: 'Returns the audio file stream',
          },
        },
      },
    },
  },
};

// Scalar API Reference
app.use(
  '/api-docs',
  apiReference({
    spec: {
      content: openApiSchema,
    },
  })
);

// Routes
app.use('/api', downloadRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('YT TO MP3 Converter API is running! Go to /api-docs for documentation.');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API Docs available at http://localhost:${PORT}/api-docs`);
});
