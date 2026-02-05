# HealthDemo

A React Native CLI project for unified health data integration.

## Features
- **Unified HealthLayer**: Seamless access to iOS HealthKit and Android Health Connect.
- **Android Health App Gate**: Ensures Google Fit or Fitbit is installed.
- **Trusted Source Filtering**: Android data is filtered by an allowlist.
- **Debug Screen**: Minimal UI to verify HealthState and JSON payloads.
- **Issue #183 Workaround**: Fallback check for Total Calories if Active Calories are zero on Android.

## Setup Instructions

### 1. Project Initialization
The project was initialized with:
```bash
npx @react-native-community/cli init HealthDemo --skip-install
```

### 2. Dependency Installation
Run the following in the project root:
```bash
npm install
```

### 3. iOS Configuration
1. **CocoaPods**:
   ```bash
   cd ios && pod install && cd ..
   ```
2. **Xcode**:
   - Open `ios/HealthDemo.xcworkspace`.
   - Go to **Signing & Capabilities**.
   - Add the **HealthKit** capability.
   - Ensure `Info.plist` has `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription` (already added).

### 4. Android Configuration
1. **Health Connect**:
   - Ensure the Health Connect app is installed on the device/emulator.
   - Permissions and rationale intent are already added to `AndroidManifest.xml`.
2. **Native Module**:
   - The `CheckPackageInstallation` module is already implemented and registered in `MainApplication.kt`.

### 5. Running the App
- **Android**: `npx react-native run-android`
- **iOS**: `npx react-native run-ios`

## Technical Details

### Hourly Payload Format
```typescript
type HourlyHealthPayload = {
  steps: number;
  activeCalories: number;
  activeCaloriesUnit: "kcal";
  distance: number;
  distanceUnit: "m";
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
};
```
The payload returns up to the current hour (maximum 24 items).

### Android Trusted Sources
Current allowlist: `["com.google.android.apps.fitness"]`.
Modifiable in `src/health/utils/trustedSourcePolicy.ts`.
