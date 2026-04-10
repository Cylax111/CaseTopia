import React, { useState } from "react";
import { Link } from "wouter";
import { Layout } from "../components/Layout";
import { CASINO_GAMES, getVolatilityColor } from "../data/casinoGames";

const ORIGINAL_GAMES = [
  {
    symbol: "egyptian-gold",
    name: "Egyptian Gold",
    emoji: "𓂀",
    gradient: "linear-gradient(135deg, #1a0800 0%, #3d1a00 50%, #0a0400 100%)",
    volatility: "high" as const,
    lines: 10,
    provider: "Original",
    badge: "ORIGINAL",
  },
];

export default function SlotsLobby() {
  const [filter, setFilter] = useState<"all" | "high" | "very-high" | "low" | "medium" | "variable">("all");

  const filtered = filter === "all"
    ? CASINO_GAMES
    : CASINO_GAMES.filter(g => g.volatility === filter);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Slots</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {CASINO_GAMES.length} games · BGaming
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "low", "medium", "high", "very-high", "variable"] as const).map(v => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
                  filter === v
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {v === "all" ? "All" : v.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Original games - always shown at top */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded-full">ORIGINAL</span>
            <span className="text-xs text-muted-foreground">Playable now · Real DL wagering</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {ORIGINAL_GAMES.map(game => (
              <Link key={game.symbol} href={`/slots/${game.symbol}`}>
                <div
                  className="group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer transition-all"
                  style={{
                    background: game.gradient,
                    border: "2px solid rgba(212,160,0,0.4)",
                    boxShadow: "0 0 20px rgba(212,160,0,0.15)",
                  }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 select-none">
                    <span className="text-5xl" style={{ filter: "drop-shadow(0 0 8px #FFD700)" }}>{game.emoji}</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent z-10" />
                  <div className="absolute top-2 left-2 z-20">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
                      ORIGINAL
                    </span>
                  </div>
                  <div className="absolute top-2 right-2 z-20">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold capitalize ${getVolatilityColor(game.volatility)}`}>
                      High
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
                    <h3 className="text-sm font-bold text-white leading-tight">{game.name}</h3>
                    <p className="text-[10px] text-yellow-400/70 mt-0.5">{game.lines} paylines</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Provider games */}
        {CASINO_GAMES.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-muted-foreground bg-muted/30 border border-border px-2 py-0.5 rounded-full">PROVIDER</span>
              <span className="text-xs text-muted-foreground">Coming soon · Requires operator agreement</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map(game => (
                <div
                  key={game.symbol}
                  className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-border opacity-50 cursor-not-allowed"
                  style={{ background: game.gradient }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 select-none">
                    <span className="text-5xl">{game.emoji}</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                  <div className="absolute inset-0 bg-black/40 z-20 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white/60 bg-black/50 px-2 py-1 rounded">COMING SOON</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-30">
                    <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">{game.name}</h3>
                    <p className="text-[10px] text-white/50 mt-0.5">BGaming</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
