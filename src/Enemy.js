import { ENTITY_TYPES, DIRECTIONS } from './constants';
import { Tank } from './Tank';

// Класс врага (наследуется от танка)
export class Enemy extends Tank {
  constructor(x, y) {
    super(x, y, ENTITY_TYPES.ENEMY);
    this.changeDirectionTime = 0;
    this.maxChangeDirectionTime = 2; // Меняем направление каждые 2 секунды
    this.shootTime = 0;
    this.maxShootTime = 1.5; // Стреляем каждые 1.5 секунды
  }

  update(dt) {
    super.update(dt);

    if (this.destroyed) return;

    // Меняем направление через определенные интервалы
    this.changeDirectionTime += dt;
    if (this.changeDirectionTime >= this.maxChangeDirectionTime) {
      const directions = Object.values(DIRECTIONS);
      this.direction =
        directions[Math.floor(Math.random() * directions.length)];
      this.changeDirectionTime = 0;
    }

    // Двигаемся в текущем направлении
    this.move(this.direction, dt);

    // Стреляем через определенные интервалы
    this.shootTime += dt;
    if (this.shootTime >= this.maxShootTime) {
      this.shoot();
      this.shootTime = 0;
    }
  }
}
