import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { Link } from "wouter";

// ── Candy SVG symbols matching real Sweet Bonanza ─────────────
const SymbolSVG: React.FC<{ id: number; multVal?: number; glow?: boolean }> = ({ id, multVal, glow }) => {
  const filter = glow ? `drop-shadow(0 0 10px gold) drop-shadow(0 0 20px gold)` : undefined;
  const props = { width: "100%", height: "100%", viewBox: "0 0 100 100", xmlns: "http://www.w3.org/2000/svg", style: { filter, transition: "filter 0.2s" } };

  if (id === 0) return ( // Red heart candy
    <svg {...props}>
      <defs>
        <radialGradient id="rh" cx="42%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ff7070"/><stop offset="100%" stopColor="#c00020"/>
        </radialGradient>
      </defs>
      <path d="M50 82 L14 47 Q7 22 29 18 Q42 16 50 33 Q58 16 71 18 Q93 22 86 47 Z" fill="url(#rh)" stroke="#8b0000" strokeWidth="1.5"/>
      <ellipse cx="32" cy="31" rx="10" ry="6" fill="rgba(255,255,255,0.45)" transform="rotate(-35 32 31)"/>
      <ellipse cx="44" cy="26" rx="4" ry="2.5" fill="rgba(255,255,255,0.3)" transform="rotate(-35 44 26)"/>
    </svg>
  );
  if (id === 1) return ( // Blue oval candy
    <svg {...props}>
      <defs>
        <linearGradient id="bl" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5ab4f8"/><stop offset="100%" stopColor="#1040bb"/>
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="52" rx="44" ry="28" fill="url(#bl)" stroke="#0a2a80" strokeWidth="1.5" transform="rotate(-20 50 52)"/>
      <ellipse cx="34" cy="36" rx="13" ry="7" fill="rgba(255,255,255,0.42)" transform="rotate(-20 34 36)"/>
      <ellipse cx="42" cy="31" rx="5" ry="3" fill="rgba(255,255,255,0.28)" transform="rotate(-20 42 31)"/>
    </svg>
  );
  if (id === 2) return ( // Pink/magenta square candy
    <svg {...props}>
      <defs>
        <radialGradient id="pk" cx="38%" cy="30%" r="68%">
          <stop offset="0%" stopColor="#ff80f0"/><stop offset="100%" stopColor="#aa0099"/>
        </radialGradient>
      </defs>
      <rect x="10" y="10" width="80" height="80" rx="22" fill="url(#pk)" stroke="#770077" strokeWidth="1.5"/>
      <ellipse cx="36" cy="30" rx="17" ry="10" fill="rgba(255,255,255,0.42)"/>
      <ellipse cx="46" cy="24" rx="6" ry="3.5" fill="rgba(255,255,255,0.28)"/>
    </svg>
  );
  if (id === 3) return ( // Green pentagon candy
    <svg {...props}>
      <defs>
        <radialGradient id="gp" cx="38%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#80e840"/><stop offset="100%" stopColor="#227700"/>
        </radialGradient>
      </defs>
      <polygon points="50,8 90,36 74,82 26,82 10,36" fill="url(#gp)" stroke="#165500" strokeWidth="1.5"/>
      <ellipse cx="38" cy="30" rx="15" ry="9" fill="rgba(255,255,255,0.42)"/>
      <ellipse cx="48" cy="24" rx="5.5" ry="3" fill="rgba(255,255,255,0.28)"/>
    </svg>
  );
  if (id === 4) return ( // Plum
    <svg {...props}>
      <defs>
        <radialGradient id="pl" cx="38%" cy="28%" r="65%">
          <stop offset="0%" stopColor="#c060e0"/><stop offset="100%" stopColor="#5a0090"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="54" rx="36" ry="38" fill="url(#pl)" stroke="#3a005e" strokeWidth="1.5"/>
      <path d="M50 16 Q58 8 53 18" fill="none" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="37" cy="36" rx="11" ry="7" fill="rgba(255,255,255,0.38)" transform="rotate(-20 37 36)"/>
    </svg>
  );
  if (id === 5) return ( // Watermelon
    <svg {...props}>
      <defs>
        <radialGradient id="wm_out" cx="38%" cy="28%" r="65%">
          <stop offset="0%" stopColor="#88ee44"/><stop offset="100%" stopColor="#33aa00"/>
        </radialGradient>
        <radialGradient id="wm_in" cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ff6666"/><stop offset="100%" stopColor="#cc0000"/>
        </radialGradient>
      </defs>
      {/* green rind */}
      <ellipse cx="50" cy="52" rx="42" ry="36" fill="url(#wm_out)" stroke="#1a6600" strokeWidth="1.5"/>
      {/* red flesh */}
      <ellipse cx="50" cy="54" rx="34" ry="28" fill="url(#wm_in)"/>
      {/* seeds */}
      <ellipse cx="40" cy="54" rx="2.5" ry="3.5" fill="#1a0030" transform="rotate(-20 40 54)"/>
      <ellipse cx="52" cy="50" rx="2.5" ry="3.5" fill="#1a0030" transform="rotate(10 52 50)"/>
      <ellipse cx="62" cy="56" rx="2.5" ry="3.5" fill="#1a0030" transform="rotate(-15 62 56)"/>
      <ellipse cx="46" cy="64" rx="2.5" ry="3.5" fill="#1a0030" transform="rotate(5 46 64)"/>
      {/* shine */}
      <ellipse cx="36" cy="37" rx="13" ry="8" fill="rgba(255,255,255,0.42)" transform="rotate(-15 36 37)"/>
    </svg>
  );
  if (id === 6) return ( // Grapes
    <svg {...props}>
      <defs>
        <radialGradient id="gr1" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#9060d0"/><stop offset="100%" stopColor="#3a006e"/>
        </radialGradient>
      </defs>
      {[
        [35,28],[50,23],[65,28],
        [27,42],[42,38],[57,38],[72,42],
        [34,56],[50,52],[66,56],
        [42,70],[58,70],
        [50,84],
      ].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="13" fill="url(#gr1)" stroke="#280050" strokeWidth="1"/>
      ))}
      {/* shine on top grapes */}
      <ellipse cx="31" cy="37" rx="5" ry="3" fill="rgba(255,255,255,0.38)" transform="rotate(-20 31 37)"/>
      <ellipse cx="46" cy="31" rx="5" ry="3" fill="rgba(255,255,255,0.38)" transform="rotate(-20 46 31)"/>
      <ellipse cx="61" cy="37" rx="5" ry="3" fill="rgba(255,255,255,0.38)" transform="rotate(-20 61 37)"/>
    </svg>
  );
  if (id === 7) return ( // Lollipop (highest)
    <svg {...props}>
      <defs>
        <radialGradient id="lp" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#fff"/><stop offset="40%" stopColor="#ffaacc"/><stop offset="100%" stopColor="#cc0066"/>
        </radialGradient>
      </defs>
      {/* Stick */}
      <rect x="47" y="65" width="6" height="30" rx="3" fill="#f5c842" stroke="#c8970a" strokeWidth="1"/>
      {/* Circle */}
      <circle cx="50" cy="42" r="34" fill="url(#lp)" stroke="#aa0044" strokeWidth="2"/>
      {/* Spiral segments */}
      <path d="M50,18 A24,24 0 0,1 74,42 A18,18 0 0,1 56,60 A12,12 0 0,1 38,48 A8,8 0 0,1 46,40 A4,4 0 0,1 54,44" fill="none" stroke="#ff0066" strokeWidth="5" strokeLinecap="round"/>
      {/* Shine */}
      <ellipse cx="36" cy="30" rx="10" ry="6" fill="rgba(255,255,255,0.5)" transform="rotate(-30 36 30)"/>
    </svg>
  );
  if (id === 8) return ( // Scatter star
    <svg {...props}>
      <defs>
        <radialGradient id="sc" cx="38%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fff7a0"/><stop offset="60%" stopColor="#ffd700"/><stop offset="100%" stopColor="#e65000"/>
        </radialGradient>
      </defs>
      <polygon points="50,8 60,36 90,36 67,54 76,82 50,64 24,82 33,54 10,36 40,36" fill="url(#sc)" stroke="#c04000" strokeWidth="1.5"/>
      <ellipse cx="38" cy="28" rx="12" ry="7" fill="rgba(255,255,255,0.45)" transform="rotate(-20 38 28)"/>
      <text x="50" y="56" textAnchor="middle" fontSize="12" fontWeight="900" fill="#c04000" fontFamily="Arial">SCATTER</text>
    </svg>
  );
  if (id === 9) return ( // Multiplier bomb
    <svg {...props}>
      <defs>
        <radialGradient id="mb" cx="38%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffe060"/><stop offset="100%" stopColor="#e65000"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="56" r="32" fill="url(#mb)" stroke="#b03000" strokeWidth="2"/>
      <path d="M50,24 Q54,12 62,8" stroke="#888" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <circle cx="62" cy="7" r="4" fill="#ffdd00"/>
      <ellipse cx="38" cy="44" rx="10" ry="6" fill="rgba(255,255,255,0.4)" transform="rotate(-20 38 44)"/>
      <text x="50" y="64" textAnchor="middle" fontSize="18" fontWeight="900" fill="#7a1500" fontFamily="Arial Black,Arial">
        {multVal !== undefined ? `×${multVal}` : "×?"}
      </text>
    </svg>
  );
  return null;
};

