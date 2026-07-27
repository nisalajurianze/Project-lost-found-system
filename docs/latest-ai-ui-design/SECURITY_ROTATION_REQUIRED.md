# Credential Rotation Required

The uploaded source archive contained a populated `backend/.env` file with real-looking database, media, AI, email, JWT, and web-push configuration values. The populated file has been removed from this release.

Treat every credential that appeared in that archive as compromised and rotate it before deployment:

1. MongoDB account/password or connection string credentials
2. Redis password, when applicable
3. JWT access secret
4. Cloudinary API secret
5. SMTP password or Resend API key
6. External AI provider keys
7. VAPID private key
8. Google OAuth credentials if any secret was included elsewhere

After rotation, invalidate old sessions, review provider audit logs, and store new values in the deployment platform's secret manager. Never place populated `.env` files in source archives or Git history.
