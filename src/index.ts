import { NativeModules, NativeEventEmitter, EmitterSubscription } from 'react-native';

const { BbpsReactNativeSdk } = NativeModules;

const eventEmitter = new NativeEventEmitter(BbpsReactNativeSdk);

export interface BbpsRawEvent {
  event: string;
  payload: Record<string, unknown>;
}

let _globalCallback: ((event: BbpsRawEvent) => void) | null = null;
let _subscription: EmitterSubscription | null = null;

function normalizeEvent(raw: unknown): BbpsRawEvent {
  const r = raw as Record<string, unknown> | undefined;
  return {
    event: (r?.event as string) ?? (r?.type as string) ?? 'UNKNOWN',
    payload: (r?.payload as Record<string, unknown>) ?? (r ?? {}),
  };
}

function registerNativeCallback() {
  const nativeCallback = (raw: unknown) => {
    const normalized = normalizeEvent(raw);
    _globalCallback?.(normalized);
  };
  BbpsReactNativeSdk.registerEventCallback(nativeCallback);
}

export const createService = (
  clientId: string,
  callback?: (event: BbpsRawEvent) => void
): Promise<void> => {
  if (callback) {
    if (_subscription) {
      _subscription.remove();
      _subscription = null;
    }
    _globalCallback = callback;

    _subscription = eventEmitter.addListener('BBPS_EVENT', (raw: unknown) => {
      const normalized = normalizeEvent(raw);
      _globalCallback?.(normalized);
    });

    registerNativeCallback();
  }
  return BbpsReactNativeSdk.createService(clientId);
};

export const initiate = (payload: Record<string, unknown>): Promise<void> => {
  return BbpsReactNativeSdk.initiate(payload);
};

export const process = (payload: Record<string, unknown>): Promise<void> => {
  return BbpsReactNativeSdk.process(payload);
};

export const onBackPressed = (): Promise<boolean> => {
  return BbpsReactNativeSdk.onBackPressed();
};

export const terminate = (): void => {
  if (_subscription) {
    _subscription.remove();
    _subscription = null;
    _globalCallback = null;
  }
  return BbpsReactNativeSdk.terminate();
};

export const testEmit = (): Promise<string> => {
  return BbpsReactNativeSdk.testEmit();
};
