/**
 * GameServices.js - модуль сервисов игры
 * Использует паттерн Фасад для доступа к основным сервисам
 */

import { eventBus, GAME_EVENTS } from '../EventBus';
import { gameState } from '../main';
import { Particle } from '../Particle';
import { Spark } from '../Spark';
import { Explosion } from '../Explosion';

// Класс сервисов управления звуковыми эффектами
export class SoundService {
  constructor() {
    this.sounds = {};
    this.muted = false;
    
    // Инициализация звуков
    this.init();
    
    // Настраиваем слушатели событий
    this.setupEventListeners();
  }
  
  init() {
    // В будущем здесь будет инициализация звуков
    console.log('Сервис звуков инициализирован');
  }
  
  setupEventListeners() {
    // Звуки при стрельбе
    eventBus.on(GAME_EVENTS.BULLET_FIRE, this.playShoot.bind(this));
    
    // Звуки при попаданиях
    eventBus.on(GAME_EVENTS.BULLET_HIT, this.handleBulletHit.bind(this));
    
    // Звуки при подборе бонусов
    eventBus.on(GAME_EVENTS.POWERUP_COLLECT, this.playPowerup.bind(this));
    
    // Звуки событий игры
    eventBus.on(GAME_EVENTS.PLAYER_DESTROY, this.playPlayerDestroy.bind(this));
    eventBus.on(GAME_EVENTS.ENEMY_DESTROY, this.playEnemyDestroy.bind(this));
    eventBus.on(GAME_EVENTS.BASE_DESTROY, this.playBaseDestroy.bind(this));
    eventBus.on(GAME_EVENTS.GAME_OVER, this.playGameOver.bind(this));
    eventBus.on(GAME_EVENTS.LEVEL_COMPLETE, this.playLevelComplete.bind(this));
  }
  
  playShoot(data) {
    if (this.muted) return;
    console.log('Звук выстрела');
  }
  
  handleBulletHit(data) {
    if (this.muted) return;
    
    switch (data.type) {
      case 'brickDestroy':
        this.playBrickHit();
        break;
      case 'steelDestroy':
        this.playSteelHit();
        break;
      case 'tankHit':
        this.playTankHit();
        break;
      case 'bounce':
        this.playBounce();
        break;
      case 'bulletCollision':
        this.playBulletCollision();
        break;
    }
  }
  
  playBrickHit() {
    console.log('Звук разрушения кирпича');
  }
  
  playSteelHit() {
    console.log('Звук удара по стали');
  }
  
  playTankHit() {
    console.log('Звук попадания в танк');
  }
  
  playBounce() {
    console.log('Звук отскока');
  }
  
  playBulletCollision() {
    console.log('Звук столкновения пуль');
  }
  
  playPowerup() {
    console.log('Звук подбора бонуса');
  }
  
  playPlayerDestroy() {
    console.log('Звук уничтожения игрока');
  }
  
  playEnemyDestroy() {
    console.log('Звук уничтожения врага');
  }
  
  playBaseDestroy() {
    console.log('Звук уничтожения базы');
  }
  
  playGameOver() {
    console.log('Звук конца игры');
  }
  
  playLevelComplete() {
    console.log('Звук завершения уровня');
  }
  
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

// Класс сервисов визуальных эффектов
export class EffectsService {
  constructor() {
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    eventBus.on(GAME_EVENTS.EFFECT_EXPLOSION, this.createExplosionEffect.bind(this));
    eventBus.on(GAME_EVENTS.EFFECT_SCREEN_SHAKE, this.createScreenShake.bind(this));
    eventBus.on(GAME_EVENTS.EFFECT_FLASH, this.createFlashEffect.bind(this));
    eventBus.on(GAME_EVENTS.EFFECT_SLOW_MOTION, this.createSlowMotion.bind(this));
  }
  
  createExplosionEffect(data) {
    // В зависимости от типа эффекта создаем нужный визуальный элемент
    switch (data.type) {
      case 'explosion':
        const explosion = new Explosion(data.x, data.y, data.size, data.duration);
        gameState.entities.push(explosion);
        break;
        
      case 'spark':
        const spark = new Spark(data.x, data.y, data.scale, data.duration);
        gameState.entities.push(spark);
        break;
        
      case 'particle':
        const particle = new Particle(
          data.x,
          data.y,
          data.color,
          data.velocityX,
          data.velocityY,
          data.size
        );
        gameState.entities.push(particle);
        break;
    }
  }
  
  createScreenShake(intensity) {
    gameState.effects.screenShake = intensity;
  }
  
