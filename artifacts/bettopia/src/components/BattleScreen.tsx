import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Package, Crown, Eye, Bot, Loader2, LogOut, Volume2, VolumeX, ChevronLeft, ChevronRight } from "lucide-react";
import { GemIcon } from "./GemIcon";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import bigOrbSrc from "@assets/legendary_orb_1775536735371.webp";
import orbPlaceholderSrc from "@assets/legendary_orb_1775538080736.webp";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BattleItem {
  id: string;
  name: string;
  color: string;
  value: number;
  rarity: string;
  imageUrl?: string;
}

interface CaseItem extends BattleItem {
  chance: number;
}

interface BattlePlayer {
  userId: string;
  username: string;
  teamIndex: number;
  slotIndex: number;
  items: BattleItem[];
  totalValue: number;
  isBot?: boolean;
}

interface BattleRound {
  roundNumber: number;
  caseId: number;
  results: { userId: string | number; item: BattleItem }[];
}

interface CaseData {
  id: string;
  name: string;
  price: number;
  items: CaseItem[];
}

interface BattleResult {
  id: string;
  status: string;
  gameMode: string;
  battleType?: string;
  isShared?: boolean;
  maxPlayers: number;
  isDraw?: boolean;
  winnerId?: string;
  winnerTeamIndex?: number;
  players: BattlePlayer[];
  cases: CaseData[];
  rounds: BattleRound[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const TEAM_COLORS = [
  { border: "border-blue-500",  bg: "bg-blue-500/10",  text: "text-blue-400",  hex: "#3B82F6", solid: "bg-blue-500" },
  { border: "border-red-500",   bg: "bg-red-500/10",   text: "text-red-400",   hex: "#EF4444", solid: "bg-red-500" },
  { border: "border-green-500", bg: "bg-green-500/10", text: "text-green-400", hex: "#22C55E", solid: "bg-green-500" },
  { border: "border-yellow-500",bg: "bg-yellow-500/10",text: "text-yellow-400",hex: "#EAB308", solid: "bg-yellow-500" },
  { border: "border-pink-500",  bg: "bg-pink-500/10",  text: "text-pink-400",  hex: "#EC4899", solid: "bg-pink-500" },
  { border: "border-cyan-500",  bg: "bg-cyan-500/10",  text: "text-cyan-400",  hex: "#06B6D4", solid: "bg-cyan-500" },
];

const RARITY_COLOR: Record<string, string> = {
  common:    "#9E9E9E",
  uncommon:  "#2196F3",
  rare:      "#4CAF50",
  epic:      "#9C27B0",
  legendary: "#FF9800",
  mythic:    "#FFD700",
  divine:    "#FFFFFF",
};

const REEL_BG     = "hsl(var(--sidebar))";
const REEL_H      = 168;
const ITEM_W      = 96;
const ITEM_COUNT  = 60;
const WINNING_IDX = 45;
const START_OFFSET = 5 * ITEM_W;
const ORB_THRESHOLD = 3; // ≤3% → gold orb (same as Cases.tsx GOLD_ORB_THRESHOLD)

// Orb placeholder item — shown in reel strip for ≤3% items (matches ORB_PLACEHOLDER_ITEM in Cases.tsx)
const ORB_ITEM: BattleItem = {
  id: "__orb__",
  name: "???",
  color: "#fbbf24",
  value: 0,
  rarity: "__orb__",
  imageUrl: orbPlaceholderSrc,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getNumTeams(gameMode: string): number {
  return gameMode.split("v").filter(Boolean).length;
}
function getPlayersPerTeam(gameMode: string): number {
  return parseInt(gameMode.split("v")[0], 10) || 1;
}

function buildStrip(caseItems: CaseItem[], result: BattleItem, resultIsRare: boolean): BattleItem[] {
  const pool = caseItems.length > 0 ? caseItems : [{ ...result, chance: 100 } as CaseItem];
  const strip: BattleItem[] = [];
  for (let i = 0; i < ITEM_COUNT; i++) {
    const item = pool[Math.floor(Math.random() * pool.length)];
    // Replace ≤3% items with orb placeholder — exact same rule as Cases.tsx
    strip.push(item.chance <= ORB_THRESHOLD ? ORB_ITEM : item);
  }
  // Winning position: orb if rare, else real item
  strip[WINNING_IDX] = resultIsRare ? ORB_ITEM : result;
  return strip;
}

// ─── Currency ──────────────────────────────────────────────────────────────────

function ValDisplay({ value, size = 11 }: { value: number; size?: number }) {
  let n: number, unit: string;
  if (value >= 100)    { n = +(value / 100).toFixed(2); unit = "BGL"; }
  else if (value >= 1) { n = +value.toFixed(2);          unit = "DL";  }
  else                 { n = Math.round(value * 100);    unit = "WL";  }
  return (
    <span className="flex items-center gap-0.5 font-bold tabular-nums">
      {n.toLocaleString()}
      {unit === "BGL" ? <span className="text-yellow-400 font-black" style={{ fontSize: size }}>BGL</span>
       : unit === "WL"  ? <span className="text-blue-400 font-bold"    style={{ fontSize: size }}>WL</span>
       : <GemIcon size={size} />}
    </span>
  );
}

// ─── Audio ─────────────────────────────────────────────────────────────────────

function createAudioCtx(): AudioContext | null {
  try { return new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
}

function playTick(ctx: AudioContext, muted: boolean) {
  if (muted) return;
  const t = ctx.currentTime;
  const master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
  const sr = ctx.sampleRate;
  const snapLen = Math.floor(sr * 0.008);
  const snapBuf = ctx.createBuffer(1, snapLen, sr);
  const sd = snapBuf.getChannelData(0);
  for (let i = 0; i < snapLen; i++) sd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / snapLen, 3);
  const snap = ctx.createBufferSource(); snap.buffer = snapBuf;
  const sf = ctx.createBiquadFilter(); sf.type = "bandpass"; sf.frequency.value = 3200; sf.Q.value = 0.8;
  const sg = ctx.createGain(); sg.gain.setValueAtTime(0.25, t); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.008);
  snap.connect(sf); sf.connect(sg); sg.connect(master); snap.start(t);
  const fund = ctx.createOscillator(); fund.type = "sine";
  fund.frequency.setValueAtTime(260, t); fund.frequency.exponentialRampToValueAtTime(120, t + 0.045);
  const fg = ctx.createGain(); fg.gain.setValueAtTime(0, t); fg.gain.linearRampToValueAtTime(0.5, t + 0.002); fg.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  fund.connect(fg); fg.connect(master); fund.start(t); fund.stop(t + 0.08);
  const harm = ctx.createOscillator(); harm.type = "sine";
  harm.frequency.setValueAtTime(520, t); harm.frequency.exponentialRampToValueAtTime(240, t + 0.03);
  const hg = ctx.createGain(); hg.gain.setValueAtTime(0, t); hg.gain.linearRampToValueAtTime(0.18, t + 0.002); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  harm.connect(hg); hg.connect(master); harm.start(t); harm.stop(t + 0.05);
}

function playStopClick(ctx: AudioContext, muted: boolean) {
  if (muted) return;
  const t = ctx.currentTime; const sr = ctx.sampleRate;
  const master = ctx.createGain(); master.gain.value = 0.75; master.connect(ctx.destination);
  const tLen = Math.floor(sr * 0.010); const tBuf = ctx.createBuffer(1, tLen, sr);
  const td = tBuf.getChannelData(0);
  for (let i = 0; i < tLen; i++) td[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / tLen, 2);
  const tr = ctx.createBufferSource(); tr.buffer = tBuf;
  const tf = ctx.createBiquadFilter(); tf.type = "bandpass"; tf.frequency.value = 3800; tf.Q.value = 0.8;
  const tg = ctx.createGain(); tg.gain.setValueAtTime(0.45, t); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.010);
  tr.connect(tf); tf.connect(tg); tg.connect(master); tr.start(t);
  const thud = ctx.createOscillator(); thud.type = "sine";
  thud.frequency.setValueAtTime(300, t); thud.frequency.exponentialRampToValueAtTime(75, t + 0.10);
  const thg = ctx.createGain(); thg.gain.setValueAtTime(0, t); thg.gain.linearRampToValueAtTime(0.9, t + 0.003); thg.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  thud.connect(thg); thg.connect(master); thud.start(t); thud.stop(t + 0.18);
  const sh = ctx.createOscillator(); sh.type = "sine"; sh.frequency.value = 640;
  const shg = ctx.createGain(); shg.gain.setValueAtTime(0, t); shg.gain.linearRampToValueAtTime(0.14, t + 0.003); shg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  sh.connect(shg); shg.connect(master); sh.start(t); sh.stop(t + 0.11);
}

function playBonusSwoosh(ctx: AudioContext, muted: boolean) {
  if (muted) return;
  const t = ctx.currentTime; const dur = 1.5; const sr = ctx.sampleRate;
  const bufLen = Math.floor(sr * dur);
  const buf = ctx.createBuffer(1, bufLen, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
  const noiseSrc = ctx.createBufferSource(); noiseSrc.buffer = buf;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 3;
  lp.frequency.setValueAtTime(80, t); lp.frequency.exponentialRampToValueAtTime(7000, t + 0.65); lp.frequency.exponentialRampToValueAtTime(1800, t + dur);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, t); noiseGain.gain.linearRampToValueAtTime(0.08, t + 0.12); noiseGain.gain.linearRampToValueAtTime(0.10, t + 0.55); noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  noiseSrc.connect(lp); lp.connect(noiseGain); noiseGain.connect(ctx.destination); noiseSrc.start(t); noiseSrc.stop(t + dur);
  const sweep = ctx.createOscillator(); sweep.type = "sawtooth";
  sweep.frequency.setValueAtTime(60, t); sweep.frequency.exponentialRampToValueAtTime(900, t + 0.7); sweep.frequency.exponentialRampToValueAtTime(350, t + dur);
  const sweepFilter = ctx.createBiquadFilter(); sweepFilter.type = "lowpass";
  sweepFilter.frequency.setValueAtTime(150, t); sweepFilter.frequency.exponentialRampToValueAtTime(3500, t + 0.7); sweepFilter.frequency.exponentialRampToValueAtTime(800, t + dur);
  const sweepGain = ctx.createGain();
  sweepGain.gain.setValueAtTime(0, t); sweepGain.gain.linearRampToValueAtTime(0.05, t + 0.06); sweepGain.gain.linearRampToValueAtTime(0.07, t + 0.5); sweepGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  sweep.connect(sweepFilter); sweepFilter.connect(sweepGain); sweepGain.connect(ctx.destination); sweep.start(t); sweep.stop(t + dur);
  [392, 523, 659, 784, 1047].forEach((freq, i) => {
    const sp = ctx.createOscillator(); sp.type = "sine"; sp.frequency.value = freq;
    const spGain = ctx.createGain(); const onset = 0.55 + i * 0.07;
    spGain.gain.setValueAtTime(0, t + onset); spGain.gain.linearRampToValueAtTime(0.03, t + onset + 0.04); spGain.gain.exponentialRampToValueAtTime(0.0001, t + onset + 0.45);
    sp.connect(spGain); spGain.connect(ctx.destination); sp.start(t + onset); sp.stop(t + onset + 0.5);
  });
}

function playWinSound(ctx: AudioContext, muted: boolean) {
  if (muted) return;
  const t = ctx.currentTime; const sr = ctx.sampleRate;
  const cLen = Math.floor(sr * 0.018); const cBuf = ctx.createBuffer(1, cLen, sr);
  const cd = cBuf.getChannelData(0);
  for (let i = 0; i < cLen; i++) cd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / cLen, 1.5);
  const cs = ctx.createBufferSource(); cs.buffer = cBuf;
  const cbp = ctx.createBiquadFilter(); cbp.type = "bandpass"; cbp.frequency.value = 5000; cbp.Q.value = 0.6;
  const cg = ctx.createGain(); cg.gain.setValueAtTime(0.35, t); cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
  cs.connect(cbp); cbp.connect(cg); cg.connect(ctx.destination); cs.start(t);
  [311, 415, 523, 622, 784].forEach((freq, i) => {
    const sp = ctx.createOscillator(); sp.type = "sine"; sp.frequency.value = freq;
    const sg = ctx.createGain(); const onset = 0.05 + i * 0.07;
    sg.gain.setValueAtTime(0, t + onset); sg.gain.linearRampToValueAtTime(0.06, t + onset + 0.02); sg.gain.exponentialRampToValueAtTime(0.0001, t + onset + 0.5);
    sp.connect(sg); sg.connect(ctx.destination); sp.start(t + onset); sp.stop(t + onset + 0.55);
  });
}

