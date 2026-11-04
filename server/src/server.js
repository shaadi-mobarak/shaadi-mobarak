import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
const port = Number(process.env.PORT || 5000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Set JWT_SECRET to a random string of at least 32 characters');
try { await connectDB(); app.listen(port, () => console.log(`API listening on http://localhost:${port}`)); }
catch (error) { console.error('Server startup failed:', error.message); process.exit(1); }