// ── Audio engine ───────────────────────────────────────────────
let bgMusicCtx: AudioContext | null = null;
let bgMusicNodes: AudioNode[] = [];

function startBgMusic() {
  try {
    if (bgMusicCtx) return;
    bgMusicCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = bgMusicCtx;
    const notes = [523,659,784,659,523,392,523,784,1047,784,659,523]; // C5 E5 G5 pattern
    let t = ctx.currentTime;
    const schedule = () => {
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, t + i * 0.28);
        g.gain.linearRampToValueAtTime(0.04, t + i * 0.28 + 0.06);
        g.gain.linearRampToValueAtTime(0, t + i * 0.28 + 0.24);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t + i * 0.28); osc.stop(t + i * 0.28 + 0.25);
        bgMusicNodes.push(osc);
      });
      t += notes.length * 0.28;
    };
    schedule();
    const iv = setInterval(schedule, notes.length * 280);
    (bgMusicCtx as any)._iv = iv;
  } catch { /* ignore */ }
}

function stopBgMusic() {
  if (bgMusicCtx) {
    clearInterval((bgMusicCtx as any)._iv);
    bgMusicCtx.close().catch(() => {});
    bgMusicCtx = null;
    bgMusicNodes = [];
  }
}

function playSpinSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Whoosh + rattle
    const noise = ctx.createOscillator();
    const g = ctx.createGain();
    noise.type = "sawtooth";
    noise.frequency.setValueAtTime(200, ctx.currentTime);
    noise.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    noise.connect(g); g.connect(ctx.destination);
    noise.start(); noise.stop(ctx.currentTime + 0.35);
  } catch {}
}

function playWinSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [523,659,784,1047].forEach((f, i) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.1;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.3);
    });
  } catch {}
}

function playBigWinSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const melody = [523,659,784,1047,1319,1047,784,1047,1319,1568];
    melody.forEach((f, i) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = i % 2 === 0 ? "sine" : "triangle"; osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.2);
    });
  } catch {}
}

function playScatterSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [880, 1100, 1320, 1760].forEach((f, i) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.15;
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.5);
    });
  } catch {}
}

// ── Types ──────────────────────────────────────────────────────
const BET_OPTIONS = [0.2, 0.4, 0.8, 1, 2, 4, 8, 10, 20, 50];
const EMPTY_GRID = (): number[][] =>
  Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => Math.floor(Math.random() * 8)));
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

interface CascadeStep {
  grid: number[][];
  winPos: [number, number][];
  multPos: { pos: [number, number]; val: number }[];
  cascadeWin: number;
  appliedMult: number;
}
interface SpinResult {
  baseGrid: number[][];
  baseSteps: CascadeStep[];
  baseFinalGrid: number[][];
  scatterCount: number;
  freeSpinsCount: number;
  fsResults: { grid: number[][]; steps: CascadeStep[]; finalGrid: number[][]; spinWin: number; accMult: number[] }[];
  totalWin: number;
  newBalance: number;
}

