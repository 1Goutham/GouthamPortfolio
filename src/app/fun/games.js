/**
 * Five small retro games on a 320x180 logical screen, all starring the
 * avatar. Each game is a class with reset(), update(dt, input, sfx) and
 * draw(ctx), plus `score`, `over` and `started`. The shell owns the loop,
 * the input and the sound.
 */

export const W = 320;
export const H = 180;

/* ----- helpers ------------------------------------------------------- */

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Draws the avatar, optionally flipped and rotated, centred on x,y. */
export function drawAvatar(ctx, sprite, x, y, size, { flip = false, rot = 0 } = {}) {
  if (!sprite) return;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (rot) ctx.rotate(rot);
  if (flip) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  ctx.restore();
}

/** The site's asterisk, drawn in lines. */
function star(ctx, x, y, r, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 4) * i;
    ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.restore();
}

function cross(ctx, x, y, r) {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - r, y - r);
  ctx.lineTo(x + r, y + r);
  ctx.moveTo(x + r, y - r);
  ctx.lineTo(x - r, y + r);
  ctx.stroke();
}

function rect(ctx, x, y, w, h, fill = "#fff") {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function hit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/* ----- 1. Run: jump the blocks ---------------------------------------- */

export class Run {
  static id = "run";
  static title = "Run";
  static how = "Jump the blocks. Hold for a higher jump.";
  static keys = "Space / tap";

  constructor(assets) {
    this.assets = assets;
    this.reset();
  }
  reset() {
    this.started = false;
    this.over = false;
    this.score = 0;
    this.t = 0;
    this.speed = 120;
    this.dist = 0;
    this.p = { x: 44, y: 0, vy: 0, size: 22, ground: true, holdT: 0 };
    this.groundY = 150;
    this.p.y = this.groundY - this.p.size / 2;
    this.obs = [];
    this.nextIn = 1.2;
    this.stars = Array.from({ length: 14 }, () => ({ x: rnd(0, W), y: rnd(10, 110), r: rnd(1.5, 3), s: rnd(0.2, 0.5) }));
  }
  update(dt, input, sfx) {
    if (this.over) return;
    const p = this.p;
    if (!this.started) {
      if (input.action) {
        this.started = true;
      } else return;
    }
    this.t += dt;
    this.speed = Math.min(270, 120 + this.t * 5);
    this.dist += this.speed * dt;
    this.score = Math.floor(this.dist / 12);

    // Jump: impulse on press, lighter gravity while held and rising.
    if (input.action && p.ground) {
      p.vy = -235;
      p.ground = false;
      p.holdT = 0;
      sfx.jump();
    }
    const holding = input.actionHeld && p.vy < 0 && p.holdT < 0.16;
    if (holding) p.holdT += dt;
    p.vy += (holding ? 420 : 760) * dt;
    p.y += p.vy * dt;
    const floor = this.groundY - p.size / 2;
    if (p.y >= floor) {
      p.y = floor;
      p.vy = 0;
      p.ground = true;
    }

    // Obstacles.
    this.nextIn -= dt;
    if (this.nextIn <= 0) {
      const h = rnd(12, 26);
      const w = rnd(9, 15);
      this.obs.push({ x: W + 10, y: this.groundY - h, w, h });
      if (Math.random() < 0.3) this.obs.push({ x: W + 10 + w + 4, y: this.groundY - h * 0.7, w: w * 0.8, h: h * 0.7 });
      this.nextIn = rnd(0.9, 1.7) * (120 / this.speed) + 0.35;
    }
    for (const o of this.obs) o.x -= this.speed * dt;
    this.obs = this.obs.filter((o) => o.x + o.w > -10);
    for (const s of this.stars) {
      s.x -= this.speed * s.s * dt;
      if (s.x < -4) s.x = W + 4;
    }

    const box = { x: p.x - p.size / 2 + 4, y: p.y - p.size / 2 + 4, w: p.size - 8, h: p.size - 6 };
    if (this.obs.some((o) => hit(box, o))) {
      this.over = true;
      sfx.hit();
    }
  }
  draw(ctx) {
    const p = this.p;
    for (const s of this.stars) star(ctx, s.x, s.y, s.r, 0.35);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(0, this.groundY, W, 1);
    for (const o of this.obs) {
      rect(ctx, o.x, o.y, o.w, o.h, "#fff");
      rect(ctx, o.x + 2, o.y + 2, o.w - 4, o.h - 2, "#000");
    }
    const rot = p.ground ? 0 : clamp(p.vy / 600, -0.25, 0.35);
    drawAvatar(ctx, this.assets.sprite, p.x, p.y, p.size, { rot });
  }
}

/* ----- 2. Flap: through the gates ------------------------------------- */

export class Flap {
  static id = "flap";
  static title = "Flap";
  static how = "Flap through the gates. Don't touch anything.";
  static keys = "Space / tap";

  constructor(assets) {
    this.assets = assets;
    this.reset();
  }
  reset() {
    this.started = false;
    this.over = false;
    this.score = 0;
    this.p = { x: 72, y: H / 2, vy: 0, size: 20 };
    this.gates = [];
    this.nextX = W + 40;
    this.speed = 92;
    this.t = 0;
  }
  update(dt, input, sfx) {
    if (this.over) return;
    const p = this.p;
    if (!this.started) {
      p.y = H / 2 + Math.sin(performance.now() / 300) * 4;
      if (input.action) {
        this.started = true;
        p.vy = -165;
        sfx.jump();
      } else return;
    }
    this.t += dt;
    if (input.action) {
      p.vy = -165;
      sfx.jump();
    }
    p.vy = Math.min(p.vy + 540 * dt, 320);
    p.y += p.vy * dt;

    // Gates every 118px, gap narrows slowly.
    this.nextX -= this.speed * dt;
    if (this.nextX <= W) {
      const gap = Math.max(46, 62 - this.t * 0.4);
      const cy = rnd(36 + gap / 2, H - 36 - gap / 2);
      this.gates.push({ x: W + 10, cy, gap, w: 14, passed: false });
      this.nextX += 118;
    }
    for (const g of this.gates) {
      g.x -= this.speed * dt;
      if (!g.passed && g.x + g.w < p.x) {
        g.passed = true;
        this.score++;
        sfx.score();
      }
    }
    this.gates = this.gates.filter((g) => g.x + g.w > -10);

    const box = { x: p.x - 7, y: p.y - 7, w: 14, h: 14 };
    const dead =
      p.y > H - 8 ||
      p.y < 4 ||
      this.gates.some((g) => hit(box, { x: g.x, y: 0, w: g.w, h: g.cy - g.gap / 2 }) || hit(box, { x: g.x, y: g.cy + g.gap / 2, w: g.w, h: H }));
    if (dead) {
      this.over = true;
      sfx.hit();
    }
  }
  draw(ctx) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(0, H - 1, W, 1);
    ctx.fillRect(0, 0, W, 1);
    for (const g of this.gates) {
      const top = g.cy - g.gap / 2;
      const bot = g.cy + g.gap / 2;
      rect(ctx, g.x, 0, g.w, top);
      rect(ctx, g.x, bot, g.w, H - bot);
      rect(ctx, g.x + 2, 2, g.w - 4, top - 4, "#000");
      rect(ctx, g.x + 2, bot + 2, g.w - 4, H - bot - 4, "#000");
    }
    const rot = clamp(this.p.vy / 500, -0.4, 0.6);
    drawAvatar(ctx, this.assets.sprite, this.p.x, this.p.y, this.p.size, { rot });
  }
}

