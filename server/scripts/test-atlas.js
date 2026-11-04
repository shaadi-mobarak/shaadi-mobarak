// Test a MongoDB Atlas (or any MongoDB) connection from environment variables only.
// Usage (in server/): node scripts/test-atlas.js   (reads server/.env if present)
// Prints only success/failure, never the connection string or any secret.
import 'dotenv/config';
import mongoose from 'mongoose';
const uri = process.env.MONGODB_URI;
if (!uri) { console.error('FAIL: MONGODB_URI is not set. Copy server/.env.example to server/.env and set it there.'); process.exit(1); }
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  await mongoose.connection.db.admin().ping();
  console.log('OK: MongoDB connection successful. Database:', mongoose.connection.db.databaseName);
  await mongoose.disconnect(); process.exit(0);
} catch (e) { console.error('FAIL: MongoDB connection failed:', e.message); process.exit(1); }
