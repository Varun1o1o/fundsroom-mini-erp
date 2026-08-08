import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Routers
import authRouter from './routes/auth.routes';
import customerRouter from './routes/customer.routes';
import productRouter from './routes/product.routes';
import challanRouter from './routes/challan.routes';
import analyticsRouter from './routes/analytics.routes';

const app = express();

// Secure headers
app.use(helmet());

// CORS configuration
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: '*', // For this project/case study, allow general connections, or configure specific origin if needed
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// API Base Check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    system: 'Fundsroom Mini ERP Operations Portal API',
    version: '1.0.0',
    db: 'MySQL (Prisma ORM)',
  });
});

// Register API Routers
app.use('/api/auth', authRouter);
app.use('/api/customers', customerRouter);
app.use('/api/products', productRouter);
app.use('/api/challans', challanRouter);
app.use('/api/analytics', analyticsRouter);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ message: `API endpoint '${req.originalUrl}' not found` });
});

// Final Error Boundary
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({
    message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export default app;
