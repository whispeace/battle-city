import { EFFECTS, CANVAS_SIZE } from './constants';
import { Entity } from './Entity';
import { gameState } from './main';

// Класс частицы (для эффектов разрушения)

export class Particle extends Entity {
  constructor(x, y, color, velocityX, velocityY, size) {
    super(x, y, size, size, 'particle');
    this.solid = false;
    this.color = color;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.gravity = 120; // Сила гравитации (пикселей/сек²)
    this.lifeTime = 0;
    this.maxLifeTime = EFFECTS.PARTICLE_LIFETIME;
    this.initialSize = size; // Запоминаем начальный размер
    this.friction = 0.95; // Коэффициент трения
  }

  update(dt) {
    this.lifeTime += dt;

    // Обновляем скорость (гравитация и трение)
    this.velocityY += this.gravity * dt;
    this.velocityX *= this.friction;
    this.velocityY *= this.friction;

    // Обновляем позицию
    this.x += this.velocityX * dt;
    this.y += this.velocityY * dt;

    // Отражение от границ экрана
    if (this.x < 0) {
      this.x = 0;
      this.velocityX = -this.velocityX * 0.5;
    } else if (this.x + this.width > CANVAS_SIZE) {
      this.x = CANVAS_SIZE - this.width;
      this.velocityX = -this.velocityX * 0.5;
    }

    if (this.y < 0) {
      this.y = 0;
      this.velocityY = -this.velocityY * 0.5;
    } else if (this.y + this.height > CANVAS_SIZE) {
      this.y = CANVAS_SIZE - this.height;
      this.velocityY = -this.velocityY * 0.3; // Меньший отскок от пола
    }

    // Уменьшаем размер частицы со временем
    const progress = this.lifeTime / this.maxLifeTime;
    this.width = this.height = this.initialSize * (1 - progress);

    // Удаляем частицу по истечении времени
    if (this.lifeTime >= this.maxLifeTime) {
      const index = gameState.entities.indexOf(this);
      if (index !== -1) {
        gameState.entities.splice(index, 1);
      }
    }
  }

  render(ctx) {
    const alpha = 1 - this.lifeTime / this.maxLifeTime;

    // Используем исходный цвет с изменяемой прозрачностью
    const rgbPart = this.color.slice(0, 7); // Берем только RGB часть (#RRGGBB)
    const fillColor = rgbPart +
      Math.floor(alpha * 255)
        .toString(16)
        .padStart(2, '0');

    ctx.fillStyle = fillColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}
