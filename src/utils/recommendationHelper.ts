import { Anime } from '../types/anime';

/**
 * Calculates a genuine relevance score for candidate anime against a target anime
 * based on genre overlap, category/type matching, high ratings, and popularity.
 */
export function getRecommendedAnime(
  targetAnime: Anime,
  allAnime: Anime[],
  limit = 10
): Anime[] {
  if (!targetAnime || !allAnime || allAnime.length === 0) return [];

  const targetGenres = new Set(
    (targetAnime.genres || []).map((g) => g.trim().toLowerCase())
  );
  const targetType =
    targetAnime.isMovie || targetAnime.type === 'Movie' ? 'Movie' : 'Series';

  const scored: { anime: Anime; score: number }[] = [];

  for (const candidate of allAnime) {
    if (candidate.id === targetAnime.id) continue;

    let score = 0;
    const candidateGenres = candidate.genres || [];

    // Genre overlap: +15 points per matching genre
    let genreMatches = 0;
    for (const g of candidateGenres) {
      if (targetGenres.has(g.trim().toLowerCase())) {
        score += 15;
        genreMatches++;
      }
    }

    // Multi-genre overlap bonus
    if (genreMatches >= 2) score += 10;

    // Type match: +8 points (Movie with Movie, Series with Series)
    const candType =
      candidate.isMovie || candidate.type === 'Movie' ? 'Movie' : 'Series';
    if (candType === targetType) {
      score += 8;
    }

    // Rating quality score
    if (typeof candidate.rating === 'number' && candidate.rating > 0) {
      score += Math.min(10, candidate.rating);
    }

    // Popularity / Trending boost
    if (candidate.isPopular || candidate.isTrending) {
      score += 4;
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

