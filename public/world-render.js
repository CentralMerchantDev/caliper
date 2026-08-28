// CALIPER world renderer — an architectural plan view, not a game sprite sheet.
// Self-contained canvas module: no dependencies, no build step, testable by
// opening world-render.test.html directly. Consumes plain world-state JSON
// (the same shape src/simBaseline.ts's tick() returns) and station metadata
// derived from the world structure summary (see src/worldStructure.ts).
//
// Design language carried from DATUM/the portfolio: warm paper ground, fine
// confident linework, soft material fills, long soft shadows that rotate and
// lengthen with a simulated sun over the 24-hour clock. Characters are
// simple proportioned geometric figures, not sprites.

const TOKENS = {
  paper: "#FAF6EE",
  card: "#FEFCF6",
  ink: "#2A201A",
  ink2: "#5C4B39",
  muted: "#6E5E49",
  line: "rgba(42,32,26,.16)",
  lineStrong: "rgba(42,32,26,.38)",
  accent: "#B0560C",
  accentSoft: "#F6E4CF",
  sim2: "#3D6B63", // second sim's tone -- a muted teal that sits quietly next to the warm accent
};

// Fixed station layout for the single sparse room (BUILD-WORLD.md: "one room,
// few object types" on purpose). Coordinates are in a 0..1 room-relative
// space so the canvas can be resized without touching this table.
const STATIONS = {
  bed: { x: 0.15, y: 0.24, action: "sleep", label: "Bed" },
  fridge: { x: 0.85, y: 0.24, action: "eat", label: "Fridge" },
  shower: { x: 0.85, y: 0.76, action: "shower", label: "Shower" },
  desk: { x: 0.15, y: 0.76, action: "work", label: "Desk" },
  rug: { x: 0.5, y: 0.18, action: "play", label: "Rug" },
  table: { x: 0.5, y: 0.82, action: "call", label: "Table" },
  center: { x: 0.5, y: 0.5, action: "idle", label: null },
};

