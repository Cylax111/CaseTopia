import React, { useState, useCallback, useRef } from "react";
import { Layout } from "../components/Layout";
import { Button } from "../components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const SYMBOLS = [
  { id: "hat",   emoji: "🎩", name: "Hat",   weight: 2,  values: [0, 0, 20, 100, 500] },
  { id: "money", emoji: "💰", name: "Money", weight: 4,  values: [0, 0, 10,  50, 200] },
  { id: "beer",  emoji: "🍺", name: "Beer",  weight: 6,  values: [0, 0,  5,  25, 100] },
  { id: "card",  emoji: "🃏", name: "Card",  weight: 8,  values: [0, 0,  3,  15,  50] },
  { id: "apple", emoji: "🍎", name: "Apple", weight: 10, values: [0, 0,  2,   8,  25] },
  { id: "can",   emoji: "🥫", name: "Can",   weight: 12, values: [0, 0,  1,   5,  15] },
];

const STRIP: string[] = [];
for (const s of SYMBOLS) for (let i = 0; i < s.weight; i++) STRIP.push(s.id);

function randSym(): string { return STRIP[Math.floor(Math.random() * STRIP.length)]; }
function randReel(): string[] { return [randSym(), randSym(), randSym()]; }
function getSym(id: string) { return SYMBOLS.find(s => s.id === id)!; }

interface WinLine { row: number; count: number; symId: string; amount: number; }

function evalWins(reels: string[][], bet: number): WinLine[] {
  const wins: WinLine[] = [];
  for (let row = 0; row < 3; row++) {
    const first = reels[0][row];
    let count = 1;
    for (let r = 1; r < 5; r++) {
      if (reels[r][row] === first) count++;
      else break;
    }
    if (count >= 3) {
      const amount = getSym(first).values[count - 1] * bet;
      if (amount > 0) wins.push({ row, count, symId: first, amount });
    }
  }
  return wins;
}

const INIT_REELS = Array.from({ length: 5 }, randReel);
const BET_OPTIONS = [1, 5, 10, 25, 50, 100];

