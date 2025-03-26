import { TILE_SIZE, ENTITY_TYPES } from './constants';
import { Entity } from './Entity';

// Класс стены (кирпичной или стальной)
export class Wall extends Entity {
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
