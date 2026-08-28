// CALIPER world renderer — an architectural plan view, not a game sprite sheet.
// Self-contained canvas module: no dependencies, no build step. Consumes plain
// world-state JSON (the same shape src/simBaseline.ts's tick() returns) and
// station metadata derived from the world structure summary (see
// src/worldStructure.ts).
//
// FINAL.md item 7: draws the real neighbourhood (world.buildings,
// world.outdoorObjects, world.surfaces) -- every building on its own plot,
// paths between them, outdoor objects as plan symbols -- not the single
// fixed room this file drew before CITY.md's neighbourhood upgrade. Grid
// math (BUILDING_W/D, GRID_UNIT_X/Z, plot -> position) intentionally mirrors
// world-render-3d.js's so the two views agree on layout: this is a second
// view of the one world, not a second world.
//
// Design language carried from DATUM/the portfolio: warm paper ground, fine
// confident linework, soft material fills, long soft shadows that rotate and
// lengthen with a simulated sun over the 24-hour clock. Characters are
// simple proportioned geometric figures, not sprites. This is also this
// file's role as world-render-3d.js's WebGL-unavailable fallback -- same
// world data, same public contract (constructor/pushTick/draw/destroy).

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

// A dwelling's six action-linked stations, in a 0..1 space LOCAL to its own
// building footprint -- every dwelling places them identically. Kept in
// lockstep with src/worldStructure.ts's STATIONS by
// test/worldStructure.test.ts (key/action/label only; x/y are this file's
// own layout choice and not part of that contract).
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

// Grid geometry, deliberately the same numbers world-render-3d.js uses
// (BUILDING_W/D, GRID_UNIT_X/Z) -- plan units, not pixels; mapped to the
// canvas by _fitPlan() below. Two views of the one world agree on layout
// because they share the same source proportions, not by coincidence.
const BUILDING_W = 8.5;
const BUILDING_D = 6.0;
const GRID_UNIT_X = 6.0;
const GRID_UNIT_Z = 4.5;

