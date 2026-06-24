import { useState, useRef, useEffect } from "react";

const C = {
  bg: "#FFFFFF", surface: "#F7F7F5", card: "#FFFFFF",
  accent: "#1A1A1A", purple: "#1A1A1A", green: "#2E7D32", amber: "#A67C00",
  red: "#C0392B", text: "#1A1A1A", muted: "#A0A09A", border: "#EAEAE6",
  // selection highlight (subtle, distinct from charcoal text)
  sel: "#1A1A1A", selBg: "#F2F2EF",
};

const CORE = {
  stairs: { id: "stairs", label: "Staircase", icon: "🪜", color: "#6C7293", min: 90 },
  lift:   { id: "lift",   label: "Lift",      icon: "🛗", color: "#8B5CF6", min: 30 },
};

// internal open elements that closed-in plots need (NBC-informed)
const COURTYARD = { id: "court", label: "Courtyard", icon: "🏛️", color: "#5BC0BE", min: 100 };
const SHAFT     = { id: "shaft", label: "Vent Shaft", icon: "🌀", color: "#7FBFA3", min: 12 };

const ROOMS = {
  park:       { label: "Parking",        icon: "🚗", color: "#7A8FA6", min: 130, ideal: 150 },
  garden:     { label: "Front Garden",   icon: "🌿", color: "#56C98A", min: 80, ideal: 100 },
  living:     { label: "Living Room",    icon: "🛋️", color: "#4F8EF7", min: 150, ideal: 220 },
  master:     { label: "Master Bedroom", icon: "🛏️", color: "#3ECFA4", min: 140, ideal: 144 },
  bed:        { label: "Bedroom",        icon: "🛏️", color: "#37B894", min: 110, ideal: 120 },
  kitchen:    { label: "Kitchen",        icon: "🍳", color: "#F5A623", min: 80, ideal: 100 },
  bath:       { label: "Bathroom",       icon: "🚿", color: "#9B6DFF", min: 35, ideal: 45 },
  dining:     { label: "Dining",         icon: "🍽️", color: "#F08AB0", min: 90, ideal: 120 },
  balcony:    { label: "Balcony",        icon: "🌅", color: "#5BC0BE", min: 35, ideal: 50 },
  office:     { label: "Office / Study", icon: "💻", color: "#FFB347", min: 70, ideal: 100 },
  pooja:      { label: "Pooja Room",     icon: "🪔", color: "#E6B655", min: 20, ideal: 35 },
  store:      { label: "Store",          icon: "📦", color: "#8A8FA6", min: 25, ideal: 40 },
  guest:      { label: "Guest Room",     icon: "🛌", color: "#6FB1E0", min: 110, ideal: 120 },
  utility:    { label: "Utility / Wash", icon: "🧺", color: "#7FBFA3", min: 25, ideal: 40 },
  servant:    { label: "Servant Room",   icon: "🧹", color: "#9AA0BC", min: 60, ideal: 80 },
  terrace:    { label: "Terrace",        icon: "🏞️", color: "#84C9C0", min: 80, ideal: 120 },
  reception:  { label: "Reception",      icon: "🛎️", color: "#4F8EF7", min: 100, ideal: 140 },
  cabin:      { label: "Cabin",          icon: "🚪", color: "#3ECFA4", min: 80, ideal: 100 },
  conference: { label: "Conference",     icon: "👥", color: "#F5A623", min: 120, ideal: 160 },
  pantry:     { label: "Pantry",         icon: "☕", color: "#E6B655", min: 45, ideal: 60 },
  cellar:     { label: "Storage Cellar", icon: "🗄️", color: "#8A8FA6", min: 100, ideal: 120 },
  hometheatre:{ label: "Home Theatre",   icon: "🎬", color: "#A479E0", min: 150, ideal: 200 },
  gym:        { label: "Gym",            icon: "🏋️", color: "#E07A5F", min: 100, ideal: 140 },
  custom:     { label: "Custom Space",   icon: "✏️", color: "#9C7B52", min: 30, ideal: 60 },
};

const RES_GROUND = ["park", "garden", "living", "bed", "kitchen", "bath", "pooja", "store", "utility"];
const RES_UPPER  = ["living", "master", "bed", "kitchen", "bath", "dining", "balcony", "office", "guest", "pooja", "store", "terrace"];
const RES_BASEMENT = ["park", "store"];
const COM_ALL    = ["reception", "office", "cabin", "conference", "bath", "pantry", "store", "park"];

const SUGGEST = {
  resGround: ["living", "kitchen", "bath", "bed", "pooja"],
  resUpper:  ["master", "bed", "bath", "dining", "balcony"],
  resBasement: ["park", "store", "cellar"],
  com:       ["reception", "office", "bath", "pantry"],
};

// surroundings: sides of the plot
const SIDE_KEYS = ["front", "right", "rear", "left"];
const SIDE_LABEL = { front: "Front", right: "Right", rear: "Rear", left: "Left" };
const SURROUND_OPTS = [
  { id: "road",     label: "Road",            icon: "🛣️", open: true },
  { id: "open",     label: "Open / Garden",   icon: "🌳", open: true },
  { id: "building", label: "Another building", icon: "🏢", open: false },
  { id: "closed",   label: "Closed wall",     icon: "🧱", open: false },
];
const isOpenSide = (val) => val === "road" || val === "open";

const DIRS = [[0,"N"],[45,"NE"],[90,"E"],[135,"SE"],[180,"S"],[225,"SW"],[270,"W"],[315,"NW"]];
function nearestDir(a) {
  let best = DIRS[0], bd = 999;
  for (const d of DIRS) { let diff = Math.abs(((a - d[0] + 540) % 360) - 180); if (diff < bd) { bd = diff; best = d; } }
  return best[1];
}
function boundaryNote(a) {
  const m = ((a % 45) + 45) % 45;
  if (Math.abs(m - 22.5) < 6) {
    const lower = Math.floor((a - 22.5 + 360) % 360 / 45);
    const upper = (lower + 1) % 8;
    return `near the ${DIRS[lower][1]}/${DIRS[upper][1]} boundary`;
  }
  return null;
}

let UID = 1;
function quadPoints(f, r, b, l, d) {
  const cx = (f * f + d * d - r * r) / (2 * f);
  const cySq = d * d - cx * cx;
  if (cySq < 0) return null;
  const cy = Math.sqrt(cySq);
  const cosA = (l * l + d * d - b * b) / (2 * l * d);
  if (cosA < -1 || cosA > 1) return null;
  const dir = Math.atan2(cy, cx) + Math.acos(cosA);
  return [[0, 0], [f, 0], [cx, cy], [l * Math.cos(dir), l * Math.sin(dir)]];
}
const lPoints = (W, D, nw, nd) => [[0, 0], [W, 0], [W, D - nd], [W - nw, D - nd], [W - nw, D], [0, D]];
function polyArea(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; s += x1 * y2 - x2 * y1; }
  return Math.abs(s) / 2;
}
const bboxOf = (pts) => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
};

// ============ THE LAYOUT ENGINE ============
// Zone grid: 3x3 cells, each tagged with a compass direction.
// The grid is in PLOT-LOCAL space (before rotation). We rotate which compass
// label each cell carries based on the plot facing, so "SE cell" really points SE.

// base 3x3 compass layout when front faces South (facing=180, front at bottom = South)
// rows top->bottom, cols left->right. We'll rotate this by facing.
const BASE_GRID = [
  ["NW", "N", "NE"],
  ["W",  "C", "E" ],
  ["SW", "S", "SE"],
];

// rotate the compass labels of the grid by the facing angle (snapped to 8 dirs)
function rotatedGrid(facing) {
  // how many 45° steps clockwise from "front = South" baseline
  // front faces `facing`; baseline front=180(S). steps of 45.
  const steps = Math.round(((facing - 180 + 360) % 360) / 45);
  const order = ["N","NE","E","SE","S","SW","W","NW"]; // clockwise
  const rot = (dir) => {
    if (dir === "C") return "C";
    const i = order.indexOf(dir);
    return order[(i + steps + order.length * 4) % order.length];
  };
  return BASE_GRID.map(row => row.map(rot));
}

// preference: for a given style, how much each room "wants" each compass zone (0..10)
function zoneScore(style, roomId, zone) {
  const is = (...z) => z.includes(zone) ? 1 : 0;
  if (style === "vastu") {
    const map = {
      kitchen: 9 * is("SE") + 5 * is("E","S"),
      master:  9 * is("SW") + 4 * is("S","W"),
      pooja:   10 * is("NE") + 4 * is("N","E"),
      living:  8 * is("NE","N","E") + 3 * is("C"),
      bath:    8 * is("NW","W") + 2 * is("N") - 6 * is("NE"),
      bed:     7 * is("W","NW","S") + 3 * is("SW"),
      dining:  7 * is("W","E") + 3 * is("C"),
      store:   7 * is("SW","S") + 2 * is("W"),
      park:    7 * is("NW","SE") + 3 * is("N"),
      garden:  8 * is("NE","N","E"),
      office:  7 * is("W","NW","E"),
      balcony: 6 * is("N","E","NE"),
      guest:   6 * is("NW","W"),
      utility: 6 * is("NW","W","SE"),
    };
    return (map[roomId] ?? 5) ;
  }
  if (style === "social") {
    // cluster living/dining/kitchen toward front+center; bedrooms toward back/sides
    const front = is("S","SE","SW"); // front zones (road side after rotation handled by grid)
    const map = {
      living:  9 * is("C","S","SE","SW") ,
      dining:  8 * is("C","S","E"),
      kitchen: 7 * is("SE","E","C"),
      master:  8 * is("N","NW","NE"),
      bed:     7 * is("N","NW","NE","W"),
      bath:    6 * is("NW","W","N"),
      pooja:   6 * is("NE","N"),
      store:   6 * is("NW","SW"),
      park:    7 * is("S","SE","SW"),
      garden:  8 * is("S","SE","SW"),
      office:  6 * is("NW","W"),
      balcony: 6 * is("N","NE"),
      guest:   6 * is("NW","N"),
      utility: 6 * is("NW","W"),
    };
    return (map[roomId] ?? 5);
  }
  if (style === "light") {
    // living + bedrooms to outer ring (not center); service to interior/center
    const outer = zone !== "C" ? 1 : 0;
    const map = {
      living: 8 * outer * is("S","SE","E","SW"),
      master: 8 * outer * is("E","SE","S"),
      bed:    7 * outer * is("E","N","NE","S"),
      kitchen:6 * outer * is("E","SE"),
      dining: 6 * outer * is("S","E"),
      bath:   7 * is("C","W","NW"),
      store:  7 * is("C","W"),
      pooja:  6 * is("NE","N"),
      park:   6 * is("N","NW"),
      garden: 8 * is("S","SE","E"),
      office: 7 * outer * is("E","N"),
      balcony:7 * outer * is("S","E","SE"),
    };
    return (map[roomId] ?? (outer ? 5 : 3));
  }
  // compact: encourage adjacency by pulling wet rooms together and to one side
  const map = {
    kitchen: 8 * is("SE","S","E"),
    bath:    8 * is("S","SE","SW"),
    utility: 7 * is("S","SE"),
    store:   7 * is("SW","S","W"),
    living:  7 * is("C","N","NE"),
    dining:  7 * is("C","E"),
    master:  7 * is("NW","W","N"),
    bed:     6 * is("NW","N","W"),
    pooja:   6 * is("NE","N"),
    park:    7 * is("N","NW"),
    garden:  6 * is("N","NE"),
    office:  6 * is("NW","W"),
    balcony: 5 * is("N","NE"),
  };
  return (map[roomId] ?? 5);
}

// assign each room to a grid cell, then compute pixel rects within the plot bbox.
function generateLayout(points, facing, style, rooms, cores) {
  if (!points) return [];
  const grid = rotatedGrid(facing);
  const bb = bboxOf(points);
  const bw = bb.maxX - bb.minX, bh = bb.maxY - bb.minY;
  // cell rectangles in plot units (3x3)
  const cellW = bw / 3, cellH = bh / 3;
  const cells = [];
  for (let r = 0; r < 3; r++) for (let cI = 0; cI < 3; cI++) {
    cells.push({
      row: r, col: cI, zone: grid[r][cI],
      x: bb.minX + cI * cellW, y: bb.maxY - (r + 1) * cellH, // y flipped: row0 = top = high y
      w: cellW, h: cellH, used: 0, items: [],
    });
  }
  const zoneOf = (z) => cells.filter(c => c.zone === z);

  // order: cores first (stairs/lift to SW/NW center-ish), then rooms by size desc
  const allBlocks = [];
  cores.forEach(c => allBlocks.push({ ...c, isCore: true }));
  [...rooms].sort((a, b) => b.sqft - a.sqft).forEach(r => allBlocks.push({ ...ROOMS[r.typeId], typeId: r.typeId, sqft: r.sqft, uid: r.uid, label: r.customLabel || ROOMS[r.typeId].label }));

  const placed = [];
  for (const blk of allBlocks) {
    let target;
    if (blk.isCore) {
      // stairs prefer SW, lift prefer NW; fall back to center
      const pref = blk.id === "stairs" ? ["SW","S","W","C"] : ["NW","N","W","C"];
      for (const z of pref) { const cs = zoneOf(z); if (cs.length) { target = cs[0]; break; } }
    } else {
      // pick cell with highest (zoneScore - fullnessPenalty)
      let best = null, bestScore = -1e9;
      for (const c of cells) {
        const sc = zoneScore(style, blk.typeId, c.zone) - (c.used / (c.w * c.h)) * 6;
        if (sc > bestScore) { bestScore = sc; best = c; }
      }
      target = best;
    }
    if (!target) target = cells[4];
    // size of the drawn block (cap to cell-ish but allow stacking)
    const side = Math.sqrt(blk.sqft);
    const bx = target.x + (target.items.length % 2) * Math.min(side, target.w * 0.45);
    const by = target.y + Math.floor(target.items.length / 2) * Math.min(side, target.h * 0.45);
    target.items.push(blk);
    target.used += blk.sqft;
    placed.push({
      ...blk,
      px: target.x, py: target.y, pw: target.w, ph: target.h,
      side, zone: target.zone,
    });
  }
  return placed;
}

// ===== SLICING-TREE LAYOUT ENGINE (Stage 1) =====
// Recursively subdivides the floor rectangle into perfectly-tiling room rectangles.
// Every cut is a shared wall. Guarantees no gaps/overlaps + sensible proportions.

// where each room ideally sits, as a normalized (col,row) in 0..2 grid space BEFORE rotation
// col: 0=West .. 2=East ; row: 0=North .. 2=South  (matches BASE_GRID visual)
function roomAnchor(typeId, grid) {
  // find the zone this room most wants, then locate that zone in the (possibly rotated) grid
  const want = {
    kitchen: "SE", master: "SW", pooja: "NE", living: "C", bath: "NW",
    bed: "W", dining: "E", store: "SW", park: "NW", garden: "NE",
    office: "W", balcony: "NE", guest: "NW", utility: "NW",
    stairs: "C", lift: "C", court: "C", shaft: "NW",
  }[typeId] || "C";
  // locate `want` in the rotated grid -> gives (row,col)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (grid[r][c] === want) return { col: c, row: r };
  }
  return { col: 1, row: 1 };
}

// recursively slice `rect` among `items` (each {sqft, anchor, ...}). Returns array of {...item, rect}.
function sliceRooms(rect, items, variant = 0) {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ ...items[0], rect: { ...rect } }];

  const totalArea = items.reduce((a, b) => a + b.sqft, 0);
  // decide split axis: cut along the longer dimension of the rect for better proportions,
  // but also respect the spread of anchors so Vastu placement is honored.
  const colSpread = Math.max(...items.map(i => i.anchor.col)) - Math.min(...items.map(i => i.anchor.col));
  const rowSpread = Math.max(...items.map(i => i.anchor.row)) - Math.min(...items.map(i => i.anchor.row));
  // prefer cutting the axis with more anchor spread; tie-break by rect shape
  let cutVertical;
  if (colSpread !== rowSpread) cutVertical = colSpread > rowSpread;
  else cutVertical = rect.w >= rect.h;
  // VARIANT: produce distinct layouts by biasing the first-level cut direction
  if (variant === 1) cutVertical = !cutVertical;       // option B: opposite primary axis
  // variant 2 keeps the natural axis but shifts the split point (handled below)

  // sort items along the cut axis by anchor, then split into two groups by area ~half
  const sorted = [...items].sort((a, b) => cutVertical ? a.anchor.col - b.anchor.col : a.anchor.row - b.anchor.row);
  let acc = 0, splitIdx = 1;
  const halfTarget = variant === 2 ? totalArea * 0.62 : totalArea / 2;
  for (let i = 0; i < sorted.length; i++) {
    acc += sorted[i].sqft;
    if (acc >= halfTarget) { splitIdx = i + 1; break; }
  }
  splitIdx = Math.max(1, Math.min(sorted.length - 1, splitIdx));
  const groupA = sorted.slice(0, splitIdx);
  const groupB = sorted.slice(splitIdx);
  const areaA = groupA.reduce((a, b) => a + b.sqft, 0);
  const fracA = areaA / totalArea;

  // PROPORTION GUARD: if a cut would make either child too thin relative to its content, flip axis once
  const childAThin = cutVertical ? (rect.w * fracA) / rect.h < 0.32 : (rect.h * fracA) / rect.w < 0.32;
  const childBThin = cutVertical ? (rect.w * (1 - fracA)) / rect.h < 0.32 : (rect.h * (1 - fracA)) / rect.w < 0.32;
  if ((childAThin || childBThin) && items.length > 1) {
    // re-sort along the other axis and split there
    const alt = cutVertical ? false : true;
    const sorted2 = [...items].sort((a, b) => alt ? a.anchor.col - b.anchor.col : a.anchor.row - b.anchor.row);
    let acc2 = 0, sp2 = 1;
    for (let i = 0; i < sorted2.length; i++) { acc2 += sorted2[i].sqft; if (acc2 >= totalArea / 2) { sp2 = i + 1; break; } }
    sp2 = Math.max(1, Math.min(sorted2.length - 1, sp2));
    const gA = sorted2.slice(0, sp2), gB = sorted2.slice(sp2);
    const fA = gA.reduce((a, b) => a + b.sqft, 0) / totalArea;
    if (alt) { // alt vertical
      const wA = rect.w * fA;
      return [
        ...sliceRooms({ x: rect.x, y: rect.y, w: wA, h: rect.h }, gA, variant),
        ...sliceRooms({ x: rect.x + wA, y: rect.y, w: rect.w - wA, h: rect.h }, gB, variant),
      ];
    } else { // alt horizontal (top = high y = North)
      const hA = rect.h * fA;
      return [
        ...sliceRooms({ x: rect.x, y: rect.y + rect.h - hA, w: rect.w, h: hA }, gA, variant),
        ...sliceRooms({ x: rect.x, y: rect.y, w: rect.w, h: rect.h - hA }, gB, variant),
      ];
    }
  }

  if (cutVertical) {
    const wA = rect.w * fracA;
    return [
      ...sliceRooms({ x: rect.x, y: rect.y, w: wA, h: rect.h }, groupA, variant),
      ...sliceRooms({ x: rect.x + wA, y: rect.y, w: rect.w - wA, h: rect.h }, groupB, variant),
    ];
  } else {
    // horizontal cut: groupA is North (top, higher y). y grows upward in plot coords.
    const hA = rect.h * fracA;
    return [
      ...sliceRooms({ x: rect.x, y: rect.y + rect.h - hA, w: rect.w, h: hA }, groupA, variant),
      ...sliceRooms({ x: rect.x, y: rect.y, w: rect.w, h: rect.h - hA }, groupB, variant),
    ];
  }
}

// ============================================================
// PlotAI v2 ENGINE — shape-aware, zoned, adjacency-driven layout
// (tested in isolation: perfect tiling, bonded ensuite, real plot shape)
// ============================================================
const V2SPEC = {
  living:  { zone: "public",  minW: 10, light: "perimeter", target: 200 },
  dining:  { zone: "public",  minW: 7,  light: "core",      target: 100 },
  guest:   { zone: "public",  minW: 9,  light: "perimeter", target: 120 },
  master:  { zone: "private", minW: 10, light: "perimeter", target: 168, ensuite: true },
  bed:     { zone: "private", minW: 9,  light: "perimeter", target: 120 },
  kids:    { zone: "private", minW: 8,  light: "perimeter", target: 110 },
  bath:    { zone: "service", minW: 4,  light: "core",      target: 45 },
  ensuite: { zone: "private", minW: 4,  light: "core",      target: 40 },
  kitchen: { zone: "service", minW: 7,  light: "perimeter", target: 100 },
  utility: { zone: "service", minW: 4,  light: "core",      target: 40 },
  pooja:   { zone: "public",  minW: 4,  light: "core",      target: 30 },
  store:   { zone: "service", minW: 4,  light: "core",      target: 36 },
  park:    { zone: "service", minW: 8,  light: "perimeter", target: 180 },
  balcony: { zone: "public",  minW: 4,  light: "perimeter", target: 50 },
  office:  { zone: "private", minW: 8,  light: "perimeter", target: 100 },
  servant: { zone: "service", minW: 6,  light: "core",      target: 64 },
  terrace: { zone: "service", minW: 6,  light: "perimeter", target: 120 },
  stairs:  { zone: "service", minW: 5,  light: "core",      target: 60 },
  lift:    { zone: "service", minW: 5,  light: "core",      target: 30 },
  reception: { zone: "public", minW: 9, light: "perimeter", target: 140 },
  cabin:   { zone: "private", minW: 8,  light: "perimeter", target: 100 },
  conference: { zone: "public", minW: 10, light: "perimeter", target: 180 },
  pantry:  { zone: "service", minW: 5,  light: "core",      target: 50 },
};
const V2SMALL = new Set(["bath", "store", "utility", "pooja"]);

function v2BuildableRect(points, sb) {
  const bb = bboxOf(points);
  return { x: bb.minX + sb.left, y: bb.minY + sb.front, w: (bb.maxX - bb.minX) - sb.left - sb.right, h: (bb.maxY - bb.minY) - sb.front - sb.rear };
}

// ---- point-in-polygon (ray casting) ----
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
// is an axis-aligned rect fully inside the polygon? (check corners + edge midpoints)
function rectInPoly(r, poly, pad = 0.4) {
  const x0 = r.x + pad, x1 = r.x + r.w - pad, y0 = r.y + pad, y1 = r.y + r.h - pad;
  if (x1 <= x0 || y1 <= y0) return false;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [mx, y0], [mx, y1], [x0, my], [x1, my]];
  return pts.every(p => pointInPoly(p[0], p[1], poly));
}
// largest axis-aligned rectangle that fits fully inside an (irregular/tilted) polygon.
// Strategy: seed a small valid square at the centroid, grow opposite-side PAIRS so the
// rect never collapses to a sliver, then fine-tune each side. Bounded iterations.
function largestInnerRect(poly) {
  const bb = bboxOf(poly);
  const W = bb.maxX - bb.minX, H = bb.maxY - bb.minY;
  let cx = 0, cy = 0; poly.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= poly.length; cy /= poly.length;
  if (!pointInPoly(cx, cy, poly)) { cx = (bb.minX + bb.maxX) / 2; cy = (bb.minY + bb.maxY) / 2; }
  let l = 1, r = 1, d = 1, u = 1;
  const mk = (l, r, d, u) => ({ x: cx - l, y: cy - d, w: l + r, h: d + u });
  if (!rectInPoly(mk(l, r, d, u), poly, 0)) return { x: cx - 1, y: cy - 1, w: 2, h: 2 };
  // Phase 1: grow horizontal pair and vertical pair together (keeps rect well-formed)
  let step = Math.max(2, Math.min(W, H) / 5), guard = 0;
  while (step > 0.4 && guard < 600) {
    let grew = true;
    while (grew && guard < 600) {
      grew = false; guard++;
      // try expand width (both l and r), then height (both d and u)
      if (rectInPoly(mk(l + step, r + step, d, u), poly, 0.3)) { l += step; r += step; grew = true; }
      if (rectInPoly(mk(l, r, d + step, u + step), poly, 0.3)) { d += step; u += step; grew = true; }
    }
    step /= 1.5;
  }
  // Phase 2: fine-tune each side independently to claim any remaining slack
  step = Math.max(1, Math.min(W, H) / 8); guard = 0;
  while (step > 0.3 && guard < 600) {
    let grew = true;
    while (grew && guard < 600) {
      grew = false; guard++;
      for (const side of ["l", "r", "d", "u"]) {
        let nl = l, nr = r, nd = d, nu = u;
        if (side === "l") nl += step; else if (side === "r") nr += step; else if (side === "d") nd += step; else nu += step;
        if (rectInPoly(mk(nl, nr, nd, nu), poly, 0.3)) { l = nl; r = nr; d = nd; u = nu; grew = true; }
      }
    }
    step /= 1.6;
  }
  return mk(l, r, d, u);
}

