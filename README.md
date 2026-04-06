
# Eki Story

### Team Members:
-  Liam Persad
    
-   Cassady Mead
    
-   Soraha Ebara

A web and mobile app for Japanese railway enthusiasts to collect station stamps, catalog train models, and share discoveries with friends.

# 1. Installation and Running Instructions
## Live Website:
### https://liam2503.github.io/eki-story/

## Developer Install Instructions
Use these instructions if you with to run the app from the codebase instead.

### 1. Clone & Install

Run these commands in a bash terminal:

```
git clone https://github.com/liam2503/eki-story.git
cd eki-story
npm install
```

### 2a. Run Local Web Dev Server

Run these commands in a bash terminal and open the outputted link:

```
npm run dev

```

### 2b. Build for Mobile

Run these commands in a bash terminal:

```
npm run build
npx cap sync
```
For iOS / iPad OS devices: (requires XCode)
```
npx cap run ios
```
OR for Android Devices: (requires Android Studio)
```
npx cap run android
```

# 2. File Structure Overview
-   **`www/`**: The core frontend directory containing the web application.
    
    -   **`index.html`**: The main application shell.
        
    -   **`feed.html`, `list.html`, `profile.html`, `settings.html`**: Turbo Frames handling specific UI views.
        
    -   **`javascript/`**: Contains all modular JavaScript logic, including Firebase integration, UI state, camera controls, map rendering, and IndexedDB caching.
        
-   **`android/` & `ios/`**: Native mobile project environments generated and managed by Capacitor.
    
-   **`package.json`**: Node.js dependencies and project scripts.
    
-   **`vite.config.js`**: Configuration file for the Vite bundler.
    
-   **`capacitor.config.json`**: Settings for bridging the web app to native mobile components.

## 3. Attribution

**External Assets & Libraries**:

-   **Frontend Tooling:** Vite ([https://vitejs.dev/](https://vitejs.dev/))
    
-   **Styling:** Tailwind CSS ([https://tailwindcss.com/](https://tailwindcss.com/))
    
-   **Mobile Framework:** Capacitor by Ionic ([https://capacitorjs.com/](https://capacitorjs.com/))
    
-   **Navigation:** Turbo Frames / Hotwire ([https://turbo.hotwired.dev/](https://turbo.hotwired.dev/))
    
-   **Backend Services:** Firebase (Auth, Firestore, Storage) ([https://firebase.google.com/](https://firebase.google.com/))
    
-   **Mapping:** Google Maps JavaScript API ([https://developers.google.com/maps](https://developers.google.com/maps))
    
-   **Image Processing:** OpenCV.js ([https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html))

