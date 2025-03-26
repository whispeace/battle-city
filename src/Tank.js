import { TILE_SIZE, ENTITY_TYPES, DIRECTIONS, BULLET_TYPES, CANVAS_SIZE } from './constants';
import { Entity } from './Entity';
import { gameState, addVisualEffect, updateUI, respawnPlayer, gameOver, nextLevel, spawnEnemy } from './main';
import { Shield } from './Shield';
import { Particle } from './Particle';
import { Spark } from './Spark';
import { Explosion } from './Explosion';
import { Bullet } from './Bullet';
import { Powerup } from './Powerup';

// Класс танка (базовый для игрока и врагов)
export class Tank extends Entity {
  constructor(x, y, type) {
    super(x, y, TILE_SIZE * 2, TILE_SIZE * 2, type);
    this.direction = DIRECTIONS.UP;
    this.speed = 60; // пикселей в секунду
    this.bullet = null;
    this.bulletType = BULLET_TYPES.REGULAR; // Тип пули
    this.bulletCooldown = 0;
    this.maxBulletCooldown = 0.5; // секунд
    this.destroyed = false;
    this.animationFrame = 0;
    this.frameTime = 0;

    // Новые свойства
    this.shielded = false; // Флаг наличия щита
    this.spawnProtectionTime = 0; // Время защиты после спавна
    this.maxSpawnProtectionTime = 2.0; // Длительность защиты после спавна
    this.tracks = []; // След от гусениц
    this.lastTrackTime = 0; // Время последнего следа
    this.trackInterval = 0.2; // Интервал между следами
    this.isMoving = false; // Флаг движения
    this.blinkTime = 0; // Время для эффекта мерцания
    this.isBlinking = false; // Флаг мерцания


    // Параметры модификации танка
    this.powerLevel = 1; // Уровень силы (1-3)
    this.canShootFast = false; // Флаг быстрой стрельбы
    this.canSpeedBoost = false; // Флаг ускорения
  }

  update(dt) {
    if (this.destroyed) return;

    // Обновляем таймер перезарядки
    if (this.bulletCooldown > 0) {
      this.bulletCooldown -= dt;
    }

    // Обновляем защиту после спавна
    if (this.spawnProtectionTime > 0) {
      this.spawnProtectionTime -= dt;

      // Включаем мерцание
      this.isBlinking = true;

      // Плавное затухание эффекта
      if (this.spawnProtectionTime <= 0) {
        this.isBlinking = false;
      }
    }

    // Обновляем время мерцания
    this.blinkTime += dt;
    if (this.blinkTime >= 0.1) {
      // Мерцание с периодом 0.1 сек
      this.blinkTime = 0;
    }

    // Анимация движения
    if (this.isMoving) {
      this.frameTime += dt;
      if (this.frameTime > 0.1) {
        this.animationFrame = (this.animationFrame + 1) % 2;
        this.frameTime = 0;

        // Создаем следы от гусениц при движении
        this.lastTrackTime += this.frameTime;
        if (this.lastTrackTime >= this.trackInterval) {
          this.createTracks();
          this.lastTrackTime = 0;
        }
      }
    }

    // Обновляем следы от гусениц
    for (let i = 0; i < this.tracks.length; i++) {
      this.tracks[i].age += dt;
      if (this.tracks[i].age >= 0.5) {
        // Следы исчезают через 0.5 сек
        this.tracks.splice(i, 1);
        i--;
      }
    }
  }