  createFlashEffect(data) {
    if (data.type === 'flashWhite') {
      gameState.effects.fadeEffect = data.intensity;
    } else if (data.type === 'flashBlack') {
      gameState.effects.fadeEffect = -data.intensity;
    }
  }
  
  createSlowMotion() {
    gameState.effects.slowMotion = 0.5; // Замедляем игру в 2 раза
    
    // Возвращаем нормальную скорость через секунду
    setTimeout(() => {
      gameState.effects.slowMotion = 1.0;
    }, 1000);
  }
}

// Класс сервиса управления состоянием игры
export class GameStateService {
  constructor() {
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    eventBus.on(GAME_EVENTS.SCORE_UPDATE, this.updateScore.bind(this));
    eventBus.on(GAME_EVENTS.ENEMY_DESTROY, this.handleEnemyDestroy.bind(this));
    eventBus.on(GAME_EVENTS.GAME_OVER, this.handleGameOver.bind(this));
    eventBus.on(GAME_EVENTS.LEVEL_COMPLETE, this.handleLevelComplete.bind(this));
  }
  
  updateScore(score) {
    // Обновление счета не требует дополнительной логики,
    // так как счет хранится в gameState и обновляется напрямую
    
    // Можно добавить дополнительную логику, например, проверку рекордов
    if (score > 0 && score % 10000 === 0) {
      // Каждые 10000 очков даем бонусную жизнь
      gameState.playerLives++;
      eventBus.emit(GAME_EVENTS.LIVES_UPDATE);
    }
  }
  
  handleEnemyDestroy(enemy) {
    // Проверка условий завершения уровня
    if (gameState.enemies.length === 0 && gameState.enemiesLeft === 0) {
      // Используем таймаут для небольшой паузы перед переходом на новый уровень
      setTimeout(() => {
        eventBus.emit(GAME_EVENTS.LEVEL_COMPLETE);
      }, 2000);
    }
  }
  
  handleGameOver() {
    // Дополнительная логика при завершении игры
    // Например, сохранение рекорда или статистики
    console.log("Игра завершена. Финальный счет:", gameState.score);
    
    // При необходимости можно отправить события аналитики
  }
  
  handleLevelComplete() {
    // Логика при завершении уровня
    gameState.stage++;
    gameState.enemiesLeft = 20;
    
    // Дополнительная логика для прогрессии сложности
    // Например, увеличение количества врагов или их характеристик
  }
}

// Класс сервиса взаимодействия с пользовательским интерфейсом
export class UIService {
  constructor() {
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    eventBus.on(GAME_EVENTS.UI_UPDATE, this.updateAllUI.bind(this));
    eventBus.on(GAME_EVENTS.LIVES_UPDATE, this.updateLives.bind(this));
    eventBus.on(GAME_EVENTS.STAGE_UPDATE, this.updateStage.bind(this));
    eventBus.on(GAME_EVENTS.ENEMY_COUNT_UPDATE, this.updateEnemyCount.bind(this));
    eventBus.on(GAME_EVENTS.GAME_OVER, this.showGameOverScreen.bind(this));
    eventBus.on(GAME_EVENTS.GAME_START, this.hideStartScreen.bind(this));
  }
  
  updateAllUI() {
    this.updateLives();
    this.updateStage();
    this.updateEnemyCount();
    
    // Добавляем анимацию к UI при обновлении
    const uiContainer = document.querySelector('.ui-container');
    uiContainer.style.animation = 'none';
    void uiContainer.offsetWidth; // Trick to restart animation
    uiContainer.style.animation = 'ui-update 0.3s';
  }
  
  updateLives() {
    document.getElementById('lives').innerText = `IP: ${gameState.playerLives}`;
  }
  
  updateStage() {
    document.getElementById('stage').innerText = `STAGE ${gameState.stage}`;
  }
  
  updateEnemyCount() {
    document.getElementById('enemies').innerText = `ENEMY: ${gameState.enemiesLeft}`;
  }
  
  showGameOverScreen() {
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
  
  hideStartScreen() {
    document.getElementById('startScreen').style.display = 'none';
  }
}

// Фасад для управления всеми сервисами
export class GameServiceFacade {
  constructor() {
    this.soundService = new SoundService();
    this.effectsService = new EffectsService();
    this.gameStateService = new GameStateService();
    this.uiService = new UIService();
  }
  
  // Инициализация всех сервисов
  init() {
    console.log('Инициализация игровых сервисов');
    return this;
  }
  
  // Методы для управления звуком
  toggleMute() {
    return this.soundService.toggleMute();
  }
}

// Экспорт единственного экземпляра фасада для использования во всем приложении
export const gameServices = new GameServiceFacade().init();