export const LOCAL_IMAGES: Record<string, any> = {
  '/src/assets/images/anime_solo_hunter_1793651181145.jpg': require('../assets/images/anime_solo_hunter_1793651181145.jpg'),
  '/src/assets/images/anime_demon_blade_1793651053360.jpg': require('../assets/images/anime_demon_blade_1793651053360.jpg'),
  '/src/assets/images/anime_sorcerer_clash_1793651053999.jpg': require('../assets/images/anime_sorcerer_clash_1793651053999.jpg'),
  '/src/assets/images/anime_mecha_odyssey_1793651053590.jpg': require('../assets/images/anime_mecha_odyssey_1793651053590.jpg'),
  '/src/assets/images/cartoon_alien_hero_1793653708433.jpg': require('../assets/images/cartoon_alien_hero_1793653708433.jpg'),
  '/src/assets/images/cartoon_magic_companion_1793653707810.jpg': require('../assets/images/cartoon_magic_companion_1793653707810.jpg'),
};

// Pre-build a basename → full-key reverse map so getImageSource never does
// an O(n) scan at runtime. Built once at module load, O(1) thereafter.
const _filenameMap: Record<string, any> = Object.fromEntries(
  Object.entries(LOCAL_IMAGES).map(([k, v]) => [k.split('/').pop() as string, v])
);

const _fallback = require('../assets/images/anime_solo_hunter_1793651181145.jpg');

export function getImageSource(pathOrUri?: string | any) {
  if (!pathOrUri) return _fallback;
  if (typeof pathOrUri === 'number' || (typeof pathOrUri === 'object' && pathOrUri.uri)) {
    return pathOrUri;
  }
  if (typeof pathOrUri === 'string') {
    // 1. Exact full-path match
    if (LOCAL_IMAGES[pathOrUri]) return LOCAL_IMAGES[pathOrUri];
    // 2. Basename match (O(1) lookup via pre-built map)
    const filename = pathOrUri.split('/').pop();
    if (filename && _filenameMap[filename]) return _filenameMap[filename];
    // 3. Remote URL — pass through as { uri }
    if (pathOrUri.startsWith('http://') || pathOrUri.startsWith('https://') || pathOrUri.startsWith('data:')) {
      return { uri: pathOrUri };
    }
  }
  return _fallback;
}

