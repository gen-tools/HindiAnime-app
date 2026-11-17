import { NativeModules, Platform } from 'react-native';
import * as Brightness from 'expo-brightness';

// Safely resolve VolumeManager from react-native-volume-manager
let _volumeManager: any = null;
const getVolumeManager = () => {
  if (_volumeManager !== null) return _volumeManager;
  try {
    const mod = require('react-native-volume-manager');
    const vm = mod.VolumeManager || mod.default || mod;
    if (vm && typeof vm.setVolume === 'function') {
      _volumeManager = vm;
    } else {
      _volumeManager = false;
    }
  } catch {
    _volumeManager = false;
  }
  return _volumeManager || null;
};

// Pending-collapse throttle state for brightness
let _briPending = false;
let _briNext: number | null = null;

// Pending-collapse throttle state for volume
let _volPending = false;
let _volNext: number | null = null;

export const HardwareControl = {
  /**
   * Whether native Android AudioManager volume control is supported in the current runtime.
   */
  isHardwareVolumeAvailable(): boolean {
    return Boolean(NativeModules.VolumeManager && getVolumeManager());
  },

  /**
   * Retrieves current screen brightness.
   * On modern Android, fallback to 0.7 if system brightness cannot be queried.
   */
  async getInitialBrightness(): Promise<number> {
    try {
      const b = await Brightness.getBrightnessAsync();
      if (typeof b === 'number' && b >= 0 && b <= 1) return b;
    } catch {}
    return 0.7; // Sensible default allowing both upward and downward dragging
  },

  /**
   * Sets actual Android window brightness via expo-brightness.
   * Modifies WindowManager.LayoutParams.screenBrightness directly on Android.
   * Continuous pending-collapse throttle ensures the latest finger position is
   * applied without stacking async bridge calls.
   */
  setBrightness(val: number): void {
    const clamped = Math.max(0.01, Math.min(1.0, val));
    _briNext = clamped;
    if (_briPending) return;
    _briPending = true;
    const run = async () => {
      while (_briNext !== null) {
        const v = _briNext;
        _briNext = null;
        try {
          await Brightness.setBrightnessAsync(v);
        } catch {}
      }
      _briPending = false;
    };
    run();
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
   * Supports both number return and object return from various library versions.
   */
  async getInitialVolume(): Promise<number> {
    try {
      const vm = getVolumeManager();
      if (vm) {
        const res = await vm.getVolume('music');
        if (typeof res === 'number' && res >= 0 && res <= 1) return res;
        if (typeof res?.volume === 'number') return res.volume;
        if (typeof res?.music === 'number') return res.music;
      }
    } catch {}
    return 0.7; // Sensible default
  },

  /**
   * Sets actual Android hardware media stream volume (AudioManager.STREAM_MUSIC).
   * Passes required Android parameters (playSound: false, type: 'music', showUI: false)
   * to avoid NoSuchKeyException on Android ReadableNativeMap.
   */
  setDeviceVolume(val: number): void {
    const clamped = Math.max(0, Math.min(1.0, val));
    _volNext = clamped;
    if (_volPending) return;
    _volPending = true;
    const run = async () => {
      while (_volNext !== null) {
        const v = _volNext;
        _volNext = null;
        try {
          const vm = getVolumeManager();
          if (vm) {
            await vm.setVolume(v, {
              playSound: false,
              type: 'music',
              showUI: false,
            });
          }
        } catch {}
      }
      _volPending = false;
    };
    run();
  },

  /**
   * Restores Android hardware media stream volume when leaving the player.
   */
  async restoreVolume(originalVal?: number | null): Promise<void> {
    try {
      const vm = getVolumeManager();
      if (vm && typeof originalVal === 'number') {
        const clamped = Math.max(0, Math.min(1.0, originalVal));
        await vm.setVolume(clamped, {
          playSound: false,
          type: 'music',
          showUI: false,
        });
      }
    } catch {}
  },
};
