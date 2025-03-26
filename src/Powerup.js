import { TILE_SIZE, ENTITY_TYPES, EFFECTS } from './constants';
import { Entity } from './Entity';
import { gameState } from './main';
import { eventBus, GAME_EVENTS } from './EventBus';

// Класс бонуса (powerup)
export class Powerup extends Entity {
  constructor(x, y, type) {
    super(x, y, TILE_SIZE, TILE_SIZE, ENTITY_TYPES.POWERUP);
    this.solid = false;
    this.powerUpType = type; // shield, weapon, speed, life
    this.blinkTime = 0;
    this.blinkInterval = EFFECTS.POWERUP_FLASH_INTERVAL;
    this.visible = true;
    this.lifeTime = 0;
    this.maxLifeTime = 10; // Бонус исчезает через 10 секунд
    this.color = this.getColorForType();
  }

  getColorForType() {
    switch (this.powerUpType) {
      case 'shield':
        return '#00AAFF'; // Синий
      case 'weapon':
        return '#FF9900'; // Оранжевый
      case 'speed':
        return '#00FF00'; // Зеленый
      case 'life':
        return '#FF0000'; // Красный
      default:
        return '#FFFFFF'; // Белый
    }
  }

  update(dt) {
    // Обновляем время мерцания
    this.blinkTime += dt;
    if (this.blinkTime >= this.blinkInterval) {
      this.blinkTime = 0;
      this.visible = !this.visible;
    }

    // Обновляем время жизни
    this.lifeTime += dt;

    // Бонус начинает мигать быстрее, когда время почти истекло
    if (this.lifeTime > this.maxLifeTime * 0.7) {
      this.blinkInterval = 0.1;
    }

    // Проверяем столкновение с игроком
    if (gameState.player &&
      !gameState.player.destroyed &&
      this.checkCollision(gameState.player)) {
      this.applyPowerup();

      // Генерируем событие подбора бонуса
      eventBus.emit(GAME_EVENTS.POWERUP_COLLECT, {
        type: this.powerUpType,
        tank: gameState.player,
        x: this.x,
        y: this.y
      });

      // Удаляем бонус
      const index = gameState.entities.indexOf(this);
      if (index !== -1) {
        gameState.entities.splice(index, 1);
      }

      return;
    }

    // Удаляем бонус по истечении времени
    if (this.lifeTime >= this.maxLifeTime) {
      const index = gameState.entities.indexOf(this);
      if (index !== -1) {
        gameState.entities.splice(index, 1);
      }
    }
  }

  applyPowerup() {
    const player = gameState.player;

    switch (this.powerUpType) {
      case 'shield':
        player.addShield();
        break;
      case 'weapon':
        player.upgradeWeapon();
        break;
      case 'speed':
        player.enableSpeedBoost();
        break;
      case 'life':
        gameState.playerLives++;
        eventBus.emit(GAME_EVENTS.LIVES_UPDATE);
        break;
    }

    // Эффект при подборе бонуса
    this.createPickupEffect();

    // Добавляем очки
    gameState.score += 500;
    eventBus.emit(GAME_EVENTS.SCORE_UPDATE, gameState.score);
  }

  createPickupEffect() {
    // Создаем круговую вспышку при подборе бонуса
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // Генерируем событие создания частиц вокруг
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      eventBus.emit(GAME_EVENTS.EFFECT_EXPLOSION, {
        x: centerX,
        y: centerY,
        type: 'particle',
        color: this.color,
        velocityX: Math.cos(angle) * 50,
        velocityY: Math.sin(angle) * 50,
        size: 4
      });
    }

    // Генерируем событие создания вспышки
    eventBus.emit(GAME_EVENTS.EFFECT_EXPLOSION, {
      x: centerX - 8,
      y: centerY - 8,
      type: 'spark',
      scale: 2,
      duration: 0.5
    });
  }

  render(ctx) {
    if (!this.visible) return;

    // Рисуем фон бонуса
    ctx.fillStyle = '#000000';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Рисуем рамку
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);

    // Рисуем символ в зависимости от типа бонуса
    ctx.fillStyle = this.color;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let symbol;
    switch (this.powerUpType) {
      case 'shield':
        symbol = 'S';
        break;
      case 'weapon':
        symbol = 'W';
        break;
      case 'speed':
        symbol = 'F';
        break; // Fast
      case 'life':
        symbol = 'L';
        break;
      default:
        symbol = '?';
    }

    ctx.fillText(symbol, this.x + this.width / 2, this.y + this.height / 2);

    // Эффект свечения
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 5;
    ctx.strokeRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);

    // Сбрасываем эффекты
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}