export const COVERS: Record<string, string> = {
  red: "linear-gradient(120deg, #f6d5d5 0%, #e8a3a3 100%)",
  orange: "linear-gradient(120deg, #fbe3cf 0%, #f0b27a 100%)",
  yellow: "linear-gradient(120deg, #fdf0c8 0%, #f5d76e 100%)",
  green: "linear-gradient(120deg, #d4eedd 0%, #87c9a2 100%)",
  blue: "linear-gradient(120deg, #d2e4f5 0%, #85b8e8 100%)",
  purple: "linear-gradient(120deg, #e4d9f3 0%, #b39ddb 100%)",
  pink: "linear-gradient(120deg, #f7d9ea 0%, #e8a0c8 100%)",
  gray: "linear-gradient(120deg, #e3e2e0 0%, #b3b0aa 100%)",
  night: "linear-gradient(120deg, #2c3e50 0%, #4ca1af 100%)",
  sunset: "linear-gradient(120deg, #f5af19 0%, #f12711 100%)",
  ocean: "linear-gradient(120deg, #2193b0 0%, #6dd5ed 100%)",
  forest: "linear-gradient(120deg, #134e5e 0%, #71b280 100%)",
};

export const COVER_KEYS = Object.keys(COVERS);

export function randomCover(): string {
  return COVER_KEYS[Math.floor(Math.random() * COVER_KEYS.length)];
}