// ─── Reel Item ─────────────────────────────────────────────────────────────────

function ReelItem({ item }: { item: BattleItem }) {
  const isOrb = item.id === "__orb__";
  const hex = isOrb ? "#fbbf24" : (RARITY_COLOR[item.rarity] ?? "#888");
  return (
    <div className="flex-shrink-0 flex flex-col items-center justify-center" style={{ width: ITEM_W, height: REEL_H }}>
      <div className="flex-1 w-full flex items-center justify-center" style={{ filter: `drop-shadow(0 0 8px ${hex}99)` }}>
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.name} style={{ width: isOrb ? 52 : 40, height: isOrb ? 52 : 40, objectFit: "contain", imageRendering: isOrb ? "auto" : "pixelated" }} />
          : <div style={{ width: 32, height: 32, backgroundColor: hex, borderRadius: 4 }} />}
      </div>
      <div style={{ height: 3, width: "100%", backgroundColor: hex, opacity: 0.85, flexShrink: 0 }} />
    </div>
  );
}

// ─── Horizontal Reel — self-contained, mirrors Cases.tsx opening sequence ──────

interface HorizReelProps {
  caseItems: CaseItem[];
  result: BattleItem;
  resultChance?: number;
  audioCtx: AudioContext | null;
  mutedRef: React.MutableRefObject<boolean>;
  isWinner: boolean;
  showWinner: boolean;
  onMainDone?: () => void;   // fired when main spin ends — BattleScreen uses to show item label
  onFullyDone?: () => void;  // fired when all animation done (incl. bonus) — BattleScreen uses to advance round
}

