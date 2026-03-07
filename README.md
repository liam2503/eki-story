
# Eki Story

## 🛠 Developer Setup Guide (Vite + Capacitor)

### 1. Clone & Initial Install

Open your terminal in VS Code and run:

Bash

```
git clone https://github.com/liam2503/eki-story.git
cd eki-story
npm install
npm install firebase

```

### 2. Environment Configuration

Create a file named `.env` in the root directory and add  API keys that are given to you:

Plaintext

```
VITE_GOOGLE_MAPS_KEY=your_actual_key_here
... etc ...

```

----------

## 💻 Local Development & Testing

### Web Development

To start the Vite development server:

Bash

```
npm run dev

```

-   **URL:** `http://localhost:5173`
    
-   **Features:** Fast builds and Hot Module Replacement (HMR).
    

### Running Tests

To run your local test suite (ensure dependencies are installed first):

Bash

```
npm test

```

_Use `npm test -- --watch` if you want the tests to re-run automatically as you make changes._

----------

## 📱 Mobile App Development

Before running on mobile, always ensure your web assets are compiled and synced:

Bash

```
npm run build
npx cap sync

```

### iOS (Simulator/Device)

Bash

```
npx cap run ios

```

_Note: Requires macOS and Xcode._

### Android (Emulator/Device)

Bash

```
npx cap run android

```

_Note: Requires Android Studio and a configured Android SDK._

----------

## 🏗 Production Build Process

When you are ready to generate a final version of the app:

1.  **Build Web Assets:** `npm run build`
    
2.  **Sync to Native:** `npx cap sync`
    
3.  **Open Native IDE:** * **iOS:** `npx cap open ios` (Opens Xcode for signing and archiving)
    
    -   **Android:** `npx cap open android` (Opens Android Studio for APK/Bundle generation)