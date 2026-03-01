# buffr-g2p

Buffr G2P (Government-to-Person) — backend and mobile app (vouchers, wallets, and related flows).

## Repo layout

| Folder   | Description |
|----------|-------------|
| **backend/** | Backend API and services |
| **mobile/**  | Buffr Expo (React Native) app — all app code, native projects, and config |

## Backend

```bash
cd backend
npm install
# See backend/README.md for run and deploy instructions.
```

## Mobile

```bash
cd mobile
npm install
npx expo prebuild   # when you need native ios/android
npm start           # Expo dev server
npm run ios         # Run iOS (see mobile/docs/IOS_SETUP.md if needed)
npm run android     # Run Android
```

## Repo

- **GitHub:** [ketchupdev-prog/buff-g2p](https://github.com/ketchupdev-prog/buff-g2p)

## License

Private. See LICENSE if present.
