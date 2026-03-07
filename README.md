# Eki Story

Japanese train travel logging app. Log station visits, collect stamps, and share with friends.

**Stack:** React + Vite + Firebase + Google Maps + Capacitor

---

## Setup

```bash
git clone https://github.com/liam2503/eki-story.git
cd eki-story
npm install
cp .env.sample .env
# Fill in API keys in .env
```

## Development

```bash
npm run dev        # http://localhost:5173
```

## Mobile

```bash
npm run build
npx cap sync
npx cap open ios       # Xcode
npx cap open android   # Android Studio
```

## Station Data Import

Requires `serviceAccount.json` from Firebase Console → Project Settings → Service Accounts.

```bash
npm run import-ekidata
```
