# BBPS React Native SDK

React Native wrapper for BBPS (Bharat Bill Payment System) native SDKs.

## Prerequisites

- React Native >= 0.60.0
- iOS: Xcode 14+, iOS 12.0+
- Android: minSdkVersion 21, compileSdkVersion 33+

## Installation

```bash
npm install bbps-react-native-sdk
# or
yarn add bbps-react-native-sdk
```

### iOS Setup

1. Navigate to your iOS directory:
```bash
cd ios && pod install && cd ..
```

2. **Integrate the native BBPS SDK** via Swift Package Manager (SPM):
   - In Xcode, select your project → `Package Dependencies`
   - Click `+` and add the BBPSSDK repository URL
   - Select the appropriate version/branch

3. Ensure your app's `Podfile` has the correct iOS deployment target:
```ruby
platform :ios, '12.0'
```

### Android Setup

The SDK auto-links on React Native 0.60+. Ensure your app's `android/build.gradle` meets minimum requirements:

```gradle
android {
    compileSdkVersion 33
    defaultConfig {
        minSdkVersion 21
        targetSdkVersion 33
    }
}
```

Add your native BBPS SDK dependency. If distributed via Maven:
```gradle
dependencies {
    implementation "in.juspay:bbps:X.Y.Z"
}
```

If using a custom Maven repository:
```gradle
repositories {
    maven { url 'https://your-repo-url.com/' }
}
```

## Quick Start

### 1. Import the SDK

```typescript
import {
  createService,
  initiate,
  process,
  terminate,
  BbpsRawEvent,
} from 'bbps-react-native-sdk';
```

### 2. Create Service & Register Callback

```typescript
const handleBbpsEvent = (event: BbpsRawEvent) => {
  console.log(`Event: ${event.event}`, event.payload);

  switch (event.event.toLowerCase()) {
    case 'initiate_result':
      // Handle initiate response
      console.log('Initiate successful:', event.payload);
      break;
    case 'process_result':
      // Handle process response
      console.log('Process completed:', event.payload);
      break;
    case 'do_payment':
      // SDK requesting payment initiation
      console.log('Payment required:', event.payload);
      break;
    case 'refresh_auth':
      // Token refresh needed
      console.log('Auth token expired, refresh needed');
      break;
    case 'user_exit':
      // User closed the SDK flow
      console.log('User exited');
      break;
  }
};

// Initialize the service with your client ID
await createService('YOUR_CLIENT_ID', handleBbpsEvent);
```

### 3. Initiate Session

```typescript
const initiatePayload = {
  action: 'initiate',
  clientId: 'YOUR_CLIENT_ID',
  agentId: 'YOUR_AGENT_ID',
  environment: 'sandbox', // or 'production'
  mobile: '9876543210',
  deviceId: 'DEVICE_ID',
  issuingCou: 'your_cou',
  authToken: 'YOUR_AUTH_TOKEN',
};

await initiate(initiatePayload);
```

### 4. Process Transaction

```typescript
const processPayload = {
  action: 'BBPS_PAYMENT',
  agentId: 'YOUR_AGENT_ID',
  authToken: 'YOUR_AUTH_TOKEN',
  // Additional transaction parameters
};

await process(processPayload);
```

### 5. Cleanup

```typescript
terminate(); // Clean up resources and remove callback
```

## API Reference

### `createService(clientId: string, callback?: (event: BbpsRawEvent) => void): Promise<void>`

Initializes the BBPS service with your client ID and optional event callback.

**Parameters:**
- `clientId` - Your BBPS client identifier
- `callback` - Function to receive events from the native SDK

### `initiate(payload: Record<string, any>): Promise<void>`

Initiates a BBPS session. The native SDK will present its UI.

**Parameters:**
- `payload` - Initiate parameters (action, clientId, authToken, etc.)

### `process(payload: Record<string, any>): Promise<void>`

Processes a BBPS transaction (payment, bill fetch, etc.).

**Parameters:**
- `payload` - Process parameters (action, authToken, transaction details)

### `terminate(): void`

Cleans up the service and removes event listeners.

### `onBackPressed(): Promise<boolean>`

Handles hardware back button press on Android / dismiss on iOS.

**Returns:** `true` if handled by SDK, `false` otherwise

### `testEmit(): Promise<string>`

Diagnostic method to test event callback wiring.

## Event Types

The native SDK communicates back via events with the following structure:

```typescript
interface BbpsRawEvent {
  event: string;        // Event type identifier
  payload: object;      // Event-specific data
}
```

### Common Events

| Event | Description |
|-------|-------------|
| `initiate_result` | Session initialization complete |
| `process_result` | Transaction processing complete |
| `do_payment` | SDK requesting payment authorization |
| `refresh_auth` | Authentication token needs refresh |
| `user_exit` | User closed/dismissed the SDK |

## Platform Notes

### iOS
- Requires BBPSSDK integrated via Swift Package Manager
- Uses runtime messaging to avoid compile-time coupling
- Supports iOS 12.0+

### Android
- Auto-links on React Native 0.60+
- Requires FragmentActivity context
- Supports Android API 21+

## Troubleshooting

### "BBPS_SDK_MISSING" Error (iOS)
The BBPSSDK framework is not linked. Ensure you've added it via SPM in Xcode.

### "Service not created" Error
Call `createService()` before `initiate()` or `process()`.

### No Events Received
Ensure you've passed a callback to `createService()`. The callback persists across operations.

### Android Build Issues
- Verify `minSdkVersion >= 21`
- Check that the native BBPS SDK dependency is correctly configured
- Ensure Kotlin JVM target aligns with Java compatibility:
```gradle
kotlinOptions {
    jvmTarget = '11'
}
compileOptions {
    sourceCompatibility JavaVersion.VERSION_11
    targetCompatibility JavaVersion.VERSION_11
}
```

### Pod Install Failures
If you see path errors during `pod install`, ensure the podspec reads:
```ruby
package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
```

## Example App

A complete example app is included in the `/example` directory:

```bash
cd example
npm install
cd ios && pod install && cd ..
npm run ios   # or npm run android
```

## Running the Example App

```bash
cd example
npm install
npm run android   # or npm run ios
```

## License

GNU Affero General Public License v3.0 (AGPL-3.0)