function v2Decompose(shapeType, points, sb, lMeta) {
  // DIAGONAL / IRREGULAR (quad) plots: the bbox rectangle does NOT match the tilted
  // boundary, so place the building inside the LARGEST rectangle that fits within the
  // real polygon, then inset by setbacks. Slanted leftover = open margin (architect approach).
  if (shapeType === "quad") {
    const inner = largestInnerRect(points);
    const minMargin = 1.5; // keep at least a small margin so walls sit inside the boundary
    const fl = Math.min(sb.front, inner.h * 0.25), rr = Math.min(sb.rear, inner.h * 0.25);
    const ll = Math.min(sb.left, inner.w * 0.25), rg = Math.min(sb.right, inner.w * 0.25);
    const build = { x: inner.x + Math.max(minMargin, ll), y: inner.y + Math.max(minMargin, fl),
      w: inner.w - Math.max(minMargin, ll) - Math.max(minMargin, rg), h: inner.h - Math.max(minMargin, fl) - Math.max(minMargin, rr) };
    if (build.w < 4 || build.h < 4) return { rects: [inner], open: [], kind: "quad" };
    return { rects: [build], open: [], kind: "quad" };
  }
  const build = v2BuildableRect(points, sb);
  if (shapeType !== "lshape" || !lMeta) return { rects: [build], open: [], kind: shapeType };
  const { W, D, nw, nd } = lMeta;
  const splitY = Math.max(build.y, D - nd);
  const bottom = { x: build.x, y: build.y, w: build.w, h: splitY - build.y };
  const topH = (build.y + build.h) - splitY;
  const topLeftW = (W - nw) - build.x;
  const topLeft = { x: build.x, y: splitY, w: Math.max(0, topLeftW), h: Math.max(0, topH) };
  const openRect = { x: W - nw, y: splitY, w: (build.x + build.w) - (W - nw), h: Math.max(0, topH), open: true };
  const rects = [bottom, topLeft].filter(r => r.w > 2 && r.h > 2);
  const open = (openRect.w > 2 && openRect.h > 2) ? [openRect] : [];
  return { rects, open, kind: "lshape" };
}

function v2Slice(rect, items, variant = 0, depth = 0) {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ ...items[0], rect: { ...rect } }];
  const total = items.reduce((a, b) => a + b.sqft, 0);
  // variant 2 shifts the split point (denser/looser) rather than flipping the axis,
  // which keeps every room — including the master — well-proportioned.
  let cutVertical = rect.w >= rect.h;
  const sideLen = cutVertical ? rect.w : rect.h, otherLen = cutVertical ? rect.h : rect.w;
  // variant 1 reverses room order so rooms land on opposite sides
  const sorted = variant === 1 ? [...items].reverse() : [...items];
  let acc = 0, splitIdx = 1, bestErr = Infinity;
  const splitTarget = variant === 2 ? 0.42 : 0.5; // v2 biases the cut for a different room rhythm
  for (let i = 1; i < sorted.length; i++) {
    acc += sorted[i - 1].sqft;
    const fA = acc / total, aLen = sideLen * fA, bLen = sideLen * (1 - fA);
    const arA = Math.max(aLen, otherLen) / Math.max(0.1, Math.min(aLen, otherLen));
    const arB = Math.max(bLen, otherLen) / Math.max(0.1, Math.min(bLen, otherLen));
    const err = Math.abs(fA - splitTarget) + (arA + arB) * 0.05;
    if (err < bestErr) { bestErr = err; splitIdx = i; }
  }
  splitIdx = Math.max(1, Math.min(sorted.length - 1, splitIdx));
  const A = sorted.slice(0, splitIdx), B = sorted.slice(splitIdx);
  let fracA = A.reduce((a, b) => a + b.sqft, 0) / total;
  const MINSTRIP = Math.min(6, sideLen * 0.28), minFrac = MINSTRIP / sideLen, maxFrac = 1 - minFrac;
  if (minFrac < maxFrac) fracA = Math.max(minFrac, Math.min(maxFrac, fracA));
  if (cutVertical) {
    const wA = rect.w * fracA;
    return [...v2Slice({ x: rect.x, y: rect.y, w: wA, h: rect.h }, A, variant, depth + 1), ...v2Slice({ x: rect.x + wA, y: rect.y, w: rect.w - wA, h: rect.h }, B, variant, depth + 1)];
  } else {
    const hA = rect.h * fracA;
    return [...v2Slice({ x: rect.x, y: rect.y, w: rect.w, h: hA }, A, variant, depth + 1), ...v2Slice({ x: rect.x, y: rect.y + hA, w: rect.w, h: rect.h - hA }, B, variant, depth + 1)];
  }
}

function v2CarveEnsuite(mp) {
  const r = mp.rect, MIN_EN_W = 4.5, MIN_BED_AFTER = 8.5;
  const longSide = Math.max(r.w, r.h), shortSide = Math.min(r.w, r.h);
  if (shortSide < MIN_BED_AFTER || longSide < MIN_EN_W + MIN_BED_AFTER) return [mp];
  let en = Math.max(MIN_EN_W, Math.min(V2SPEC.ensuite.target / shortSide, longSide * 0.32));
  if (longSide - en < MIN_BED_AFTER) en = longSide - MIN_BED_AFTER;
  if (r.w >= r.h) return [{ ...mp, rect: { x: r.x, y: r.y, w: r.w - en, h: r.h } }, { typeId: "ensuite", label: "Ensuite", rect: { x: r.x + (r.w - en), y: r.y, w: en, h: r.h }, bondedTo: "master", service: true }];
  return [{ ...mp, rect: { x: r.x, y: r.y + en, w: r.w, h: r.h - en } }, { typeId: "ensuite", label: "Ensuite", rect: { x: r.x, y: r.y, w: r.w, h: en }, bondedTo: "master", service: true }];
}

function v2PlaceFloor(decomp, rooms, variant = 0, corridorW = 3.5) {
  const enriched = rooms.map(r => ({ ...r, spec: V2SPEC[r.typeId] || V2SPEC.bed, zone: (V2SPEC[r.typeId] || V2SPEC.bed).zone }));
  const zones = { public: [], private: [], service: [] };
  enriched.forEach(r => zones[r.zone].push(r));
  const rects = decomp.rects, out = [];
  // VARIANT 3 = CORRIDOR PLAN: a central walkable hallway, every room opens onto it.
  // Used for single-rectangle buildable areas; multi-rect (L) falls through to zoned layout.
  if (variant === 3 && rects.length === 1) {
    const cr = v2PlaceCorridor(rects[0], rooms, corridorW);
    decomp.open.forEach(o => cr.push({ typeId: "garden", label: "Garden / Open", rect: { x: o.x, y: o.y, w: o.w, h: o.h }, open: true }));
    return cr;
  }
  const placeZoneRooms = (rect, roomList, vnt) => {
    if (roomList.length === 0) return;
    const bigRooms = roomList.filter(r => !V2SMALL.has(r.typeId));
    const smallRooms = roomList.filter(r => V2SMALL.has(r.typeId));
    const sizeOf = (r) => Math.max(r.spec.minW * r.spec.minW, r.spec.target);
    let bigItems = bigRooms.map(r => ({ typeId: r.typeId, label: r.label || r.typeId, sqft: sizeOf(r) }));
    let smallItems = smallRooms.map(r => ({ typeId: r.typeId, label: r.label || r.typeId, sqft: sizeOf(r), minW: r.spec.minW }));
    let bigRect = { ...rect };
    if (smallItems.length > 0) {
      const smallSum = smallItems.reduce((a, x) => a + x.sqft, 0);
      const alongX = rect.w >= rect.h, wallLen = alongX ? rect.w : rect.h;
      let bandDepth = Math.max(5.5, smallSum / wallLen);
      bandDepth = Math.min(bandDepth, (alongX ? rect.h : rect.w) * 0.42);
      const neededLen = Math.min(wallLen, smallSum / bandDepth);
      // variant decides which edge the service band sits on (top vs bottom / left vs right)
      const bandAtFar = (vnt === 2);
      if (alongX) {
        const bandY = bandAtFar ? (rect.y + rect.h - bandDepth) : rect.y;
        let cx = rect.x; const perScale = neededLen / smallItems.reduce((a, x) => a + x.sqft / bandDepth, 0);
        smallItems.forEach(it => { const w = (it.sqft / bandDepth) * perScale; out.push({ typeId: it.typeId, label: it.label, rect: { x: cx, y: bandY, w, h: bandDepth }, service: true }); cx += w; });
        if (neededLen < rect.w - 2) out.push({ typeId: "hall", label: "Hall", rect: { x: rect.x + neededLen, y: bandY, w: rect.w - neededLen, h: bandDepth }, isHall: true });
        bigRect = { x: rect.x, y: bandAtFar ? rect.y : rect.y + bandDepth, w: rect.w, h: rect.h - bandDepth };
      } else {
        const bandX = bandAtFar ? (rect.x + rect.w - bandDepth) : rect.x;
        let cy = rect.y; const perScale = neededLen / smallItems.reduce((a, x) => a + x.sqft / bandDepth, 0);
        smallItems.forEach(it => { const h = (it.sqft / bandDepth) * perScale; out.push({ typeId: it.typeId, label: it.label, rect: { x: bandX, y: cy, w: bandDepth, h }, service: true }); cy += h; });
        if (neededLen < rect.h - 2) out.push({ typeId: "hall", label: "Hall", rect: { x: bandX, y: rect.y + neededLen, w: bandDepth, h: rect.h - neededLen }, isHall: true });
        bigRect = { x: bandAtFar ? rect.x : rect.x + bandDepth, y: rect.y, w: rect.w - bandDepth, h: rect.h };
      }
    }
    const bigArea = bigRect.w * bigRect.h;
    let bigSum = bigItems.reduce((a, x) => a + x.sqft, 0);
    if (bigSum > bigArea) {
      const sc = bigArea / bigSum; bigItems.forEach(it => it.sqft *= sc);
    } else {
      const leftover = bigArea - bigSum;
      const growCap = bigItems.reduce((a, x) => a + x.sqft * 0.6, 0);
      const grow = Math.min(leftover, growCap);
      if (grow > 0 && bigSum > 0) { const gf = (bigSum + grow) / bigSum; bigItems.forEach(it => it.sqft *= gf); bigSum += grow; }
      const stillLeft = bigArea - bigSum;
      if (stillLeft > bigArea * 0.06) bigItems.push({ typeId: "hall", label: "Hall", sqft: stillLeft, isHall: true });
      else { const sc = bigArea / bigSum; bigItems.forEach(it => it.sqft *= sc); }
    }
    if (bigItems.length === 0) return;
    v2Slice(bigRect, bigItems, vnt).forEach(p => {
      if (p.typeId === "master" && V2SPEC.master.ensuite) v2CarveEnsuite(p).forEach(q => out.push(q));
      else out.push(p);
    });
  };
  if (rects.length >= 2) {
    placeZoneRooms(rects[1], zones.private, variant);
    placeZoneRooms(rects[0], [...zones.public, ...zones.service], variant);
  } else {
    const r = rects[0] || { x: 0, y: 0, w: 1, h: 1 };
    const privSq = zones.private.reduce((a, x) => a + (V2SPEC[x.typeId] || V2SPEC.bed).target, 0) + V2SPEC.ensuite.target;
    const pubSq = [...zones.public, ...zones.service].reduce((a, x) => a + (V2SPEC[x.typeId] || V2SPEC.bed).target, 0);
    const totalSq = privSq + pubSq || 1, privFrac = Math.max(0.32, Math.min(0.6, privSq / totalSq));
    if (variant === 1) {
      // VARIANT B: vertical split — private zone on the LEFT, public+service on the RIGHT
      const privW = r.w * privFrac;
      placeZoneRooms({ x: r.x, y: r.y, w: privW, h: r.h }, zones.private, variant);
      placeZoneRooms({ x: r.x + privW, y: r.y, w: r.w - privW, h: r.h }, [...zones.public, ...zones.service], variant);
    } else {
      // VARIANT A (0) & C (2): horizontal split — private at back (high y), public at front.
      // C differs via service-band-on-far-edge + flipped slice axis inside v2Slice.
      const privH = r.h * privFrac;
      placeZoneRooms({ x: r.x, y: r.y + (r.h - privH), w: r.w, h: privH }, zones.private, variant);
      placeZoneRooms({ x: r.x, y: r.y, w: r.w, h: r.h - privH }, [...zones.public, ...zones.service], variant);
    }
  }
  decomp.open.forEach(o => out.push({ typeId: "garden", label: "Garden / Open", rect: { x: o.x, y: o.y, w: o.w, h: o.h }, open: true }));
  return out;
}

// ===== CIRCULATION SPINE: double-loaded central corridor (every room reaches a walkable hall) =====
const V2ZONE_ORDER = { public: 0, service: 1, private: 2 };
function v2SliceColumn(colRect, items) {
  const totalA = items.reduce((a, b) => a + b.sqft, 0) || 1;
  const MINH = 5;
  let heights = items.map(it => Math.max(MINH, colRect.h * (it.sqft / totalA)));
  let hSum = heights.reduce((a, b) => a + b, 0) || 1;
  heights = heights.map(h => h * colRect.h / hSum);
  let cy = colRect.y, out = [];
  items.forEach((it, idx) => {
    let h = (idx === items.length - 1) ? (colRect.y + colRect.h - cy) : heights[idx];
    out.push({ typeId: it.typeId, label: it.label, rect: { x: colRect.x, y: cy, w: colRect.w, h } });
    cy += h;
  });
  return out;
}
function v2CarveEnsuiteCol(mp, corridorOnRight) {
  const r = mp.rect, MIN_EN_W = 4.5, MIN_BED_AFTER = 8.5;
  const longSide = Math.max(r.w, r.h), shortSide = Math.min(r.w, r.h);
  if (shortSide < MIN_BED_AFTER || longSide < MIN_EN_W + MIN_BED_AFTER) return [mp];
  let en = Math.max(MIN_EN_W, Math.min(40 / shortSide, longSide * 0.32));
  if (longSide - en < MIN_BED_AFTER) en = longSide - MIN_BED_AFTER;
  if (r.h >= MIN_EN_W + MIN_BED_AFTER) {
    return [{ ...mp, rect: { x: r.x, y: r.y, w: r.w, h: r.h - en } }, { typeId: "ensuite", label: "Ensuite", rect: { x: r.x, y: r.y + r.h - en, w: r.w, h: en }, service: true, bondedTo: "master" }];
  }
  if (corridorOnRight) return [{ ...mp, rect: { x: r.x + en, y: r.y, w: r.w - en, h: r.h } }, { typeId: "ensuite", label: "Ensuite", rect: { x: r.x, y: r.y, w: en, h: r.h }, service: true, bondedTo: "master" }];
  return [{ ...mp, rect: { x: r.x, y: r.y, w: r.w - en, h: r.h } }, { typeId: "ensuite", label: "Ensuite", rect: { x: r.x + r.w - en, y: r.y, w: en, h: r.h }, service: true, bondedTo: "master" }];
}
function v2PlaceCorridor(rect, rooms, cw = 3.5) {
  const out = [];
  const enriched = rooms.map(r => ({ ...r, spec: V2SPEC[r.typeId] || V2SPEC.bed, zone: (V2SPEC[r.typeId] || V2SPEC.bed).zone }));
  enriched.sort((a, b) => V2ZONE_ORDER[a.zone] - V2ZONE_ORDER[b.zone]);
  const sizeOf = r => Math.max(r.spec.minW * r.spec.minW, r.spec.target);
  const items = enriched.map(r => ({ typeId: r.typeId, label: r.label || r.typeId, sqft: sizeOf(r), zone: r.zone }));

  const colW = (rect.w - cw) / 2;
  const NICHE = new Set(["store", "pooja"]);
  if (colW < 8) {
    // narrow -> single-loaded corridor on the left
    out.push({ typeId: "corridor", label: "Corridor", rect: { x: rect.x, y: rect.y, w: cw, h: rect.h }, isHall: true, isCorridor: true });
    const colX = rect.x + cw, colWid = rect.w - cw;
    const bigI = items.filter(it => !NICHE.has(it.typeId)), smallI = items.filter(it => NICHE.has(it.typeId));
    let backBand = 0;
    if (smallI.length) {
      const ss = smallI.reduce((a, b) => a + b.sqft, 0);
      let bandH = Math.min(Math.max(5.5, ss / colWid), rect.h * 0.34); backBand = bandH;
      const bandY = rect.y + rect.h - bandH; let cx2 = colX;
      const tot = smallI.reduce((a, b) => a + b.sqft / bandH, 0) || 1, sc = colWid / tot;
      smallI.forEach(it => { const w = (it.sqft / bandH) * sc; out.push({ typeId: it.typeId, label: it.label, rect: { x: cx2, y: bandY, w, h: bandH }, service: true }); cx2 += w; });
    }
    v2SliceColumn({ x: colX, y: rect.y, w: colWid, h: rect.h - backBand }, bigI).forEach(p => { if (p.typeId === "master") v2CarveEnsuiteCol(p, false).forEach(q => out.push(q)); else out.push(p); });
    return out;
  }
  const bigItems = items.filter(it => !NICHE.has(it.typeId)), smallItems = items.filter(it => NICHE.has(it.typeId));
  const left = [], right = []; let la = 0, ra = 0;
  bigItems.forEach(it => { if (la <= ra) { left.push(it); la += it.sqft; } else { right.push(it); ra += it.sqft; } });
  const corridorX = rect.x + colW;
  out.push({ typeId: "corridor", label: "Corridor", rect: { x: corridorX, y: rect.y, w: cw, h: rect.h }, isHall: true, isCorridor: true });
  let leftBackBand = 0;
  if (smallItems.length) {
    const ss = smallItems.reduce((a, b) => a + b.sqft, 0);
    let bandH = Math.min(Math.max(5, ss / colW), rect.h * 0.32); leftBackBand = bandH;
    const bandY = rect.y + rect.h - bandH; let cyy = bandY;
    const tot = smallItems.reduce((a, b) => a + b.sqft / colW, 0) || 1, sc = bandH / tot;
    smallItems.forEach(it => { const h = (it.sqft / colW) * sc; out.push({ typeId: it.typeId, label: it.label, rect: { x: rect.x, y: cyy, w: colW, h }, service: true }); cyy += h; });
  }
  v2SliceColumn({ x: rect.x, y: rect.y, w: colW, h: rect.h - leftBackBand }, left).forEach(p => { if (p.typeId === "master") v2CarveEnsuiteCol(p, true).forEach(q => out.push(q)); else out.push(p); });
  v2SliceColumn({ x: corridorX + cw, y: rect.y, w: colW, h: rect.h }, right).forEach(p => { if (p.typeId === "master") v2CarveEnsuiteCol(p, false).forEach(q => out.push(q)); else out.push(p); });
  return out;
}

// adapter: run v2 engine and return rooms in the px/py/pw/ph format SliceView + vastuScore expect
function sliceLayoutV2(points, facing, rooms, cores, shapeType, sb, lMeta, variant = 0, corridorW = 3.5) {
  // fold cores (stairs/lift/etc) into the room list so they get placed too
  const coreRooms = (cores || []).map(c => ({ typeId: c.id || c.typeId || "stairs", sqft: Math.max(20, c.sqft || 60), label: c.label }));
  const allRooms = [...rooms, ...coreRooms];
  const decomp = v2Decompose(shapeType, points, sb, lMeta);
  const placed = v2PlaceFloor(decomp, allRooms, variant, corridorW);
  // place cores (stairs/lift) into the first buildable rect's corner as a small reserved block
  const out = placed.map(p => {
    let meta = ROOMS[p.typeId];
    if (p.typeId === "ensuite") meta = { label: "Ensuite", color: ROOMS.bath.color, icon: ROOMS.bath.icon };
    else if (p.typeId === "kids") meta = ROOMS.bed ? { label: "Kids Room", color: ROOMS.bed.color, icon: ROOMS.bed.icon } : null;
    else if (p.typeId === "stairs" && typeof CORE !== "undefined") meta = { label: "Staircase", color: CORE.stairs.color, icon: CORE.stairs.icon };
    else if (p.typeId === "lift" && typeof CORE !== "undefined") meta = { label: "Lift", color: CORE.lift.color, icon: CORE.lift.icon };
    if (!meta) meta = p.isCorridor ? { label: "Corridor", color: "#D8D8D2", icon: "" } : p.isHall ? { label: "Hall", color: "#C9C9C2", icon: "" } : p.open ? { label: "Open", color: "#86B049", icon: "🌳" } : { label: p.typeId, color: "#9AA0A6", icon: "" };
    return { typeId: p.typeId, label: p.label || meta.label, color: meta.color, icon: meta.icon, service: p.service, isHall: p.isHall, isCorridor: p.isCorridor, open: p.open, bondedTo: p.bondedTo,
      px: p.rect.x, py: p.rect.y, pw: p.rect.w, ph: p.rect.h, wFt: Math.round(p.rect.w), hFt: Math.round(p.rect.h) };
  });
  return { rooms: out, decomp };
}

function sliceLayout(points, facing, rooms, cores, variant = 0) {
  if (!points) return [];
  const grid = rotatedGrid(facing);
  const bb = bboxOf(points);
  const rect = { x: bb.minX, y: bb.minY, w: bb.maxX - bb.minX, h: bb.maxY - bb.minY };
  // build items: cores + rooms, each with an anchor and area
  const items = [];
  cores.forEach(c => items.push({ ...c, typeId: c.id || c.typeId, label: c.label, color: c.color, icon: c.icon, sqft: Math.max(20, c.sqft), anchor: roomAnchor(c.id || c.typeId, grid), isCore: true }));
  rooms.forEach(r => {
    const meta = ROOMS[r.typeId];
    items.push({ ...meta, typeId: r.typeId, sqft: Math.max(20, r.sqft), uid: r.uid, label: r.customLabel || meta.label, color: meta.color, icon: meta.icon, anchor: roomAnchor(r.typeId, grid) });
  });
  if (items.length === 0) return [];
  const sliced = sliceRooms(rect, items, variant);
  // attach real dimensions (feet) — plot units are already feet in this app
  return sliced.map(s => ({
    ...s,
    px: s.rect.x, py: s.rect.y, pw: s.rect.w, ph: s.rect.h,
    wFt: Math.round(s.rect.w), hFt: Math.round(s.rect.h),
  }));
}

// ===== APARTMENT ENGINE: divide floor into N flat-zones, slice each flat independently =====
function sliceApartmentLayout(points, facing, rooms, cores, variant = 0) {
  if (!points) return [];
  const grid = rotatedGrid(facing);
  const bb = bboxOf(points);
  const full = { x: bb.minX, y: bb.minY, w: bb.maxX - bb.minX, h: bb.maxY - bb.minY };
  // group rooms by flatId
  const flatIds = [...new Set(rooms.map(r => r.flatId).filter(Boolean))].sort((a, b) => a - b);
  if (flatIds.length === 0) return sliceLayout(points, facing, rooms, cores, variant); // fallback

  const out = [];
  // reserve a corridor + staircase strip along one edge (the entry/front side = low y)
  const coreSqft = cores.reduce((a, c) => a + Math.max(20, c.sqft), 0);
  const corridorFrac = Math.min(0.22, Math.max(0.10, (coreSqft / (full.w * full.h)) + 0.06));
  // decide split orientation: divide flats along the longer axis for better proportions
  const flatsAlongX = full.w >= full.h;
  // corridor runs along the bottom (low y), flats sit above it
  const corridorH = full.h * corridorFrac;
  const corridorRect = { x: full.x, y: full.y, w: full.w, h: corridorH };
  const flatsArea = { x: full.x, y: full.y + corridorH, w: full.w, h: full.h - corridorH };

  // place cores (staircase/lift) inside the corridor strip
  let cx = corridorRect.x;
  cores.forEach(c => {
    const cw = Math.max(20, c.sqft) / Math.max(1, corridorRect.h);
    out.push({ ...c, typeId: c.id || c.typeId, label: c.label, color: c.color, icon: c.icon, isCore: true, rect: { x: cx, y: corridorRect.y, w: Math.min(cw, corridorRect.w), h: corridorRect.h }, px: cx, py: corridorRect.y, pw: Math.min(cw, corridorRect.w), ph: corridorRect.h, wFt: Math.round(Math.min(cw, corridorRect.w)), hFt: Math.round(corridorRect.h) });
    cx += cw;
  });
  // a corridor label block (the remaining corridor space)
  if (cx < corridorRect.x + corridorRect.w - 2) {
    out.push({ typeId: "corridor", label: "Common Corridor", color: "#A0A09A", icon: "🚶", rect: { x: cx, y: corridorRect.y, w: corridorRect.x + corridorRect.w - cx, h: corridorRect.h }, px: cx, py: corridorRect.y, pw: corridorRect.x + corridorRect.w - cx, ph: corridorRect.h, wFt: Math.round(corridorRect.x + corridorRect.w - cx), hFt: Math.round(corridorRect.h), isCorridor: true });
  }

  // divide the flats area into N equal zones, one per flat
  const n = flatIds.length;
  flatIds.forEach((fid, idx) => {
    const flatRooms = rooms.filter(r => r.flatId === fid);
    let zone;
    if (flatsAlongX) {
      const zw = flatsArea.w / n;
      zone = { x: flatsArea.x + idx * zw, y: flatsArea.y, w: zw, h: flatsArea.h };
    } else {
      const zh = flatsArea.h / n;
      zone = { x: flatsArea.x, y: flatsArea.y + idx * zh, w: flatsArea.w, h: zh };
    }
    // slice this flat's rooms within its own zone (independent layout)
    const items = flatRooms.map(r => {
      const meta = ROOMS[r.typeId];
      return { ...meta, typeId: r.typeId, sqft: Math.max(20, r.sqft), uid: r.uid, flatId: fid, label: r.customLabel || meta.label, color: meta.color, icon: meta.icon, anchor: roomAnchor(r.typeId, grid) };
    });
    const sliced = sliceRooms(zone, items, variant);
    sliced.forEach(s => out.push({ ...s, px: s.rect.x, py: s.rect.y, pw: s.rect.w, ph: s.rect.h, wFt: Math.round(s.rect.w), hFt: Math.round(s.rect.h) }));
  });
  return out;
}

// ===== SLICING-TREE RENDERER (Stage 1: clean tiled rooms) =====
// ===== VASTU COMPLIANCE SCORING (giant-designer honesty) =====
// Determines which compass zone a room's CENTER falls in, given the plot facing,
// then scores each room against its ideal Vastu zone. Practicality-aware: it scores
// honestly and explains compromises rather than pretending every layout is perfect.

