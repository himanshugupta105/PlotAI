import { useState, useRef } from "react";

const C = {
  bg: "#F4EDE1", surface: "#EFE6D6", card: "#FBF6EC",
  accent: "#8B5E34", purple: "#A6794B", green: "#5C7A4A", amber: "#B07A2E",
  red: "#B0492F", text: "#3A2E22", muted: "#8A7A66", border: "#D9C9B0",
};

const CORE = {
  stairs: { id: "stairs", label: "Staircase", icon: "🪜", color: "#6C7293", min: 90 },
  lift:   { id: "lift",   label: "Lift",      icon: "🛗", color: "#8B5CF6", min: 30 },
};

// internal open elements that closed-in plots need (NBC-informed)
const COURTYARD = { id: "court", label: "Courtyard", icon: "🏛️", color: "#5BC0BE", min: 100 };
const SHAFT     = { id: "shaft", label: "Vent Shaft", icon: "🌀", color: "#7FBFA3", min: 12 };

const ROOMS = {
  park:       { label: "Parking",        icon: "🚗", color: "#7A8FA6", min: 130 },
  garden:     { label: "Front Garden",   icon: "🌿", color: "#56C98A", min: 80 },
  living:     { label: "Living Room",    icon: "🛋️", color: "#4F8EF7", min: 150 },
  master:     { label: "Master Bedroom", icon: "🛏️", color: "#3ECFA4", min: 140 },
  bed:        { label: "Bedroom",        icon: "🛏️", color: "#37B894", min: 110 },
  kitchen:    { label: "Kitchen",        icon: "🍳", color: "#F5A623", min: 80 },
  bath:       { label: "Bathroom",       icon: "🚿", color: "#9B6DFF", min: 35 },
  dining:     { label: "Dining",         icon: "🍽️", color: "#F08AB0", min: 90 },
  balcony:    { label: "Balcony",        icon: "🌅", color: "#5BC0BE", min: 35 },
  office:     { label: "Office / Study", icon: "💻", color: "#FFB347", min: 70 },
  pooja:      { label: "Pooja Room",     icon: "🪔", color: "#E6B655", min: 20 },
  store:      { label: "Store",          icon: "📦", color: "#8A8FA6", min: 25 },
  guest:      { label: "Guest Room",     icon: "🛌", color: "#6FB1E0", min: 110 },
  utility:    { label: "Utility / Wash", icon: "🧺", color: "#7FBFA3", min: 25 },
  servant:    { label: "Servant Room",   icon: "🧹", color: "#9AA0BC", min: 60 },
  terrace:    { label: "Terrace",        icon: "🏞️", color: "#84C9C0", min: 80 },
  reception:  { label: "Reception",      icon: "🛎️", color: "#4F8EF7", min: 100 },
  cabin:      { label: "Cabin",          icon: "🚪", color: "#3ECFA4", min: 80 },
  conference: { label: "Conference",     icon: "👥", color: "#F5A623", min: 120 },
  pantry:     { label: "Pantry",         icon: "☕", color: "#E6B655", min: 45 },
  cellar:     { label: "Storage Cellar", icon: "🗄️", color: "#8A8FA6", min: 100 },
  hometheatre:{ label: "Home Theatre",   icon: "🎬", color: "#A479E0", min: 150 },
  gym:        { label: "Gym",            icon: "🏋️", color: "#E07A5F", min: 100 },
};

const RES_GROUND = ["park", "garden", "living", "bed", "kitchen", "bath", "pooja", "store", "utility"];
const RES_UPPER  = ["living", "master", "bed", "kitchen", "bath", "dining", "balcony", "office", "guest", "pooja", "store", "terrace"];
const RES_BASEMENT = ["park", "store", "cellar", "hometheatre", "gym", "utility", "servant"];
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
// label each cell carries based on the plot's facing, so "SE cell" really points SE.

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
  [...rooms].sort((a, b) => b.sqft - a.sqft).forEach(r => allBlocks.push({ ...ROOMS[r.typeId], typeId: r.typeId, sqft: r.sqft, uid: r.uid }));

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
      <polygon points={poly} fill={blocks ? "none" : C.accent + "18"} stroke={C.accent} strokeWidth={2} strokeLinejoin="round" />
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

