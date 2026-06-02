# BBPS SDK React

React Native SDK for integrating **BBPS (Bharat Bill Payment System)** into react-native mobile application.

## Requirements

| Platform | Minimum Version |
|----------|----------------|
| React Native | 0.85.x |
| Android | minSdkVersion 24, compileSdkVersion 35+ |
| iOS | 15.1+ |
| Java | 17 |

## Installation

```bash
npm install bbps-sdk-react
```

or

```bash
yarn add bbps-sdk-react
```

### Android Configuration

1. Add the Juspay Maven repositories and BBPS plugin to your project-level `android/build.gradle`:

```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
        maven {
            url "https://airborne.juspay.in/builds/hyper-sdk/"
            content { includeGroup("in.juspay") }
        }
        maven {
            url "https://maven.juspay.in/jp-build-packages/hyper-sdk"
            content { includeGroup("in.juspay") }
        }
    }
    dependencies {
        classpath("in.juspay:bbps.plugin:0.0.2")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
        maven {
            url "https://airborne.juspay.in/builds/hyper-sdk/"
        }
        maven {
            url "https://maven.juspay.in/jp-build-packages/hyper-sdk"
        }
    }
}
```

2. Apply the BBPS plugin and configure it in your app-level `android/app/build.gradle`:

```gradle
apply plugin: "bbps.plugin"

bbps {
    clientId = "YOUR_CLIENT_ID"
    sdkVersion = "0.1.10"
}
```

Replace `YOUR_CLIENT_ID` with the client ID provided by Juspay.

3. Ensure your app meets the minimum SDK version requirements in `android/build.gradle`:

```gradle
android {
    minSdkVersion = 24
    compileSdkVersion = 36
    targetSdkVersion = 35
}
```

4. Ensure JVM compatibility is set to Java 17 in your app-level `build.gradle`:

```gradle
compileOptions {
    sourceCompatibility JavaVersion.VERSION_17
    targetCompatibility JavaVersion.VERSION_17
}

kotlinOptions {
    jvmTarget = "17"
}
```

### iOS Configuration

1. Install CocoaPods:

```bash
cd ios && pod install && cd ..
```

2. Add the **BBPSSDK** framework via Swift Package Manager:
   - Open your project in Xcode
   - Select your project → **Package Dependencies**
   - Click **+** and add the BBPSSDK repository URL provided by Juspay
   - Select the appropriate version/branch

3. Set the minimum iOS deployment target in your `Podfile`:

```ruby
platform :ios, '15.1'
```

## Integration

### Step 1: Import the SDK

```typescript
import {
  createService,
  initiate,
  process,
  terminate,
  BbpsRawEvent,
} from 'bbps-sdk-react';
```

### Step 2: Initialize the Service

Call `createService` with your client ID and an event callback before using any other SDK method. This should be called once when your app starts or when the BBPS feature is first accessed.

```typescript
await createService('YOUR_CLIENT_ID', (event: BbpsRawEvent) => {
  handleBbpsEvent(event);
});
```

### Step 3: Handle Events

The SDK communicates results and actions through the event callback. Implement your business logic based on the event type:

```typescript
const handleBbpsEvent = (event: BbpsRawEvent) => {
  switch (event.event.toLowerCase()) {
    case 'initiate_result':
      // Session initialized successfully
      // event.payload contains the initiate response
      break;

    case 'process_result':
      // Transaction completed
      // event.payload contains the transaction result
      break;

    case 'do_payment':
      // SDK is requesting your app to initiate payment
      // Use the payment details in event.payload to trigger your payment flow
      break;

    case 'refresh_auth':
      // Auth token has expired — refresh it and call initiate/process again
      break;

    case 'user_exit':
      // User closed the BBPS SDK flow
      break;
  }
};
```

### Step 4: Initiate a Session

Start a BBPS session with the required parameters:

```typescript
await initiate({
  action: 'initiate',
  clientId: 'YOUR_CLIENT_ID',
  agentId: 'YOUR_AGENT_ID',
  environment: 'sandbox',       // Use 'production' for live
  mobile: 'MOBILE_NUMBER',
  deviceId: 'DEVICE_ID',
  issuingCou: 'YOUR_ISSUING_COU',
  authToken: 'YOUR_AUTH_TOKEN',
});
```

The SDK will present the BBPS UI. Results will be delivered through the `initiate_result` event.

### Step 5: Process a Transaction

