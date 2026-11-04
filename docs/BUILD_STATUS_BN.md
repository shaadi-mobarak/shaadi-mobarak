# বর্তমান Build Status

## এই ধাপে তৈরি
- MERN monorepo structure
- React/Vite frontend starter with Burgundy + Gold design direction
- Express API server
- MongoDB/Mongoose connection
- User schema with role and account status
- Registration endpoint with password hashing and input validation
- Login endpoint with HttpOnly cookie session; only active accounts can log in
- Authenticated `/me` endpoint and logout
- Helmet, CORS allowlist, JSON body limit and auth rate limit
- Current standalone HTML retained as design reference

## এখনো অসম্পূর্ণ
- OTP/email verification and approval workflow
- Admin bootstrap and staff permission management
- Biodata, photo storage, consent and privacy controls
- Matchmaking, messaging and appointment workflows
- Payments, receipts and packages
- Complete admin/member/matchmaker UI
- Automated tests, deployment and production security review

## Palace update (2026-11-04, Feri approved)
- Palace-themed homepage: palace entrance hero photo, royal scroll teasers, scroll price board
- Packages: Free ৳0, Silver ৳2,000, Gold ৳5,000, Platinum ৳6,000, Elite Assisted ৳15,000 (admin-editable, not hardcoded)
- Biodata model + operator upload, teaser-only public view, operator approval before publishing
- Interest requests go to operator only — no direct chat, call or contact reveal
- Payments: bKash/Nagad/Rocket/Card/Manual, pending until admin approval
- Roles: member, matchmaker, admin, owner
