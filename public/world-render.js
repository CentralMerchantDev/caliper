// CALIPER world renderer — an architectural plan view, not a game sprite sheet.
// Self-contained canvas module: no dependencies, no build step. Consumes plain
// world-state JSON (the same shape src/simBaseline.ts's tick() returns).
//
// FOUNDATION.md item 1: draws world.placements using world.objectTypes, the
// same registry+placement data world-render-3d.js reads -- not a second,
// independently-hand-typed picture of the world. A KNOWN type (the ten the
// registry ships with) gets a hand-tuned plan symbol via SYMBOL_DRAWERS
// below; anything else -- a type this file has never heard of -- still
// draws correctly from generic data alone (its own footprint, its own
// colour, its own label), just plainer. Both are real support, not a
// crash either way; see _drawGenericSymbol.
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

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Grid geometry, deliberately the same numbers world-render-3d.js uses
// (BUILDING_W/D, GRID_UNIT_X/Z, BUILDING_TYPE_SCALE) -- plan units, not
// pixels; mapped to the canvas by _fitPlan() below. Two views of the one
// world agree on layout because they share the same source proportions,
// not by coincidence.
const BUILDING_W = 8.5;
const BUILDING_D = 6.0;
const GRID_UNIT_X = 6.0;
const GRID_UNIT_Z = 4.5;
const BUILDING_TYPE_SCALE = {
  dwelling: { w: 1, d: 1 },
  shop: { w: 0.55, d: 0.7 },
  workshop: { w: 0.55, d: 0.7 },
};
function scaleFor(type) {
  return BUILDING_TYPE_SCALE[type] || BUILDING_TYPE_SCALE.dwelling;
}

function plotToPlanXY(plot, centerX, centerZ) {
  return { x: (plot.x - centerX) * GRID_UNIT_X, y: (plot.y - centerZ) * GRID_UNIT_Z };
}

