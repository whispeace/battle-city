// Константы игры
export const TILE_SIZE = 16;
const GRID_SIZE = 26;
export const CANVAS_SIZE = TILE_SIZE * GRID_SIZE;
export const DIRECTIONS = {
  UP: { x: 0, y: -1, angle: 0 },
  RIGHT: { x: 1, y: 0, angle: 90 },
  DOWN: { x: 0, y: 1, angle: 180 },
  LEFT: { x: -1, y: 0, angle: 270 },
};
export const ENTITY_TYPES = {
  BRICK: 'brick',
  STEEL: 'steel',
  GRASS: 'grass',
  WATER: 'water',
  ICE: 'ice',
  PLAYER: 'player',
  ENEMY: 'enemy',
  BULLET: 'bullet',
  BASE: 'base',
  EXPLOSION: 'explosion',
  SPARK: 'spark',
  SHIELD: 'shield',
  POWERUP: 'powerup',
};
// Константы для эффектов
export const EFFECTS = {
  EXPLOSION_DURATION: 0.8, // в секундах
  SPARK_DURATION: 0.3, // в секундах
  SHIELD_DURATION: 5.0, // в секундах
  TANK_SPAWN_FLASH_DURATION: 1.0, // в секундах
  POWERUP_FLASH_INTERVAL: 0.5, // в секундах
  BRICK_PARTICLES_COUNT: 4, // количество частиц при разрушении кирпича
  PARTICLE_LIFETIME: 0.5, // в секундах
  DAMAGE_SCORE: 50, // очки за повреждение
  DESTROY_SCORE: 100, // очки за уничтожение
};
// Типы пуль и модификаторы
export const BULLET_TYPES = {
  REGULAR: { power: 1, speed: 150, size: 4, maxBounces: 0 },
  ENHANCED: { power: 2, speed: 180, size: 4, maxBounces: 0 },
  FAST: { power: 1, speed: 220, size: 3, maxBounces: 0 },
  HEAVY: { power: 3, speed: 130, size: 5, maxBounces: 0 },
  BOUNCY: { power: 1, speed: 170, size: 4, maxBounces: 1 },
};
