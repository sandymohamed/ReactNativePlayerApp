# IPTV Player - React Native

Modern IPTV player application built with React Native for TV and mobile devices (Android & iOS).

## Features

- 🎬 **Live TV Streaming** - Watch live channels
- 🎥 **Movies** - Browse and watch movies
- 📺 **Series** - Watch TV series with seasons and episodes
- 🔍 **Search** - Search for content
- ⭐ **Favorites** - Save your favorite content
- 📜 **Recent** - View recently watched content
- 🎨 **Modern UI** - Beautiful, modern interface with gradient themes
- 📱 **Cross-Platform** - Works on Android, iOS, Android TV, and Apple TV
- 🎮 **TV Navigation** - Full support for TV remote controls

## Tech Stack

- **React Native** 0.73.2
- **TypeScript**
- **React Navigation** - Navigation library
- **React Native Video** - Video playback
- **React Native Reanimated** - Animations
- **React Native Fast Image** - Optimized image loading
- **React Native Linear Gradient** - Gradient backgrounds

## Installation

### Prerequisites

- Node.js >= 18
- React Native development environment set up
- Android Studio (for Android)
- Xcode (for iOS)

### Setup

1. Install dependencies:
```bash
cd ReactNative
npm install
```

2. For iOS, install pods:
```bash
cd ios
pod install
cd ..
```

3. Run the app:

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

## Project Structure

```
ReactNative/
├── src/
│   ├── components/       # Reusable UI components
│   ├── screens/          # Screen components
│   ├── navigation/       # Navigation configuration
│   ├── context/          # React Context providers
│   ├── models/           # TypeScript models
│   ├── utils/            # Utility functions
│   ├── theme/            # Theme configuration
│   └── hooks/            # Custom React hooks
├── App.tsx               # Main app component
└── index.js              # Entry point
```

## Key Features Implementation

### TV Navigation Support

The app includes TV navigation support using `useTVEventHandler` hook for handling TV remote controls.

### Modern Theme

The app uses a modern gradient theme with:
- Primary colors: Indigo (#6366F1) and Pink (#EC4899)
- Dark background: Slate (#0F172A)
- Consistent spacing and typography

### Performance Optimizations

- Fast Image loading for optimized image rendering
- Lazy loading of content
- Efficient state management with Context API

## Configuration

### Android TV

To enable Android TV support, ensure your `AndroidManifest.xml` includes:

```xml
<uses-feature android:name="android.software.leanback" android:required="false" />
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
```

### iOS / Apple TV

For Apple TV support, configure your project settings in Xcode.

## Development

Start Metro bundler:
```bash
npm start
```

Run on specific platform:
```bash
npm run android
npm run ios
```

## Building for Production

### Android

```bash
cd android
./gradlew assembleRelease
```

### iOS

Open the project in Xcode and archive for App Store distribution.

## License

This project is part of the IPTV Player application.

## Notes

- This is a React Native implementation of the original web-based IPTV player
- The app maintains the same API integration and functionality
- Modern UI/UX improvements have been implemented
- TV navigation support has been added for better TV experience