// ── Cell component ─────────────────────────────────────────────
const Cell: React.FC<{
  sym: number; multVal?: number;
  highlighted: boolean; removing: boolean; spinning: boolean;
}> = ({ sym, multVal, highlighted, removing, spinning }) => {
  if (sym < 0) return <div style={{ aspectRatio: "1" }} />;
  return (
    <div style={{
      aspectRatio: "1",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
      transform: highlighted ? "scale(1.12)" : removing ? "scale(0.4)" : spinning ? "scale(0.88)" : "scale(1)",
      opacity: removing ? 0 : spinning ? 0.5 : 1,
      transition: "all 0.28s cubic-bezier(0.34,1.56,0.64,1)",
      filter: highlighted ? "drop-shadow(0 0 12px gold) drop-shadow(0 0 24px #ffd700)" : "none",
      borderRadius: 8,
      background: highlighted ? "rgba(255,220,0,0.18)" : "transparent",
      padding: "2px",
    }}>
      <SymbolSVG id={sym} multVal={multVal} glow={highlighted} />
    </div>
  );
};

// ── Main game component ────────────────────────────────────────
export default function SweetBonanzaGame() {
  const { user, updateUser } = useAuth();
  const { formatBalance } = useCurrency();

  const [grid, setGrid] = useState<number[][]>(EMPTY_GRID);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [multOverlay, setMultOverlay] = useState<Map<string, number>>(new Map());
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [spinning, setSpinning] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [betIdx, setBetIdx] = useState(3);
  const betAmount = BET_OPTIONS[betIdx];
  const [winAmount, setWinAmount] = useState(0);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [totalFreeSpins, setTotalFreeSpins] = useState(0);
  const [accMults, setAccMults] = useState<number[]>([]);
  const [showFSIntro, setShowFSIntro] = useState(false);
  const [phase, setPhase] = useState<"idle" | "animating" | "done">("idle");
  const [error, setError] = useState("");
  const [musicOn, setMusicOn] = useState(false);
  const abortRef = useRef(false);

  const key = (r: number, c: number) => `${r},${c}`;
  const isFS = freeSpinsLeft > 0;

  useEffect(() => { return () => stopBgMusic(); }, []);

  function toggleMusic() {
    if (musicOn) { stopBgMusic(); setMusicOn(false); }
    else { startBgMusic(); setMusicOn(true); }
  }

  function changeBet(dir: 1 | -1) {
    if (animating) return;
    setBetIdx(i => Math.max(0, Math.min(BET_OPTIONS.length - 1, i + dir)));
  }

  async function playAnimation(result: SpinResult) {
    abortRef.current = false;
    setPhase("animating"); setWinAmount(0);
    setHighlighted(new Set()); setRemoving(new Set()); setMultOverlay(new Map());
    setFreeSpinsLeft(0); setAccMults([]);

    playSpinSound();
    setSpinning(true); await sleep(380);
    setSpinning(false); setGrid(result.baseGrid); await sleep(260);

    let runningWin = 0;
    for (let i = 0; i < result.baseSteps.length; i++) {
      if (abortRef.current) break;
      const step = result.baseSteps[i];
      const nextGrid = i + 1 < result.baseSteps.length ? result.baseSteps[i + 1].grid : result.baseFinalGrid;
      const winSet = new Set(step.winPos.map(([r, c]) => key(r, c)));
      const multMap = new Map(step.multPos.map(m => [key(m.pos[0], m.pos[1]), m.val]));
      setHighlighted(winSet); setMultOverlay(multMap);
      runningWin = parseFloat((runningWin + step.cascadeWin).toFixed(4));
      setWinAmount(runningWin);
      playWinSound();
      await sleep(800);
      const removeSet = new Set([...winSet, ...step.multPos.map(m => key(m.pos[0], m.pos[1]))]);
      setRemoving(removeSet); setHighlighted(new Set());
      await sleep(300); setRemoving(new Set()); setMultOverlay(new Map()); setGrid(nextGrid); await sleep(320);
    }

    if (result.freeSpinsCount > 0) {
      playScatterSound();
      setShowFSIntro(true); setTotalFreeSpins(result.freeSpinsCount);
      await sleep(2600); setShowFSIntro(false); await sleep(200);
      for (let fi = 0; fi < result.fsResults.length; fi++) {
        if (abortRef.current) break;
        const fs = result.fsResults[fi];
        setFreeSpinsLeft(result.freeSpinsCount - fi);
        playSpinSound();
        setSpinning(true); await sleep(380);
        setSpinning(false); setGrid(fs.grid); await sleep(260);
        let fsAcc: number[] = [];
        for (let i = 0; i < fs.steps.length; i++) {
          if (abortRef.current) break;
          const step = fs.steps[i];
          const nextGrid = i + 1 < fs.steps.length ? fs.steps[i + 1].grid : fs.finalGrid;
          if (step.multPos.length) { fsAcc = [...fsAcc, ...step.multPos.map(m => m.val)]; setAccMults([...fsAcc]); }
          const winSet = new Set(step.winPos.map(([r, c]) => key(r, c)));
          const multMap = new Map(step.multPos.map(m => [key(m.pos[0], m.pos[1]), m.val]));
          setHighlighted(winSet); setMultOverlay(multMap);
          runningWin = parseFloat((runningWin + step.cascadeWin).toFixed(4));
          setWinAmount(runningWin);
          if (step.cascadeWin > 0) playWinSound();
          await sleep(800);
          const removeSet = new Set([...winSet, ...step.multPos.map(m => key(m.pos[0], m.pos[1]))]);
          setRemoving(removeSet); setHighlighted(new Set());
          await sleep(300); setRemoving(new Set()); setMultOverlay(new Map()); setGrid(nextGrid); await sleep(320);
        }
      }
      setFreeSpinsLeft(0); setAccMults([]);
    }

    setWinAmount(result.totalWin);
    if (result.totalWin > 0) playBigWinSound();
    setPhase("done");
    updateUser({ balance: result.newBalance });
    setAnimating(false);
  }

  const spin = useCallback(async (isBonusBuy = false) => {
    if (animating) return;
    if (!user) { setError("Login to play"); return; }
    const cost = isBonusBuy ? betAmount * 100 : betAmount;
    if ((user.balance ?? 0) < cost) { setError("Insufficient balance"); return; }
    setError(""); setPhase("idle"); setWinAmount(0); setAnimating(true); setSpinning(true);
    try {
      const token = localStorage.getItem("bettopia_token");
      const res = await fetch("/api/games/sweet-bonanza/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ betAmount, isBonusBuy }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Spin failed"); }
      const result: SpinResult = await res.json();
      updateUser({ balance: (user.balance ?? 0) - cost });
      await playAnimation(result);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setSpinning(false); setAnimating(false);
    }
  }, [animating, user, betAmount, updateUser]);

  return (
    <div style={{
      minHeight: "100vh", width: "100%", overflow: "hidden",
      background: isFS
        ? "linear-gradient(180deg, #8800cc 0%, #5500aa 40%, #cc44ff 100%)"
        : "linear-gradient(180deg, #6ed4ff 0%, #b8eeff 25%, #ffd6ee 55%, #ffaad8 80%, #ff88cc 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "'Arial Black', Arial, sans-serif",
      position: "relative", transition: "background 1s ease",
    }}>
      {/* ── CSS Animations ── */}
      <style>{`
        @keyframes floatUp { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-12px) rotate(3deg)} }
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes winPop  { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes fsIntro { 0%{transform:scale(0.5) rotate(-10deg);opacity:0} 70%{transform:scale(1.05) rotate(2deg)} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes countUp { 0%{transform:scale(1.3)} 100%{transform:scale(1)} }
        @keyframes cloudDrift { 0%{transform:translateX(0)} 100%{transform:translateX(30px)} }
        @keyframes spinGlow { 0%,100%{box-shadow:0 0 20px #ff6600,0 0 40px #ff8800,0 4px 0 #aa3300} 50%{box-shadow:0 0 30px #ffaa00,0 0 60px #ffcc00,0 4px 0 #aa3300} }
      `}</style>

      {/* ── Clouds ── */}
      {!isFS && [
        { x: "5%", y: "8%", s: 1.6, op: 0.75 },
        { x: "72%", y: "5%", s: 2.0, op: 0.65 },
        { x: "20%", y: "15%", s: 1.2, op: 0.55 },
        { x: "55%", y: "2%", s: 1.4, op: 0.7 },
        { x: "85%", y: "18%", s: 1.1, op: 0.5 },
      ].map((c, i) => (
        <div key={i} style={{
          position: "absolute", left: c.x, top: c.y, pointerEvents: "none",
          opacity: c.op, transform: `scale(${c.s})`,
          animation: `cloudDrift ${3 + i * 0.7}s ease-in-out infinite alternate`,
        }}>
          <div style={{ display: "flex", gap: 0 }}>
            {[40,55,45,35].map((r, j) => (
              <div key={j} style={{
                width: r, height: r, borderRadius: "50%",
                background: "rgba(255,255,255,0.9)",
                marginLeft: j > 0 ? -12 : 0, marginTop: j === 1 || j === 2 ? -8 : 0,
              }} />
            ))}
          </div>
        </div>
      ))}

      {/* ── Candy decorations (floating) ── */}
      {!isFS && ["🍭","🍬","🍫","🍡","🍬","🍭"].map((c, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${i % 2 === 0 ? 2 + i * 3 : 88 - i * 2}%`,
          top: `${20 + i * 10}%`,
          fontSize: 24 + (i % 3) * 8,
          opacity: 0.45,
          animation: `floatUp ${2.5 + i * 0.4}s ease-in-out infinite`,
          pointerEvents: "none",
        }}>{c}</div>
      ))}

      {/* ── Free Spins intro overlay ── */}
      {showFSIntro && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "radial-gradient(ellipse, rgba(120,0,200,0.97) 0%, rgba(20,0,50,0.99) 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ animation: "fsIntro 0.7s ease-out forwards", textAlign: "center" }}>
            <div style={{ fontSize: 90, animation: "shimmer 0.4s ease-in-out infinite" }}>⭐</div>
            <div style={{
              fontSize: 58, fontWeight: 900, letterSpacing: 4, lineHeight: 1,
              background: "linear-gradient(90deg, #ffd700, #ff8c00, #ffd700)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              textShadow: "none", filter: "drop-shadow(0 0 20px #ffd700)",
            }}>FREE SPINS!</div>
            <div style={{ fontSize: 34, color: "#fff", marginTop: 12, fontWeight: 700 }}>
              {totalFreeSpins} Spins Awarded
            </div>
          </div>
        </div>
      )}

      {/* ── SWEET BONANZA title ── */}
      <div style={{
        width: "100%", maxWidth: 900, textAlign: "center",
        padding: "10px 0 4px",
        zIndex: 10,
      }}>
        {"SWEET BONANZA".split("").map((ch, i) => {
          const colors = ["#ff2020","#ff6600","#ffcc00","#22cc00","#0088ff","#aa00ff","#ff00aa"];
          return (
            <span key={i} style={{
              fontSize: "clamp(28px, 5vw, 52px)",
              fontWeight: 900,
              color: ch === " " ? "transparent" : colors[i % colors.length],
              WebkitTextStroke: ch === " " ? "none" : "2px rgba(0,0,0,0.4)",
              letterSpacing: 2,
              textShadow: ch === " " ? "none" : `0 3px 0 rgba(0,0,0,0.3), 0 0 20px ${colors[i % colors.length]}88`,
              display: "inline-block",
              transform: ch === " " ? "none" : `rotate(${[-2,1,-1,2,-2,1,-1,2,-2,1,-2,1,-1][i] || 0}deg) translateY(${Math.abs(i % 3 - 1) * -2}px)`,
            }}>{ch === " " ? "\u00a0" : ch}</span>
          );
        })}
      </div>

      {/* ── Main game area ── */}
      <div style={{
        width: "100%", maxWidth: 900, flex: 1,
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "0 12px", zIndex: 10,
      }}>
        {/* ── Left panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 120, paddingTop: 4 }}>
          {/* Buy Feature */}
          <button
            onClick={() => spin(true)} disabled={animating || !user}
            style={{
              background: "linear-gradient(180deg, #ff9933 0%, #ff6600 50%, #cc4400 100%)",
              border: "3px solid #ffdd88",
              borderRadius: 14, padding: "10px 12px", cursor: animating || !user ? "not-allowed" : "pointer",
              opacity: animating || !user ? 0.55 : 1,
              boxShadow: "0 4px 0 #882200, 0 0 16px rgba(255,100,0,0.4)",
              textAlign: "center", color: "#fff",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>BUY FEATURE</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#ffff44" }}>{betAmount * 100} DL</div>
          </button>

          {/* Bet amount */}
          <div style={{
            background: "linear-gradient(180deg, #44cc00 0%, #228800 100%)",
            border: "3px solid #aaff44",
            borderRadius: 14, padding: "8px 10px",
            boxShadow: "0 4px 0 #114400",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 10, color: "#ccff88", letterSpacing: 1, fontWeight: 700 }}>BET PER SPIN</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{betAmount} DL</div>
            <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 4 }}>
              <button onClick={() => changeBet(-1)} disabled={animating || betIdx === 0} style={{
                width: 28, height: 28, borderRadius: 8, border: "2px solid #88ff44",
                background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 16, fontWeight: 700,
                cursor: animating || betIdx === 0 ? "not-allowed" : "pointer", opacity: betIdx === 0 ? 0.4 : 1,
              }}>−</button>
              <button onClick={() => changeBet(1)} disabled={animating || betIdx === BET_OPTIONS.length - 1} style={{
                width: 28, height: 28, borderRadius: 8, border: "2px solid #88ff44",
                background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 16, fontWeight: 700,
                cursor: animating || betIdx === BET_OPTIONS.length - 1 ? "not-allowed" : "pointer",
                opacity: betIdx === BET_OPTIONS.length - 1 ? 0.4 : 1,
              }}>+</button>
            </div>
          </div>

          {/* Mute/Music */}
          <button onClick={toggleMusic} style={{
            background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.5)",
            borderRadius: 10, padding: "6px", color: "#fff", fontSize: 11, fontWeight: 700,
            cursor: "pointer", textAlign: "center",
          }}>
            {musicOn ? "🎵 Music ON" : "🔇 Music OFF"}
          </button>

          {/* Back */}
          <Link href="/">
            <button style={{
              background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.4)",
              borderRadius: 10, padding: "6px 10px", color: "#fff", fontSize: 12, fontWeight: 700,
              cursor: "pointer",
            }}>← Back</button>
          </Link>

          {/* FS counter */}
          {freeSpinsLeft > 0 && (
            <div style={{
              background: "linear-gradient(180deg, #ffd700 0%, #ff8c00 100%)",
              border: "3px solid #fff",
              borderRadius: 14, padding: "8px", textAlign: "center",
              boxShadow: "0 0 20px #ffd700",
              animation: "shimmer 0.6s ease-in-out infinite",
            }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: "#4a0000" }}>FREE SPINS</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", textShadow: "0 2px 0 #884400" }}>
                {freeSpinsLeft}
              </div>
            </div>
          )}

          {/* Accumulated multipliers */}
          {accMults.length > 0 && (
            <div style={{
              background: "rgba(0,0,0,0.5)", border: "2px solid #ffd700",
              borderRadius: 10, padding: "6px", textAlign: "center",
            }}>
              <div style={{ fontSize: 9, color: "#ffd700", fontWeight: 700 }}>MULTIPLIERS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center", marginTop: 3 }}>
                {accMults.map((v, i) => (
                  <span key={i} style={{ background: "#ff6600", borderRadius: 5, padding: "1px 4px", fontSize: 11, fontWeight: 900, color: "#fff" }}>×{v}</span>
                ))}
              </div>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#ffd700", marginTop: 3 }}>= ×{accMults.reduce((a, b) => a + b, 0)}</div>
            </div>
          )}
        </div>

        {/* ── Game grid ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {/* WIN display */}
          <div style={{ minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {phase === "animating" && winAmount > 0 && (
              <div style={{
                fontSize: 32, fontWeight: 900, color: "#ffd700",
                textShadow: "0 0 20px #ffd700, 0 3px 0 #884400",
                animation: "countUp 0.3s ease-out",
              }}>WIN: {formatBalance(winAmount)}</div>
            )}
            {phase === "done" && winAmount > 0 && (
              <div style={{
                fontSize: 28, fontWeight: 900, color: "#ffd700",
                textShadow: "0 0 20px #ffd700, 0 3px 0 #884400",
                animation: "winPop 0.5s ease-out",
              }}>🎉 WIN: {formatBalance(winAmount)}</div>
            )}
            {phase === "done" && winAmount === 0 && (
              <div style={{ fontSize: 15, color: "rgba(0,0,0,0.4)", fontWeight: 700 }}>No win this time</div>
            )}
          </div>

          {/* The grid */}
          <div style={{
            background: isFS
              ? "rgba(180,0,255,0.15)"
              : "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(240,240,255,0.88) 100%)",
            border: isFS ? "3px dashed #dd88ff" : "3px dashed #ff3388",
            borderRadius: 18,
            padding: "10px",
            boxShadow: isFS
              ? "0 0 30px rgba(200,0,255,0.4), inset 0 0 30px rgba(150,0,255,0.1)"
              : "0 8px 32px rgba(200,0,100,0.25), inset 0 2px 0 rgba(255,255,255,0.6)",
            transition: "all 0.8s ease",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
              {grid.map((row, r) =>
                row.map((sym, c) => {
                  const k = key(r, c);
                  const multVal = multOverlay.get(k);
                  return (
                    <Cell
                      key={k} sym={sym} multVal={multVal}
                      highlighted={highlighted.has(k)}
                      removing={removing.has(k)}
                      spinning={spinning}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ color: "#cc0000", fontSize: 13, fontWeight: 700, textAlign: "center",
              background: "rgba(255,255,255,0.8)", borderRadius: 8, padding: "4px 10px" }}>{error}</div>
          )}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div style={{
        width: "100%", maxWidth: 900,
        background: "linear-gradient(180deg, rgba(0,0,60,0.7) 0%, rgba(0,0,40,0.95) 100%)",
        borderTop: "2px solid rgba(255,255,255,0.15)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px 14px",
        zIndex: 10, gap: 16,
        backdropFilter: "blur(10px)",
      }}>
        {/* Info + Balance */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "#ffd700", fontWeight: 700, letterSpacing: 1 }}>BALANCE</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>
                {user ? formatBalance(user.balance ?? 0) : "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#ffd700", fontWeight: 700, letterSpacing: 1 }}>BET</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{betAmount} DL</div>
            </div>
          </div>
        </div>

        {/* SPIN button */}
        <button
          onClick={() => spin(false)} disabled={animating || !user}
          style={{
            width: 76, height: 76, borderRadius: "50%",
            background: animating
              ? "radial-gradient(circle at 38% 35%, #999, #555)"
              : "radial-gradient(circle at 38% 35%, #ffcc44, #ff8800 55%, #cc5500)",
            border: "4px solid",
            borderColor: animating ? "#666" : "#ffd700",
            boxShadow: animating ? "0 4px 0 #333" : "0 0 0 4px rgba(255,215,0,0.3), 0 0 30px rgba(255,150,0,0.6), 0 5px 0 #7a2e00",
            cursor: animating || !user ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30, flexShrink: 0,
            animation: animating ? "none" : "spinGlow 2s ease-in-out infinite",
            transition: "transform 0.1s",
            transform: animating ? "scale(0.95) translateY(3px)" : "scale(1)",
          }}
        >
          {spinning ? (
            <span style={{ display: "inline-block", animation: "floatUp 0.3s linear infinite" }}>⟳</span>
          ) : "▶"}
        </button>

        {/* AUTO placeholder */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 4 }}>AUTO</div>
          <button style={{
            background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)",
            borderRadius: 10, padding: "6px 12px", color: "rgba(255,255,255,0.5)", fontSize: 11,
            fontWeight: 700, cursor: "not-allowed",
          }}>OFF</button>
        </div>
      </div>

      {/* ── Pay table strip ── */}
      <div style={{
        width: "100%", maxWidth: 900,
        background: "rgba(0,0,0,0.35)",
        display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 16px 14px",
        justifyContent: "center", zIndex: 10,
      }}>
        {[
          { id: 0, label: "Heart", pay: "0.2×" },
          { id: 1, label: "Blue", pay: "0.3×" },
          { id: 2, label: "Pink", pay: "0.5×" },
          { id: 3, label: "Green", pay: "0.8×" },
          { id: 4, label: "Plum", pay: "1×" },
          { id: 5, label: "Melon", pay: "1.5×" },
          { id: 6, label: "Grape", pay: "2×" },
          { id: 7, label: "Lolly", pay: "8×" },
        ].map(s => (
          <div key={s.id} style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(255,255,255,0.08)", borderRadius: 8,
            padding: "3px 8px", border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <div style={{ width: 24, height: 24 }}><SymbolSVG id={s.id} /></div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{s.pay}</span>
          </div>
        ))}
        <div style={{ width: "100%", textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
          ⭐ 4+ Scatters = Free Spins · Clusters of 8+ pay · Tumble feature on every win
        </div>
      </div>
    </div>
  );
}
