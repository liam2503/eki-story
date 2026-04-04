# Eki Story

A web and mobile app for Japanese railway enthusiasts to collect station stamps, catalog train models, and share discoveries with friends.

## Features

- **Station Stamps** — Photograph station stamps, crop and refine them with OpenCV-based image processing, and build a personal collection
- **Train Model Log** — Photograph and catalog train models by line and date
- **Interactive Rail Map** — Google Maps with color-coded train lines, station markers, and real-time user location
- **Station & Line Browser** — Filterable by prefecture and company; full-text search; visited station tracking
- **Social Feed** — Share stamps, models, and station visits; friend system with request/accept flow; comment threads; friends-only filter
- **User Profiles** — View stats (stations visited, stamps collected) and manage friends
- **Bilingual UI** — English and Japanese, switchable at any time
- **Offline Support** — Stations, lines, and search index cached in IndexedDB

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend bundler | Vite |
| Styling | Tailwind CSS |
| Mobile | Capacitor (iOS & Android) |
| Navigation | Turbo Frames (@hotwired/turbo) |
| Backend | Firebase (Auth, Firestore, Storage, Analytics) |
| Maps | Google Maps JavaScript API |
| Image processing | OpenCV.js (lazy-loaded) |
| i18n | Custom (`i18n.js`) |
| Offline cache | IndexedDB (`idb.js`) |

## Project Structure

```
eki-story/
├── www/
│   ├── index.html          # App shell; Turbo Frames for feed/list/profile/settings
│   ├── feed.html           # Social feed frame
│   ├── list.html           # Station/line browser frame
│   ├── profile.html        # User profile frame
│   ├── settings.html       # Settings frame
│   └── javascript/
│       ├── main.js         # Entry point; initializes all modules
│       ├── firebase.js     # Firebase app init and exports
│       ├── auth.js         # Auth (email, Google, anonymous, guest upgrade)
│       ├── feed.js         # Social feed (posts, comments, friend filtering)
│       ├── user.js         # User state; visited stations, stamps, models, friends
│       ├── profile.js      # Profile frame; friend management
│       ├── settings.js     # Settings panel (dark mode, language, account)
│       ├── list.js         # Station/line browser; IndexedDB caching
│       ├── list_state.js   # Shared state for list view
│       ├── list_render.js  # Paginated/lazy line and station rendering
│       ├── list_search.js  # Prefecture/company dropdown filters
│       ├── list_detail.js  # Station detail; stamp/model capture entry points
│       ├── stamp_ui.js     # Stamp capture flow (camera → crop → refine → save)
│       ├── stamp_camera.js # Camera stream management
│       ├── stamp_crop.js   # Perspective crop with interactive quad handles
│       ├── stamp_refine.js # Brush/eraser refinement canvas with undo
│       ├── stamp_cv_loader.js # Lazy loads OpenCV.js
│       ├── stamp_book.js   # Stamp collection viewer with memo support
│       ├── model_ui.js     # Train model capture flow
│       ├── rail.js         # Google Maps init; markers, polylines, clustering
│       ├── map_utils.js    # Firestore sync for map data
│       ├── map_markers.js  # Station marker rendering (zoom-adaptive)
│       ├── map_layers.js   # Train line polyline rendering
│       ├── search.js       # Station/line full-text search with IndexedDB cache
│       ├── ui.js           # Navigation and tab/shell switching
│       ├── i18n.js         # English/Japanese translations and language switching
│       ├── idb.js          # IndexedDB async wrapper
│       └── audio.js        # Sound effects
├── package.json
├── vite.config.js
└── capacitor.config.json
```

## Developer Setup

### 1. Clone & Install

```bash
git clone https://github.com/liam2503/eki-story.git
cd eki-story
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# Google
VITE_GOOGLE_MAPS_KEY=
VITE_GOOGLE_CLIENT_ID=
```

Contact the project owner for the actual values.

### 3. Firebase Setup

The app requires the following Firebase services to be enabled in the Firebase console:

- **Authentication** — Email/Password, Google, and Anonymous sign-in providers
- **Firestore** — Database with security rules configured
- **Storage** — For stamp and model image uploads

### 4. Start the Dev Server

```bash
npm run dev
```

Open `http://localhost:5173`.

> **Note:** Some native features (camera, Google Sign-In on iOS/Android) are only available in a native build. On web, camera access uses the browser's `getUserMedia` API.

## Development Workflow

### Branching

Follow conventional commit prefixes for branch names:

| Type | Branch prefix | Example |
|------|--------------|---------|
| New feature | `feat/` | `feat/add-station-notes` |
| Bug fix | `fix/` | `fix/issue42-feed-click` |
| Refactor | `refactor/` | `refactor/extract-map-utils` |
| Docs | `docs/` | `docs/update-readme` |
| Chore | `chore/` | `chore/update-deps` |

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(feed): add post pinning
fix(auth): surface Firestore errors in catch block
refactor(map): extract marker color logic to map_utils
```

### Pull Requests

1. Branch off `main`, make your changes, commit
2. Run `git fetch origin main && git rebase origin/main` before opening a PR
3. Open a PR against `main` on GitHub

## Mobile Builds

Before building for mobile, compile and sync web assets:

```bash
npm run build
npx cap sync
```

### iOS

```bash
npx cap run ios
# or open in Xcode:
npx cap open ios
```

Requires macOS and Xcode.

### Android

```bash
npx cap run android
# or open in Android Studio:
npx cap open android
```

Requires Android Studio and a configured Android SDK.

## Production Build

```bash
npm run build      # Compile web assets to dist/
npx cap sync       # Sync to native iOS/Android projects
npx cap open ios   # Archive in Xcode
npx cap open android  # Generate APK/AAB in Android Studio
```

## Known Limitations

- OpenCV.js (~8 MB) is lazy-loaded on first stamp capture; there may be a brief loading delay
- Google Sign-In on native platforms requires the `@capgo/capacitor-social-login` plugin and a correctly configured OAuth client ID for each platform
- Firestore offline persistence uses multi-tab synchronization; clearing browser storage will reset the local cache
- The map requires a Google Maps API key with the Maps JavaScript API and Places API enabled
