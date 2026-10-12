# NOVA CONTROL

A responsive front-end prototype for authorized device support, recovery guidance, and device inventory.

## Included now

- Responsive dashboard designed for Android phones and desktop browsers.
- Demo device registry with local browser storage.
- Simulated online/offline status controls.
- Official-path recovery checklists for Android, Windows, and Linux.
- Factory-reset preparation checklist with data-loss warnings.
- Local activity log.
- No external JavaScript libraries or API keys.

## Important limitations

This is a **front-end prototype only**. It does not unlock phones or computers, bypass passwords, perform factory resets, stream device screens, or open remote-control sessions. Demo device records are not real device connections.

A production version needs a secure backend, real authentication, verified device enrollment, explicit per-session consent, a trusted remote-access agent or established remote-support integration, and platform-specific permissions. Keep recovery guidance within official account/device recovery processes. Never collect passwords or recovery keys in this app.

## Run on Android with Acode

1. Download and extract `nova-control.zip`.
2. Open the extracted folder in Acode.
3. Open `index.html` in the preview/browser.
4. Test the dashboard, device manager, recovery guides, and reset checklist.

It also works by opening `index.html` in a modern desktop browser.

## Publish with GitHub Pages

1. Create a new GitHub repository named `nova-control` under your account.
2. Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the repository root.
3. In the repository, open **Settings → Pages**.
4. Under build/deployment, select **Deploy from a branch**, choose `main` and `/ (root)`, then save.
5. Wait for the Pages deployment to finish. The published site URL will appear in Settings → Pages.

## Next production milestones

1. Backend authentication and account/session management.
2. Secure device enrollment with a one-time pairing flow.
3. Database-backed device inventory and audit trail.
4. Integrate a trusted remote-support solution rather than implementing stealth access.
5. Android/desktop agents with visible consent and clear disconnect controls.
6. Server-side authorization, rate limits, secure secrets, logging, and security review.

## Project structure

- `index.html` — application structure
- `styles.css` — responsive dark command-center interface
- `app.js` — navigation and local demo interactions
