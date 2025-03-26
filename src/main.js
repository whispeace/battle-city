import './style.css';

// Константы игры
const TILE_SIZE = 16;
const GRID_SIZE = 26;
const CANVAS_SIZE = TILE_SIZE * GRID_SIZE;
const DIRECTIONS = {
  UP: { x: 0, y: -1, angle: 0 },
  RIGHT: { x: 1, y: 0, angle: 90 },
  DOWN: { x: 0, y: 1, angle: 180 },
  LEFT: { x: -1, y: 0, angle: 270 },
};
const ENTITY_TYPES = {
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
const EFFECTS = {
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
const BULLET_TYPES = {
  REGULAR: { power: 1, speed: 150, size: 4, maxBounces: 0 },
  ENHANCED: { power: 2, speed: 180, size: 4, maxBounces: 0 },
  FAST: { power: 1, speed: 220, size: 3, maxBounces: 0 },
  HEAVY: { power: 3, speed: 130, size: 5, maxBounces: 0 },
  BOUNCY: { power: 1, speed: 170, size: 4, maxBounces: 1 },
};

// Игровое состояние
const gameState = {
  isRunning: false,
  entities: [],
  player: null,
  bullets: [],
  enemies: [],
  playerLives: 3,
  enemiesLeft: 20,
  stage: 1,
  score: 0,
  powerups: [],
  particles: [],
  keys: {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    ' ': false,
    Space: false, // Альтернативный код для пробела
    KeyZ: false, // Дополнительная клавиша для стрельбы
    KeyX: false, // Клавиша для спецспособности
  },
  lastTime: 0,
  effects: {
    screenShake: 0, // Сила тряски экрана
    fadeEffect: 0, // Эффект затемнения/осветления экрана
    slowMotion: 1.0, // Замедление времени (1.0 = нормальная скорость)
  },
};

// Класс сущности - базовый для всех игровых объектов
class Entity {
  constructor(x, y, width, height, type) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.solid = true;
    this.destructible = false;
  }

  update(dt) {}

  render(ctx) {
    // Базовый рендеринг, будет переопределен для разных типов
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  getBoundingBox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  checkCollision(entity) {
    // Проверка столкновений методом AABB
    const a = this.getBoundingBox();
    const b = entity.getBoundingBox();

    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }
}

// Класс бонуса (powerup)
class Powerup extends Entity {
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
    if (
      gameState.player &&
      !gameState.player.destroyed &&
      this.checkCollision(gameState.player)
    ) {
      this.applyPowerup();

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
        updateUI();
        break;
    }

    // Эффект при подборе бонуса
    this.createPickupEffect();

    // Добавляем очки
    gameState.score += 500;
    updateUI();
  }

  createPickupEffect() {
    // Создаем круговую вспышку при подборе бонуса
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // Создаем частицы вокруг
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const particle = new Particle(
        centerX,
        centerY,
        this.color,
        Math.cos(angle) * 50,
        Math.sin(angle) * 50,
        4
      );
      gameState.entities.push(particle);
    }

    // Создаем вспышку
    const spark = new Spark(centerX - 8, centerY - 8, 2, 0.5);
    gameState.entities.push(spark);
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

// Спрайты и ресурсы
const assets = {
  loaded: false,
  sprites: {},
};

// Класс стены (кирпичной или стальной)
class Wall extends Entity {
  constructor(x, y, type) {
    super(x, y, TILE_SIZE, TILE_SIZE, type);
    this.destructible = type === ENTITY_TYPES.BRICK;
  }

  render(ctx) {
    if (this.type === ENTITY_TYPES.BRICK) {
      ctx.fillStyle = '#CC6600';
      ctx.fillRect(this.x, this.y, this.width, this.height);

      // Узор кирпичной стены
      ctx.fillStyle = '#993300';
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          ctx.fillRect(this.x + i * 8 + 0.5, this.y + j * 8 + 0.5, 7, 3);
          ctx.fillRect(
            this.x + i * 8 + 0.5 + (j % 2 === 0 ? 0 : 4),
            this.y + j * 8 + 4.5,
            3,
            3
          );
        }
      }
    } else if (this.type === ENTITY_TYPES.STEEL) {
      ctx.fillStyle = '#CCCCCC';
      ctx.fillRect(this.x, this.y, this.width, this.height);

      // Узор стальной стены
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(this.x + 3, this.y + 3, 4, 4);
      ctx.fillRect(this.x + 9, this.y + 9, 4, 4);
      ctx.fillRect(this.x + 9, this.y + 3, 4, 4);
      ctx.fillRect(this.x + 3, this.y + 9, 4, 4);
    }
  }
}