function plotToPlanXY(plot, centerX, centerZ) {
  return { x: (plot.x - centerX) * GRID_UNIT_X, y: (plot.y - centerZ) * GRID_UNIT_Z };
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
    this._plan = null; // computed once per distinct building layout, see _fitPlan
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
    this._plan = null; // canvas size changed -- refit on next draw
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

  /** Computes the plan-units -> canvas-pixels transform once per building
   * layout: every building's plot -> plan position, the overall bounding
   * box, and a uniform scale that fits it inside the drawing area (the
   * canvas minus padding and the HUD strip) without distorting proportion.
   * Re-run only when the canvas resizes or the building set changes --
   * cheap, but no reason to redo it every frame. */
  _fitPlan(world, roomW, roomH) {
    const buildings = world.buildings || [];
    if (buildings.length === 0) return null;
    const xs = buildings.map((b) => b.plot.x), ys = buildings.map((b) => b.plot.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerZ = (Math.min(...ys) + Math.max(...ys)) / 2;
    const halfWs = buildings.map((b) => Math.abs((b.plot.x - centerX) * GRID_UNIT_X) + BUILDING_W / 2);
    const halfDs = buildings.map((b) => Math.abs((b.plot.y - centerZ) * GRID_UNIT_Z) + BUILDING_D / 2);
    const halfW = Math.max(...halfWs, BUILDING_W / 2) + 2; // + margin for outdoor objects near the edge
    const halfD = Math.max(...halfDs, BUILDING_D / 2) + 2;
    const scale = Math.min(roomW / (halfW * 2), roomH / (halfD * 2));
    return { centerX, centerZ, halfW, halfD, scale };
  }

  /** plan-units (x, y from plotToPlanXY, or a local offset within a
   * building) -> canvas pixel position, centred in the drawing area. */
  _toPx(plan, x, y, pad, roomW, roomH) {
    return {
      px: pad + roomW / 2 + x * plan.scale,
      py: pad + roomH / 2 + y * plan.scale,
    };
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
    // FINAL.md item 6: interpolated hour, matching world-render-3d.js, so
    // this view's shadows and ambient wash move smoothly too, not once per
    // tick.
    const hour = (prev.tick + t) % 24;
    const sun = sunFor(hour);
    const surfaces = w.surfaces || {};

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = TOKENS.paper;
    ctx.fillRect(0, 0, W, H);

    const buildings = w.buildings || [];
    if (buildings.length === 0) {
      this._drawHud(w, hour, dpr, pad, roomH, hudH, W);
      return; // no buildings yet -- nothing else to draw
    }

    if (!this._plan) this._plan = this._fitPlan(w, roomW, roomH);
    const plan = this._plan;

    // -- open ground: a soft plaza plate under everything, using the real
    // ground surface colour (src/simBaseline.ts's world.surfaces.ground) --
    // architectural plans conventionally keep the paper as the substrate
    // rather than washing the whole sheet in a literal ground colour, so
    // this reads as a light poché tint, not a colour swap.
    ctx.save();
    this._roundRect(pad, pad, roomW, roomH, 18 * dpr);
    ctx.clip();
    ctx.fillStyle = TOKENS.card;
    ctx.fillRect(pad, pad, roomW, roomH);
    if (surfaces.ground && surfaces.ground.color) {
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = surfaces.ground.color;
      ctx.fillRect(pad, pad, roomW, roomH);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.lineWidth = Math.max(1, 1.5 * dpr);
    ctx.strokeStyle = TOKENS.lineStrong;
    this._roundRect(pad, pad, roomW, roomH, 18 * dpr);
    ctx.stroke();

    // -- a cross-shaped path through the plaza, matching the 3D view's own
    // path layout, in the real path surface colour --
    ctx.save();
    this._roundRect(pad, pad, roomW, roomH, 18 * dpr);
    ctx.clip();
    ctx.fillStyle = (surfaces.path && surfaces.path.color) || TOKENS.line;
    ctx.globalAlpha = 0.55;
    const pathHalfW = 1.2 * plan.scale;
    const ns = this._toPx(plan, 0, 0, pad, roomW, roomH);
    ctx.fillRect(ns.px - pathHalfW, pad, pathHalfW * 2, roomH);
    ctx.fillRect(pad, ns.py - pathHalfW, roomW, pathHalfW * 2);
    ctx.globalAlpha = 1;
    ctx.restore();

    // -- buildings: each a labelled room outline at its own plot --
    for (const b of buildings) {
      const pos = plotToPlanXY(b.plot, plan.centerX, plan.centerZ);
      this._drawBuilding(plan, pos, b, sun, dpr, pad, roomW, roomH, surfaces);
    }

    // -- outdoor objects: plan symbols at their plot positions --
    for (const o of w.outdoorObjects || []) {
      const pos = plotToPlanXY(o.plot, plan.centerX, plan.centerZ);
      const { px, py } = this._toPx(plan, pos.x, pos.y, pad, roomW, roomH);
      this._drawOutdoorObject(px, py, o, sun, dpr);
    }

    // -- sims, interpolated between stations within their own home building --
    const buildingsById = {};
    for (const b of buildings) buildingsById[b.id] = b;
    (w.sims || []).forEach((sim, i) => {
      const prevSim = (prev.sims || []).find((s) => s.id === sim.id) || sim;
      const home = buildingsById[sim.home];
      if (!home) return; // a sim with no matching home in this world state -- nothing to draw
      const homePos = plotToPlanXY(home.plot, plan.centerX, plan.centerZ);
      const from = this._stationForSim(prevSim);
      const to = this._stationForSim(sim);
      const localX = lerp(from.x, to.x, t) - 0.5, localY = lerp(from.y, to.y, t) - 0.5;
      const planX = homePos.x + localX * BUILDING_W, planY = homePos.y + localY * BUILDING_D;
      const { px, py } = this._toPx(plan, planX, planY, pad, roomW, roomH);
      this._drawSim(px, py, sim, i, sun, dpr);
    });

    // -- ambient time-of-day wash, plan area only -- the HUD strip stays legible paper --
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

  /** One building's room outline, in plan pixels: a dwelling gets full
   * four-wall floor-plan convention (walls as lines, its six stations as
   * plan symbols inside) -- standard floor-plan reading, and actually a
   * more correct plan than the 3D view's own cutaway walls. A shop/
   * workshop, with no interior stations yet, is an honest labelled
   * rectangle -- not padded out with furniture that doesn't exist. */
  _drawBuilding(plan, pos, building, sun, dpr, pad, roomW, roomH, surfaces) {
    const { ctx } = this;
    const isDwelling = building.type === "dwelling";
    const w = (isDwelling ? BUILDING_W : BUILDING_W * 0.55) * plan.scale;
    const h = (isDwelling ? BUILDING_D : BUILDING_D * 0.7) * plan.scale;
    const { px: cx, py: cy } = this._toPx(plan, pos.x, pos.y, pad, roomW, roomH);
    const x0 = cx - w / 2, y0 = cy - h / 2;

    const sh = this._shadowOffset(sun, dpr);
    ctx.save();
    ctx.fillStyle = "rgba(42,32,26,0.08)";
    this._roundRect(x0 + sh.dx * 0.5, y0 + sh.dy * 0.5, w, h, 10 * dpr);
    ctx.fill();
    ctx.restore();

    const roofKey = building.type === "workshop" ? "roofWorkshop" : building.type === "shop" ? "roofShop" : null;
    const fillColor = roofKey && surfaces[roofKey] && surfaces[roofKey].color ? surfaces[roofKey].color : TOKENS.card;

    ctx.save();
    this._roundRect(x0, y0, w, h, 10 * dpr);
    ctx.fillStyle = isDwelling ? TOKENS.card : fillColor;
    ctx.globalAlpha = isDwelling ? 1 : 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(1, 1.5 * dpr);
    ctx.strokeStyle = TOKENS.lineStrong;
    ctx.stroke();

    // A door opening on the side nearest the plaza (toward the origin) --
    // walls and openings read as walls and openings, not a sealed box.
    const towardCenterX = -pos.x, towardCenterZ = -pos.y;
    ctx.strokeStyle = TOKENS.card;
    ctx.lineWidth = Math.max(2, 4 * dpr);
    ctx.beginPath();
    if (Math.abs(towardCenterZ) >= Math.abs(towardCenterX)) {
      const doorY = towardCenterZ > 0 ? y0 + h : y0;
      ctx.moveTo(cx - w * 0.14, doorY);
      ctx.lineTo(cx + w * 0.14, doorY);
    } else {
      const doorX = towardCenterX > 0 ? x0 + w : x0;
      ctx.moveTo(doorX, cy - h * 0.14);
      ctx.lineTo(doorX, cy + h * 0.14);
    }
    ctx.stroke();
    ctx.restore();

    // Label -- every building is named, not just dwellings.
    ctx.save();
    ctx.fillStyle = TOKENS.ink2;
    ctx.font = `600 ${10 * dpr}px 'IBM Plex Mono', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(building.label || building.id, cx, y0 - 13 * dpr);
    ctx.restore();

    if (isDwelling) {
      for (const key in STATIONS) {
        const s = STATIONS[key];
        if (s.label === null) continue;
        this._drawStationAt(x0 + s.x * w, y0 + s.y * h, s, sun, dpr);
      }
    }
  }

  _drawOutdoorObject(x, y, obj, sun, dpr) {
    const { ctx } = this;
    const sh = this._shadowOffset(sun, dpr);
    ctx.save();
    ctx.fillStyle = "rgba(42,32,26,0.10)";
    switch (obj.type) {
      case "tree": {
        const r = 11 * dpr;
        ctx.beginPath();
        ctx.ellipse(x + sh.dx * 0.5, y + sh.dy * 0.5 + r * 0.5, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(79,107,71,0.85)"; // PALETTE.leaf, matching the 3D view's tree colour
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = TOKENS.lineStrong;
        ctx.lineWidth = Math.max(1, dpr);
        ctx.stroke();
        break;
      }
      case "bench": {
        const bw = 20 * dpr, bh = 8 * dpr;
        ctx.beginPath();
        ctx.ellipse(x + sh.dx * 0.4, y + sh.dy * 0.4 + bh, bw * 0.55, bh * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        this._roundRect(x - bw / 2, y - bh / 2, bw, bh, 2 * dpr);
        ctx.fillStyle = TOKENS.accentSoft;
        ctx.fill();
        ctx.strokeStyle = TOKENS.lineStrong;
        ctx.lineWidth = Math.max(1, 1.2 * dpr);
        ctx.stroke();
        break;
      }
      case "lampPost": {
        const r = 4.5 * dpr;
        ctx.beginPath();
        ctx.ellipse(x + sh.dx * 0.3, y + sh.dy * 0.3 + r, r * 1.4, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = TOKENS.muted;
        ctx.lineWidth = Math.max(1, 1.2 * dpr);
        ctx.beginPath();
        ctx.moveTo(x, y + r * 1.6);
        ctx.lineTo(x, y - r * 0.6);
        ctx.stroke();
        ctx.fillStyle = "#ffb066"; // matches the 3D view's lamp warmth
        ctx.beginPath();
        ctx.arc(x, y - r * 0.6, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = TOKENS.lineStrong;
        ctx.lineWidth = Math.max(1, dpr);
        ctx.stroke();
        break;
      }
      case "planter": {
        const s = 9 * dpr;
        this._roundRect(x - s / 2, y - s / 2, s, s, 2 * dpr);
        ctx.fillStyle = "rgba(79,107,71,0.5)";
        ctx.fill();
        ctx.strokeStyle = TOKENS.lineStrong;
        ctx.lineWidth = Math.max(1, dpr);
        ctx.stroke();
        break;
      }
      default:
        ctx.beginPath();
        ctx.arc(x, y, 5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = TOKENS.line;
        ctx.fill();
    }
    ctx.restore();
  }

  /** One dwelling station's plan symbol at an already-resolved canvas
   * position -- the same six shapes regardless of which building or which
   * dwelling it belongs to. */
  _drawStationAt(cx, cy, s, sun, dpr) {
    const { ctx } = this;
    const sh = this._shadowOffset(sun, dpr);
    const size = 13 * dpr;

    ctx.save();
    ctx.fillStyle = "rgba(42,32,26,0.10)";
    ctx.beginPath();
    ctx.ellipse(cx + sh.dx * 0.5, cy + sh.dy * 0.5 + size * 0.55, size * 0.6, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = TOKENS.lineStrong;
    ctx.fillStyle = TOKENS.accentSoft;
    ctx.lineWidth = Math.max(1, 1.1 * dpr);

    switch (s.action) {
      case "sleep": // bed
        this._roundRect(cx - size, cy - size * 0.6, size * 2, size * 1.2, 4 * dpr);
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - size + 4 * dpr, cy - size * 0.6); ctx.lineTo(cx - size + 4 * dpr, cy + size * 0.6); ctx.stroke();
        break;
      case "eat": // fridge
        this._roundRect(cx - size * 0.5, cy - size, size, size * 2, 3 * dpr);
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - size * 0.5, cy - size * 0.2); ctx.lineTo(cx + size * 0.5, cy - size * 0.2); ctx.stroke();
        break;
      case "shower": // shower stall
        this._roundRect(cx - size * 0.7, cy - size * 0.7, size * 1.4, size * 1.4, 3 * dpr);
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy - size * 0.55, size * 0.35, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
        break;
      case "work": // desk
        this._roundRect(cx - size, cy - size * 0.15, size * 2, size * 0.5, 2 * dpr);
        ctx.fill(); ctx.stroke();
        this._roundRect(cx - size * 0.4, cy - size * 0.7, size * 0.8, size * 0.55, 2 * dpr);
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
    const r = 8 * dpr;

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

  /** Dedicated bottom strip, outside the floor plan -- need bars and the
   * clock line never draw over the world itself. Money stays out of this
   * HUD, same rule as the 3D page's own readout (FINAL.md context: removed
   * from the frame once already; this strip is part of the frame too). */
  _drawHud(world, hour, dpr, pad, roomH, hudH, W) {
    const { ctx, canvas } = this;
    const stripY = pad + roomH + 12 * dpr;
    const stripPad = pad;
    ctx.save();
    ctx.font = `${11 * dpr}px 'IBM Plex Mono', monospace`;
    ctx.textBaseline = "top";

    const h12 = hour % 12 === 0 ? 12 : Math.floor(hour) % 12;
    const ampm = hour < 12 ? "AM" : "PM";
    ctx.fillStyle = TOKENS.ink2;
    ctx.textAlign = "right";
    ctx.fillText(`Day ${Math.floor(world.tick / 24) + 1} · ${h12}:00 ${ampm}`, W - stripPad, stripY);
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
