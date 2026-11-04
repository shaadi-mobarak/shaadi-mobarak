// Create the first owner account from environment variables only. Run once.
// Usage (in server/): OWNER_EMAIL=... OWNER_NAME=... OWNER_PASSWORD=... node scripts/create-owner.js
// Never put these values in chat or in source code. Refuses if an owner already exists.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
const { OWNER_EMAIL, OWNER_NAME, OWNER_PASSWORD, MONGODB_URI } = process.env;
if (!MONGODB_URI || !OWNER_EMAIL || !OWNER_PASSWORD || OWNER_PASSWORD.length < 10) { console.error('Set MONGODB_URI, OWNER_EMAIL and OWNER_PASSWORD (at least 10 characters) in the environment.'); process.exit(1); }
await mongoose.connect(MONGODB_URI);
if (await User.exists({ role: 'owner' })) { console.log('An owner already exists. Nothing created.'); await mongoose.disconnect(); process.exit(0); }
await User.create({ fullName: OWNER_NAME || 'Owner', email: OWNER_EMAIL.toLowerCase(), passwordHash: await bcrypt.hash(OWNER_PASSWORD, 12), role: 'owner', accountStatus: 'active', emailVerified: true });
console.log(`Owner created: ${OWNER_EMAIL.toLowerCase()}`);
await mongoose.disconnect();
