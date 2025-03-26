import { TILE_SIZE, ENTITY_TYPES } from './constants';
import { Entity } from './Entity';

// Класс растительности
export class Grass extends Entity {
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