  createTracks() {
    // Определяем положение гусениц в зависимости от направления
    let track1, track2;

    if (this.direction === DIRECTIONS.UP ||
      this.direction === DIRECTIONS.DOWN) {
      // Вертикальное движение
      track1 = {
        x: this.x + 2,
        y: this.direction === DIRECTIONS.UP
          ? this.y + this.height - 4
          : this.y + 2,
        width: 4,
        height: 2,
        age: 0,
      };

      track2 = {
        x: this.x + this.width - 6,
        y: this.direction === DIRECTIONS.UP
          ? this.y + this.height - 4
          : this.y + 2,
        width: 4,
        height: 2,
        age: 0,
      };
    } else {
      // Горизонтальное движение
      track1 = {
        x: this.direction === DIRECTIONS.LEFT
          ? this.x + this.width - 4
          : this.x + 2,
        y: this.y + 2,
        width: 2,
        height: 4,
        age: 0,
      };

      track2 = {
        x: this.direction === DIRECTIONS.LEFT
          ? this.x + this.width - 4
          : this.x + 2,
        y: this.y + this.height - 6,
        width: 2,
        height: 4,
        age: 0,
      };
    }

    // Добавляем следы в массив
    this.tracks.push(track1, track2);

    // Ограничиваем количество следов для производительности
    if (this.tracks.length > 20) {
      this.tracks.splice(0, 2);
    }
  }

  move(direction, dt) {
    if (this.destroyed) return;

    // Сохраняем предыдущее направление
    const oldDirection = this.direction;
    this.direction = direction;

    // Если просто поворот, без движения
    if (oldDirection !== direction) {
      return true;
    }

    // Устанавливаем флаг движения
    this.isMoving = true;

    // Определяем скорость в зависимости от модификаторов
    let currentSpeed = this.speed;
    if (this.canSpeedBoost) {
      currentSpeed *= 1.5; // Увеличиваем скорость на 50%
    }

    const newX = this.x + direction.x * currentSpeed * dt;
    const newY = this.y + direction.y * currentSpeed * dt;

    // Проверяем выход за границы карты
    if (newX < 0 ||
      newX + this.width > CANVAS_SIZE ||
      newY < 0 ||
      newY + this.height > CANVAS_SIZE) {
      this.isMoving = false;
      return false;
    }

    // Временно изменяем позицию для проверки столкновений
    const oldX = this.x;
    const oldY = this.y;
    this.x = newX;
    this.y = newY;

    let collision = false;

    // Проверяем столкновения со всеми сущностями
    for (const entity of gameState.entities) {
      if (entity !== this && entity.solid && this.checkCollision(entity)) {
        collision = true;
        break;
      }
    }

    // Возвращаем на старое место, если есть столкновение
    if (collision) {
      this.x = oldX;
      this.y = oldY;
      this.isMoving = false;
      return false;
    }

    return true;
  }

  shoot() {
    if (this.destroyed || this.bulletCooldown > 0 || this.bullet) return false;

    // Создаем пулю на основе направления танка
    const bulletX = this.x + this.width / 2 - this.bulletType.size / 2;
    const bulletY = this.y + this.height / 2 - this.bulletType.size / 2;

    // Определяем тип пули в зависимости от модификаторов
    let currentBulletType = this.bulletType;

    // Выбираем тип пули в зависимости от уровня танка
    if (this.type === ENTITY_TYPES.PLAYER) {
      switch (this.powerLevel) {
        case 1:
          currentBulletType = this.canShootFast
            ? BULLET_TYPES.FAST
            : BULLET_TYPES.REGULAR;
          break;
        case 2:
          currentBulletType = BULLET_TYPES.ENHANCED;
          break;
        case 3:
          currentBulletType = BULLET_TYPES.HEAVY;
          break;
      }
    }

    this.bullet = new Bullet(
      bulletX,
      bulletY,
      this.direction,
      this.type,
      currentBulletType
    );

    gameState.bullets.push(this.bullet);

    // Время перезарядки зависит от модификаторов
    let cooldown = this.maxBulletCooldown;
    if (this.canShootFast) {
      cooldown *= 0.6; // Уменьшаем время перезарядки на 40%
    }
    this.bulletCooldown = cooldown;

    // Создаем эффект вспышки при выстреле
    this.createMuzzleFlash();

    return true;
  }