/* ----- 3. Snake: eat the asterisks ------------------------------------ */

export class Snake {
  static id = "snake";
  static title = "Snake";
  static how = "Eat the asterisks. Don't eat yourself.";
  static keys = "Arrows / tap a side";

  constructor(assets) {
    this.assets = assets;
    this.cell = 10;
    this.cols = W / this.cell;
    this.rows = H / this.cell;
    this.reset();
  }
  reset() {
    this.started = false;
    this.over = false;
    this.score = 0;
    this.dir = { x: 1, y: 0 };
    this.queue = [];
    this.body = [{ x: 10, y: 9 }, { x: 9, y: 9 }, { x: 8, y: 9 }];
    this.acc = 0;
    this.step = 0.13;
    this.food = this.spawn();
  }
  spawn() {
    let f;
    do f = { x: Math.floor(rnd(1, this.cols - 1)), y: Math.floor(rnd(1, this.rows - 1)) };
    while (this.body.some((b) => b.x === f.x && b.y === f.y));
    return f;
  }
  turn(d) {
    const last = this.queue[this.queue.length - 1] || this.dir;
    if (d.x === -last.x && d.y === -last.y) return; // no reversing
    if (d.x === last.x && d.y === last.y) return;
    if (this.queue.length < 2) this.queue.push(d);
  }
  update(dt, input, sfx) {
    if (this.over) return;
    if (input.left) this.turn({ x: -1, y: 0 });
    else if (input.right) this.turn({ x: 1, y: 0 });
    else if (input.up) this.turn({ x: 0, y: -1 });
    else if (input.down) this.turn({ x: 0, y: 1 });
    if (input.tap) {
      // Tap relative to the head: the dominant axis picks the direction.
      const h = this.body[0];
      const dx = input.tap.x - (h.x + 0.5) * this.cell;
      const dy = input.tap.y - (h.y + 0.5) * this.cell;
      if (Math.abs(dx) > Math.abs(dy)) this.turn({ x: Math.sign(dx), y: 0 });
      else this.turn({ x: 0, y: Math.sign(dy) });
    }
    if (!this.started) {
      if (input.action || this.queue.length) this.started = true;
      else return;
    }
    this.acc += dt;
    if (this.acc < this.step) return;
    this.acc -= this.step;
    if (this.queue.length) this.dir = this.queue.shift();
    const h = this.body[0];
    const n = { x: h.x + this.dir.x, y: h.y + this.dir.y };
    if (n.x < 0 || n.y < 0 || n.x >= this.cols || n.y >= this.rows || this.body.some((b) => b.x === n.x && b.y === n.y)) {
      this.over = true;
      sfx.hit();
      return;
    }
    this.body.unshift(n);
    if (n.x === this.food.x && n.y === this.food.y) {
      this.score++;
      this.step = Math.max(0.07, this.step - 0.003);
      this.food = this.spawn();
      sfx.score();
    } else this.body.pop();
  }
  draw(ctx) {
    const c = this.cell;
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    star(ctx, (this.food.x + 0.5) * c, (this.food.y + 0.5) * c, 3.5, 0.9);
    for (let i = this.body.length - 1; i >= 1; i--) {
      const b = this.body[i];
      const a = 0.9 - (i / this.body.length) * 0.5;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(b.x * c + 1, b.y * c + 1, c - 2, c - 2);
    }
    const h = this.body[0];
    drawAvatar(ctx, this.assets.sprite, (h.x + 0.5) * c, (h.y + 0.5) * c, 14, { flip: this.dir.x < 0 });
  }
}

