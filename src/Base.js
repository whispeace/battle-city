import { TILE_SIZE, ENTITY_TYPES } from './constants';
import { Entity } from './Entity';
import { gameOver } from './main';

// Класс базы (орёл)
export class Base extends Entity {
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
