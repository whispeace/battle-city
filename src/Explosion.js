import { TILE_SIZE, ENTITY_TYPES, EFFECTS } from './constants';
import { Entity } from './Entity';
import { gameState } from './main';

// Класс взрыва (анимированный эффект)

export class Explosion extends Entity {
  constructor(
    x,
    y,
    size = TILE_SIZE * 2,
    duration = EFFECTS.EXPLOSION_DURATION
  ) {
    super(x, y, size, size, ENTITY_TYPES.EXPLOSION);
    this.solid = false;
    this.lifeTime = 0;
    this.maxLifeTime = duration;
    this.frame = 0;
    this.totalFrames = 5; // Увеличиваем количество кадров для плавности
    this.particles = [];
    this.particleCount = Math.floor(size / 8); // Количество частиц зависит от размера


    // Создаем частицы взрыва
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: this.width / 2,
        y: this.height / 2,
        vx: ((Math.random() - 0.5) * size) / 2,
        vy: ((Math.random() - 0.5) * size) / 2,
        size: Math.random() * 4 + 2,
        color: '#FF' + Math.floor(Math.random() * 99) + '00', // Оттенки оранжевого
      });
    }
  }

  update(dt) {
    this.lifeTime += dt;

    // Анимация взрыва
    const progress = this.lifeTime / this.maxLifeTime;
    this.frame = Math.floor(progress * this.totalFrames);

    // Обновляем частицы
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      // Частицы уменьшаются со временем
      particle.size = Math.max(0, particle.size - dt * 5);
    }

    // Удаление взрыва
    if (this.lifeTime >= this.maxLifeTime) {
      const index = gameState.entities.indexOf(this);
      if (index !== -1) {
        gameState.entities.splice(index, 1);
      }
    }
  }

  render(ctx) {
    // Эффект свечения
    ctx.shadowColor = '#FF9900';
    ctx.shadowBlur = 10;

    // Основная вспышка взрыва
    const progress = this.lifeTime / this.maxLifeTime;
    const radius = (this.width / 2) * Math.sin(progress * Math.PI); // Синусоида для анимации


    // Градиент для реалистичности
    const gradient = ctx.createRadialGradient(
      this.x + this.width / 2,
      this.y + this.height / 2,
      0,
      this.x + this.width / 2,
      this.y + this.height / 2,
      radius
    );

    gradient.addColorStop(0, 'rgba(255, 255, 200, ' + (1 - progress) + ')');
    gradient.addColorStop(0.4, 'rgba(255, 153, 0, ' + (1 - progress) + ')');
    gradient.addColorStop(0.7, 'rgba(255, 60, 0, ' + (1 - progress) + ')');
    gradient.addColorStop(1, 'rgba(100, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(
      this.x + this.width / 2,
      this.y + this.height / 2,
      radius,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Рисуем частицы
    for (const particle of this.particles) {
      if (particle.size <= 0) continue;

      const particleAlpha = 1 - progress;
      ctx.fillStyle =
        particle.color +
        Math.floor(particleAlpha * 255)
          .toString(16)
          .padStart(2, '0');
      ctx.beginPath();
      ctx.arc(
        this.x + particle.x,
        this.y + particle.y,
        particle.size * (1 - progress / 2), // Уменьшаем размер со временем
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Сбрасываем эффекты
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}
