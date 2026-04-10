import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { cn } from "../lib/utils";
import { Link } from "wouter";

// ── Symbol config (matching Sweet Bonanza colours exactly) ────
const SYMS = [
  { emoji: "🍬", color: "#e91e8c", glow: "#ff69b4", label: "Candy"      }, // 0 RED
  { emoji: "💙", color: "#2196f3", glow: "#64b5f6", label: "Blue"       }, // 1 BLUE
  { emoji: "💜", color: "#9c27b0", glow: "#ce93d8", label: "Purple"     }, // 2 PURPLE
  { emoji: "🍎", color: "#43a047", glow: "#a5d6a7", label: "Apple"      }, // 3 APPLE
  { emoji: "🍑", color: "#ff6f00", glow: "#ffcc02", label: "Peach"      }, // 4 PLUM
  { emoji: "🍉", color: "#1b5e20", glow: "#69f0ae", label: "Melon"      }, // 5 WATERMELON
  { emoji: "🍇", color: "#4a148c", glow: "#ce93d8", label: "Grape"      }, // 6 GRAPE
  { emoji: "🍭", color: "#ff1493", glow: "#ffd700", label: "Lollipop"   }, // 7 LOLLIPOP
  { emoji: "⭐", color: "#ffd600", glow: "#fff176", label: "Scatter"    }, // 8 SCATTER
  { emoji: "💥", color: "#ff6f00", glow: "#ffd54f", label: "Multiplier" }, // 9 MULTIPLIER
];

const BET_OPTIONS = [0.2, 0.4, 0.8, 1, 2, 4, 8, 10, 20, 50];
const CANDY_DECORATIONS = ["🍬","🍭","🍇","🍉","🍑","🍎","⭐","🍬","🍭","🍇","🍬","🍭"];

const EMPTY_GRID = (): number[][] =>
  Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => Math.floor(Math.random() * 8)));

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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

// ── Audio ─────────────────────────────────────────────────────
function beep(freqs: number[], dur = 0.3, vol = 0.12) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    freqs.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.08;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + dur);
    });
  } catch { /* ignore */ }
}

