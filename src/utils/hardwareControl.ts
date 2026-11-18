import { NativeModules, Platform } from 'react-native';
import * as Brightness from 'expo-brightness';
import { VolumeManager, VolumeResult } from 'react-native-volume-manager';

// Throttle parameters
const THROTTLE_MS = 35; // ~28 bridge calls/sec max: silky smooth & prevents bridge saturation

// Brightness throttle state
let _targetBrightness: number | null = null;
let _isBrightnessBusy = false;
let _lastBrightnessTime = 0;
let _brightnessTimeout: ReturnType<typeof setTimeout> | null = null;

// Volume throttle state
let _targetVolume: number | null = null;
let _isVolumeBusy = false;
let _lastVolumeTime = 0;
let _volumeTimeout: ReturnType<typeof setTimeout> | null = null;

async function _dispatchBrightness(): Promise<void> {
  if (_targetBrightness === null) return;
  const toSend = _targetBrightness;
  _targetBrightness = null;
  _isBrightnessBusy = true;
  _lastBrightnessTime = Date.now();

  try {
    await Brightness.setBrightnessAsync(toSend);
  } catch {
    // Native module might be unavailable on some platforms/emulators
  } finally {
    _isBrightnessBusy = false;
  }

  // If a newer target arrived while the async native call was in flight, schedule it
  if (_targetBrightness !== null) {
    const elapsed = Date.now() - _lastBrightnessTime;
    if (elapsed >= THROTTLE_MS) {
      _dispatchBrightness();
    } else {
      if (_brightnessTimeout) clearTimeout(_brightnessTimeout);
      _brightnessTimeout = setTimeout(() => {
        _brightnessTimeout = null;
        _dispatchBrightness();
      }, THROTTLE_MS - elapsed);
    }
  }
}

async function _dispatchVolume(): Promise<void> {
  if (_targetVolume === null) return;
  const toSend = _targetVolume;
  _targetVolume = null;
  _isVolumeBusy = true;
  _lastVolumeTime = Date.now();

  try {
    await VolumeManager.setVolume(toSend, {
      showUI: false,
      playSound: false,
      type: 'music',
    });
  } catch {
    // Volume manager fallback
  } finally {
    _isVolumeBusy = false;
  }

  // If a newer target arrived while the async native call was in flight, schedule it
  if (_targetVolume !== null) {
    const elapsed = Date.now() - _lastVolumeTime;
    if (elapsed >= THROTTLE_MS) {
      _dispatchVolume();
    } else {
      if (_volumeTimeout) clearTimeout(_volumeTimeout);
      _volumeTimeout = setTimeout(() => {
        _volumeTimeout = null;
        _dispatchVolume();
      }, THROTTLE_MS - elapsed);
    }
  }
}

