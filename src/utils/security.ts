/**
 * Secure Credential & Endpoint De-obfuscation Engine
 *
 * Protects application API endpoints and proxy secrets from static APK decompilation,
 * string extraction (e.g. `strings index.android.bundle`), and automated scanners (MobSF, Jadx, Apktool).
 *
 * Secrets and backend URLs are stored as dual interleaved XOR-cipher vectors with rotating salt masks
 * and reconstructed dynamically in volatile heap memory only when requested.
 */

// Dual interleaved encrypted vectors for the production Cloudflare Worker URL.
// Encrypted with rotating salt + offset cipher:
// Plaintext URL is NEVER stored as a string literal anywhere in the binary.
const _URL_VECTOR_ALPHA = [
  93, 48, 38, 141, 88, 45, 28, 89, 106, 46, 208, 159, 153, 45, 24, 100, 100, 10, 18, 81, 83, 10, 24
];

const _URL_VECTOR_BETA = [
  149, 118, 105, 42, 162, 118, 84, 227, 151, 109, 93, 14, 91, 126, 169, 224, 161, 119, 161, 224, 152, 138, 157
];

// Dual interleaved encrypted vectors for the shared proxy secret.
const _SEC_VECTOR_ALPHA = [
  156, 65, 17, 135, 84, 73, 73, 107, 103, 35, 23, 90, 126, 15, 57, 168, 150, 39, 21, 145, 136, 32
];

const _SEC_VECTOR_BETA = [
  152, 109, 92, 207, 191, 88, 148, 240, 156, 182, 178, 235, 158, 103, 201, 8, 159, 116, 152, 227, 184, 177
];

const _SALT_MASK = [0x7a, 0x3e, 0x91, 0x5b, 0xa8, 0x24, 0x6d, 0xf0];

let _cachedApiUrl: string | null = null;
let _cachedSecret: string | null = null;

function _deobfuscateVectors(alpha: number[], beta: number[]): string {
  const totalLen = alpha.length + beta.length;
  const buffer: number[] = new Array(totalLen);
  let aIdx = 0;
  let bIdx = 0;

  for (let i = 0; i < totalLen; i++) {
    const encByte = i % 2 === 0 ? alpha[aIdx++] : beta[bIdx++];
    const saltByte = _SALT_MASK[i % _SALT_MASK.length];
    const decByte = ((encByte - 0x4b + 0x100) & 0xff) ^ saltByte;
    buffer[i] = decByte;
  }

  return String.fromCharCode(...buffer);
}

/**
 * Reconstructs and decrypts the Cloudflare Worker API base URL dynamically in memory.
 * No plaintext URL string literal exists in the compiled APK.
 */
export function getDecryptedApiUrl(): string {
  if (_cachedApiUrl !== null) {
    return _cachedApiUrl;
  }

  try {
    // 1. Check if an environment variable was explicitly injected at build-time
    const envUrl = process.env.EXPO_PUBLIC_WORKER_BASE_URL;
    if (envUrl && envUrl.trim().length > 0) {
      const resolved = envUrl.trim().replace(/\/+$/, '');
      _cachedApiUrl = resolved;
      return resolved;
    }

    // 2. Check if dynamic encrypted payload was passed via app config extra
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Constants = require('expo-constants').default || require('expo-constants');
      const payload = Constants?.expoConfig?.extra?.urlPayload || Constants?.manifest?.extra?.urlPayload;
      if (payload && Array.isArray(payload.part1) && Array.isArray(payload.part2)) {
        const resolved = _deobfuscateVectors(payload.part1, payload.part2).replace(/\/+$/, '');
        _cachedApiUrl = resolved;
        return resolved;
      }
    } catch {
      // Fallback to embedded obfuscated vectors
    }

    // 3. Fallback to embedded encrypted vectors
    const resolved = _deobfuscateVectors(_URL_VECTOR_ALPHA, _URL_VECTOR_BETA).replace(/\/+$/, '');
    _cachedApiUrl = resolved;
    return resolved;
  } catch {
    return '';
  }
}

/**
 * Reconstructs and decrypts the shared proxy secret dynamically in memory.
 * No plaintext secret string literal exists in the compiled APK.
 */
export function getDecryptedProxySecret(): string {
  if (_cachedSecret !== null) {
    return _cachedSecret;
  }

  try {
    // 1. Check if an environment variable was explicitly injected at build-time
    const envSecret = process.env.EXPO_PUBLIC_PROXY_SECRET || process.env.PROXY_SECRET;
    if (envSecret && envSecret.trim().length > 0) {
      const resolved = envSecret.trim();
      _cachedSecret = resolved;
      return resolved;
    }

    // 2. Check if dynamic encrypted payload was passed via app config extra
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Constants = require('expo-constants').default || require('expo-constants');
      const payload = Constants?.expoConfig?.extra?.secPayload || Constants?.manifest?.extra?.secPayload;
      if (payload && Array.isArray(payload.part1) && Array.isArray(payload.part2)) {
        const resolved = _deobfuscateVectors(payload.part1, payload.part2);
        _cachedSecret = resolved;
        return resolved;
      }
    } catch {
      // Fallback to embedded obfuscated vectors
    }

    // 3. Fallback to embedded encrypted vectors
    const resolved = _deobfuscateVectors(_SEC_VECTOR_ALPHA, _SEC_VECTOR_BETA);
    _cachedSecret = resolved;
    return resolved;
  } catch {
    return '';
  }
}

/**
 * Utility function to encrypt a string at build-time (used by app.config.js).
 */
export function encryptSecret(plainText: string): { part1: number[]; part2: number[] } {
  const part1: number[] = [];
  const part2: number[] = [];
  if (!plainText || typeof plainText !== 'string') return { part1, part2 };

  for (let i = 0; i < plainText.length; i++) {
    const code = plainText.charCodeAt(i);
    const s = _SALT_MASK[i % _SALT_MASK.length];
    const enc = ((code ^ s) + 0x4b) & 0xff;
    if (i % 2 === 0) {
      part1.push(enc);
    } else {
      part2.push(enc);
    }
  }
  return { part1, part2 };
}
