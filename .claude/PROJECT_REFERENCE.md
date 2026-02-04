# Project Reference - SRWS API

## Overview
Strapi CMS API deployed on Railway with PostgreSQL database. Handles contact form submissions with spam protection and email notifications.

## Architecture
- **Framework**: Strapi 5.34.0
- **Database**: PostgreSQL (Railway)
- **Hosting**: Railway
- **Node Version**: 20.0.0 - 22.x.x

## Environment Variables

### Production (Railway)
- `RESEND_API_KEY` - Resend API key for email sending
- `RESEND_EMAIL_FROM` - Production verified sender email
- `CONTACT_EMAIL` - Recipient email for contact form submissions
- `TURNSTILE_SECRET_KEY` - Cloudflare Turnstile secret for spam protection
- `EMAIL_PROVIDER` - Email provider: "resend", "gmail", "sendgrid", "mailgun" (default: "gmail")

### Local Development
- `NODE_ENV` - Set to "development" automatically by `strapi develop`

### Optional (SMTP Providers)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Gmail SMTP config
- `SENDGRID_HOST`, `SENDGRID_API_KEY` - SendGrid config
- `MAILGUN_SMTP_HOST`, `MAILGUN_SMTP_USER`, `MAILGUN_SMTP_PASS` - Mailgun config

## Local Development Setup

All environment variables are managed in Railway (no local `.env` file needed).

2. Run development server (loads all variables from Railway):
   ```bash
   npm run dev
   ```

3. Access admin panel at `http://127.0.0.1:1337/admin`

## Key Features

### Contact Form (`/api/contact-submission`)
Located in: `src/api/contact-submission/controllers/contact-submission.js`

**Spam Protection:**
- Honeypot field check (hidden "website" field)
- Cloudflare Turnstile verification (skipped in development)

**Email Notification:**
- Supports multiple providers: Resend (HTTP API), Gmail, SendGrid, Mailgun (SMTP)
- Fire-and-forget async sending (doesn't block response)
- Uses different sender emails for local vs production

**Development Mode Behavior:**
- Skips Turnstile verification
- Skips threshold sending limit

## Git Workflow
- Main branch: `main`
- Current status: Modified `contact-submission.js` (email provider improvements)

## Recent Changes
- Switched from SMTP to Resend HTTP API for better cloud compatibility
- Added Cloudflare Turnstile server-side verification
- Added development mode overrides for local testing

---

## Email Setup: Why Resend?

**⚠️ Gmail SMTP was attempted but couldn't get it working.**

Railway (and most cloud platforms) block SMTP ports, causing connection failures. Switched to **Resend HTTP API** which uses standard HTTPS (port 443) and works reliably.

### Setting Up Resend

1. Sign up at [resend.com](https://resend.com)
2. **Verify Your Domain** (Dashboard → Domains → Add Domain)
   - Add provided DNS records (SPF, DKIM, DMARC)
   - Wait for verification (~5 minutes)
3. **Get API Key** (Dashboard → API Keys → Create)
4. **Configure in Railway:**
   ```bash
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_xxxxx
   RESEND_EMAIL_FROM=noreply@yourdomain.com  # Must be verified domain!
   CONTACT_EMAIL=your-work@gmail.com         # Where submissions go
   ```

**Important Constraints:**
- ❌ Cannot use `onboarding@resend.dev` (test only)
- ❌ Cannot use Gmail addresses (not verified in Resend)
- ✅ Must verify YOUR domain and send from that
- ✅ Can receive at any email (Gmail OK for `CONTACT_EMAIL`)

---

## Rate Limiting

**File:** `src/middlewares/contact-rate-limit.js`

- **Limit:** 3 submissions/hour per IP
- **Production only:** Disabled in development mode
- **Storage:** In-memory (resets on restart)

**To adjust:**
```javascript
const MAX_SUBMISSIONS = 3;           // Line 13
const WINDOW_MS = 60 * 60 * 1000;    // Line 14 (1 hour)
```

---

## API Endpoints

**Content Types:**
- `/api/about`, `/api/bookings`, `/api/clairs`
- `/api/testimonials`, `/api/word-clouds`
- `/api/tools`, `/api/toolboxes`, `/api/energy-and-frequencies`
- `/api/contact-submissions` (custom logic)

**Contact Submission Schema:**
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "email (required)",
  "phone": "string (optional)",
  "preferredReading": "Phone | Zoom (required)",
  "referral": "string (optional)",
  "message": "text (required)",
  "website": "honeypot (should be empty)",
  "turnstileToken": "CAPTCHA token"
}
```

---

## Troubleshooting

### Email Not Sending

**Check logs:**
```bash
railway logs | grep -i "email\|resend"
```

**Common issues:**
1. "Unauthorized" → Invalid `RESEND_API_KEY`
2. "Domain not verified" → Verify domain in Resend dashboard
3. "Invalid from address" → `RESEND_EMAIL_FROM` must match verified domain
4. Still using `onboarding@resend.dev` → Must use your domain

### Rate Limiting
- "Too many submissions" → Exceeded 3/hour (production only)
- Not working in dev? → Expected, disabled in development

---

## Important File Locations

### Custom Logic
- **Email sending:** `src/api/contact-submission/controllers/contact-submission.js`
  - Lines 48-75: Resend HTTP API
  - Lines 96-104: Honeypot check
  - Lines 106-133: Turnstile verification

- **Rate limiter:** `src/middlewares/contact-rate-limit.js`
  - Lines 13-14: Configure limits

### Config
- `config/database.js` - PostgreSQL
- `config/server.js` - Server settings
- `config/middlewares.js` - Middleware stack (line 12: rate limiter)

---

## Email Flow

```
POST /api/contact-submissions
  ↓
Rate Limiter → Reject if >3/hour (prod only)
  ↓
Honeypot Check → Reject if "website" filled
  ↓
Turnstile → Verify CAPTCHA (prod only)
  ↓
Save to PostgreSQL
  ↓
Send Email (async) → Resend HTTP API
  • From: RESEND_EMAIL_FROM (verified domain)
  • To: CONTACT_EMAIL (your Gmail)
  • Reply-To: Customer's email
  ↓
Return success immediately
```

---

## Commands

```bash
# Development
npm run develop              # Local dev server
railway run npm run develop  # Dev with Railway env
npm run dev                  # Alias for above

# Production
npm run start                # Production mode
npm run build                # Build admin panel

# Railway
railway login                # Authenticate
railway link                 # Link project
railway logs                 # View logs
railway logs -f              # Follow logs
```

---

## Notes for AI Agents

1. **Email:** Resend HTTP API is working. Don't suggest Gmail SMTP (it failed).
2. **Verified domains:** `RESEND_EMAIL_FROM` must be verified in Resend.
3. **Gmail receiving OK:** `CONTACT_EMAIL` can be Gmail (for receiving).
4. **Read before editing:** Always read `contact-submission.js` before changes.
5. **No local .env:** All vars in Railway, loaded via `railway run`.
6. **Dev mode:** Skips rate limiting and Turnstile automatically.

---

**Last Updated:** 2026-02-03