function stationFor(action) {
  for (const key in STATIONS) if (STATIONS[key].action === action) return STATIONS[key];
  return STATIONS.center;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Sun angle across a 24-hour clock: rises ~6, sets ~20. Returns
// { altitude: 0..1 (0 = horizon/night, 1 = overhead noon), azimuth: radians }
// so shadows lengthen and rotate through the day rather than sitting static.
function sunFor(hour) {
  const dayFrac = ((hour - 6 + 24) % 24) / 14; // 0 at 6am, 1 at 8pm
  const isDay = hour >= 6 && hour < 20;
  const altitude = isDay ? Math.sin(Math.min(1, Math.max(0, dayFrac)) * Math.PI) : 0.04;
  const azimuth = (((hour - 6 + 24) % 24) / 24) * Math.PI * 2;
  return { altitude, azimuth, isDay };
}

// Warm-to-cool ambient tint over the day, staying inside the paper palette
// family rather than jumping to a literal dark mode -- night reads as a
// deeper, cooler paper, not black.
function ambientOverlay(hour) {
  const { isDay } = sunFor(hour);
  if (hour >= 6 && hour < 9) return "rgba(230,150,90,0.06)"; // dawn
  if (hour >= 17 && hour < 20) return "rgba(176,86,12,0.07)"; // dusk ember
  if (!isDay) return "rgba(30,32,48,0.16)"; // night -- cool, not black
  return "rgba(0,0,0,0)";
}

export class WorldRenderer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas, { reducedMotion = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.reducedMotion = reducedMotion;
    this.prevWorld = null;
    this.nextWorld = null;
    this.simStationKey = new Map(); // simId -> station key at last discrete tick, for interpolation
    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(canvas);
  }

  _resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.dpr = dpr;
  }

  destroy() {
    this._ro.disconnect();
  }

  /** Feed a new discrete tick result. The renderer interpolates FROM the
   * previous world TO this one over the caller's tick interval -- logic
   * stays discrete, only the drawing smooths. */
  pushTick(world) {
    this.prevWorld = this.nextWorld ?? world;
    this.nextWorld = world;
  }

  _stationForSim(sim) {
    const action = sim.lastAction || "idle";
    return stationFor(action);
  }

  /** @param {number} t 0..1 progress between prevWorld and nextWorld */
  draw(t) {
    const { ctx, canvas } = this;
    const w = this.nextWorld;
    if (!w) return;
    if (this.reducedMotion) t = 1; // prefers-reduced-motion: snap to the target tick, never glide
    const prev = this.prevWorld || w;
    const dpr = this.dpr;
    const W = canvas.width, H = canvas.height;
    const pad = 28 * dpr;
    const hudH = 76 * dpr; // dedicated bottom strip -- HUD never draws over the floor plan
    const roomW = W - pad * 2, roomH = H - pad * 2 - hudH;
    const hour = w.tick % 24;
    const sun = sunFor(hour);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = TOKENS.paper;
    ctx.fillRect(0, 0, W, H);

    // -- room shell: fine confident linework, rounded corners --
    this._roundRect(pad, pad, roomW, roomH, 18 * dpr);
    ctx.fillStyle = TOKENS.card;
    ctx.fill();
    ctx.lineWidth = Math.max(1, 1.5 * dpr);
    ctx.strokeStyle = TOKENS.lineStrong;
    ctx.stroke();

    // subtle floor plan hatching along the walls, architectural-plan cue
    ctx.save();
    ctx.strokeStyle = TOKENS.line;
    ctx.lineWidth = dpr;
    for (let i = 0; i < roomW; i += 10 * dpr) {
      ctx.beginPath();
      ctx.moveTo(pad + i, pad);
      ctx.lineTo(pad + i - 6 * dpr, pad + 6 * dpr);
      ctx.stroke();
    }
    ctx.restore();

    // -- stations --
    for (const key in STATIONS) {
      const s = STATIONS[key];
      if (s.label === null) continue;
      this._drawStation(pad, roomW, roomH, s, sun, dpr);
    }

    // -- sims, interpolated between stations --
    (w.sims || []).forEach((sim, i) => {
      const prevSim = (prev.sims || [])[i] || sim;
      const from = this._stationForSim(prevSim);
      const to = this._stationForSim(sim);
      const px = pad + lerp(from.x, to.x, t) * roomW;
      const py = pad + lerp(from.y, to.y, t) * roomH;
      this._drawSim(px, py, sim, i, sun, dpr);
    });

    // -- ambient time-of-day wash, room only -- the HUD strip stays legible paper --
    ctx.save();
    this._roundRect(pad, pad, roomW, roomH, 18 * dpr);
    ctx.clip();
    ctx.fillStyle = ambientOverlay(hour);
    ctx.fillRect(pad, pad, roomW, roomH);
    ctx.restore();

    this._drawHud(w, hour, dpr, pad, roomH, hudH, W);
  }

  _roundRect(x, y, w, h, r) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  _shadowOffset(sun, dpr) {
    // Long soft shadows near dawn/dusk, short near noon; direction rotates
    // through the day. Length is generous (architectural render, not a
    // literal sundial) so it's legible at small canvas sizes.
    const len = (1 - sun.altitude) * 26 * dpr + 4 * dpr;
    return { dx: Math.cos(sun.azimuth) * len, dy: Math.sin(sun.azimuth) * len * 0.4 + 6 * dpr };
  }

  _drawStation(pad, roomW, roomH, s, sun, dpr) {
    const { ctx } = this;
    const cx = pad + s.x * roomW, cy = pad + s.y * roomH;
    const sh = this._shadowOffset(sun, dpr);
    const size = 30 * dpr;

    ctx.save();
    // soft shadow
    ctx.fillStyle = "rgba(42,32,26,0.10)";
    ctx.beginPath();
    ctx.ellipse(cx + sh.dx, cy + sh.dy + size * 0.55, size * 0.6, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = TOKENS.lineStrong;
    ctx.fillStyle = TOKENS.accentSoft;
    ctx.lineWidth = Math.max(1, 1.3 * dpr);

    switch (s.action) {
      case "sleep": // bed
        this._roundRect(cx - size, cy - size * 0.6, size * 2, size * 1.2, 6 * dpr);
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - size + 8 * dpr, cy - size * 0.6); ctx.lineTo(cx - size + 8 * dpr, cy + size * 0.6); ctx.stroke();
        break;
      case "eat": // fridge
        this._roundRect(cx - size * 0.5, cy - size, size, size * 2, 5 * dpr);
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - size * 0.5, cy - size * 0.2); ctx.lineTo(cx + size * 0.5, cy - size * 0.2); ctx.stroke();
        break;
      case "shower": // shower stall
        this._roundRect(cx - size * 0.7, cy - size * 0.7, size * 1.4, size * 1.4, 4 * dpr);
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy - size * 0.55, size * 0.35, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
        break;
      case "work": // desk
        this._roundRect(cx - size, cy - size * 0.15, size * 2, size * 0.5, 3 * dpr);
        ctx.fill(); ctx.stroke();
        this._roundRect(cx - size * 0.4, cy - size * 0.7, size * 0.8, size * 0.55, 3 * dpr);
        ctx.fillStyle = TOKENS.card; ctx.fill(); ctx.stroke();
        break;
      case "play": // rug
        ctx.beginPath(); ctx.ellipse(cx, cy, size * 1.1, size * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(176,86,12,0.10)"; ctx.fill(); ctx.strokeStyle = TOKENS.line; ctx.stroke();
        break;
      case "call": // table + chair
        ctx.beginPath(); ctx.arc(cx, cy, size * 0.55, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        break;
    }
    ctx.restore();
  }

  _drawSim(x, y, sim, index, sun, dpr) {
    const { ctx } = this;
    const color = index === 0 ? TOKENS.accent : TOKENS.sim2;
    const sh = this._shadowOffset(sun, dpr);
    const r = 12 * dpr;

    ctx.save();
    // soft ground shadow
    ctx.fillStyle = "rgba(42,32,26,0.14)";
    ctx.beginPath();
    ctx.ellipse(x + sh.dx * 0.6, y + sh.dy * 0.6 + r * 1.6, r * 0.9, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // body: simple proportioned geometric figure -- rounded torso + head
    ctx.fillStyle = color;
    this._roundRect(x - r * 0.55, y - r * 0.1, r * 1.1, r * 1.5, r * 0.5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - r * 0.55, r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // critical-need indicator: a small ring if any need is below threshold
    const criticalNeed = sim.needs && Object.entries(sim.needs).find(([, v]) => v < 30);
    if (criticalNeed) {
      ctx.save();
      ctx.strokeStyle = TOKENS.accent;
      ctx.lineWidth = 1.4 * dpr;
      ctx.setLineDash([2 * dpr, 2 * dpr]);
      ctx.beginPath();
      ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Dedicated bottom strip, outside the room's floor plan -- need bars and
   * the clock/money line never draw over the world itself. */
  _drawHud(world, hour, dpr, pad, roomH, hudH, W) {
    const { ctx, canvas } = this;
    const stripY = pad + roomH + 12 * dpr;
    const stripPad = pad;
    ctx.save();
    ctx.font = `${11 * dpr}px 'IBM Plex Mono', monospace`;
    ctx.textBaseline = "top";

    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour < 12 ? "AM" : "PM";
    ctx.fillStyle = TOKENS.ink2;
    ctx.textAlign = "right";
    ctx.fillText(`Day ${Math.floor(world.tick / 24) + 1} · ${h12}:00 ${ampm} · $${world.money}`, W - stripPad, stripY);
    ctx.textAlign = "left";

    const sims = world.sims || [];
    const colW = (W - stripPad * 2) / Math.max(1, sims.length);
    sims.forEach((sim, i) => {
      const cx0 = stripPad + i * colW;
      const color = i === 0 ? TOKENS.accent : TOKENS.sim2;
      ctx.fillStyle = color;
      ctx.font = `700 ${11.5 * dpr}px 'IBM Plex Mono', monospace`;
      ctx.fillText(sim.id + (sim.lastAction ? ` · ${sim.lastAction}` : ""), cx0, stripY);
      ctx.font = `${9.5 * dpr}px 'IBM Plex Mono', monospace`;

      let bx = cx0, by = stripY + 18 * dpr;
      const barW = Math.min(52 * dpr, (colW - 16 * dpr) / 5 - 4 * dpr);
      Object.entries(sim.needs || {}).forEach(([need, val]) => {
        ctx.fillStyle = TOKENS.line;
        ctx.fillRect(bx, by, barW, 5 * dpr);
        ctx.fillStyle = val < 30 ? TOKENS.accent : TOKENS.ink2;
        ctx.fillRect(bx, by, barW * (val / 100), 5 * dpr);
        ctx.fillStyle = TOKENS.muted;
        ctx.fillText(need[0].toUpperCase(), bx, by + 7 * dpr);
        bx += barW + 6 * dpr;
      });
    });
    ctx.restore();
  }
}

export { STATIONS, sunFor };
