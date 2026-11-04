# Shaadi Mobarak — MERN Stack Starter

এটি Shaadi Mobarak-এর MERN Stack সফটওয়্যারের প্রথম ভিত্তি। বর্তমান Royal Burgundy + Gold ডিজাইনের একটি React-ভিত্তিক প্রাথমিক হোমপেজ, Express API এবং MongoDB মডেল যুক্ত করা হয়েছে। পুরোনো পূর্ণ HTML ডিজাইনটি `docs/current-design-reference.html`-এ রাখা আছে।

## প্রযুক্তি
- MongoDB + Mongoose
- Express.js + Node.js
- React + Vite
- Security baseline: Helmet, CORS allowlist, rate limiting, bcrypt password hashing, HttpOnly session cookie, Zod validation

## চালানোর জন্য প্রয়োজন
Node.js 20 বা নতুন এবং MongoDB (লোকাল অথবা MongoDB Atlas) দরকার।

## সেটআপ
1. এই ফোল্ডারে terminal খুলে `npm install` চালান।
2. `server/.env.example` কপি করে `server/.env` বানান।
3. `MONGODB_URI`-তে আপনার MongoDB connection string দিন।
4. `JWT_SECRET`-এ অন্তত 32 অক্ষরের শক্তিশালী random secret দিন। এটি কারও সঙ্গে শেয়ার করবেন না।
5. `npm run dev` চালান। Frontend: `http://localhost:5173`, API: `http://localhost:5000/api/health`।

## গুরুত্বপূর্ণ সীমাবদ্ধতা
- এটি প্রথম development foundation, production-ready সম্পূর্ণ matrimonial platform নয়।
- নতুন account `pending` অবস্থায় থাকে। Email/OTP verification এবং admin approval workflow পরের ধাপে তৈরি করতে হবে; active account ছাড়া login হবে না।
- Admin তৈরির কোনো public endpoint নেই—নিরাপত্তার জন্য role assignment পরে protected admin workflow দিয়ে করতে হবে।
- Profile/biodata, consent, matchmaking, payment, notifications, image storage এবং dashboards এখনো তৈরি হয়নি।
- Frontend-এর login বাটন এখন placeholder; এটি বাস্তব login বলে দাবি করে না।
- Public demo-তে বাস্তব সদস্যের ব্যক্তিগত তথ্য যোগ করবেন না।
- Production-এ HTTPS, secure secret management, backup, audit logging, email/OTP provider এবং security testing আবশ্যক।

## পরবর্তী উন্নয়ন ধাপ
1. Registration verification + controlled admin activation
2. Member biodata model and privacy/consent rules
3. Search and matchmaking APIs
4. Member, matchmaker and master-admin dashboards
5. Membership/payment integration and audit/reporting
