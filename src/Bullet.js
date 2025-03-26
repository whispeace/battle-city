import { ENTITY_TYPES, EFFECTS, DIRECTIONS, BULLET_TYPES, CANVAS_SIZE } from './constants';
import { Entity } from './Entity';
import { gameState } from './main';
import { eventBus, GAME_EVENTS } from './EventBus';

// Класс пули
export class Bullet extends Entity {
  constructor(x, y, direction, ownerType, bulletType = BULLET_TYPES.REGULAR) {
    super(x, y, bulletType.size, bulletType.size, ENTITY_TYPES.BULLET);
    this.direction = direction;
    this.speed = bulletType.speed;
    this.ownerType = ownerType;
    this.power = bulletType.power;
    this.bounces = 0;
    this.maxBounces = bulletType.maxBounces;
    this.trail = []; // Массив для хранения точек следа
    this.trailInterval = 0.02; // Интервал добавления точек (в секундах)
    this.trailTimer = 0;
    this.trailMaxPoints = 5; // Максимальное количество точек в следе
  }

  update(dt) {
    // Обновляем след пули
    this.trailTimer += dt;
    if (this.trailTimer >= this.trailInterval) {
      this.trailTimer = 0;
      this.trail.push({
        x: this.x + this.width / 2,
        y: this.y + this.height / 2,
        age: 0,
      });

      // Ограничиваем количество точек следа
      if (this.trail.length > this.trailMaxPoints) {
        this.trail.shift();
      }
    }

    // Обновляем возраст точек следа
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].age += dt;
      // Удаляем старые точки
      if (this.trail[i].age > 0.1) {
        this.trail.splice(i, 1);
        i--;
      }
    }

    // Двигаем пулю в её направлении
    const oldX = this.x;
    const oldY = this.y;

    this.x += this.direction.x * this.speed * dt;
    this.y += this.direction.y * this.speed * dt;

    // Проверяем выход за границы карты
    if (this.x < 0 ||
      this.x + this.width > CANVAS_SIZE ||
      this.y < 0 ||
      this.y + this.height > CANVAS_SIZE) {
      // Если пуля может отскакивать и еще есть отскоки
      if (this.maxBounces > 0 && this.bounces < this.maxBounces) {
        this.bounces++;

        // Определяем от какой стены отскочили
        if (this.x < 0 || this.x + this.width > CANVAS_SIZE) {
          // Отскок от боковой стены
          this.direction =
            this.direction === DIRECTIONS.LEFT
              ? DIRECTIONS.RIGHT
              : DIRECTIONS.LEFT;
          // Корректируем позицию
          this.x = this.x < 0 ? 0 : CANVAS_SIZE - this.width;
        } else {
          // Отскок от верхней/нижней стены
          this.direction =
            this.direction === DIRECTIONS.UP ? DIRECTIONS.DOWN : DIRECTIONS.UP;
          // Корректируем позицию
          this.y = this.y < 0 ? 0 : CANVAS_SIZE - this.height;
        }

        // Генерируем событие отскока
        eventBus.emit(GAME_EVENTS.BULLET_HIT, {
          bullet: this,
          type: 'bounce',
          x: this.x,
          y: this.y
        });
        
        // Создаем эффект искры при отскоке
        this.createSpark();
      } else {
        // Если не может отскакивать или исчерпаны отскоки
        this.destroy(true);
        return;
      }
    }

    // Проверяем столкновения со стенами и танками
    this.checkCollisions();
  }

  checkCollisions() {
    // Проверяем столкновения со стенами и другими объектами
    for (const entity of gameState.entities) {
      if ((entity.solid || entity.type === ENTITY_TYPES.GRASS) &&
        this.checkCollision(entity)) {
        // Обрабатываем столкновение в зависимости от типа объекта
        switch (entity.type) {
          case ENTITY_TYPES.BRICK:
            if (this.handleBrickCollision(entity)) return;
            break;

          case ENTITY_TYPES.STEEL:
            if (this.handleSteelCollision(entity)) return;
            break;

          case ENTITY_TYPES.BASE:
            // Генерируем событие разрушения базы
            eventBus.emit(GAME_EVENTS.BASE_DESTROY, {
              base: entity,
              bullet: this
            });
            
            entity.destroy();
            this.destroy(true);
            return;

          case ENTITY_TYPES.GRASS:
            // Трава не влияет на пули, пули проходят сквозь неё
            break;

          case ENTITY_TYPES.WATER:
            // Вода не влияет на пули, пули пролетают над ней
            break;

          case ENTITY_TYPES.PLAYER:
          case ENTITY_TYPES.ENEMY:
            // Обрабатываем столкновение с танками только если это не танк владельца
            if (entity.type !== this.ownerType &&
              !entity.destroyed &&
              !entity.shielded) {
              
              // Генерируем событие попадания в танк
              eventBus.emit(GAME_EVENTS.BULLET_HIT, {
                bullet: this,
                target: entity,
                type: 'tankHit'
              });
              
              entity.destroy();

              // Начисляем очки, если игрок подбил врага
              if (this.ownerType === ENTITY_TYPES.PLAYER &&
                entity.type === ENTITY_TYPES.ENEMY) {
                gameState.score += EFFECTS.DESTROY_SCORE;
                eventBus.emit(GAME_EVENTS.SCORE_UPDATE, gameState.score);
              }

              this.destroy(true);
              return;
            }
            break;
        }
      }
    }

    // Проверяем столкновения с другими танками
    if (this.ownerType === ENTITY_TYPES.PLAYER) {
      for (const enemy of gameState.enemies) {
        if (!enemy.destroyed && !enemy.shielded && this.checkCollision(enemy)) {
          enemy.destroy();
          gameState.score += EFFECTS.DESTROY_SCORE;
          eventBus.emit(GAME_EVENTS.SCORE_UPDATE, gameState.score);
          this.destroy(true);
          return;
        }
      }
    } else if (this.ownerType === ENTITY_TYPES.ENEMY) {
      if (gameState.player &&
        !gameState.player.destroyed &&
        !gameState.player.shielded &&
        this.checkCollision(gameState.player)) {
        gameState.player.destroy();
        this.destroy(true);
        return;
      }
    }

    // Проверяем столкновения с другими пулями
    for (const bullet of gameState.bullets) {
      if (bullet !== this && this.checkCollision(bullet)) {
        // Создаем большую искру при столкновении пуль через событие
        eventBus.emit(GAME_EVENTS.BULLET_HIT, {
          bullet: this,
          otherBullet: bullet,
          type: 'bulletCollision',
          x: (this.x + bullet.x) / 2,
          y: (this.y + bullet.y) / 2
        });

        // Удаляем обе пули
        bullet.destroy(false);
        this.destroy(false);
        return;
      }
    }
  }

  handleBrickCollision(brick) {
    // Кирпичные стены разрушаются от любых пуль
    const index = gameState.entities.indexOf(brick);
    if (index !== -1) {
      gameState.entities.splice(index, 1);

      // Генерируем событие разрушения кирпича
      eventBus.emit(GAME_EVENTS.BULLET_HIT, {
        bullet: this,
        target: brick,
        type: 'brickDestroy',
        x: brick.x,
        y: brick.y
      });

      // Создаем эффект разрушения кирпича
      this.createBrickParticles(brick);

      // Если игрок уничтожил кирпич, начисляем очки
      if (this.ownerType === ENTITY_TYPES.PLAYER) {
        gameState.score += EFFECTS.DAMAGE_SCORE;
        eventBus.emit(GAME_EVENTS.SCORE_UPDATE, gameState.score);
      }
    }

    // Тяжелые пули могут пробивать кирпичи насквозь
    if (this.power >= 3) {
      return false; // Продолжаем движение
    } else {
      this.destroy(true);
      return true; // Прерываем обработку
    }
  }

  handleSteelCollision(steel) {
    // Стальные стены можно повредить только тяжелыми пулями
    if (this.power >= 3) {
      const index = gameState.entities.indexOf(steel);
      if (index !== -1) {
        gameState.entities.splice(index, 1);

        // Генерируем событие разрушения стальной стены
        eventBus.emit(GAME_EVENTS.BULLET_HIT, {
          bullet: this,
          target: steel,
          type: 'steelDestroy',
          x: steel.x,
          y: steel.y
        });

        // Более мощный эффект разрушения для стальной стены
        this.createSteelParticles(steel);

        // Если игрок уничтожил стальную стену, начисляем больше очков
        if (this.ownerType === ENTITY_TYPES.PLAYER) {
          gameState.score += EFFECTS.DESTROY_SCORE;
          eventBus.emit(GAME_EVENTS.SCORE_UPDATE, gameState.score);
        }
      }
      this.destroy(true);
      return true;
    } else if (this.maxBounces > 0 && this.bounces < this.maxBounces) {
      // Пули с возможностью отскока
      this.bounces++;

      // Определяем ось столкновения и меняем направление
      // Упрощенная логика: отскакиваем по направлению, обратному текущему
      if (this.direction === DIRECTIONS.UP) {
        this.direction = DIRECTIONS.DOWN;
      } else if (this.direction === DIRECTIONS.DOWN) {
        this.direction = DIRECTIONS.UP;
      } else if (this.direction === DIRECTIONS.LEFT) {
        this.direction = DIRECTIONS.RIGHT;
      } else if (this.direction === DIRECTIONS.RIGHT) {
        this.direction = DIRECTIONS.LEFT;
      }

      // Генерируем событие отскока
      eventBus.emit(GAME_EVENTS.BULLET_HIT, {
        bullet: this,
        target: steel,
        type: 'bounce',
        x: this.x,
        y: this.y
      });

      // Создаем эффект искры при отскоке
      this.createSpark();
      return true;
    } else {
      // Обычные пули просто уничтожаются
      this.destroy(true);
      return true;
    }
  }

  createSpark() {
    // Генерируем событие создания искры
    eventBus.emit(GAME_EVENTS.EFFECT_EXPLOSION, {
      x: this.x + this.width / 2 - 4,
      y: this.y + this.height / 2 - 4,
      type: 'spark',
      scale: 1.0,
      duration: EFFECTS.SPARK_DURATION
    });
  }

  createBrickParticles(brick) {
    // Генерируем событие создания частиц для кирпича
    for (let i = 0; i < EFFECTS.BRICK_PARTICLES_COUNT; i++) {
      eventBus.emit(GAME_EVENTS.EFFECT_EXPLOSION, {
        x: brick.x + Math.random() * brick.width,
        y: brick.y + Math.random() * brick.height,
        type: 'particle',
        color: '#CC6600',
        velocityX: Math.random() * 60 - 30, // Скорость по X: от -30 до 30
        velocityY: Math.random() * 60 - 30, // Скорость по Y: от -30 до 30
        size: Math.random() * 4 + 2 // Размер: от 2 до 6
      });
    }
  }

  createSteelParticles(steel) {
    // Генерируем событие создания частиц для стальной стены
    for (let i = 0; i < EFFECTS.BRICK_PARTICLES_COUNT * 1.5; i++) {
      eventBus.emit(GAME_EVENTS.EFFECT_EXPLOSION, {
        x: steel.x + Math.random() * steel.width,
        y: steel.y + Math.random() * steel.height,
        type: 'particle',
        color: '#AAAAAA',
        velocityX: Math.random() * 80 - 40, // Скорость по X: от -40 до 40
        velocityY: Math.random() * 80 - 40, // Скорость по Y: от -40 до 40
        size: Math.random() * 3 + 1 // Размер: от 1 до 4
      });
    }
  }

  render(ctx) {
    // Рисуем след пули
    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i];
      const alpha = 1 - point.age * 10; // Затухание от 1 до 0
      const size = (this.width / 2) * (1 - point.age * 5); // Уменьшение размера

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Рисуем саму пулю
    let bulletColor;
    if (this.power >= 3) {
      bulletColor = '#FF9900'; // Тяжелая пуля
    } else if (this.power >= 2) {
      bulletColor = '#FFFF00'; // Усиленная пуля
    } else if (this.maxBounces > 0) {
      bulletColor = '#00CCFF'; // Отскакивающая пуля
    } else {
      bulletColor = '#FFFFFF'; // Обычная пуля
    }

    ctx.fillStyle = bulletColor;

    // Для усиленных пуль рисуем свечение
    if (this.power >= 2) {
      ctx.shadowColor = bulletColor;
      ctx.shadowBlur = 5;
    }

    // Рисуем пулю в зависимости от направления
    // Для эстетики делаем пули более вытянутыми в направлении движения
    if (this.direction === DIRECTIONS.UP ||
      this.direction === DIRECTIONS.DOWN) {
      // Вертикальная ориентация
      ctx.fillRect(this.x, this.y - 1, this.width, this.height + 2);
    } else {
      // Горизонтальная ориентация
      ctx.fillRect(this.x - 1, this.y, this.width + 2, this.height);
    }

    // Сбрасываем свечение
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  destroy(createEffect = true) {
    // Удаляем пулю из массива
    const index = gameState.bullets.indexOf(this);
    if (index !== -1) {
      gameState.bullets.splice(index, 1);
    }

    // Освобождаем танк, который выстрелил
    if (this.ownerType === ENTITY_TYPES.PLAYER && gameState.player) {
      gameState.player.bullet = null;
    } else if (this.ownerType === ENTITY_TYPES.ENEMY) {
      for (const enemy of gameState.enemies) {
        if (enemy.bullet === this) {
          enemy.bullet = null;
          break;
        }
      }
    }

    // Генерируем событие уничтожения пули
    eventBus.emit(GAME_EVENTS.BULLET_HIT, {
      bullet: this,
      type: 'destroy',
      createEffect
    });

    // Добавляем эффект попадания
    if (createEffect) {
      // Выбираем тип эффекта в зависимости от силы пули
      if (this.power >= 3) {
        // Тяжелая пуля создает большой взрыв
        eventBus.emit(GAME_EVENTS.EFFECT_EXPLOSION, {
          x: this.x - this.width * 2,
          y: this.y - this.height * 2,
          size: this.width * 5,
          duration: EFFECTS.EXPLOSION_DURATION / 2,
          type: 'explosion'
        });
      } else {
        // Обычная пуля создает искру
        eventBus.emit(GAME_EVENTS.EFFECT_EXPLOSION, {
          x: this.x - this.width / 2,
          y: this.y - this.height / 2,
          scale: 1.0,
          duration: EFFECTS.SPARK_DURATION,
          type: 'spark'
        });
      }
    }
  }
}