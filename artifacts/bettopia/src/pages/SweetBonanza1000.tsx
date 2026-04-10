import React, { useState } from "react";
import { Link } from "wouter";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";

export default function SweetBonanza1000() {
  const { user } = useAuth();
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"real" | "demo">("demo");

  const DEMO_URL =
    "https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?gameSymbol=vs20sbn1000&lang=en&cur=USD&jurisdiction=MT";

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
        body: JSON.stringify({ gameSymbol: "vs20sbn1000" }),
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

  const src = mode === "real" && gameUrl ? gameUrl : DEMO_URL;

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sweet Bonanza 1000</h1>
            <p className="text-muted-foreground text-sm">
              Pragmatic Play · Slot ·{" "}
              <span className={mode === "real" ? "text-green-400 font-semibold" : "text-yellow-400"}>
                {mode === "real" ? "Real Money" : "Demo"}
              </span>
            </p>
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

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <div
          className="w-full rounded-xl overflow-hidden border border-border bg-black"
          style={{ height: "calc(100vh - 200px)", minHeight: 520 }}
        >
          <iframe
            key={src}
            src={src}
            title="Sweet Bonanza 1000"
            className="w-full h-full"
            allow="fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </Layout>
  );
}