// FOUNDATION.md item 1: which registry type provides a given sim action --
// derived from world.objectTypes at runtime, same as world-render-3d.js.
const IDLE_LOCAL = { x: 0.5, y: 0.5 };
function localForAction(action, objectTypes) {
  for (const key in objectTypes) {
    const t = objectTypes[key];
    if (t.station && t.station.action === action) return t.local || IDLE_LOCAL;
  }
  return IDLE_LOCAL;
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
    const halfWs = buildings.map((b) => Math.abs((b.plot.x - centerX) * GRID_UNIT_X) + (scaleFor(b.type).w * BUILDING_W) / 2);
    const halfDs = buildings.map((b) => Math.abs((b.plot.y - centerZ) * GRID_UNIT_Z) + (scaleFor(b.type).d * BUILDING_D) / 2);
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
    const objectTypes = w.objectTypes || {};

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

    // -- buildings: each a labelled room outline at its own plot, open-
    // topped uniformly (FOUNDATION.md item 4) --
    const buildingsById = {};
    for (const b of buildings) buildingsById[b.id] = b;
    for (const b of buildings) {
      const pos = plotToPlanXY(b.plot, plan.centerX, plan.centerZ);
      this._drawBuilding(plan, pos, b, sun, dpr, pad, roomW, roomH, surfaces);
    }

    // -- placements: every station inside a building, every prop outdoors,
    // all from the one placements array (FOUNDATION.md item 1) --
    for (const p of w.placements || []) {
      const typeDef = objectTypes[p.type];
      if (!typeDef) continue; // an unknown type on a placement -- nothing to draw, not a crash
      let px, py;
      if (p.location === "outdoors") {
        const pos = plotToPlanXY(p.plot, plan.centerX, plan.centerZ);
        ({ px, py } = this._toPx(plan, pos.x, pos.y, pad, roomW, roomH));
      } else {
        const home = buildingsById[p.location];
        if (!home || !typeDef.local) continue; // a station-shaped placement with nowhere to stand -- skip, don't throw
        const homePos = plotToPlanXY(home.plot, plan.centerX, plan.centerZ);
        const s = scaleFor(home.type);
        const planX = homePos.x + (typeDef.local.x - 0.5) * s.w * BUILDING_W;
        const planY = homePos.y + (typeDef.local.y - 0.5) * s.d * BUILDING_D;
        ({ px, py } = this._toPx(plan, planX, planY, pad, roomW, roomH));
      }
      this._drawPlacement(px, py, p, typeDef, sun, dpr);
    }

    // -- sims, interpolated between stations within their own home building --
    (w.sims || []).forEach((sim, i) => {
      const prevSim = (prev.sims || []).find((s) => s.id === sim.id) || sim;
      const home = buildingsById[sim.home];
      if (!home) return; // a sim with no matching home in this world state -- nothing to draw
      const homePos = plotToPlanXY(home.plot, plan.centerX, plan.centerZ);
      const s = scaleFor(home.type);
      const from = localForAction(prevSim.lastAction || "idle", objectTypes);
      const to = localForAction(sim.lastAction || "idle", objectTypes);
      const localX = lerp(from.x, to.x, t) - 0.5, localY = lerp(from.y, to.y, t) - 0.5;
      const planX = homePos.x + localX * s.w * BUILDING_W, planY = homePos.y + localY * s.d * BUILDING_D;
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

  /** One building's room outline, in plan pixels -- full four-wall floor-
   * plan convention (walls as lines), open-topped, uniformly across every
   * building type (FOUNDATION.md item 4: "two of four were open-topped and
   * two were not -- it reads as a bug because it is one"). Shop/workshop
   * get a small trim-coloured swatch by their label instead of a roof
   * tint, still visually distinct from across the plot. */
  _drawBuilding(plan, pos, building, sun, dpr, pad, roomW, roomH, surfaces) {
    const { ctx } = this;
    const s = scaleFor(building.type);
    const w = s.w * BUILDING_W * plan.scale;
    const h = s.d * BUILDING_D * plan.scale;
    const { px: cx, py: cy } = this._toPx(plan, pos.x, pos.y, pad, roomW, roomH);
    const x0 = cx - w / 2, y0 = cy - h / 2;

    const sh = this._shadowOffset(sun, dpr);
    ctx.save();
    ctx.fillStyle = "rgba(42,32,26,0.08)";
    this._roundRect(x0 + sh.dx * 0.5, y0 + sh.dy * 0.5, w, h, 10 * dpr);
    ctx.fill();
    ctx.restore();

    ctx.save();
    this._roundRect(x0, y0, w, h, 10 * dpr);
    ctx.fillStyle = TOKENS.card;
    ctx.fill();
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

    // Trim swatch for shop/workshop -- the plan-view equivalent of the 3D
    // view's coloured sign post, using the same real surfaces data
    // (trimShop/trimWorkshop).
    const trimKey = building.type === "workshop" ? "trimWorkshop" : building.type === "shop" ? "trimShop" : null;
    if (trimKey && surfaces[trimKey] && surfaces[trimKey].color) {
      ctx.save();
      ctx.fillStyle = surfaces[trimKey].color;
      this._roundRect(cx - 5 * dpr, y0 - 12 * dpr, 10 * dpr, 4 * dpr, 2 * dpr);
      ctx.fill();
      ctx.restore();
    }

    // Label -- every building is named, not just dwellings.
    ctx.save();
    ctx.fillStyle = TOKENS.ink2;
    ctx.font = `600 ${10 * dpr}px 'IBM Plex Mono', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(building.label || building.id, cx, y0 - 13 * dpr);
    ctx.restore();
  }

  /** Hand-tuned plan symbols for the ten types the registry ships with --
   * kept because they read well at small sizes and it would be a real
   * visual downgrade to flatten them to the generic fallback. A type NOT
   * in this table (FOUNDATION.md item 1's "add a genuinely new type" case)
   * still draws correctly via _drawGenericSymbol below -- plainer, not
   * broken, and never a reason to refuse a request that would exercise it. */
  static get SYMBOL_DRAWERS() {
    return {
      bed: (ctx, rr, x, y, sz) => {
        rr(x - sz, y - sz * 0.6, sz * 2, sz * 1.2, 4);
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - sz + 4, y - sz * 0.6); ctx.lineTo(x - sz + 4, y + sz * 0.6); ctx.stroke();
      },
      fridge: (ctx, rr, x, y, sz) => {
        rr(x - sz * 0.5, y - sz, sz, sz * 2, 3);
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - sz * 0.5, y - sz * 0.2); ctx.lineTo(x + sz * 0.5, y - sz * 0.2); ctx.stroke();
      },
      shower: (ctx, rr, x, y, sz) => {
        rr(x - sz * 0.7, y - sz * 0.7, sz * 1.4, sz * 1.4, 3);
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y - sz * 0.55, sz * 0.35, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      },
      desk: (ctx, rr, x, y, sz) => {
        rr(x - sz, y - sz * 0.15, sz * 2, sz * 0.5, 2);
        ctx.fill(); ctx.stroke();
        rr(x - sz * 0.4, y - sz * 0.7, sz * 0.8, sz * 0.55, 2);
        ctx.fillStyle = TOKENS.card; ctx.fill(); ctx.stroke();
      },
      rug: (ctx, rr, x, y, sz) => {
        ctx.beginPath(); ctx.ellipse(x, y, sz * 1.1, sz * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(176,86,12,0.10)"; ctx.fill(); ctx.strokeStyle = TOKENS.line; ctx.stroke();
      },
      table: (ctx, rr, x, y, sz) => {
        ctx.beginPath(); ctx.arc(x, y, sz * 0.55, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      },
      tree: (ctx, rr, x, y, sz, sh) => {
        ctx.beginPath(); ctx.ellipse(x + sh.dx * 0.5, y + sh.dy * 0.5 + sz * 0.5, sz * 0.9, sz * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(42,32,26,0.10)"; ctx.fill();
        ctx.fillStyle = "rgba(79,107,71,0.85)";
        ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = TOKENS.lineStrong; ctx.stroke();
      },
      bench: (ctx, rr, x, y, sz, sh) => {
        const bw = sz * 1.8, bh = sz * 0.7;
        ctx.beginPath(); ctx.ellipse(x + sh.dx * 0.4, y + sh.dy * 0.4 + bh, bw * 0.55, bh * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(42,32,26,0.10)"; ctx.fill();
        rr(x - bw / 2, y - bh / 2, bw, bh, 2);
        ctx.fillStyle = TOKENS.accentSoft; ctx.fill(); ctx.strokeStyle = TOKENS.lineStrong; ctx.stroke();
      },
      lampPost: (ctx, rr, x, y, sz, sh) => {
        ctx.beginPath(); ctx.ellipse(x + sh.dx * 0.3, y + sh.dy * 0.3 + sz, sz * 1.4, sz * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(42,32,26,0.10)"; ctx.fill();
        ctx.strokeStyle = TOKENS.muted;
        ctx.beginPath(); ctx.moveTo(x, y + sz * 1.6); ctx.lineTo(x, y - sz * 0.6); ctx.stroke();
        ctx.fillStyle = "#ffb066";
        ctx.beginPath(); ctx.arc(x, y - sz * 0.6, sz, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = TOKENS.lineStrong; ctx.stroke();
      },
      planter: (ctx, rr, x, y, sz) => {
        rr(x - sz / 2, y - sz / 2, sz, sz, 2);
        ctx.fillStyle = "rgba(79,107,71,0.5)"; ctx.fill();
        ctx.strokeStyle = TOKENS.lineStrong; ctx.stroke();
      },
    };
  }

  /** A type this file has no hand-tuned symbol for: a plain, correctly
   * sized (from the type's own real footprint) rounded rect with the
   * type's own first recipe colour and its key as a label -- legible,
   * genuinely drawn, never a crash or a blank spot. FOUNDATION.md item 1's
   * "add a genuinely new type" case draws through here until someone
   * chooses to give it a nicer symbol above; both are real support. */
  _drawGenericSymbol(x, y, typeKey, typeDef, sh, dpr) {
    const { ctx } = this;
    const fp = typeDef.footprint || { w: 0.6, d: 0.6 };
    const w = Math.max(10 * dpr, fp.w * 6 * dpr), d = Math.max(10 * dpr, fp.d * 6 * dpr);
    const color = (typeDef.recipe && typeDef.recipe[0] && typeDef.recipe[0].color) || TOKENS.accentSoft;
    ctx.save();
    ctx.fillStyle = "rgba(42,32,26,0.10)";
    ctx.beginPath();
    ctx.ellipse(x + sh.dx * 0.4, y + sh.dy * 0.4 + d * 0.3, w * 0.5, d * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    this._roundRect(x - w / 2, y - d / 2, w, d, Math.min(3 * dpr, w * 0.2));
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = TOKENS.lineStrong;
    ctx.lineWidth = Math.max(1, dpr);
    ctx.stroke();
    ctx.fillStyle = TOKENS.muted;
    ctx.font = `${7 * dpr}px 'IBM Plex Mono', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(typeKey, x, y + d / 2 + 2 * dpr);
    ctx.restore();
  }

  /** One placement's plan symbol -- a station inside a building or a prop
   * outdoors, dispatched by TYPE (not by sim action, so this covers
   * non-station outdoor props the same way). */
  _drawPlacement(x, y, placement, typeDef, sun, dpr) {
    const { ctx } = this;
    const sh = this._shadowOffset(sun, dpr);
    const drawer = WorldRenderer.SYMBOL_DRAWERS[placement.type];
    if (!drawer) {
      this._drawGenericSymbol(x, y, placement.type, typeDef, sh, dpr);
      return;
    }
    const size = 13 * dpr;
    ctx.save();
    ctx.fillStyle = "rgba(42,32,26,0.10)";
    ctx.beginPath();
    ctx.ellipse(x + sh.dx * 0.5, y + sh.dy * 0.5 + size * 0.55, size * 0.6, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = TOKENS.lineStrong;
    ctx.fillStyle = (placement.overrides && placement.overrides.color) || TOKENS.accentSoft;
    ctx.lineWidth = Math.max(1, 1.1 * dpr);
    const rr = (rx, ry, rw, rh, rad) => this._roundRect(rx, ry, rw, rh, rad * dpr);
    drawer(ctx, rr, x, y, size, sh);
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

export { sunFor };
