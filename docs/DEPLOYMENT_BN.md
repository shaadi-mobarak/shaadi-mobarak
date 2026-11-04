# Shaadi Mobarak — Deployment Guide (Bengali)

## ১. প্রস্তুতি
- Node.js 20+ ইনস্টল করুন।
- MongoDB Atlas-এ ডাটাবেস `shaadi_mobarak` এবং অ্যাপ ইউজার তৈরি করুন। IP Access List-এ সার্ভারের IP যোগ করুন।

## ২. Environment variables (কখনো চ্যাটে দেবেন না, কখনো কোডে রাখবেন না)
`server/.env` ফাইলে লিখুন:
```
NODE_ENV=production
PORT=5000
CLIENT_ORIGIN=https://আপনার-ডোমেইন
MONGODB_URI=আপনার-Atlas-connection-string
JWT_SECRET=কমপক্ষে-৩২-অক্ষরের-random-secret
JWT_EXPIRES_IN=1d
```
`server/.env.example` দেখে বাকি পেমেন্ট কীগুলো শুধু মার্চেন্ট অনুমোদনের পর বসান।

## ৩. চালানো
```
npm install
npm run build        # frontend production build
npm start            # backend (server)
```
Frontend: `client/dist` স্ট্যাটিক হোস্টে দিন। Backend: Node হোস্টে চালান।

## ৪. ডোমেইন ও HTTPS
- ডোমেইনের DNS-এ frontend ও backend হোস্ট পয়েন্ট করুন।
- HTTPS চালু করুন; production-এ `secure` কুকি তখনই কাজ করবে।
- `CLIENT_ORIGIN` অবশ্যই frontend ডোমেইনের সাথে মিলতে হবে।

## ৫. ব্যাকআপ
- Atlas-এ অটোমেটিক ব্যাকআপ/এক্সপোর্ট চালু রাখুন।
- `.env` ফাইলের নিরাপদ কপি আলাদা জায়গায় রাখুন, Git-এ কখনো কমিট করবেন না।

## ৬. লাইভের আগে চেকলিস্ট
- [ ] MongoDB সংযোগ পরীক্ষা
- [ ] রেজিস্ট্রেশন → অ্যাক্টিভেশন → লগইন
- [ ] বায়োডাটা জমা → অপারেটর অনুমোদন → টিজার
- [ ] আগ্রহ শুধু অপারেটরের কাছে যায় কিনা
- [ ] পেমেন্ট অনুমোদন → মেম্বারশিপ চালু
- [ ] প্যাকেজ দাম ও রিফান্ড নীতি ক্লায়েন্টের অনুমোদন
- [ ] OTP ও পেমেন্ট গেটওয়ে মার্চেন্ট অনুমোদন

## ৭. Atlas সংযোগ পরীক্ষা ও Owner তৈরি (আপডেট)
- `server/.env` সেট করার পর `cd server && npm run test:atlas` চালান।
- প্রথম Owner তৈরি করতে `docs/SETUP_BN.md`-এর ধাপ ৪ দেখুন।
- লাইভে যাওয়ার আগে `cd server && npm run test:integration` চালিয়ে ২৮টি API টেস্ট পাস হয়েছে কিনা দেখুন।
