import { ENTITY_TYPES, DIRECTIONS } from './constants';
import { gameState } from './main';
import { Tank } from './Tank';

// Класс игрока (наследуется от танка)
export class Player extends Tank {
  constructor(x, y) {
    super(x, y, ENTITY_TYPES.PLAYER);
    this.speed = 80; // Игрок немного быстрее врагов
  }

  update(dt) {
    super.update(dt);

    if (this.destroyed) return;

    // Обрабатываем нажатия клавиш
    if (gameState.keys.ArrowUp) {
      this.move(DIRECTIONS.UP, dt);
    } else if (gameState.keys.ArrowDown) {
      this.move(DIRECTIONS.DOWN, dt);
    } else if (gameState.keys.ArrowLeft) {
      this.move(DIRECTIONS.LEFT, dt);
    } else if (gameState.keys.ArrowRight) {
      this.move(DIRECTIONS.RIGHT, dt);
    }

    // Стрельба - проверяем оба варианта кода пробела
    if (gameState.keys[' '] || gameState.keys.Space) {
      this.shoot();
    }
  }
}
