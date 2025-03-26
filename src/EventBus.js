// Класс EventBus реализует паттерн Observer/PubSub для обмена сообщениями между компонентами
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  // Подписка на событие
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event).push(callback);
    
    // Возвращаем функцию для отписки
    return () => this.off(event, callback);
  }

  // Отписка от события
  off(event, callback) {
    if (!this.listeners.has(event)) {
      return;
    }
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
    
    // Если подписчиков не осталось, удаляем событие
    if (callbacks.length === 0) {
      this.listeners.delete(event);
    }
  }

  // Генерация события с данными
  emit(event, data) {
    if (!this.listeners.has(event)) {
      return;
    }
    
    const callbacks = this.listeners.get(event);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Ошибка при обработке события ${event}:`, error);
      }
    });
  }

  // Очистка всех слушателей
  clear() {
    this.listeners.clear();
  }
}

// Создаем единственный экземпляр EventBus для использования во всем приложении
export const eventBus = new EventBus();

// Константы для типов событий
export const GAME_EVENTS = {
  // События обновления UI
  UI_UPDATE: 'ui:update',
  SCORE_UPDATE: 'ui:score',
  LIVES_UPDATE: 'ui:lives',
  ENEMY_COUNT_UPDATE: 'ui:enemies',
  STAGE_UPDATE: 'ui:stage',
  
  // События игрового процесса
  GAME_START: 'game:start',
  GAME_OVER: 'game:over',
  LEVEL_COMPLETE: 'game:level:complete',
  PLAYER_SPAWN: 'entity:player:spawn',
  PLAYER_DESTROY: 'entity:player:destroy',
  ENEMY_SPAWN: 'entity:enemy:spawn',
  ENEMY_DESTROY: 'entity:enemy:destroy',
  BULLET_FIRE: 'entity:bullet:fire',
  BULLET_HIT: 'entity:bullet:hit',
  POWERUP_SPAWN: 'entity:powerup:spawn',
  POWERUP_COLLECT: 'entity:powerup:collect',
  BASE_DESTROY: 'entity:base:destroy',
  
  // События визуальных эффектов
  EFFECT_SCREEN_SHAKE: 'effect:screenShake',
  EFFECT_FLASH: 'effect:flash',
  EFFECT_SLOW_MOTION: 'effect:slowMotion',
  EFFECT_EXPLOSION: 'effect:explosion',
  
  // Новые события для адаптивного интерфейса
  RESIZE: 'ui:resize',
  DEVICE_TYPE_CHANGE: 'ui:deviceTypeChange',
  ORIENTATION_CHANGE: 'ui:orientationChange',
  TOUCH_START: 'input:touchStart',
  TOUCH_MOVE: 'input:touchMove',
  TOUCH_END: 'input:touchEnd'
};
