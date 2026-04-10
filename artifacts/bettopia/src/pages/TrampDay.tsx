import React, { useState } from "react";
import { Layout } from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export default function TrampDay() {
  const [customUrl, setCustomUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState("");

  const handleLoad = () => {
    if (customUrl.trim()) {
      setActiveUrl(customUrl.trim());
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Tramp Day</h1>
            <p className="text-muted-foreground text-sm">BGaming • Slot</p>
          </div>
        </div>

        <div
          className="w-full rounded-xl overflow-hidden border border-border bg-black flex items-center justify-center"
          style={{ height: "calc(100vh - 180px)", minHeight: 480 }}
        >
          {activeUrl ? (
            <iframe
              src={activeUrl}
              title="Tramp Day by BGaming"
              className="w-full h-full"
              allow="fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="text-center space-y-4 p-8 max-w-md">
              <div className="text-6xl">🎰</div>
              <h2 className="text-xl font-bold">BGaming Integration Required</h2>
              <p className="text-muted-foreground text-sm">
                To embed Tramp Day, you need a BGaming operator account. Once set up, BGaming provides a game launch URL — paste it below to load the game.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste BGaming game URL..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="text-sm"
                />
                <Button onClick={handleLoad} disabled={!customUrl.trim()}>
                  Load
                </Button>
              </div>
              <a
                href="https://bgaming.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-muted-foreground underline hover:text-foreground transition-colors"
              >
                Get BGaming integration →
              </a>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
