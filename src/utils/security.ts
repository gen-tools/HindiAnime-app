/**
 * Secure Credential De-obfuscation & Decryption Engine
 *
 * Protects application secrets from static APK decompilation, string extraction
 * (strings index.android.bundle), and automated scanners (MobSF, Jadx, Apktool).
 *
 * Secrets are stored as dual interleaved XOR-cipher vectors with rotating salt masks
 * and reconstructed dynamically in volatile heap memory only when requested.
 */

// Dual interleaved encrypted vectors for the rotated proxy secret.
// Encrypted with rotating salt + offset cipher:
// Raw key is NEVER stored as a plaintext string literal anywhere in the binary.
const _SEC_VECTOR_ALPHA = [
  171, 32, 44, 90, 99, 24, 4, 118, 112, 254, 54, 71, 77, 18, 20, 121, 165, 250, 48, 144, 79, 1
];

const _SEC_VECTOR_BETA = [
  165, 106, 64, 204, 142, 83, 136, 235, 169, 177, 182, 232, 167, 68, 157, 227, 174, 111, 140, 192, 133, 174
];

const _SALT_MASK = [0x5f, 0x1d, 0x8e, 0x4a, 0x9b, 0x3c, 0x72, 0xe1];

let _cachedSecret: string | null = null;

/**
 * Reconstructs and decrypts the shared proxy secret dynamically in memory.
 */
export function getDecryptedProxySecret(): string {
  if (_cachedSecret !== null) {
    return _cachedSecret;
  }

  try {
    // 1. Check if dynamic encrypted payload was passed via app config extra
    let dynamicAlpha: number[] | null = null;
    let dynamicBeta: number[] | null = null;

    try {
      // Safe dynamic require to prevent static bundling issues
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Constants = require('expo-constants').default || require('expo-constants');
      const payload = Constants?.expoConfig?.extra?.secPayload || Constants?.manifest?.extra?.secPayload;
      if (payload && Array.isArray(payload.part1) && Array.isArray(payload.part2)) {
        dynamicAlpha = payload.part1;
        dynamicBeta = payload.part2;
      }
    } catch {
      // Fallback to embedded encrypted vectors
    }

    const alpha = dynamicAlpha || _SEC_VECTOR_ALPHA;
    const beta = dynamicBeta || _SEC_VECTOR_BETA;

    const totalLen = alpha.length + beta.length;
    const buffer: number[] = new Array(totalLen);
    let aIdx = 0;
    let bIdx = 0;

    for (let i = 0; i < totalLen; i++) {
      const encByte = i % 2 === 0 ? alpha[aIdx++] : beta[bIdx++];
      const saltByte = _SALT_MASK[i % _SALT_MASK.length];
      const decByte = ((encByte - 0x37 + 0x100) & 0xff) ^ saltByte;
      buffer[i] = decByte;
    }

    // Convert byte array to UTF-8 string safely without relying on Node Buffer
    _cachedSecret = String.fromCharCode(...buffer);
    return _cachedSecret;
  } catch {
    return '';
  }
}

/**
 * Utility function to encrypt a secret string at build-time (used by app.config.js).
 */
export function encryptSecret(plainText: string): { part1: number[]; part2: number[] } {
  const part1: number[] = [];
  const part2: number[] = [];
  for (let i = 0; i < plainText.length; i++) {
    const code = plainText.charCodeAt(i);
    const s = _SALT_MASK[i % _SALT_MASK.length];
    const enc = ((code ^ s) + 0x37) & 0xff;
    if (i % 2 === 0) {
      part1.push(enc);
    } else {
      part2.push(enc);
    }
  }
  return { part1, part2 };
}

