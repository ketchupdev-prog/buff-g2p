# Map setup (Agents nearby)

The map on **Home → Agents → View Map** uses `react-native-maps`.

## Android

1. Get a [Google Maps API key](https://console.cloud.google.com/google/maps-apis/) (Maps SDK for Android enabled).
2. In `app.json`, set your key:
   - `expo.android.config.googleMaps.apiKey` = your key (replace `YOUR_GOOGLE_MAPS_ANDROID_API_KEY`).
3. Rebuild the app (config changes need a new build):
   - `npx expo run:android`
   - or create a dev build with EAS and run that.

Without a valid key, Android will show a grey map. There is no in-app fallback; the map is the primary UI.

## iOS

Uses Apple Maps by default; no API key needed. For a custom map style or Google Maps on iOS, you’d add an iOS key and use it in the native config.

## Development build

Use a **development build** (`npx expo run:ios` or `npx expo run:android`), not Expo Go, so the native map module and keys are applied correctly.