  createMuzzleFlash() {
    // Определяем позицию вспышки в зависимости от направления
    let flashX, flashY;

    switch (this.direction) {
      case DIRECTIONS.UP:
        flashX = this.x + this.width / 2 - 4;
        flashY = this.y - 4;
        break;
      case DIRECTIONS.DOWN:
        flashX = this.x + this.width / 2 - 4;
        flashY = this.y + this.height;
        break;
      case DIRECTIONS.LEFT:
        flashX = this.x - 4;
        flashY = this.y + this.height / 2 - 4;
        break;
      case DIRECTIONS.RIGHT:
        flashX = this.x + this.width;
        flashY = this.y + this.height / 2 - 4;
        break;
    }

    // Создаем искру как эффект вспышки
    const spark = new Spark(flashX, flashY, 0.8, 0.15);
    gameState.entities.push(spark);
  }

  renderTracks(ctx) {
    // Рисуем следы от гусениц
    ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';

    for (const track of this.tracks) {
      // Прозрачность зависит от возраста следа
      const alpha = 1 - track.age * 2;
      ctx.globalAlpha = Math.max(0, alpha);

      ctx.fillRect(track.x, track.y, track.width, track.height);
    }

    ctx.globalAlpha = 1; // Восстанавливаем прозрачность
  }

  render(ctx) {
    if (this.destroyed) return;

    // Сначала рисуем следы от гусениц
    this.renderTracks(ctx);

    // Проверяем, должен ли танк мерцать (защита спавна)
    if (this.isBlinking && Math.floor(this.blinkTime / 0.05) % 2 === 0) {
      return; // Пропускаем рендеринг для эффекта мерцания
    }

    // Цвет танка в зависимости от типа и уровня силы
    let tankColor;
    if (this.type === ENTITY_TYPES.PLAYER) {
      // Цвет игрока зависит от уровня силы
      switch (this.powerLevel) {
        case 1:
          tankColor = '#EEEEEE'; // Обычный танк - белый
          break;
        case 2:
          tankColor = '#FFFF00'; // Улучшенный танк - желтый
          break;
        case 3:
          tankColor = '#FF9900'; // Мощный танк - оранжевый
          break;
      }
    } else {
      // Враги могут быть разных цветов
      tankColor = '#FF3333'; // Красный
    }

    // Сохраняем контекст для поворота
    ctx.save();

    // Перемещаем контекст в центр танка
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

    // Поворачиваем на угол в зависимости от направления
    ctx.rotate((this.direction.angle * Math.PI) / 180);

    // Для улучшенных танков добавляем свечение
    if (this.powerLevel > 1) {
      ctx.shadowColor = tankColor;
      ctx.shadowBlur = 5;
    }

    // Рисуем гусеницы
    ctx.fillStyle = '#333333';
    // Левая гусеница
    ctx.fillRect(-this.width / 2, -this.height / 2, 4, this.height);
    // Правая гусеница
    ctx.fillRect(this.width / 2 - 4, -this.height / 2, 4, this.height);

    // Анимация гусениц (смещение их частей при движении)
    if (this.isMoving) {
      ctx.fillStyle = '#555555';
      const offset = this.animationFrame * 4;

      // Левая гусеница
      for (let i = 0; i < this.height / 4; i++) {
        if ((i + this.animationFrame) % 2 === 0) {
          ctx.fillRect(
            -this.width / 2,
            -this.height / 2 + i * 4 + (offset % 4),
            4,
            2
          );
        }
      }

      // Правая гусеница
      for (let i = 0; i < this.height / 4; i++) {
        if ((i + this.animationFrame) % 2 === 0) {
          ctx.fillRect(
            this.width / 2 - 4,
            -this.height / 2 + i * 4 + (offset % 4),
            4,
            2
          );
        }
      }
    }

    // Рисуем корпус танка (смещаем относительно центра)
    ctx.fillStyle = tankColor;
    ctx.fillRect(
      -this.width / 2 + 4,
      -this.height / 2 + 4,
      this.width - 8,
      this.height - 8
    );

    // Рисуем башню танка
    ctx.fillStyle = tankColor;
    ctx.fillRect(
      -this.width / 4,
      -this.height / 4,
      this.width / 2,
      this.height / 2
    );

    // Рисуем дуло
    ctx.fillStyle = tankColor;
    ctx.fillRect(-2, -this.height / 2, 4, this.height / 2);

    // Сбрасываем эффекты
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Восстанавливаем контекст
    ctx.restore();
  }

