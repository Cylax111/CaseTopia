import React, { useState } from "react";
import { Link } from "wouter";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { getGameBySymbol, getDemoUrl, getVolatilityColor } from "../data/ppGames";

interface PPSlotProps {
  params: { symbol: string };
}

export default function PPSlot({ params }: PPSlotProps) {
  const { symbol } = params;
  const { user } = useAuth();
  const game = getGameBySymbol(symbol);

  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"real" | "demo">("demo");

  const DEMO_URL = getDemoUrl(symbol);
  const src = mode === "real" && gameUrl ? gameUrl : DEMO_URL;

  async function launchReal() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("bettopia_token");
      const res = await fetch("/api/games/pp-launch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ gameSymbol: symbol }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Launch failed");
      }
      const { gameUrl: url } = await res.json();
      setGameUrl(url);
      setMode("real");
    } catch (err: any) {
      setError(err.message || "Failed to launch");
      setMode("demo");
    } finally {
      setLoading(false);
    }
  }

  const volColor = game ? getVolatilityColor(game.volatility) : "";

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Link href="/slots">
                <span className="text-muted-foreground hover:text-foreground text-sm cursor-pointer">← All Slots</span>
              </Link>
            </div>
            <h1 className="text-2xl font-bold">{game?.name ?? symbol}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <span>Pragmatic Play · Slot</span>
              {game && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${volColor}`}>
                  {game.volatility.replace("-", " ")} volatility
                </span>
              )}
              {game?.ways && <span>{game.ways.toLocaleString()} ways</span>}
              {game?.lines && <span>{game.lines} lines</span>}
              <span className={mode === "real" ? "text-green-400 font-semibold" : "text-yellow-400"}>
                {mode === "real" ? "Real Money" : "Demo"}
              </span>
            </div>
          </div>

          {user ? (
            <button
              onClick={launchReal}
              disabled={loading || mode === "real"}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-bold transition-all"
            >
              {loading ? "Loading..." : mode === "real" ? "✓ Real Money" : "Play for Real"}
            </button>
          ) : (
            <Link href="/login">
              <button className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-all">
                Login to Play for Real
              </button>
            </Link>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div
          className="w-full rounded-xl overflow-hidden border border-border bg-black"
          style={{ height: "calc(100vh - 210px)", minHeight: 520 }}
        >
          <iframe
            key={src}
            src={src}
            title={game?.name ?? symbol}
            className="w-full h-full"
            allow="fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </Layout>
  );
}
