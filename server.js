const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

// Connect to database
connectDB();

const app = express();

// --------------- Global Middleware ---------------

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// Request logging (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --------------- Routes ---------------

app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/schools', require('./src/routes/schoolRoutes'));
app.use('/api/students', require('./src/routes/studentRoutes'));
app.use('/api/teachers', require('./src/routes/teacherRoutes'));
app.use('/api/staff', require('./src/routes/staffRoutes'));
app.use('/api/parent', require('./src/routes/parentRoutes'));
app.use('/api/attendance', require('./src/routes/attendanceRoutes'));
app.use('/api/homework', require('./src/routes/homeworkRoutes'));
app.use('/api/exams', require('./src/routes/examRoutes'));
app.use('/api/fees', require('./src/routes/feeRoutes'));
app.use('/api/notices', require('./src/routes/noticeRoutes'));
app.use('/api/calendar', require('./src/routes/calendarRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/class-teachers', require('./src/routes/classTeacherRoutes'));
app.use('/api/dashboard', require('./src/routes/dashboardRoutes'));
app.use('/api/timetable', require('./src/routes/timetableRoutes'));
app.use('/api/seed', require('./src/routes/seedRoutes'));
app.use('/api/roadmap', require('./src/routes/roadmapRoutes'));
app.use('/api/question-bank', require('./src/routes/questionBankRoutes'));

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'SuperSMP API is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler (must be last)
app.use(errorHandler);

// --------------- Start Server ---------------

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\n🚀 SuperSMP API running in ${process.env.NODE_ENV} mode on port ${PORT}\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