export default function TrampDay() {
  const [balance, setBalance]           = useState(1000);
  const [bet, setBet]                   = useState(1);
  const [display, setDisplay]           = useState<string[][]>(INIT_REELS);
  const [spinning, setSpinning]         = useState(false);
  const [stoppedReels, setStoppedReels] = useState<boolean[]>([true, true, true, true, true]);
  const [wins, setWins]                 = useState<WinLine[]>([]);
  const [totalWin, setTotalWin]         = useState(0);
  const [showWin, setShowWin]           = useState(false);
  const intervalsRef = useRef<(ReturnType<typeof setInterval> | null)[]>([null, null, null, null, null]);

  const spin = useCallback(() => {
    if (spinning || balance < bet) return;

    const currentBet = bet;
    setBalance(b => b - currentBet);
    setSpinning(true);
    setWins([]);
    setTotalWin(0);
    setShowWin(false);
    setStoppedReels([false, false, false, false, false]);

    const finalReels = Array.from({ length: 5 }, randReel);

    for (let r = 0; r < 5; r++) {
      intervalsRef.current[r] = setInterval(() => {
        setDisplay(prev => { const n = [...prev]; n[r] = randReel(); return n; });
      }, 75);
    }

    for (let r = 0; r < 5; r++) {
      const delay = 700 + r * 450;
      setTimeout(() => {
        clearInterval(intervalsRef.current[r]!);
        intervalsRef.current[r] = null;
        setDisplay(prev => { const n = [...prev]; n[r] = finalReels[r]; return n; });
        setStoppedReels(prev => { const n = [...prev]; n[r] = true; return n; });
      }, delay);
    }

    setTimeout(() => {
      const w = evalWins(finalReels, currentBet);
      const total = w.reduce((s, x) => s + x.amount, 0);
      setWins(w);
      setTotalWin(total);
      if (total > 0) {
        setBalance(b => b + total);
        setShowWin(true);
      }
      setSpinning(false);
    }, 700 + 4 * 450 + 250);
  }, [spinning, balance, bet]);

  const isWinRow = (row: number) => wins.some(w => w.row === row);

  return (
    <Layout>
      <div className="flex flex-col gap-5 max-w-xl mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold">Tramp Day</h1>
          <p className="text-muted-foreground text-sm">BGaming Style · Demo</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">BALANCE</p>
            <p className="text-xl font-bold">{balance.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">WIN</p>
            <p className={`text-xl font-bold ${totalWin > 0 ? "text-yellow-400" : "text-muted-foreground"}`}>
              {totalWin > 0 ? `+${totalWin.toLocaleString()}` : "—"}
            </p>
          </div>
        </div>

        {/* Slot machine */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Reels area */}
          <div className="relative p-4 bg-black/70">
            <div className="flex gap-2">
              {display.map((reel, r) => (
                <div key={r} className="flex-1 flex flex-col gap-2">
                  {reel.map((symId, row) => {
                    const sym = getSym(symId);
                    const stopped = stoppedReels[r];
                    const winning = stopped && isWinRow(row) && !spinning;
                    return (
                      <div
                        key={row}
                        className={`
                          aspect-square rounded-lg flex items-center justify-center text-3xl
                          border-2 transition-colors duration-200 select-none
                          ${winning
                            ? "border-yellow-400 bg-yellow-400/15"
                            : "border-white/10 bg-white/5"}
                          ${!stopped ? "opacity-70" : ""}
                        `}
                        style={{ filter: !stopped ? "blur(1px)" : undefined }}
                      >
                        {sym.emoji}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Payline guides */}
            <div className="absolute left-0 right-0 flex flex-col justify-around pointer-events-none" style={{ top: 16, bottom: 16 }}>
              {[0, 1, 2].map(row => (
                <div
                  key={row}
                  className={`h-px transition-all duration-300 ${isWinRow(row) && !spinning ? "bg-yellow-400/60" : "bg-white/5"}`}
                />
              ))}
            </div>

            {/* Big win overlay */}
            <AnimatePresence>
              {showWin && totalWin > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/65 rounded-xl cursor-pointer"
                  onClick={() => setShowWin(false)}
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="text-6xl font-black text-yellow-400"
                    >
                      +{totalWin}
                    </motion.div>
                    <div className="text-yellow-300 font-bold mt-1 text-sm tracking-widest">YOU WIN!</div>
                    <div className="text-white/50 text-xs mt-2">tap to continue</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="p-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-2">BET PER SPIN</p>
              <div className="flex gap-1.5">
                {BET_OPTIONS.map(b => (
                  <button
                    key={b}
                    onClick={() => !spinning && setBet(b)}
                    disabled={spinning}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all
                      ${bet === b
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={showWin ? () => setShowWin(false) : spin}
              disabled={spinning || (balance < bet && !showWin)}
              className="w-full h-12 text-base font-black"
            >
              {spinning ? "⠿  SPINNING..." : showWin ? "COLLECT" : "🎰  SPIN"}
            </Button>

            {balance < bet && !spinning && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setBalance(1000); setTotalWin(0); setWins([]); setShowWin(false); }}
              >
                Refill Demo Credits (1,000)
              </Button>
            )}
          </div>
        </div>

        {/* Paytable */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-bold text-muted-foreground mb-3 tracking-widest">PAYTABLE (× bet)</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {SYMBOLS.map(sym => (
              <div key={sym.id} className="flex items-center gap-3">
                <span className="text-2xl">{sym.emoji}</span>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>3× <span className="text-foreground font-medium">{sym.values[2]}×</span></span>
                  <span>4× <span className="text-foreground font-medium">{sym.values[3]}×</span></span>
                  <span>5× <span className="text-foreground font-medium">{sym.values[4]}×</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
