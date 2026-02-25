/**
 * OCR Service — License plate candidate extraction using Tesseract.js.
 *
 * Supports:
 *   - French plates    (AB-123-CD / 1234 AB 75)
 *   - South African    (CA 123-456 / GP ABC 123)
 *   - DR Congo         (123 A KIN / KN 1234)
 *   - Generic          (3+ alphanumeric chars)
 *
 * Set OCR_MODE=off to disable OCR entirely (returns empty []).
 */

import Tesseract from "tesseract.js";

const OCR_MODE = (process.env.OCR_MODE || "auto") as "auto" | "off";

export interface PlateCandidate {
  plate: string;
  confidence: number;
}

// Plate regex patterns (ordered by specificity)
const PLATE_PATTERNS: RegExp[] = [
  // French SIV (2009+): AB-123-CD or AB 123 CD
  /\b([A-Z]{2})[- ]?([0-9]{3})[- ]?([A-Z]{2})\b/g,
  // French FNI (old): 1234 AB 75
  /\b([0-9]{1,4})[- ]?([A-Z]{1,3})[- ]?([0-9]{2})\b/g,
  // South Africa: CA 123-456 or GP ABC 123
  /\b([A-Z]{2})[- ]?([A-Z0-9]{2,4})[- ]?([0-9]{2,3})\b/g,
  // DR Congo: 123 A KIN or KN 1234
  /\b([0-9]{2,4})[- ]?([A-Z]{1,3})[- ]?([A-Z]{2,3})\b/g,
  // Generic: any 3–10 char alphanumeric sequence with optional separators
  /\b([A-Z0-9][A-Z0-9 \-]{1,8}[A-Z0-9])\b/g,
];

/** Minimum length after normalization to consider a candidate */
const MIN_PLATE_LENGTH = 3;
const MAX_PLATE_LENGTH = 12;

/**
 * Extract plate candidates from an OCR text block.
 * Returns deduplicated candidates sorted by confidence (highest first).
 */
function extractCandidates(
  text: string,
  baseConfidence: number
): PlateCandidate[] {
  const seen = new Set<string>();
  const candidates: PlateCandidate[] = [];

  for (const pattern of PLATE_PATTERNS) {
    // Reset the regex (global flag)
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[0].replace(/[\s\-]+/g, "").toUpperCase();
      if (
        raw.length >= MIN_PLATE_LENGTH &&
        raw.length <= MAX_PLATE_LENGTH &&
        !seen.has(raw)
      ) {
        seen.add(raw);
        candidates.push({
          plate: match[0].trim().toUpperCase(),
          confidence: baseConfidence * (raw.length >= 5 ? 1 : 0.6),
        });
      }
    }
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Run OCR on a base64-encoded image and return plate candidates.
 * Falls back to empty array if OCR is disabled or fails.
 */
export async function recognizePlate(
  base64Data: string
): Promise<PlateCandidate[]> {
  if (OCR_MODE === "off") {
    return [];
  }

  try {
    // Strip data URL prefix if present
    const imageData = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(imageData, "base64");

    const result = await Tesseract.recognize(buffer, "eng", {
      logger: () => {}, // suppress progress logs
    });

    const rawText = result.data.text.toUpperCase();
    const ocrConfidence = result.data.confidence / 100; // 0–1 scale

    if (!rawText.trim()) {
      return [];
    }

    const candidates = extractCandidates(rawText, ocrConfidence);

    // Cap at top 5 candidates
    return candidates.slice(0, 5);
  } catch (err) {
    console.error("OCR recognition error:", err);
    return [];
  }
}

