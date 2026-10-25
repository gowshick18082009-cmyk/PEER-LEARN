import express from 'express';
import helmet from 'helmet';
import authRouter from './routes/auth.js';
import skillsRouter from './routes/skills.js';
import sessionsRouter from './routes/sessions.js';
import reviewsRouter from './routes/reviews.js';
import aiRouter from './routes/ai.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(helmet());
app.use(express.json({ limit: '750kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/ai', aiRouter);

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  const indexFile = path.join(clientDist, 'index.html');
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    if (req.accepts('html')) {
      return res.sendFile(indexFile, (error) => {
        if (error) return next(error);
      });
    }
    return next();
  });
}

app.use((error, _req, _res, next) => {
  if (error) {
    console.error('Unhandled server error:', error);
    return next(error);
  }
  next();
});

app.use((error, req, res, _next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Something went wrong.' });
});

export default app;
