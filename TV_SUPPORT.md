# TV Support – Samsung, LG, Android TV, Apple TV

## Does this app work on Samsung and LG smart TVs?

**No.** This React Native app **does not run** on:

- **Samsung Smart TVs** (Tizen)
- **LG Smart TVs** (webOS)

React Native supports **Android** and **iOS** (and tvOS). Samsung and LG smart TVs use **Tizen** and **webOS**, which are different platforms. There is no React Native runtime for Tizen or webOS, so this app cannot be installed or run on those TVs.

The codebase mentions Tizen/WebOS only in **comments** (e.g. `HomeScreen.tsx`) as a reference for how the **web** version identifies device types (MAC, type 3 for Tizen, type 5 for WebOS). The RN app explicitly uses a fallback: *"React Native has no Tizen/WebOS, so we use the same fallback as web."*

To run on Samsung or LG TVs you would need a **separate** app:

- **Samsung**: Tizen app (e.g. Tizen Studio, JavaScript/HTML5)
- **LG**: webOS app (e.g. webOS TV SDK)

---

## Which TVs *are* supported?

| Platform        | Supported? | Notes                                                    |
|----------------|------------|----------------------------------------------------------|
| **Android TV** | ✅ Yes     | Configured in `AndroidManifest.xml` (leanback, etc.)    |
| **Apple TV**   | ⚠️ Partial | Not fully set up; requires a tvOS target in Xcode       |
| **Samsung**    | ❌ No      | Tizen – RN does not run there                           |
| **LG**         | ❌ No      | webOS – RN does not run there                           |

The app also runs on **Android phones/tablets** and **iPhone/iPad**; TV-specific logic (e.g. `useTVEventHandler`) is used only when `TVEventHandler` is available (Android TV / Apple TV).

---

## How to run and test on TVs

### 1. Android TV (emulator)

1. **Android Studio**  
   - Install [Android Studio](https://developer.android.com/studio) and the Android SDK.

2. **Create an Android TV AVD**  
   - **Tools → Device Manager** (or **AVD Manager**).  
   - **Create Virtual Device** → choose **TV** (e.g. **Android TV (1080p)** or **Android TV (4K)**).  
   - Pick a system image (e.g. API 33+), finish creation.

3. **Start the TV emulator**  
   - Launch the TV AVD from Device Manager.

4. **Run the app**  
   ```bash
   cd ReactNative
   npm install
   npm start
   ```  
   In another terminal:
   ```bash
   cd ReactNative
   npm run android
   ```  
   With only the TV emulator connected, the app installs and runs there.  
   If you have multiple devices:
   ```bash
   adb devices
   npm run android -- --deviceId <device_id>
   ```

### 2. Physical Android TV or Android TV box

1. **Enable Developer options** on the TV/box (usually **Settings → About → Build number** tap 7 times).

2. **Enable USB debugging** (and optionally **Network debugging** / **ADB over network**).

3. **Connect**  
   - **USB**: Connect the TV/box to your PC via USB, allow USB debugging when prompted.  
   - **Network**: On the TV, note the IP and port (e.g. `192.168.1.10:5555`). On your PC:
     ```bash
     adb connect 192.168.1.10:5555
     ```

4. **Verify**  
   ```bash
   adb devices
   ```

5. **Run the app**  
   - Start Metro: `npm start` (in `ReactNative`).  
   - Deploy: `npm run android`.  
   - Or build and install manually:
     ```bash
     cd ReactNative/android
     ./gradlew assembleDebug
     adb install -r app/build/outputs/apk/debug/app-debug.apk
     ```

### 3. Fire TV (Amazon)

Fire TV is Android-based. Use the same steps as for **Physical Android TV**: enable ADB (USB or over network), `adb connect` if needed, then `adb devices` and `npm run android`.

### 4. Apple TV (tvOS)

Currently **not fully configured**. The project has an `ios` folder but **no tvOS target**. To support Apple TV you would need to:

- Add a **tvOS** target in Xcode.
- Configure the app for tvOS (capabilities, deployment target, etc.).
- Resolve any APIs that are iOS-only (e.g. some native modules).

The app already uses `useTVEventHandler`; that can work on tvOS once the target exists.

---

## TV-specific behavior in the app

- **`useTVEventHandler`**  
  Handles remote keys: **Up**, **Down**, **Select**, **Play/Pause**, **Back**, etc.  
  It only runs when `TVEventHandler` is available (e.g. Android TV, Apple TV); it’s no-op on phones.

- **AndroidManifest.xml**  
  - `android.software.leanback` and `android.hardware.touchscreen` (optional) for TV.  
  - `LEANBACK_LAUNCHER` intent so the app appears in the Android TV launcher.

- **Navigation**  
  Main, Live, Movies, Series, Player, etc. support D-pad/remote navigation where `useTVEventHandler` is used.

---

## Quick reference

| Goal                    | Command / action                                      |
|-------------------------|--------------------------------------------------------|
| List ADB devices        | `adb devices`                                         |
| Run on default device   | `npm run android` (with Metro running)                |
| Run on specific device  | `npm run android -- --deviceId <id>`                  |
| Install debug APK       | `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` |
| Connect TV over network | `adb connect <TV_IP>:5555`                            |
| View logs               | `adb logcat \| grep -i react`                         |

---

## Summary

- **Samsung / LG smart TVs**: **Not supported**; use Tizen/webOS apps or a web app instead.  
- **Android TV (and Fire TV)**: **Supported**; use emulator or physical device + ADB, then `npm run android`.  
- **Apple TV**: **Not yet set up**; add a tvOS target in Xcode to enable it.