// Класс растительности
class Grass extends Entity {
  constructor(x, y) {
    super(x, y, TILE_SIZE, TILE_SIZE, ENTITY_TYPES.GRASS);
    this.solid = false;
  }

  render(ctx) {
    ctx.fillStyle = '#00CC00';

    // Создаем узор для травы
    const size = 4;
    for (let i = 0; i < this.width / size; i++) {
      for (let j = 0; j < this.height / size; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(this.x + i * size, this.y + j * size, size, size);
        }
      }
    }
  }
}

// Класс базы (орёл)
class Base extends Entity {
  constructor(x, y) {
    super(x, y, TILE_SIZE * 2, TILE_SIZE * 2, ENTITY_TYPES.BASE);
    this.destructible = true;
    this.destroyed = false;
  }

  render(ctx) {
    if (this.destroyed) {
      ctx.fillStyle = '#555555';
      ctx.fillRect(this.x, this.y, this.width, this.height);
    } else {
      // Рисуем подставку
      ctx.fillStyle = '#888888';
      ctx.fillRect(this.x + 4, this.y + 24, 24, 8);

      // Рисуем орла
      ctx.fillStyle = '#FFCC00';
      // Корпус
      ctx.fillRect(this.x + 8, this.y + 8, 16, 16);
      // Крылья
      ctx.fillRect(this.x + 4, this.y + 12, 4, 8);
      ctx.fillRect(this.x + 24, this.y + 12, 4, 8);
      // Голова
      ctx.fillRect(this.x + 12, this.y + 4, 8, 4);
    }
  }

  destroy() {
    this.destroyed = true;
    gameOver();
  }
}

// Класс танка (базовый для игрока и врагов)
class Tank extends Entity {
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