// ── Cell ──────────────────────────────────────────────────────
const Cell: React.FC<{
  sym: number; multVal?: number;
  highlighted: boolean; removing: boolean; spinning: boolean;
}> = ({ sym, multVal, highlighted, removing, spinning }) => {
  if (sym < 0) return (
    <div style={{ aspectRatio: "1", borderRadius: 12, background: "rgba(0,0,0,0.3)" }} />
  );
  const s = SYMS[sym] ?? SYMS[0];
  return (
    <div
      style={{
        aspectRatio: "1",
        borderRadius: 14,
        background: highlighted
          ? `radial-gradient(ellipse at 30% 30%, ${s.glow}cc, ${s.color}99)`
          : `radial-gradient(ellipse at 30% 30%, ${s.color}dd, ${s.color}88)`,
        border: highlighted
          ? `3px solid ${s.glow}`
          : `2px solid ${s.color}55`,
        boxShadow: highlighted
          ? `0 0 18px 6px ${s.glow}99, inset 0 1px 0 rgba(255,255,255,0.3)`
          : `0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)`,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        position: "relative",
        transform: highlighted ? "scale(1.08)" : removing ? "scale(0.5)" : spinning ? "scale(0.92)" : "scale(1)",
        opacity: removing ? 0 : spinning ? 0.6 : 1,
        transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        cursor: "default", userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* Shine overlay */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "45%",
        background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)",
        borderRadius: "12px 12px 0 0", pointerEvents: "none",
      }} />
      <span style={{ fontSize: "clamp(20px, 3.5vw, 36px)", lineHeight: 1, filter: highlighted ? `drop-shadow(0 0 8px ${s.glow})` : "none" }}>
        {s.emoji}
      </span>
      {sym === 9 && multVal !== undefined && (
        <span style={{ fontSize: 11, fontWeight: 900, color: "#fff", background: "#e65100", borderRadius: 6, padding: "0 4px", marginTop: 1, lineHeight: "16px" }}>
          ×{multVal}
        </span>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────
export default function SweetBonanzaGame() {
  const { user, updateUser } = useAuth();
  const { formatBalance } = useCurrency();

  const [grid, setGrid] = useState<number[][]>(EMPTY_GRID);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [multOverlay, setMultOverlay] = useState<Map<string, number>>(new Map());
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [spinning, setSpinning] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [betAmount, setBetAmount] = useState(1);
  const [betIdx, setBetIdx] = useState(3);
  const [winAmount, setWinAmount] = useState(0);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [totalFreeSpins, setTotalFreeSpins] = useState(0);
  const [accMults, setAccMults] = useState<number[]>([]);
  const [showFSIntro, setShowFSIntro] = useState(false);
  const [phase, setPhase] = useState<"idle" | "animating" | "done">("idle");
  const [error, setError] = useState("");
  const abortRef = useRef(false);

  const key = (r: number, c: number) => `${r},${c}`;
  const isFreeSpin = freeSpinsLeft > 0;

  function changeBet(dir: 1 | -1) {
    if (animating) return;
    const next = Math.max(0, Math.min(BET_OPTIONS.length - 1, betIdx + dir));
    setBetIdx(next);
    setBetAmount(BET_OPTIONS[next]);
  }

  async function playAnimation(result: SpinResult) {
    abortRef.current = false;
    setPhase("animating");
    setWinAmount(0);
    setHighlighted(new Set()); setRemoving(new Set()); setMultOverlay(new Map());
    setFreeSpinsLeft(0); setAccMults([]);

    setSpinning(true); await sleep(350);
    setSpinning(false); setGrid(result.baseGrid); await sleep(280);

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
      beep([440, 660], 0.3);
      await sleep(750);
      const removeSet = new Set([...winSet, ...step.multPos.map(m => key(m.pos[0], m.pos[1]))]);
      setRemoving(removeSet); setHighlighted(new Set());
      await sleep(280);
      setRemoving(new Set()); setMultOverlay(new Map()); setGrid(nextGrid);
      await sleep(320);
    }

    if (result.freeSpinsCount > 0) {
      setShowFSIntro(true); setTotalFreeSpins(result.freeSpinsCount);
      beep([330, 440, 550, 660, 880], 0.4, 0.18);
      await sleep(2400); setShowFSIntro(false); await sleep(200);

      for (let fi = 0; fi < result.fsResults.length; fi++) {
        if (abortRef.current) break;
        const fs = result.fsResults[fi];
        setFreeSpinsLeft(result.freeSpinsCount - fi);
        setSpinning(true); await sleep(350);
        setSpinning(false); setGrid(fs.grid); await sleep(280);

        let fsAccMults: number[] = [];
        for (let i = 0; i < fs.steps.length; i++) {
          if (abortRef.current) break;
          const step = fs.steps[i];
          const nextGrid = i + 1 < fs.steps.length ? fs.steps[i + 1].grid : fs.finalGrid;
          if (step.multPos.length) { fsAccMults = [...fsAccMults, ...step.multPos.map(m => m.val)]; setAccMults([...fsAccMults]); }
          const winSet = new Set(step.winPos.map(([r, c]) => key(r, c)));
          const multMap = new Map(step.multPos.map(m => [key(m.pos[0], m.pos[1]), m.val]));
          setHighlighted(winSet); setMultOverlay(multMap);
          runningWin = parseFloat((runningWin + step.cascadeWin).toFixed(4));
          setWinAmount(runningWin);
          if (step.cascadeWin > 0) beep([440, 660], 0.3);
          await sleep(750);
          const removeSet = new Set([...winSet, ...step.multPos.map(m => key(m.pos[0], m.pos[1]))]);
          setRemoving(removeSet); setHighlighted(new Set());
          await sleep(280);
          setRemoving(new Set()); setMultOverlay(new Map()); setGrid(nextGrid);
          await sleep(320);
        }
      }
      setFreeSpinsLeft(0); setAccMults([]);
    }

    setWinAmount(result.totalWin);
    if (result.totalWin > 0) beep([440, 550, 660, 880], 0.4, 0.18);
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

  // ── UI ────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: isFreeSpin
        ? "radial-gradient(ellipse at 50% 0%, #6a0dad 0%, #3d0066 35%, #1a0030 70%, #0a001a 100%)"
        : "radial-gradient(ellipse at 50% 0%, #4a0080 0%, #230046 35%, #12001e 70%, #050008 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "0", position: "relative", overflow: "hidden",
      transition: "background 0.8s ease",
    }}>

      {/* ── Floating candy background decorations ── */}
      {CANDY_DECORATIONS.map((c, i) => (
        <div key={i} style={{
          position: "absolute", pointerEvents: "none", userSelect: "none",
          fontSize: `${16 + (i % 3) * 8}px`,
          left: `${(i * 8.3) % 100}%`,
          top: `${(i * 13.7 + 10) % 90}%`,
          opacity: 0.07 + (i % 4) * 0.025,
          transform: `rotate(${i * 37}deg)`,
          filter: "blur(0.5px)",
        }}>{c}</div>
      ))}

      {/* ── Free Spins intro overlay ── */}
      {showFSIntro && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "radial-gradient(ellipse at center, rgba(106,13,173,0.95) 0%, rgba(10,0,26,0.97) 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ textAlign: "center", animation: "pulse 0.6s ease-in-out infinite alternate" }}>
            <div style={{ fontSize: 80, marginBottom: 12 }}>⭐</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: "#ffd700", letterSpacing: 4, textShadow: "0 0 30px #ffd700, 0 0 60px #ff8c00" }}>
              FREE SPINS!
            </div>
            <div style={{ fontSize: 28, color: "#fff", marginTop: 8, fontWeight: 700 }}>
              {totalFreeSpins} Spins Awarded
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      <div style={{
        width: "100%", maxWidth: 820,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px 6px",
        zIndex: 10,
      }}>
        {/* Back */}
        <Link href="/">
          <button style={{
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 10, padding: "6px 14px", color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(8px)",
          }}>← Back</button>
        </Link>

        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: 1, textShadow: "0 0 12px rgba(233,30,140,0.8)" }}>
            Sweet Bonanza
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: 2, textTransform: "uppercase" }}>
            Cluster Pays · Tumble
          </div>
        </div>

        {/* Balance */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1 }}>Balance</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#ffd700" }}>
            {user ? formatBalance(user.balance ?? 0) : "—"}
          </div>
        </div>
      </div>

      {/* ── Free Spins + Multiplier strip ── */}
      {(freeSpinsLeft > 0 || accMults.length > 0) && (
        <div style={{
          display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "center",
          background: "rgba(106,13,173,0.5)", border: "1px solid rgba(255,215,0,0.4)",
          borderRadius: 12, padding: "6px 16px", margin: "0 20px",
          backdropFilter: "blur(8px)",
        }}>
          {freeSpinsLeft > 0 && (
            <span style={{ color: "#ffd700", fontWeight: 900, fontSize: 15 }}>
              ⭐ FREE SPINS: {freeSpinsLeft}/{totalFreeSpins}
            </span>
          )}
          {accMults.length > 0 && (
            <span style={{ color: "#fff", fontSize: 13, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {accMults.map((v, i) => (
                <span key={i} style={{ background: "#ff6f00", borderRadius: 6, padding: "1px 6px", fontWeight: 900, fontSize: 12 }}>×{v}</span>
              ))}
              <span style={{ color: "#ffd700", fontWeight: 900 }}>= ×{accMults.reduce((a, b) => a + b, 0)}</span>
            </span>
          )}
        </div>
      )}

      {/* ── WIN display ── */}
      <div style={{ minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 0" }}>
        {phase === "animating" && winAmount > 0 && (
          <div style={{
            fontSize: 32, fontWeight: 900, color: "#ffd700",
            textShadow: "0 0 20px #ffd700, 0 0 40px #ff8c00",
            letterSpacing: 1, animation: "pulse 0.5s ease-in-out infinite alternate",
          }}>
            WIN: {formatBalance(winAmount)}
          </div>
        )}
        {phase === "done" && winAmount > 0 && (
          <div style={{
            fontSize: 30, fontWeight: 900, color: "#ffd700",
            textShadow: "0 0 20px #ffd700, 0 0 40px #ff8c00",
          }}>
            🎉 WIN: {formatBalance(winAmount)}
          </div>
        )}
        {phase === "done" && winAmount === 0 && (
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>No win this time</div>
        )}
      </div>

      {/* ── Grid ── */}
      <div style={{
        width: "100%", maxWidth: 820, padding: "0 12px",
        display: "flex", justifyContent: "center",
      }}>
        <div style={{
          width: "100%",
          background: isFreeSpin
            ? "linear-gradient(180deg, rgba(74,0,128,0.7) 0%, rgba(30,0,60,0.8) 100%)"
            : "linear-gradient(180deg, rgba(20,0,40,0.8) 0%, rgba(5,0,15,0.9) 100%)",
          borderRadius: 20,
          border: isFreeSpin
            ? "2px solid rgba(200,100,255,0.5)"
            : "2px solid rgba(200,50,200,0.25)",
          boxShadow: isFreeSpin
            ? "0 0 40px rgba(150,50,255,0.4), inset 0 0 60px rgba(100,0,200,0.2)"
            : "0 0 30px rgba(100,0,150,0.3), inset 0 0 40px rgba(50,0,100,0.2)",
          padding: 10,
          transition: "all 0.8s ease",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
            {grid.map((row, r) =>
              row.map((sym, c) => {
                const k = key(r, c);
                const multVal = multOverlay.get(k);
                return (
                  <Cell
                    key={k} sym={sym}
                    multVal={multVal}
                    highlighted={highlighted.has(k)}
                    removing={removing.has(k)}
                    spinning={spinning}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ color: "#ff5252", fontSize: 13, fontWeight: 600, padding: "4px 0" }}>{error}</div>
      )}

      {/* ── Bottom control bar ── */}
      <div style={{
        width: "100%", maxWidth: 820,
        background: "linear-gradient(180deg, rgba(30,0,60,0.9) 0%, rgba(10,0,25,0.97) 100%)",
        border: "1px solid rgba(180,50,200,0.25)",
        borderRadius: "0 0 0 0",
        padding: "14px 20px 20px",
        display: "flex", alignItems: "center", gap: 12,
        marginTop: 10,
        backdropFilter: "blur(12px)",
      }}>
        {/* Bet controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Bet Per Spin</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => changeBet(-1)} disabled={animating || betIdx === 0}
              style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 18, fontWeight: 700,
                cursor: animating || betIdx === 0 ? "not-allowed" : "pointer",
                opacity: animating || betIdx === 0 ? 0.4 : 1,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >−</button>
            <div style={{
              minWidth: 70, textAlign: "center", fontSize: 18, fontWeight: 900, color: "#ffd700",
              background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: "4px 10px",
              border: "1px solid rgba(255,215,0,0.3)",
            }}>
              {betAmount} DL
            </div>
            <button
              onClick={() => changeBet(1)} disabled={animating || betIdx === BET_OPTIONS.length - 1}
              style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 18, fontWeight: 700,
                cursor: animating || betIdx === BET_OPTIONS.length - 1 ? "not-allowed" : "pointer",
                opacity: animating || betIdx === BET_OPTIONS.length - 1 ? 0.4 : 1,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >+</button>
          </div>
        </div>

        {/* SPIN button */}
        <button
          onClick={() => spin(false)} disabled={animating || !user}
          style={{
            width: 80, height: 80, borderRadius: "50%",
            background: animating
              ? "radial-gradient(circle, #888 0%, #555 100%)"
              : "radial-gradient(circle at 35% 35%, #ff9d00, #e65c00 60%, #b84300)",
            border: "4px solid",
            borderColor: animating ? "#777" : "#ffd700",
            boxShadow: animating ? "none" : "0 0 24px rgba(255,157,0,0.7), 0 0 48px rgba(230,92,0,0.4), inset 0 2px 0 rgba(255,255,255,0.3)",
            cursor: animating || !user ? "not-allowed" : "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            fontSize: 28, flexShrink: 0,
            transition: "all 0.2s ease",
            transform: animating ? "scale(0.95)" : "scale(1)",
          }}
          title="Spin"
        >
          {spinning ? "⟳" : "▶"}
        </button>

        {/* Buy Bonus */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, alignItems: "flex-end" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Buy Feature</div>
          <button
            onClick={() => spin(true)} disabled={animating || !user}
            style={{
              background: "linear-gradient(135deg, #4a148c, #6a1b9a)",
              border: "2px solid #ce93d8",
              borderRadius: 10, padding: "8px 14px",
              color: "#ffd700", fontWeight: 900, fontSize: 13,
              cursor: animating || !user ? "not-allowed" : "pointer",
              opacity: animating || !user ? 0.5 : 1,
              textAlign: "center", whiteSpace: "nowrap",
              boxShadow: "0 0 12px rgba(150,50,255,0.4)",
            }}
          >
            ⭐ {betAmount * 100} DL
          </button>
        </div>
      </div>

      {/* ── Pay table strip ── */}
      <div style={{
        width: "100%", maxWidth: 820,
        background: "rgba(0,0,0,0.4)", borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 20px 16px",
        justifyContent: "center",
      }}>
        {SYMS.slice(0, 8).map((s, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(255,255,255,0.04)", borderRadius: 8,
            padding: "4px 8px", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <span style={{ fontSize: 16 }}>{s.emoji}</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
              {["0.2×","0.3×","0.5×","0.8×","1×","1.5×","2×","8×"][i]}
            </span>
          </div>
        ))}
        <div style={{ width: "100%", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
          ⭐ 4+ Scatters = Free Spins · Clusters of 8+ symbols pay · Tumble on every win
        </div>
      </div>

      {/* ── CSS keyframes ── */}
      <style>{`
        @keyframes pulse {
          from { transform: scale(1); opacity: 1; }
          to   { transform: scale(1.04); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