/* ----- 4. Pong: you against the house --------------------------------- */

export class Pong {
  static id = "pong";
  static title = "Pong";
  static how = "First to five. The ball is you.";
  static keys = "Up / down, or drag";

  constructor(assets) {
    this.assets = assets;
    this.reset();
  }
  reset() {
    this.started = false;
    this.over = false;
    this.score = 0;
    this.cpu = 0;
    this.pad = { x: 12, y: H / 2, w: 4, h: 34 };
    this.ai = { x: W - 16, y: H / 2, w: 4, h: 34 };
    this.serve(1);
    this.spin = 0;
  }
  serve(dir) {
    this.ball = { x: W / 2, y: H / 2, vx: 130 * dir, vy: rnd(-70, 70), size: 12 };
  }
  update(dt, input, sfx) {
    if (this.over) return;
    const pad = this.pad;
    const speed = 170;
    if (input.upHeld) pad.y -= speed * dt;
    if (input.downHeld) pad.y += speed * dt;
    if (input.pointer.down) pad.y += (input.pointer.y - pad.y) * Math.min(1, dt * 14);
    pad.y = clamp(pad.y, pad.h / 2, H - pad.h / 2);
    if (!this.started) {
      if (input.action || input.pointer.down) this.started = true;
      else return;
    }
    const b = this.ball;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    this.spin += (b.vx > 0 ? 1 : -1) * dt * 4;
    if (b.y < 6 || b.y > H - 6) {
      b.vy *= -1;
      b.y = clamp(b.y, 6, H - 6);
      sfx.tick();
    }
    // The house tracks the ball, a little late and a little off.
    const target = b.vx > 0 ? b.y + Math.sin(performance.now() / 400) * 10 : H / 2;
    this.ai.y += clamp(target - this.ai.y, -1, 1) * Math.min(Math.abs(target - this.ai.y), 118 * dt);
    this.ai.y = clamp(this.ai.y, this.ai.h / 2, H - this.ai.h / 2);

    const bounce = (p, dir) => {
      const rel = (b.y - p.y) / (p.h / 2);
      b.vx = Math.abs(b.vx) * 1.05 * dir;
      b.vy = rel * 190;
      b.x = p.x + (dir > 0 ? p.w + 7 : -7);
      sfx.tick();
    };
    if (b.vx < 0 && b.x - 6 <= pad.x + pad.w && b.x - 6 >= pad.x - 6 && Math.abs(b.y - pad.y) <= pad.h / 2 + 5) bounce(pad, 1);
    if (b.vx > 0 && b.x + 6 >= this.ai.x && b.x + 6 <= this.ai.x + this.ai.w + 6 && Math.abs(b.y - this.ai.y) <= this.ai.h / 2 + 5) bounce(this.ai, -1);

    if (b.x < -10) {
      this.cpu++;
      sfx.hit();
      if (this.cpu >= 5) this.over = true;
      else this.serve(1);
    } else if (b.x > W + 10) {
      this.score++;
      sfx.score();
      if (this.score >= 5) this.over = true;
      else this.serve(-1);
    }
  }
  draw(ctx) {
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    for (let y = 4; y < H; y += 10) ctx.fillRect(W / 2, y, 1, 5);
    ctx.font = "16px 'Anonymous Pro', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(String(this.score), W / 2 - 24, 22);
    ctx.fillText(String(this.cpu), W / 2 + 24, 22);
    rect(ctx, this.pad.x, this.pad.y - this.pad.h / 2, this.pad.w, this.pad.h);
    rect(ctx, this.ai.x, this.ai.y - this.ai.h / 2, this.ai.w, this.ai.h);
    drawAvatar(ctx, this.assets.sprite, this.ball.x, this.ball.y, this.ball.size, { rot: this.spin });
  }
}

