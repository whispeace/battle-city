// Класс сущности - базовый для всех игровых объектов
export class Entity {
  constructor(x, y, width, height, type) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.solid = true;
    this.destructible = false;
  }

  update(dt) { }

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
