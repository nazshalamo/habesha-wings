export const GAME_HEIGHT = 600;
export const GROUND_HEIGHT = 19;
export const GRAVITY = 1180;
export const FLAP_VELOCITY = -366;
export const BIRD_RADIUS = 14;
export const PILLAR_WIDTH = 74;
export const PILLAR_SPACING = 292;
export function difficulty(score) {
  return { speed: Math.min(185 + score * 2.3, 244), gap: Math.max(206 - score * 1.65, 170) };
}
export function circleHitsRect(cx, cy, radius, x, y, width, height) {
  if (height <= 0) return false;
  const nearX = Math.max(x, Math.min(cx, x + width));
  const nearY = Math.max(y, Math.min(cy, y + height));
  return (cx - nearX) ** 2 + (cy - nearY) ** 2 < radius ** 2;
}
export function hitsPillar(bird, pillar) {
  const half = pillar.gap / 2;
  return circleHitsRect(bird.x, bird.y, BIRD_RADIUS, pillar.x - 5, 0, PILLAR_WIDTH + 10, pillar.center - half) ||
    circleHitsRect(bird.x, bird.y, BIRD_RADIUS, pillar.x - 5, pillar.center + half, PILLAR_WIDTH + 10, GAME_HEIGHT - GROUND_HEIGHT - pillar.center - half);
}
