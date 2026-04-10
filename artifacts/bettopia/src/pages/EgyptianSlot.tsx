import React, { useRef, useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { useAuth } from "../contexts/AuthContext";

const COLS = 5;
const ROWS = 3;
const CELL = 138;
const GAP = 5;
const CELL_H = CELL + GAP;
const REEL_W = COLS * CELL + (COLS - 1) * GAP;
const REEL_H = ROWS * CELL + (ROWS - 1) * GAP;
const CANVAS_W = REEL_W + 80;
const CANVAS_H = REEL_H + 130;
const REEL_X = 40;
const REEL_Y = 65;
const POOL_BEFORE = 22;

const SYM_CFG = [
  { name: "Eye of Ra",  bg0: "#1a0500", bg1: "#050101", border: "#FFD700", glow: "#FFB300" },
  { name: "Pharaoh",    bg0: "#000520", bg1: "#000208", border: "#4488FF", glow: "#66AAFF" },
  { name: "Scarab",     bg0: "#001a08", bg1: "#000802", border: "#00CED1", glow: "#00FFFF" },
  { name: "Ankh",       bg0: "#10001a", bg1: "#06000a", border: "#CC55DD", glow: "#FF88FF" },
  { name: "Book",       bg0: "#1a1000", bg1: "#0a0500", border: "#FFD700", glow: "#FFEE44" },
  { name: "Ace",        bg0: "#0d0d0d", bg1: "#030303", border: "#FFD700", glow: "#FFD700" },
  { name: "King",       bg0: "#0d0d0d", bg1: "#030303", border: "#AAAAAA", glow: "#CCCCCC" },
  { name: "Queen",      bg0: "#0d0d0d", bg1: "#030303", border: "#BB44CC", glow: "#DD88EE" },
  { name: "Jack",       bg0: "#0d0d0d", bg1: "#030303", border: "#CC8833", glow: "#FFAA44" },
];

const BET_OPTIONS = [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50];

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawEye(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  const ew = s * 0.82, eh = s * 0.38;
  ctx.shadowBlur = 18; ctx.shadowColor = "#FFD700";
  const g = ctx.createRadialGradient(cx, cy - eh * 0.2, 0, cx, cy, ew / 2);
  g.addColorStop(0, "#FFFACC"); g.addColorStop(0.5, "#FFD700"); g.addColorStop(1, "#A07800");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - ew / 2, cy);
  ctx.bezierCurveTo(cx - ew / 4, cy - eh, cx + ew / 4, cy - eh, cx + ew / 2, cy);
  ctx.bezierCurveTo(cx + ew / 4, cy + eh, cx - ew / 4, cy + eh, cx - ew / 2, cy);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke();
  const ig = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.14);
  ig.addColorStop(0, "#400000"); ig.addColorStop(1, "#800000");
  ctx.fillStyle = ig;
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.08, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath(); ctx.arc(cx - s * 0.045, cy - s * 0.045, s * 0.038, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - ew / 2, cy); ctx.lineTo(cx - ew / 2 - s * 0.18, cy + s * 0.12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + ew / 2, cy); ctx.lineTo(cx + ew / 2 + s * 0.18, cy + s * 0.12); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, cy + eh); ctx.lineTo(cx - s * 0.07, cy + eh + s * 0.18); ctx.stroke();
  ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r1 = s * 0.5, r2 = s * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.stroke();
  }
}

