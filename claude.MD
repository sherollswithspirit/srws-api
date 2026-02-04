# Claude Code Reference

## Project Documentation
For comprehensive project information, architecture, and setup instructions, see:
[.claude/PROJECT_REFERENCE.md](.claude/PROJECT_REFERENCE.md)

## Quick Reference

### Local Development
```bash
npm run dev  # Runs with Railway env variables
```

### Key Files
- [src/api/contact-submission/controllers/contact-submission.js](src/api/contact-submission/controllers/contact-submission.js) - Contact form handler with spam protection and email notifications
- [.claude/PROJECT_REFERENCE.md](.claude/PROJECT_REFERENCE.md) - Full project documentation

### Environment Setup
All environment variables are managed in Railway dashboard.
For local testing, set these in Railway:
- `RESEND_EMAIL_FROM_LOCAL` - Local verified sender email
- `EMAIL_PROVIDER_LOCAL` - Local email provider

### Important Notes
- This is a Railway-deployed Strapi application
- Uses PostgreSQL database from Railway
- Development mode automatically skips Turnstile verification
- Local environment variables override production variables in development
- Email sending is fire-and-forget (doesn't block API responses)

## Common Tasks

### Testing Contact Form Locally
1. Set `RESEND_EMAIL_FROM_LOCAL` in `.env`
2. Run `npm run dev`
3. Submit form to `/api/contact-submissions`

### Deployment
- Automatically deploys to Railway on push to main
- Environment variables managed in Railway dashboard

---

**Always check** [.claude/PROJECT_REFERENCE.md](.claude/PROJECT_REFERENCE.md) **for detailed project information.**
