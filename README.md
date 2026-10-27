# Brote

A personal companion for plant care.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Expo CLI](https://docs.expo.dev/more/expo-cli/)
- For Android builds: [Android Studio](https://developer.android.com/studio) with an Android SDK

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm start
   ```

   This opens the Expo dev server. From there you can:
   - Press `a` to open on an Android emulator
   - Press `i` to open on an iOS simulator
   - Scan the QR code with Expo Go (Android/iOS)

   Alternatively, start directly on a specific platform:

   ```bash
   npm run android   # Android emulator
   npm run ios       # iOS simulator
   npm run web       # Web browser
   ```

## Building for Android locally

### Development build

Generates a debug APK you can install on a device or emulator:

```bash
npx expo run:android
```

If this is the first time, Expo will generate the native `android/` project before building.

### Preview build (via EAS Build locally)

Produces a `.apk` ready to share with testers:

```bash
npx eas build --platform android --profile preview --local
```

### Production build

```bash
npx eas build --platform android --profile production --local
```

> **Note:** Make sure `ANDROID_HOME` is set and the Android SDK is installed before building.

## Other Commands

```bash
npm run lint        # Run ESLint
npm run gen-types   # Generate Supabase TypeScript types
```
