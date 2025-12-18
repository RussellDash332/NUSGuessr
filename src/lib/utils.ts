import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculates the distance between two geographical coordinates in kilometers
 * using the Haversine formula.
 * @param lat1 Latitude of the first point.
 * @param lon1 Longitude of the first point.
 * @param lat2 Latitude of the second point.
 * @param lon2 Longitude of the second point.
 * @returns The distance in kilometers.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

/**
 * Calculates the score based on the distance using a continuous piecewise function.
 * This ensures there are no "jumps" in score at the boundaries.
 * - d <= 40m: Max score (5000)
 * - 40m < d <= 80m: decay = 1
 * - 80m < d <= 500m: decay = 0.5
 * - d > 500m: decay = 0.2
 * @param distance The distance in kilometers.
 * @returns The calculated score.
 */
export function calculateScore(distance: number): number {
  const maxScore = 5000;

  if (distance <= 0.04) { // 0-40m
    return maxScore;
  }

  if (distance <= 0.08) { // 40-80m
    const decayFactor = 1;
    const score = maxScore * Math.exp(-(distance - 0.04) / decayFactor);
    return Math.round(Math.max(0, score));
  }

  // Calculate the score at the 80m boundary to make the function continuous
  const scoreAt80m = maxScore * Math.exp(-(0.08 - 0.04) / 1);

  if (distance <= 0.5) { // 80-500m
    const decayFactor = 0.5;
    const score = scoreAt80m * Math.exp(-(distance - 0.08) / decayFactor);
    return Math.round(Math.max(0, score));
  }

  // Calculate the score at the 500m boundary
  const scoreAt500m = scoreAt80m * Math.exp(-(0.5 - 0.08) / 0.5);

  // For distances > 500m
  const decayFactor = 0.2;
  const score = scoreAt500m * Math.exp(-(distance - 0.5) / decayFactor);
  return Math.round(Math.max(0, score));
}