function drawPharaoh(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.shadowBlur = 15; ctx.shadowColor = "#4488FF";
  const hw = s * 0.52, hh = s * 0.6;
  const hg = ctx.createLinearGradient(cx - hw / 2, cy - hh / 2, cx + hw / 2, cy + hh * 0.3);
  hg.addColorStop(0, "#FFE066"); hg.addColorStop(0.4, "#FFD700"); hg.addColorStop(1, "#8B6914");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(cx - hw * 0.28, cy - hh / 2);
  ctx.lineTo(cx + hw * 0.28, cy - hh / 2);
  ctx.lineTo(cx + hw / 2, cy - hh * 0.05);
  ctx.lineTo(cx + hw * 0.35, cy + hh * 0.28);
  ctx.lineTo(cx - hw * 0.35, cy + hh * 0.28);
  ctx.lineTo(cx - hw / 2, cy - hh * 0.05);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#6B5200"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#1A3A8A";
  for (let i = 0; i < 5; i++) {
    const sy2 = cy - hh / 2 + (i + 0.5) * hh * 0.11;
    ctx.fillRect(cx - hw * 0.22, sy2, hw * 0.44, hh * 0.055);
  }
  ctx.shadowBlur = 0;
  const fg = ctx.createRadialGradient(cx, cy - hh * 0.06, 0, cx, cy - hh * 0.06, hw * 0.3);
  fg.addColorStop(0, "#F5E0B0"); fg.addColorStop(1, "#D4A868");
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.ellipse(cx, cy - hh * 0.06, hw * 0.28, hh * 0.32, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.strokeStyle = "#8B6914"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#1A1A00";
  ctx.beginPath(); ctx.ellipse(cx - hw * 0.09, cy - hh * 0.12, hw * 0.05, hh * 0.035, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + hw * 0.09, cy - hh * 0.12, hw * 0.05, hh * 0.035, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx + hw * 0.14, cy - hh * 0.12); ctx.lineTo(cx + hw * 0.24, cy - hh * 0.09); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - hw * 0.14, cy - hh * 0.12); ctx.lineTo(cx - hw * 0.24, cy - hh * 0.09); ctx.stroke();
  ctx.fillStyle = "#8B6914";
  ctx.beginPath();
  ctx.moveTo(cx - hw * 0.08, cy + hh * 0.22);
  ctx.lineTo(cx + hw * 0.08, cy + hh * 0.22);
  ctx.lineTo(cx + hw * 0.045, cy + hh * 0.4);
  ctx.lineTo(cx - hw * 0.045, cy + hh * 0.4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#FFD700"; ctx.font = `bold ${s * 0.09}px serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("𓂀", cx, cy - hh * 0.42);
}

function drawScarab(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.shadowBlur = 15; ctx.shadowColor = "#00CED1";
  const bw = s * 0.42, bh = s * 0.5;
  const wg = ctx.createLinearGradient(cx - s * 0.48, cy, cx + s * 0.48, cy);
  wg.addColorStop(0, "#004855"); wg.addColorStop(0.35, "#008890"); wg.addColorStop(0.5, "#00CED1"); wg.addColorStop(0.65, "#008890"); wg.addColorStop(1, "#004855");
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.moveTo(cx - bw * 0.48, cy - bh * 0.05);
  ctx.bezierCurveTo(cx - bw * 0.48 - s * 0.28, cy - s * 0.33, cx - bw * 0.48 - s * 0.32, cy + s * 0.12, cx - bw * 0.48, cy + bh * 0.22);
  ctx.lineTo(cx - bw * 0.18, cy); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + bw * 0.48, cy - bh * 0.05);
  ctx.bezierCurveTo(cx + bw * 0.48 + s * 0.28, cy - s * 0.33, cx + bw * 0.48 + s * 0.32, cy + s * 0.12, cx + bw * 0.48, cy + bh * 0.22);
  ctx.lineTo(cx + bw * 0.18, cy); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#006868"; ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  const bg2 = ctx.createRadialGradient(cx, cy - bh * 0.18, 0, cx, cy, bw * 0.8);
  bg2.addColorStop(0, "#33DDCC"); bg2.addColorStop(0.5, "#008888"); bg2.addColorStop(1, "#003333");
  ctx.fillStyle = bg2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, bw * 0.5, bh * 0.52, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.strokeStyle = "#004444"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = "#004444"; ctx.lineWidth = 1;
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(cx - bw * 0.36, cy - bh * 0.1 + i * bh * 0.2); ctx.lineTo(cx + bw * 0.36, cy - bh * 0.1 + i * bh * 0.2); ctx.stroke();
  }
  const hg = ctx.createLinearGradient(cx, cy - bh * 0.52, cx, cy - bh * 0.38);
  hg.addColorStop(0, "#33DDCC"); hg.addColorStop(1, "#008888");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(cx, cy - bh * 0.58, bw * 0.28, bh * 0.18, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#001a1a"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - bw * 0.08, cy - bh * 0.67); ctx.lineTo(cx - bw * 0.22, cy - bh * 0.9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + bw * 0.08, cy - bh * 0.67); ctx.lineTo(cx + bw * 0.22, cy - bh * 0.9); ctx.stroke();
}

