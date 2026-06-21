import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import './db/index.js';
import './db/redis.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import analyticsRoutes from './routes/analytics.js';
import queueRoutes from './routes/queue.js';
import aiRoutes from './routes/ai.js';
import friendRoutes from './routes/friends.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/friends', friendRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});