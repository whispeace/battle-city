import { CANVAS_SIZE, TILE_SIZE } from '../constants';
import { eventBus, GAME_EVENTS } from '../EventBus';

/**
 * Сервис масштабирования и адаптации интерфейса
 * Отвечает за корректное масштабирование игрового холста и UI
 */
export class ResizeService {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.baseSize = CANVAS_SIZE;
    this.scale = 1;
    this.isMobile = false;
    this.touchControls = {
      active: false,
      visible: false
    };
    
    // Привязываем методы для правильного контекста this
    this.resize = this.resize.bind(this);
    this.init = this.init.bind(this);
    this.setupTouchControls = this.setupTouchControls.bind(this);
    this.handleTouchInput = this.handleTouchInput.bind(this);
    
    // Создаем ResizeObserver для отслеживания изменений размера
    this.observer = new ResizeObserver(entries => {
      this.resize();
    });
  }
  
  /**
   * Инициализация сервиса
   * @param {HTMLCanvasElement} canvas - игровой холст
   */
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Настраиваем начальный размер
    this.resize();
    
    // Регистрируем обработчики событий
    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', this.resize);
    
    // Проверка типа устройства
    this.checkDeviceType();
    
    // Отслеживаем изменения размера контейнера
    const container = document.querySelector('.game-container');
    if (container) {
      this.observer.observe(container);
    }
    
    // Настраиваем сенсорное управление при необходимости
    if (this.isMobile) {
      this.setupTouchControls();
    }
    
    console.log("ResizeService инициализирован");
  }
  
  /**
   * Определяет тип устройства и настраивает соответствующие параметры
   */
  checkDeviceType() {
    // Проверяем наличие тач-событий и размер экрана
    this.isMobile = (('ontouchstart' in window) || 
                    (navigator.maxTouchPoints > 0) || 
                    (window.innerWidth <= 800));
    
    // Настраиваем видимость сенсорных элементов управления
    const touchControls = document.getElementById('touchControls');
    if (touchControls) {
      this.touchControls.visible = this.isMobile;
      touchControls.style.display = this.isMobile ? 'flex' : 'none';
    }
    
    // Генерируем событие изменения типа устройства
    eventBus.emit(GAME_EVENTS.DEVICE_TYPE_CHANGE, { isMobile: this.isMobile });
  }
  
  /**
   * Обработчик изменения размера окна
   * Масштабирует холст и настраивает параметры рендеринга
   */
  resize() {
    if (!this.canvas) return;
    
    const container = document.querySelector('.game-container');
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Определяем оптимальный размер холста, сохраняя пропорции
    const landscape = containerWidth > containerHeight;
    const maxSize = Math.min(containerWidth, containerHeight) * 0.9;
    
    // Устанавливаем размеры холста
    this.canvas.width = this.baseSize; 
    this.canvas.height = this.baseSize;
    
    // Рассчитываем масштаб
    this.scale = maxSize / this.baseSize;
    
    // Устанавливаем размеры через CSS для правильного масштабирования пикселей
    this.canvas.style.width = `${this.baseSize * this.scale}px`;
    this.canvas.style.height = `${this.baseSize * this.scale}px`;
    
    // Настраиваем контекст для pixel-perfect рендеринга
    this.ctx.imageSmoothingEnabled = false;
    
    // Перепроверяем тип устройства
    this.checkDeviceType();
    
    // Генерируем событие изменения размера
    eventBus.emit(GAME_EVENTS.RESIZE, { 
      scale: this.scale,
      width: this.canvas.width,
      height: this.canvas.height,
      isMobile: this.isMobile
    });
    
    console.log(`Изменение размера: ${this.canvas.width}x${this.canvas.height}, масштаб: ${this.scale}`);
  }
  
  /**
   * Настраивает виртуальные кнопки для сенсорного управления
   */
  setupTouchControls() {
    const touchButtons = {
      up: document.getElementById('btnUp'),
      right: document.getElementById('btnRight'),
      down: document.getElementById('btnDown'),
      left: document.getElementById('btnLeft'),
      fire: document.getElementById('btnFire')
    };
    
    // Обработчики нажатий для виртуальных кнопок
    if (touchButtons.up) {
      touchButtons.up.addEventListener('touchstart', () => this.handleTouchInput('ArrowUp', true));
      touchButtons.up.addEventListener('touchend', () => this.handleTouchInput('ArrowUp', false));
    }
    
    if (touchButtons.right) {
      touchButtons.right.addEventListener('touchstart', () => this.handleTouchInput('ArrowRight', true));
      touchButtons.right.addEventListener('touchend', () => this.handleTouchInput('ArrowRight', false));
    }
    
    if (touchButtons.down) {
      touchButtons.down.addEventListener('touchstart', () => this.handleTouchInput('ArrowDown', true));
      touchButtons.down.addEventListener('touchend', () => this.handleTouchInput('ArrowDown', false));
    }
    
    if (touchButtons.left) {
      touchButtons.left.addEventListener('touchstart', () => this.handleTouchInput('ArrowLeft', true));
      touchButtons.left.addEventListener('touchend', () => this.handleTouchInput('ArrowLeft', false));
    }
    
    if (touchButtons.fire) {
      touchButtons.fire.addEventListener('touchstart', () => this.handleTouchInput(' ', true));
      touchButtons.fire.addEventListener('touchend', () => this.handleTouchInput(' ', false));
    }
    
    // Предотвращаем прокрутку страницы при использовании сенсорного управления
    document.querySelectorAll('.btn-direction, .btn-fire').forEach(button => {
      button.addEventListener('touchstart', (e) => e.preventDefault());
      button.addEventListener('touchmove', (e) => e.preventDefault());
      button.addEventListener('touchend', (e) => e.preventDefault());
    });
  }
  
  /**
   * Обработчик нажатий виртуальных кнопок
   * @param {string} key - код клавиши для эмуляции
   * @param {boolean} pressed - состояние нажатия (true - нажата, false - отпущена)
   */
  handleTouchInput(key, pressed) {
    // Эмулируем нажатие клавиш для игровой логики
    if (pressed) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    } else {
      window.dispatchEvent(new KeyboardEvent('keyup', { key }));
    }
  }
  
  /**
   * Преобразует координаты из клиентской в игровую систему координат
   * @param {number} clientX - X-координата в пикселях экрана
   * @param {number} clientY - Y-координата в пикселях экрана
   * @returns {Object} - объект с игровыми координатами
   */
  clientToGameCoords(clientX, clientY) {
    if (!this.canvas) return { x: 0, y: 0 };
    
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / this.scale;
    const y = (clientY - rect.top) / this.scale;
    
    return { x, y };
  }
  
  /**
   * Освобождает ресурсы при уничтожении сервиса
   */
  destroy() {
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('orientationchange', this.resize);
    this.observer.disconnect();
  }
}

// Создаем и экспортируем единственный экземпляр сервиса
export const resizeService = new ResizeService();