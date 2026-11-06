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
r = await call('PATCH', `/biodata/mine/${bioId}`, { profession: 'Doctor', district: 'Chattogram' }, memberCookie);
check('member edits own biodata (pending)', r.status === 200 && r.data.biodata.profession === 'Doctor');
r = await call('GET', '/biodata/mine', null, memberCookie);
check('edited biodata persists in mine list', r.status === 200 && r.data.biodatas.some((b) => String(b._id) === String(bioId) && b.district === 'Chattogram'));
r = await call('GET', `/biodata/${bioId}`, null, memberCookie);
check('member blocked from full biodata (403)', r.status === 403);
r = await call('PATCH', `/biodata/${bioId}/status`, { status: 'published' }, ownerCookie);
check('owner publishes biodata', r.status === 200 && r.data.biodata.status === 'published');
r = await call('PATCH', `/biodata/mine/${bioId}`, { profession: 'Nurse' }, memberCookie);
check('published biodata edit blocked for member (403)', r.status === 403);
r = await call('GET', '/matches/search?profileType=bride&district=Chattogram&minAge=25&maxAge=30');
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
// v39: interests list must populate human info (no bare ObjectId rows)
r = await call('GET', '/interests', null, ownerCookie);
check('admin interests populated with biodata + member', r.status === 200 && r.data.interests.length >= 1 && r.data.interests[0].targetBiodata && r.data.interests[0].targetBiodata.profileType === 'bride' && r.data.interests[0].targetBiodata.district === 'Chattogram' && r.data.interests[0].fromUser && r.data.interests[0].fromUser.fullName === 'Member One');
r = await call('GET', '/interests/mine', null, memberCookie);
check('member interests populated with biodata', r.status === 200 && r.data.interests.length >= 1 && r.data.interests[0].targetBiodata && r.data.interests[0].targetBiodata.profileType === 'bride');
// v39: audit log is human-readable (no raw JSON detail) and records biodata status changes
r = await call('PATCH', `/admin/users/${member._id}`, { role: 'matchmaker' }, ownerCookie);
check('admin changes member role', r.status === 200 && r.data.user.role === 'matchmaker');
r = await call('GET', '/admin/audit', null, ownerCookie);
check('audit log returns actor + action + detail', r.status === 200 && r.data.logs.length >= 1 && r.data.logs[0].actor && r.data.logs[0].actor.email && r.data.logs[0].action);
check('audit detail has no raw JSON braces', r.status === 200 && r.data.logs.every((x) => !String(x.detail || '').includes('{') && !String(x.detail || '').includes('"')));
check('audit records biodata publish', r.status === 200 && r.data.logs.some((x) => x.action === 'biodata_status' && String(x.detail || '').includes('published')));
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
r = await call('PATCH', '/auth/me', { partnerPreferences: { minAge: 22, maxAge: 30, district: 'Dhaka', profession: 'Teacher', religion: 'Islam' } }, memberCookie);
check('partner preferences saved', r.status === 200 && r.data.user.partnerPreferences.district === 'Dhaka' && r.data.user.partnerPreferences.profession === 'Teacher');
r = await call('GET', '/auth/me', null, memberCookie);
check('partner preferences persist on reload', r.status === 200 && r.data.user.partnerPreferences.minAge === 22 && r.data.user.partnerPreferences.maxAge === 30);
r = await call('PATCH', `/packages/${pkgId}`, { name: 'Silver Plus', priceBDT: 2500, durationDays: 120, proposals: 12, meetings: 3, features: ['A', 'B'], isActive: false }, ownerCookie);
check('admin package full edit', r.status === 200 && r.data.package.name === 'Silver Plus' && r.data.package.priceBDT === 2500 && r.data.package.durationDays === 120 && r.data.package.features.length === 2);
r = await call('GET', '/packages');
check('deactivated package hidden from public list', r.status === 200 && !r.data.packages.some((x) => x.name === 'Silver Plus'));
r = await call('PATCH', `/packages/${pkgId}`, { isActive: true }, ownerCookie);
check('package reactivated', r.status === 200 && r.data.package.isActive === true && r.data.package.name === 'Silver Plus');
r = await call('GET', '/packages');
check('reactivated package visible again', r.status === 200 && r.data.packages.some((x) => x.name === 'Silver Plus'));
r = await call('POST', '/support', { name: 'Member One', email: 'member@test.local', subject: 'Reply test', message: 'Please reply to this ticket' });
const ticketId = r.data.ticket._id;
r = await call('PATCH', `/support/${ticketId}`, { staffReply: 'We will call you tomorrow.', status: 'in_progress' }, ownerCookie);
check('support ticket staff reply saved', r.status === 200 && r.data.ticket.staffReply === 'We will call you tomorrow.' && r.data.ticket.status === 'in_progress');
r = await call('GET', '/support', null, ownerCookie);
check('staff reply visible in admin ticket list', r.status === 200 && r.data.tickets.some((x) => String(x._id) === String(ticketId) && x.staffReply === 'We will call you tomorrow.'));
// --- v37: content management (admin list / edit / hide / delete) ---
r = await call('GET', '/content/all', null, ownerCookie);
check('admin content list includes created FAQ', r.status === 200 && r.data.items.some((x) => x.title === 'Test FAQ'));
const contentId = r.data.items.find((x) => x.title === 'Test FAQ')._id;
r = await call('GET', '/content/all', null, memberCookie);
check('member blocked from admin content list (403)', r.status === 403);
r = await call('PATCH', `/content/${contentId}`, { title: 'Test FAQ Updated', isActive: false }, ownerCookie);
check('admin edits content', r.status === 200 && r.data.item.title === 'Test FAQ Updated');
r = await call('GET', '/content?type=faq');
check('inactive content hidden from public list', r.status === 200 && !r.data.items.some((x) => x.title === 'Test FAQ Updated'));
r = await call('POST', '/content', { type: 'banner', title: 'Eid Offer', body: 'Special announcement' }, ownerCookie);
check('admin creates banner content', r.status === 201);
const bannerId = r.data.item._id;
r = await call('GET', '/content?type=banner');
check('public banner content readable', r.status === 200 && r.data.items.some((x) => x.title === 'Eid Offer'));
r = await call('DELETE', `/content/${contentId}`, null, ownerCookie);
check('admin deletes content', r.status === 200);
r = await call('DELETE', `/content/${bannerId}`, null, ownerCookie);
check('admin deletes banner content', r.status === 200);
// --- v37: website settings (save / upsert / list / delete) ---
r = await call('POST', '/admin/settings', { key: 'siteAnnouncement', value: 'Welcome to Shaadi Mobarak' }, ownerCookie);
check('admin saves setting', r.status === 200 && r.data.setting.value === 'Welcome to Shaadi Mobarak');
r = await call('GET', '/admin/settings', null, ownerCookie);
check('admin settings list readable', r.status === 200 && r.data.settings.some((x) => x.key === 'siteAnnouncement'));
r = await call('POST', '/admin/settings', { key: 'siteAnnouncement', value: 'Updated announcement' }, ownerCookie);
check('setting upsert updates value', r.status === 200 && r.data.setting.value === 'Updated announcement');
r = await call('DELETE', '/admin/settings/siteAnnouncement', null, ownerCookie);
check('admin deletes setting', r.status === 200);
r = await call('GET', '/admin/settings', null, ownerCookie);
check('deleted setting gone', r.status === 200 && !r.data.settings.some((x) => x.key === 'siteAnnouncement'));
r = await call('POST', '/admin/settings', { key: 'x', value: 'y' }, memberCookie);
check('member blocked from saving settings (403)', r.status === 403);
// --- v37: audit log + notifications (admin view) ---
r = await call('GET', '/admin/audit', null, ownerCookie);
check('admin audit log readable with actor', r.status === 200 && r.data.logs.length >= 1 && r.data.logs.some((x) => x.action === 'user_updated'));
r = await call('GET', '/admin/audit', null, memberCookie);
check('member blocked from audit log (403)', r.status === 403);
r = await call('GET', '/notifications', null, memberCookie);
check('member sees payment-approved notification', r.status === 200 && r.data.notifications.some((x) => x.title === 'Payment approved'));
r = await call('GET', '/admin/notifications', null, ownerCookie);
check('admin notifications list readable', r.status === 200 && r.data.notifications.some((x) => x.title === 'Payment approved'));
// --- v37: enquiry fields persist (looking for + phone + city + country) ---
r = await call('POST', '/support', { name: 'Enquirer', email: 'enq@test.local', subject: 'Enquiry', category: 'general', message: 'Phone: 01700000000 | City: Dhaka | Country: Bangladesh | Looking for: bride' });
check('enquiry with all fields stored', r.status === 201 && r.data.ticket.message.includes('Looking for: bride') && r.data.ticket.message.includes('01700000000'));
// --- v37: maintenance mode ---
r = await call('POST', '/admin/settings', { key: 'maintenanceMode', value: 'true' }, ownerCookie);
check('maintenance mode switched on', r.status === 200);
r = await call('GET', '/site-status');
check('site-status reports maintenance', r.status === 200 && r.data.maintenance === true);
r = await call('GET', '/packages');
check('public API returns 503 in maintenance', r.status === 503 && r.data.maintenance === true);
r = await call('GET', '/health');
check('health stays up in maintenance', r.status === 200);
r = await call('GET', '/admin/users', null, ownerCookie);
check('admin API stays open in maintenance', r.status === 200);
r = await call('POST', '/admin/settings', { key: 'maintenanceMode', value: 'false' }, ownerCookie);
check('maintenance mode switched off', r.status === 200);
r = await call('GET', '/packages');
check('public API works again after maintenance off', r.status === 200);
r = await call('DELETE', '/admin/settings/maintenanceMode', null, ownerCookie);
check('maintenance setting cleaned up', r.status === 200);
// --- v38: Royal upsert (never touches existing packages) ---
r = await call('GET', '/packages');
const royal = (r.data.packages || []).filter((p) => p.name === 'Royal');
check('Royal package upserted with owner-approved values', r.status === 200 && royal.length === 1 && royal[0].priceBDT === 20000 && royal[0].durationDays === 365 && royal[0].proposals === 150 && royal[0].meetings === 30);
r = await call('GET', '/packages');
check('Royal not duplicated on repeated load', (r.data.packages || []).filter((p) => p.name === 'Royal').length === 1);
// --- v38: gateways honestly disabled without credentials ---
r = await call('GET', '/payments/gateways');
check('gateways endpoint lists all disabled without credentials', r.status === 200 && Array.isArray(r.data.gateways) && r.data.gateways.length === 4 && r.data.gateways.every((g) => g.enabled === false));
// --- v38: site-status reports local (non-persistent) storage ---
r = await call('GET', '/site-status');
check('site-status reports local non-persistent storage', r.status === 200 && r.data.storage && r.data.storage.driver === 'local' && r.data.storage.persistent === false);
// --- v38: OTP gated without provider ---
r = await call('GET', '/auth/otp-status');
check('otp-status reports unconfigured without provider', r.status === 200 && r.data.configured === false && r.data.channel === null);
r = await call('POST', '/auth/otp/request', {}, memberCookie);
check('OTP request without provider returns 503, no code', r.status === 503 && !JSON.stringify(r.data).match(/\b\d{6}\b/));
r = await call('POST', '/auth/otp/verify', { code: '123456' }, memberCookie);
check('OTP verify without request rejected', r.status === 400);
// --- v38: OTP full flow with test provider (test-only, never in production) ---
process.env.OTP_TEST_MODE = 'test';
const { testOutbox } = await import('../src/utils/otpProvider.js');
r = await call('GET', '/auth/otp-status');
check('otp-status reports configured in test mode', r.status === 200 && r.data.configured === true && r.data.channel === 'email');
r = await call('POST', '/auth/otp/request', {}, memberCookie);
check('OTP request succeeds in test mode', r.status === 200 && testOutbox.length === 1 && !JSON.stringify(r.data).match(/\b\d{6}\b/));
const testCode = testOutbox[0].code;
r = await call('POST', '/auth/otp/verify', { code: '000000' }, memberCookie);
check('wrong OTP rejected', r.status === 400);
r = await call('POST', '/auth/otp/verify', { code: testCode }, memberCookie);
check('correct OTP verifies phone', r.status === 200);
r = await call('GET', '/auth/me', null, memberCookie);
check('phoneVerified true after OTP verify', r.status === 200 && r.data.user.phoneVerified === true);
// Expired code: force expiry directly, then verify must fail.
await User.updateOne({ email: 'member@test.local' }, { otpHash: await bcrypt.hash('999999', 10), otpExpiresAt: new Date(Date.now() - 1000), otpAttempts: 0 });
r = await call('POST', '/auth/otp/verify', { code: '999999' }, memberCookie);
check('expired OTP rejected', r.status === 400);
// Too many wrong attempts lock the code out.
await User.updateOne({ email: 'member@test.local' }, { otpHash: await bcrypt.hash('111111', 10), otpExpiresAt: new Date(Date.now() + 600000), otpAttempts: 0 });
for (let i = 0; i < 5; i++) await call('POST', '/auth/otp/verify', { code: '222222' }, memberCookie);
r = await call('POST', '/auth/otp/verify', { code: '111111' }, memberCookie);
check('OTP locked after 5 wrong attempts', r.status === 400);
await User.updateOne({ email: 'member@test.local' }, { otpHash: undefined, otpExpiresAt: null, otpAttempts: 0 });
delete process.env.OTP_TEST_MODE;
// --- v40 backend hardening: bad ids, injection, mass-assignment, validation ---
r = await call('GET', '/biodata/not-an-id', null, ownerCookie);
check('invalid biodata id returns 400, not 500', r.status === 400);
r = await call('PATCH', '/packages/not-an-id', { priceBDT: 1 }, ownerCookie);
check('invalid package id returns 400, not 500', r.status === 400);
// Mass-assignment check needs a genuine plain member: the suite's member was
// promoted to matchmaker earlier, and (since F-03) their token now correctly
// carries the current DB role — so a fresh member is used here instead.
const memberTwo = await User.create({ fullName: 'Member Two', email: 'member2@test.local', passwordHash: await bcrypt.hash('Member2Password123', 12), role: 'member', accountStatus: 'active' });
r = await call('POST', '/auth/login', { email: 'member2@test.local', password: 'Member2Password123' });
const memberTwoCookie = r.cookie;
check('second member login works', r.status === 200 && !!memberTwoCookie);
r = await call('POST', '/biodata', { profileType: 'groom', age: 30, profession: 'Tester', district: 'Dhaka', status: 'published', photos: ['someone-elses-photo.png'], createdByOperator: true }, memberTwoCookie);
check('biodata create ignores injected status/photos/operator flag', r.status === 201 && r.data.biodata.status === 'pending' && Array.isArray(r.data.biodata.photos) && r.data.biodata.photos.length === 0 && r.data.biodata.createdByOperator === false);
const pendingBioId = r.data.biodata._id;
r = await call('POST', '/biodata', { profileType: 'groom', age: 'not-a-number' }, memberCookie);
check('biodata create with bad age returns 400, not 500', r.status === 400);
r = await call('GET', '/matches/search?profileType[$ne]=bride');
check('search NoSQL injection attempt rejected (400)', r.status === 400);
r = await call('GET', '/matches/search?minAge=abc&profileType=bride');
check('search with non-numeric age does not crash (200)', r.status === 200);
r = await call('GET', '/biodata?status[$ne]=published', null, ownerCookie);
check('biodata list status injection rejected (400)', r.status === 400);
r = await call('POST', '/interests', { targetBiodata: bioId, message: 'Again' }, memberCookie);
check('duplicate open interest rejected (409)', r.status === 409);
r = await call('POST', '/interests', { targetBiodata: '000000000000000000000000', message: 'Hi' }, memberCookie);
check('interest to missing biodata returns 404', r.status === 404);
r = await call('POST', '/shortlists', { biodata: pendingBioId }, memberCookie);
check('shortlist of unpublished biodata rejected (400)', r.status === 400);
r = await call('POST', '/payments', { package: pkgId, method: 'Bitcoin', transactionId: 'X1' }, memberCookie);
check('payment with invalid method rejected (400)', r.status === 400);
await call('PATCH', `/packages/${pkgId}`, { isActive: false }, ownerCookie);
r = await call('POST', '/payments', { package: pkgId, method: 'bKash', transactionId: 'X2' }, memberCookie);
check('payment for inactive package rejected (400)', r.status === 400);
await call('PATCH', `/packages/${pkgId}`, { isActive: true }, ownerCookie);
r = await call('PATCH', `/payments/${payId}`, { status: 'hacked' }, ownerCookie);
check('payment status injection rejected (400)', r.status === 400);
r = await call('PATCH', `/payments/${payId}`, { status: 'refunded' }, ownerCookie);
check('approved payment can be refunded', r.status === 200 && r.data.payment.status === 'refunded');
r = await call('GET', '/memberships/mine', null, memberCookie);
check('refunded payment cancels its membership', r.status === 200 && r.data.memberships.length === 1 && r.data.memberships[0].status === 'cancelled');
r = await call('POST', '/auth/otp/verify', { code: '123' }, memberCookie);
check('OTP verify rejects non-6-digit code (400)', r.status === 400);
r = await call('POST', '/auth/otp/verify', { code: 123456 }, memberCookie);
check('OTP verify rejects non-string code (400)', r.status === 400);
r = await call('PATCH', '/auth/me', { privacy: { showPhotoTo: 'everyone' } }, memberCookie);
check('profile update rejects invalid privacy value (400)', r.status === 400);
r = await call('PATCH', '/auth/me', { partnerPreferences: { minAge: 5 } }, memberCookie);
check('profile update rejects out-of-range preference (400)', r.status === 400);
r = await call('DELETE', '/auth/me', null, ownerCookie);
check('owner cannot delete own account via /me (403)', r.status === 403);
r = await call('POST', '/admin/settings', { key: '', value: 'x' }, ownerCookie);
check('settings save rejects empty key (400)', r.status === 400);
r = await call('POST', '/admin/settings', { key: 'k'.repeat(101), value: 'x' }, ownerCookie);
check('settings save rejects oversized key (400)', r.status === 400);
// Fake image upload: correct MIME header but plain-text bytes must be rejected.
{
  const fd = new FormData(); fd.append('photo', new Blob(['this is not an image at all'], { type: 'image/png' }), 'fake.png'); fd.append('biodataId', String(bioId));
  const up = await fetch(base + '/uploads', { method: 'POST', headers: { Cookie: memberCookie }, body: fd });
  check('upload of non-image bytes rejected (400)', up.status === 400);
  const fd2 = new FormData(); fd2.append('photo', new Blob(['not an image'], { type: 'text/plain' }), 'evil.txt'); fd2.append('biodataId', String(bioId));
  const up2 = await fetch(base + '/uploads', { method: 'POST', headers: { Cookie: memberCookie }, body: fd2 });
  check('upload of disallowed MIME type rejected (400)', up2.status === 400);
}
// Content PATCH must ignore unknown fields and validate.
{
  let all = await call('GET', '/content/all', null, ownerCookie);
  if (!all.data.items || all.data.items.length === 0) { await call('POST', '/content', { type: 'faq', title: 'Test FAQ 2', body: 'Answer 2' }, ownerCookie); all = await call('GET', '/content/all', null, ownerCookie); }
  const cid = all.data.items[0]._id;
  r = await call('PATCH', `/content/${cid}`, { title: 'Updated FAQ', isActive: false, _id: '000000000000000000000000', createdAt: '2000-01-01' }, ownerCookie);
  check('content edit applies whitelisted fields only', r.status === 200 && r.data.item.title === 'Updated FAQ' && r.data.item.isActive === false && String(r.data.item._id) === String(cid));
  r = await call('GET', '/content?type=faq');
  check('deactivated content hidden from public list', r.status === 200 && !r.data.items.some((x) => String(x._id) === String(cid)));
}
// Duplicate registration race returns 409, not 500.
r = await call('POST', '/auth/register', { fullName: 'Member One', email: 'member@test.local', password: 'AnotherPass123' });
check('duplicate registration returns 409', r.status === 409);
// Malformed JSON body returns 400, not 500.
{
  const bad = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' });
  check('malformed JSON returns 400', bad.status === 400);
}
r = await call('POST', '/auth/logout', {}, memberCookie);
check('logout works', r.status === 200);
r = await call('GET', '/auth/me');
check('me without session blocked (401)', r.status === 401);
// --- v40 consolidation: owner protection (F-01) + no-change PATCH (F-24) ---
const adminUser = await User.create({ fullName: 'Admin One', email: 'admin@test.local', passwordHash: await bcrypt.hash('AdminPassword123', 12), role: 'admin', accountStatus: 'active' });
r = await call('POST', '/auth/login', { email: 'admin@test.local', password: 'AdminPassword123' });
check('admin login works', r.status === 200 && !!r.cookie);
const adminCookie = r.cookie;
r = await call('PATCH', `/admin/users/${owner._id}`, { role: 'member' }, adminCookie);
check('admin cannot demote the owner (403)', r.status === 403);
r = await call('PATCH', `/admin/users/${owner._id}`, { accountStatus: 'suspended' }, adminCookie);
check('admin cannot suspend the owner (403)', r.status === 403);
r = await call('GET', '/auth/me', null, ownerCookie);
check('owner still active after blocked demote/suspend', r.status === 200 && r.data.user.role === 'owner');
r = await call('PATCH', `/admin/users/${member._id}`, { accountStatus: 'active' }, ownerCookie);
check('owner can still edit a member (200)', r.status === 200);
r = await call('PATCH', `/admin/users/${member._id}`, { nickname: 'Nope' }, ownerCookie);
check('admin user PATCH with no valid change returns 400', r.status === 400);
// --- v40 consolidation: JWT re-validation (F-03) ---
r = await call('PATCH', `/admin/users/${member._id}`, { accountStatus: 'suspended' }, ownerCookie);
check('owner suspends member', r.status === 200);
r = await call('GET', '/auth/me', null, memberCookie);
check('suspended member token rejected (401)', r.status === 401);
r = await call('GET', '/notifications', null, memberCookie);
check('suspended member cannot use other routes (401)', r.status === 401);
r = await call('PATCH', `/admin/users/${member._id}`, { accountStatus: 'active' }, ownerCookie);
check('owner reactivates member', r.status === 200);
r = await call('GET', '/auth/me', null, memberCookie);
check('reactivated member token works again (200)', r.status === 200);
const tempUser = await User.create({ fullName: 'Temp User', email: 'temp@test.local', passwordHash: await bcrypt.hash('TempPassword123', 12), role: 'member', accountStatus: 'active' });
r = await call('POST', '/auth/login', { email: 'temp@test.local', password: 'TempPassword123' });
const tempCookie = r.cookie;
check('temp user login works', r.status === 200 && !!tempCookie);
r = await call('DELETE', `/admin/users/${tempUser._id}`, null, ownerCookie);
check('admin deletes temp user', r.status === 200);
r = await call('GET', '/auth/me', null, tempCookie);
check('deleted user token rejected (401)', r.status === 401);
const adminTwo = await User.create({ fullName: 'Admin Two', email: 'admin2@test.local', passwordHash: await bcrypt.hash('Admin2Password123', 12), role: 'admin', accountStatus: 'active' });
r = await call('POST', '/auth/login', { email: 'admin2@test.local', password: 'Admin2Password123' });
const adminTwoCookie = r.cookie;
check('second admin login works', r.status === 200 && !!adminTwoCookie);
r = await call('PATCH', `/admin/users/${adminTwo._id}`, { role: 'member' }, ownerCookie);
check('owner demotes second admin', r.status === 200 && r.data.user.role === 'member');
r = await call('GET', '/admin/users', null, adminTwoCookie);
check('demoted admin token loses admin access (403)', r.status === 403);
// --- v40 consolidation: oversize payload (F-06) ---
{
  const big = await fetch(base + '/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Big', email: 'big@test.local', subject: 'Big', message: 'x'.repeat(150 * 1024) }) });
  check('oversize JSON payload returns 413', big.status === 413);
}
// --- v40 consolidation: unique package name + idempotent seeding (F-09) ---
await Package.init();
r = await call('POST', '/packages', { name: 'Silver', priceBDT: 100, durationDays: 30 }, ownerCookie);
check('duplicate package name rejected (409)', r.status === 409);
r = await call('GET', '/packages');
check('packages still seeded once each', r.status === 200 && (r.data.packages || []).filter((p) => p.name === 'Silver').length === 1);
// --- v40 consolidation: unique content slug (F-23) ---
const Content = (await import('../src/models/Content.js')).default;
await Content.init();
r = await call('POST', '/content', { type: 'faq', title: 'Slug One', slug: 'dup-slug', body: 'First' }, ownerCookie);
check('content with slug created', r.status === 201);
r = await call('POST', '/content', { type: 'faq', title: 'Slug Two', slug: 'dup-slug', body: 'Second' }, ownerCookie);
check('duplicate content slug rejected (409)', r.status === 409);
// --- v40 consolidation: shortlist delete (F-25) ---
r = await call('GET', '/shortlists', null, memberCookie);
const shortId = r.data.shortlists && r.data.shortlists[0] ? r.data.shortlists[0].id : null;
check('shortlist list readable', r.status === 200 && !!shortId);
r = await call('DELETE', `/shortlists/${shortId}`, null, memberCookie);
check('deleting own shortlist works (200)', r.status === 200);
r = await call('DELETE', `/shortlists/${shortId}`, null, memberCookie);
check('deleting already-deleted shortlist returns 404', r.status === 404);
r = await call('DELETE', '/shortlists/000000000000000000000000', null, memberCookie);
check('deleting missing shortlist returns 404', r.status === 404);
// --- v40 consolidation: upload requires biodataId (F-19) ---
{
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const fd = new FormData(); fd.append('photo', new Blob([png], { type: 'image/png' }), 'orphan.png');
  const up = await fetch(base + '/uploads', { method: 'POST', headers: { Cookie: memberCookie }, body: fd });
  check('upload without biodataId rejected (400)', up.status === 400);
}
// --- v40 consolidation: publish needs complete biodata (F-29) ---
r = await call('POST', '/biodata', { profileType: 'bride' }, memberCookie);
check('minimal biodata created pending', r.status === 201);
const minimalBioId = r.data.biodata._id;
r = await call('PATCH', `/biodata/${minimalBioId}/status`, { status: 'published' }, ownerCookie);
check('incomplete biodata cannot be published (400)', r.status === 400);
r = await call('POST', '/biodata', { profileType: 'groom', age: 29, profession: 'Engineer', district: 'Dhaka', education: 'BSc' }, memberCookie);
const completeBioId = r.data.biodata._id;
r = await call('PATCH', `/biodata/${completeBioId}/status`, { status: 'published' }, ownerCookie);
check('complete biodata can still be published (200)', r.status === 200 && r.data.biodata.status === 'published');
// --- v40 consolidation: admin delete cascades biodata (F-28) ---
const doomed = await User.create({ fullName: 'Doomed User', email: 'doomed@test.local', passwordHash: await bcrypt.hash('DoomedPassword123', 12), role: 'member', accountStatus: 'active' });
r = await call('POST', '/auth/login', { email: 'doomed@test.local', password: 'DoomedPassword123' });
const doomedCookie = r.cookie;
r = await call('POST', '/biodata', { profileType: 'groom', age: 31, profession: 'Farmer', district: 'Chandpur', education: 'HSC' }, doomedCookie);
const doomedBioId = r.data.biodata._id;
r = await call('PATCH', `/biodata/${doomedBioId}/status`, { status: 'published' }, ownerCookie);
check('doomed user biodata published', r.status === 200);
r = await call('GET', '/biodata/teasers');
check('doomed teaser visible before delete', r.status === 200 && r.data.teasers.some((t) => String(t.id) === String(doomedBioId)));
r = await call('DELETE', `/admin/users/${doomed._id}`, null, ownerCookie);
check('admin deletes doomed user', r.status === 200);
r = await call('GET', '/biodata/teasers');
check('deleted user biodata no longer published', r.status === 200 && !r.data.teasers.some((t) => String(t.id) === String(doomedBioId)));
// --- v40 consolidation: rate limits split (F-02) — runs last: nothing after this needs /auth ---
{
  let ok = 0;
  for (let i = 0; i < 40; i++) { const m = await call('GET', '/auth/me', null, memberCookie); if (m.status === 200) ok++; }
  check('40 sequential session checks all succeed (200)', ok === 40);
  let limited = false;
  for (let i = 0; i < 40; i++) { const b = await call('POST', '/auth/login', { email: 'member@test.local', password: 'WrongPassword999' }); if (b.status === 429) { limited = true; break; } }
  check('login still rate-limited after many bad attempts (429)', limited === true);
}
console.log(`\n${passed} passed, ${failed} failed`);
server.close(); await mongoose.disconnect(); await mongod.stop();
process.exit(failed ? 1 : 0);