// ideal zones + the zones to AVOID for each room type (from real Vastu practice)
const VASTU_RULES = {
  kitchen: { ideal: ["SE"], ok: ["E", "S", "NW"], avoid: ["NE", "SW"], weight: 3, label: "Kitchen" },
  master:  { ideal: ["SW"], ok: ["S", "W"], avoid: ["NE"], weight: 3, label: "Master bedroom" },
  pooja:   { ideal: ["NE"], ok: ["E", "N"], avoid: ["S", "SW"], weight: 2, label: "Pooja room" },
  bath:    { ideal: ["NW", "W"], ok: ["S", "SE"], avoid: ["NE", "SW", "C"], weight: 2, label: "Bathroom" },
  living:  { ideal: ["NE", "N", "E"], ok: ["C"], avoid: ["SW"], weight: 2, label: "Living room" },
  bed:     { ideal: ["W", "NW", "S"], ok: ["SE", "SW"], avoid: ["NE"], weight: 1, label: "Bedroom" },
  dining:  { ideal: ["W", "NW"], ok: ["E", "C"], avoid: [], weight: 1, label: "Dining" },
  store:   { ideal: ["SW", "S"], ok: ["W", "NW"], avoid: ["NE"], weight: 1, label: "Store" },
  stairs:  { ideal: ["SW", "S", "W"], ok: ["NW", "C"], avoid: ["NE"], weight: 1, label: "Staircase" },
  park:    { ideal: ["NW", "SE"], ok: ["N", "E"], avoid: [], weight: 1, label: "Parking" },
  garden:  { ideal: ["NE", "N", "E"], ok: [], avoid: ["SW"], weight: 1, label: "Garden" },
};

// which compass zone does a point (px,py) fall in, within the bbox, accounting for facing rotation
function zoneOfPoint(px, py, bb, grid) {
  const bw = bb.maxX - bb.minX || 1, bh = bb.maxY - bb.minY || 1;
  const col = Math.min(2, Math.max(0, Math.floor(((px - bb.minX) / bw) * 3)));
  // row: 0 = top = NORTH (high y). py is plot coord (y up). top row = high y.
  const rowFromTop = Math.min(2, Math.max(0, Math.floor(((bb.maxY - py) / bh) * 3)));
  return grid[rowFromTop][col];
}

function vastuScore(placedRooms, facing, points) {
  if (!points || !placedRooms || placedRooms.length === 0) return null;
  const grid = rotatedGrid(facing);
  const bb = bboxOf(points);
  let totalWeight = 0, earned = 0;
  const aligned = [], compromised = [];
  let waterFireConflict = false;
  const cornerOf = {}; // track NE corner occupants for water/fire rule

  placedRooms.forEach(r => {
    const rule = VASTU_RULES[r.typeId];
    if (!rule) return;
    const cx = r.px + r.pw / 2, cy = r.py + r.ph / 2;
    const zone = zoneOfPoint(cx, cy, bb, grid);
    totalWeight += rule.weight;
    let pts;
    if (rule.ideal.includes(zone)) { pts = rule.weight; aligned.push({ label: rule.label, zone }); }
    else if (rule.ok.includes(zone)) { pts = rule.weight * 0.6; }
    else if (rule.avoid.includes(zone)) { pts = 0; compromised.push({ label: rule.label, zone, want: rule.ideal[0] }); }
    else { pts = rule.weight * 0.3; }
    earned += pts;
    // water/fire corner check: kitchen (fire) and bath (water) should not share a corner zone
    if (r.typeId === "kitchen") cornerOf.fire = zone;
    if (r.typeId === "bath") cornerOf.water = zone;
  });

  if (cornerOf.fire && cornerOf.water && cornerOf.fire === cornerOf.water) waterFireConflict = true;
  let score = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;
  if (waterFireConflict) score = Math.max(0, score - 8);
  score = Math.max(35, Math.min(98, score)); // realistic band — never claim perfect or zero
  return { score, aligned, compromised, waterFireConflict };
}


function SliceView({ points, rooms, facing, gates }) {
  const M = 46; // margin for dimension lines + labels
  const W = 360, H = 360;
  if (!points) return null;
  const bb = bboxOf(points);
  const bw = bb.maxX - bb.minX || 1, bh = bb.maxY - bb.minY || 1;
  const scale = Math.min((W - 2 * M) / bw, (H - 2 * M) / bh);
  const drawW = bw * scale, drawH = bh * scale;
  const offX = (W - drawW) / 2, offY = (H - drawH) / 2;
  const sx = x => (x - bb.minX) * scale + offX;
  const sy = y => (bb.maxY - y) * scale + offY;
  const EXT = 5, INT = 2; // wall thicknesses (px)
  const ft = (n) => Math.round(n); // plot units are feet

  // building outline in screen coords
  const oL = sx(bb.minX), oR = sx(bb.maxX), oT = sy(bb.maxY), oB = sy(bb.minY);

  // entrance side: which gate -> which edge of the drawing. front=bottom, rear=top, left=left, right=right
  const gateSide = gates ? (gates.front ? "front" : gates.left ? "left" : gates.right ? "right" : gates.rear ? "rear" : "front") : "front";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.border}`, display: "block", margin: "0 auto", maxWidth: W, height: "auto" }}>
      {/* room fills + interior walls */}
      {rooms.map((r, i) => {
        const x = sx(r.px), y = sy(r.py + r.ph), w = r.pw * scale, h = r.ph * scale;
        const safeCol = (r.color && /^#[0-9A-Fa-f]{6}$/.test(r.color)) ? r.color : "#9AA0A6";
        const fillCol = r.open ? "#86B04924" : r.isHall ? "#EFEFEA" : safeCol + "1E";
        const strokeCol = r.open ? "#86B049" : "#3A3A3A";
        const dash = r.open ? "4 3" : "none";
        return (
          <g key={"f" + i}>
            <rect x={x} y={y} width={w} height={h} fill={fillCol} stroke={strokeCol} strokeWidth={INT} strokeDasharray={dash} />
          </g>
        );
      })}
      {/* thick exterior wall — drawn as the REAL plot polygon (handles L-shape etc.) */}
      <polygon points={points.map(p => `${sx(p[0])},${sy(p[1])}`).join(" ")} fill="none" stroke="#1A1A1A" strokeWidth={EXT} strokeLinejoin="round" />

      {/* FLAT BOUNDARIES: draw a thick wall around each flat group (apartments) */}
      {(() => {
        const flatIds = [...new Set(rooms.map(r => r.flatId).filter(Boolean))];
        if (flatIds.length === 0) return null;
        return flatIds.map(fid => {
          const fr = rooms.filter(r => r.flatId === fid);
          if (fr.length === 0) return null;
          const minX = Math.min(...fr.map(r => r.px));
          const maxX = Math.max(...fr.map(r => r.px + r.pw));
          const minY = Math.min(...fr.map(r => r.py));
          const maxY = Math.max(...fr.map(r => r.py + r.ph));
          const x = sx(minX), y = sy(maxY), w = (maxX - minX) * scale, h = (maxY - minY) * scale;
          return (
            <g key={"flat" + fid}>
              <rect x={x} y={y} width={w} height={h} fill="none" stroke="#1A1A1A" strokeWidth={EXT - 1} />
              <text x={x + 4} y={y + 11} fontSize={7.5} fontWeight={800} fill={C.accent}>FLAT {fid}</text>
            </g>
          );
        });
      })()}

      {/* DOORS: a gap + swing arc on the wall facing the building interior */}
      {rooms.filter(r => !["park", "garden", "balcony", "court", "shaft", "terrace"].includes(r.typeId)).map((r, i) => {
        const x = sx(r.px), y = sy(r.py + r.ph), w = r.pw * scale, h = r.ph * scale;
        if (w < 18 || h < 18) return null;
        const bcx = (oL + oR) / 2, bcy = (oT + oB) / 2;
        const rcx = x + w / 2, rcy = y + h / 2;
        // pick the wall edge facing the building center
        const dxC = bcx - rcx, dyC = bcy - rcy;
        const doorLen = Math.min(16, Math.min(w, h) * 0.45);
        let hx, hy, ax, ay, sweep; // hinge point, arc end
        if (Math.abs(dxC) > Math.abs(dyC)) {
          // door on left or right wall
          const wallX = dxC > 0 ? x + w : x;
          hy = rcy - doorLen / 2;
          hx = wallX;
          ax = wallX + (dxC > 0 ? doorLen : -doorLen);
          ay = hy;
          return <g key={"d" + i} stroke={C.muted} strokeWidth={1} fill="none">
            <line x1={wallX} y1={rcy - doorLen / 2} x2={wallX} y2={rcy + doorLen / 2} stroke="#fff" strokeWidth={INT + 1.5} />
            <path d={`M ${hx} ${rcy + doorLen / 2} A ${doorLen} ${doorLen} 0 0 ${dxC > 0 ? 0 : 1} ${ax} ${ay + doorLen / 2}`} />
          </g>;
        } else {
          // door on top or bottom wall
          const wallY = dyC > 0 ? y + h : y;
          hx = rcx - doorLen / 2;
          return <g key={"d" + i} stroke={C.muted} strokeWidth={1} fill="none">
            <line x1={rcx - doorLen / 2} y1={wallY} x2={rcx + doorLen / 2} y2={wallY} stroke="#fff" strokeWidth={INT + 1.5} />
            <path d={`M ${rcx + doorLen / 2} ${wallY} A ${doorLen} ${doorLen} 0 0 ${dyC > 0 ? 1 : 0} ${rcx - doorLen / 2 + doorLen} ${wallY + (dyC > 0 ? doorLen : -doorLen)}`} />
          </g>;
        }
      })}

      {/* FURNITURE & FIXTURES: simple architectural symbols drawn inside each room */}
      {rooms.map((r, i) => {
        if (r.open || r.isHall) return null;
        const rx = sx(r.px), ry = sy(r.py + r.ph), rw = r.pw * scale, rh = r.ph * scale;
        if (rw < 24 || rh < 20) return null; // too small to furnish legibly
        const t = r.typeId;
        const FL = "#8A9099", FS = 0.9; // furniture line color + stroke
        const pad = Math.min(rw, rh) * 0.1;
        const topGap = Math.min(20, rh * 0.2); // leave space under the room label at the top
        const els = [];
        const rect = (x, y, w, h, fill = "none", extra = {}) => els.push(<rect key={els.length} x={x} y={y} width={w} height={h} fill={fill} stroke={FL} strokeWidth={FS} {...extra} />);
        const line = (x1, y1, x2, y2) => els.push(<line key={els.length} x1={x1} y1={y1} x2={x2} y2={y2} stroke={FL} strokeWidth={FS} />);
        const circ = (cx, cy, rr) => els.push(<circle key={els.length} cx={cx} cy={cy} r={rr} fill="none" stroke={FL} strokeWidth={FS} />);
        const cx = rx + rw / 2, cy = ry + rh / 2;

        if (t === "master" || t === "bed" || t === "kids" || t === "guest") {
          // bed sits against the LEFT wall below the label; wardrobe strip on the right wall
          const bw = Math.min(rw * 0.46, (rh - topGap) * 0.7), bh = Math.min((rh - topGap) * 0.74, bw * 1.35);
          const bx = rx + pad, by = ry + topGap;
          rect(bx, by, bw, bh, "#8A909914"); // mattress
          rect(bx, by, bw, bh * 0.16, "#8A909928"); // headboard band at top
          line(bx + bw * 0.5, by + bh * 0.16, bx + bw * 0.5, by + bh); // split into two halves (pillows direction)
          if (rw > bw + pad * 3.5) rect(rx + rw - pad - Math.min(11, rw * 0.13), ry + topGap, Math.min(11, rw * 0.13), (rh - topGap) * 0.55, "#8A90991F"); // wardrobe
        } else if (t === "living" || t === "reception") {
          // sofa against bottom wall, coffee table above it, TV unit on the right wall
          const sofaW = Math.min(rw * 0.5, 40), sofaH = Math.max(7, rh * 0.15);
          rect(rx + pad, ry + rh - pad - sofaH, sofaW, sofaH, "#8A90991F"); // sofa
          line(rx + pad, ry + rh - pad - sofaH * 0.55, rx + pad + sofaW, ry + rh - pad - sofaH * 0.55); // seat line
          rect(rx + pad + sofaW * 0.18, ry + rh - pad - sofaH - rh * 0.13, sofaW * 0.5, rh * 0.08, "none"); // coffee table
          rect(rx + rw - pad - Math.max(4, rw * 0.05), ry + rh * 0.3, Math.max(4, rw * 0.05), rh * 0.32, "#8A909928"); // TV unit on right wall
        } else if (t === "kitchen" || t === "pantry") {
          // L-counter along top + left wall, with sink and stove burners
          const cd = Math.max(6, Math.min(rw, rh) * 0.16);
          rect(rx + pad, ry + topGap, rw - pad * 2, cd, "#8A909928"); // top counter run
          rect(rx + pad, ry + topGap, cd, rh - topGap - pad, "#8A909928"); // left counter run
          circ(rx + pad + cd / 2, ry + topGap + (rh - topGap) * 0.45, cd * 0.3); // sink on left run
          const stoveX = rx + pad + (rw - pad * 2) * 0.6;
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([ox, oy]) => circ(stoveX + ox * cd * 0.22, ry + topGap + cd / 2 + oy * cd * 0.22, cd * 0.1)); // burners
        } else if (t === "bath" || t === "ensuite") {
          // WC + basin + shower square (if room large enough)
          const u = Math.max(5, Math.min(rw, rh) * 0.28);
          els.push(<rect key={els.length} x={rx + pad} y={ry + rh - pad - u} width={u * 0.7} height={u} rx={u * 0.25} fill="#8A909914" stroke={FL} strokeWidth={FS} />); // WC
          circ(rx + rw - pad - u * 0.4, ry + topGap + u * 0.4, u * 0.35); // basin top-right
          if (rw > u * 2.4 && rh > u * 2) { rect(rx + rw - pad - u, ry + rh - pad - u, u, u, "#8A909914"); line(rx + rw - pad - u, ry + rh - pad - u, rx + rw - pad, ry + rh - pad); } // shower
        } else if (t === "dining") {
          // table center + chairs
          const tw = rw * 0.4, th = rh * 0.3;
          rect(cx - tw / 2, cy - th / 2, tw, th, "#9AA0A618");
          [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([ox, oy]) => rect(cx + ox * (tw / 2 + 3) - 2.5, cy + oy * (th / 2 + 3) - 2.5, 5, 5, "none"));
        } else if (t === "pooja") {
          rect(cx - rw * 0.18, ry + pad, rw * 0.36, Math.max(4, rh * 0.12), "#9AA0A622"); // altar shelf
        } else if (t === "store" || t === "utility") {
          rect(rx + pad, ry + pad, rw - pad * 2, Math.max(4, rh * 0.14), "#9AA0A618"); // shelf
          if (t === "utility") circ(cx, cy + rh * 0.15, Math.min(rw, rh) * 0.16); // washer drum
        } else if (t === "office" || t === "cabin" || t === "conference") {
          const tw = rw * 0.5, th = rh * 0.22;
          rect(cx - tw / 2, cy - th / 2, tw, th, "#9AA0A618"); // desk/table
        } else if (t === "park") {
          // parking: car outline
          const cw = Math.min(rw * 0.5, rh * 0.85), ch = cw * 0.45;
          els.push(<rect key={els.length} x={cx - cw / 2} y={cy - ch / 2} width={cw} height={ch} rx={ch * 0.25} fill="none" stroke={FL} strokeWidth={FS} />);
        }
        return <g key={"furn" + i}>{els}</g>;
      })}

      {/* WINDOWS: short breaks on exterior walls for perimeter habitable rooms */}
      {rooms.map((r, i) => {
        if (r.open || r.isHall) return null;
        const habitable = ["master", "bed", "kids", "guest", "living", "kitchen", "dining", "office", "cabin", "reception", "conference"].includes(r.typeId);
        if (!habitable) return null;
        const x = sx(r.px), y = sy(r.py + r.ph), w = r.pw * scale, h = r.ph * scale;
        const eps = 1.2;
        const wins = [];
        const onLeft = Math.abs(r.px - bb.minX) < eps;
        const onRight = Math.abs((r.px + r.pw) - bb.maxX) < eps;
        const onBottom = Math.abs(r.py - bb.minY) < eps;
        const onTop = Math.abs((r.py + r.ph) - bb.maxY) < eps;
        const win = (x1, y1, x2, y2) => {
          wins.push(<line key={wins.length} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth={EXT} />);
          wins.push(<line key={wins.length} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.accent} strokeWidth={1.4} />);
        };
        if (onTop && w > 24) win(x + w * 0.32, y, x + w * 0.68, y);
        if (onBottom && w > 24) win(x + w * 0.32, y + h, x + w * 0.68, y + h);
        if (onLeft && h > 24) win(x, y + h * 0.32, x, y + h * 0.68);
        if (onRight && h > 24) win(x + w, y + h * 0.32, x + w, y + h * 0.68);
        return wins.length ? <g key={"win" + i}>{wins}</g> : null;
      })}

      {/* room labels: name + real dimensions — placed at the TOP of the room so furniture below stays legible */}
      {rooms.map((r, i) => {
        const x = sx(r.px), y = sy(r.py + r.ph), w = r.pw * scale, h = r.ph * scale;
        const name = (r.label || "").replace(" Room", "").replace("Bedroom", "Bed");
        const showName = w > 40 && h > 28;
        const showDim = w > 50 && h > 46;
        const showIcon = w > 26 && h > 20;
        const labelY = y + Math.min(16, h * 0.16); // near the top edge
        return (
          <g key={"l" + i}>
            {showIcon && !showName && <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize={Math.min(14, w / 2.5)}>{r.icon}</text>}
            {showName && <text x={x + w / 2} y={labelY} textAnchor="middle" fontSize={Math.min(9.5, w / 5.5)} fontWeight={700} fill={C.text}>{name.toUpperCase()}</text>}
            {showDim && <text x={x + w / 2} y={labelY + 9} textAnchor="middle" fontSize={8} fill={C.muted}>{ft(r.wFt)}&#39;×{ft(r.hFt)}&#39;</text>}
          </g>
        );
      })}

      {/* overall building dimensions — bottom (width) */}
      <g stroke={C.muted} strokeWidth={1}>
        <line x1={oL} y1={oB + 16} x2={oR} y2={oB + 16} />
        <line x1={oL} y1={oB + 12} x2={oL} y2={oB + 20} />
        <line x1={oR} y1={oB + 12} x2={oR} y2={oB + 20} />
      </g>
      <text x={(oL + oR) / 2} y={oB + 30} textAnchor="middle" fontSize={10} fontWeight={600} fill={C.text}>{ft(bw)} ft</text>
      {/* overall building dimensions — left (height) */}
      <g stroke={C.muted} strokeWidth={1}>
        <line x1={oL - 16} y1={oT} x2={oL - 16} y2={oB} />
        <line x1={oL - 20} y1={oT} x2={oL - 12} y2={oT} />
        <line x1={oL - 20} y1={oB} x2={oL - 12} y2={oB} />
      </g>
      <text x={oL - 22} y={(oT + oB) / 2} textAnchor="middle" fontSize={10} fontWeight={600} fill={C.text} transform={`rotate(-90 ${oL - 26} ${(oT + oB) / 2})`}>{ft(bh)} ft</text>

      {/* entrance marker (arrow pointing into the building from the gate side) */}
      {(() => {
        const cx = (oL + oR) / 2, cy = (oT + oB) / 2;
        let ax, ay, dx, dy;
        if (gateSide === "front") { ax = cx; ay = oB + 8; dx = 0; dy = -1; }
        else if (gateSide === "rear") { ax = cx; ay = oT - 8; dx = 0; dy = 1; }
        else if (gateSide === "left") { ax = oL - 8; ay = cy; dx = 1; dy = 0; }
        else { ax = oR + 8; ay = cy; dx = -1; dy = 0; }
        return (
          <g>
            <circle cx={ax} cy={ay} r={9} fill={C.accent} />
            <text x={ax} y={ay + 3.5} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={700}>⌂</text>
            <text x={ax + dx * 0} y={gateSide === "front" ? ay + 18 : gateSide === "rear" ? ay - 12 : ay} dx={gateSide === "left" ? -14 : gateSide === "right" ? 14 : 0} textAnchor="middle" fontSize={7.5} fontWeight={600} fill={C.muted}>ENTRY</text>
          </g>
        );
      })()}

      {/* scale note */}
      <text x={W - 8} y={H - 8} textAnchor="end" fontSize={8} fill={C.muted}>Approx · not to exact scale</text>

      {/* NORTH ARROW — oriented to the plot facing (front faces `facing`, drawn at bottom) */}
      {(() => {
        const nx = W - 26, ny = 26, rot = (facing || 180) - 180;
        return (
          <g transform={`translate(${nx} ${ny}) rotate(${rot})`}>
            <circle cx={0} cy={0} r={13} fill="#fff" stroke={C.border} strokeWidth={1} />
            <polygon points="0,-11 4,2 0,-1 -4,2" fill={C.accent} stroke={C.accent} strokeWidth={0.5} />
            <text x={0} y={-13.5} textAnchor="middle" fontSize={7} fontWeight={800} fill={C.accent}>N</text>
          </g>
        );
      })()}

      {/* SCALE BAR — a graphical 0–10–20 ft bar at the drawing scale */}
      {(() => {
        const barFt = 20, barPx = barFt * scale;
        if (barPx < 24 || barPx > W - 80) {
          const tenPx = 10 * scale;
          if (tenPx < 18 || tenPx > W - 80) return null;
          const bx = 12, by = H - 14;
          return (
            <g>
              <rect x={bx} y={by} width={tenPx / 2} height={3.5} fill={C.text} />
              <rect x={bx + tenPx / 2} y={by} width={tenPx / 2} height={3.5} fill="#fff" stroke={C.text} strokeWidth={0.6} />
              <text x={bx} y={by - 3} fontSize={7} fill={C.muted}>0</text>
              <text x={bx + tenPx} y={by - 3} textAnchor="middle" fontSize={7} fill={C.muted}>10 ft</text>
            </g>
          );
        }
        const bx = 12, by = H - 14, seg = barPx / 2;
        return (
          <g>
            <rect x={bx} y={by} width={seg} height={3.5} fill={C.text} />
            <rect x={bx + seg} y={by} width={seg} height={3.5} fill="#fff" stroke={C.text} strokeWidth={0.6} />
            <text x={bx} y={by - 3} fontSize={7} fill={C.muted}>0</text>
            <text x={bx + seg} y={by - 3} textAnchor="middle" fontSize={7} fill={C.muted}>10</text>
            <text x={bx + barPx} y={by - 3} textAnchor="middle" fontSize={7} fill={C.muted}>20 ft</text>
          </g>
        );
      })()}
    </svg>
  );
}


// draw a generated layout (rooms placed in their zones)
function LayoutView({ points, placed, showZones, facing }) {
  const W = 340, H = 300, pad = 36;
  if (!points) return null;
  const bb = bboxOf(points);
  const bw = bb.maxX - bb.minX || 1, bh = bb.maxY - bb.minY || 1;
  const scale = Math.min((W - 2 * pad) / bw, (H - 2 * pad) / bh);
  const offX = (W - bw * scale) / 2, offY = (H - bh * scale) / 2;
  const sx = x => (x - bb.minX) * scale + offX;
  const sy = y => (bb.maxY - y) * scale + offY;
  const poly = points.map(p => `${sx(p[0])},${sy(p[1])}`).join(" ");

  // group placed by zone-cell to lay them out within each cell
  const byCell = {};
  placed.forEach(p => { const k = `${p.px.toFixed(1)},${p.py.toFixed(1)}`; (byCell[k] ||= []).push(p); });

  return (
    <svg width={W} height={H} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.accent}`, display: "block", margin: "0 auto" }}>
      <polygon points={poly} fill={C.accent + "10"} stroke={C.accent} strokeWidth={2} strokeLinejoin="round" />
      {Object.values(byCell).map((items, ci) => {
        const cell = items[0];
        const cx0 = sx(cell.px), cy0 = sy(cell.py + cell.ph);
        const cw = cell.pw * scale, ch = cell.ph * scale;
        const n = items.length;
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        return items.map((it, i) => {
          const col = i % cols, row = Math.floor(i / cols);
          const cellW = cw / cols, cellH = ch / rows;
          const x = cx0 + col * cellW + 1.5;
          const y = cy0 + row * cellH + 1.5;
          const w = Math.max(6, cellW - 3), h = Math.max(6, cellH - 3);
          return (
            <g key={ci + "_" + i}>
              <rect x={x} y={y} width={w} height={h} fill={it.color + "55"} stroke={it.color} strokeWidth={1.2} rx={3} />
              {w > 24 && h > 18 && <text x={x + w / 2} y={y + h / 2 + 1} textAnchor="middle" fontSize={Math.min(12, w / 2.5)}>{it.icon}</text>}
              {w > 40 && h > 30 && <text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" fontSize={8} fill={C.muted}>{it.label.split(" ")[0]}</text>}
            </g>
          );
        });
      })}
    </svg>
  );
}

