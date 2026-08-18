import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './config/logger';
import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import leadRoutes from './routes/lead.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { projectRouter, inventoryRouter, quotationRouter, bookingRouter } from './routes/combined.routes';
import {
  collectionRouter, demandRouter, invoiceRouter, reportRouter,
  communicationRouter, notificationRouter, callRouter, templateRouter,
} from './routes/functional.routes';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/auth/login', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Aarovia CRM API v1.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/projects', projectRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/quotations', quotationRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/collections', collectionRouter);
app.use('/api/demands', demandRouter);
app.use('/api/invoices', invoiceRouter);
app.use('/api/reports', reportRouter);
app.use('/api/communications', communicationRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/calls', callRouter);
app.use('/api/templates', templateRouter);

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Aarovia CRM API running on port ${PORT}`));

export default app;
