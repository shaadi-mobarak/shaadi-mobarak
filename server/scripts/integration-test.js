// End-to-end API test using an in-memory MongoDB through the same Mongoose code path
// as the real server (connectDB logic is mongoose.connect). No Atlas URI is needed here.
// Run: npm run test:integration   (server/)
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
const mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri());
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;
let passed = 0, failed = 0;
async function call(method, path, body, cookie) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, data, cookie: setCookie ? setCookie.split(';')[0] : cookie };
}
async function check(name, cond) { if (cond) { passed++; console.log('PASS', name); } else { failed++; console.log('FAIL', name); } }
const User = (await import('../src/models/User.js')).default;
const Package = (await import('../src/models/Package.js')).default;
// Seed owner directly (same as create-owner script logic)
const owner = await User.create({ fullName: 'Owner', email: 'owner@test.local', passwordHash: await bcrypt.hash('OwnerPassword123', 12), role: 'owner', accountStatus: 'active' });
let r = await call('POST', '/auth/register', { fullName: 'Member One', email: 'member@test.local', password: 'MemberPassword123' });
check('register creates pending account', r.status === 201 && r.data.user.accountStatus === 'pending');
r = await call('POST', '/auth/login', { email: 'member@test.local', password: 'MemberPassword123' });
check('pending account cannot login (403)', r.status === 403);
r = await call('POST', '/auth/login', { email: 'owner@test.local', password: 'OwnerPassword123' });
check('owner login works', r.status === 200 && !!r.cookie);
const ownerCookie = r.cookie;
const member = await User.findOne({ email: 'member@test.local' });
r = await call('PATCH', `/admin/users/${member._id}`, { accountStatus: 'active' }, ownerCookie);
check('owner activates member', r.status === 200 && r.data.user.accountStatus === 'active');
r = await call('POST', '/auth/login', { email: 'member@test.local', password: 'MemberPassword123' });
check('member login after activation', r.status === 200 && !!r.cookie);
const memberCookie = r.cookie;
r = await call('GET', '/auth/me', null, memberCookie);
check('me returns member', r.status === 200 && r.data.user.role === 'member');
r = await call('GET', '/admin/users', null, memberCookie);
check('member blocked from admin (403)', r.status === 403);
r = await call('POST', '/biodata', { profileType: 'bride', age: 27, profession: 'Teacher', district: 'Dhaka', education: 'Masters', religion: 'Islam', heightCm: 160 }, memberCookie);
check('member creates biodata pending', r.status === 201 && r.data.biodata.status === 'pending');
const bioId = r.data.biodata._id;
r = await call('GET', `/biodata/${bioId}`, null, memberCookie);
check('member blocked from full biodata (403)', r.status === 403);
r = await call('PATCH', `/biodata/${bioId}/status`, { status: 'published' }, ownerCookie);
check('owner publishes biodata', r.status === 200 && r.data.biodata.status === 'published');
r = await call('GET', '/matches/search?profileType=bride&district=Dhaka&minAge=25&maxAge=30');
check('matchmaking search finds teaser, no private fields', r.status === 200 && r.data.teasers.length === 1 && !r.data.teasers[0].photos);
r = await call('POST', '/shortlists', { biodata: bioId }, memberCookie);
check('shortlist add', r.status === 201);
r = await call('POST', '/shortlists', { biodata: bioId }, memberCookie);
check('shortlist duplicate rejected (409)', r.status === 409);
r = await call('POST', '/interests', { targetBiodata: bioId, message: 'Interested' }, memberCookie);
check('interest to operator', r.status === 201);
const interestId = r.data.interest._id;
r = await call('PATCH', `/interests/${interestId}`, { status: 'forwarded' }, ownerCookie);
check('operator forwards interest', r.status === 200 && r.data.interest.status === 'forwarded');
r = await call('POST', '/consents', { biodata: bioId, sharedWithUser: member._id, scope: 'biodata' }, ownerCookie);
check('consent recorded', r.status === 201);
r = await call('GET', '/packages');
check('packages seeded', r.status === 200 && r.data.packages.length >= 1);
const pkgId = r.data.packages[0]._id;
r = await call('POST', '/payments', { package: pkgId, method: 'bKash', transactionId: 'TX123' }, memberCookie);
check('payment record pending', r.status === 201 && r.data.payment.status === 'pending');
const payId = r.data.payment._id;
r = await call('PATCH', `/payments/${payId}`, { status: 'approved' }, ownerCookie);
check('payment approval', r.status === 200 && r.data.payment.status === 'approved');
r = await call('GET', '/memberships/mine', null, memberCookie);
check('membership activated after approval', r.status === 200 && r.data.memberships.length === 1);
r = await call('POST', '/support', { name: 'Member One', email: 'member@test.local', subject: 'Help', message: 'Need help with my profile please' });
check('support ticket created', r.status === 201);
r = await call('POST', '/content', { type: 'faq', title: 'Test FAQ', body: 'Answer' }, ownerCookie);
check('admin creates content', r.status === 201);
r = await call('GET', '/content?type=faq');
check('public content readable', r.status === 200 && r.data.items.length >= 1);
// Secure private upload: 1x1 PNG, owner-only + owner-of-biodata download
{
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const fd = new FormData(); fd.append('photo', new Blob([png], { type: 'image/png' }), 'test.png'); fd.append('biodataId', String(bioId));
  const up = await fetch(base + '/uploads', { method: 'POST', headers: { Cookie: memberCookie }, body: fd });
  const upData = await up.json().catch(() => ({}));
  await check('private photo upload', up.status === 201 && !!upData.filename);
  const dl = await fetch(base + '/uploads/' + upData.filename, { headers: { Cookie: ownerCookie } });
  await check('operator can download private photo', dl.status === 200);
  const dl2 = await fetch(base + '/uploads/' + upData.filename);
  await check('anonymous cannot download private photo (401)', dl2.status === 401);
}
r = await call('POST', '/auth/logout', {}, memberCookie);
check('logout works', r.status === 200);
r = await call('GET', '/auth/me');
check('me without session blocked (401)', r.status === 401);
console.log(`\n${passed} passed, ${failed} failed`);
server.close(); await mongoose.disconnect(); await mongod.stop();
process.exit(failed ? 1 : 0);
