/**
 * Fire particle effect - orange and blue variants.
 * Used for both fire-at-palm and fire-trail drawing.
 */

class FireParticle {
  constructor(x, y, color, isTrail = false) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = 0;
    this.life = 1;
    this.decay = isTrail ? 0.02 : 0.015;
    this.size = 2 + Math.random() * 4;
    this.color = color;
    this.isTrail = isTrail;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy -= 0.02;
    this.vx *= 0.98;
    this.life -= this.decay;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const alpha = this.life;
    const match = this.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const r = match ? match[1] : 255;
    const g = match ? match[2] : 140;
    const b = match ? match[3] : 0;
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

const ORANGE_COLORS = [
  'rgba(255, 140, 0, 0.9)',
  'rgba(255, 100, 0, 0.9)',
  'rgba(255, 69, 0, 0.9)',
  'rgba(255, 165, 0, 0.9)',
  'rgba(255, 200, 100, 0.8)'
];

const BLUE_COLORS = [
  'rgba(30, 144, 255, 0.9)',
  'rgba(0, 191, 255, 0.9)',
  'rgba(100, 149, 237, 0.9)',
  'rgba(135, 206, 250, 0.9)',
  'rgba(173, 216, 230, 0.8)'
];

function randomColor(palette) {
  return palette[Math.floor(Math.random() * palette.length)];
}

class FireEffect {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.maxParticles = 500;
  }

  emit(x, y, colorType) {
    const palette = colorType === 'orange' ? ORANGE_COLORS : BLUE_COLORS;
    const color = randomColor(palette);
    this.particles.push(new FireParticle(x, y, color, false));
    if (this.particles.length > this.maxParticles) {
      this.particles = this.particles.slice(-this.maxParticles);
    }
  }

  emitTrail(x, y, colorType) {
    const palette = colorType === 'orange' ? ORANGE_COLORS : BLUE_COLORS;
    const color = randomColor(palette);
    this.particles.push(new FireParticle(x, y, color, true));
    if (this.particles.length > this.maxParticles) {
      this.particles = this.particles.slice(-this.maxParticles);
    }
  }

  update() {
    this.particles = this.particles.filter(p => {
      p.update();
      return p.life > 0;
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach(p => p.draw(this.ctx));
  }

  clear() {
    this.particles = [];
  }
}
