# Talabat COD Finder

> Qatar's fastest COD machine locator for Talabat riders

A professional Expo (React Native) mobile app that shows all 109 COD machine locations in Qatar on a live Google Map, finds the nearest machine to the rider, draws turn-by-turn routes, and logs shift activity.

---

## Features

- **109 COD machine markers** on Google Maps with custom Talabat-orange pins
- **Live GPS tracking** — tap the crosshair button for a real-time high-accuracy location fix
- **Find Nearest Machine** — instantly highlights the closest machine and shows distance/ETA
- **Turn-by-turn directions** — Google Directions API polyline with step-by-step panel
- **Navigation picker** — open in 🍎 Apple Maps, 🗺 Google Maps, or 🔵 Waze
- **Shift tracker** — start/end shift with live timer, log visits, view history grouped by date
- **Search** — filter machines by number or coordinates
- **Dark mode** support, satellite/traffic toggle in Settings
- Poppins font, Talabat orange `#FF5A00` design system

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 53 (React Native) |
| Navigation | Expo Router (file-based) |
| Maps | react-native-maps + Google Maps SDK |
| Location | expo-location |
| Directions | Google Directions API |
| Storage | @react-native-async-storage |
| Fonts | @expo-google-fonts/poppins |
| Icons | @expo/vector-icons (Feather) |
| Haptics | expo-haptics |

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Expo Go app on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))

### Install & Run

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm expo start

# Scan the QR code with Expo Go on your phone
```

### Google Maps API Key

The API key is already embedded in `app.json`. If you fork this repo and need your own key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Maps SDK for Android**, **Maps SDK for iOS**, and **Directions API**
3. Replace the key in `app.json` under `android.config.googleMaps.apiKey` and `ios.config.googleMapsApiKey`

---

## Building an APK / AAB

This project uses [EAS Build](https://docs.expo.dev/build/introduction/) to produce native binaries.

### Setup (one-time)

```bash
npm install -g eas-cli
eas login          # your Expo account
eas build:configure
```

### Preview APK (Android — sideload / share link)

```bash
eas build --platform android --profile preview
```

Produces a `.apk` you can install directly on any Android device.

### Production AAB (Google Play Store)

```bash
eas build --platform android --profile production
```

Produces a signed `.aab` ready for Play Store upload.

### iOS IPA

```bash
eas build --platform ios --profile preview
```

Requires an Apple Developer account.

---

## Project Structure

```
app/
  (tabs)/
    index.tsx       # Map screen — GPS, markers, route, FABs
    shift.tsx       # Shift tracker — timer, visit logger, history
    settings.tsx    # Settings — dark mode, traffic, satellite
    _layout.tsx     # Tab bar (3 tabs)
  _layout.tsx       # Root layout — fonts, splash, context
components/
  MapContainer.tsx      # Native map (react-native-maps)
  MapContainer.web.tsx  # Web fallback (list UI)
constants/
  machines.ts       # 109 COD machine coordinates + distance helpers
context/
  AppContext.tsx    # Global settings (dark mode, GPS refresh, etc.)
hooks/
  useColors.ts      # Theme-aware color tokens
utils/
  directions.ts     # Google Directions API + polyline decoder
assets/
  images/           # Splash screen, icons
```

---

## License

MIT — free to use and modify for Talabat riders in Qatar.
