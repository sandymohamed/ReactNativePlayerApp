# Installing IPTV Player on Android Device via USB

## Prerequisites

1. **Enable Developer Options on your Android device:**
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - You'll see "You are now a developer!"

2. **Enable USB Debugging:**
   - Go to Settings → Developer Options
   - Enable "USB Debugging"
   - Enable "Install via USB" (if available)

3. **Connect your device:**
   - Connect Android device to computer via USB cable
   - On your device, allow USB debugging when prompted
   - Select "Always allow from this computer" if prompted

## Installation Steps

### Method 1: Using React Native CLI (Recommended)

1. **Verify device is connected:**
   ```bash
   adb devices
   ```
   You should see your device listed.

2. **Start Metro bundler (in one terminal):**
   ```bash
   cd ReactNative
   npm start
   ```

3. **Install and run app (in another terminal):**
   ```bash
   cd ReactNative
   npm run android
   ```

The app will automatically:
- Build the APK
- Install it on your connected device
- Launch the app

### Method 2: Build APK and Install Manually

1. **Build the APK:**
   ```bash
   cd ReactNative/android
   ./gradlew assembleDebug
   ```

2. **Install the APK:**
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

3. **Launch the app:**
   ```bash
   adb shell am start -n com.iptvplayer/.MainActivity
   ```

### Method 3: Using Android Studio

1. Open Android Studio
2. Open the `ReactNative/android` folder
3. Select your connected device from the device dropdown
4. Click Run (green play button)

## Troubleshooting

### Device not detected?

1. **Check USB connection:**
   - Try a different USB cable
   - Try a different USB port
   - Make sure USB debugging is enabled

2. **Install USB drivers:**
   - For Samsung: Install Samsung USB drivers
   - For other devices: Install Universal ADB drivers
   - Or use Google USB drivers from Android SDK

3. **Restart ADB:**
   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

### Build errors?

1. **Clean build:**
   ```bash
   cd ReactNative/android
   ./gradlew clean
   cd ..
   npm run android
   ```

2. **Clear Metro cache:**
   ```bash
   npm start -- --reset-cache
   ```

### App crashes on launch?

1. **Check logs:**
   ```bash
   adb logcat | grep ReactNative
   ```

2. **Check device compatibility:**
   - Minimum Android version: 6.0 (API 23)
   - Ensure device has enough storage

## Quick Commands Reference

```bash
# Check connected devices
adb devices

# Install app
npm run android

# View logs
adb logcat

# Uninstall app
adb uninstall com.iptvplayer

# Restart app
adb shell am force-stop com.iptvplayer
adb shell am start -n com.iptvplayer/.MainActivity
```

## Notes

- First build may take 5-10 minutes
- Keep Metro bundler running while developing
- Hot reload works automatically when you save files
- Shake device or press `Ctrl+M` (Windows) to open dev menu
