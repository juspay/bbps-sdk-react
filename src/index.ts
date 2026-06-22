import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'bbps-sdk-react' doesn't seem to be linked. Make sure:\n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const BbpsSdkReact = NativeModules.BbpsSdkReact
  ? NativeModules.BbpsSdkReact
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export interface BbpsRawEvent {
  event: string;
  payload: Record<string, unknown>;
}

let _globalCallback: ((event: BbpsRawEvent) => void) | null = null;
let _isPolling = false;

function startPolling() {
  if (_isPolling) return;
  _isPolling = true;

  const poll = async () => {
    while (_isPolling) {
      try {
        const raw: string = await BbpsSdkReact.waitForEvent();
        console.warn('[BBPS_JS] EVENT ARRIVED (poll):', raw.substring(0, 100));
        const parsed = JSON.parse(raw);
        const normalized: BbpsRawEvent = {
          event: parsed.event ?? 'UNKNOWN',
          payload: parsed.payload ?? parsed ?? {},
        };
        _globalCallback?.(normalized);
      } catch (e) {
        console.error('[BBPS_JS] Poll error:', e);
      }
    }
  };

  poll();
}

export const createService = (
  clientId: string,
  callback?: (event: BbpsRawEvent) => void
): Promise<void> => {
  if (callback) {
    _globalCallback = callback;
    startPolling();
  }
  return BbpsSdkReact.createService(clientId);
};

export const initiate = (payload: Record<string, unknown>): Promise<void> => {
  return BbpsSdkReact.initiate(payload);
};

export const process = (payload: Record<string, unknown>): Promise<void> => {
  return BbpsSdkReact.process(payload);
};

export const onBackPressed = (): Promise<boolean> => {
  return BbpsSdkReact.onBackPressed();
};

export const terminate = (): void => {
  _isPolling = false;
  _globalCallback = null;
  return BbpsSdkReact.terminate();
};

export const testEmit = (): Promise<string> => {
  return BbpsSdkReact.testEmit();
};

export const cleanup = (): void => {
  _isPolling = false;
  _globalCallback = null;
};