function HorizReel({ caseItems, result, resultChance, audioCtx, mutedRef, isWinner, showWinner, onMainDone, onFullyDone }: HorizReelProps) {
  const resultIsRare = resultChance !== undefined && resultChance <= ORB_THRESHOLD;

  // Main strip — built once on mount
  const mainStrip = useMemo(() => buildStrip(caseItems, result, resultIsRare), []);

  // Current strip shown (switches to bonus strip during bonus phase)
  const [currentStrip, setCurrentStrip] = useState<BattleItem[]>(mainStrip);
  const [reelPhase, setReelPhase] = useState<"main" | "orb" | "bonus" | "done">("main");
  const [showOrbOverlay, setShowOrbOverlay] = useState(false);
  const [lineColor, setLineColor] = useState("#a78bfa"); // purple → gold during bonus

  const stripRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const allRafsRef = useRef<number[]>([]); // all rAF ids for cleanup
  const lastTickIdx = useRef(-1);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Helper: add a timer and register for cleanup
  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  // Tick monitor — same logic as Cases.tsx startTickMonitor(ref, false)
  const startTick = (el: HTMLDivElement) => {
    cancelAnimationFrame(rafRef.current);
    lastTickIdx.current = -1;
    const loop = () => {
      const mat = window.getComputedStyle(el).transform;
      if (mat && mat !== "none") {
        const vals = mat.match(/matrix.*\((.+)\)/)?.[1].split(",");
        const rawX = vals ? Math.abs(parseFloat(vals[4] ?? "0")) : 0;
        const idx = Math.floor(rawX / ITEM_W);
        if (idx !== lastTickIdx.current && idx > 0 && audioCtx) {
          lastTickIdx.current = idx;
          playTick(audioCtx, mutedRef.current);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const stopTick = () => cancelAnimationFrame(rafRef.current);

  // Full animation sequence — runs once on mount
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;

    const MAIN_DUR = 2200;
    const RANDOM_OFFSET = Math.floor(Math.random() * 40) - 20;
    const mainTarget = WINNING_IDX * ITEM_W + RANDOM_OFFSET;

    // 1. Pre-position (no transition) — same as Cases.tsx setTimeout 50ms → pre-position
    el.style.transition = "none";
    el.style.transform = `translateX(-${START_OFFSET}px)`;

    // 2. Double rAF then animate — exact same pattern as Cases.tsx
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        allRafsRef.current.push(raf2);
        el.style.transition = `transform ${MAIN_DUR}ms cubic-bezier(0.08, 0.82, 0.15, 1)`;
        el.style.transform = `translateX(-${mainTarget}px)`;
        startTick(el);

        // 3. After main spin: snap to exact center (Cases.tsx: duration + 60ms)
        later(() => {
          stopTick();
          el.style.transition = "transform 300ms cubic-bezier(0.25, 0, 0, 1)";
          el.style.transform = `translateX(-${WINNING_IDX * ITEM_W}px)`;
          if (audioCtx) playStopClick(audioCtx, mutedRef.current);
          onMainDone?.();

          if (!resultIsRare) {
            // No bonus — done immediately
            setReelPhase("done");
            onFullyDone?.();
            return;
          }

          // 4. Rare item — show orb overlay (Cases.tsx: setModalMode("bonus_orb"))
          later(() => {
            setShowOrbOverlay(true);
            setReelPhase("orb");
            if (audioCtx) playBonusSwoosh(audioCtx, mutedRef.current);

            // Build bonus strip with rare-only pool
            const rarePool = caseItems.filter(ci => ci.chance <= ORB_THRESHOLD);
            const bonusPool = rarePool.length > 0 ? rarePool : caseItems;
            const bonusStrip: BattleItem[] = Array.from({ length: ITEM_COUNT }, () =>
              bonusPool[Math.floor(Math.random() * bonusPool.length)]
            );
            bonusStrip[WINNING_IDX] = result; // Real item at winning position

            // 5. After 1200ms orb show: start bonus spin (Cases.tsx switches strip + animates)
            later(() => {
              setShowOrbOverlay(false);
              setCurrentStrip(bonusStrip); // Swap to bonus strip
              setLineColor("#fbbf24"); // Gold triangles
              setReelPhase("bonus");

              // Pre-position bonus strip
              el.style.transition = "none";
              el.style.transform = `translateX(-${START_OFFSET}px)`;

              const BONUS_DUR = 1800;
              const bonusOffset = Math.floor(Math.random() * 40) - 20;
              const bonusTarget = WINNING_IDX * ITEM_W + bonusOffset;

              const braf1 = requestAnimationFrame(() => {
                allRafsRef.current.push(braf1);
                const braf2 = requestAnimationFrame(() => {
                  allRafsRef.current.push(braf2);
                  el.style.transition = `transform ${BONUS_DUR}ms cubic-bezier(0.08, 0.82, 0.15, 1)`;
                  el.style.transform = `translateX(-${bonusTarget}px)`;
                  startTick(el);

                  // 6. After bonus spin: snap to real item
                  later(() => {
                    stopTick();
                    el.style.transition = "transform 300ms cubic-bezier(0.25, 0, 0, 1)";
                    el.style.transform = `translateX(-${WINNING_IDX * ITEM_W}px)`;
                    if (audioCtx) playStopClick(audioCtx, mutedRef.current);
                    setLineColor("#a78bfa"); // Back to purple
                    setReelPhase("done");
                    onFullyDone?.();
                  }, BONUS_DUR + 60);
                });
              });
            }, 1200); // Orb shows for 1200ms
          }, 360); // 360ms after main snap before orb appears
        }, MAIN_DUR + 60);
      });
    });

    allRafsRef.current.push(raf1);

    return () => {
      allRafsRef.current.forEach(cancelAnimationFrame);
      stopTick();
      timersRef.current.forEach(clearTimeout);
    };
  }, []); // Run once on mount

  const winnerGlow = showWinner && isWinner ? `drop-shadow(0 0 12px ${lineColor}cc)` : undefined;

  return (
    <div style={{ position: "relative", height: REEL_H, overflow: "hidden", background: REEL_BG, filter: winnerGlow }}>
      {/* Triangles — gold during bonus, purple otherwise */}
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: `14px solid ${lineColor}`, zIndex: 100, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderBottom: `14px solid ${lineColor}`, zIndex: 100, pointerEvents: "none" }} />
      {/* Gradient fades */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, background: `linear-gradient(to right, ${REEL_BG}, transparent)`, zIndex: 1, pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, background: `linear-gradient(to left, ${REEL_BG}, transparent)`, zIndex: 1, pointerEvents: "none" }} />
      {/* Chevrons */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 44, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
        <ChevronLeft style={{ color: "rgba(255,255,255,0.22)", width: 22, height: 22 }} />
      </div>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 44, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
        <ChevronRight style={{ color: "rgba(255,255,255,0.22)", width: 22, height: 22 }} />
      </div>
      {/* Strip */}
      <div ref={stripRef} style={{ display: "flex", gap: 0, height: "100%", paddingLeft: "calc(50% - 48px)" }}>
        {currentStrip.map((item, i) => <ReelItem key={i} item={item} />)}
      </div>
      {/* Orb overlay — shown during bonus_orb phase (matches Cases.tsx exactly) */}
      <AnimatePresence>
        {showOrbOverlay && (
          <motion.div
            key="orb-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(1px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}
          >
            <motion.img
              key="big-orb"
              src={bigOrbSrc}
              alt="Bonus Orb"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
              style={{ width: 80, height: 80, objectFit: "contain", imageRendering: "pixelated", filter: "drop-shadow(0 0 20px rgba(251,191,36,0.9)) drop-shadow(0 0 40px rgba(251,191,36,0.5))" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Bonus spin label */}
      {reelPhase === "bonus" && (
        <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", zIndex: 15, pointerEvents: "none" }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: "#fbbf24", letterSpacing: "0.1em", textTransform: "uppercase", textShadow: "0 0 8px rgba(251,191,36,0.7)" }}>BONUS!</span>
        </div>
      )}
    </div>
  );
}

// ─── Player Column ─────────────────────────────────────────────────────────────

interface PlayerColProps {
  player: BattlePlayer;
  caseItems: CaseItem[];
  currentRoundResult: BattleItem | null;
  currentRoundResultChance?: number;
  revealedItems: { item: BattleItem; chance?: number }[];
  mainSpinDone: boolean;
  isWinner: boolean;
  isLoser: boolean;
  showWinner: boolean;
  round: number;
  audioCtx: AudioContext | null;
  mutedRef: React.MutableRefObject<boolean>;
  onMainDone?: () => void;
  onFullyDone?: () => void;
}

function PlayerColumn({ player, caseItems, currentRoundResult, currentRoundResultChance, revealedItems, mainSpinDone, isWinner, isLoser, showWinner, round, audioCtx, mutedRef, onMainDone, onFullyDone }: PlayerColProps) {
  const tc = TEAM_COLORS[player.teamIndex % TEAM_COLORS.length] ?? TEAM_COLORS[0];
  const rc = currentRoundResult ? (RARITY_COLOR[currentRoundResult.rarity] ?? "#888") : undefined;

  return (
    <div className={`flex flex-col min-w-0 transition-all duration-500 ${showWinner && isLoser ? "opacity-30" : ""}`}>
      {/* Player header */}
      <div className={`flex items-center justify-between gap-1 px-2 py-1.5 border-b border-border/10 flex-shrink-0 ${showWinner && isWinner ? tc.bg : ""}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`w-5 h-5 rounded-full border-2 ${tc.border} ${tc.bg} flex-shrink-0 flex items-center justify-center font-black text-[10px] ${tc.text}`}>
            {player.username.charAt(0).toUpperCase()}
          </div>
          <span className={`text-[11px] font-bold truncate ${tc.text}`}>{player.username}</span>
          {showWinner && isWinner && <Crown className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
          {player.isBot && <Bot className="w-2.5 h-2.5 text-muted-foreground/40 flex-shrink-0" />}
        </div>
        <span className="text-[10px] flex-shrink-0 text-muted-foreground"><ValDisplay value={player.totalValue} size={9} /></span>
      </div>

      {/* Reel */}
      <div className="flex-shrink-0">
        {currentRoundResult ? (
          <HorizReel
            key={round}
            caseItems={caseItems}
            result={currentRoundResult}
            resultChance={currentRoundResultChance}
            audioCtx={audioCtx}
            mutedRef={mutedRef}
            isWinner={isWinner}
            showWinner={showWinner}
            onMainDone={onMainDone}
            onFullyDone={onFullyDone}
          />
        ) : (
          // Placeholder before any round starts
          <div style={{ position: "relative", height: REEL_H, background: REEL_BG, overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: "14px solid #a78bfa40", zIndex: 100 }} />
            <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderBottom: "14px solid #a78bfa40", zIndex: 100 }} />
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 80, background: `linear-gradient(to right, ${REEL_BG}, transparent)`, zIndex: 1 }} />
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: `linear-gradient(to left, ${REEL_BG}, transparent)`, zIndex: 1 }} />
            {caseItems.length > 0 ? (
              <div style={{ display: "flex", height: "100%", alignItems: "center", paddingLeft: "calc(50% - 48px)" }}>
                {[...caseItems, ...caseItems, ...caseItems].slice(0, 11).map((item, i) => <ReelItem key={i} item={item} />)}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
                <Package className="w-8 h-8" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Item label — shows after main spin done */}
      <div className="flex-shrink-0 h-9 flex flex-col items-center justify-center border-b border-border/10 bg-background/30">
        {mainSpinDone && currentRoundResult ? (
          <>
            <div className="text-[10px] font-bold truncate px-2 text-center leading-tight" style={{ color: rc }}>{currentRoundResult.name}</div>
            <div className="text-[10px] text-muted-foreground/70"><ValDisplay value={currentRoundResult.value} size={9} /></div>
          </>
        ) : (
          <div className="text-[10px] text-muted-foreground/20">—</div>
        )}
      </div>

      {/* Item history */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {revealedItems.length === 0 ? (
          <div className="text-[10px] text-muted-foreground/20 text-center py-3">—</div>
        ) : (
          [...revealedItems].reverse().map(({ item, chance }, i) => {
            const c = RARITY_COLOR[item.rarity] ?? "#888";
            return (
              <motion.div key={revealedItems.length - 1 - i}
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 border-b border-border/10 px-2 py-1 hover:bg-white/[0.03]"
              >
                <div className="w-7 h-7 flex-shrink-0 rounded-md flex items-center justify-center" style={{ background: `${c}22`, borderLeft: `3px solid ${c}`, borderRight: `3px solid ${c}` }}>
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} style={{ width: 18, height: 18, objectFit: "contain", imageRendering: "pixelated" }} />
                    : <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: c }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-semibold truncate leading-tight" style={{ color: c }}>{item.name}</div>
                  <div className="text-[9px] text-muted-foreground/70"><ValDisplay value={item.value} size={8} /></div>
                </div>
                {chance != null && <div className="text-[8px] text-muted-foreground/40 flex-shrink-0">{chance.toFixed(2)}%</div>}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Lobby Slot ────────────────────────────────────────────────────────────────

function LobbySlot({ player, teamIndex, isCreator, addingBot, onAddBot }: {
  player?: BattlePlayer; teamIndex: number;
  isCreator: boolean; addingBot: boolean; onAddBot: () => void;
}) {
  const tc = TEAM_COLORS[teamIndex % TEAM_COLORS.length] ?? TEAM_COLORS[0];
  return (
    <div className={`flex flex-col items-center gap-3 flex-1 min-w-0 rounded-xl border-2 p-4 transition-all ${
      !player ? "border-dashed border-border/30 bg-background/20" : `${tc.border} ${tc.bg}`
    }`}>
      {!player ? (
        <>
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-border/30 flex items-center justify-center text-muted-foreground/30 text-2xl font-bold">?</div>
          <div className="text-sm text-muted-foreground/50">Waiting...</div>
          {isCreator && (
            <Button size="sm" variant="outline" onClick={onAddBot} disabled={addingBot} className="border-dashed border-border/50 text-muted-foreground gap-1.5 text-xs">
              {addingBot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
              Add Bot
            </Button>
          )}
        </>
      ) : (
        <>
          <div className={`w-14 h-14 rounded-full border-2 ${tc.border} ${tc.bg} flex items-center justify-center font-black text-2xl ${tc.text}`}>
            {player.username.charAt(0).toUpperCase()}
          </div>
          <div className="text-sm font-semibold truncate max-w-full text-center">{player.username}</div>
          {player.isBot
            ? <Badge variant="outline" className={`text-[10px] ${tc.text} border-current gap-1`}><Bot className="w-2.5 h-2.5" />Bot</Badge>
            : <div className="flex items-center gap-1 text-xs text-green-400"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Ready</div>}
        </>
      )}
    </div>
  );
}

// ─── BattleScreen ──────────────────────────────────────────────────────────────

interface Props {
  battle: BattleResult;
  currentUserId?: number;
  isCreator?: boolean;
  onAddBot?: (id: string) => Promise<BattleResult | void>;
  onLeave?: (id: string) => Promise<void>;
  onCopyBattle?: (battle: BattleResult) => void;
  onModifyBattle?: (battle: BattleResult) => void;
  onClose: () => void;
}

export function BattleScreen({ battle: initialBattle, currentUserId, isCreator = false, onAddBot, onLeave, onCopyBattle, onModifyBattle, onClose }: Props) {
  const [liveBattle, setLiveBattle] = useState<BattleResult>(initialBattle);
  const [animBattle, setAnimBattle] = useState<BattleResult | null>(
    initialBattle.status === "completed" ? initialBattle : null
  );
  const [phase, setPhase] = useState<"waiting" | "countdown" | "playing" | "tiebreaker_pending" | "tiebreaker" | "done">(
    initialBattle.status === "completed" ? "countdown" : "waiting"
  );
  const [countdown, setCountdown] = useState(3);
  const [currentRound, setCurrentRound] = useState(0);
  const [mainSpinDone, setMainSpinDone] = useState(false); // shows item label after main spin
  const [revealedRounds, setRevealedRounds] = useState(0);
  const [showWinner, setShowWinner] = useState(false);
  const [addingBot, setAddingBot] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [muted, setMuted] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = createAudioCtx();
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
  }, []);

  const tick = useCallback((fn: () => void, ms: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fn, ms);
  }, []);

  // Polling for waiting battles
  useEffect(() => {
    if (phase !== "waiting") return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/battles/${liveBattle.id}`);
        if (res.ok) {
          const data: BattleResult = await res.json();
          setLiveBattle(data);
          if (data.status === "completed") {
            setAnimBattle(data); setPhase("countdown");
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      } catch { /* ignore */ }
    }, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [phase, liveBattle.id]);

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { setPhase("playing"); return; }
    tick(() => setCountdown((c) => c - 1), 900);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, countdown]);

  // Playing — detect when all rounds done; individual rounds driven by onFullyDone
  useEffect(() => {
    if (phase !== "playing" || !animBattle) return;
    const totalRounds = animBattle.rounds?.length ?? 0;
    if (currentRound >= totalRounds) {
      if (animBattle.isDraw) {
        tick(() => setPhase("tiebreaker_pending"), 800);
      } else {
        tick(() => {
          setShowWinner(true);
          setPhase("done");
          if (audioCtxRef.current) playWinSound(audioCtxRef.current, mutedRef.current);
        }, 1000);
      }
    }
    // rounds < total: reel mounts automatically and drives its own timing via callbacks
  }, [phase, currentRound, animBattle]);

  // Tiebreaker pending → ready (small delay for overlay animation)
  useEffect(() => {
    if (phase !== "tiebreaker_pending") return;
    const t = setTimeout(() => setPhase("tiebreaker"), 500);
    return () => clearTimeout(t);
  }, [phase]);

  // Tiebreaker active: handled by onFullyDone callback from col[0]
  // (no separate timer needed)

  // Callbacks from col[0]'s reel
  const handleMainDone = useCallback(() => {
    setMainSpinDone(true);
  }, []);

  const handleFullyDone = useCallback(() => {
    if (phase === "tiebreaker") {
      tick(() => {
        setShowWinner(true);
        setPhase("done");
        if (audioCtxRef.current) playWinSound(audioCtxRef.current, mutedRef.current);
      }, 300);
      return;
    }
    // Advance round
    setRevealedRounds(r => r + 1);
    tick(() => {
      setMainSpinDone(false);
      setCurrentRound(r => r + 1);
    }, 700);
  }, [phase, tick]);

  const handleAddBot = useCallback(async () => {
    if (!onAddBot || addingBot) return;
    initAudio();
    setAddingBot(true);
    try {
      const result = await onAddBot(liveBattle.id);
      if (result) {
        setLiveBattle(result as BattleResult);
        if ((result as BattleResult).status === "completed") {
          setAnimBattle(result as BattleResult); setPhase("countdown");
        }
      }
    } finally { setAddingBot(false); }
  }, [onAddBot, addingBot, liveBattle.id, initAudio]);

  const handleLeave = useCallback(async () => {
    if (!onLeave || leaving) return;
    setLeaving(true);
    try { await onLeave(liveBattle.id); onClose(); }
    finally { setLeaving(false); setLeaveConfirm(false); }
  }, [onLeave, leaving, liveBattle.id, onClose]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const battle = animBattle ?? liveBattle;
  const players = battle.players;
  const rounds = animBattle?.rounds ?? [];
  const totalRounds = rounds.length;
  const winnerTeamIndex = battle.winnerTeamIndex;
  const gameMode = liveBattle.gameMode || "1v1";
  const battleType = liveBattle.battleType ?? (liveBattle.isShared ? "shared" : "normal");
  const maxPlayers = liveBattle.maxPlayers;
  const numTeams = getNumTeams(gameMode);
  const playersPerTeam = getPlayersPerTeam(gameMode);
  const currentRoundData = (phase === "tiebreaker" || phase === "tiebreaker_pending")
    ? rounds[rounds.length - 1] ?? null
    : rounds[currentRound] ?? null;
  const caseForRound = phase === "tiebreaker" || phase === "tiebreaker_pending"
    ? (animBattle?.cases?.[rounds.length - 1] ?? animBattle?.cases?.[0])
    : (animBattle?.cases?.[currentRound] ?? animBattle?.cases?.[0]);
  const caseItemsForRound: CaseItem[] = (caseForRound?.items ?? []) as CaseItem[];
  const teamIndices = [...new Set(players.map((p) => p.teamIndex))].sort();
  const occupiedSlots = new Map<number, BattlePlayer>();
  for (const p of liveBattle.players) occupiedSlots.set(p.slotIndex ?? 0, p);
  const totalPrize = (liveBattle.cases ?? []).reduce((s, c) => s + (c.price ?? 0), 0) * maxPlayers;
  const isTeamBattle = numTeams === 2 && playersPerTeam > 1;

  const runningTeamTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    for (const ti of teamIndices) totals[ti] = 0;
    for (const round of rounds.slice(0, revealedRounds)) {
      for (const res of round.results) {
        const p = players.find(pl => String(pl.userId) === String(res.userId));
        if (p != null) totals[p.teamIndex] = (totals[p.teamIndex] ?? 0) + res.item.value;
      }
    }
    return totals;
  }, [revealedRounds, rounds, players, teamIndices]);

  // Render a single player column
  const renderPlayerCol = (player: BattlePlayer, colIdx: number) => {
    const isMasterCol = colIdx === 0;
    const isWinner = winnerTeamIndex !== undefined && player.teamIndex === winnerTeamIndex;
    const isLoser = winnerTeamIndex !== undefined && !isWinner;
    const roundResult = currentRoundData?.results.find(r => String(r.userId) === String(player.userId))?.item ?? null;
    const roundResultChance = roundResult
      ? (caseItemsForRound as any[]).find(ci => ci.id === roundResult.id || (ci.name === roundResult.name && ci.value === roundResult.value))?.chance
      : undefined;
    const revealedItems = rounds.slice(0, revealedRounds).map((r, ri) => {
      const item = r.results.find(res => String(res.userId) === String(player.userId))?.item;
      if (!item) return null;
      const catalogItem = animBattle?.cases?.[ri]?.items.find(ci => ci.id === item.id || (ci.name === item.name && ci.value === item.value));
      return { item, chance: (catalogItem as any)?.chance };
    }).filter(Boolean) as { item: BattleItem; chance?: number }[];

    return (
      <PlayerColumn
        key={player.userId}
        player={player}
        caseItems={caseItemsForRound}
        currentRoundResult={roundResult}
        currentRoundResultChance={roundResultChance}
        revealedItems={revealedItems}
        mainSpinDone={mainSpinDone}
        isWinner={isWinner}
        isLoser={isLoser}
        showWinner={showWinner}
        round={phase === "tiebreaker" ? currentRound + 1000 : currentRound}
        audioCtx={isMasterCol ? audioCtxRef.current : null}
        mutedRef={mutedRef}
        onMainDone={isMasterCol ? handleMainDone : undefined}
        onFullyDone={isMasterCol ? handleFullyDone : undefined}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" onClick={initAudio}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 h-11 border-b border-border/20 bg-card/40">
        <Button variant="ghost" size="sm" onClick={onClose}
          className="gap-1 text-muted-foreground hover:text-foreground text-xs font-bold px-2 h-8">
          <ArrowLeft className="w-3.5 h-3.5" />Back
        </Button>
        <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 scrollbar-none">
          {liveBattle.cases?.map((c, i) => {
            const active = (phase === "playing" || phase === "tiebreaker") && i === (phase === "tiebreaker" ? rounds.length - 1 : currentRound);
            return (
              <div key={c.id}
                className={`flex-shrink-0 flex items-center gap-1 rounded-md px-1.5 py-0.5 border text-[10px] font-semibold transition-all ${
                  active ? "border-primary bg-primary/15 text-foreground" : "border-border/30 text-muted-foreground/50"
                }`}>
                <Package className={`w-2.5 h-2.5 ${active ? "text-primary" : ""}`} />
                <span className="truncate max-w-[60px]">{c.name}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="w-3 h-3" /><span>0</span></div>
          <Badge variant="outline" className="text-[10px] font-bold h-5 px-1.5">{gameMode}</Badge>
          {battleType !== "normal" && (
            <Badge className={`text-[10px] font-bold h-5 px-1.5 border ${
              battleType === "shared" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
              : battleType === "top_pull" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
              : battleType === "crazy" ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
              : "bg-orange-500/20 text-orange-300 border-orange-500/40"
            }`}>
              {battleType === "shared" ? "SHARED" : battleType === "top_pull" ? "TOP" : battleType === "crazy" ? "🃏" : "TERM"}
            </Badge>
          )}
          <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-0.5">
            <ValDisplay value={totalPrize} size={10} />
          </div>
          <button onClick={(e) => { e.stopPropagation(); toggleMute(); initAudio(); }}
            className="w-7 h-7 rounded-md border border-border/30 bg-background/40 flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all">
            {muted ? <VolumeX className="w-3.5 h-3.5 text-muted-foreground" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Waiting Lobby ────────────────────────────────────────────────── */}
      {phase === "waiting" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-6">
          <div className="text-center">
            <div className="text-xl font-black mb-1">Waiting for players...</div>
            <div className="text-sm text-muted-foreground">
              {isCreator ? "Add bots to fill empty slots, or wait for others." : "Waiting for the host to start."}
            </div>
          </div>
          <div className="flex gap-3 w-full max-w-2xl">
            {Array.from({ length: numTeams }, (_, teamIdx) => {
              const ppTeam = maxPlayers / numTeams;
              return (
                <React.Fragment key={teamIdx}>
                  {teamIdx > 0 && <div className="flex items-center px-1"><div className="text-xl font-black text-muted-foreground/30">VS</div></div>}
                  <div className="flex gap-2 flex-1">
                    {Array.from({ length: ppTeam }, (_, pi) => {
                      const slotIdx = teamIdx * ppTeam + pi;
                      return (
                        <LobbySlot key={slotIdx} teamIndex={teamIdx}
                          player={occupiedSlots.get(slotIdx)} isCreator={isCreator}
                          addingBot={addingBot} onAddBot={handleAddBot} />
                      );
                    })}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          {onLeave && !leaveConfirm && (
            <button onClick={() => setLeaveConfirm(true)}
              className="text-xs text-muted-foreground/40 hover:text-red-400 transition-colors flex items-center gap-1.5 mt-2">
              <LogOut className="w-3.5 h-3.5" />Leave battle
            </button>
          )}
          {onLeave && leaveConfirm && (
            <div className="flex flex-col items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3">
              <div className="text-sm font-semibold text-red-400">
                {isCreator ? "Cancel and refund everyone?" : "Leave and get refunded?"}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setLeaveConfirm(false)} disabled={leaving}>Stay</Button>
                <Button size="sm" onClick={handleLeave} disabled={leaving} className="bg-red-600 hover:bg-red-700 text-white gap-1.5">
                  {leaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  {isCreator ? "Cancel" : "Leave"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Countdown overlay ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "countdown" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <AnimatePresence mode="wait">
              <motion.div key={countdown}
                initial={{ scale: 2.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.5 }}
                className="text-8xl font-black text-primary drop-shadow-[0_0_60px_rgba(139,92,246,0.9)]">
                {countdown === 0 ? "GO!" : countdown}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tiebreaker overlay ────────────────────────────────────────────── */}
      <AnimatePresence>
        {(phase === "tiebreaker" || phase === "tiebreaker_pending") && !showWinner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[5] flex flex-col items-center justify-center pointer-events-none">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="flex flex-col items-center gap-2 bg-background/70 backdrop-blur px-8 py-4 rounded-2xl border border-yellow-500/30">
              <div className="text-4xl">🤝</div>
              <div className="text-3xl font-black text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]">DRAW!</div>
              <div className="text-sm font-bold text-muted-foreground animate-pulse">Tiebreaker spin...</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Battle animation ──────────────────────────────────────────────── */}
      {(phase === "playing" || phase === "tiebreaker" || phase === "tiebreaker_pending" || phase === "done") && animBattle && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* Round progress dots */}
          {totalRounds > 0 && (
            <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2 border-b border-border/10">
              {rounds.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < revealedRounds ? "bg-primary" : i === currentRound && !mainSpinDone ? "bg-primary/50 animate-pulse" : "bg-border/30"
                }`} />
              ))}
              <span className="text-[10px] text-muted-foreground ml-1">
                Round <span className="text-foreground font-bold">{Math.min(currentRound + 1, totalRounds)}</span>/{totalRounds}
              </span>
            </div>
          )}

          {/* Team-grouped layout (2v2, 3v3) */}
          {isTeamBattle ? (
            <div className="flex-1 flex overflow-hidden min-h-0">
              {teamIndices.map((teamIdx, ti) => {
                const tc = TEAM_COLORS[teamIdx % TEAM_COLORS.length];
                const teamPlayers = players.filter(p => p.teamIndex === teamIdx).sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));
                const isWinningTeam = winnerTeamIndex !== undefined && teamIdx === winnerTeamIndex;
                const isLosingTeam = winnerTeamIndex !== undefined && !isWinningTeam;
                const teamTotal = runningTeamTotals[teamIdx] ?? 0;
                const baseColIdx = ti * playersPerTeam;
                return (
                  <React.Fragment key={teamIdx}>
                    {ti > 0 && (
                      <div className="flex-shrink-0 flex flex-col items-center justify-center bg-background/60 border-x border-border/20 z-10" style={{ width: 36 }}>
                        <span className="font-black text-muted-foreground/40 text-sm [writing-mode:vertical-lr]">VS</span>
                      </div>
                    )}
                    <div className={`flex-1 flex flex-col min-w-0 border-2 transition-all duration-500 ${
                      showWinner ? isWinningTeam ? `${tc.border} ${tc.bg}` : isLosingTeam ? "border-border/20 opacity-40" : "border-border/20" : "border-border/20"
                    }`}>
                      <div className={`flex-shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-border/10 ${tc.bg}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${tc.solid}`} />
                          <span className={`text-xs font-black ${tc.text}`}>Team {ti + 1}</span>
                          {showWinner && isWinningTeam && <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                        </div>
                        <div className={`text-xs font-bold ${showWinner && isWinningTeam ? tc.text : "text-muted-foreground"}`}>
                          <ValDisplay value={teamTotal} size={10} />
                        </div>
                      </div>
                      <div className="flex-1 flex overflow-hidden min-h-0 divide-x divide-border/10">
                        {teamPlayers.map((player, pi) => (
                          <div key={player.userId} className="flex-1 min-w-0 flex flex-col">
                            {renderPlayerCol(player, baseColIdx + pi)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            // Linear layout for FFA / 1v1
            <div className="flex-1 flex overflow-hidden min-h-0 divide-x divide-border/20">
              {(() => {
                let colIdx = 0;
                return teamIndices.map((teamIdx, ti) => {
                  const teamPlayers = players.filter(p => p.teamIndex === teamIdx);
                  return (
                    <React.Fragment key={teamIdx}>
                      {ti > 0 && (
                        <div className="flex-shrink-0 flex items-center justify-center bg-background/40 border-x border-border/20" style={{ width: 28 }}>
                          <span className="text-[10px] font-black text-muted-foreground/30 [writing-mode:vertical-lr]">VS</span>
                        </div>
                      )}
                      {teamPlayers.map((player) => {
                        const col = colIdx++;
                        return (
                          <div key={player.userId} className="flex-1 min-w-0 flex flex-col">
                            {renderPlayerCol(player, col)}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── Winner Banner ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showWinner && animBattle && (
          <motion.div
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="flex-shrink-0 border-t border-border bg-card/90 backdrop-blur px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              {battleType === "shared" ? (
                <>
                  <span className="text-lg">🤝</span>
                  <div>
                    <div className="font-bold text-sm text-cyan-300">Everyone shares the prize!</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      Each: <ValDisplay value={Math.floor(totalPrize / Math.max(animBattle.players.filter(p => !p.isBot).length, 1))} size={11} />
                    </div>
                  </div>
                </>
              ) : winnerTeamIndex !== undefined ? (
                <>
                  <span className="text-lg">🏆</span>
                  {(() => {
                    const wp = animBattle.players.filter(p => p.teamIndex === winnerTeamIndex);
                    const isMe = wp.some(p => String(p.userId) === String(currentUserId));
                    const tc = TEAM_COLORS[winnerTeamIndex % TEAM_COLORS.length] ?? TEAM_COLORS[0];
                    return (
                      <div>
                        <div className={`font-bold text-sm ${tc.text}`}>
                          {isMe ? "You win! 🎉" : `${wp.map(p => p.username).join(" & ")} wins!`}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          Prize: <ValDisplay value={totalPrize} size={11} />
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className="font-bold text-sm text-muted-foreground">Battle complete</div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {onCopyBattle && (
                <Button size="sm" variant="outline" onClick={() => onCopyBattle(animBattle)} className="text-xs">Replay</Button>
              )}
              <Button size="sm" onClick={onClose} className="text-xs bg-primary hover:bg-primary/90">Close</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