export const HardwareControl = {
  /**
   * Retrieves current screen brightness.
   * Defaults to 0.7 if query fails.
   */
  async getBrightness(): Promise<number> {
    try {
      const b = await Brightness.getBrightnessAsync();
      if (typeof b === 'number' && b >= 0 && b <= 1) {
        return b;
      }
    } catch {}
    return 0.7;
  },

  /**
   * Alias for backward compatibility
   */
  async getInitialBrightness(): Promise<number> {
    return this.getBrightness();
  },

  /**
   * Smoothly throttles setting actual screen brightness via expo-brightness (~35ms).
   * Modifies WindowManager.LayoutParams.screenBrightness directly on Android.
   */
  setBrightnessThrottled(val: number): void {
    const clamped = Math.max(0.01, Math.min(1.0, val));
    _targetBrightness = clamped;

    if (_isBrightnessBusy) return;

    const now = Date.now();
    const elapsed = now - _lastBrightnessTime;
    if (elapsed >= THROTTLE_MS) {
      if (_brightnessTimeout) {
        clearTimeout(_brightnessTimeout);
        _brightnessTimeout = null;
      }
      _dispatchBrightness();
    } else if (!_brightnessTimeout) {
      _brightnessTimeout = setTimeout(() => {
        _brightnessTimeout = null;
        _dispatchBrightness();
      }, THROTTLE_MS - elapsed);
    }
  },

  /**
   * Direct brightness set (used on initialization or exit)
   */
  setBrightness(val: number): void {
    this.setBrightnessThrottled(val);
  },

  /**
   * Restores Android system brightness when leaving the player.
   */
  async restoreBrightness(originalVal?: number | null): Promise<void> {
    try {
      if (typeof originalVal === 'number' && originalVal > 0) {
        await Brightness.setBrightnessAsync(originalVal);
      }
      await Brightness.restoreSystemBrightnessAsync();
    } catch {}
  },

  /**
   * Retrieves current device media volume (STREAM_MUSIC).
   */
  async getVolume(): Promise<number> {
    try {
      const res = await VolumeManager.getVolume();
      if (typeof res?.volume === 'number' && res.volume >= 0 && res.volume <= 1) {
        return res.volume;
      }
      if (typeof (res as any)?.music === 'number') {
        return (res as any).music;
      }
      if (typeof res === 'number') {
        return res;
      }
    } catch {}
    return 0.7;
  },

  /**
   * Alias for backward compatibility
   */
  async getInitialVolume(): Promise<number> {
    return this.getVolume();
  },

  /**
   * Smoothly throttles setting actual hardware media volume via react-native-volume-manager (~35ms).
   * Suppresses native OS volume popup with showUI: false so it doesn't clash with on-screen HUD.
   */
  setVolumeThrottled(val: number): void {
    const clamped = Math.max(0, Math.min(1.0, val));
    _targetVolume = clamped;

    if (_isVolumeBusy) return;

    const now = Date.now();
    const elapsed = now - _lastVolumeTime;
    if (elapsed >= THROTTLE_MS) {
      if (_volumeTimeout) {
        clearTimeout(_volumeTimeout);
        _volumeTimeout = null;
      }
      _dispatchVolume();
    } else if (!_volumeTimeout) {
      _volumeTimeout = setTimeout(() => {
        _volumeTimeout = null;
        _dispatchVolume();
      }, THROTTLE_MS - elapsed);
    }
  },

  /**
   * Direct volume set
   */
  setDeviceVolume(val: number): void {
    this.setVolumeThrottled(val);
  },

  /**
   * Listens for hardware volume button presses on the physical device.
   * Keeps the app's stored volume level in sync so swiping on screen doesn't jump.
   */
  addVolumeListener(callback: (vol: number) => void): () => void {
    try {
      const sub = VolumeManager.addVolumeListener((result: VolumeResult) => {
        const vol =
          typeof result?.volume === 'number'
            ? result.volume
            : typeof (result as any)?.music === 'number'
            ? (result as any).music
            : typeof result === 'number'
            ? result
            : null;
        if (vol !== null && !isNaN(vol) && vol >= 0 && vol <= 1) {
          callback(vol);
        }
      });
      return () => {
        try {
          sub?.remove?.();
        } catch {}
      };
    } catch {
      return () => {};
    }
  },

  /**
   * Flushes any pending throttled brightness and volume calls immediately.
   * Called on touch release / gesture finish so final finger position is guaranteed.
   */
  flushSync(): void {
    if (_brightnessTimeout) {
      clearTimeout(_brightnessTimeout);
      _brightnessTimeout = null;
    }
    if (_targetBrightness !== null) {
      _dispatchBrightness();
    }

    if (_volumeTimeout) {
      clearTimeout(_volumeTimeout);
      _volumeTimeout = null;
    }
    if (_targetVolume !== null) {
      _dispatchVolume();
    }
  },

  /**
   * Restores Android hardware media stream volume when leaving the player.
   */
  async restoreVolume(originalVal?: number | null): Promise<void> {
    try {
      if (typeof originalVal === 'number') {
        const clamped = Math.max(0, Math.min(1.0, originalVal));
        await VolumeManager.setVolume(clamped, {
          playSound: false,
          type: 'music',
          showUI: false,
        });
      }
    } catch {}
  },
};