/* ----- 5. Catch: ideas fall, bugs too ---------------------------------- */

export class Catch {
  static id = "catch";
  static title = "Catch";
  static how = "Catch the asterisks. Dodge the crosses. Three lives.";
  static keys = "Left / right, or drag";

  constructor(assets) {
    this.assets = assets;
    this.reset();
  }
  reset() {
    this.started = false;
    this.over = false;
    this.score = 0;
    this.lives = 3;
    this.p = { x: W / 2, y: H - 16, size: 22 };
    this.items = [];
    this.t = 0;
    this.nextIn = 0.6;
    this.flash = 0;
  }
  update(dt, input, sfx) {
    if (this.over) return;
    const p = this.p;
    const speed = 190;
    if (input.leftHeld) p.x -= speed * dt;
    if (input.rightHeld) p.x += speed * dt;
    if (input.pointer.down) p.x += (input.pointer.x - p.x) * Math.min(1, dt * 14);
    p.x = clamp(p.x, 12, W - 12);
    if (!this.started) {
      if (input.action || input.pointer.down || input.leftHeld || input.rightHeld) this.started = true;
      else return;
    }
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.nextIn -= dt;
    if (this.nextIn <= 0) {
      const bad = Math.random() < Math.min(0.45, 0.2 + this.t * 0.01);
      this.items.push({ x: rnd(10, W - 10), y: -8, vy: rnd(55, 85) + this.t * 2.5, bad, r: bad ? 4 : 3.5, spin: rnd(0, 6) });
      this.nextIn = Math.max(0.28, 0.75 - this.t * 0.012);
    }
    for (const it of this.items) {
      it.y += it.vy * dt;
      it.spin += dt * 3;
      const dx = Math.abs(it.x - p.x);
      const dy = Math.abs(it.y - p.y);
      if (!it.done && dx < 12 && dy < 11) {
        it.done = true;
        if (it.bad) {
          this.lives--;
          this.flash = 0.25;
          sfx.hit();
          if (this.lives <= 0) this.over = true;
        } else {
          this.score++;
          sfx.score();
        }
      }
    }
    this.items = this.items.filter((it) => !it.done && it.y < H + 10);
  }
  draw(ctx) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(0, H - 1, W, 1);
    for (const it of this.items) {
      if (it.bad) cross(ctx, it.x, it.y, it.r);
      else {
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(it.spin);
        star(ctx, 0, 0, it.r, 0.95);
        ctx.restore();
      }
    }
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < this.lives ? "#fff" : "rgba(255,255,255,0.2)";
      ctx.fillRect(8 + i * 8, 8, 5, 5);
    }
    const rot = this.flash > 0 ? Math.sin(this.flash * 60) * 0.2 : 0;
    drawAvatar(ctx, this.assets.sprite, this.p.x, this.p.y, this.p.size, { rot });
  }
}

export const GAMES = [Run, Flap, Snake, Pong, Catch];
