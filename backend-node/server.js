const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const schoolRoutes = require('./routes/schools');
const bookRoutes = require('./routes/books');
const borrowRoutes = require('./routes/borrows');
const borrowRequestRoutes = require('./routes/borrowRequests');
const librarySettingsRoutes = require('./routes/librarySettings');
const activityLogRoutes = require('./routes/activityLogs');
const announcementRoutes = require('./routes/announcements');
const adminRoutes = require('./routes/admin');
const roleRoutes = require('./routes/roles');
const permissionRoutes = require('./routes/permissions');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const finesRoutes = require('./routes/fines');
const mapTilesRoutes = require('./routes/mapTiles');
const idScannerRoutes = require('./routes/idScanner');
const libraryRoutes = require('./routes/libraries');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import schedulers
const { startReturnQrScheduler } = require('./services/returnQrScheduler');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'https://libralink-edu.vercel.app',
  'https://libralink-po.vercel.app',
  'https://libralinkkk.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve public assets (preset book covers and topic covers) from root public folder
app.use('/books', express.static(path.join(__dirname, '../public/books')));
app.use('/topics', express.static(path.join(__dirname, '../public/topics')));

// Fallback for uploads
app.use('/uploads/borrowing-ids', (req, res) => {
  const fallbackPath = path.join(__dirname, 'uploads/borrowing-ids/fallback-id.jpg');
  if (require('fs').existsSync(fallbackPath)) {
    return res.sendFile(fallbackPath);
  }
  res.redirect(`https://libralink-50ig.onrender.com/uploads/borrowing-ids${req.path}`);
});

// Book covers fallback to Supabase Storage if not on disk (e.g. Render ephemeral dyno)
app.use('/uploads/book-covers', (req, res) => {
  const filename = req.path.replace(/^\//, '');
  const localFile = path.join(__dirname, 'uploads/book-covers', filename);
  if (require('fs').existsSync(localFile)) {
    return res.sendFile(localFile);
  }
  return res.redirect(`https://yacrlfcbeltxtiztvwgo.supabase.co/storage/v1/object/public/book-covers/${filename}`);
});

// Profiles fallback to Supabase Storage if not on disk (e.g. Render ephemeral dyno)
app.use('/uploads/profiles', (req, res) => {
  const filename = req.path.replace(/^\//, '');
  const localFile = path.join(__dirname, 'uploads/profiles', filename);
  if (require('fs').existsSync(localFile)) {
    return res.sendFile(localFile);
  }
  return res.redirect(`https://yacrlfcbeltxtiztvwgo.supabase.co/storage/v1/object/public/profiles/${filename}`);
});

// Fallback to remote production server if another uploaded file is not stored locally
app.use('/uploads', (req, res) => {
  const remoteUrl = `https://libralink-50ig.onrender.com/uploads${req.path}`;
  res.redirect(remoteUrl);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/borrow', borrowRoutes);
app.use('/api/borrow-requests', borrowRequestRoutes);
app.use('/api/library-settings', librarySettingsRoutes);
app.use('/api/libraries', libraryRoutes);
app.use('/api/activities', activityLogRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/fines', finesRoutes);
app.use('/api/map-tiles', mapTilesRoutes);
app.use('/api/scan-id', idScannerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Libralink API is running' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  // Start daily scheduler: sends return QR codes to students on their due date
  startReturnQrScheduler();
});

module.exports = app;
