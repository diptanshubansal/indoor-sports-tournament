require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Connect to MongoDB Atlas
connectDB();

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cookieParser());

// Enable CORS
const corsOptions = {
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Prevent NoSQL Injection
app.use(mongoSanitize());

// Parse JSON Bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api', limiter);

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tournaments', require('./routes/tournamentRoutes'));
app.use('/api/participants', require('./routes/participantRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leaderboard', require('./routes/leaderboardRoutes'));
app.use('/api/rules', require('./routes/rulesRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/audit-logs', require('./routes/auditRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

// Basic Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// 404 Route Not Found Handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
