const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDatabase } = require('./database');
const authRouter = require('./routers/auth');
const queryRouter = require('./routers/query');
const { router: adminRouter } = require('./routers/admin');

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:13000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: '请求过于频繁，请稍后再试' }
});
app.use('/api', limiter);

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}
if (!process.env.ENCRYPTION_KEY) {
  console.error('FATAL: ENCRYPTION_KEY environment variable is required');
  process.exit(1);
}

// Initialize database
initDatabase();

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/query', queryRouter);
app.use('/api/admin', adminRouter);

// Serve frontend in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`局域网访问: http://10.204.0.146:${PORT}`);
});