Once the session is initiated, process transactions such as bill payments:

```typescript
await process({
  action: 'BBPS_PAYMENT',
  agentId: 'YOUR_AGENT_ID',
  authToken: 'YOUR_AUTH_TOKEN',
  // Include additional transaction parameters as required
});
```

Results will be delivered through the `process_result` event. If the transaction requires payment, a `do_payment` event will be emitted first.

### Step 6: Handle Back Press (Android)

On Android, you may want to let the SDK handle the hardware back button press while the BBPS UI is active:

```typescript
const handled = await onBackPressed();
if (!handled) {
  // SDK did not handle the back press — handle it yourself
}
```

### Step 7: Cleanup

When the BBPS flow is complete or your component unmounts, call `terminate` to release resources:

```typescript
terminate();
```

## API Reference

### `createService(clientId: string, callback?: (event: BbpsRawEvent) => void): Promise<void>`

Initializes the BBPS service. Must be called before any other SDK method.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | `string` | Yes | Your BBPS client identifier provided by Juspay |
| `callback` | `(event: BbpsRawEvent) => void` | No | Callback to receive events from the native SDK |

### `initiate(payload: Record<string, unknown>): Promise<void>`

Initiates a BBPS session. The native SDK will present its UI.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload.action` | `string` | Yes | Must be `'initiate'` |
| `payload.clientId` | `string` | Yes | Your BBPS client identifier |
| `payload.agentId` | `string` | Yes | Your agent identifier |
| `payload.authToken` | `string` | Yes | JWT auth token for API authentication |
| `payload.environment` | `string` | Yes | `'sandbox'` or `'production'` |
| `payload.mobile` | `string` | Yes | Customer mobile number |
| `payload.deviceId` | `string` | Yes | Unique device identifier |
| `payload.issuingCou` | `string` | Yes | Issuing COU identifier |

### `process(payload: Record<string, unknown>): Promise<void>`

Processes a BBPS transaction such as a bill payment.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload.action` | `string` | Yes | Transaction action (e.g. `'BBPS_PAYMENT'`) |
| `payload.agentId` | `string` | Yes | Your agent identifier |
| `payload.authToken` | `string` | Yes | JWT auth token for API authentication |

### `terminate(): void`

Releases all SDK resources and removes event listeners. Call this when the BBPS flow is complete or the component unmounts.

### `onBackPressed(): Promise<boolean>`

Handles the hardware back button on Android. Returns `true` if the SDK handled the press (e.g. dismissed an internal screen), `false` otherwise.

### `testEmit(): Promise<string>`

Diagnostic method to verify that the event callback wiring is working correctly. Emits a test event through the registered callback.

## Events

All events follow the `BbpsRawEvent` interface:

```typescript
interface BbpsRawEvent {
  event: string;                   // Event type identifier
  payload: Record<string, unknown>; // Event-specific data
}
```

| Event | Trigger |
|-------|---------|
| `initiate_result` | Session initialization completed |
| `process_result` | Transaction processing completed |
| `do_payment` | SDK requires your app to initiate a payment |
| `refresh_auth` | Auth token has expired and needs to be refreshed |
| `user_exit` | User dismissed the BBPS SDK flow |

## Troubleshooting

### "bbps-sdk-react doesn't seem to be linked"

The native module is not linked. Make sure:
- You ran `pod install` in the `ios/` directory (iOS)
- You rebuilt the app after installing the package
- You are not using Expo Go

### "BBPS_SDK_MISSING" Error (iOS)

The BBPSSDK framework is not linked. Add it via Swift Package Manager in Xcode as described in the [iOS Configuration](#ios-configuration) section.

### "Service not created" Error

`createService()` must be called before `initiate()` or `process()`. Ensure you initialize the service first.

### No Events Received

Make sure you passed a callback to `createService()`. The callback persists across operations — you only need to register it once.

### Android Build: JVM Target Mismatch

If you see an "Inconsistent JVM Target Compatibility" error, ensure both `compileOptions` and `kotlinOptions` are set to Java 17:

```gradle
compileOptions {
    sourceCompatibility JavaVersion.VERSION_17
    targetCompatibility JavaVersion.VERSION_17
}
kotlinOptions {
    jvmTarget = "17"
}
```

### Android Build: SDK Location Not Found

Create a `local.properties` file in your `android/` directory:

```
sdk.dir=/path/to/Android/sdk
```

## License

AGPL-3.0