function ShapeView({ points, blocks }) {
  const W = 320, H = 250, pad = 38;
  if (!points) return (
    <div style={{ background: C.surface, border: `1.5px dashed ${C.red}66`, borderRadius: 12, padding: 24, textAlign: "center", color: C.red, fontSize: 13 }}>
      These measurements do not form a closed shape. Re-check them — especially the diagonal.
    </div>
  );
  const bb = bboxOf(points);
  const bw = bb.maxX - bb.minX || 1, bh = bb.maxY - bb.minY || 1;
  const scale = Math.min((W - 2 * pad) / bw, (H - 2 * pad) / bh);
  const offX = (W - bw * scale) / 2, offY = (H - bh * scale) / 2;
  const sx = x => (x - bb.minX) * scale + offX;
  const sy = y => (bb.maxY - y) * scale + offY;
  const poly = points.map(p => `${sx(p[0])},${sy(p[1])}`).join(" ");
  const placed = [];
  if (blocks) {
    let curX = 2, curY = 2, rowH = 0;
    for (const blk of blocks) {
      const side = Math.sqrt(blk.sqft);
      if (curX + side > bw) { curX = 2; curY += rowH + 2; rowH = 0; }
      if (curY + side > bh + side) break;
      placed.push({ ...blk, x: curX, y: curY, s: side });
      curX += side + 2; rowH = Math.max(rowH, side);
    }
  }
  return (
    <svg width={W} height={H} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, display: "block", margin: "0 auto" }}>
      {placed.map((r, i) => {
        const px = sx(r.x), py = sy(r.y + r.s), pw = r.s * scale, ph = r.s * scale;
        return (
          <g key={i}>
            <rect x={px} y={py} width={pw} height={ph} fill={r.color + "44"} stroke={r.color} strokeWidth={1.2} rx={3} />
            {pw > 26 && <text x={px + pw / 2} y={py + ph / 2 + 4} textAnchor="middle" fontSize={Math.min(13, pw / 2.2)}>{r.icon}</text>}
          </g>
        );
      })}
      <polygon points={poly} fill={blocks ? "none" : C.selBg} stroke={C.accent} strokeWidth={2} strokeLinejoin="round" />
      {!blocks && points.map((p, i) => {
        const q = points[(i + 1) % points.length];
        const len = Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]));
        return <text key={i} x={(sx(p[0]) + sx(q[0])) / 2} y={(sy(p[1]) + sy(q[1])) / 2 - 3} textAnchor="middle" fill={C.muted} fontSize={10} fontWeight="600">{len} ft</text>;
      })}
    </svg>
  );
}

function SizeSliderFt({ value, min, max, step = 0.5, color, onChange, unit = "ft" }) {
  const ref = useRef(null);
  const drag = useRef(false);
  const apply = (clientX) => {
    const rect = ref.current.getBoundingClientRect();
    let frac = (clientX - rect.left) / rect.width;
    frac = Math.max(0, Math.min(1, frac));
    let val = min + frac * (max - min);
    val = Math.round(val / step) * step;
    val = Math.min(max, Math.max(min, +val.toFixed(2)));
    onChange(val);
  };
  const down = (e) => { drag.current = true; e.target.setPointerCapture?.(e.pointerId); apply(e.clientX); };
  const move = (e) => { if (drag.current) apply(e.clientX); };
  const up = () => { drag.current = false; };
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
      style={{ position: "relative", height: 30, borderRadius: 8, background: C.surface, cursor: "pointer", touchAction: "none", overflow: "hidden", border: `1px solid ${C.border}` }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct + "%", background: color + "55" }} />
      <div style={{ position: "absolute", left: `calc(${pct}% - 8px)`, top: 4, width: 16, height: 20, borderRadius: 5, background: color, boxShadow: "0 1px 4px rgba(0,0,0,.4)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontSize: 12, fontWeight: 700, color: "#EEF0F8" }}>{value} {unit}</div>
    </div>
  );
}