  addShield() {
    if (this.destroyed) return;

    this.shielded = true;

    // Создаем визуальный эффект щита
    const shield = new Shield(this);
    gameState.entities.push(shield);
  }

  upgradeWeapon() {
    if (this.powerLevel < 3) {
      this.powerLevel++;
    }
  }

  enableSpeedBoost() {
    this.canSpeedBoost = true;
  }

  enableFastShoot() {
    this.canShootFast = true;
  }

  destroy() {
    if (this.shielded) {
      // Если есть щит, не уничтожаем танк, а только щит
      this.shielded = false;

      // Находим и удаляем щит
      for (let i = 0; i < gameState.entities.length; i++) {
        const entity = gameState.entities[i];
        if (entity.type === ENTITY_TYPES.SHIELD && entity.tank === this) {
          gameState.entities.splice(i, 1);
          break;
        }
      }

      return;
    }

    // Добавляем тряску экрана
    addVisualEffect('screenShake', 5.0);

    // Добавляем кратковременную вспышку
    addVisualEffect('flashWhite', 0.3);

    this.destroyed = true;

    // Создаем эффект взрыва
    const explosion = new Explosion(this.x - 8, this.y - 8, TILE_SIZE * 3);
    gameState.entities.push(explosion);

    // Создаем облако дыма и частицы
    for (let i = 0; i < 12; i++) {
      const particle = new Particle(
        this.x + Math.random() * this.width,
        this.y + Math.random() * this.height,
        '#' + Math.floor(Math.random() * 16777215).toString(16), // Случайный цвет
        Math.random() * 100 - 50, // Скорость X
        Math.random() * 100 - 50, // Скорость Y
        Math.random() * 5 + 2 // Размер
      );
      gameState.entities.push(particle);
    }

    // Для игрока
    if (this.type === ENTITY_TYPES.PLAYER) {
      gameState.playerLives--;
      updateUI();

      // Кратковременное замедление времени при смерти игрока
      addVisualEffect('slowMotion');

      if (gameState.playerLives > 0) {
        // Восстанавливаем игрока на стартовой позиции
        setTimeout(() => {
          respawnPlayer();
        }, 1500);
      } else {
        addVisualEffect('flashBlack', 0.7); // Затемнение экрана при конце игры
        gameOver();
      }
    } else if (this.type === ENTITY_TYPES.ENEMY) {
      // Для врага
      gameState.enemiesLeft--;
      updateUI();

      // Увеличиваем счет при уничтожении врага
      gameState.score += 100;

      // Удаляем врага из массива
      const index = gameState.enemies.indexOf(this);
      if (index !== -1) {
        gameState.enemies.splice(index, 1);
      }

      // Шанс выпадения бонуса
      if (Math.random() < 0.2) {
        // 20% шанс
        this.dropPowerup();
      }

      // Если врагов не осталось, переходим на следующий уровень
      if (gameState.enemies.length === 0 && gameState.enemiesLeft === 0) {
        // Эффект вспышки при завершении уровня
        addVisualEffect('flashWhite', 0.7);

        setTimeout(() => {
          nextLevel();
        }, 2000);
      } else if (gameState.enemies.length < 4 && gameState.enemiesLeft > 0) {
        // Спавним нового врага, если на поле меньше 4 и еще есть враги
        setTimeout(() => {
          spawnEnemy();
        }, 2000);
      }
    }
  }

  dropPowerup() {
    // Создаем бонус на месте уничтоженного танка
    const powerupTypes = ['shield', 'weapon', 'speed', 'life'];
    const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];

    const powerup = new Powerup(
      this.x + this.width / 4,
      this.y + this.height / 4,
      type
    );
    gameState.entities.push(powerup);
  }
}
