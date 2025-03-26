import { ENTITY_TYPES, EFFECTS } from './constants';
import { Entity } from './Entity';
import { gameState } from './main';

// Класс искры (эффект при попадании пули)

export class Spark extends Entity {
  constructor(x, y, scale = 1.0, duration = EFFECTS.SPARK_DURATION) {
    super(x, y, 8 * scale, 8 * scale, ENTITY_TYPES.SPARK);
    this.solid = false;
    this.lifeTime = 0;
    this.maxLifeTime = duration;
    this.scale = scale;
    this.rays = [];
    this.rayCount = 8; // Количество лучей


    // Создаем лучи в разные стороны
    for (let i = 0; i < this.rayCount; i++) {
      const angle = (i / this.rayCount) * Math.PI * 2;
      this.rays.push({
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        length: (Math.random() * 0.5 + 0.5) * 8 * scale, // Разная длина лучей
        width: (Math.random() * 0.5 + 0.5) * 2 * scale, // Разная ширина лучей
        speed: (Math.random() * 0.5 + 0.5) * 30 * scale, // Разная скорость
      });
    }
  }

  update(dt) {
    this.lifeTime += dt;

    // Обновляем лучи
    for (const ray of this.rays) {
      // Лучи удлиняются со временем
      const progress = this.lifeTime / this.maxLifeTime;
      ray.length += ray.speed * dt * (1 - progress); // Замедляем рост с течением времени
    }

    // Удаление искры по истечении времени
    if (this.lifeTime >= this.maxLifeTime) {
      const index = gameState.entities.indexOf(this);
      if (index !== -1) {
        gameState.entities.splice(index, 1);
      }
    }
  }

  render(ctx) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const progress = this.lifeTime / this.maxLifeTime;
    const alpha = 1 - progress; // Затухание


    // Эффект свечения
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 5 * this.scale;

    // Центральная вспышка
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, (1 - progress) * 4 * this.scale, 0, Math.PI * 2);
    ctx.fill();

    // Рисуем лучи
    for (const ray of this.rays) {
      // Начальная и конечная точки луча
      const startX = centerX;
      const startY = centerY;
      const endX = centerX + ray.dx * ray.length * (1 - progress * 0.5);
      const endY = centerY + ray.dy * ray.length * (1 - progress * 0.5);

      // Градиент для луча (от белого к прозрачному)
      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      gradient.addColorStop(1, `rgba(255, 255, 200, 0)`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = ray.width * (1 - progress * 0.7); // Лучи становятся тоньше

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Сбрасываем эффекты
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}