function SizeSlider({ value, min, max, color, onChange }) {
  const ref = useRef(null);
  const drag = useRef(false);
  const safeMax = Math.max(min, max);
  const apply = (clientX) => {
    const rect = ref.current.getBoundingClientRect();
    let frac = (clientX - rect.left) / rect.width;
    frac = Math.max(0, Math.min(1, frac));
    const val = Math.round((min + frac * (safeMax - min)) / 5) * 5;
    onChange(Math.min(safeMax, Math.max(min, val)));
  };
  const down = (e) => { drag.current = true; e.target.setPointerCapture?.(e.pointerId); apply(e.clientX); };
  const move = (e) => { if (drag.current) apply(e.clientX); };
  const up = () => { drag.current = false; };
  const pct = safeMax > min ? ((value - min) / (safeMax - min)) * 100 : 0;
  return (
    <div>
      <div ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        style={{ position: "relative", height: 30, borderRadius: 8, background: C.surface, cursor: "pointer", touchAction: "none", overflow: "hidden", border: `1px solid ${C.border}` }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct + "%", background: color + "55" }} />
        <div style={{ position: "absolute", left: `calc(${pct}% - 8px)`, top: 4, width: 16, height: 20, borderRadius: 5, background: color, boxShadow: "0 1px 4px rgba(0,0,0,.4)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontSize: 12, fontWeight: 700, color: C.text }}>{value} ft²</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ color: C.muted, fontSize: 10 }}>min {min}</span>
        <span style={{ color: C.muted, fontSize: 10 }}>max {safeMax.toLocaleString()} (rest of floor)</span>
      </div>
    </div>
  );
}

function buildFloorList(hasBasement, floorsCount, topMode) {
  const list = [];
  if (hasBasement) list.push({ key: "basement", label: "Basement", icon: "🕳️", kind: "basement" });
  for (let i = 0; i < floorsCount; i++) {
    const isTop = i === floorsCount - 1;
    const label = i === 0 ? "Ground Floor" : i === 1 ? "1st Floor" : i === 2 ? "2nd Floor" : i === 3 ? "3rd Floor" : `${i}th Floor`;
    if (isTop && topMode !== "normal") {
      if (topMode === "terrace") list.push({ key: `f${i}`, label: label + " (Terrace)", icon: "🏞️", kind: "terrace" });
      else if (topMode === "penthouse") list.push({ key: `f${i}`, label: label + " (Penthouse)", icon: "🏙️", kind: "penthouse" });
      else if (topMode === "both") list.push({ key: `f${i}`, label: label + " (Penthouse + Terrace)", icon: "🏙️", kind: "both" });
    } else {
      list.push({ key: `f${i}`, label, icon: "🏠", kind: "normal" });
    }
  }
  return list;
}

// ===== PHASE 1: THE BRIEF =====
// ===== PROJECT TYPE (what are you building) =====
const PROJECT_TYPES = [
  { id: "home",     label: "One Home",      icon: "🏡", desc: "A single home for you or your family" },
  { id: "villa",    label: "Villa",         icon: "🏛️", desc: "A premium independent luxury home" },
  { id: "builder",  label: "Builder Floors", icon: "🏢", desc: "Each floor a separate home to sell or rent" },
  { id: "apartment",label: "Apartments",    icon: "🏬", desc: "Multiple flats on each floor" },
];

const FAMILY_TYPES = [
  { id: "single", label: "Just me", icon: "🧑", desc: "A home for one" },
  { id: "couple", label: "A couple", icon: "💑", desc: "Two people" },
  { id: "family", label: "Family with children", icon: "👨‍👩‍👧", desc: "Parents and kids" },
  { id: "joint", label: "Joint family", icon: "👨‍👩‍👧‍👦", desc: "Multiple generations" },
];
// each family type pre-fills a sensible starting room program
const PROGRAM_TEMPLATES = {
  single: { bedrooms: 1, bathrooms: 1, kitchens: 1, pooja: false, dining: false, study: true,  guest: false, store: true,  utility: false, parking: true,  garden: false, balcony: true },
  couple: { bedrooms: 2, bathrooms: 2, kitchens: 1, pooja: true,  dining: true,  study: false, guest: false, store: true,  utility: true,  parking: true,  garden: true,  balcony: true },
  family: { bedrooms: 3, bathrooms: 2, kitchens: 1, pooja: true,  dining: true,  study: true,  guest: true,  store: true,  utility: true,  parking: true,  garden: true,  balcony: true },
  joint:  { bedrooms: 4, bathrooms: 3, kitchens: 2, pooja: true,  dining: true,  study: true,  guest: true,  store: true,  utility: true,  parking: true,  garden: true,  balcony: true },
  villa:  { bedrooms: 4, bathrooms: 4, kitchens: 1, pooja: true,  dining: true,  study: true,  guest: true,  store: true,  utility: true,  parking: true,  garden: true,  balcony: true },
};
const PROGRAM_TOGGLES = [
  { id: "pooja",   label: "Pooja Room",  icon: "🪔" },
  { id: "dining",  label: "Dining Room", icon: "🍽️" },
  { id: "study",   label: "Study/Office",icon: "💻" },
  { id: "guest",   label: "Guest Room",  icon: "🛌" },
  { id: "store",   label: "Store",       icon: "📦" },
  { id: "utility", label: "Utility/Wash",icon: "🧺" },
  { id: "parking", label: "Parking",     icon: "🚗" },
  { id: "garden",  label: "Garden",      icon: "🌿" },
  { id: "balcony", label: "Balcony",     icon: "🌅" },
];
const PRIORITIES = [
  { id: "light",   label: "Natural light",    icon: "☀️" },
  { id: "privacy", label: "Privacy",          icon: "🔒" },
  { id: "social",  label: "Space to entertain", icon: "🎉" },
  { id: "work",    label: "A quiet work corner", icon: "💻" },
  { id: "vastu",   label: "Vastu alignment",  icon: "🧭" },
  { id: "cost",    label: "Low cost",         icon: "💰" },
];

const STYLES = [
  { id: "vastu",  label: "Vastu-First",       icon: "🧭", desc: "Rooms placed by Vastu directions", premium: false, needsVastu: true },
  { id: "social", label: "Open & Social",     icon: "🛋️", desc: "Living, dining, kitchen flow together", premium: false },
  { id: "light",  label: "Light & Air",       icon: "☀️", desc: "Max natural light & ventilation", premium: true },
  { id: "compact",label: "Compact & Efficient", icon: "📐", desc: "Shared walls, low construction cost", premium: true },
];

// ===== BRAND LOGO (vector recreation — the P with building silhouette) =====
function LogoMark({ size = 100, color = "#1A1A1A" }) {
  return (
    <svg width={size} height={size * 1.04} viewBox="0 0 100 104" fill="none" style={{ display: "block" }}>
      {/* P stem */}
      <rect x="27" y="15" width="12" height="76" fill={color} />
      {/* P bowl (loop) */}
      <path d="M 39 15 H 57 A 23 23 0 0 1 57 61 H 39" fill="none" stroke={color} strokeWidth="12" strokeLinejoin="miter" />
      {/* building silhouette inside the counter */}
      <path d="M 45 53 L 56 41 L 56 91 L 45 91 Z" fill={color} />
    </svg>
  );
}

function Splash({ fading }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#FFFFFF", zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: fading ? 0 : 1, transition: "opacity .55s ease",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{"@keyframes plotaiLogoIn{0%{opacity:0;transform:translateY(10px) scale(.92)}100%{opacity:1;transform:translateY(0) scale(1)}}@keyframes plotaiFadeUp{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}@keyframes plotaiLine{0%{width:0}100%{width:46px}}"}</style>
      <div style={{ animation: "plotaiLogoIn 1s cubic-bezier(.2,.7,.2,1) both" }}>
        <LogoMark size={104} />
      </div>
      <div style={{ marginTop: 24, fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#1A1A1A", animation: "plotaiFadeUp .8s ease .45s both" }}>Plot AI</div>
      <div style={{ height: 1, background: "#E5E5E0", margin: "16px 0", animation: "plotaiLine .8s ease .7s both" }} />
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.34em", color: "#9A9A95", textTransform: "uppercase", animation: "plotaiFadeUp .8s ease .85s both" }}>Your AI Architect</div>
    </div>
  );
}

export default function App() {
  // SAFE STORAGE: try to persist to the device, but never crash if unavailable
  const safeStore = {
    get(key) { try { const v = window.localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(key, val) { try { window.localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } },
    remove(key) { try { window.localStorage.removeItem(key); } catch (e) {} },
  };
  const [step, setStep] = useState("project");
  const [projectType, setProjectType] = useState(null);
  // splash screen
  const [showSplash, setShowSplash] = useState(true);
  const [splashFade, setSplashFade] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setSplashFade(true), 2100);
    const t2 = setTimeout(() => setShowSplash(false), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  // VIEWPORT: ensure proper mobile scaling (safety net if index.html lacks it)
  useEffect(() => {
    let m = document.querySelector('meta[name="viewport"]');
    if (!m) { m = document.createElement("meta"); m.name = "viewport"; document.head.appendChild(m); }
    m.content = "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1";
    // prevent any horizontal scroll (the black side-screen) at the document level
    document.documentElement.style.overflowX = "hidden";
    document.body.style.overflowX = "hidden";
    document.body.style.maxWidth = "100%";
    document.body.style.margin = "0";
    // inject global keyframes for page transitions + button press feel
    if (!document.getElementById("plotai-anim")) {
      const st = document.createElement("style");
      st.id = "plotai-anim";
      st.textContent = "@keyframes plotaiPageIn{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}.plotai-page{animation:plotaiPageIn .22s ease both}button{transition:transform .08s ease,opacity .15s ease}button:active{transform:scale(.97)}";
      document.head.appendChild(st);
    }
  }, []);
  // PHASE 1 — THE BRIEF
  const [familyType, setFamilyType] = useState(null);
  const [program, setProgram] = useState(PROGRAM_TEMPLATES.family);
  // BUILDER FLOORS: per-unit program (each floor = one sellable home)
  const [unitProgram, setUnitProgram] = useState({ bedrooms: 2, bathrooms: 2, pooja: false, balcony: true });
  const [sameOnEveryFloor, setSameOnEveryFloor] = useState(true);
  const [floorUnitOverrides, setFloorUnitOverrides] = useState({}); // { floorKey: {bedrooms,bathrooms,...} }
  // APARTMENTS: flats per floor + size of each flat
  const [flatsPerFloor, setFlatsPerFloor] = useState(2);
  const [flatBHK, setFlatBHK] = useState(2); // bedrooms per flat
  const [priorities, setPriorities] = useState([]);
  // ARCHITECT'S BRIEF: spatial intent (connections, staircase, parking)
  const [connections, setConnections] = useState({ openKitchen: true, poojaVisible: false, masterEnsuite: true, livingToOutside: true });
  const [stairType, setStairType] = useState("straight"); // straight | l-shaped | u-shaped
  const [stairSide, setStairSide] = useState("side"); // front | rear | side
  const [carCount, setCarCount] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [purpose, setPurpose] = useState("residential");
  const [shapeType, setShapeType] = useState("rect");
  const [rectW, setRectW] = useState(50), [rectD, setRectD] = useState(60);
  const [qF, setQF] = useState(40), [qR, setQR] = useState(62), [qB, setQB] = useState(45), [qL, setQL] = useState(58), [qDiag, setQDiag] = useState(72);
  const [lW, setLW] = useState(60), [lD, setLD] = useState(50), [lNW, setLNW] = useState(20), [lND, setLND] = useState(18);
  const [sbFront, setSbFront] = useState(5), [sbRear, setSbRear] = useState(3), [sbLeft, setSbLeft] = useState(3), [sbRight, setSbRight] = useState(3);
  const [floorsCount, setFloorsCount] = useState(3);
  const [hasBasement, setHasBasement] = useState(false);
  const [topMode, setTopMode] = useState("normal");
  const [liftOn, setLiftOn] = useState(false);
  // user-customisable core reserves — the constants in CORE are the MINIMUMS; user can increase
  const [stairArea, setStairArea] = useState(CORE.stairs.min);   // sqft, min 90
  const [liftArea, setLiftArea] = useState(CORE.lift.min);       // sqft, min 30
  const [corridorWidth, setCorridorWidth] = useState(3.5);       // ft, min 3.5 (corridor plan hallway)
  // VERTICAL layer (NBC-sourced defaults, in feet)
  const [plinthFt, setPlinthFt] = useState(2);
  const [floorHt, setFloorHt] = useState(10);
  const [floorHtOverrides, setFloorHtOverrides] = useState({});
  const [basementHt, setBasementHt] = useState(9);
  const [surround, setSurround] = useState({ front: "road", right: "building", rear: "building", left: "building" });
  const [gates, setGates] = useState({ front: true, right: false, rear: false, left: false });
  const [courtyardOn, setCourtyardOn] = useState(false);
  const [courtyardSize, setCourtyardSize] = useState(120);
  const [vastuOn, setVastuOn] = useState(false);
  const [facing, setFacing] = useState(0);
  const [quality, setQuality] = useState("standard");
  const [floorData, setFloorData] = useState([]);
  const [cur, setCur] = useState(0);
  // SCROLL-TO-TOP: every time the step OR floor changes, jump to the top of the page
  useEffect(() => {
    const doScroll = () => {
      try { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); } catch (e) { window.scrollTo(0, 0); }
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    doScroll();
    const t = setTimeout(doScroll, 30); // run again after the new page paints
    return () => clearTimeout(t);
  }, [step, cur]);
  const [customName, setCustomName] = useState("");
  const [customSize, setCustomSize] = useState(100);
  const [activeStyle, setActiveStyle] = useState(null);
  const [isSample, setIsSample] = useState(false);
  const [layoutVariant, setLayoutVariant] = useState(0);
  const [layoutFloor, setLayoutFloor] = useState(0);
  // DEVICE SAVE: remember the design on this device (safe — never breaks if storage is off)
  const [hasSaved, setHasSaved] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [showFloorHint, setShowFloorHint] = useState(true);
  // on first load, check if a saved design exists
  useEffect(() => {
    const saved = safeStore.get("plotai_design");
    if (saved && saved.projectType) { setHasSaved(true); setShowResume(true); }
  }, []);
  // save a snapshot whenever the meaningful design state changes
  useEffect(() => {
    if (!projectType) return; // nothing to save yet
    const snap = { step, projectType, familyType, program, unitProgram, sameOnEveryFloor, flatsPerFloor, flatBHK, priorities, connections, stairType, stairSide, carCount, projectName, purpose, shapeType, rectW, qF, lW, sbFront, floorsCount, hasBasement, topMode, liftOn, stairArea, liftArea, corridorWidth, plinthFt, floorHt, basementHt, surround, gates, courtyardOn, courtyardSize, vastuOn, facing, quality, floorData, activeStyle, layoutVariant, savedAt: Date.now() };
    safeStore.set("plotai_design", snap);
  }, [step, projectType, program, projectName, shapeType, rectW, qF, lW, floorsCount, floorData, surround, gates, facing, vastuOn, quality, activeStyle, layoutVariant, connections, stairType, carCount]);

  // ===== SAMPLE DESIGNS — instant finished plans for first-time visitors =====
  const SAMPLES = [
    { id: "s2bhk", emoji: "🏡", title: "2BHK · 30×40 plot", sub: "Compact family home, Vastu-aligned",
      cfg: { projectType: "home", shapeType: "rect", rectW: 30, rectD: 40, facing: 90, vastuOn: true, variant: 0,
        rooms: ["living","kitchen","dining","master","bed","bath","pooja"] } },
    { id: "s3bhk", emoji: "🏛️", title: "3BHK · 40×60 plot", sub: "Spacious home with corridor plan",
      cfg: { projectType: "home", shapeType: "rect", rectW: 40, rectD: 60, facing: 0, vastuOn: true, variant: 3,
        rooms: ["living","kitchen","dining","master","bed","kids","bath","store","pooja"] } },
    { id: "sdiag", emoji: "📐", title: "Corner plot · diagonal", sub: "Irregular plot, fitted footprint",
      cfg: { projectType: "home", shapeType: "quad", qF: 42, qR: 60, qB: 40, qL: 55, qDiag: 72, facing: 180, vastuOn: true, variant: 0,
        rooms: ["living","kitchen","dining","master","bed","bath"] } },
  ];
  const loadSample = (sample) => {
    const c = sample.cfg;
    setProjectType(c.projectType);
    setShapeType(c.shapeType);
    if (c.rectW) setRectW(c.rectW); if (c.rectD) setRectD(c.rectD);
    if (c.qF) { setQF(c.qF); setQR(c.qR); setQB(c.qB); setQL(c.qL); setQDiag(c.qDiag); }
    setFacing(c.facing); setVastuOn(c.vastuOn); setLayoutVariant(c.variant);
    setProjectName(sample.title);
    // build a single-floor design with the sample's rooms
    const rooms = c.rooms.map(typeId => ({ uid: UID++, typeId, sqft: (ROOMS[typeId] && ROOMS[typeId].min) || 120 }));
    setFloorsCount(1); setHasBasement(false); setTopMode("normal");
    setFloorData([{ fullParking: false, rooms }]);
    setCur(0); setLayoutFloor(0);
    setActiveStyle(c.vastuOn ? "vastu" : "social");
    setIsSample(true);
    // jump straight to the finished plan
    setTimeout(() => { setStep("style"); window.scrollTo(0, 0); }, 0);
  };

  const [shareMsg, setShareMsg] = useState("");
  const sharePlan = (mode) => {
    try {
      const area = document.getElementById("plotai-export-area");
      const svg = area && area.querySelector("svg");
      if (!svg) { setShareMsg("Could not find the plan to export."); return; }
      const clone = svg.cloneNode(true);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const vb = svg.viewBox && svg.viewBox.baseVal;
      const w = (vb && vb.width) || svg.clientWidth || 600;
      const h = (vb && vb.height) || svg.clientHeight || 800;
      clone.setAttribute("width", w); clone.setAttribute("height", h);
      const svgStr = new XMLSerializer().serializeToString(clone);
      const url = URL.createObjectURL(new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" }));
      const img = new Image();
      img.onload = () => {
        const sc = 2, padBottom = 46;
        const canvas = document.createElement("canvas");
        canvas.width = w * sc; canvas.height = h * sc + padBottom * sc;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, w * sc, h * sc);
        // watermark — every shared plan markets the app
        ctx.fillStyle = "#1A1A1A"; ctx.font = `700 ${13 * sc}px sans-serif`; ctx.textAlign = "center";
        ctx.fillText("Made with PlotAI", canvas.width / 2, h * sc + 20 * sc);
        ctx.fillStyle = "#9AA0A6"; ctx.font = `${10 * sc}px sans-serif`;
        ctx.fillText("plot-ai-nu.vercel.app · design your home like an architect", canvas.width / 2, h * sc + 34 * sc);
        URL.revokeObjectURL(url);
        canvas.toBlob(async (blob) => {
          if (!blob) { setShareMsg("Export failed — try a screenshot for now."); return; }
          const fname = `PlotAI-${(projectName || "design").replace(/[^a-zA-Z0-9]/g, "-").slice(0, 24)}.png`;
          const file = new File([blob], fname, { type: "image/png" });
          if (mode === "share" && navigator.canShare && navigator.canShare({ files: [file] })) {
            try { await navigator.share({ files: [file], title: "My PlotAI home design", text: "Here is my home plan, designed on PlotAI." }); setShareMsg(""); }
            catch (e) { /* user cancelled */ }
          } else {
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fname;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setShareMsg(mode === "share" ? "Sharing is not supported here — downloaded the image instead." : "Plan downloaded.");
            setTimeout(() => setShareMsg(""), 4000);
          }
        }, "image/png");
      };
      img.onerror = () => { URL.revokeObjectURL(url); setShareMsg("Could not export the image. A screenshot works too."); };
      img.src = url;
    } catch (e) { setShareMsg("Could not export. Try a screenshot for now."); }
  };

  const restoreDesign = () => {
    const d = safeStore.get("plotai_design");
    if (!d) { setShowResume(false); return; }
    try {
      setProjectType(d.projectType); if (d.familyType) setFamilyType(d.familyType);
      if (d.program) setProgram(d.program); if (d.unitProgram) setUnitProgram(d.unitProgram);
      if (d.sameOnEveryFloor !== undefined) setSameOnEveryFloor(d.sameOnEveryFloor);
      if (d.flatsPerFloor) setFlatsPerFloor(d.flatsPerFloor); if (d.flatBHK) setFlatBHK(d.flatBHK);
      if (d.priorities) setPriorities(d.priorities); if (d.connections) setConnections(d.connections);
      if (d.stairType) setStairType(d.stairType); if (d.stairSide) setStairSide(d.stairSide);
      if (d.carCount !== undefined) setCarCount(d.carCount); if (d.projectName) setProjectName(d.projectName);
      if (d.purpose) setPurpose(d.purpose); if (d.shapeType) setShapeType(d.shapeType);
      if (d.rectW) setRectW(d.rectW); if (d.qF) setQF(d.qF); if (d.lW) setLW(d.lW); if (d.sbFront) setSbFront(d.sbFront);
      if (d.floorsCount) setFloorsCount(d.floorsCount); if (d.hasBasement !== undefined) setHasBasement(d.hasBasement);
      if (d.topMode) setTopMode(d.topMode); if (d.liftOn !== undefined) setLiftOn(d.liftOn); if (d.stairArea) setStairArea(d.stairArea); if (d.liftArea) setLiftArea(d.liftArea); if (d.corridorWidth) setCorridorWidth(d.corridorWidth);
      if (d.plinthFt) setPlinthFt(d.plinthFt); if (d.floorHt) setFloorHt(d.floorHt); if (d.basementHt) setBasementHt(d.basementHt);
      if (d.surround) setSurround(d.surround); if (d.gates) setGates(d.gates);
      if (d.courtyardOn !== undefined) setCourtyardOn(d.courtyardOn); if (d.courtyardSize) setCourtyardSize(d.courtyardSize);
      if (d.vastuOn !== undefined) setVastuOn(d.vastuOn); if (d.facing !== undefined) setFacing(d.facing);
      if (d.quality) setQuality(d.quality); if (d.floorData) setFloorData(d.floorData);
      if (d.activeStyle) setActiveStyle(d.activeStyle); if (d.layoutVariant !== undefined) setLayoutVariant(d.layoutVariant);
      if (d.step) setStep(d.step);
    } catch (e) { /* if anything fails, just continue fresh */ }
    setShowResume(false);
  };
  const [lockMsg, setLockMsg] = useState("");

  let points = null;
  if (shapeType === "rect") points = [[0, 0], [rectW, 0], [rectW, rectD], [0, rectD]];
  else if (shapeType === "quad") points = quadPoints(qF, qR, qB, qL, qDiag);
  else points = lPoints(lW, lD, lNW, lND);
  // v2 engine inputs: setback object + L-shape metadata
  const v2sb = { front: sbFront, rear: sbRear, left: sbLeft, right: sbRight };
  const v2lMeta = shapeType === "lshape" ? { W: lW, D: lD, nw: lNW, nd: lND } : null;
  const area = points ? Math.round(polyArea(points)) : 0;

  let footprint = 0;
  if (points) {
    const bb = bboxOf(points);
    const bw = bb.maxX - bb.minX, bh = bb.maxY - bb.minY;
    const innerW = Math.max(0, bw - sbLeft - sbRight);
    const innerD = Math.max(0, bh - sbFront - sbRear);
    let ratio = (bw > 0 && bh > 0) ? (innerW * innerD) / (bw * bh) : 0;
    ratio = Math.min(0.95, ratio);
    footprint = Math.round(area * ratio);
  }
  const coreArea = Math.max(CORE.stairs.min, stairArea) + (liftOn ? Math.max(CORE.lift.min, liftArea) : 0);
  // CIRCULATION layer: reserve hallway/movement space (architect's ~10% rule)
  const CIRCULATION_PCT = 0.10; // ~10% of buildable area for hallways & movement
  const circulationFor = (roomCount) => {
    // no circulation needed if the floor has 0-1 rooms (no hallways between rooms)
    if (roomCount <= 1) return 0;
    return Math.round((footprint - coreArea) * CIRCULATION_PCT);
  };
  // FEASIBILITY: can the chosen flats/units fit the buildable floor? (realistic Indian minimums)
  const BHK_MIN = { 1: 480, 2: 680, 3: 980 }; // comfortable minimum sqft per flat by BHK
  const BHK_TIGHT = { 1: 380, 2: 540, 3: 780 }; // tight-but-buildable minimum
  const apartmentFeasibility = () => {
    if (projectType !== "apartment") return null;
    const usable = footprint - coreArea; // per floor, minus staircase/lift
    const needComfort = flatsPerFloor * BHK_MIN[flatBHK];
    const needTight = flatsPerFloor * BHK_TIGHT[flatBHK];
    const perFlat = Math.round(usable / flatsPerFloor);
    if (usable >= needComfort) return { level: "good", perFlat, need: needComfort, usable };
    if (usable >= needTight) return { level: "tight", perFlat, need: needComfort, usable };
    // does not fit — find what would
    let suggestion = "";
    const maxFlats = Math.max(1, Math.floor(usable / BHK_TIGHT[flatBHK]));
    if (maxFlats < flatsPerFloor && maxFlats >= 1) suggestion = `try ${maxFlats} flat${maxFlats > 1 ? "s" : ""} per floor`;
    if (flatBHK > 1 && (!suggestion)) suggestion = `try ${flatBHK - 1}BHK flats`;
    if (flatBHK > 1 && maxFlats < flatsPerFloor) suggestion = `try ${maxFlats} flat${maxFlats > 1 ? "s" : ""}, or smaller ${flatBHK - 1}BHK units`;
    return { level: "no", perFlat, need: needTight, usable, suggestion, maxFlats };
  };
  const builderFeasibility = () => {
    if (projectType !== "builder") return null;
    const usable = footprint - coreArea;
    const bhk = unitProgram.bedrooms;
    const needComfort = BHK_MIN[Math.min(3, bhk)] || (bhk * 320);
    const needTight = BHK_TIGHT[Math.min(3, bhk)] || (bhk * 250);
    if (usable >= needComfort) return { level: "good", usable, need: needComfort };
    if (usable >= needTight) return { level: "tight", usable, need: needComfort };
    return { level: "no", usable, need: needTight, suggestion: bhk > 1 ? `try a ${bhk - 1}BHK unit, or a larger plot` : "try a larger plot" };
  };
  // surroundings analysis
  const openSidesCount = SIDE_KEYS.filter(k => isOpenSide(surround[k])).length;
  const blockedSides = SIDE_KEYS.filter(k => !isOpenSide(surround[k]));
  const gateSides = SIDE_KEYS.filter(k => gates[k]);
  // architect rule: if 2+ sides blocked, inner rooms lose light -> courtyard recommended
  const courtyardRecommended = openSidesCount <= 2;
  const shaftRecommended = blockedSides.length >= 2;
  const effectiveCourtyard = courtyardOn ? Math.max(COURTYARD.min, courtyardSize) : 0;
  const facingDir = nearestDir(facing);
  const note = boundaryNote(facing);
  const RATES = { basic: 1600, standard: 2200, premium: 3000 };
  const floorList = buildFloorList(hasBasement, floorsCount, topMode);

  // VERTICAL computations
  const htOf = (key) => floorHtOverrides[key] ?? floorHt;
  const aboveGroundFloors = floorList.filter(f => f.key !== "basement");
  const aboveGroundHeight = aboveGroundFloors.reduce((sum, f) => sum + htOf(f.key), 0);
  const totalHeightFromRoad = +(plinthFt + aboveGroundHeight).toFixed(1);
  const clearCeiling = +(floorHt - 1).toFixed(1);
  const heightWarn = totalHeightFromRoad > 49;

  const startFloors = () => {
    setFloorData(floorList.map(() => ({ fullParking: false, rooms: [] })));
    setCur(0); setStep("floor");
    // builder floors: auto-build each floor as a complete unit right away
    if (projectType === "builder" || projectType === "apartment") setTimeout(() => autoDistribute(), 0);
  };
  const addRoom = (typeId) => setFloorData(fd => fd.map((f, i) => i !== cur ? f : { ...f, rooms: [...f.rooms, { uid: UID++, typeId, sqft: ROOMS[typeId].min }] }));
  const addCustomRoom = () => {
    const name = customName.trim();
    if (!name) return;
    const sqft = Math.max(20, customSize);
    setFloorData(fd => fd.map((f, i) => i !== cur ? f : { ...f, rooms: [...f.rooms, { uid: UID++, typeId: "custom", sqft, customLabel: name }] }));
    setCustomName(""); setCustomSize(100);
  };
  const removeRoom = (uid) => setFloorData(fd => fd.map((f, i) => i !== cur ? f : { ...f, rooms: f.rooms.filter(r => r.uid !== uid) }));
  const setRoomSize = (uid, val) => setFloorData(fd => fd.map((f, i) => i !== cur ? f : { ...f, rooms: f.rooms.map(r => r.uid === uid ? { ...r, sqft: val } : r) }));
  const toggleFP = () => setFloorData(fd => fd.map((f, i) => i !== cur ? f : { ...f, fullParking: !f.fullParking, rooms: [] }));

  // ===== BRIEF → FLOORS: expand the Phase 1 program into a list of rooms to place =====
  const briefRoomList = () => {
    const list = [];
    list.push({ typeId: "living", label: "Living Room" }); // every home has one
    for (let i = 0; i < program.bedrooms; i++) list.push({ typeId: i === 0 ? "master" : "bed", label: i === 0 ? "Master Bedroom" : "Bedroom" });
    for (let i = 0; i < program.bathrooms; i++) list.push({ typeId: "bath", label: "Bathroom" });
    for (let i = 0; i < program.kitchens; i++) list.push({ typeId: "kitchen", label: "Kitchen" });
    if (program.dining) list.push({ typeId: "dining", label: "Dining" });
    if (program.pooja) list.push({ typeId: "pooja", label: "Pooja Room" });
    if (program.study) list.push({ typeId: "office", label: "Study/Office" });
    if (program.guest) list.push({ typeId: "guest", label: "Guest Room" });
    if (program.store) list.push({ typeId: "store", label: "Store" });
    if (program.utility) list.push({ typeId: "utility", label: "Utility/Wash" });
    if (program.parking && carCount > 0) { for (let i = 0; i < carCount; i++) list.push({ typeId: "park", label: carCount > 1 ? `Parking ${i + 1}` : "Parking" }); }
    if (program.garden) list.push({ typeId: "garden", label: "Front Garden" });
    if (program.balcony) list.push({ typeId: "balcony", label: "Balcony" });
    return list;
  };
  // how many of each typeId are already placed across all floors
  const placedCounts = () => {
    const c = {};
    floorData.forEach(f => f.rooms.forEach(r => { c[r.typeId] = (c[r.typeId] || 0) + 1; }));
    return c;
  };
  // the unplaced pool = brief list minus already-placed, as countable groups
  const unplacedPool = () => {
    const brief = briefRoomList();
    const placed = placedCounts();
    const remaining = {};
    const order = [];
    brief.forEach(item => {
      remaining[item.typeId] = (remaining[item.typeId] || 0) + 1;
      if (!order.includes(item.typeId)) order.push(item.typeId);
    });
    Object.keys(placed).forEach(t => { if (remaining[t]) remaining[t] = Math.max(0, remaining[t] - placed[t]); });
    return order.map(t => ({ typeId: t, count: remaining[t] || 0, label: ROOMS[t]?.label || t })).filter(x => x.count > 0);
  };
  const totalUnplaced = () => unplacedPool().reduce((a, x) => a + x.count, 0);

  // auto-distribute the whole brief across floors sensibly
  const autoDistribute = () => {
    // BUILDER FLOORS: each floor becomes a complete independent unit
    // APARTMENTS: each floor splits into N self-contained flats
    if (projectType === "apartment") {
      const fresh = floorList.map((f) => {
        if (f.kind === "basement") return { fullParking: true, rooms: [] };
        if (f.kind === "terrace") return { fullParking: false, rooms: [] };
        const rooms = [];
        const perFlatTarget = ((footprint - coreArea) * 0.90) / flatsPerFloor;
        for (let flat = 1; flat <= flatsPerFloor; flat++) {
          const fr = [];
          fr.push({ uid: UID++, typeId: "living", sqft: ROOMS.living.ideal, flatId: flat, customLabel: `Flat ${flat} · Living` });
          fr.push({ uid: UID++, typeId: "kitchen", sqft: ROOMS.kitchen.ideal, flatId: flat, customLabel: `Flat ${flat} · Kitchen` });
          for (let b = 0; b < flatBHK; b++) fr.push({ uid: UID++, typeId: b === 0 ? "master" : "bed", sqft: ROOMS[b === 0 ? "master" : "bed"].ideal, flatId: flat, customLabel: `Flat ${flat} · ${b === 0 ? "Master" : "Bedroom"}` });
          fr.push({ uid: UID++, typeId: "bath", sqft: ROOMS.bath.ideal, flatId: flat, customLabel: `Flat ${flat} · Bath` });
          // scale this flat's rooms to its share of the floor
          const cur = fr.reduce((a, r) => a + r.sqft, 0);
          if (cur > 0 && perFlatTarget > 0) { const sc = perFlatTarget / cur; fr.forEach(r => { r.sqft = Math.round((r.sqft * sc) / 5) * 5; }); }
          rooms.push(...fr);
        }
        return { fullParking: false, rooms };
      });
      setFloorData(fresh);
      return;
    }
    if (projectType === "builder") {
      const fresh = floorList.map((f) => {
        if (f.kind === "basement") return { fullParking: true, rooms: [] }; // basement = shared parking
        if (f.kind === "terrace") return { fullParking: false, rooms: [] };
        // per-floor unit program (override or the common one)
        const u = floorUnitOverrides[f.key] || unitProgram;
        const unitRooms = [];
        unitRooms.push({ uid: UID++, typeId: "living", sqft: ROOMS.living.min });
        unitRooms.push({ uid: UID++, typeId: "kitchen", sqft: ROOMS.kitchen.min });
        for (let i = 0; i < u.bedrooms; i++) unitRooms.push({ uid: UID++, typeId: i === 0 ? "master" : "bed", sqft: ROOMS[i === 0 ? "master" : "bed"].min });
        for (let i = 0; i < u.bathrooms; i++) unitRooms.push({ uid: UID++, typeId: "bath", sqft: ROOMS.bath.min });
        if (u.pooja) unitRooms.push({ uid: UID++, typeId: "pooja", sqft: ROOMS.pooja.min });
        if (u.balcony) unitRooms.push({ uid: UID++, typeId: "balcony", sqft: ROOMS.balcony.min });
        // grow to fill the floor, leaving circulation (hallway) space
        const circ = circulationFor(unitRooms.length);
        const target = (footprint - coreArea - circ) * 0.98;
        const cur = unitRooms.reduce((a, r) => a + r.sqft, 0);
        if (cur > 0 && target > cur) {
          const scale = target / cur;
          unitRooms.forEach(r => { r.sqft = Math.round((r.sqft * scale) / 5) * 5; });
        }
        return { fullParking: false, rooms: unitRooms };
      });
      setFloorData(fresh);
      return;
    }
    const brief = briefRoomList();
    const fresh = floorList.map(() => ({ fullParking: false, rooms: [] }));
    const idxOf = (key) => floorList.findIndex(f => f.key === key);
    const groundIdx = idxOf("f0") >= 0 ? idxOf("f0") : floorList.findIndex(f => f.kind !== "basement" && f.kind !== "terrace");
    const basementIdx = idxOf("basement");
    // floors that can take living rooms (not basement, not terrace)
    const livingIdxs = floorList.map((f, i) => i).filter(i => floorList[i].kind !== "basement" && floorList[i].kind !== "terrace");
    const upperIdxs = livingIdxs.filter(i => i !== groundIdx);
    const groundPref = new Set(["living", "kitchen", "dining", "pooja", "garden", "master"]);

    const tryPlace = (typeId, idx, sqft) => {
      const used = coreArea + fresh[idx].rooms.reduce((a, r) => a + r.sqft, 0);
      if (used + sqft <= footprint) { fresh[idx].rooms.push({ uid: UID++, typeId, sqft }); return true; }
      return false;
    };

    let upPtr = 0;
    brief.forEach(item => {
      const min = ROOMS[item.typeId]?.min || 60;
      // PARKING and STORE prefer the basement if one exists
      if ((item.typeId === "park" || item.typeId === "store") && basementIdx >= 0) {
        if (tryPlace(item.typeId, basementIdx, min)) return;
      }
      // bedrooms and non-ground types go upstairs
      let target = groundIdx;
      if ((item.typeId === "bed" || !groundPref.has(item.typeId)) && upperIdxs.length > 0) {
        target = upperIdxs[upPtr % upperIdxs.length]; upPtr++;
      }
      if (tryPlace(item.typeId, target, min)) return;
      // fallback: any living floor with room
      for (const k of livingIdxs) if (tryPlace(item.typeId, k, min)) return;
      // last resort: basement
      if (basementIdx >= 0) tryPlace(item.typeId, basementIdx, min);
    });

    // BASEMENT: if it has parking, grow parking to fill the basement (~95%)
    if (basementIdx >= 0) {
      const b = fresh[basementIdx];
      if (b.rooms.length === 0) {
        // empty basement -> fill with parking
        b.rooms.push({ uid: UID++, typeId: "park", sqft: Math.max(ROOMS.park.min, Math.round((footprint - coreArea) * 0.95)) });
      }
    }

    // GROW every floor's rooms proportionally to fill ~92% of buildable area
    fresh.forEach((f, i) => {
      if (floorList[i].kind === "terrace") return;
      if (f.rooms.length === 0) return;
      const circ = circulationFor(f.rooms.length);
      const target = (footprint - coreArea - circ) * 0.98;
      const current = f.rooms.reduce((a, r) => a + r.sqft, 0);
      if (current <= 0) return;
      const scale = target / current;
      if (scale > 1) {
        f.rooms = f.rooms.map(r => ({ ...r, sqft: Math.round((r.sqft * scale) / 5) * 5 }));
      }
    });

    setFloorData(fresh);
  };

  const paletteFor = (kind) => {
    if (purpose === "commercial") return COM_ALL;
    if (kind === "basement") return RES_BASEMENT;
    if (kind === "terrace" || kind === "both") return ["terrace", "garden", "store"];
    if (kind === "penthouse") return ["living", "master", "bed", "kitchen", "bath", "dining", "balcony", "terrace"];
    return floorList[cur]?.key === "f0" ? RES_GROUND : RES_UPPER;
  };

  const suggestRooms = () => {
    const kind = floorList[cur]?.kind;
    let list;
    if (purpose === "commercial") list = SUGGEST.com;
    else if (kind === "basement") list = SUGGEST.resBasement;
    else if (floorList[cur]?.key === "f0") list = SUGGEST.resGround;
    else list = SUGGEST.resUpper;
    let avail = footprint - coreArea;
    const picked = [];
    for (const id of list) {
      const m = ROOMS[id].min;
      if (avail - m >= 0) { picked.push({ uid: UID++, typeId: id, sqft: m }); avail -= m; }
    }
    setFloorData(fd => fd.map((f, i) => i !== cur ? f : { ...f, rooms: picked }));
  };

  const pickStyle = (st) => {
    if (st.premium) { setLockMsg(st.label); return; }
    if (st.needsVastu && !vastuOn) { setLockMsg("vastu-off"); return; }
    setLockMsg("");
    setActiveStyle(st.id);
  };

  const s = {
    root: { fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: C.bg, minHeight: "100vh", color: C.text, width: "100%", maxWidth: 600, margin: "0 auto", paddingBottom: "max(56px, env(safe-area-inset-bottom))", letterSpacing: "-0.01em", boxSizing: "border-box", overflowX: "hidden", animation: "plotaiPageIn .22s ease both" },
    header: { background: C.bg, padding: "20px clamp(16px, 5vw, 32px) 14px", display: "flex", alignItems: "center", gap: 12 },
    logo: { width: 34, height: 34, borderRadius: 9, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 },
    body: { padding: "8px clamp(16px, 5vw, 32px)" },
    label: { color: C.muted, fontSize: 11, fontWeight: 600, marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" },
    input: { width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 15, padding: "13px 16px", outline: "none", boxSizing: "border-box", fontWeight: 500 },
    btn: (v = "primary") => ({ width: "100%", padding: "16px 0", borderRadius: 14, border: v === "primary" ? "none" : `1px solid ${C.border}`, fontWeight: 600, fontSize: 15, cursor: "pointer", background: v === "primary" ? C.accent : "transparent", color: v === "primary" ? "#fff" : C.muted, marginTop: 10, letterSpacing: "-0.01em", boxShadow: v === "primary" ? "0 2px 8px rgba(26,26,26,0.13)" : "none" }),
    chip: (a) => ({ flex: 1, padding: "12px 6px", borderRadius: 11, fontSize: 13.5, fontWeight: 600, cursor: "pointer", border: `1px solid ${a ? C.accent : C.border}`, background: a ? C.accent : "transparent", color: a ? "#fff" : C.text, textTransform: "capitalize", transition: "all .15s" }),
    step: { width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontWeight: 800, fontSize: 16, cursor: "pointer", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" },
  };
  const field = (label, val, set) => (<div style={{ flex: 1 }}><span style={s.label}>{label}</span><input style={s.input} type="number" value={val} onChange={e => set(+e.target.value)} /></div>);
  const back = (fn) => <button onClick={fn} style={{ background: "none", border: "none", color: C.text, cursor: "pointer", fontSize: 22, padding: 0, lineHeight: 1, fontWeight: 300 }}>←</button>;
  const toggle = (on) => (<div style={{ width: 46, height: 28, borderRadius: 20, background: on ? C.accent : C.border, position: "relative", transition: "background .2s", flexShrink: 0 }}><div style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: on ? 21 : 3, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} /></div>);

  // ===== 4-PHASE PROGRESS ARC =====
  // maps each step to one of the four architect phases
  const PHASES = [
    { id: 1, label: "Brief", icon: "📝" },
    { id: 2, label: "Site", icon: "📍" },
    { id: 3, label: "Shape", icon: "🏗️" },
    { id: 4, label: "Design", icon: "✨" },
  ];
  const STEP_PHASE = {
    project: 1, brief1: 1, brief2: 1, brief3: 1, brief4: 1, builderUnit: 1, aptSetup: 1,
    input: 2, config: 3, vertical: 3, surround: 2, direction: 2, floor: 3, style: 4, summary: 4,
  };
  const currentPhase = STEP_PHASE[step] || 1;
  // consistent wording per project type
  const projLabel = projectType === "villa" ? "villa" : projectType === "builder" ? "builder floors" : projectType === "apartment" ? "apartment building" : "home";
  const projNoun = projectType === "apartment" ? "building" : projectType === "builder" ? "building" : "home";
  const ProjectPill = () => projectType ? (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 12px", fontSize: 11.5, fontWeight: 600, color: C.muted, marginBottom: 14 }}>
      <span>{PROJECT_TYPES.find(p => p.id === projectType)?.icon}</span>
      <span style={{ color: C.text }}>{PROJECT_TYPES.find(p => p.id === projectType)?.label}</span>
    </div>
  ) : null;
  const ProgressArc = () => (
    <div style={{ display: "flex", alignItems: "center", padding: "10px clamp(16px, 5vw, 32px) 4px", maxWidth: 600, margin: "0 auto", boxSizing: "border-box" }}>
      {PHASES.map((p, i) => {
        const done = p.id < currentPhase;
        const active = p.id === currentPhase;
        return (
          <div key={p.id} style={{ display: "flex", alignItems: "center", flex: i < PHASES.length - 1 ? 1 : "0 0 auto" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, flexShrink: 0,
                background: active ? C.accent : done ? C.green + "22" : C.card,
                border: `1.5px solid ${active ? C.accent : done ? C.green : C.border}`,
                color: active ? "#fff" : done ? C.green : C.muted,
              }}>{done ? "✓" : p.id}</div>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: active ? C.text : C.muted }}>{p.label}</span>
            </div>
            {i < PHASES.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: "0 4px", marginBottom: 14, borderRadius: 1, background: done ? C.green : C.border }} />
            )}
          </div>
        );
      })}
    </div>
  );

  // PAGE 1
  // ===== PHASE 1 HANDLERS =====
  const pickProject = (id) => {
    setProjectType(id);
    if (id === "villa") {
      // Villa: premium home, pre-fill larger program and premium finish
      setFamilyType("villa");
      setProgram(PROGRAM_TEMPLATES.villa);
      setQuality("premium");
      setStep("brief2");
    } else if (id === "home") {
      setStep("brief1"); // ask who lives here, then program
    } else if (id === "builder") {
      // Builder Floors: each floor is its own unit — set the per-unit program
      setStep("builderUnit");
    } else {
      // Apartments: multiple flats per floor — set flats and size
      setStep("aptSetup");
    }
  };
  const pickFamily = (id) => {
    setFamilyType(id);
    setProgram(PROGRAM_TEMPLATES[id]);
    setStep("brief2");
  };
  const stepCount = (key, delta, min, max) => setProgram(p => ({ ...p, [key]: Math.max(min, Math.min(max, p[key] + delta)) }));
  const toggleProg = (key) => setProgram(p => ({ ...p, [key]: !p[key] }));
  const togglePriority = (id) => setPriorities(ps => ps.includes(id) ? ps.filter(x => x !== id) : (ps.length >= 3 ? ps : [...ps, id]));
  const finishBrief = () => {
    // priorities flow through: Vastu priority turns on Vastu mode
    if (priorities.includes("vastu")) setVastuOn(true);
    setStep("input");
  };
  const programSummary = () => {
    const parts = [`${program.bedrooms} bed`, `${program.bathrooms} bath`];
    if (program.kitchens > 1) parts.push(`${program.kitchens} kitchens`);
    PROGRAM_TOGGLES.forEach(t => { if (program[t.id] && !["parking"].includes(t.id)) parts.push(t.label.split("/")[0].toLowerCase()); });
    return parts.join(" · ");
  };

  // PHASE 1 — SCREEN 1: WHO IS THIS FOR
  // SPLASH: show animated logo on launch, then reveal the app
  if (showSplash) return <Splash fading={splashFade} />;

  // PHASE 1 — SCREEN 0: WHAT ARE YOU BUILDING
  if (step === "project") return (
    <div style={s.root}>
      <div style={s.header}><div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34 }}><LogoMark size={30} /></div><div><div style={{ fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em" }}>Plot AI</div><div style={{ color: C.muted, fontSize: 12 }}>Your AI Architect</div></div></div>
      <ProgressArc />
      <div style={s.body}>
        {showResume && (
          <div style={{ background: C.selBg, border: `1px solid ${C.accent}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>👋 Welcome back</div>
            <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>We found a design you started on this device. Pick up where you left off, or start fresh.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={restoreDesign} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Resume design</button>
              <button onClick={() => { safeStore.remove("plotai_design"); setShowResume(false); setHasSaved(false); }} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Start fresh</button>
            </div>
          </div>
        )}
        <div style={{ fontWeight: 800, fontSize: 27, marginBottom: 6, letterSpacing: "-0.03em", lineHeight: 1.15 }}>What are you building?</div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>Every architect starts here. Your answer shapes the whole design — a home for yourself works very differently from floors you plan to sell.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {PROJECT_TYPES.map(pt => (
            <div key={pt.id} onClick={() => pickProject(pt.id)} style={{ background: projectType === pt.id ? C.selBg : C.card, border: `1.5px solid ${projectType === pt.id ? C.accent : C.border}`, borderRadius: 14, padding: "18px 14px", cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: 32 }}>{pt.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8 }}>{pt.label}</div>
              <div style={{ color: C.muted, fontSize: 10.5, marginTop: 3, lineHeight: 1.4 }}>{pt.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ color: C.muted, fontSize: 11.5, marginTop: 18, textAlign: "center", lineHeight: 1.5 }}>Tap one to begin designing.</div>

        {/* SAMPLE GALLERY — instant finished plans, the first-impression hook */}
        <div style={{ marginTop: 26, paddingTop: 22, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>✨ Or see it in action</div>
          </div>
          <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 14, lineHeight: 1.5 }}>Tap a ready-made design to see a finished plan instantly — furniture, Vastu score and all. No setup needed.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {SAMPLES.map(sm => (
              <div key={sm.id} onClick={() => loadSample(sm)} style={{ display: "flex", alignItems: "center", gap: 14, background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ fontSize: 30, lineHeight: 1 }}>{sm.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{sm.title}</div>
                  <div style={{ color: C.muted, fontSize: 11.5, marginTop: 2 }}>{sm.sub}</div>
                </div>
                <div style={{ color: C.accent, fontWeight: 700, fontSize: 13 }}>View →</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // PHASE 1 — BUILDER FLOORS: per-unit program
  if (step === "builderUnit") {
    const setU = (key, val) => setUnitProgram(u => ({ ...u, [key]: val }));
    const stepU = (key, d, min, max) => setUnitProgram(u => ({ ...u, [key]: Math.max(min, Math.min(max, u[key] + d)) }));
    const bhkLabel = `${unitProgram.bedrooms}BHK`;
    return (
      <div style={s.root}>
        <div style={s.header}>{back(() => setStep("project"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>Builder Floors</div><div style={{ color: C.muted, fontSize: 12 }}>Phase 1 · each floor a separate home</div></div></div>
        <ProgressArc />
        <div style={s.body}>
          <div style={{ fontWeight: 800, fontSize: 27, marginBottom: 6, letterSpacing: "-0.03em", lineHeight: 1.15 }}>What is each floor?</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 22, lineHeight: 1.5 }}>Each floor will be a complete independent home — its own kitchen, entrance and rooms — to sell or rent. Set the unit that repeats on every floor.</div>

          <div style={{ background: C.surface, borderRadius: 16, padding: 20, marginBottom: 18, textAlign: "center", border: `1px solid ${C.border}` }}>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Each unit</div>
            <div style={{ fontWeight: 800, fontSize: 38, letterSpacing: "-0.03em", margin: "4px 0" }}>{bhkLabel}</div>
            <div style={{ color: C.muted, fontSize: 12 }}>{unitProgram.bedrooms} bed · {unitProgram.bathrooms} bath · kitchen · living</div>
          </div>

          {[["bedrooms", "Bedrooms per unit", 1, 5], ["bathrooms", "Bathrooms per unit", 1, 4]].map(([key, label, min, max]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, background: C.card, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}` }}>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{label}</span>
              <button onClick={() => stepU(key, -1, min, max)} style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: "pointer", fontSize: 18, fontWeight: 700 }}>−</button>
              <span style={{ width: 32, textAlign: "center", fontWeight: 800, fontSize: 17 }}>{unitProgram[key]}</span>
              <button onClick={() => stepU(key, 1, min, max)} style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: "pointer", fontSize: 18, fontWeight: 700 }}>+</button>
            </div>
          ))}

          <div style={{ fontWeight: 700, fontSize: 13, margin: "16px 0 8px" }}>Each unit also includes</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {[["pooja", "Pooja Room", "🪔"], ["balcony", "Balcony", "🌅"]].map(([key, label, icon]) => {
              const on = unitProgram[key];
              return (
                <div key={key} onClick={() => setU(key, !on)} style={{ display: "flex", alignItems: "center", gap: 8, background: on ? C.selBg : C.card, border: `1px solid ${on ? C.accent : C.border}`, borderRadius: 11, padding: "12px 14px", cursor: "pointer" }}>
                  <span style={{ fontSize: 16 }}>{icon}</span><span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{label}</span>{toggle(on)}
                </div>
              );
            })}
          </div>
          <div style={{ color: C.muted, fontSize: 11.5, marginTop: 4, marginBottom: 18, lineHeight: 1.5 }}>Kitchen, living room and entrance are included in every unit automatically — each floor is a full home.</div>

          <div onClick={() => setSameOnEveryFloor(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: sameOnEveryFloor ? C.selBg : C.card, borderRadius: 12, padding: "14px 16px", marginBottom: 18, border: `1px solid ${sameOnEveryFloor ? C.accent : C.border}`, cursor: "pointer" }}>
            <div><div style={{ fontWeight: 700, fontSize: 14 }}>Same unit on every floor</div><div style={{ color: C.muted, fontSize: 12 }}>{sameOnEveryFloor ? "All floors identical (recommended)" : "You can customize each floor later"}</div></div>
            {toggle(sameOnEveryFloor)}
          </div>

          <button style={s.btn()} onClick={() => { setProgram({ ...PROGRAM_TEMPLATES.family, bedrooms: unitProgram.bedrooms, bathrooms: unitProgram.bathrooms, kitchens: 1, pooja: unitProgram.pooja, balcony: unitProgram.balcony }); setStep("input"); }}>Continue → Your Plot</button>
        </div>
      </div>
    );
  }

  // PHASE 1 — APARTMENTS: flats per floor + flat size
  if (step === "aptSetup") {
    const bhkName = `${flatBHK}BHK`;
    return (
      <div style={s.root}>
        <div style={s.header}>{back(() => setStep("project"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>Apartments</div><div style={{ color: C.muted, fontSize: 12 }}>Phase 1 · multiple flats per floor</div></div></div>
        <ProgressArc />
        <div style={s.body}>
          <div style={{ fontWeight: 800, fontSize: 27, marginBottom: 6, letterSpacing: "-0.03em", lineHeight: 1.15 }}>How are the flats arranged?</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 22, lineHeight: 1.5 }}>Each floor will be divided into separate flats, each a self-contained home sharing a common corridor and staircase.</div>

          <span style={s.label}>Flats on each floor</span>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[2, 3, 4].map(n => (
              <div key={n} onClick={() => setFlatsPerFloor(n)} style={{ flex: 1, textAlign: "center", padding: "16px 0", borderRadius: 12, border: `1.5px solid ${flatsPerFloor === n ? C.accent : C.border}`, background: flatsPerFloor === n ? C.selBg : C.card, cursor: "pointer" }}>
                <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em" }}>{n}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>flats</div>
              </div>
            ))}
          </div>

          <span style={s.label}>Size of each flat</span>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[1, 2, 3].map(n => (
              <div key={n} onClick={() => setFlatBHK(n)} style={{ flex: 1, textAlign: "center", padding: "14px 0", borderRadius: 12, border: `1.5px solid ${flatBHK === n ? C.accent : C.border}`, background: flatBHK === n ? C.selBg : C.card, cursor: "pointer" }}>
                <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>{n}BHK</div>
                <div style={{ color: C.muted, fontSize: 10.5, marginTop: 2 }}>{n} bed{n > 1 ? "s" : ""}</div>
              </div>
            ))}
          </div>

          <div style={{ background: C.surface, borderRadius: 16, padding: 18, marginBottom: 20, textAlign: "center", border: `1px solid ${C.border}` }}>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Each floor</div>
            <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-0.03em", margin: "4px 0" }}>{flatsPerFloor} × {bhkName}</div>
            <div style={{ color: C.muted, fontSize: 12 }}>{flatsPerFloor} flats, each with kitchen, bath & {flatBHK} bedroom{flatBHK > 1 ? "s" : ""}</div>
          </div>

          <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 18, lineHeight: 1.5 }}>You will set how many floors next. Total flats = {flatsPerFloor} per floor × your number of floors.</div>

          <button style={s.btn()} onClick={() => setStep("input")}>Continue → Your Plot</button>
        </div>
      </div>
    );
  }

  if (step === "brief1") return (
    <div style={s.root}>
      <div style={s.header}>{back(() => setStep("project"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>{PROJECT_TYPES.find(p => p.id === projectType)?.label || "The Brief"}</div><div style={{ color: C.muted, fontSize: 12 }}>Phase 1 · the brief</div></div></div>
      <ProgressArc />
      <div style={s.body}>
        <div style={{ fontWeight: 800, fontSize: 27, marginBottom: 6, letterSpacing: "-0.03em", lineHeight: 1.15 }}>{projectType === "builder" || projectType === "apartment" ? "Who will live in each unit?" : "Who is it for?"}</div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>{projectType === "builder" || projectType === "apartment" ? "This sets the program for each home you will build to sell or rent." : "A real architect starts with the people, not the numbers."}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {FAMILY_TYPES.map(ft => (
            <div key={ft.id} onClick={() => pickFamily(ft.id)} style={{ background: familyType === ft.id ? C.selBg : C.card, border: `1.5px solid ${familyType === ft.id ? C.accent : C.border}`, borderRadius: 14, padding: "18px 14px", cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: 32 }}>{ft.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8 }}>{ft.label}</div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{ft.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ color: C.muted, fontSize: 11.5, marginTop: 18, textAlign: "center", lineHeight: 1.5 }}>Tap one to continue — we will suggest the right rooms, which you can change.</div>
      </div>
    </div>
  );

  // PHASE 1 — SCREEN 2: ROOM PROGRAM
  if (step === "brief2") return (
    <div style={s.root}>
      <div style={s.header}>{back(() => setStep(projectType === "villa" ? "project" : "brief1"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>What your home needs</div><div style={{ color: C.muted, fontSize: 12 }}>{projectType === "villa" ? "Your villa program" : "Your room program"}</div></div></div>
      <ProgressArc />
      <div style={s.body}>
        <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 16, lineHeight: 1.5 }}>We have suggested rooms for a {FAMILY_TYPES.find(f => f.id === familyType)?.label.toLowerCase()}. Adjust anything to fit your life.</div>

        {[["bedrooms", "Bedrooms", "🛏️", 1, 8], ["bathrooms", "Bathrooms", "🚿", 1, 6], ["kitchens", "Kitchens", "🍳", 1, 3]].map(([key, label, icon, min, max]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, background: C.card, borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{label}</span>
            <button onClick={() => stepCount(key, -1, min, max)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: "pointer", fontSize: 18, fontWeight: 700 }}>−</button>
            <span style={{ width: 30, textAlign: "center", fontWeight: 800, fontSize: 16, color: C.accent }}>{program[key]}</span>
            <button onClick={() => stepCount(key, 1, min, max)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: "pointer", fontSize: 18, fontWeight: 700 }}>+</button>
          </div>
        ))}

        <div style={{ fontWeight: 700, fontSize: 13, margin: "16px 0 8px" }}>Other spaces you would like</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {PROGRAM_TOGGLES.map(t => {
            const on = program[t.id];
            return (
              <div key={t.id} onClick={() => toggleProg(t.id)} style={{ background: on ? C.selBg : C.card, border: `1.5px solid ${on ? C.accent : C.border}`, borderRadius: 10, padding: "10px 6px", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 20 }}>{t.icon}</div>
                <div style={{ fontSize: 10.5, fontWeight: 600, marginTop: 4, color: on ? C.text : C.muted }}>{t.label}</div>
              </div>
            );
          })}
        </div>

        <div style={{ background: C.surface, borderRadius: 12, padding: 14, margin: "18px 0", border: `1px solid ${C.border}` }}>
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>YOUR HOME</div>
          <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.5 }}>{programSummary()}</div>
        </div>

        <button style={s.btn()} onClick={() => setStep("brief3")}>Continue → What matters most</button>
      </div>
    </div>
  );

  // PHASE 1 — SCREEN 3: PRIORITIES
  if (step === "brief3") return (
    <div style={s.root}>
      <div style={s.header}>{back(() => setStep("brief2"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>What matters most</div><div style={{ color: C.muted, fontSize: 12 }}>Pick up to 3 — shapes your design</div></div></div>
      <ProgressArc />
      <div style={s.body}>
        <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 16, lineHeight: 1.5 }}>An architect designs around what you value most. Choose up to three — we will tune your layout for them. ({priorities.length}/3)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {PRIORITIES.map(pr => {
            const on = priorities.includes(pr.id);
            const dim = !on && priorities.length >= 3;
            return (
              <div key={pr.id} onClick={() => togglePriority(pr.id)} style={{ background: on ? C.selBg : C.card, border: `1.5px solid ${on ? C.accent : C.border}`, borderRadius: 14, padding: "16px 12px", cursor: dim ? "not-allowed" : "pointer", textAlign: "center", opacity: dim ? 0.45 : 1 }}>
                <div style={{ fontSize: 26 }}>{pr.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 6, color: on ? C.text : C.muted }}>{pr.label}</div>
              </div>
            );
          })}
        </div>
        {priorities.includes("vastu") && <div style={{ background: C.selBg, border: `1px solid ${C.purple}55`, borderRadius: 10, padding: 12, marginTop: 14, fontSize: 12, color: C.purple, lineHeight: 1.5 }}>🧭 Vastu mode will be turned on — we will guide room placement by direction.</div>}
        <button style={{ ...s.btn(), marginTop: 18 }} onClick={() => { if (priorities.includes("vastu")) setVastuOn(true); setStep("brief4"); }}>Continue → Layout details</button>
        <button style={s.btn("secondary")} onClick={finishBrief}>Skip the rest</button>
      </div>
    </div>
  );

  // PHASE 1 — SCREEN 4: ARCHITECT'S BRIEF (connections, staircase, parking)
  if (step === "brief4") {
    const CONN = [
      { id: "openKitchen", label: "Open kitchen connected to dining", icon: "🍳" },
      { id: "masterEnsuite", label: "Master bedroom with attached bath", icon: "🛁" },
      { id: "livingToOutside", label: "Living room opens to balcony/garden", icon: "🌿" },
      { id: "poojaVisible", label: "Pooja room visible from living", icon: "🪔" },
    ];
    return (
      <div style={s.root}>
        <div style={s.header}>{back(() => setStep("brief3"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>Layout details</div><div style={{ color: C.muted, fontSize: 12 }}>Phase 1 · how your home connects</div></div></div>
        <ProgressArc />
        <div style={s.body}>
          <div style={{ fontWeight: 800, fontSize: 27, marginBottom: 6, letterSpacing: "-0.03em", lineHeight: 1.15 }}>How should it connect?</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>These are the questions a real architect asks — how rooms relate, where the stairs go, and parking. They shape a much better layout.</div>

          <span style={s.label}>Room connections</span>
          <div style={{ marginBottom: 20 }}>
            {CONN.map(c => {
              const on = connections[c.id];
              return (
                <div key={c.id} onClick={() => setConnections(p => ({ ...p, [c.id]: !p[c.id] }))} style={{ display: "flex", alignItems: "center", gap: 10, background: on ? C.selBg : C.card, border: `1px solid ${on ? C.accent : C.border}`, borderRadius: 12, padding: "13px 14px", marginBottom: 8, cursor: "pointer" }}>
                  <span style={{ fontSize: 17 }}>{c.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{c.label}</span>
                  {toggle(on)}
                </div>
              );
            })}
          </div>

          <span style={s.label}>Staircase shape</span>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[["straight", "Straight"], ["l-shaped", "L-shaped"], ["u-shaped", "U-shaped"]].map(([id, lbl]) => (
              <div key={id} onClick={() => setStairType(id)} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 11, border: `1.5px solid ${stairType === id ? C.accent : C.border}`, background: stairType === id ? C.selBg : C.card, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>{lbl}</div>
            ))}
          </div>
          <span style={s.label}>Staircase position</span>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[["front", "Near entry"], ["side", "Along a side"], ["rear", "At the rear"]].map(([id, lbl]) => (
              <div key={id} onClick={() => setStairSide(id)} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 11, border: `1.5px solid ${stairSide === id ? C.accent : C.border}`, background: stairSide === id ? C.selBg : C.card, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>{lbl}</div>
            ))}
          </div>

          <span style={s.label}>Parking — how many cars?</span>
          <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
            {[0, 1, 2, 3].map(n => (
              <div key={n} onClick={() => setCarCount(n)} style={{ flex: 1, textAlign: "center", padding: "14px 0", borderRadius: 11, border: `1.5px solid ${carCount === n ? C.accent : C.border}`, background: carCount === n ? C.selBg : C.card, cursor: "pointer" }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{n === 3 ? "3+" : n}</div>
                <div style={{ color: C.muted, fontSize: 10 }}>{n === 0 ? "none" : n === 1 ? "car" : "cars"}</div>
              </div>
            ))}
          </div>

          <button style={s.btn()} onClick={finishBrief}>Continue → Your Plot</button>
        </div>
      </div>
    );
  }

  if (step === "input") return (
    <div style={s.root}>
      <div style={s.header}>{back(() => setStep("brief4"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>Your Plot</div><div style={{ color: C.muted, fontSize: 12 }}>Phase 2 · your land</div></div></div>
      <ProgressArc />
      <div style={s.body}>
        <ProjectPill />
        <div style={{ fontWeight: 800, fontSize: 27, marginBottom: 6, letterSpacing: "-0.03em", lineHeight: 1.15 }}>Now, your land</div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Your brief is set. Let us map the plot your {projNoun} will sit on.</div>
        <span style={s.label}>Purpose</span>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>{["residential", "commercial"].map(p => <button key={p} style={s.chip(purpose === p)} onClick={() => setPurpose(p)}>{p}</button>)}</div>
        <span style={s.label}>Plot Shape</span>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>{[["rect", "Rectangle"], ["quad", "4-Sided"], ["lshape", "L-Shaped"]].map(([id, lbl]) => <button key={id} style={s.chip(shapeType === id)} onClick={() => setShapeType(id)}>{lbl}</button>)}</div>
        {shapeType === "rect" && <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>{field("Width (ft)", rectW, setRectW)}{field("Depth (ft)", rectD, setRectD)}</div>}
        {shapeType === "quad" && <>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>{field("Front (ft)", qF, setQF)}{field("Right side (ft)", qR, setQR)}</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>{field("Back (ft)", qB, setQB)}{field("Left side (ft)", qL, setQL)}</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>{field("Diagonal (ft)", qDiag, setQDiag)}<div style={{ flex: 1 }} /></div>
          <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 16, lineHeight: 1.5 }}>The diagonal is the corner-to-corner distance from your survey paper. It locks the exact shape.</div>
        </>}
        {shapeType === "lshape" && <>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>{field("Total width (ft)", lW, setLW)}{field("Total depth (ft)", lD, setLD)}</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>{field("Cut width (ft)", lNW, setLNW)}{field("Cut depth (ft)", lND, setLND)}</div>
        </>}
        <div style={{ marginBottom: 16 }}><ShapeView points={points} /></div>
        <div style={{ background: C.card, borderRadius: 14, padding: 14, marginBottom: 18, border: `1px solid ${C.border}`, textAlign: "center" }}>
          <div style={{ color: C.muted, fontSize: 12 }}>Plot Area</div>
          <div style={{ color: C.accent, fontWeight: 800, fontSize: 32, letterSpacing: "-0.03em" }}>{area.toLocaleString()} sqft</div>
          <div style={{ color: C.muted, fontSize: 11.5, marginTop: 2 }}>{(area / 9).toFixed(0)} gaj · {(area * 0.0929).toFixed(0)} m² · {(area / 435.6).toFixed(2)} cents</div>
        </div>
        <button style={s.btn()} onClick={() => area > 0 && setStep("config")}>Continue → Floors & Setbacks</button>
      </div>
    </div>
  );

  // PAGE 2
  if (step === "config") return (
    <div style={s.root}>
      <div style={s.header}>{back(() => setStep("input"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>Building Setup</div><div style={{ color: C.muted, fontSize: 12 }}>Floors, basement, top floor, setbacks</div></div></div>
      <ProgressArc />
      <div style={s.body}>
        <div onClick={() => setHasBasement(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: hasBasement ? C.selBg : C.card, borderRadius: 12, padding: "12px 16px", marginBottom: 16, border: `1.5px solid ${hasBasement ? C.accent : C.border}`, cursor: "pointer" }}>
          <div><div style={{ fontWeight: 700, fontSize: 14 }}>🕳️ Include a Basement</div><div style={{ color: C.muted, fontSize: 12 }}>Parking, storage, home theatre, gym</div></div>{toggle(hasBasement)}
        </div>
        <span style={s.label}>Floors above ground (including ground floor)</span>
        <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>{[1, 2, 3, 4, 5].map(f => <button key={f} style={s.chip(floorsCount === f)} onClick={() => setFloorsCount(f)}>{f}</button>)}</div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 18 }}>{hasBasement ? "Basement · " : ""}{Array.from({ length: floorsCount }, (_, i) => i === 0 ? "Ground" : i === 1 ? "1st" : i === 2 ? "2nd" : i === 3 ? "3rd" : `${i}th`).join(" · ")}</div>
        <span style={s.label}>Your topmost floor</span>
        <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 10 }}>Pick what sits on top of your building.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[["normal", "🏠", "Full floor", "Rooms, like every other floor"], ["terrace", "🏞️", "Open terrace", "Left open — no rooms on top"], ["penthouse", "🏙️", "Penthouse", "A smaller living space up top"], ["both", "🌇", "Penthouse + terrace", "Some rooms, rest open terrace"]].map(([id, ic, lbl, desc]) => (
            <div key={id} onClick={() => setTopMode(id)} style={{ background: topMode === id ? C.selBg : C.card, border: `1.5px solid ${topMode === id ? C.accent : C.border}`, borderRadius: 12, padding: "14px 12px", cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: 26 }}>{ic}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 6 }}>{lbl}</div>
              <div style={{ color: C.muted, fontSize: 10.5, marginTop: 3, lineHeight: 1.35 }}>{desc}</div>
            </div>
          ))}
        </div>
        <div onClick={() => setLiftOn(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.card, borderRadius: 12, padding: "12px 16px", marginBottom: liftOn ? 8 : 18, border: `1.5px solid ${liftOn ? C.purple : C.border}`, cursor: "pointer" }}>
          <div><div style={{ fontWeight: 700, fontSize: 14 }}>🛗 Include a Lift</div><div style={{ color: C.muted, fontSize: 12 }}>Reserves space on every floor for the lift shaft</div></div>{toggle(liftOn)}
        </div>
        {liftOn && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, borderRadius: 12, padding: "10px 14px", marginBottom: 18 }}>
            <div style={{ fontSize: 12.5, color: C.text }}>Lift area <span style={{ color: C.muted }}>(min {CORE.lift.min} sqft)</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setLiftArea(a => Math.max(CORE.lift.min, a - 5))} style={s.step}>−</button>
              <span style={{ fontWeight: 800, fontSize: 14, minWidth: 54, textAlign: "center" }}>{Math.max(CORE.lift.min, liftArea)} sqft</span>
              <button onClick={() => setLiftArea(a => Math.min(120, a + 5))} style={s.step}>+</button>
            </div>
          </div>
        )}

        <span style={s.label}>Staircase area</span>
        <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 10, lineHeight: 1.5 }}>Every floor reserves space for the staircase. {CORE.stairs.min} sqft is the practical minimum — increase it for a wider, more comfortable stair.</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, borderRadius: 12, padding: "10px 14px", marginBottom: 18 }}>
          <div style={{ fontSize: 12.5, color: C.text }}>🪜 Staircase <span style={{ color: C.muted }}>(min {CORE.stairs.min} sqft)</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setStairArea(a => Math.max(CORE.stairs.min, a - 10))} style={s.step}>−</button>
            <span style={{ fontWeight: 800, fontSize: 14, minWidth: 54, textAlign: "center" }}>{Math.max(CORE.stairs.min, stairArea)} sqft</span>
            <button onClick={() => setStairArea(a => Math.min(220, a + 10))} style={s.step}>+</button>
          </div>
        </div>

        <span style={s.label}>Hallway / corridor width</span>
        <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 10, lineHeight: 1.5 }}>Used in the Corridor plan layout. 3.5 ft is the comfortable minimum — widen it for a more open passage.</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, borderRadius: 12, padding: "10px 14px", marginBottom: 18 }}>
          <div style={{ fontSize: 12.5, color: C.text }}>↔ Corridor <span style={{ color: C.muted }}>(min 3.5 ft)</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setCorridorWidth(w => Math.max(3.5, +(w - 0.5).toFixed(1)))} style={s.step}>−</button>
            <span style={{ fontWeight: 800, fontSize: 14, minWidth: 54, textAlign: "center" }}>{Math.max(3.5, corridorWidth)} ft</span>
            <button onClick={() => setCorridorWidth(w => Math.min(6, +(w + 0.5).toFixed(1)))} style={s.step}>+</button>
          </div>
        </div>
        <span style={s.label}>Setbacks — open space left on each side (ft)</span>
        <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 10, lineHeight: 1.5 }}>Most local building rules require leaving open margins around the building.</div>
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>{field("Front", sbFront, setSbFront)}{field("Rear", sbRear, setSbRear)}</div>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>{field("Left", sbLeft, setSbLeft)}{field("Right", sbRight, setSbRight)}</div>
        {(() => {
          const cov = area > 0 ? Math.round((footprint / area) * 100) : 0;
          // typical Indian residential ground-coverage ceiling (small/mid plots): ~65-75%
          const COV_LIMIT = 75;
          const totalBuildable = footprint * floorList.filter(f => f.kind !== "basement" && f.kind !== "terrace").length;
          const covColor = cov === 0 ? C.red : cov <= COV_LIMIT ? C.green : C.amber;
          const isL = shapeType === "lshape";
          return (
            <div style={{ background: C.card, borderRadius: 14, padding: 16, marginBottom: 20, border: `1px solid ${C.border}` }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, letterSpacing: "-0.01em" }}>🏗️ What you can build here</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, background: C.surface, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ color: C.muted, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Plot</div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{area.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}> sqft</span></div>
                </div>
                <div style={{ flex: 1, background: C.surface, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ color: C.muted, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Buildable / floor</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: C.green }}>{footprint.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}> sqft</span></div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: C.muted }}>Ground coverage</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: covColor }}>{cov}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: C.surface, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ width: Math.min(100, cov) + "%", height: "100%", background: covColor }} />
              </div>
              {footprint > 0 ? (
                <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6 }}>
                  After your setbacks, you can build about <b style={{ color: C.text }}>{footprint.toLocaleString()} sqft per floor</b>, and roughly <b style={{ color: C.text }}>{totalBuildable.toLocaleString()} sqft total</b> across {floorList.filter(f => f.kind !== "basement" && f.kind !== "terrace").length} living floor(s).{" "}
                  {cov <= COV_LIMIT
                    ? `That is within the ~${COV_LIMIT}% ground coverage most Indian residential bylaws allow.`
                    : `That is above the ~${COV_LIMIT}% ground coverage many bylaws cap — you may need larger setbacks, or check your local rule.`}
                  {isL ? " On your L-shaped plot, the cut-out corner is left as open space — garden, parking, or courtyard." : ""}
                </div>
              ) : (
                <div style={{ fontSize: 11.5, color: C.red, lineHeight: 1.5 }}>Your setbacks are larger than the plot — nothing is buildable. Reduce them to continue.</div>
              )}
              <div style={{ fontSize: 10, color: C.muted, marginTop: 8, fontStyle: "italic", lineHeight: 1.5 }}>Coverage and FAR limits vary by city and plot size — this is a planning guide, not a sanctioned drawing. Confirm with your local authority or architect.</div>
            </div>
          );
        })()}
        <button style={s.btn()} onClick={() => footprint > 0 ? setStep("vertical") : null}>Continue → Heights</button>
        {footprint <= 0 && <div style={{ color: C.red, fontSize: 12, marginTop: 8, textAlign: "center" }}>Setbacks are larger than the plot. Reduce them to continue.</div>}
      </div>
    </div>
  );

  // PAGE 2.2: VERTICAL DIMENSIONS
  if (step === "vertical") {
    const EW = 300, EH = 320, ground = EH - 70;
    const pxPerFt = 12;
    const plinthPx = plinthFt * pxPerFt;
    const elevRects = [];
    elevRects.push({ label: "Plinth", ft: plinthFt, y: ground - plinthPx, h: plinthPx, color: "#9C7B52", isPlinth: true });
    let yCursor = ground - plinthPx;
    aboveGroundFloors.forEach((f) => {
      const h = htOf(f.key) * pxPerFt;
      yCursor -= h;
      elevRects.push({ label: f.label.replace(" Floor", ""), ft: htOf(f.key), y: yCursor, h, color: C.accent, key: f.key });
    });
    let basementRect = null;
    if (hasBasement) basementRect = { label: "Basement", ft: basementHt, y: ground, h: basementHt * pxPerFt, color: "#6B4E2E" };

    return (
      <div style={s.root}>
        <div style={s.header}>{back(() => setStep("config"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>Building Heights</div><div style={{ color: C.muted, fontSize: 12 }}>Floor heights, plinth & total height</div></div></div>
        <ProgressArc />
        <div style={s.body}>
          <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 16, lineHeight: 1.5 }}>These vertical dimensions follow the National Building Code of India. They decide your ceiling comfort, moisture protection, and total building height.</div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontWeight: 700, fontSize: 13 }}>Plinth height (above road)</span><span style={{ color: C.amber, fontWeight: 700, fontSize: 13 }}>{plinthFt} ft</span></div>
            <SizeSliderFt value={plinthFt} min={1.5} max={3} step={0.5} color={C.amber} onChange={setPlinthFt} unit="ft" />
            <div style={{ color: C.muted, fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>NBC minimum 45 cm (1.5 ft) above road for drainage. ~2 ft is ideal — protects against rainwater and rising damp.</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontWeight: 700, fontSize: 13 }}>Floor-to-floor height (all floors)</span><span style={{ color: C.accent, fontWeight: 700, fontSize: 13 }}>{floorHt} ft</span></div>
            <SizeSliderFt value={floorHt} min={9} max={12} step={0.5} color={C.accent} onChange={setFloorHt} unit="ft" />
            <div style={{ color: C.muted, fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>Includes slab, beam & finishing. Your clear ceiling will be about <b style={{ color: C.text }}>{clearCeiling} ft</b> — NBC needs at least 9 ft for living rooms.</div>
          </div>

          {aboveGroundFloors.length > 1 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Adjust individual floors (optional)</div>
              {aboveGroundFloors.map(f => {
                const v = htOf(f.key);
                const overridden = floorHtOverrides[f.key] != null;
                return (
                  <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ flex: 1, fontSize: 12.5 }}>{f.label}</span>
                    <button onClick={() => setFloorHtOverrides(o => ({ ...o, [f.key]: Math.max(9, +(v - 0.5).toFixed(1)) }))} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: "pointer", fontSize: 15 }}>−</button>
                    <span style={{ fontSize: 12.5, width: 54, textAlign: "center", color: overridden ? C.accent : C.muted }}>{v} ft</span>
                    <button onClick={() => setFloorHtOverrides(o => ({ ...o, [f.key]: Math.min(12, +(v + 0.5).toFixed(1)) }))} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, color: C.text, cursor: "pointer", fontSize: 15 }}>+</button>
                    {overridden && <button onClick={() => setFloorHtOverrides(o => { const n = { ...o }; delete n[f.key]; return n; })} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.red}55`, background: "transparent", color: C.red, cursor: "pointer", fontSize: 12 }}>↺</button>}
                  </div>
                );
              })}
            </div>
          )}

          {hasBasement && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontWeight: 700, fontSize: 13 }}>🕳️ Basement height</span><span style={{ color: C.accent, fontWeight: 700, fontSize: 13 }}>{basementHt} ft</span></div>
              <SizeSliderFt value={basementHt} min={8} max={15} step={0.5} color={"#9C7B52"} onChange={setBasementHt} unit="ft" />
              <div style={{ color: C.muted, fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>NBC: 2.5 m–4.5 m (≈8–15 ft). No direct entry from the road — access via internal stairs only.</div>
            </div>
          )}

          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Side elevation</div>
          <svg width={EW} height={EH} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, display: "block", margin: "0 auto 4px" }}>
            <line x1={20} y1={ground} x2={EW - 20} y2={ground} stroke={C.amber} strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={EW - 22} y={ground - 5} textAnchor="end" fontSize={9} fill={C.amber}>road level</text>
            {basementRect && (<g><rect x={70} y={basementRect.y} width={EW - 140} height={basementRect.h} fill={basementRect.color} stroke="#6B4E2E" strokeWidth={1} /><text x={EW / 2} y={basementRect.y + basementRect.h / 2 + 3} textAnchor="middle" fontSize={10} fill="#F4EDE1">Basement · {basementRect.ft} ft</text></g>)}
            {elevRects.map((r, i) => (<g key={i}><rect x={r.isPlinth ? 60 : 70} y={r.y} width={r.isPlinth ? EW - 120 : EW - 140} height={r.h} fill={r.isPlinth ? r.color : C.accent + "33"} stroke={r.isPlinth ? "#7A5C38" : C.accent} strokeWidth={1} />{r.h > 14 && <text x={EW / 2} y={r.y + r.h / 2 + 3} textAnchor="middle" fontSize={9.5} fill={r.isPlinth ? "#FBF6EC" : C.text}>{r.label} · {r.ft} ft</text>}</g>))}
            <line x1={48} y1={ground - plinthPx - aboveGroundHeight * pxPerFt} x2={48} y2={ground} stroke={C.green} strokeWidth={1.5} />
            <text x={44} y={ground - (plinthPx + aboveGroundHeight * pxPerFt) / 2} textAnchor="end" fontSize={9} fill={C.green} transform={`rotate(-90 44 ${ground - (plinthPx + aboveGroundHeight * pxPerFt) / 2})`}>total {totalHeightFromRoad} ft</text>
          </svg>

          <div style={{ background: C.card, borderRadius: 14, padding: 14, margin: "10px 0 8px", border: `1px solid ${heightWarn ? C.amber : C.border}`, textAlign: "center" }}>
            <div style={{ color: C.muted, fontSize: 12 }}>Total height from road level</div>
            <div style={{ color: C.green, fontWeight: 800, fontSize: 32, letterSpacing: "-0.03em" }}>{totalHeightFromRoad} ft</div>
            <div style={{ color: C.muted, fontSize: 11.5, marginTop: 2 }}>≈ {(totalHeightFromRoad * 0.3048).toFixed(1)} m · plinth {plinthFt} ft + {aboveGroundFloors.length} floor(s){hasBasement ? " (basement below)" : ""}</div>
          </div>
          {heightWarn && <div style={{ color: C.amber, fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>⚠️ Above ~15 m, many cities require extra approvals and fire-safety provisions. Confirm your local height limit.</div>}

          <button style={s.btn()} onClick={() => setStep("surround")}>Continue → Surroundings</button>
        </div>
      </div>
    );
  }

  // PAGE 2.5: SURROUNDINGS, GATES, COURTYARD
  if (step === "surround") return (
    <div style={s.root}>
      <div style={s.header}>{back(() => setStep("vertical"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>Plot Surroundings</div><div style={{ color: C.muted, fontSize: 12 }}>What is around your plot, and where are the gates?</div></div></div>
      <ProgressArc />
      <div style={s.body}>
        <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 16, lineHeight: 1.5 }}>
          Tell us what is on each side. Sides blocked by other buildings get no light or air — this is what decides whether your inner rooms need a courtyard or ventilation shaft.
        </div>

        {SIDE_KEYS.map(side => (
          <div key={side} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{SIDE_LABEL[side]} side</span>
              <span style={{ fontSize: 11, color: isOpenSide(surround[side]) ? C.green : C.amber }}>{isOpenSide(surround[side]) ? "open · light & air" : "blocked · no light"}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
              {SURROUND_OPTS.map(opt => {
                const sel = surround[side] === opt.id;
                return (
                  <div key={opt.id} onClick={() => setSurround(s2 => ({ ...s2, [side]: opt.id }))} style={{ background: sel ? (opt.open ? C.green + "22" : C.amber + "22") : C.card, border: `1.5px solid ${sel ? (opt.open ? C.green : C.amber) : C.border}`, borderRadius: 9, padding: "8px 4px", cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontSize: 16 }}>{opt.icon}</div>
                    <div style={{ fontSize: 9.5, fontWeight: 600, marginTop: 2, color: sel ? C.text : C.muted, lineHeight: 1.2 }}>{opt.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ background: C.card, borderRadius: 12, padding: 12, margin: "8px 0 18px", border: `1px solid ${C.border}` }}>
          <div style={{ color: C.muted, fontSize: 12 }}>{openSidesCount} of 4 sides open</div>
          <div style={{ height: 6, borderRadius: 3, background: C.surface, overflow: "hidden", marginTop: 6 }}>
            <div style={{ width: (openSidesCount / 4 * 100) + "%", height: "100%", background: openSidesCount >= 3 ? C.green : openSidesCount === 2 ? C.amber : C.red }} />
          </div>
        </div>

        <span style={s.label}>Where are the gates? (tap any side, more than one allowed)</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          {SIDE_KEYS.map(side => {
            const on = gates[side];
            return (
              <div key={side} onClick={() => setGates(g => ({ ...g, [side]: !g[side] }))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: on ? C.selBg : C.card, border: `1.5px solid ${on ? C.accent : C.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>🚪 {SIDE_LABEL[side]}</span>
                <span style={{ fontSize: 11, color: on ? C.accent : C.muted }}>{on ? "gate" : "—"}</span>
              </div>
            );
          })}
        </div>
        <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 18 }}>
          {gateSides.length === 0 ? "⚠️ Mark at least one gate to continue." : gateSides.length === 1 ? `Main entry: ${SIDE_LABEL[gateSides[0]]}.` : `Main entry: ${SIDE_LABEL[gateSides[0]]} · ${gateSides.length - 1} service entr${gateSides.length - 1 > 1 ? "ies" : "y"}.`}
        </div>

        {courtyardRecommended && (
          <div style={{ background: C.amber + "14", border: `1px solid ${C.amber}55`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ color: C.amber, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>🏛️ Internal courtyard recommended</div>
            <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.5 }}>
              Your plot is open on only {openSidesCount} side{openSidesCount === 1 ? "" : "s"}, so inner rooms will not get light or air. An internal courtyard brings light deep into the home — building codes require inner rooms to reach either an open side or a courtyard (minimum ~3 m / ~100 sqft).
            </div>
          </div>
        )}

        <div onClick={() => setCourtyardOn(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: courtyardOn ? C.green + "18" : C.card, borderRadius: 12, padding: "12px 16px", marginBottom: courtyardOn ? 10 : 18, border: `1.5px solid ${courtyardOn ? C.green : C.border}`, cursor: "pointer" }}>
          <div><div style={{ fontWeight: 700, fontSize: 14 }}>🏛️ Add an internal courtyard</div><div style={{ color: C.muted, fontSize: 12 }}>Reserves open space inside for light & air</div></div>
          {toggle(courtyardOn)}
        </div>
        {courtyardOn && (
          <div style={{ marginBottom: 18 }}>
            <SizeSlider value={courtyardSize} min={COURTYARD.min} max={Math.max(COURTYARD.min, Math.round(footprint * 0.3))} color={COURTYARD.color} onChange={setCourtyardSize} />
          </div>
        )}

        {shaftRecommended && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 18 }}>
            <div style={{ color: C.green, fontWeight: 700, fontSize: 12.5, marginBottom: 3 }}>🌀 Ventilation shafts will be reserved</div>
            <div style={{ color: C.muted, fontSize: 11.5, lineHeight: 1.5 }}>bathrooms on your blocked sides cannot have outside windows, so small vent shafts will be added to your floors automatically — exactly as an architect would.</div>
          </div>
        )}

        <button style={s.btn()} onClick={() => gateSides.length > 0 && setStep("direction")}>Continue → Set Direction</button>
        {gateSides.length === 0 && <div style={{ color: C.red, fontSize: 12, marginTop: 8, textAlign: "center" }}>Please mark at least one gate.</div>}
      </div>
    </div>
  );

  // PAGE 3
  if (step === "direction") return (
    <div style={s.root}>
      <div style={s.header}>{back(() => setStep("surround"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>Plot Direction</div><div style={{ color: C.muted, fontSize: 12 }}>Which way does your plot face?</div></div></div>
      <ProgressArc />
      <div style={s.body}>
        <div onClick={() => setVastuOn(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: vastuOn ? C.selBg : C.card, borderRadius: 12, padding: "12px 16px", marginBottom: 18, border: `1.5px solid ${vastuOn ? C.purple : C.border}`, cursor: "pointer" }}>
          <div><div style={{ fontWeight: 700, fontSize: 14 }}>🧭 Vastu Mode</div><div style={{ color: C.muted, fontSize: 12 }}>Show directions & placement guidance</div></div>{toggle(vastuOn)}
        </div>
        {!vastuOn && <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, textAlign: "center", color: C.muted, fontSize: 13, marginBottom: 18 }}>Vastu mode is off. Your plot will be designed without direction guidance. You can turn it on anytime.</div>}
        {vastuOn && <>
          <Dial points={points} facing={facing} setFacing={setFacing} />
          <div style={{ background: C.card, borderRadius: 14, padding: 16, margin: "14px 0", border: `1px solid ${C.border}`, textAlign: "center" }}>
            <div style={{ color: C.muted, fontSize: 12 }}>Front faces</div>
            <div style={{ color: C.amber, fontWeight: 800, fontSize: 30, letterSpacing: "-0.03em" }}>{facing}° {facingDir}</div>
            {note && <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>({note} — both are acceptable)</div>}
          </div>
          <div style={{ background: C.card, borderRadius: 14, padding: 16, marginBottom: 18, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.green, fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📍 What the directions mean</div>
            {[["🪔", "North-East (Ishan)", "Best for pooja room and water tank. Keep toilets away."], ["🍳", "South-East (Agni)", "Ideal for the kitchen — fire element. Cook facing East."], ["🛏️", "South-West", "Best for the master bedroom — stability and rest."], ["🚪", "North / East / NE", "Most auspicious for the main entrance."], ["🚿", "North-West / North", "Suitable for bathrooms — never the North-East."], ["🪜", "South-West / NW", "Preferred for the staircase. Avoid the center."]].map(([icon, dir, txt], i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 9 }}><span style={{ fontSize: 16 }}>{icon}</span><div><span style={{ fontSize: 13, fontWeight: 700 }}>{dir}. </span><span style={{ fontSize: 13, color: C.muted }}>{txt}</span></div></div>
            ))}
            <div style={{ color: C.muted, fontSize: 11.5, marginTop: 6, fontStyle: "italic", lineHeight: 1.5 }}>These are advisory Vastu suggestions. No facing is "bad" — every direction is valid.</div>
          </div>
        </>}
        <button style={s.btn()} onClick={startFloors}>Continue → Design Floors</button>
      </div>
    </div>
  );

  // PAGE 4: floors
  if (step === "floor") {
    const meta = floorList[cur] || { label: "Floor", icon: "🏠", kind: "normal" };
    const f = floorData[cur] || { fullParking: false, rooms: [] };
    const isGroundLike = meta.key === "f0";
    const palette = paletteFor(meta.kind);
    const roomsArea = f.rooms.reduce((a, r) => a + r.sqft, 0);
    const used = f.fullParking ? footprint : coreArea + roomsArea;
    const remaining = footprint - used;
    const pct = Math.min(100, Math.round((used / footprint) * 100));
    const floorCirc = circulationFor(f.rooms.length + 1); // +1 anticipates the room being added
    const freeForNewRoom = footprint - coreArea - floorCirc - roomsArea;
    return (
      <div style={s.root}>
        <div style={s.header}>{back(() => cur === 0 ? setStep("direction") : setCur(cur - 1))}<div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>{meta.icon} {meta.label}{projectType === "builder" && meta.kind !== "basement" && meta.kind !== "terrace" ? " · Unit" : projectType === "apartment" && meta.kind !== "basement" && meta.kind !== "terrace" ? ` · ${flatsPerFloor} flats` : ""}</div><div style={{ color: C.muted, fontSize: 12 }}>{projectType === "builder" && meta.kind !== "basement" && meta.kind !== "terrace" ? "An independent home" : projectType === "apartment" && meta.kind !== "basement" && meta.kind !== "terrace" ? `${flatsPerFloor} × ${flatBHK}BHK on this floor` : `Level ${cur + 1} of ${floorList.length}`}{vastuOn ? ` · faces ${facingDir}` : ""}</div></div></div>
        <div style={{ display: "flex", gap: 6, padding: "12px 16px 0" }}>{floorList.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < cur ? C.green : i === cur ? C.accent : C.border }} />)}</div>
        <ProgressArc />
        <div style={s.body}>
          {showFloorHint && cur === 0 && (
            <div style={{ background: "#1A1A1A", color: "#fff", borderRadius: 12, padding: "13px 14px", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.5 }}>Tap a room below to place it on this floor — or hit <b>✨ Auto-place all</b> to let PlotAI arrange everything for you. You can do each floor in turn.</div>
              <button onClick={() => setShowFloorHint(false)} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1, opacity: 0.7 }}>×</button>
            </div>
          )}
          {cur === 0 && (() => {
            const fz = apartmentFeasibility() || builderFeasibility();
            if (!fz) return null;
            if (fz.level === "good") return (
              <div style={{ background: C.green + "14", border: `1px solid ${C.green}55`, borderRadius: 12, padding: 13, marginBottom: 14 }}>
                <div style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>✓ This fits your plot comfortably</div>
                <div style={{ color: C.muted, fontSize: 11.5, marginTop: 2, lineHeight: 1.5 }}>{projectType === "apartment" ? `Each flat gets about ${fz.perFlat.toLocaleString()} sqft on this floor — a comfortable ${flatBHK}BHK.` : `Each floor has about ${fz.usable.toLocaleString()} sqft of usable space — comfortable for this unit.`}</div>
              </div>
            );
            if (fz.level === "tight") return (
              <div style={{ background: C.amber + "16", border: `1px solid ${C.amber}66`, borderRadius: 12, padding: 13, marginBottom: 14 }}>
                <div style={{ color: C.amber, fontWeight: 700, fontSize: 13 }}>⚠️ This fits, but it will be tight</div>
                <div style={{ color: C.muted, fontSize: 11.5, marginTop: 2, lineHeight: 1.5 }}>{projectType === "apartment" ? `Each flat gets about ${fz.perFlat.toLocaleString()} sqft — a compact ${flatBHK}BHK. A comfortable ${flatBHK}BHK wants ~${BHK_MIN[flatBHK].toLocaleString()} sqft each. It works, but rooms will be small.` : `Each floor has ~${fz.usable.toLocaleString()} sqft — workable but compact for this unit.`} You can continue.</div>
              </div>
            );
            return (
              <div style={{ background: C.red + "12", border: `1px solid ${C.red}66`, borderRadius: 12, padding: 13, marginBottom: 14 }}>
                <div style={{ color: C.red, fontWeight: 700, fontSize: 13 }}>⚠️ This is too small to fit well</div>
                <div style={{ color: C.muted, fontSize: 11.5, marginTop: 2, lineHeight: 1.5 }}>{projectType === "apartment" ? `${flatsPerFloor} × ${flatBHK}BHK needs about ${fz.need.toLocaleString()} sqft per floor, but you have ~${fz.usable.toLocaleString()} sqft usable.` : `This unit needs about ${fz.need.toLocaleString()} sqft per floor, but you have ~${fz.usable.toLocaleString()} sqft.`}{fz.suggestion ? ` We suggest you ${fz.suggestion}.` : ""} You can still continue if you want.</div>
              </div>
            );
          })()}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Reserved on every floor (standard minimum)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ background: CORE.stairs.color + "33", color: C.text, border: `1px solid ${CORE.stairs.color}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 600 }}>🪜 Staircase · {CORE.stairs.min} sqft</span>
              {liftOn && <span style={{ background: CORE.lift.color + "33", color: C.purple, border: `1px solid ${CORE.lift.color}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 600 }}>🛗 Lift · {CORE.lift.min} sqft</span>}
              {!f.fullParking && f.rooms.length > 1 && <span style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 600 }}>🚶 Hallways · ~{circulationFor(f.rooms.length).toLocaleString()} sqft</span>}
            </div>
            {!f.fullParking && f.rooms.length > 1 && <div style={{ color: C.muted, fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>About 10% is kept for hallways and movement between rooms — real homes need circulation space, not wall-to-wall rooms.</div>}
          </div>
          {isGroundLike && purpose === "residential" && (
            <div onClick={toggleFP} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: f.fullParking ? C.amber + "22" : C.card, borderRadius: 12, padding: "12px 16px", marginBottom: 14, border: `1.5px solid ${f.fullParking ? C.amber : C.border}`, cursor: "pointer" }}>
              <div><div style={{ fontWeight: 700, fontSize: 14 }}>🚗 Make Ground Floor full parking</div><div style={{ color: C.muted, fontSize: 12 }}>Living floors then start from 1st floor</div></div>
              <div style={{ width: 44, height: 26, borderRadius: 20, background: f.fullParking ? C.amber : C.border, position: "relative" }}><div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: f.fullParking ? 21 : 3, transition: "all .2s" }} /></div>
            </div>
          )}
          {meta.kind === "terrace" && <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 14, color: C.muted, fontSize: 13, textAlign: "center" }}>🏞️ This is an open terrace floor. You can still add a small store or garden corner, but most space stays open.</div>}
          {!f.fullParking && <>
            {/* BRIEF POOL: rooms from Phase 1 still to place */}
            {totalUnplaced() > 0 && (
              <div style={{ background: C.accent + "12", border: `1.5px solid ${C.accent}55`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: C.accent, fontSize: 12.5, fontWeight: 800 }}>📋 From your brief — tap to place here</span>
                  <button onClick={autoDistribute} style={{ background: C.accent, border: "none", color: "#fff", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 11.5, fontWeight: 700 }}>✨ Auto-place all</button>
                </div>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 10 }}>{totalUnplaced()} room(s) from your brief still to place across your floors.</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {unplacedPool().map(item => {
                    const r = ROOMS[item.typeId];
                    const fits = (footprint - coreArea - roomsArea) >= r.min;
                    return (
                      <div key={item.typeId} onClick={() => fits && addRoom(item.typeId)} style={{ display: "flex", alignItems: "center", gap: 5, background: fits ? C.card : C.surface, border: `1.5px solid ${fits ? C.accent : C.border}`, borderRadius: 9, padding: "6px 10px", cursor: fits ? "pointer" : "not-allowed", opacity: fits ? 1 : 0.45 }}>
                        <span style={{ fontSize: 15 }}>{r.icon}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 600 }}>{r.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: C.accent, background: C.selBg, borderRadius: 6, padding: "0 5px" }}>×{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {totalUnplaced() === 0 && briefRoomList().length > 0 && (
              <div style={{ background: C.green + "14", border: `1px solid ${C.green}55`, borderRadius: 10, padding: 10, marginBottom: 14, fontSize: 12, color: C.green, textAlign: "center", fontWeight: 600 }}>✓ All your briefed rooms are placed. Add extras below if you like.</div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>Or add any other space</span>
              <button onClick={suggestRooms} style={{ background: C.purple + "22", border: `1px solid ${C.purple}`, color: C.purple, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✨ Suggest rooms</button>
            </div>
            <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 8 }}>{Math.max(0, freeForNewRoom).toLocaleString()} sqft free right now on this floor</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {palette.map(id => { const r = ROOMS[id]; const fits = freeForNewRoom >= r.min; return (
                <div key={id} onClick={() => fits && addRoom(id)} style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 6px", cursor: fits ? "pointer" : "not-allowed", textAlign: "center", opacity: fits ? 1 : 0.4 }}>
                  <div style={{ fontSize: 20 }}>{r.icon}</div><div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>{r.label}</div><div style={{ color: C.muted, fontSize: 10 }}>min {r.min} sqft</div>
                </div>
              ); })}
            </div>
            {/* CUSTOM SPACE: user defines their own room */}
            <div style={{ background: C.surface, border: `1.5px dashed ${C.accent}66`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
              <div style={{ color: C.accent, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>✏️ Add your own space</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Name (e.g. Home Theatre, Bar)" style={{ flex: 2, minWidth: 0, background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 13, padding: "9px 12px", outline: "none", boxSizing: "border-box" }} />
                <input value={customSize} onChange={e => setCustomSize(Math.max(20, +e.target.value || 0))} type="number" style={{ flex: 1, minWidth: 0, width: 60, background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 13, padding: "9px 8px", outline: "none", boxSizing: "border-box", textAlign: "center" }} />
              </div>
              <button onClick={addCustomRoom} disabled={!customName.trim() || (footprint - coreArea - roomsArea) < customSize} style={{ width: "100%", padding: "9px 0", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 12.5, cursor: customName.trim() ? "pointer" : "not-allowed", background: customName.trim() && (footprint - coreArea - roomsArea) >= customSize ? C.accent : C.border, color: customName.trim() && (footprint - coreArea - roomsArea) >= customSize ? "#fff" : C.muted }}>
                + Add "{customName.trim() || "your space"}" ({customSize} sqft)
              </button>
              {(footprint - coreArea - roomsArea) < customSize && customName.trim() && <div style={{ color: C.red, fontSize: 10.5, marginTop: 5, textAlign: "center" }}>Only {Math.max(0, footprint - coreArea - roomsArea)} sqft free — reduce the size.</div>}
            </div>
            {f.rooms.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <span style={s.label}>Spaces on this floor — drag to resize</span>
                <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 10, lineHeight: 1.5 }}>Each room max is the floor total area, minus stairs{liftOn ? ", lift" : ""} and every other room added.</div>
                {f.rooms.map(r => { const t = ROOMS[r.typeId]; const othersArea = f.rooms.filter(x => x.uid !== r.uid).reduce((a, x) => a + x.sqft, 0); const liveMax = Math.max(t.min, footprint - coreArea - othersArea); return (
                  <div key={r.uid} style={{ marginBottom: 14, background: C.card, borderRadius: 10, padding: "10px 12px", border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span>{t.icon}</span><span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{r.customLabel || t.label}</span><button onClick={() => removeRoom(r.uid)} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${C.red}55`, background: "transparent", color: C.red, cursor: "pointer", fontSize: 13 }}>×</button></div>
                    <SizeSlider value={r.sqft} min={t.min} max={liveMax} color={t.color} onChange={(v) => setRoomSize(r.uid, v)} />
                  </div>
                ); })}
              </div>
            )}
          </>}
          <div style={{ background: C.card, borderRadius: 12, padding: 14, marginBottom: 18, border: `1px solid ${remaining < 0 ? C.red : C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}><span style={{ color: C.muted }}>Floor space used</span><span style={{ fontWeight: 700, color: remaining < 0 ? C.red : C.text }}>{used.toLocaleString()} / {footprint.toLocaleString()} sqft</span></div>
            <div style={{ height: 8, borderRadius: 4, background: C.surface, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: remaining < 0 ? C.red : C.green, transition: "all .2s" }} /></div>
            {remaining < 0 ? <div style={{ color: C.red, fontSize: 12, marginTop: 8 }}>⚠️ Over by {Math.abs(remaining).toLocaleString()} sqft.</div> : <div style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>{remaining.toLocaleString()} sqft still free on this floor.</div>}
          </div>
          <button style={s.btn()} onClick={() => cur === floorList.length - 1 ? (setActiveStyle(null), setLayoutFloor(0), setStep("style")) : setCur(cur + 1)}>
            {cur === floorList.length - 1 ? "Generate Layout →" : `Next: ${floorList[cur + 1]?.label} →`}
          </button>
        </div>
      </div>
    );
  }

  // PAGE 5: STYLE PICKER + LAYOUT
  if (step === "style") {
    const f = floorData[layoutFloor] || { fullParking: false, rooms: [] };
    const cores = [{ ...CORE.stairs, id: "stairs", sqft: CORE.stairs.min }, ...(liftOn ? [{ ...CORE.lift, id: "lift", sqft: CORE.lift.min }] : []),
      ...(effectiveCourtyard > 0 ? [{ ...COURTYARD, sqft: effectiveCourtyard }] : []),
      ...(shaftRecommended ? [{ ...SHAFT, sqft: SHAFT.min }] : [])];
    const roomsForLayout = f.fullParking ? [{ uid: 9999, typeId: "park", sqft: Math.max(60, footprint - coreArea) }] : f.rooms;
    const v2out = (activeStyle && projectType !== "apartment") ? sliceLayoutV2(points, facing, roomsForLayout, cores, shapeType, v2sb, v2lMeta, layoutVariant, Math.max(3.5, corridorWidth)) : null;
    const placed = activeStyle ? (projectType === "apartment" ? sliceApartmentLayout(points, facing, roomsForLayout, cores, layoutVariant) : (v2out ? v2out.rooms : [])) : [];
    const v2decomp = v2out ? v2out.decomp : null;
    const styleObj = STYLES.find(x => x.id === activeStyle);
    const reason = {
      vastu: "Kitchen placed toward the South-East (fire), master bedroom in the stable South-West, pooja in the sacred North-East, toilets kept away from the North-East.",
      social: "Living, dining and kitchen clustered into one social zone near the front, with bedrooms grouped away for quiet and privacy.",
      light: "Living spaces and bedrooms pushed to the outer walls for natural light; service rooms placed toward the interior.",
      compact: "Wet rooms grouped to share plumbing walls and circulation kept tight to reduce construction cost.",
    };
    return (
      <div style={s.root}>
        <div style={s.header}>{back(() => { setCur(floorList.length - 1); setStep("floor"); })}<div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>Choose Layout Style</div><div style={{ color: C.muted, fontSize: 12 }}>How should your rooms be arranged?</div></div></div>
        <ProgressArc />
        <div style={s.body}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {STYLES.map(st => {
              const selected = activeStyle === st.id;
              const locked = st.premium;
              return (
                <div key={st.id} onClick={() => pickStyle(st)} style={{ position: "relative", background: selected ? C.selBg : C.card, border: `1.5px solid ${selected ? C.accent : C.border}`, borderRadius: 12, padding: "14px 12px", cursor: "pointer", opacity: locked ? 0.75 : 1 }}>
                  {locked && <div style={{ position: "absolute", top: 8, right: 8, background: C.amber + "26", color: C.amber, border: `1px solid ${C.amber}66`, borderRadius: 6, padding: "1px 6px", fontSize: 9, fontWeight: 800 }}>🔒 PREMIUM</div>}
                  <div style={{ fontSize: 22 }}>{st.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginTop: 6 }}>{st.label}</div>
                  <div style={{ color: C.muted, fontSize: 10.5, marginTop: 2, lineHeight: 1.4 }}>{st.desc}</div>
                </div>
              );
            })}
          </div>

          {lockMsg === "vastu-off" && <div style={{ background: C.selBg, border: `1px solid ${C.purple}55`, borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12.5, color: C.purple }}>Turn on Vastu Mode (on the Direction step) to use the Vastu-First style.</div>}
          {lockMsg && lockMsg !== "vastu-off" && <div style={{ background: C.amber + "18", border: `1px solid ${C.amber}55`, borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12.5, color: C.amber }}>✨ <b>{lockMsg}</b> is a Premium style. Upgrade to unlock more layout styles, multiple AI options, and contractor-ready export.</div>}

          {!activeStyle && <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 12, padding: 24, textAlign: "center", color: C.muted, fontSize: 13, marginBottom: 16 }}>Pick a free style above to generate your layout.</div>}

          {activeStyle && <>
            {floorList.length > 1 && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
                {floorList.map((meta, i) => (
                  <button key={i} onClick={() => setLayoutFloor(i)} style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: "pointer", border: `1.5px solid ${layoutFloor === i ? C.accent : C.border}`, background: layoutFloor === i ? C.selBg : "transparent", color: layoutFloor === i ? C.accent : C.muted }}>{meta.icon} {meta.label.replace(" Floor", "")}</button>
                ))}
              </div>
            )}
            {isSample && (
              <div style={{ background: C.selBg, border: `1px solid ${C.accent}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.5, color: C.text }}><b>✨ This is an example design.</b> Like what you see? Build your own in a few taps.</div>
                <button onClick={() => { setIsSample(false); setActiveStyle(null); setFloorData([]); setStep("project"); window.scrollTo(0, 0); }} style={{ flexShrink: 0, padding: "9px 14px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Design mine</button>
              </div>
            )}
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{styleObj.icon} {styleObj.label} — {floorList[layoutFloor]?.label}</div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Layout options — tap to compare</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["A", 0], ["B", 1], ["C", 2]].map(([lbl, v]) => (
                  <div key={v} onClick={() => setLayoutVariant(v)} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10, border: `1.5px solid ${layoutVariant === v ? C.accent : C.border}`, background: layoutVariant === v ? C.accent : C.card, color: layoutVariant === v ? "#fff" : C.text, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Option {lbl}</div>
                ))}
              </div>
              {shapeType !== "lshape" && (
                <div onClick={() => setLayoutVariant(3)} style={{ marginTop: 8, textAlign: "center", padding: "10px 0", borderRadius: 10, border: `1.5px solid ${layoutVariant === 3 ? C.accent : C.border}`, background: layoutVariant === 3 ? C.accent : C.card, color: layoutVariant === 3 ? "#fff" : C.text, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  🚪 Corridor plan — every room off a central hallway
                </div>
              )}
            </div>
            <div id="plotai-export-area"><SliceView points={points} rooms={placed} facing={facing} gates={gates} /></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {placed.map((b, k) => <span key={k} style={{ display: "flex", alignItems: "center", gap: 5, color: C.muted, fontSize: 11.5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: b.color }} />{b.label}{b.zone ? ` · ${b.zone}` : ""}</span>)}
            </div>
            {(() => {
              // ROOM AREA SCHEDULE — a real-plan style table of each room and its size
              const sched = placed.filter(r => !r.open && !r.isHall && r.pw * r.ph >= 12).map(r => ({ name: (r.label || r.typeId).replace(" Room", ""), w: Math.round(r.pw), h: Math.round(r.ph), a: Math.round(r.pw * r.ph) }));
              if (sched.length === 0) return null;
              const totalA = sched.reduce((s, r) => s + r.a, 0);
              return (
                <div style={{ marginTop: 14, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ background: C.surface, padding: "9px 14px", fontWeight: 800, fontSize: 12.5, letterSpacing: "-0.01em", display: "flex", justifyContent: "space-between" }}>
                    <span>Room Schedule</span><span style={{ color: C.muted, fontWeight: 600 }}>{sched.length} rooms</span>
                  </div>
                  {sched.map((r, k) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 14px", borderTop: `1px solid ${C.border}`, fontSize: 12 }}>
                      <span style={{ fontWeight: 600 }}>{r.name}</span>
                      <span style={{ color: C.muted }}>{r.w}&#39; × {r.h}&#39; <span style={{ color: C.text, fontWeight: 600 }}>· {r.a.toLocaleString()} sqft</span></span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderTop: `1.5px solid ${C.border}`, background: C.surface, fontSize: 12, fontWeight: 700 }}>
                    <span>Total carpet (rooms)</span><span>{totalA.toLocaleString()} sqft</span>
                  </div>
                </div>
              );
            })()}
            {vastuOn && (() => {
              const vs = vastuScore(placed, facing, points);
              if (!vs) return null;
              const col = vs.score >= 80 ? C.green : vs.score >= 65 ? C.amber : C.red;
              return (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, margin: "14px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>🧭 Vastu compliance</span>
                    <span style={{ fontWeight: 800, fontSize: 20, color: col }}>{vs.score}%</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, background: C.surface, overflow: "hidden", marginBottom: 10 }}><div style={{ width: vs.score + "%", height: "100%", background: col }} /></div>
                  {vs.aligned.length > 0 && <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, marginBottom: vs.compromised.length ? 6 : 0 }}><b style={{ color: C.green }}>✓ Well placed:</b> {vs.aligned.slice(0, 5).map(a => `${a.label} (${a.zone})`).join(", ")}.</div>}
                  {vs.compromised.length > 0 && <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6 }}><b style={{ color: C.amber }}>△ Compromised:</b> {vs.compromised.slice(0, 4).map(c => `${c.label} is in ${c.zone}, ideally ${c.want}`).join("; ")}. Your plot shape and room sizes made the perfect spot impractical here.</div>}
                  {vs.waterFireConflict && <div style={{ fontSize: 11.5, color: C.amber, lineHeight: 1.6, marginTop: 6 }}>⚠️ Kitchen and bathroom share a corner — Vastu prefers water and fire apart.</div>}
                  <div style={{ fontSize: 10.5, color: C.muted, marginTop: 8, fontStyle: "italic", lineHeight: 1.5 }}>Vastu is a guide, not a rulebook — we balance it with a practical, livable layout. Even big builders rarely hit 100% on every room.</div>
                </div>
              );
            })()}
            {vastuOn && projectType === "apartment" && (() => {
              // rank flats by how Vastu-favorable their position is (NE-most flat ranks best)
              const flatIds = [...new Set(placed.map(r => r.flatId).filter(Boolean))];
              if (flatIds.length < 2) return null;
              const bb = bboxOf(points);
              const grid = rotatedGrid(facing);
              const ranked = flatIds.map(fid => {
                const fr = placed.filter(r => r.flatId === fid);
                const cx = fr.reduce((a, r) => a + (r.px + r.pw / 2), 0) / fr.length;
                const cy = fr.reduce((a, r) => a + (r.py + r.ph / 2), 0) / fr.length;
                const zone = zoneOfPoint(cx, cy, bb, grid);
                // favorable zones for a flat's overall position: NE > E/N > others
                const favScore = ["NE"].includes(zone) ? 3 : ["E", "N"].includes(zone) ? 2 : ["C", "SE", "NW"].includes(zone) ? 1 : 0;
                return { fid, zone, favScore };
              }).sort((a, b) => b.favScore - a.favScore);
              const best = ranked[0];
              return (
                <div style={{ background: C.selBg, border: `1px solid ${C.accent}`, borderRadius: 12, padding: 14, margin: "14px 0" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>🏬 Which flat is most Vastu-favorable?</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 8 }}><b style={{ color: C.text }}>Flat {best.fid}</b> sits in the {best.zone} zone — the most Vastu-favorable position on this floor. The others are optimised as far as their position allows.</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {ranked.map((r, i) => (
                      <span key={r.fid} style={{ fontSize: 11, fontWeight: 600, color: i === 0 ? C.green : C.muted, background: C.card, border: `1px solid ${i === 0 ? C.green : C.border}`, borderRadius: 7, padding: "4px 9px" }}>{i === 0 ? "★ " : `#${i + 1} `}Flat {r.fid} · {r.zone}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.muted, marginTop: 8, fontStyle: "italic", lineHeight: 1.5 }}>This is the honest reality of multi-flat floors — only one corner flat can hold the prime Vastu position. Big builders face the same constraint.</div>
                </div>
              );
            })()}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, margin: "14px 0" }}>
              <div style={{ color: C.green, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Why this arrangement</div>
              <div style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.5 }}>{reason[activeStyle]}</div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => sharePlan("share")} style={{ flex: 2, padding: "13px 0", borderRadius: 12, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>📤 Share my plan</button>
              <button onClick={() => sharePlan("download")} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.card, color: C.text, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>⬇ Save</button>
            </div>
            {shareMsg && <div style={{ color: C.muted, fontSize: 11.5, marginTop: 8, textAlign: "center" }}>{shareMsg}</div>}

            <button style={s.btn()} onClick={() => setStep("summary")}>Continue → Your Design Summary</button>
          </>}

          <div style={{ background: C.purple + "14", border: `1px solid ${C.purple}55`, borderRadius: 12, padding: 14, marginTop: 16 }}>
            <div style={{ color: C.purple, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>✨ Premium: AI-designed layouts</div>
            <div style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.5 }}>Unlock all four styles, plus multiple AI-generated layout options you can compare and refine, and a contractor-ready PDF export.</div>
          </div>
        </div>
      </div>
    );
  }

  // PAGE 6: summary
  const blocksFor = (f) => {
    const cores = [{ ...CORE.stairs, sqft: CORE.stairs.min }, ...(liftOn ? [{ ...CORE.lift, sqft: CORE.lift.min }] : []),
      ...(effectiveCourtyard > 0 ? [{ ...COURTYARD, sqft: effectiveCourtyard }] : []),
      ...(shaftRecommended ? [{ ...SHAFT, sqft: SHAFT.min }] : [])];
    if (f.fullParking) return [...cores, { ...ROOMS.park, sqft: Math.max(60, footprint - coreArea) }];
    return [...cores, ...f.rooms.map(r => ({ ...ROOMS[r.typeId], sqft: r.sqft, label: r.customLabel || ROOMS[r.typeId].label }))];
  };
  const totalBuilt = floorData.reduce((a, f) => a + (f.fullParking ? footprint : coreArea + f.rooms.reduce((b, r) => b + r.sqft, 0)), 0);
  const rate = RATES[quality];
  const costLow = Math.round(totalBuilt * rate * 0.9);
  const costHigh = Math.round(totalBuilt * rate * 1.1);
  const inLakh = (n) => (n / 100000).toFixed(1);
  return (
    <div style={s.root}>
      <div style={s.header}>{back(() => setStep("style"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>{projectName || "Your Building"}</div><div style={{ color: C.muted, fontSize: 12 }}>{floorList.length} level(s){liftOn ? " · lift" : ""}{vastuOn ? ` · faces ${facingDir}` : ""}</div></div></div>
      <ProgressArc />
      <div style={s.body}>
        <div style={{ fontWeight: 800, fontSize: 27, marginBottom: 6, letterSpacing: "-0.03em", lineHeight: 1.15 }}>Your design is ready</div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>Here is your complete {projLabel} — the brief an architect would hand you to take forward.</div>
        <span style={s.label}>Project name</span>
        <input style={{ ...s.input, marginBottom: 18 }} value={projectName} onChange={e => setProjectName(e.target.value)} placeholder={projectType === "apartment" ? "e.g. Green Residency" : projectType === "builder" ? "e.g. Sharma Floors" : "e.g. My Home in Delhi"} />
        {projectType === "builder" && (() => {
          const units = floorList.filter(f => f.kind !== "basement" && f.kind !== "terrace").length;
          return <div style={{ background: C.selBg, border: `1px solid ${C.accent}`, borderRadius: 12, padding: 14, marginBottom: 18 }}><div style={{ fontWeight: 700, fontSize: 14 }}>🏢 Builder Floors — {units} independent unit{units > 1 ? "s" : ""}</div><div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Each floor is a complete {unitProgram.bedrooms}BHK home with its own kitchen and entrance, sharing a common staircase.</div></div>;
        })()}
        {projectType === "apartment" && (() => {
          const livingFloors = floorList.filter(f => f.kind !== "basement" && f.kind !== "terrace").length;
          const totalFlats = livingFloors * flatsPerFloor;
          return <div style={{ background: C.selBg, border: `1px solid ${C.accent}`, borderRadius: 12, padding: 14, marginBottom: 18 }}><div style={{ fontWeight: 700, fontSize: 14 }}>🏬 Apartments — {totalFlats} flat{totalFlats > 1 ? "s" : ""} total</div><div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{flatsPerFloor} × {flatBHK}BHK on each of {livingFloors} floor{livingFloors > 1 ? "s" : ""}, each flat self-contained, sharing a common corridor and staircase.</div></div>;
        })()}
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, background: C.card, borderRadius: 12, padding: 14, border: `1px solid ${C.border}`, textAlign: "center" }}><div style={{ color: C.muted, fontSize: 11 }}>Plot area</div><div style={{ color: C.accent, fontWeight: 800, fontSize: 17 }}>{area.toLocaleString()}</div><div style={{ color: C.muted, fontSize: 10 }}>sqft</div></div>
          <div style={{ flex: 1, background: C.card, borderRadius: 12, padding: 14, border: `1px solid ${C.border}`, textAlign: "center" }}><div style={{ color: C.muted, fontSize: 11 }}>Built-up</div><div style={{ color: C.green, fontWeight: 800, fontSize: 17 }}>{totalBuilt.toLocaleString()}</div><div style={{ color: C.muted, fontSize: 10 }}>sqft</div></div>
          <div style={{ flex: 1, background: C.card, borderRadius: 12, padding: 14, border: `1px solid ${C.border}`, textAlign: "center" }}><div style={{ color: C.muted, fontSize: 11 }}>Levels</div><div style={{ color: C.amber, fontWeight: 800, fontSize: 17 }}>{floorList.length}</div><div style={{ color: C.muted, fontSize: 10 }}>total</div></div>
        </div>
        <span style={s.label}>Construction quality</span>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>{[["basic", "Basic"], ["standard", "Standard"], ["premium", "Premium"]].map(([id, lbl]) => <button key={id} style={s.chip(quality === id)} onClick={() => setQuality(id)}>{lbl}</button>)}</div>
        <div style={{ background: C.card, borderRadius: 14, padding: 16, marginBottom: 20, border: `1px solid ${C.border}`, textAlign: "center" }}>
          <div style={{ color: C.muted, fontSize: 12 }}>Estimated construction cost</div>
          <div style={{ color: C.green, fontWeight: 800, fontSize: 30, letterSpacing: "-0.03em" }}>₹{inLakh(costLow)}L – ₹{inLakh(costHigh)}L</div>
          <div style={{ color: C.muted, fontSize: 11.5, marginTop: 2 }}>at ₹{rate.toLocaleString()}/sqft · approximate, varies by city & materials</div>
        </div>
        {floorList.map((meta, i) => {
          const f = floorData[i] || { fullParking: false, rooms: [] };
          const fcores = [{ ...CORE.stairs, id: "stairs", sqft: CORE.stairs.min }, ...(liftOn ? [{ ...CORE.lift, id: "lift", sqft: CORE.lift.min }] : []),
            ...(effectiveCourtyard > 0 ? [{ ...COURTYARD, sqft: effectiveCourtyard }] : []),
            ...(shaftRecommended ? [{ ...SHAFT, sqft: SHAFT.min }] : [])];
          const froom = f.fullParking ? [{ uid: 9999, typeId: "park", sqft: Math.max(60, footprint - coreArea) }] : f.rooms;
          const fplaced = projectType === "apartment" ? sliceApartmentLayout(points, facing, froom, fcores, layoutVariant) : sliceLayoutV2(points, facing, froom, fcores, shapeType, v2sb, v2lMeta, layoutVariant, Math.max(3.5, corridorWidth)).rooms;
          const used = f.fullParking ? footprint : coreArea + f.rooms.reduce((b, r) => b + r.sqft, 0);
          return (
            <div key={i} style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontWeight: 800, fontSize: 15 }}>{meta.icon} {meta.label}</span><span style={{ color: C.muted, fontSize: 12 }}>{used.toLocaleString()} sqft used</span></div>
              <SliceView points={points} rooms={fplaced} facing={facing} gates={gates} />
            </div>
          );
        })}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>✏️ Want to change something?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => setStep("brief2")} style={{ padding: "11px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>📝 Edit Rooms</button>
            <button onClick={() => setStep("input")} style={{ padding: "11px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>📍 Edit Plot</button>
            <button onClick={() => setStep("direction")} style={{ padding: "11px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>🧭 Edit Direction</button>
            <button onClick={() => setStep("style")} style={{ padding: "11px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>🎨 Edit Layout</button>
          </div>
        </div>
        <button style={s.btn("secondary")} onClick={() => { safeStore.remove("plotai_design"); setStep("project"); }}>← Start a New Plan</button>
      </div>
    </div>
  );
}

function Dial({ points, facing, setFacing }) {
  const ref = useRef(null);
  const drag = useRef(false);
  const SZ = 300, cx = SZ / 2, cy = SZ / 2, ring = 128;
  const setFromEvent = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    let ang = Math.atan2(dx, -dy) * 180 / Math.PI;
    setFacing(Math.round((ang + 360) % 360));
  };
  const down = (e) => { drag.current = true; e.target.setPointerCapture?.(e.pointerId); setFromEvent(e); };
  const move = (e) => { if (drag.current) setFromEvent(e); };
  const up = () => { drag.current = false; };
  const labelPos = (a, r) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
  const bb = bboxOf(points);
  const bw = bb.maxX - bb.minX || 1, bh = bb.maxY - bb.minY || 1;
  const box = 120, sc = Math.min(box / bw, box / bh);
  const dw = bw * sc, dh = bh * sc;
  const ox = cx - dw / 2, oy = cy - dh / 2;
  const px = x => (x - bb.minX) * sc + ox;
  const py = y => (bb.maxY - y) * sc + oy;
  const poly = points.map(p => `${px(p[0])},${py(p[1])}`).join(" ");
  const fm = [(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2];
  const fmx = px(fm[0]), fmy = py(fm[1]);
  const groupRot = (facing - 180 + 360) % 360;
  const dot = labelPos(facing, ring);
  return (
    <div style={{ userSelect: "none" }}>
      <svg ref={ref} width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} style={{ display: "block", margin: "0 auto", touchAction: "none", cursor: "grab" }}>
        <circle cx={cx} cy={cy} r={ring + 14} fill={C.surface} stroke={C.border} strokeWidth={1} />
        <circle cx={cx} cy={cy} r={ring - 2} fill={C.card} stroke={C.border} strokeWidth={1} />
        {DIRS.map(([a, lbl]) => { const [tx, ty] = labelPos(a, ring + 1); const main = lbl.length === 1; return (
          <g key={a}><line x1={labelPos(a, ring - 10)[0]} y1={labelPos(a, ring - 10)[1]} x2={labelPos(a, ring)[0]} y2={labelPos(a, ring)[1]} stroke={C.border} strokeWidth={main ? 2 : 1} /><text x={tx} y={ty + 4} textAnchor="middle" fontSize={main ? 14 : 11} fontWeight={main ? 800 : 600} fill={lbl === "N" ? C.amber : main ? C.text : C.muted}>{lbl}</text></g>
        ); })}
        <circle cx={dot[0]} cy={dot[1]} r={6} fill={C.accent} stroke="#fff" strokeWidth={1.5} />
        <g transform={`rotate(${groupRot} ${cx} ${cy})`}>
          <polygon points={poly} fill={C.selBg} stroke={C.accent} strokeWidth={2} strokeLinejoin="round" />
          <line x1={fmx} y1={fmy} x2={fmx} y2={fmy + 26} stroke={C.amber} strokeWidth={2.5} />
          <polygon points={`${fmx - 5},${fmy + 22} ${fmx + 5},${fmy + 22} ${fmx},${fmy + 32}`} fill={C.amber} />
          <text x={fmx} y={fmy + 46} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.amber}>FRONT</text>
        </g>
        <circle cx={cx} cy={cy} r={3} fill={C.muted} />
      </svg>
      <div style={{ textAlign: "center", marginTop: 8, color: C.muted, fontSize: 12 }}>Drag the dial to point your plot front (road side)</div>
    </div>
  );
}

