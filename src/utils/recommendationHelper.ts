import { Anime } from '../types/anime';

// Non-informative tags present on almost all titles in the app
const GENERIC_TAGS = new Set([
  'hindi dubbed',
  'hindi',
  'dubbed',
  'series',
  'movie',
  'all',
]);

/**
 * Calculates a genuine relevance score for candidate anime against a target anime
 * based on true genre overlap (excluding generic filler tags), type matching,
 * and high ratings. Never recommends the target title itself.
 */
export function getRecommendedAnime(
  targetAnime: Anime,
  allAnime: Anime[],
  limit = 10
): Anime[] {
  if (!targetAnime || !allAnime || allAnime.length === 0) return [];

  // Extract meaningful genres of target anime
  const targetDistinctGenres = new Set(
    (targetAnime.genres || [])
      .map((g) => g.trim().toLowerCase())
      .filter((g) => g && !GENERIC_TAGS.has(g))
  );

  const targetType =
    targetAnime.isMovie || targetAnime.type === 'Movie' ? 'Movie' : 'Series';

  const scored: { anime: Anime; score: number }[] = [];

  for (const candidate of allAnime) {
    // Avoid recommending the current / same title
    if (candidate.id === targetAnime.id) continue;

    let score = 0;
    const candidateGenres = (candidate.genres || [])
      .map((g) => g.trim().toLowerCase())
      .filter((g) => g && !GENERIC_TAGS.has(g));

    // True genre overlap: +20 points per distinct genre match
    let genreMatches = 0;
    for (const g of candidateGenres) {
      if (targetDistinctGenres.has(g)) {
        score += 20;
        genreMatches++;
      }
    }

    // Multi-genre overlap bonus
    if (genreMatches >= 2) score += 15;
    if (genreMatches >= 3) score += 20;

    // Type match: +6 points (Movie with Movie, Series with Series)
    const candType =
      candidate.isMovie || candidate.type === 'Movie' ? 'Movie' : 'Series';
    if (candType === targetType) {
      score += 6;
    }

    // Rating quality score
    if (typeof candidate.rating === 'number' && candidate.rating > 0) {
      score += Math.min(10, candidate.rating);
    }

    // Slight bonus for popular/trending titles within matching genres
    if ((candidate.isPopular || candidate.isTrending) && genreMatches > 0) {
      score += 5;
    }

    scored.push({ anime: candidate, score });
  }

  // Sort descending by score, tiebreak with rating
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.anime.rating || 0) - (a.anime.rating || 0);
  });

  return scored.slice(0, limit).map((s) => s.anime);
}

