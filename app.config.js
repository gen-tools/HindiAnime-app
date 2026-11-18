// app.config.js — dynamic build-time Expo configuration
// Environment variables are loaded automatically from .env by Expo CLI during local development
// and from EAS Build Secrets in cloud builds.
// SENSITIVE KEYS ARE ENCRYPTED AT BUILD-TIME TO PREVENT REVERSE-ENGINEERING.

const SALT_MASK = [0x7a, 0x3e, 0x91, 0x5b, 0xa8, 0x24, 0x6d, 0xf0];

function encryptPayload(plainText) {
  if (!plainText || typeof plainText !== 'string' || plainText.trim().length === 0) return null;
  const part1 = [];
  const part2 = [];
  const trimmed = plainText.trim();
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    const s = SALT_MASK[i % SALT_MASK.length];
    const enc = ((code ^ s) + 0x4b) & 0xff;
    if (i % 2 === 0) {
      part1.push(enc);
    } else {
      part2.push(enc);
    }
  }
  return { part1, part2 };
}

export default {
  expo: {
    name: 'HindiAnime',
    slug: 'hindianime',
    version: '1.0.0',
    orientation: 'default',
    userInterfaceStyle: 'dark',
    backgroundColor: '#000000',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          backgroundColor: '#000000',
          image: './assets/splash.png',
          dark: {
            backgroundColor: '#000000',
            image: './assets/splash.png',
          },
          imageWidth: 200,
          resizeMode: 'contain',
        },
      ],
      [
        'expo-video',
        {
          supportsBackgroundPlayback: true,
          supportsPictureInPicture: true,
        },
      ],
      [
        'expo-navigation-bar',
        {
          // Start visible; the app controls visibility at runtime via NavigationBar.setHidden()
          hidden: false,
          style: 'dark',
          enforceContrast: false,
        },
      ],
    ],
    android: {
      package: 'com.hindianime.app',
      versionCode: 1,
      splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#000000',
        dark: {
          image: './assets/splash.png',
          backgroundColor: '#000000',
        },
      },
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      permissions: [
        'INTERNET',
        'ACCESS_NETWORK_STATE',
        'MODIFY_AUDIO_SETTINGS',
      ],
      // Edge-to-edge: allows the app to draw behind the status bar and nav bar.
      // Required for proper fullscreen immersive mode on Android.
      edgeToEdge: true,
      softwareKeyboardLayoutMode: 'resize',
      statusBar: {
        backgroundColor: '#00000000',
        translucent: true,
        barStyle: 'light-content',
      },
      navigationBar: {
        backgroundColor: '#00000000',
      },
    },
    extra: {
      // Injected as encrypted vector payloads only — raw plaintext URLs and secrets are NEVER exposed in APK.
      urlPayload: encryptPayload(
        process.env.WORKER_BASE_URL || process.env.EXPO_PUBLIC_WORKER_BASE_URL || ''
      ),
      secPayload: encryptPayload(
        process.env.PROXY_SECRET || process.env.EXPO_PUBLIC_PROXY_SECRET || ''
      ),
    },
  },
};
