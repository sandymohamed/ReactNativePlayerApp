# Setup Guide - IPTV Player React Native

## Initial Setup

### 1. Install Dependencies

```bash
cd ReactNative
npm install
```

### 2. iOS Setup (macOS only)

```bash
cd ios
pod install
cd ..
```

### 3. Android Setup

Make sure you have:
- Android Studio installed
- Android SDK configured
- Android emulator or physical device connected

### 4. Run the App

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

## Project Initialization (First Time)

If you're setting up a fresh React Native project, you'll need to:

1. **Initialize React Native project** (if not already done):
```bash
npx react-native@latest init IPTVPlayer --template react-native-template-typescript
```

2. **Copy the src folder** from this project to the new project

3. **Install all dependencies** from package.json

4. **Link native modules** (if needed):
```bash
npx react-native link
```

## TV Support Configuration

### Android TV

The AndroidManifest.xml already includes TV support. To test on Android TV:

1. Create an Android TV emulator in Android Studio
2. Run: `npm run android`

### Apple TV

For Apple TV support:

1. Open the project in Xcode
2. Add a new target for tvOS
3. Configure the tvOS target settings

## Troubleshooting

### Metro Bundler Issues

If Metro bundler has issues:
```bash
npm start -- --reset-cache
```

### iOS Build Issues

```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

### Android Build Issues

```bash
cd android
./gradlew clean
cd ..
```

### TypeScript Errors

Make sure all type definitions are installed:
```bash
npm install --save-dev @types/react @types/react-native
```

## Development Tips

1. **Hot Reload**: Enabled by default. Shake device or press `Cmd+D` (iOS) / `Ctrl+M` (Android) to open dev menu

2. **Debugging**: Use React Native Debugger or Chrome DevTools

3. **Performance**: Use React DevTools Profiler to identify performance issues

4. **TV Navigation**: Test TV navigation using Android TV emulator or Apple TV simulator

## Building for Production

### Android APK

```bash
cd android
./gradlew assembleRelease
```

The APK will be in: `android/app/build/outputs/apk/release/`

### iOS Archive

1. Open project in Xcode
2. Select "Any iOS Device" as target
3. Product > Archive
4. Follow the distribution wizard

## Environment Variables

Create a `.env` file in the root for environment-specific configurations:

```
API_BASE_URL=https://api.uiplayer.com
```

## Notes

- The app uses the same API endpoints as the web version
- All API calls are in `src/utils/constants.ts`
- Theme configuration is in `src/theme/`
- Navigation is configured in `src/navigation/AppNavigator.tsx`
