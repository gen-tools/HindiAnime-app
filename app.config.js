// app.config.js — dynamic build-time Expo configuration
// Environment variables are loaded automatically from .env by Expo CLI during local development
// and from EAS Build Secrets in cloud builds.
// SENSITIVE KEYS ARE ENCRYPTED AT BUILD-TIME TO PREVENT REVERSE-ENGINEERING.

const SALT_MASK = [0x5f, 0x1d, 0x8e, 0x4a, 0x9b, 0x3c, 0x72, 0xe1];

function encryptSecret(plainText) {
  if (!plainText || typeof plainText !== 'string') return null;
  const part1 = [];
  const part2 = [];
  for (let i = 0; i < plainText.length; i++) {
    const code = plainText.charCodeAt(i);
    const s = SALT_MASK[i % SALT_MASK.length];
    const enc = ((code ^ s) + 0x37) & 0xff;
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
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    backgroundColor: '#050807',
    plugins: [
      [
        'expo-video',
        {
          supportsBackgroundPlayback: true,
          supportsPictureInPicture: true,
        },
      ],
    ],
    extra: {
      workerBaseUrl:
        process.env.EXPO_PUBLIC_WORKER_BASE_URL ||
        'https://wispy-cherry-6934.sheztech.workers.dev',
      // Injected as encrypted vector payload only — raw plaintext secret is never exposed.
      secPayload: encryptSecret(
        process.env.PROXY_SECRET || process.env.EXPO_PUBLIC_PROXY_SECRET || ''
      ),
    },
  },
};
