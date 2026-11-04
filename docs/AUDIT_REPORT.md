# Shaadi Mobarak — Technical Audit (2026-11-04)

## A. What already works
- Both ZIPs contain the same starter code (30 files). The handoff ZIP adds only `MUSE_AI_HANDOFF_BN.md` and `UPLOAD_TO_MUSE_AI_BN.txt`.
- React/Vite frontend and Express backend are compatible: same JSON API shape, `CLIENT_ORIGIN` CORS, HttpOnly cookie session.
- Auth: registration (bcrypt, 12 rounds), login for `active` accounts only, `/me`, logout, Zod validation, Helmet, CORS, auth rate limit, 100kb JSON limit.
- Palace build (already in this project before this order): palace hero, text-only royal teaser cards, scroll price board, Package/Biodata/InterestRequest/Payment models and routes, roles member/matchmaker/admin/owner.

## B. What was incomplete
- No public pages beyond one homepage; login button was a placeholder; no dashboards.
- No Shortlist, Notification, SupportTicket, Content, Consent, AuditLog, Membership, FollowUp or SiteSetting models.
- No matchmaking search API, no private photo upload, no OTP architecture, no account deletion, no payment approval → membership activation.
- No content management, analytics, settings, or deployment guide.

## C. What was created in this build
- Frontend (hash routing, no new router dependency): Home, About, Bride, Groom, Profile Details, Advanced Search, How It Works, Membership, Success Stories (empty until owner-approved stories exist), Blog, FAQ, Contact, Privacy, Terms, Login, Register, Member/Matchmaker/Admin dashboards. Bengali/English toggle.
- Backend models: Shortlist, Notification, SupportTicket, Content, Consent, AuditLog, Membership, FollowUp, SiteSetting; Biodata gained heightCm; User gained phone/OTP/privacy/partnerPreferences; Payment gained provider/gatewayRef/refund.
- Backend routes: `/api/matches`, `/api/shortlists`, `/api/notifications`, `/api/support`, `/api/content`, `/api/consents`, `/api/admin`, `/api/memberships`, `/api/followups`, `/api/uploads` (private, authenticated, JPG/PNG/WebP only, 5MB).
- Payment approval now creates a Membership and a Notification. Interest still goes to the operator only.

## D. Technical problems found and fixed
- Duplicate payment PATCH route (first one would have shadowed approval logic) — removed.
- Multer 1.x deprecation/vulnerability warning — upgraded to Multer 2.x.
- Frontend had placeholder alerts for search/login — replaced with real API calls.
- MongoDB connection could not be tested here: no `MONGODB_URI` was supplied in this session, and secrets must never be pasted in chat. Server fails cleanly with "MONGODB_URI is missing" instead of crashing.
- Vite production build passes. All server files pass `node --check`.

## E. Implementation plan / remaining owner decisions
1. Owner supplies MongoDB Atlas URI and JWT secret only via `.env` (never in chat), then run `npm install` + `npm run dev` and test login/biodata/payment flows against a real database.
2. Owner approves: final package prices, refund policy, SMS/email OTP provider, and bKash/Nagad/Rocket/SSLCommerz merchant credentials. Until then payments stay manual-approval only and no gateway is activated.
3. Owner provides approved success stories, blog/FAQ content, and any replacement hero image.
4. Deploy frontend (static host) + backend (Node host) + Atlas, with HTTPS, backups, and the Bengali deployment guide in `docs/DEPLOYMENT_BN.md`.
5. Do not publish "verified" claims, prices, or refund terms as final until the owner approves them.