    if (
      this.direction === DIRECTIONS.UP ||
      this.direction === DIRECTIONS.DOWN
    ) {
      // Вертикальное движение
      track1 = {
        x: this.x + 2,
        y:
          this.direction === DIRECTIONS.UP
            ? this.y + this.height - 4
            : this.y + 2,
        width: 4,
        height: 2,
        age: 0,
      };

      track2 = {
        x: this.x + this.width - 6,
        y:
          this.direction === DIRECTIONS.UP
            ? this.y + this.height - 4
            : this.y + 2,
        width: 4,
        height: 2,
        age: 0,
      };
    } else {
      // Горизонтальное движение
      track1 = {
        x:
          this.direction === DIRECTIONS.LEFT
            ? this.x + this.width - 4
            : this.x + 2,
        y: this.y + 2,
        width: 2,
        height: 4,
        age: 0,
      };

      track2 = {
        x:
          this.direction === DIRECTIONS.LEFT
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
    if (
      newX < 0 ||
      newX + this.width > CANVAS_SIZE ||
      newY < 0 ||
      newY + this.height > CANVAS_SIZE
    ) {
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

// Класс игрока (наследуется от танка)
class Player extends Tank {
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

// Класс врага (наследуется от танка)
class Enemy extends Tank {
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

// Класс пули
class Bullet extends Entity {
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
    if (
      this.x < 0 ||
      this.x + this.width > CANVAS_SIZE ||
      this.y < 0 ||
      this.y + this.height > CANVAS_SIZE
    ) {
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
      if (
        (entity.solid || entity.type === ENTITY_TYPES.GRASS) &&
        this.checkCollision(entity)
      ) {
        // Обрабатываем столкновение в зависимости от типа объекта
        switch (entity.type) {
          case ENTITY_TYPES.BRICK:
            if (this.handleBrickCollision(entity)) return;
            break;

          case ENTITY_TYPES.STEEL:
            if (this.handleSteelCollision(entity)) return;
            break;

          case ENTITY_TYPES.BASE:
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
            if (
              entity.type !== this.ownerType &&
              !entity.destroyed &&
              !entity.shielded
            ) {
              entity.destroy();

              // Начисляем очки, если игрок подбил врага
              if (
                this.ownerType === ENTITY_TYPES.PLAYER &&
                entity.type === ENTITY_TYPES.ENEMY
              ) {
                gameState.score += EFFECTS.DESTROY_SCORE;
              }

              this.destroy(true);
              return;
            }
            break;
        }
      }
    }

    // Проверяем столкновения с другими танками (для производительности проверяем отдельно)
    if (this.ownerType === ENTITY_TYPES.PLAYER) {
      for (const enemy of gameState.enemies) {
        if (!enemy.destroyed && !enemy.shielded && this.checkCollision(enemy)) {
          enemy.destroy();
          gameState.score += EFFECTS.DESTROY_SCORE;
          this.destroy(true);
          return;
        }
      }
    } else if (this.ownerType === ENTITY_TYPES.ENEMY) {
      if (
        gameState.player &&
        !gameState.player.destroyed &&
        !gameState.player.shielded &&
        this.checkCollision(gameState.player)
      ) {
        gameState.player.destroy();
        this.destroy(true);
        return;
      }
    }

    // Проверяем столкновения с другими пулями
    for (const bullet of gameState.bullets) {
      if (bullet !== this && this.checkCollision(bullet)) {
        // Создаем большую искру при столкновении пуль
        const sparkX = (this.x + bullet.x) / 2;
        const sparkY = (this.y + bullet.y) / 2;
        const spark = new Spark(sparkX, sparkY, 1.5); // Большая искра
        gameState.entities.push(spark);

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

      // Создаем эффект разрушения кирпича
      this.createBrickParticles(brick);

      // Если игрок уничтожил кирпич, начисляем очки
      if (this.ownerType === ENTITY_TYPES.PLAYER) {
        gameState.score += EFFECTS.DAMAGE_SCORE;
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

        // Более мощный эффект разрушения для стальной стены
        this.createSteelParticles(steel);

        // Если игрок уничтожил стальную стену, начисляем больше очков
        if (this.ownerType === ENTITY_TYPES.PLAYER) {
          gameState.score += EFFECTS.DESTROY_SCORE;
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
    const spark = new Spark(
      this.x + this.width / 2 - 4,
      this.y + this.height / 2 - 4
    );
    gameState.entities.push(spark);
  }

  createBrickParticles(brick) {
    for (let i = 0; i < EFFECTS.BRICK_PARTICLES_COUNT; i++) {
      const particle = new Particle(
        brick.x + Math.random() * brick.width,
        brick.y + Math.random() * brick.height,
        '#CC6600',
        Math.random() * 60 - 30, // Скорость по X: от -30 до 30
        Math.random() * 60 - 30, // Скорость по Y: от -30 до 30
        Math.random() * 4 + 2 // Размер: от 2 до 6
      );
      gameState.entities.push(particle);
    }
  }

  createSteelParticles(steel) {
    for (let i = 0; i < EFFECTS.BRICK_PARTICLES_COUNT * 1.5; i++) {
      const particle = new Particle(
        steel.x + Math.random() * steel.width,
        steel.y + Math.random() * steel.height,
        '#AAAAAA',
        Math.random() * 80 - 40, // Скорость по X: от -40 до 40
        Math.random() * 80 - 40, // Скорость по Y: от -40 до 40
        Math.random() * 3 + 1 // Размер: от 1 до 4
      );
      gameState.entities.push(particle);
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
    if (
      this.direction === DIRECTIONS.UP ||
      this.direction === DIRECTIONS.DOWN
    ) {
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

    // Добавляем эффект попадания
    if (createEffect) {
      // Выбираем тип эффекта в зависимости от силы пули
      if (this.power >= 3) {
        // Тяжелая пуля создает большой взрыв
        const explosion = new Explosion(
          this.x - this.width * 2,
          this.y - this.height * 2,
          this.width * 5,
          EFFECTS.EXPLOSION_DURATION / 2
        );
        gameState.entities.push(explosion);
      } else {
        // Обычная пуля создает искру
        const spark = new Spark(
          this.x - this.width / 2,
          this.y - this.height / 2,
          1.0,
          EFFECTS.SPARK_DURATION
        );
        gameState.entities.push(spark);
      }
    }
  }
}

// Класс взрыва (анимированный эффект)
class Explosion extends Entity {
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

// Класс искры (эффект при попадании пули)
class Spark extends Entity {
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

// Класс частицы (для эффектов разрушения)
class Particle extends Entity {
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
    const fillColor =
      rgbPart +
      Math.floor(alpha * 255)
        .toString(16)
        .padStart(2, '0');

    ctx.fillStyle = fillColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// Класс щита (для временной неуязвимости)
class Shield extends Entity {
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

// Инициализация игры
function initGame() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Установка размеров canvas
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  // Обработчики клавиш
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Кнопка "Начать игру"
  const startButton = document.getElementById('startButton');
  startButton.addEventListener('click', startGame);

  // Инициализация игрового состояния
  resetGameState();

  // Запуск игрового цикла
  requestAnimationFrame(gameLoop);
}

// Обработчики клавиш
function handleKeyDown(e) {
  if (gameState.keys.hasOwnProperty(e.key)) {
    gameState.keys[e.key] = true;
    e.preventDefault();

    // Отладочная информация
    console.log('Клавиша нажата:', e.key);
  }
}

function handleKeyUp(e) {
  if (gameState.keys.hasOwnProperty(e.key)) {
    gameState.keys[e.key] = false;
    e.preventDefault();
  }
}

// Добавляем обработчик для всплывшей ошибки в консоли
window.addEventListener('error', function (e) {
  console.error('Ошибка игры:', e.message);
});

// Сброс игрового состояния
function resetGameState() {
  gameState.isRunning = false;
  gameState.entities = [];
  gameState.bullets = [];
  gameState.enemies = [];
  gameState.player = null;
  gameState.playerLives = 3;
  gameState.enemiesLeft = 20;
  gameState.stage = 1;

  // Сброс нажатых клавиш
  Object.keys(gameState.keys).forEach((key) => {
    gameState.keys[key] = false;
  });
}

// Запуск игры
function startGame() {
  resetGameState();

  // Скрываем стартовый экран
  document.getElementById('startScreen').style.display = 'none';

  gameState.isRunning = true;

  // Создаем уровень
  createLevel();

  // Обновляем интерфейс
  updateUI();
}

// Создание уровня
function createLevel() {
  // Базовый шаблон уровня
  const levelMap = [
    '############..############',
    '#..........................#',
    '#....BB......BB....BB....#',
    '#....BB......BB....BB....#',
    '#..........................#',
    '#.....SS..........SS.....#',
    '#.....SS..........SS.....#',
    '#..........................#',
    '#..BB....GGGG....BB......#',
    '#..BB....GGGG....BB......#',
    '#..........GG..............#',
    '#..........GG..............#',
    '#..........................#',
    '#....SS..........SS......#',
    '#....SS..........SS......#',
    '#..........................#',
    '#..........................#',
    '#..SS..........SS........#',
    '#..SS..........SS........#',
    '#..........................#',
    '#......BB........BB......#',
    '#......BB........BB......#',
    '#.........E................#',
    '#.........BB...BB........#',
    '#.........BB...BB........#',
    '##########...##########',
  ];

  // Парсинг карты
  for (let y = 0; y < levelMap.length; y++) {
    for (let x = 0; x < levelMap[y].length; x++) {
      const tileX = x * TILE_SIZE;
      const tileY = y * TILE_SIZE;

      switch (levelMap[y][x]) {
        case '#': // Стальная стена
          gameState.entities.push(new Wall(tileX, tileY, ENTITY_TYPES.STEEL));
          break;
        case 'B': // Кирпичная стена
          gameState.entities.push(new Wall(tileX, tileY, ENTITY_TYPES.BRICK));
          break;
        case 'G': // Трава
          gameState.entities.push(new Grass(tileX, tileY));
          break;
        case 'E': // База (орёл)
          gameState.entities.push(new Base(tileX, tileY));
          break;
      }
    }
  }

  // Создаем игрока
  spawnPlayer();

  // Спавним начальных врагов
  for (let i = 0; i < 4; i++) {
    spawnEnemy();
  }
}

// Спавн игрока
function spawnPlayer() {
  const player = new Player(
    CANVAS_SIZE / 2 - TILE_SIZE,
    CANVAS_SIZE - TILE_SIZE * 3
  );
  gameState.player = player;
  gameState.entities.push(player);
}

// Респавн игрока
function respawnPlayer() {
  if (!gameState.isRunning) return;

  spawnPlayer();
}

// Спавн врага
function spawnEnemy() {
  if (!gameState.isRunning || gameState.enemiesLeft <= 0) return;

  // Возможные позиции спавна (верхние углы и центр)
  const spawnPositions = [
    { x: 0, y: 0 },
    { x: CANVAS_SIZE - TILE_SIZE * 2, y: 0 },
    { x: CANVAS_SIZE / 2 - TILE_SIZE, y: 0 },
  ];

  // Выбираем случайную позицию
  const pos = spawnPositions[Math.floor(Math.random() * spawnPositions.length)];

  const enemy = new Enemy(pos.x, pos.y);
  gameState.enemies.push(enemy);
  gameState.entities.push(enemy);
}

// Обновление UI
function updateUI() {
  document.getElementById('lives').innerText = `IP: ${gameState.playerLives}`;
  document.getElementById('stage').innerText = `STAGE ${gameState.stage}`;
  document.getElementById(
    'enemies'
  ).innerText = `ENEMY: ${gameState.enemiesLeft}`;

  // Добавляем анимацию к UI при обновлении
  const uiContainer = document.querySelector('.ui-container');
  uiContainer.style.animation = 'none';
  void uiContainer.offsetWidth; // Trick to restart animation
  uiContainer.style.animation = 'ui-update 0.3s';
}

// Следующий уровень
function nextLevel() {
  if (!gameState.isRunning) return;

  // Добавляем очки за завершение уровня
  gameState.score += 1000 + gameState.stage * 500;

  gameState.stage++;
  gameState.enemiesLeft = 20;
  gameState.entities = [];
  gameState.bullets = [];
  gameState.enemies = [];

  // Сброс замедления времени
  gameState.effects.slowMotion = 1.0;

  // Добавляем визуальный эффект перехода
  addVisualEffect('flashWhite', 0.7);

  createLevel();
  updateUI();
}

// Конец игры
function gameOver() {
  gameState.isRunning = false;

  // Добавляем эффект затемнения
  addVisualEffect('flashBlack', 0.7);

  // Показываем стартовый экран с анимацией
  const startScreen = document.getElementById('startScreen');
  startScreen.style.display = 'none';
  void startScreen.offsetWidth; // Trick to restart animation
  startScreen.style.animation = 'fadeIn 1s forwards';
  startScreen.style.display = 'flex';

  // Отображаем результаты игры
  const title = document.querySelector('#startScreen h1');
  title.textContent = 'GAME OVER';

  // Создаем элемент со счетом
  const scoreElement = document.createElement('div');
  scoreElement.textContent = `SCORE: ${gameState.score}`;
  scoreElement.style.fontSize = '24px';
  scoreElement.style.margin = '10px 0';

  // Проверяем, есть ли уже отображение счета
  const existingScore = document.querySelector('#startScreen .score-display');
  if (existingScore) {
    existingScore.textContent = scoreElement.textContent;
  } else {
    scoreElement.className = 'score-display';
    // Вставляем перед кнопкой
    const button = document.querySelector('#startScreen button');
    button.parentNode.insertBefore(scoreElement, button);
  }

  // Меняем текст кнопки
  document.getElementById('startButton').innerText = 'ИГРАТЬ СНОВА';
}

// Игровой цикл
function gameLoop(timestamp) {
  // Вычисляем дельту времени
  let deltaTime = (timestamp - gameState.lastTime) / 1000;
  // Ограничиваем дельту времени для стабильности физики
  deltaTime = Math.min(deltaTime, 0.1);
  // Применяем эффект замедления времени
  deltaTime *= gameState.effects.slowMotion;

  gameState.lastTime = timestamp;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Применяем эффект тряски экрана
  if (gameState.effects.screenShake > 0) {
    const shakeIntensity = Math.min(gameState.effects.screenShake, 10);
    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Уменьшаем силу тряски со временем
    gameState.effects.screenShake -= deltaTime * 20;
    if (gameState.effects.screenShake < 0) {
      gameState.effects.screenShake = 0;
    }
  }

  // Очищаем canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Эффект затемнения/осветления экрана
  if (gameState.effects.fadeEffect !== 0) {
    ctx.fillStyle =
      gameState.effects.fadeEffect > 0
        ? `rgba(255, 255, 255, ${gameState.effects.fadeEffect})`
        : `rgba(0, 0, 0, ${-gameState.effects.fadeEffect})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Уменьшаем эффект затемнения/осветления со временем
    if (gameState.effects.fadeEffect > 0) {
      gameState.effects.fadeEffect -= deltaTime * 2;
      if (gameState.effects.fadeEffect < 0) {
        gameState.effects.fadeEffect = 0;
      }
    } else {
      gameState.effects.fadeEffect += deltaTime * 2;
      if (gameState.effects.fadeEffect > 0) {
        gameState.effects.fadeEffect = 0;
      }
    }
  }

  // Обновляем состояние игры
  if (gameState.isRunning) {
    // Обновляем все сущности с использованием безопасной итерации
    // Используем копию массива, чтобы избежать проблем при добавлении/удалении элементов
    const entityCopy = [...gameState.entities];
    for (const entity of entityCopy) {
      if (gameState.entities.includes(entity)) {
        // Проверяем, что сущность всё ещё существует
        entity.update(deltaTime);
      }
    }

    // Обновляем пули с безопасной итерацией
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
      if (gameState.bullets[i]) {
        // Проверяем, что пуля существует
        gameState.bullets[i].update(deltaTime);
      }
    }
  }

  // Рендерим сущности в правильном порядке слоёв

  // 1. Следы от гусениц танков
  if (gameState.player && !gameState.player.destroyed) {
    gameState.player.renderTracks(ctx);
  }
  for (const enemy of gameState.enemies) {
    if (!enemy.destroyed) {
      enemy.renderTracks(ctx);
    }
  }

  // 2. Рисуем стены, траву и другие неподвижные объекты
  for (const entity of gameState.entities) {
    if (
      entity.type === ENTITY_TYPES.BRICK ||
      entity.type === ENTITY_TYPES.STEEL ||
      entity.type === ENTITY_TYPES.WATER ||
      entity.type === ENTITY_TYPES.ICE ||
      entity.type === ENTITY_TYPES.BASE
    ) {
      entity.render(ctx);
    }
  }

  // 3. Рисуем бонусы
  for (const entity of gameState.entities) {
    if (entity.type === ENTITY_TYPES.POWERUP) {
      entity.render(ctx);
    }
  }

  // 4. Рисуем частицы, искры и другие эффекты
  for (const entity of gameState.entities) {
    if (entity.type === 'particle') {
      entity.render(ctx);
    }
  }

  // 5. Рисуем танки
  for (const entity of gameState.entities) {
    if (
      entity.type === ENTITY_TYPES.PLAYER ||
      entity.type === ENTITY_TYPES.ENEMY
    ) {
      entity.render(ctx);
    }
  }

  // 6. Рисуем траву поверх танков, чтобы танки были "под травой"
  for (const entity of gameState.entities) {
    if (entity.type === ENTITY_TYPES.GRASS) {
      entity.render(ctx);
    }
  }

  // 7. Рисуем пули
  for (const bullet of gameState.bullets) {
    bullet.render(ctx);
  }

  // 8. Рисуем эффекты взрывов, искр и щитов
  for (const entity of gameState.entities) {
    if (
      entity.type === ENTITY_TYPES.EXPLOSION ||
      entity.type === ENTITY_TYPES.SPARK ||
      entity.type === ENTITY_TYPES.SHIELD
    ) {
      entity.render(ctx);
    }
  }

  // Отображение счёта и другой информации
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '14px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE: ${gameState.score}`, canvas.width - 10, 20);

  // Если была применена тряска экрана, восстанавливаем состояние
  if (gameState.effects.screenShake > 0) {
    ctx.restore();
  }

  // Продолжаем игровой цикл
  requestAnimationFrame(gameLoop);
}

// Вспомогательная функция для добавления визуальных эффектов
function addVisualEffect(effectType, intensity = 1.0) {
  switch (effectType) {
    case 'screenShake':
      gameState.effects.screenShake = intensity;
      break;
    case 'flashWhite':
      gameState.effects.fadeEffect = intensity;
      break;
    case 'flashBlack':
      gameState.effects.fadeEffect = -intensity;
      break;
    case 'slowMotion':
      gameState.effects.slowMotion = 0.5; // Замедляем игру в 2 раза
      // Возвращаем нормальную скорость через секунду
      setTimeout(() => {
        gameState.effects.slowMotion = 1.0;
      }, 1000);
      break;
  }
}

// Обновляем метод destroy в Tank для поддержки новых эффектов
function destroyWithEffects() {
  // Добавляем тряску экрана
  addVisualEffect('screenShake', 5.0);

  // Добавляем кратковременную вспышку
  addVisualEffect('flashWhite', 0.3);

  // Создаем эффект взрыва с частицами
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

  // Применяем оригинальную логику destroy
  this.destroyed = true;

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
      // Воскрешаем нового врага, если на поле меньше 4 и еще есть враги
      setTimeout(() => {
        spawnEnemy();
      }, 2000);
    }
  }
}

// Инициализируем игру при загрузке страницы
window.addEventListener('load', initGame);