function drawAnkh(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.shadowBlur = 18; ctx.shadowColor = "#CC55DD";
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const thickness = s * 0.16;
  const ag = ctx.createLinearGradient(cx - s * 0.35, cy - s * 0.48, cx + s * 0.35, cy + s * 0.4);
  ag.addColorStop(0, "#FFE87C"); ag.addColorStop(0.4, "#FFD700"); ag.addColorStop(1, "#8B6914");
  ctx.strokeStyle = ag; ctx.lineWidth = thickness;
  const loopTop = cy - s * 0.38; const loopR = s * 0.22;
  const crossY = cy - s * 0.12;
  ctx.beginPath();
  ctx.ellipse(cx, loopTop, loopR * 0.72, loopR, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, crossY); ctx.lineTo(cx, cy + s * 0.38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - s * 0.34, crossY); ctx.lineTo(cx + s * 0.34, crossY); ctx.stroke();
  ctx.shadowBlur = 12; ctx.shadowColor = "#FF88FF";
  ctx.fillStyle = "#DD55EE";
  ctx.beginPath(); ctx.arc(cx, crossY, thickness * 0.65, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath(); ctx.arc(cx - thickness * 0.22, crossY - thickness * 0.22, thickness * 0.22, 0, Math.PI * 2); ctx.fill();
}

function drawBook(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.shadowBlur = 20; ctx.shadowColor = "#FFD700";
  const bw = s * 0.72, bh = s * 0.78;
  const bx = cx - bw / 2, by = cy - bh / 2;
  const cg = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
  cg.addColorStop(0, "#6B3A1F"); cg.addColorStop(0.5, "#8B4513"); cg.addColorStop(1, "#3D1A08");
  ctx.fillStyle = cg;
  rr(ctx, bx, by, bw, bh, 5); ctx.fill();
  const sw = bw * 0.09;
  ctx.fillStyle = "#2E1008";
  ctx.fillRect(cx - sw / 2, by, sw, bh);
  ctx.shadowBlur = 12; ctx.shadowColor = "#FFD700";
  ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 2;
  rr(ctx, bx + 5, by + 5, bw - 10, bh - 10, 3); ctx.stroke();
  ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const ly = by + bh * (0.18 + i * 0.18);
    ctx.beginPath(); ctx.moveTo(bx + bw * 0.16, ly); ctx.lineTo(bx + bw * 0.42, ly); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + bw * 0.58, ly); ctx.lineTo(bx + bw * 0.84, ly); ctx.stroke();
  }
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  ctx.ellipse(cx, by + bh * 0.42, bw * 0.16, bh * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8B0000";
  ctx.beginPath(); ctx.arc(cx, by + bh * 0.42, bh * 0.04, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 10; ctx.shadowColor = "#FFD700";
  ctx.fillStyle = "#FFD700"; ctx.font = `bold ${s * 0.105}px Arial`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("SCATTER", cx, by + bh * 0.87);
}

function drawCard(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, letter: string, color: string) {
  ctx.shadowBlur = 16; ctx.shadowColor = color;
  const g = ctx.createLinearGradient(cx, cy - s * 0.42, cx, cy + s * 0.42);
  g.addColorStop(0, color); g.addColorStop(0.5, color + "CC"); g.addColorStop(1, color + "88");
  ctx.fillStyle = g;
  ctx.font = `bold ${s * 0.72}px Georgia, serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(letter, cx, cy - s * 0.04);
  ctx.strokeStyle = color + "44"; ctx.lineWidth = 2;
  const pw = s * 0.78, ph = s * 0.82;
  rr(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 8);
  ctx.stroke();
  ctx.font = `bold ${s * 0.16}px Georgia, serif`;
  ctx.fillStyle = color + "88";
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillText(letter, cx - pw / 2 + 6, cy - ph / 2 + 5);
  ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.save(); ctx.translate(cx + pw / 2 - 6, cy + ph / 2 - 5); ctx.rotate(Math.PI);
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillText(letter, 0, 0); ctx.restore();
}

function drawSymbol(ctx: CanvasRenderingContext2D, id: number, cx: number, cy: number, s: number) {
  ctx.save();
  switch (id) {
    case 0: drawEye(ctx, cx, cy, s); break;
    case 1: drawPharaoh(ctx, cx, cy, s); break;
    case 2: drawScarab(ctx, cx, cy, s); break;
    case 3: drawAnkh(ctx, cx, cy, s); break;
    case 4: drawBook(ctx, cx, cy, s); break;
    case 5: drawCard(ctx, cx, cy, s, "A", "#FFD700"); break;
    case 6: drawCard(ctx, cx, cy, s, "K", "#CCCCCC"); break;
    case 7: drawCard(ctx, cx, cy, s, "Q", "#CC55DD"); break;
    case 8: drawCard(ctx, cx, cy, s, "J", "#DD8833"); break;
  }
  ctx.restore();
}

let symCache: HTMLCanvasElement[] | null = null;
let symCacheGlow: HTMLCanvasElement[] | null = null;

function buildCache() {
  if (symCache) return;
  symCache = Array.from({ length: 9 }, (_, id) => {
    const cfg = SYM_CFG[id];
    const c = document.createElement("canvas"); c.width = CELL; c.height = CELL;
    const ctx = c.getContext("2d")!;
    const bg = ctx.createLinearGradient(0, 0, 0, CELL);
    bg.addColorStop(0, cfg.bg0); bg.addColorStop(1, cfg.bg1);
    ctx.fillStyle = bg; rr(ctx, 0, 0, CELL, CELL, 10); ctx.fill();
    ctx.strokeStyle = cfg.border + "66"; ctx.lineWidth = 2;
    rr(ctx, 1, 1, CELL - 2, CELL - 2, 10); ctx.stroke();
    ctx.fillStyle = cfg.border + "55";
    [6, CELL - 6].forEach(x => [6, CELL - 6].forEach(y => {
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }));
    drawSymbol(ctx, id, CELL / 2, CELL / 2 - 4, CELL * 0.54);
    ctx.shadowBlur = 0;
    ctx.font = "bold 10px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillStyle = cfg.border + "AA";
    ctx.fillText(SYM_CFG[id].name.toUpperCase(), CELL / 2, CELL - 5);
    return c;
  });
  symCacheGlow = Array.from({ length: 9 }, (_, id) => {
    const cfg = SYM_CFG[id];
    const c = document.createElement("canvas"); c.width = CELL; c.height = CELL;
    const ctx = c.getContext("2d")!;
    ctx.shadowBlur = 30; ctx.shadowColor = cfg.glow;
    const bg = ctx.createLinearGradient(0, 0, 0, CELL);
    bg.addColorStop(0, cfg.bg0 + "FF"); bg.addColorStop(1, cfg.bg1 + "FF");
    ctx.fillStyle = bg; rr(ctx, 0, 0, CELL, CELL, 10); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = cfg.glow; ctx.lineWidth = 3;
    rr(ctx, 1, 1, CELL - 2, CELL - 2, 10); ctx.stroke();
    ctx.strokeStyle = cfg.glow + "44"; ctx.lineWidth = 1;
    rr(ctx, 5, 5, CELL - 10, CELL - 10, 7); ctx.stroke();
    ctx.fillStyle = cfg.glow;
    [6, CELL - 6].forEach(x => [6, CELL - 6].forEach(y => {
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }));
    drawSymbol(ctx, id, CELL / 2, CELL / 2 - 4, CELL * 0.54);
    ctx.shadowBlur = 0;
    ctx.font = "bold 10px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillStyle = cfg.glow;
    ctx.fillText(SYM_CFG[id].name.toUpperCase(), CELL / 2, CELL - 5);
    return c;
  });
}

interface SpinResult {
  grid: number[][];
  wins: { lineIndex: number; symbol: number; count: number; positions: [number, number][]; multiplier: number; winAmount: number }[];
  totalWin: number;
  freeSpins: boolean;
  freeSpinsCount: number;
  balance: number;
}

interface ReelAnim {
  pool: number[];
  scrollPx: number;
  speed: number;
  stopped: boolean;
  stopAt: number;
}

export default function EgyptianSlot() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef<{
    reels: ReelAnim[];
    phase: "idle" | "spinning" | "win" | "freespins";
    result: SpinResult | null;
    winFlash: number;
    glowCells: Set<string>;
    stars: { x: number; y: number; r: number; a: number }[];
    lastTime: number;
    totalWinDisplay: number;
    winTicker: number;
    message: string;
  }>({
    reels: [],
    phase: "idle",
    result: null,
    winFlash: 0,
    glowCells: new Set(),
    stars: Array.from({ length: 60 }, () => ({ x: Math.random() * CANVAS_W, y: Math.random() * REEL_Y, r: Math.random() * 1.5 + 0.3, a: Math.random() })),
    lastTime: 0,
    totalWinDisplay: 0,
    winTicker: 0,
    message: "",
  });

  const { user, refreshUser } = useAuth();
  const [bet, setBet] = useState(1);
  const [balance, setBalance] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [betIdx, setBetIdx] = useState(3);

  useEffect(() => {
    if (user?.balance !== undefined) setBalance(user.balance);
  }, [user]);

  useEffect(() => {
    buildCache();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function render(ts: number) {
      const st = stateRef.current;
      const dt = Math.min((ts - st.lastTime) / 1000, 0.05);
      st.lastTime = ts;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bgGrad.addColorStop(0, "#050008");
      bgGrad.addColorStop(0.6, "#0a0510");
      bgGrad.addColorStop(1, "#120820");
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Stars (above reels)
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, CANVAS_W, REEL_Y); ctx.clip();
      for (const star of st.stars) {
        star.a += dt * 0.8;
        const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(star.a));
        ctx.fillStyle = `rgba(255,220,100,${alpha})`;
        ctx.beginPath(); ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      // Pyramid silhouettes
      ctx.fillStyle = "rgba(20,8,2,0.9)";
      [[REEL_X - 20, 180], [REEL_X + REEL_W - 50, 130], [CANVAS_W - 30, 160]].forEach(([px, ph]) => {
        ctx.beginPath();
        ctx.moveTo(px as number, REEL_Y);
        ctx.lineTo((px as number) + (ph as number) * 0.6, REEL_Y);
        ctx.lineTo((px as number) + (ph as number) * 0.3, REEL_Y - (ph as number) * 0.5);
        ctx.closePath(); ctx.fill();
      });

      // Reel frame outer glow
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#AA8800";
      ctx.strokeStyle = "#8B6914"; ctx.lineWidth = 4;
      rr(ctx, REEL_X - 8, REEL_Y - 8, REEL_W + 16, REEL_H + 16, 14);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Reel background
      const reelBg = ctx.createLinearGradient(REEL_X, REEL_Y, REEL_X, REEL_Y + REEL_H);
      reelBg.addColorStop(0, "#0d0805");
      reelBg.addColorStop(1, "#050302");
      ctx.fillStyle = reelBg;
      rr(ctx, REEL_X - 4, REEL_Y - 4, REEL_W + 8, REEL_H + 8, 12);
      ctx.fill();

      // Egyptian border decoration
      ctx.fillStyle = "#8B6914";
      for (let i = 0; i <= COLS; i++) {
        const bx = REEL_X - 8 + i * (CELL + GAP) - (i === 0 ? 0 : GAP * 0.5);
        if (i > 0 && i < COLS) {
          ctx.fillRect(bx, REEL_Y - 8, 1, REEL_H + 16);
        }
      }

      // Draw reels
      for (let reel = 0; reel < COLS; reel++) {
        const rx = REEL_X + reel * (CELL + GAP);
        ctx.save();
        ctx.beginPath(); ctx.rect(rx, REEL_Y, CELL, REEL_H); ctx.clip();

        if (st.reels.length > 0 && st.phase !== "idle") {
          const r = st.reels[reel];
          if (!r.stopped) {
            r.scrollPx += r.speed * dt;
            const remaining = r.stopAt - r.scrollPx;
            if (remaining <= 0) {
              r.scrollPx = r.stopAt;
              r.stopped = true;
            } else if (remaining < CELL_H * 3) {
              r.speed = Math.max(300, remaining * 3.5);
            }
          }

          const totalPx = r.scrollPx;
          const startIdx = Math.floor(totalPx / CELL_H);
          const offsetPx = totalPx % CELL_H;

          for (let row = -1; row < ROWS + 1; row++) {
            const idx = (startIdx + row) % r.pool.length;
            const symId = r.pool[Math.max(0, idx)];
            const sy = REEL_Y + row * CELL_H - offsetPx;
            if (sy > REEL_Y + REEL_H + CELL || sy < REEL_Y - CELL) continue;

            const cache = r.stopped ? symCacheGlow : symCache;
            const tex = (r.stopped && st.glowCells.has(`${reel},${row}`) ? symCacheGlow : symCache);
            if (tex && tex[symId]) {
              if (!r.stopped) {
                ctx.globalAlpha = 0.92;
                ctx.filter = "blur(2px)";
              }
              ctx.drawImage(tex[symId], rx, sy);
              ctx.globalAlpha = 1; ctx.filter = "none";
            }
          }
        } else {
          // Idle display - show static demo grid
          const demo = [0, 1, 2, 3, 4, 5, 6, 7, 8];
          for (let row = 0; row < ROWS; row++) {
            const id = demo[(reel + row * 2) % 9];
            const sy = REEL_Y + row * CELL_H;
            if (symCache) ctx.drawImage(symCache[id], rx, sy);
          }
        }

        ctx.restore();
      }

      // Win overlay
      if (st.phase === "win" && st.result) {
        st.winFlash += dt * 3;
        st.winTicker += dt;
        const pulse = 0.5 + 0.5 * Math.sin(st.winFlash * Math.PI * 2);

        // Dim non-winning symbols
        ctx.fillStyle = `rgba(0,0,0,${0.5 * pulse})`;
        for (let col = 0; col < COLS; col++) {
          for (let row = 0; row < ROWS; row++) {
            if (!st.glowCells.has(`${col},${row}`)) {
              ctx.fillRect(REEL_X + col * (CELL + GAP), REEL_Y + row * CELL_H, CELL, CELL);
            }
          }
        }

        // Redraw glowing symbols
        for (const key of st.glowCells) {
          const [c, r2] = key.split(",").map(Number);
          if (st.result && symCacheGlow) {
            const sym = st.result.grid[c][r2];
            ctx.save();
            ctx.globalAlpha = 0.7 + 0.3 * pulse;
            ctx.drawImage(symCacheGlow[sym], REEL_X + c * (CELL + GAP), REEL_Y + r2 * CELL_H);
            ctx.restore();
          }
        }

        // Win amount display
        if (st.result.totalWin > 0) {
          const winScale = 1 + 0.12 * Math.sin(st.winFlash * Math.PI * 4);
          ctx.save();
          ctx.translate(CANVAS_W / 2, REEL_Y + REEL_H / 2);
          ctx.scale(winScale, winScale);
          ctx.shadowBlur = 30; ctx.shadowColor = "#FFD700";
          ctx.fillStyle = "#FFD700";
          ctx.font = `bold ${CELL * 0.38}px Georgia, serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(`+${st.result.totalWin.toFixed(2)} DL`, 0, 0);
          ctx.restore();
        }
      }

      // Payline indicator
      ctx.strokeStyle = "#FFD70044"; ctx.lineWidth = 2;
      const midY = REEL_Y + CELL_H + CELL / 2;
      ctx.shadowBlur = 8; ctx.shadowColor = "#FFD700";
      ctx.strokeRect(REEL_X, REEL_Y + CELL_H, REEL_W, CELL);
      ctx.shadowBlur = 0;

      // Top header
      ctx.font = "bold 22px Georgia, serif";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.shadowBlur = 15; ctx.shadowColor = "#FFD700";
      ctx.fillStyle = "#FFD700";
      ctx.fillText("𓂀 EGYPTIAN GOLD 𓂀", CANVAS_W / 2, 14);
      ctx.shadowBlur = 0;

      // Free spins remaining indicator
      if (freeSpinsLeft > 0) {
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 13px Arial";
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`FREE SPINS: ${freeSpinsLeft}`, REEL_X, 14);
      }

      animRef.current = requestAnimationFrame(render);
    }

    animRef.current = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animRef.current); };
  }, [freeSpinsLeft]);

  const doSpin = useCallback(async () => {
    if (spinning) return;
    const token = localStorage.getItem("bettopia_token");
    if (!token) { setMessage("Please log in to play."); return; }
    if (balance !== null && balance < bet) { setMessage("Insufficient balance."); return; }

    setSpinning(true);
    setLastWin(null);
    setMessage("");
    stateRef.current.phase = "spinning";
    stateRef.current.glowCells = new Set();
    stateRef.current.winFlash = 0;

    // Build spin pools
    const pools: number[][] = Array.from({ length: COLS }, () => {
      const p: number[] = [];
      for (let i = 0; i < POOL_BEFORE; i++) p.push(Math.floor(Math.random() * 9));
      return p;
    });

    const reels: ReelAnim[] = pools.map((pool) => ({
      pool,
      scrollPx: 0,
      speed: 3800 + Math.random() * 400,
      stopped: false,
      stopAt: POOL_BEFORE * CELL_H,
    }));
    stateRef.current.reels = reels;

    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${apiBase}/api/slots/egyptian/spin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bet }),
      });
      const result: SpinResult = await resp.json();

      if (!resp.ok) {
        setMessage((result as any).error || "Spin failed");
        stateRef.current.phase = "idle";
        setSpinning(false);
        return;
      }

      // Append actual result symbols to each reel's pool
      for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
          reels[col].pool.push(result.grid[col][row]);
        }
      }

      // Stop reels one by one with delays
      const STOP_DELAYS = [0, 350, 700, 1050, 1400];
      for (let col = 0; col < COLS; col++) {
        await new Promise(r => setTimeout(r, STOP_DELAYS[col]));
        reels[col].stopAt = (POOL_BEFORE + ROWS) * CELL_H;
      }

      // Wait for last reel to visually stop
      await new Promise(r => setTimeout(r, 900));

      stateRef.current.result = result;
      setBalance(result.balance);

      if (result.wins.length > 0) {
        const glowSet = new Set<string>();
        for (const w of result.wins) {
          for (const [c, r] of w.positions) glowSet.add(`${c},${r}`);
        }
        stateRef.current.glowCells = glowSet;
        stateRef.current.phase = "win";
        setLastWin(result.totalWin);

        if (result.freeSpins) {
          setMessage(`🎉 ${result.freeSpinsCount} FREE SPINS!`);
          setFreeSpinsLeft(result.freeSpinsCount);
        }

        await new Promise(r => setTimeout(r, 3500));
      } else {
        stateRef.current.phase = "idle";
        if (result.freeSpins) {
          setMessage(`🎉 ${result.freeSpinsCount} FREE SPINS!`);
          setFreeSpinsLeft(result.freeSpinsCount);
        }
      }

      stateRef.current.phase = "idle";
      stateRef.current.glowCells = new Set();

      if (freeSpinsLeft > 0) setFreeSpinsLeft(f => f - 1);
    } catch {
      setMessage("Connection error. Try again.");
      stateRef.current.phase = "idle";
    }

    setSpinning(false);
  }, [spinning, bet, balance, freeSpinsLeft]);

  const changeBet = (dir: 1 | -1) => {
    setBetIdx(i => {
      const next = Math.max(0, Math.min(BET_OPTIONS.length - 1, i + dir));
      setBet(BET_OPTIONS[next]);
      return next;
    });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #050008 0%, #0a0510 60%, #120820 100%)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-900/30">
        <Link href="/slots">
          <button className="text-yellow-600 hover:text-yellow-400 text-sm font-semibold flex items-center gap-1 transition-colors">
            ← All Slots
          </button>
        </Link>
        <div className="text-center">
          <p className="text-yellow-500 font-bold text-sm tracking-widest">EGYPTIAN GOLD</p>
          <p className="text-yellow-700 text-xs">10 Paylines · High Volatility</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-yellow-700">Balance</p>
          <p className="text-yellow-400 font-bold text-sm">{balance !== null ? `${balance.toFixed(2)} DL` : "—"}</p>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-2">
        <div className="relative" style={{ width: CANVAS_W, maxWidth: "100%" }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ width: "100%", borderRadius: 16, border: "2px solid #4a3300", boxShadow: "0 0 40px rgba(180,130,0,0.3)" }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-yellow-900/30" style={{ background: "linear-gradient(180deg, #0a0608 0%, #050305 100%)" }}>
        {/* Win / message display */}
        <div className="text-center py-2 h-8 flex items-center justify-center">
          {lastWin !== null && lastWin > 0 && !spinning && (
            <span className="text-yellow-400 font-bold text-base" style={{ textShadow: "0 0 10px #FFD700" }}>
              WIN: +{lastWin.toFixed(2)} DL
            </span>
          )}
          {message && <span className="text-yellow-300 font-bold text-sm">{message}</span>}
        </div>

        <div className="flex items-center justify-between px-6 pb-4 gap-4">
          {/* Bet */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-yellow-700 text-xs font-semibold tracking-wider">BET</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeBet(-1)}
                disabled={spinning || betIdx === 0}
                className="w-8 h-8 rounded-full border border-yellow-800 text-yellow-500 font-bold text-lg hover:border-yellow-500 disabled:opacity-30 transition-all"
              >−</button>
              <span className="text-yellow-300 font-bold w-16 text-center text-sm">{bet.toFixed(2)} DL</span>
              <button
                onClick={() => changeBet(1)}
                disabled={spinning || betIdx === BET_OPTIONS.length - 1}
                className="w-8 h-8 rounded-full border border-yellow-800 text-yellow-500 font-bold text-lg hover:border-yellow-500 disabled:opacity-30 transition-all"
              >+</button>
            </div>
          </div>

          {/* Spin button */}
          <button
            onClick={doSpin}
            disabled={spinning || !user}
            className="relative flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
            style={{
              width: 90, height: 90,
              borderRadius: "50%",
              background: spinning
                ? "radial-gradient(circle, #555 0%, #333 100%)"
                : "radial-gradient(circle, #FFE066 0%, #D4A000 40%, #8B6000 100%)",
              boxShadow: spinning ? "none" : "0 0 30px rgba(212,160,0,0.7), 0 4px 20px rgba(0,0,0,0.8)",
              border: "3px solid #8B6914",
            }}
          >
            <span className="text-2xl">{spinning ? "⏳" : "▶"}</span>
          </button>

          {/* Paytable hint */}
          <div className="flex flex-col items-center gap-1 text-right">
            <span className="text-yellow-700 text-xs font-semibold tracking-wider">PAYS</span>
            <div className="text-yellow-600 text-xs space-y-0.5">
              <div>Eye 5× <span className="text-yellow-400">200×</span></div>
              <div>Book 3× <span className="text-yellow-400">8× + FS</span></div>
              <div>Scarab 5× <span className="text-yellow-400">50×</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
