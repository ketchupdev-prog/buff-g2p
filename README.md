# buffr-g2p

Buffr G2P (Government-to-Person) — backend and mobile app (vouchers, wallets, and related flows).

## Repo layout

| Folder   | Description |
|----------|-------------|
| **backend/** | Backend API and services |
| **mobile/**  | Buffr Expo (React Native) app — all app code, native projects, and config |

## ⚠️ Known Limitations

**Important:** This codebase has stub implementations, mocks, and incomplete features.

See **[KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md)** for complete audit including:
- 🚨 **Critical Gaps:** Location API stubs, Compliance API stubs, Open Banking mock tokens
- ⚠️ **Incomplete Features:** Face ID integration, Analytics charts, USSD menu
- 📋 **Optional/Unclear Scope:** Country selection, Bank linking, Gamification

**Do not deploy to production** without addressing critical gaps listed in KNOWN_LIMITATIONS.md.

## Implemented Features

### Backend API Endpoints
- **Analytics Events** - `POST /api/v1/mobile/events` - Store user analytics events
- **Notifications** - `GET /api/v1/mobile/notifications` - Fetch user notifications
- **Notifications** - `PATCH /api/v1/mobile/notifications/:id/read` - Mark notification as read
- **Device Registration** - `POST /api/v1/mobile/device/register` - Register push notification tokens
- **ATM Codes** - `POST /api/cashout/atm-code` - Generate ATM withdrawal codes

### Mobile Features
- **Analytics Tracking** - Events sent to backend API
- **Push Notifications** - Full Expo Notifications integration
- **Notifications Screen** - Fetches from backend API

## Backend

```bash
cd backend
npm install
# See backend/README.md for run and deploy instructions.
```

### Database Migrations
Run migrations to add new tables:

```bash
cd backend
npm run migrate
```

Or from repo root: `npm run migrate`. To verify DB and migration state: `npm run db:check`.  
Full details: **[MIGRATIONS.md](MIGRATIONS.md)**; schema reference: **backend/docs/DB_STRUCTURE.md** (see also mobile PRD §16).

## Mobile

```bash
cd mobile
npm install
npx expo prebuild   # when you need native ios/android
npm start           # Expo dev server
npm run ios         # Run iOS (see mobile/docs/IOS_SETUP.md if needed)
npm run android     # Run Android
```

### Push Notifications
To enable push notifications, install expo-notifications:

```bash
cd mobile
npx expo install expo-notifications
```

## Repo

- **GitHub:** [ketchupdev-prog/buff-g2p](https://github.com/ketchupdev-prog/buff-g2p)

## License

Private. See LICENSE if present.
