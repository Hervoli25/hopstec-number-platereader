// Normalize plate for matching - removes spaces, hyphens, and converts to uppercase
export function normalizePlate(raw: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s\-]+/g, "") // Remove spaces and hyphens
    .replace(/[^A-Z0-9]/g, ""); // Keep only alphanumeric
}

// Display plate - trims and normalizes spacing but keeps hyphens/spaces
export function displayPlate(raw: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " "); // Collapse multiple spaces
}

// Calculate Levenshtein distance for similarity matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

// Check if two plates are probably the same (allows small typos)
export function arePlatesProbablySame(a: string, b: string, threshold = 2): boolean {
  const normA = normalizePlate(a);
  const normB = normalizePlate(b);
  
  if (normA === normB) return true;
  if (normA.length === 0 || normB.length === 0) return false;
  
  const distance = levenshteinDistance(normA, normB);
  return distance <= threshold;
}

// Check for exact match
export function arePlatesExactMatch(a: string, b: string): boolean {
  return normalizePlate(a) === normalizePlate(b);
}
