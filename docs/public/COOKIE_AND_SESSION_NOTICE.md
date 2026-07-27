# Cookie and Session Notice

> **Status:** University-review draft  
> **Release date:** 2026-07-26  
> **Important:** Replace bracketed institutional placeholders and obtain formal university approval before public deployment.

## Essential cookies
The application uses essential secure cookies for access and refresh sessions and CSRF protection. Production cookies must be `HttpOnly`, `Secure` and appropriately `SameSite`; refresh tokens are not stored in browser local storage or URL query parameters.

## Local browser storage
Local storage may hold non-sensitive preferences and recoverable report drafts, such as selected language, theme and report text. It must not hold access/refresh tokens, passwords, private evidence or provider keys. Browser security prevents image files from being restored automatically after reload.

## Optional technologies
Push-notification subscriptions and install/PWA state are optional. Analytics or non-essential cookies must remain disabled until the university approves a consent mechanism and processor terms.

## Session control
Users can log out, change passwords and request session revocation. Administrators may revoke sessions after account/security changes. Expiry/rotation values are configured server-side and documented in deployment settings.
