import './style.css';
import { TILE_SIZE, ENTITY_TYPES, CANVAS_SIZE } from './constants';
import { Wall } from './Wall';
import { Grass } from './Grass';
import { Base } from './Base';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { Explosion } from './Explosion';
import { Particle } from './Particle';

// Игровое состояние
export const gameState = {
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
    KeyX: false, // Клавиша для спец способности
  },
  lastTime: 0,
  effects: {
    screenShake: 0, // Сила тряски экрана
    fadeEffect: 0, // Эффект затемнения/осветления экрана
    slowMotion: 1.0, // Замедление времени (1.0 = нормальная скорость)
  },
};

// Спрайты и ресурсы
const assets = {
  loaded: false,
  sprites: {},
};

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
export function respawnPlayer() {
  if (!gameState.isRunning) return;

  spawnPlayer();
}

// Спавн врага
export function spawnEnemy() {
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
export function updateUI() {
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
export function nextLevel() {
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
export function gameOver() {
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
export function addVisualEffect(effectType, intensity = 1.0) {
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