const STYLES = [
  { id: "vastu",  label: "Vastu-First",       icon: "🧭", desc: "Rooms placed by Vastu directions", premium: false, needsVastu: true },
  { id: "social", label: "Open & Social",     icon: "🛋️", desc: "Living, dining, kitchen flow together", premium: false },
  { id: "light",  label: "Light & Air",       icon: "☀️", desc: "Max natural light & ventilation", premium: true },
  { id: "compact",label: "Compact & Efficient", icon: "📐", desc: "Shared walls, low construction cost", premium: true },
];

export default function App() {
  const [step, setStep] = useState("input");
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
  // VERTICAL layer (NBC-sourced defaults, in feet)
  const [plinthFt, setPlinthFt] = useState(2);
  const [floorHt, setFloorHt] = useState(10);
  const [floorHtOverrides, setFloorHtOverrides] = useState({});
  const [basementHt, setBasementHt] = useState(9);
  const [surround, setSurround] = useState({ front: "road", right: "building", rear: "building", left: "building" });
  const [gates, setGates] = useState({ front: true, right: false, rear: false, left: false });
  const [courtyardOn, setCourtyardOn] = useState(false);
  const [courtyardSize, setCourtyardSize] = useState(120);
  const [vastuOn, setVastuOn] = useState(true);
  const [facing, setFacing] = useState(0);
  const [quality, setQuality] = useState("standard");
  const [floorData, setFloorData] = useState([]);
  const [cur, setCur] = useState(0);
  const [activeStyle, setActiveStyle] = useState(null);
  const [layoutFloor, setLayoutFloor] = useState(0);
  const [lockMsg, setLockMsg] = useState("");

  let points = null;
  if (shapeType === "rect") points = [[0, 0], [rectW, 0], [rectW, rectD], [0, rectD]];
  else if (shapeType === "quad") points = quadPoints(qF, qR, qB, qL, qDiag);
  else points = lPoints(lW, lD, lNW, lND);
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
  const coreArea = CORE.stairs.min + (liftOn ? CORE.lift.min : 0);
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
  };
  const addRoom = (typeId) => setFloorData(fd => fd.map((f, i) => i !== cur ? f : { ...f, rooms: [...f.rooms, { uid: UID++, typeId, sqft: ROOMS[typeId].min }] }));
  const removeRoom = (uid) => setFloorData(fd => fd.map((f, i) => i !== cur ? f : { ...f, rooms: f.rooms.filter(r => r.uid !== uid) }));
  const setRoomSize = (uid, val) => setFloorData(fd => fd.map((f, i) => i !== cur ? f : { ...f, rooms: f.rooms.map(r => r.uid === uid ? { ...r, sqft: val } : r) }));
  const toggleFP = () => setFloorData(fd => fd.map((f, i) => i !== cur ? f : { ...f, fullParking: !f.fullParking, rooms: [] }));

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
    root: { fontFamily: "'Inter', -apple-system, sans-serif", background: C.bg, minHeight: "100vh", color: C.text, maxWidth: 430, margin: "0 auto", paddingBottom: 40 },
    header: { background: C.surface, padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 },
    logo: { width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
    body: { padding: "18px 16px" },
    label: { color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" },
    input: { width: "100%", background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 15, padding: "10px 14px", outline: "none", boxSizing: "border-box" },
    btn: (v = "primary") => ({ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", fontWeight: 800, fontSize: 15, cursor: "pointer", background: v === "primary" ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : C.card, color: v === "primary" ? "#fff" : C.muted, marginTop: 8 }),
    chip: (a) => ({ flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${a ? C.accent : C.border}`, background: a ? C.accent + "22" : "transparent", color: a ? C.accent : C.muted, textTransform: "capitalize" }),
  };
  const field = (label, val, set) => (<div style={{ flex: 1 }}><span style={s.label}>{label}</span><input style={s.input} type="number" value={val} onChange={e => set(+e.target.value)} /></div>);
  const back = (fn) => <button onClick={fn} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20 }}>←</button>;
  const toggle = (on) => (<div style={{ width: 44, height: 26, borderRadius: 20, background: on ? C.purple : C.border, position: "relative" }}><div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: on ? 21 : 3, transition: "all .2s" }} /></div>);

  // ===== 4-PHASE PROGRESS ARC =====
  // maps each step to one of the four architect phases
  const PHASES = [
    { id: 1, label: "Brief", icon: "📝" },
    { id: 2, label: "Site", icon: "📍" },
    { id: 3, label: "Shape", icon: "🏗️" },
    { id: 4, label: "Design", icon: "✨" },
  ];
  const STEP_PHASE = {
    input: 2, config: 3, vertical: 3, surround: 2, direction: 2, floor: 3, style: 4, summary: 4,
  };
  const currentPhase = STEP_PHASE[step] || 2;
  const ProgressArc = () => (
    <div style={{ display: "flex", alignItems: "center", padding: "10px 16px 4px", maxWidth: 430, margin: "0 auto" }}>
      {PHASES.map((p, i) => {
        const done = p.id < currentPhase;
        const active = p.id === currentPhase;
        return (
          <div key={p.id} style={{ display: "flex", alignItems: "center", flex: i < PHASES.length - 1 ? 1 : "0 0 auto" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, flexShrink: 0,
                background: active ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : done ? C.green + "26" : C.card,
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
  if (step === "input") return (
    <div style={s.root}>
      <div style={s.header}><div style={s.logo}>🏗️</div><div><div style={{ fontWeight: 900, fontSize: 20 }}>PlotAI</div><div style={{ color: C.muted, fontSize: 12 }}>Your AI Architect</div></div></div>
      <ProgressArc />
      <div style={s.body}>
        <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Your Plot</div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Enter your plot shape. We'll guide you to a full building, floor by floor.</div>
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
          <div style={{ color: C.accent, fontWeight: 900, fontSize: 26 }}>{area.toLocaleString()} sqft</div>
          <div style={{ color: C.muted, fontSize: 11.5, marginTop: 2 }}>{(area / 9).toFixed(0)} gaj · {(area * 0.0929).toFixed(0)} m² · {(area / 435.6).toFixed(2)} cents</div>
        </div>
        <button style={s.btn()} onClick={() => area > 0 && setStep("config")}>Continue → Floors & Setbacks</button>
      </div>
    </div>
  );

  // PAGE 2
  if (step === "config") return (
    <div style={s.root}>
      <div style={s.header}>{back(() => setStep("input"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 900, fontSize: 18 }}>Building Setup</div><div style={{ color: C.muted, fontSize: 12 }}>Floors, basement, top floor, setbacks</div></div></div>
      <ProgressArc />
      <div style={s.body}>
        <div onClick={() => setHasBasement(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: hasBasement ? C.accent + "18" : C.card, borderRadius: 12, padding: "12px 16px", marginBottom: 16, border: `1.5px solid ${hasBasement ? C.accent : C.border}`, cursor: "pointer" }}>
          <div><div style={{ fontWeight: 700, fontSize: 14 }}>🕳️ Include a Basement</div><div style={{ color: C.muted, fontSize: 12 }}>Parking, storage, home theatre, gym</div></div>{toggle(hasBasement)}
        </div>
        <span style={s.label}>Floors above ground (including ground floor)</span>
        <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>{[1, 2, 3, 4, 5].map(f => <button key={f} style={s.chip(floorsCount === f)} onClick={() => setFloorsCount(f)}>{f}</button>)}</div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 18 }}>{hasBasement ? "Basement · " : ""}{Array.from({ length: floorsCount }, (_, i) => i === 0 ? "Ground" : i === 1 ? "1st" : i === 2 ? "2nd" : i === 3 ? "3rd" : `${i}th`).join(" · ")}</div>
        <span style={s.label}>Top floor style</span>
        <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 10 }}>What should your topmost floor be?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {[["normal", "🏠 Normal living floor", "Same as any other floor"], ["terrace", "🏞️ Open Terrace", "Rest of top floor left open — no rooms"], ["penthouse", "🏙️ Penthouse", "A premium smaller living space at the top"], ["both", "🏙️ Penthouse + Terrace", "Penthouse rooms with surrounding open terrace"]].map(([id, lbl, desc]) => (
            <div key={id} onClick={() => setTopMode(id)} style={{ display: "flex", alignItems: "center", gap: 10, background: topMode === id ? C.accent + "18" : C.card, border: `1.5px solid ${topMode === id ? C.accent : C.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${topMode === id ? C.accent : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{topMode === id && <div style={{ width: 9, height: 9, borderRadius: "50%", background: C.accent }} />}</div>
              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{lbl}</div><div style={{ color: C.muted, fontSize: 11.5 }}>{desc}</div></div>
            </div>
          ))}
        </div>
        <div onClick={() => setLiftOn(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.card, borderRadius: 12, padding: "12px 16px", marginBottom: 18, border: `1.5px solid ${liftOn ? C.purple : C.border}`, cursor: "pointer" }}>
          <div><div style={{ fontWeight: 700, fontSize: 14 }}>🛗 Include a Lift</div><div style={{ color: C.muted, fontSize: 12 }}>Reserves {CORE.lift.min} sqft on every floor</div></div>{toggle(liftOn)}
        </div>
        <span style={s.label}>Setbacks — open space left on each side (ft)</span>
        <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 10, lineHeight: 1.5 }}>Most local building rules require leaving open margins around the building.</div>
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>{field("Front", sbFront, setSbFront)}{field("Rear", sbRear, setSbRear)}</div>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>{field("Left", sbLeft, setSbLeft)}{field("Right", sbRight, setSbRight)}</div>
        <div style={{ background: C.card, borderRadius: 14, padding: 14, marginBottom: 20, border: `1px solid ${C.border}`, textAlign: "center" }}>
          <div style={{ color: C.muted, fontSize: 12 }}>Buildable area per floor (after setbacks)</div>
          <div style={{ color: C.green, fontWeight: 900, fontSize: 24 }}>{footprint.toLocaleString()} sqft</div>
          <div style={{ color: C.muted, fontSize: 11.5, marginTop: 2 }}>~{Math.round((footprint / area) * 100)}% ground coverage · {floorList.length} level(s) to design</div>
        </div>
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
        <div style={s.header}>{back(() => setStep("config"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 900, fontSize: 18 }}>Building Heights</div><div style={{ color: C.muted, fontSize: 12 }}>Floor heights, plinth & total height</div></div></div>
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
            <div style={{ color: C.green, fontWeight: 900, fontSize: 26 }}>{totalHeightFromRoad} ft</div>
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
      <div style={s.header}>{back(() => setStep("vertical"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 900, fontSize: 18 }}>Plot Surroundings</div><div style={{ color: C.muted, fontSize: 12 }}>What's around your plot, and where are the gates?</div></div></div>
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
              <div key={side} onClick={() => setGates(g => ({ ...g, [side]: !g[side] }))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: on ? C.accent + "22" : C.card, border: `1.5px solid ${on ? C.accent : C.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
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
      <div style={s.header}>{back(() => setStep("surround"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 900, fontSize: 18 }}>Plot Direction</div><div style={{ color: C.muted, fontSize: 12 }}>Which way does your plot face?</div></div></div>
      <ProgressArc />
      <div style={s.body}>
        <div onClick={() => setVastuOn(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: vastuOn ? C.purple + "18" : C.card, borderRadius: 12, padding: "12px 16px", marginBottom: 18, border: `1.5px solid ${vastuOn ? C.purple : C.border}`, cursor: "pointer" }}>
          <div><div style={{ fontWeight: 700, fontSize: 14 }}>🧭 Vastu Mode</div><div style={{ color: C.muted, fontSize: 12 }}>Show directions & placement guidance</div></div>{toggle(vastuOn)}
        </div>
        {!vastuOn && <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, textAlign: "center", color: C.muted, fontSize: 13, marginBottom: 18 }}>Vastu mode is off. Your plot will be designed without direction guidance. You can turn it on anytime.</div>}
        {vastuOn && <>
          <Dial points={points} facing={facing} setFacing={setFacing} />
          <div style={{ background: C.card, borderRadius: 14, padding: 16, margin: "14px 0", border: `1px solid ${C.border}`, textAlign: "center" }}>
            <div style={{ color: C.muted, fontSize: 12 }}>Front faces</div>
            <div style={{ color: C.amber, fontWeight: 900, fontSize: 24 }}>{facing}° {facingDir}</div>
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
    const freeForNewRoom = footprint - coreArea - roomsArea;
    return (
      <div style={s.root}>
        <div style={s.header}>{back(() => cur === 0 ? setStep("direction") : setCur(cur - 1))}<div style={{ flex: 1 }}><div style={{ fontWeight: 900, fontSize: 18 }}>{meta.icon} {meta.label}</div><div style={{ color: C.muted, fontSize: 12 }}>Level {cur + 1} of {floorList.length}{vastuOn ? ` · faces ${facingDir}` : ""}</div></div></div>
        <div style={{ display: "flex", gap: 6, padding: "12px 16px 0" }}>{floorList.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < cur ? C.green : i === cur ? C.accent : C.border }} />)}</div>
        <ProgressArc />
        <div style={s.body}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Reserved on every floor (standard minimum)</div>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ background: CORE.stairs.color + "33", color: C.text, border: `1px solid ${CORE.stairs.color}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 600 }}>🪜 Staircase · {CORE.stairs.min} sqft</span>
              {liftOn && <span style={{ background: CORE.lift.color + "33", color: C.purple, border: `1px solid ${CORE.lift.color}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 600 }}>🛗 Lift · {CORE.lift.min} sqft</span>}
            </div>
          </div>
          {isGroundLike && purpose === "residential" && (
            <div onClick={toggleFP} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: f.fullParking ? C.amber + "22" : C.card, borderRadius: 12, padding: "12px 16px", marginBottom: 14, border: `1.5px solid ${f.fullParking ? C.amber : C.border}`, cursor: "pointer" }}>
              <div><div style={{ fontWeight: 700, fontSize: 14 }}>🚗 Make Ground Floor full parking</div><div style={{ color: C.muted, fontSize: 12 }}>Living floors then start from 1st floor</div></div>
              <div style={{ width: 44, height: 26, borderRadius: 20, background: f.fullParking ? C.amber : C.border, position: "relative" }}><div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: f.fullParking ? 21 : 3, transition: "all .2s" }} /></div>
            </div>
          )}
          {meta.kind === "terrace" && <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 14, color: C.muted, fontSize: 13, textAlign: "center" }}>🏞️ This is an open terrace floor. You can still add a small store or garden corner, but most space stays open.</div>}
          {!f.fullParking && <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>Tap to add spaces</span>
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
            {f.rooms.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <span style={s.label}>This floor's spaces — drag to resize</span>
                <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 10, lineHeight: 1.5 }}>Each room's maximum is the floor's total area, minus stairs{liftOn ? ", lift" : ""} and every other room you've added.</div>
                {f.rooms.map(r => { const t = ROOMS[r.typeId]; const othersArea = f.rooms.filter(x => x.uid !== r.uid).reduce((a, x) => a + x.sqft, 0); const liveMax = Math.max(t.min, footprint - coreArea - othersArea); return (
                  <div key={r.uid} style={{ marginBottom: 14, background: C.card, borderRadius: 10, padding: "10px 12px", border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span>{t.icon}</span><span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{t.label}</span><button onClick={() => removeRoom(r.uid)} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${C.red}55`, background: "transparent", color: C.red, cursor: "pointer", fontSize: 13 }}>×</button></div>
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
    const placed = activeStyle ? generateLayout(points, facing, activeStyle, roomsForLayout, cores) : [];
    const styleObj = STYLES.find(x => x.id === activeStyle);
    const reason = {
      vastu: "Kitchen placed toward the South-East (fire), master bedroom in the stable South-West, pooja in the sacred North-East, toilets kept away from the North-East.",
      social: "Living, dining and kitchen clustered into one social zone near the front, with bedrooms grouped away for quiet and privacy.",
      light: "Living spaces and bedrooms pushed to the outer walls for natural light; service rooms placed toward the interior.",
      compact: "Wet rooms grouped to share plumbing walls and circulation kept tight to reduce construction cost.",
    };
    return (
      <div style={s.root}>
        <div style={s.header}>{back(() => { setCur(floorList.length - 1); setStep("floor"); })}<div style={{ flex: 1 }}><div style={{ fontWeight: 900, fontSize: 18 }}>Choose Layout Style</div><div style={{ color: C.muted, fontSize: 12 }}>How should your rooms be arranged?</div></div></div>
        <ProgressArc />
        <div style={s.body}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {STYLES.map(st => {
              const selected = activeStyle === st.id;
              const locked = st.premium;
              return (
                <div key={st.id} onClick={() => pickStyle(st)} style={{ position: "relative", background: selected ? C.accent + "22" : C.card, border: `1.5px solid ${selected ? C.accent : C.border}`, borderRadius: 12, padding: "14px 12px", cursor: "pointer", opacity: locked ? 0.75 : 1 }}>
                  {locked && <div style={{ position: "absolute", top: 8, right: 8, background: C.amber + "26", color: C.amber, border: `1px solid ${C.amber}66`, borderRadius: 6, padding: "1px 6px", fontSize: 9, fontWeight: 800 }}>🔒 PREMIUM</div>}
                  <div style={{ fontSize: 22 }}>{st.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginTop: 6 }}>{st.label}</div>
                  <div style={{ color: C.muted, fontSize: 10.5, marginTop: 2, lineHeight: 1.4 }}>{st.desc}</div>
                </div>
              );
            })}
          </div>

          {lockMsg === "vastu-off" && <div style={{ background: C.purple + "18", border: `1px solid ${C.purple}55`, borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12.5, color: C.purple }}>Turn on Vastu Mode (on the Direction step) to use the Vastu-First style.</div>}
          {lockMsg && lockMsg !== "vastu-off" && <div style={{ background: C.amber + "18", border: `1px solid ${C.amber}55`, borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12.5, color: C.amber }}>✨ <b>{lockMsg}</b> is a Premium style. Upgrade to unlock more layout styles, multiple AI options, and contractor-ready export.</div>}

          {!activeStyle && <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 12, padding: 24, textAlign: "center", color: C.muted, fontSize: 13, marginBottom: 16 }}>Pick a free style above to generate your layout.</div>}

          {activeStyle && <>
            {floorList.length > 1 && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
                {floorList.map((meta, i) => (
                  <button key={i} onClick={() => setLayoutFloor(i)} style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: "pointer", border: `1.5px solid ${layoutFloor === i ? C.accent : C.border}`, background: layoutFloor === i ? C.accent + "22" : "transparent", color: layoutFloor === i ? C.accent : C.muted }}>{meta.icon} {meta.label.replace(" Floor", "")}</button>
                ))}
              </div>
            )}
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{styleObj.icon} {styleObj.label} — {floorList[layoutFloor]?.label}</div>
            <LayoutView points={points} placed={placed} facing={facing} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {placed.map((b, k) => <span key={k} style={{ display: "flex", alignItems: "center", gap: 5, color: C.muted, fontSize: 11.5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: b.color }} />{b.label}{b.zone ? ` · ${b.zone}` : ""}</span>)}
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, margin: "14px 0" }}>
              <div style={{ color: C.green, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Why this arrangement</div>
              <div style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.5 }}>{reason[activeStyle]}</div>
            </div>
            <button style={s.btn()} onClick={() => setStep("summary")}>Continue → Summary & Cost</button>
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
    return [...cores, ...f.rooms.map(r => ({ ...ROOMS[r.typeId], sqft: r.sqft }))];
  };
  const totalBuilt = floorData.reduce((a, f) => a + (f.fullParking ? footprint : coreArea + f.rooms.reduce((b, r) => b + r.sqft, 0)), 0);
  const rate = RATES[quality];
  const costLow = Math.round(totalBuilt * rate * 0.9);
  const costHigh = Math.round(totalBuilt * rate * 1.1);
  const inLakh = (n) => (n / 100000).toFixed(1);
  return (
    <div style={s.root}>
      <div style={s.header}>{back(() => setStep("style"))}<div style={{ flex: 1 }}><div style={{ fontWeight: 900, fontSize: 18 }}>{projectName || "Your Building"}</div><div style={{ color: C.muted, fontSize: 12 }}>{floorList.length} level(s){liftOn ? " · lift" : ""}{vastuOn ? ` · faces ${facingDir}` : ""}</div></div></div>
      <ProgressArc />
      <div style={s.body}>
        <span style={s.label}>Project name</span>
        <input style={{ ...s.input, marginBottom: 18 }} value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. My Home in Delhi" />
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, background: C.card, borderRadius: 12, padding: 14, border: `1px solid ${C.border}`, textAlign: "center" }}><div style={{ color: C.muted, fontSize: 11 }}>Plot area</div><div style={{ color: C.accent, fontWeight: 800, fontSize: 17 }}>{area.toLocaleString()}</div><div style={{ color: C.muted, fontSize: 10 }}>sqft</div></div>
          <div style={{ flex: 1, background: C.card, borderRadius: 12, padding: 14, border: `1px solid ${C.border}`, textAlign: "center" }}><div style={{ color: C.muted, fontSize: 11 }}>Built-up</div><div style={{ color: C.green, fontWeight: 800, fontSize: 17 }}>{totalBuilt.toLocaleString()}</div><div style={{ color: C.muted, fontSize: 10 }}>sqft</div></div>
          <div style={{ flex: 1, background: C.card, borderRadius: 12, padding: 14, border: `1px solid ${C.border}`, textAlign: "center" }}><div style={{ color: C.muted, fontSize: 11 }}>Levels</div><div style={{ color: C.amber, fontWeight: 800, fontSize: 17 }}>{floorList.length}</div><div style={{ color: C.muted, fontSize: 10 }}>total</div></div>
        </div>
        <span style={s.label}>Construction quality</span>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>{[["basic", "Basic"], ["standard", "Standard"], ["premium", "Premium"]].map(([id, lbl]) => <button key={id} style={s.chip(quality === id)} onClick={() => setQuality(id)}>{lbl}</button>)}</div>
        <div style={{ background: C.card, borderRadius: 14, padding: 16, marginBottom: 20, border: `1px solid ${C.border}`, textAlign: "center" }}>
          <div style={{ color: C.muted, fontSize: 12 }}>Estimated construction cost</div>
          <div style={{ color: C.green, fontWeight: 900, fontSize: 24 }}>₹{inLakh(costLow)}L – ₹{inLakh(costHigh)}L</div>
          <div style={{ color: C.muted, fontSize: 11.5, marginTop: 2 }}>at ₹{rate.toLocaleString()}/sqft · approximate, varies by city & materials</div>
        </div>
        {floorList.map((meta, i) => {
          const f = floorData[i] || { fullParking: false, rooms: [] };
          const blocks = blocksFor(f);
          const used = f.fullParking ? footprint : coreArea + f.rooms.reduce((b, r) => b + r.sqft, 0);
          return (
            <div key={i} style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontWeight: 800, fontSize: 15 }}>{meta.icon} {meta.label}</span><span style={{ color: C.muted, fontSize: 12 }}>{used.toLocaleString()} sqft used</span></div>
              <ShapeView points={points} blocks={blocks} />
            </div>
          );
        })}
        <button style={s.btn("secondary")} onClick={() => setStep("input")}>← Start a New Plan</button>
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
          <polygon points={poly} fill={C.accent + "22"} stroke={C.accent} strokeWidth={2} strokeLinejoin="round" />
          <line x1={fmx} y1={fmy} x2={fmx} y2={fmy + 26} stroke={C.amber} strokeWidth={2.5} />
          <polygon points={`${fmx - 5},${fmy + 22} ${fmx + 5},${fmy + 22} ${fmx},${fmy + 32}`} fill={C.amber} />
          <text x={fmx} y={fmy + 46} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.amber}>FRONT</text>
        </g>
        <circle cx={cx} cy={cy} r={3} fill={C.muted} />
      </svg>
      <div style={{ textAlign: "center", marginTop: 8, color: C.muted, fontSize: 12 }}>Drag the dial to point your plot's front (road side)</div>
    </div>
  );
}

