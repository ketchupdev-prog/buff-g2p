# Build & deploy – Buffr G2P Mobile

## G1 – Google Maps API key

- **Local dev:** `app.json` uses placeholder `YOUR_GOOGLE_MAPS_ANDROID_API_KEY`. Replace with your key for maps/agents to work.
- **Production / CI:** Inject the key via a CI secret (e.g. `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`) and use `app.config.js` that reads `process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY` so the real key is never committed.
