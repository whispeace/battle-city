import { ENTITY_TYPES, EFFECTS } from './constants';
import { Entity } from './Entity';
import { gameState } from './main';

// Класс щита (для временной неуязвимости)

export class Shield extends Entity {
  constructor(tank) {
    super(
      tank.x - 4,
      tank.y - 4,
      tank.width + 8,
      tank.height + 8,
      ENTITY_TYPES.SHIELD
    );
    this.solid = false;
    this.tank = tank; // Танк, который защищает щит
    this.lifeTime = 0;
    this.maxLifeTime = EFFECTS.SHIELD_DURATION;
    this.flashTime = 0;
    this.flashInterval = 0.1; // Интервал мерцания (в секундах)
    this.visible = true;
    this.particles = [];

    // Создаем частицы по периметру
    const particleCount = 16;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      this.particles.push({
        angle: angle,
        distance: this.width / 2,
        speed: (Math.random() * 0.5 + 0.5) * 2,
      });
    }
  }

  update(dt) {
    this.lifeTime += dt;

    // Обновляем позицию щита (следует за танком)
    this.x = this.tank.x - 4;
    this.y = this.tank.y - 4;

    // Обновляем время мерцания
    this.flashTime += dt;
    if (this.flashTime >= this.flashInterval) {
      this.flashTime = 0;
      this.visible = !this.visible;
    }

    // Ускоряем мерцание перед исчезновением
    if (this.lifeTime > this.maxLifeTime * 0.7) {
      this.flashInterval = 0.05;
    }

    // Обновляем частицы
    for (const particle of this.particles) {
      particle.angle += particle.speed * dt;
    }

    // Удаляем щит по истечении времени
    if (this.lifeTime >= this.maxLifeTime) {
      const index = gameState.entities.indexOf(this);
      if (index !== -1) {
        gameState.entities.splice(index, 1);
      }

      // Сбрасываем флаг защиты у танка
      this.tank.shielded = false;
    }
  }

  render(ctx) {
    if (!this.visible && this.lifeTime > this.maxLifeTime * 0.7) {
      return; // Не рисуем во время мерцания на последней стадии
    }

    // Центр щита
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // Эффект свечения
    ctx.shadowColor = '#00AAFF';
    ctx.shadowBlur = 10;

    // Внешний контур щита
    ctx.strokeStyle = '#00AAFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, this.width / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Рисуем частицы
    ctx.fillStyle = 'rgba(100, 200, 255, 0.7)';
    for (const particle of this.particles) {
      const x = centerX + Math.cos(particle.angle) * particle.distance;
      const y = centerY + Math.sin(particle.angle) * particle.distance;

      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Внутренний контур
    ctx.strokeStyle = 'rgba(200, 240, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, this.width / 2 - 5, 0, Math.PI * 2);
    ctx.stroke();

    // Сбрасываем эффекты
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}
