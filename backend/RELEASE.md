# Poster phone opt-in release

This backend includes the owner-consented poster phone option introduced in `8a6fa90`.
Deploy the latest `main` source, not a rebuild of the older `c9a9cd7` deployment.

- Phone inclusion defaults off and is restricted to the lost-report owner.
- The phone is read from the owner's profile; other private report fields stay excluded.
- Verify with `node --test tests/poster-phone.test.js` and `/api/health/ready`.
- A READY health response alone does not verify the deployed source revision or authenticated poster flow.
