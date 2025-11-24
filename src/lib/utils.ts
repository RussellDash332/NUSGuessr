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
 * Calculates the score based on the distance.
 * The closer the guess, the higher the score. Maximum score is 5000.
 * A guess within 0.04km (40 meters) receives the maximum score.
 * A guess of 0.5km away yields approximately 3000 points.
 * @param distance The distance in kilometers.
 * @returns The calculated score.
 */
export function calculateScore(distance: number): number {
  const maxScore = 5000;
  if (distance <= 0.04) {
    return maxScore;
  }
  // This factor controls how quickly the score drops. A smaller number means a steeper drop.
  const decayFactor = 1;
  const score = Math.round(maxScore * Math.exp(-distance / decayFactor));
  return Math.max(0, score);
}
