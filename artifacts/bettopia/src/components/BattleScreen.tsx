import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Package, Crown, Bot, Loader2, LogOut, Volume2, VolumeX, Copy, Pencil } from "lucide-react";
import { GemIcon } from "./GemIcon";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import bigOrbSrc from "@assets/legendary_orb_1775536735371.webp";
import orbPlaceholderSrc from "@assets/legendary_orb_1775538080736.webp";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BattleItem {
  id: string; name: string; color: string;
  value: number; rarity: string; imageUrl?: string;
}
interface CaseItem extends BattleItem { chance: number; }
interface BattlePlayer {
  userId: string; username: string; teamIndex: number; slotIndex: number;
  items: BattleItem[]; totalValue: number; isBot?: boolean;
}
interface BattleRound {
  roundNumber: number; caseId: number;
  results: { userId: string | number; item: BattleItem }[];
}
interface CaseData { id: string; name: string; price: number; items: CaseItem[]; }
interface BattleResult {
  id: string; status: string; gameMode: string; battleType?: string;
  isShared?: boolean; maxPlayers: number; isDraw?: boolean;
  winnerId?: string; winnerTeamIndex?: number;
  players: BattlePlayer[]; cases: CaseData[]; rounds: BattleRound[];
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
  common:"#9E9E9E", uncommon:"#2196F3", rare:"#4CAF50",
  epic:"#9C27B0", legendary:"#FF9800", mythic:"#FFD700", divine:"#FFFFFF",
};
const VERT_ITEM_H = 160;  // Cases.tsx getVConfig() itemH
const REEL_BG     = "hsl(var(--sidebar))";
const ITEM_COUNT  = 60;
const WINNING_IDX = 45;
const ORB_THRESHOLD = 3;
const ORB_ITEM: BattleItem = {
  id:"__orb__", name:"???", color:"#fbbf24",
  value:0, rarity:"__orb__", imageUrl: orbPlaceholderSrc,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getNumTeams(gm: string) { return gm.split("v").filter(Boolean).length; }
function getPlayersPerTeam(gm: string) { return parseInt(gm.split("v")[0], 10) || 1; }

function buildStrip(caseItems: CaseItem[], result: BattleItem, resultIsRare: boolean): BattleItem[] {
  const pool = caseItems.length > 0 ? caseItems : [{ ...result, chance: 100 } as CaseItem];
  const strip: BattleItem[] = Array.from({ length: ITEM_COUNT }, () => {
    const item = pool[Math.floor(Math.random() * pool.length)];
    return item.chance <= ORB_THRESHOLD ? ORB_ITEM : item;
  });
  strip[WINNING_IDX] = resultIsRare ? ORB_ITEM : result;
  return strip;
}

// ─── Currency display ──────────────────────────────────────────────────────────

function ValDisplay({ value, size = 11 }: { value: number; size?: number }) {
  let n: number, unit: string;
  if (value >= 100)    { n = +(value/100).toFixed(2); unit="BGL"; }
  else if (value >= 1) { n = +value.toFixed(2);        unit="DL"; }
  else                 { n = Math.round(value*100);    unit="WL"; }
  return (
    <span className="flex items-center gap-0.5 font-bold tabular-nums">
      {n.toLocaleString()}
      {unit==="BGL" ? <span className="text-yellow-400 font-black" style={{fontSize:size}}>BGL</span>
      :unit==="WL"  ? <span className="text-blue-400 font-bold" style={{fontSize:size}}>WL</span>
      :<GemIcon size={size}/>}
    </span>
  );
}

// ─── Audio ─────────────────────────────────────────────────────────────────────

function createAudioCtx(): AudioContext | null {
  try { return new (window.AudioContext||(window as any).webkitAudioContext)(); } catch { return null; }
}
function playTick(ctx: AudioContext, muted: boolean) {
  if (muted) return;
  const t=ctx.currentTime, master=ctx.createGain(); master.gain.value=0.55; master.connect(ctx.destination);
  const sr=ctx.sampleRate, snapLen=Math.floor(sr*0.008), snapBuf=ctx.createBuffer(1,snapLen,sr);
  const sd=snapBuf.getChannelData(0); for(let i=0;i<snapLen;i++) sd[i]=(Math.random()*2-1)*Math.pow(1-i/snapLen,3);
  const snap=ctx.createBufferSource(); snap.buffer=snapBuf;
  const sf=ctx.createBiquadFilter(); sf.type="bandpass"; sf.frequency.value=3200; sf.Q.value=0.8;
  const sg=ctx.createGain(); sg.gain.setValueAtTime(0.25,t); sg.gain.exponentialRampToValueAtTime(0.0001,t+0.008);
  snap.connect(sf); sf.connect(sg); sg.connect(master); snap.start(t);
  const fund=ctx.createOscillator(); fund.type="sine";
  fund.frequency.setValueAtTime(260,t); fund.frequency.exponentialRampToValueAtTime(120,t+0.045);
  const fg=ctx.createGain(); fg.gain.setValueAtTime(0,t); fg.gain.linearRampToValueAtTime(0.5,t+0.002); fg.gain.exponentialRampToValueAtTime(0.0001,t+0.07);
  fund.connect(fg); fg.connect(master); fund.start(t); fund.stop(t+0.08);
  const harm=ctx.createOscillator(); harm.type="sine"; harm.frequency.setValueAtTime(520,t); harm.frequency.exponentialRampToValueAtTime(240,t+0.03);
  const hg=ctx.createGain(); hg.gain.setValueAtTime(0,t); hg.gain.linearRampToValueAtTime(0.18,t+0.002); hg.gain.exponentialRampToValueAtTime(0.0001,t+0.04);
  harm.connect(hg); hg.connect(master); harm.start(t); harm.stop(t+0.05);
}
function playStopClick(ctx: AudioContext, muted: boolean) {
  if (muted) return;
  const t=ctx.currentTime, sr=ctx.sampleRate, master=ctx.createGain(); master.gain.value=0.75; master.connect(ctx.destination);
  const tLen=Math.floor(sr*0.010), tBuf=ctx.createBuffer(1,tLen,sr), td=tBuf.getChannelData(0);
  for(let i=0;i<tLen;i++) td[i]=(Math.random()*2-1)*Math.pow(1-i/tLen,2);
  const tr=ctx.createBufferSource(); tr.buffer=tBuf;
  const tf=ctx.createBiquadFilter(); tf.type="bandpass"; tf.frequency.value=3800; tf.Q.value=0.8;
  const tg=ctx.createGain(); tg.gain.setValueAtTime(0.45,t); tg.gain.exponentialRampToValueAtTime(0.0001,t+0.010);
  tr.connect(tf); tf.connect(tg); tg.connect(master); tr.start(t);
  const thud=ctx.createOscillator(); thud.type="sine";
  thud.frequency.setValueAtTime(300,t); thud.frequency.exponentialRampToValueAtTime(75,t+0.10);
  const thg=ctx.createGain(); thg.gain.setValueAtTime(0,t); thg.gain.linearRampToValueAtTime(0.9,t+0.003); thg.gain.exponentialRampToValueAtTime(0.0001,t+0.16);
  thud.connect(thg); thg.connect(master); thud.start(t); thud.stop(t+0.18);
}
function playBonusSwoosh(ctx: AudioContext, muted: boolean) {
  if (muted) return;
  const t=ctx.currentTime, dur=1.5, sr=ctx.sampleRate, bufLen=Math.floor(sr*dur);
  const buf=ctx.createBuffer(1,bufLen,sr), d=buf.getChannelData(0);
  for(let i=0;i<bufLen;i++) d[i]=Math.random()*2-1;
  const noiseSrc=ctx.createBufferSource(); noiseSrc.buffer=buf;
  const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.Q.value=3;
  lp.frequency.setValueAtTime(80,t); lp.frequency.exponentialRampToValueAtTime(7000,t+0.65); lp.frequency.exponentialRampToValueAtTime(1800,t+dur);
  const noiseGain=ctx.createGain();
  noiseGain.gain.setValueAtTime(0,t); noiseGain.gain.linearRampToValueAtTime(0.08,t+0.12); noiseGain.gain.linearRampToValueAtTime(0.10,t+0.55); noiseGain.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  noiseSrc.connect(lp); lp.connect(noiseGain); noiseGain.connect(ctx.destination); noiseSrc.start(t); noiseSrc.stop(t+dur);
  const sweep=ctx.createOscillator(); sweep.type="sawtooth";
  sweep.frequency.setValueAtTime(60,t); sweep.frequency.exponentialRampToValueAtTime(900,t+0.7); sweep.frequency.exponentialRampToValueAtTime(350,t+dur);
  const sweepFilter=ctx.createBiquadFilter(); sweepFilter.type="lowpass";
  sweepFilter.frequency.setValueAtTime(150,t); sweepFilter.frequency.exponentialRampToValueAtTime(3500,t+0.7); sweepFilter.frequency.exponentialRampToValueAtTime(800,t+dur);
  const sweepGain=ctx.createGain();
  sweepGain.gain.setValueAtTime(0,t); sweepGain.gain.linearRampToValueAtTime(0.05,t+0.06); sweepGain.gain.linearRampToValueAtTime(0.07,t+0.5); sweepGain.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  sweep.connect(sweepFilter); sweepFilter.connect(sweepGain); sweepGain.connect(ctx.destination); sweep.start(t); sweep.stop(t+dur);
  [392,523,659,784,1047].forEach((freq,i)=>{
    const sp=ctx.createOscillator(); sp.type="sine"; sp.frequency.value=freq;
    const spGain=ctx.createGain(), onset=0.55+i*0.07;
    spGain.gain.setValueAtTime(0,t+onset); spGain.gain.linearRampToValueAtTime(0.03,t+onset+0.04); spGain.gain.exponentialRampToValueAtTime(0.0001,t+onset+0.45);
    sp.connect(spGain); spGain.connect(ctx.destination); sp.start(t+onset); sp.stop(t+onset+0.5);
  });
}
function playWinSound(ctx: AudioContext, muted: boolean) {
  if (muted) return;
  const t=ctx.currentTime, sr=ctx.sampleRate;
  const cLen=Math.floor(sr*0.018), cBuf=ctx.createBuffer(1,cLen,sr), cd=cBuf.getChannelData(0);
  for(let i=0;i<cLen;i++) cd[i]=(Math.random()*2-1)*Math.pow(1-i/cLen,1.5);
  const cs=ctx.createBufferSource(); cs.buffer=cBuf;
  const cbp=ctx.createBiquadFilter(); cbp.type="bandpass"; cbp.frequency.value=5000; cbp.Q.value=0.6;
  const cg=ctx.createGain(); cg.gain.setValueAtTime(0.35,t); cg.gain.exponentialRampToValueAtTime(0.0001,t+0.018);
  cs.connect(cbp); cbp.connect(cg); cg.connect(ctx.destination); cs.start(t);
  [311,415,523,622,784].forEach((freq,i)=>{
    const sp=ctx.createOscillator(); sp.type="sine"; sp.frequency.value=freq;
    const sg=ctx.createGain(), onset=0.05+i*0.07;
    sg.gain.setValueAtTime(0,t+onset); sg.gain.linearRampToValueAtTime(0.06,t+onset+0.02); sg.gain.exponentialRampToValueAtTime(0.0001,t+onset+0.5);
    sp.connect(sg); sg.connect(ctx.destination); sp.start(t+onset); sp.stop(t+onset+0.55);
  });
}

// ─── Vertical reel item — Cases.tsx VerticalReelItemBox clone ──────────────────

function VertReelItem({ item }: { item: BattleItem }) {
  const isOrb = item.id === "__orb__";
  const hex = isOrb ? "#fbbf24" : (RARITY_COLOR[item.rarity] ?? "#888");
  return (
    <div className="flex-shrink-0 flex items-center justify-center" style={{ height: VERT_ITEM_H, width: "100%" }}>
      <div style={{ filter: `drop-shadow(0 0 10px ${hex}aa)` }}>
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.name} style={{ width: 52, height: 52, objectFit: "contain", imageRendering: isOrb ? "auto" : "pixelated" }} />
          : <div style={{ width: 44, height: 44, backgroundColor: hex, borderRadius: 8 }} />}
      </div>
    </div>
  );
}

// ─── VertReelColumn — strip animation only, no triangles (placed inside SharedReelBar) ─

interface VertReelColumnProps {
  caseItems: CaseItem[];
  result: BattleItem;
  resultChance?: number;
  audioCtx: AudioContext | null;
  mutedRef: React.MutableRefObject<boolean>;
  onBonusStart?: () => void;
  onBonusEnd?: () => void;
  onDone?: () => void; // fires after full sequence (main OR bonus)
}

function VertReelColumn({ caseItems, result, resultChance, audioCtx, mutedRef, onBonusStart, onBonusEnd, onDone }: VertReelColumnProps) {
  const resultIsRare = resultChance !== undefined && resultChance <= ORB_THRESHOLD;
  const mainStrip = useMemo(() => buildStrip(caseItems, result, resultIsRare), []);
  const [currentStrip, setCurrentStrip] = useState<BattleItem[]>(mainStrip);
  const [showOrbOverlay, setShowOrbOverlay] = useState(false);
  const [bonusLabel, setBonusLabel] = useState(false);

  const stripRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const allRafs = useRef<number[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastTickIdx = useRef(-1);

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms); timers.current.push(id); return id;
  };
  const startTick = (el: HTMLDivElement) => {
    cancelAnimationFrame(rafRef.current); lastTickIdx.current = -1;
    const loop = () => {
      const mat = window.getComputedStyle(el).transform;
      if (mat && mat !== "none") {
        const vals = mat.match(/matrix.*\((.+)\)/)?.[1].split(",");
        // vals[5] = ty for matrix(a,b,c,d,tx,ty)
        const rawY = vals ? Math.abs(parseFloat(vals[5] ?? "0")) : 0;
        const idx = Math.floor(rawY / VERT_ITEM_H);
        if (idx !== lastTickIdx.current && idx > 0 && audioCtx) {
          lastTickIdx.current = idx; playTick(audioCtx, mutedRef.current);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };
  const stopTick = () => cancelAnimationFrame(rafRef.current);

  useEffect(() => {
    const el = stripRef.current; if (!el) return;
    const MAIN_DUR = 2200;
    const RANDOM_OFFSET = Math.floor(Math.random() * 60) - 30;
    const mainTarget = WINNING_IDX * VERT_ITEM_H + RANDOM_OFFSET;

    // Pre-position — Cases.tsx: translateY(0) for vertical
    el.style.transition = "none"; el.style.transform = "translateY(0)";

    const r1 = requestAnimationFrame(() => { allRafs.current.push(r1);
      const r2 = requestAnimationFrame(() => { allRafs.current.push(r2);
        el.style.transition = `transform ${MAIN_DUR}ms cubic-bezier(0.08,0.82,0.15,1)`;
        el.style.transform = `translateY(-${mainTarget}px)`;
        startTick(el);

        later(() => {
          stopTick();
          el.style.transition = "transform 300ms cubic-bezier(0.25,0,0,1)";
          el.style.transform = `translateY(-${WINNING_IDX*VERT_ITEM_H}px)`;
          if (audioCtx) playStopClick(audioCtx, mutedRef.current);

          if (!resultIsRare) {
            later(() => { onDone?.(); }, 320);
            return;
          }

          // Rare: orb overlay (Cases.tsx bonus_orb)
          later(() => {
            setShowOrbOverlay(true);
            if (audioCtx) playBonusSwoosh(audioCtx, mutedRef.current);
            onBonusStart?.();

            // Build bonus strip — rare-only pool, real item at WINNING_IDX
            const rarePool = caseItems.filter(ci => ci.chance <= ORB_THRESHOLD);
            const pool = rarePool.length > 0 ? rarePool : caseItems;
            const bonusStrip: BattleItem[] = Array.from({ length: ITEM_COUNT }, () => pool[Math.floor(Math.random()*pool.length)]);
            bonusStrip[WINNING_IDX] = result;

            later(() => {
              setShowOrbOverlay(false);
              setCurrentStrip(bonusStrip);
              setBonusLabel(true);
              el.style.transition = "none"; el.style.transform = "translateY(0)";
              const BONUS_DUR = 1800;
              const bonusOffset = Math.floor(Math.random()*60)-30;
              const bonusTarget = WINNING_IDX*VERT_ITEM_H+bonusOffset;
              const b1 = requestAnimationFrame(() => { allRafs.current.push(b1);
                const b2 = requestAnimationFrame(() => { allRafs.current.push(b2);
                  el.style.transition = `transform ${BONUS_DUR}ms cubic-bezier(0.08,0.82,0.15,1)`;
                  el.style.transform = `translateY(-${bonusTarget}px)`;
                  startTick(el);
                  later(() => {
                    stopTick();
                    el.style.transition = "transform 300ms cubic-bezier(0.25,0,0,1)";
                    el.style.transform = `translateY(-${WINNING_IDX*VERT_ITEM_H}px)`;
                    if (audioCtx) playStopClick(audioCtx, mutedRef.current);
                    setBonusLabel(false);
                    onBonusEnd?.();
                    later(() => { onDone?.(); }, 320);
                  }, BONUS_DUR+60);
                });
              });
            }, 1200);
          }, 360);
        }, MAIN_DUR+60);
      });
    });

    return () => {
      allRafs.current.forEach(cancelAnimationFrame); stopTick();
      timers.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div style={{ position:"relative", height:VERT_ITEM_H, overflow:"hidden", background:REEL_BG }}>
      {/* Vertical strip — flex column, same as Cases.tsx */}
      <div ref={stripRef} style={{ display:"flex", flexDirection:"column" }}>
        {currentStrip.map((item, i) => <VertReelItem key={i} item={item} />)}
      </div>

      {/* Orb overlay — Cases.tsx bonus_orb modal */}
      <AnimatePresence>
        {showOrbOverlay && (
          <motion.div key="orb-overlay"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
            style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(1px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:20}}>
            <motion.img key="big-orb" src={bigOrbSrc} alt="Orb"
              initial={{scale:0.4,opacity:0}} animate={{scale:1,opacity:1}}
              transition={{type:"spring",stiffness:260,damping:18,delay:0.05}}
              style={{width:80,height:80,objectFit:"contain",imageRendering:"pixelated",filter:"drop-shadow(0 0 20px rgba(251,191,36,0.9)) drop-shadow(0 0 40px rgba(251,191,36,0.5))"}} />
          </motion.div>
        )}
      </AnimatePresence>

      {bonusLabel && (
        <div style={{position:"absolute",bottom:6,left:0,right:0,textAlign:"center",zIndex:15,pointerEvents:"none"}}>
          <span style={{fontSize:9,fontWeight:900,color:"#fbbf24",letterSpacing:"0.1em",textTransform:"uppercase",textShadow:"0 0 8px rgba(251,191,36,0.7)"}}>BONUS!</span>
        </div>
      )}
    </div>
  );
}

// ─── SharedReelBar — Cases.tsx exact vertical layout ─────────────────────────
// One set of triangles spanning all columns, lozenge separators between each column.

interface ReelEntry {
  key: string;
  caseItems: CaseItem[];
  result: BattleItem;
  resultChance?: number;
  audioCtx: AudioContext | null;
  mutedRef: React.MutableRefObject<boolean>;
  isMaster: boolean; // col[0] fires onDone
  onBonusStart?: () => void;
  onBonusEnd?: () => void;
  onDone?: () => void;
}

function SharedReelBar({ columns, triColor }: { columns: ReelEntry[]; triColor: string }) {
  return (
    // Cases.tsx: position:relative wraps triangles; inner flex holds columns + lozenges
    <div style={{ position: "relative", height: VERT_ITEM_H }}>
      {/* Left → triangle (Cases.tsx style) */}
      <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:0, height:0, borderTop:"12px solid transparent", borderBottom:"12px solid transparent", borderLeft:`14px solid ${triColor}`, zIndex:200, pointerEvents:"none" }} />
      {/* Right ← triangle */}
      <div style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", width:0, height:0, borderTop:"12px solid transparent", borderBottom:"12px solid transparent", borderRight:`14px solid ${triColor}`, zIndex:200, pointerEvents:"none" }} />

      <div style={{ display:"flex", height:"100%" }}>
        {columns.map((col, idx) => (
          <React.Fragment key={col.key}>
            {idx > 0 && (
              // Lozenge separator — Cases.tsx exact
              <div style={{ width:28, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", zIndex:10, position:"relative" }}>
                <div style={{ width:22, height:12, background:triColor, clipPath:"polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} />
              </div>
            )}
            {/* column wrapper: overflow:visible outside, overflow:hidden inside (Cases.tsx) */}
            <div style={{ flex:1, minWidth:0, position:"relative", overflow:"visible" }}>
              <VertReelColumn
                caseItems={col.caseItems}
                result={col.result}
                resultChance={col.resultChance}
                audioCtx={col.audioCtx}
                mutedRef={col.mutedRef}
                onBonusStart={col.onBonusStart}
                onBonusEnd={col.onBonusEnd}
                onDone={col.isMaster ? col.onDone : undefined}
              />
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Item mini card (for done state history grid) ──────────────────────────────

function ItemCard({ item, chance }: { item: BattleItem; chance?: number }) {
  const c = RARITY_COLOR[item.rarity] ?? "#888";
  return (
    <div className="flex items-center gap-1.5 rounded-md px-1.5 py-1 border border-border/20 bg-background/30 hover:bg-background/50 transition-colors min-w-0">
      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded" style={{ background: `${c}18`, borderBottom: `2px solid ${c}88` }}>
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.name} style={{ width: 20, height: 20, objectFit: "contain", imageRendering: "pixelated" }} />
          : <div className="w-4 h-4 rounded" style={{ backgroundColor: c }} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-semibold truncate leading-tight" style={{ color: c }}>{item.name}</div>
        <div className="text-[9px] text-muted-foreground/70 flex items-center gap-0.5"><ValDisplay value={item.value} size={8} /></div>
      </div>
      {chance != null && <div className="text-[8px] text-muted-foreground/30 flex-shrink-0">{chance.toFixed(2)}%</div>}
    </div>
  );
}

// ─── Lobby Slot ─────────────────────────────────────────────────────────────────

function LobbySlot({ player, teamIndex, isCreator, addingBot, onAddBot }: {
  player?: BattlePlayer; teamIndex: number; isCreator: boolean; addingBot: boolean; onAddBot: () => void;
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

export function BattleScreen({ battle: initialBattle, currentUserId, isCreator=false, onAddBot, onLeave, onCopyBattle, onModifyBattle, onClose }: Props) {
  const [liveBattle, setLiveBattle]       = useState<BattleResult>(initialBattle);
  const [animBattle, setAnimBattle]       = useState<BattleResult|null>(initialBattle.status==="completed" ? initialBattle : null);
  const [phase, setPhase]                 = useState<"waiting"|"countdown"|"playing"|"tiebreaker_pending"|"tiebreaker"|"done">(
    initialBattle.status==="completed" ? "countdown" : "waiting"
  );
  const [countdown, setCountdown]         = useState(3);
  const [currentRound, setCurrentRound]   = useState(0);
  const [spinDone, setSpinDone]           = useState(false);
  const [revealedRounds, setRevealedRounds] = useState(0);
  const [showWinner, setShowWinner]       = useState(false);
  const [bonusActive, setBonusActive]     = useState(false);
  const [addingBot, setAddingBot]         = useState(false);
  const [leaving, setLeaving]             = useState(false);
  const [leaveConfirm, setLeaveConfirm]   = useState(false);
  const [muted, setMuted]                 = useState(false);

  const timerRef    = useRef<ReturnType<typeof setTimeout>|null>(null);
  const pollRef     = useRef<ReturnType<typeof setInterval>|null>(null);
  const audioCtxRef = useRef<AudioContext|null>(null);
  const mutedRef    = useRef(false);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = createAudioCtx();
    if (audioCtxRef.current?.state==="suspended") audioCtxRef.current.resume();
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current; setMuted(mutedRef.current);
  }, []);

  const tick = useCallback((fn: ()=>void, ms: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fn, ms);
  }, []);

  // Poll for waiting battles
  useEffect(() => {
    if (phase!=="waiting") return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/battles/${liveBattle.id}`);
        if (res.ok) {
          const data: BattleResult = await res.json();
          setLiveBattle(data);
          if (data.status==="completed") {
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
    if (phase!=="countdown") return;
    if (countdown<=0) { setPhase("playing"); return; }
    tick(() => setCountdown(c=>c-1), 900);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, countdown]);

  // Check when all rounds done
  useEffect(() => {
    if (phase!=="playing"||!animBattle) return;
    const total = animBattle.rounds?.length??0;
    if (currentRound>=total) {
      if (animBattle.isDraw) { tick(()=>setPhase("tiebreaker_pending"),800); }
      else { tick(()=>{ setShowWinner(true); setPhase("done"); if(audioCtxRef.current) playWinSound(audioCtxRef.current,mutedRef.current); },1000); }
    }
  }, [phase, currentRound, animBattle]);

  useEffect(() => {
    if (phase!=="tiebreaker_pending") return;
    const t=setTimeout(()=>setPhase("tiebreaker"),500); return ()=>clearTimeout(t);
  }, [phase]);

  // Master callback — fires when full spin sequence is complete (incl. bonus)
  const handleDone = useCallback(() => {
    if (phase==="tiebreaker") {
      tick(()=>{ setShowWinner(true); setPhase("done"); if(audioCtxRef.current) playWinSound(audioCtxRef.current,mutedRef.current); },400);
      return;
    }
    setSpinDone(true);
    setRevealedRounds(r=>r+1);
    tick(()=>{ setSpinDone(false); setCurrentRound(r=>r+1); }, 900);
  }, [phase, tick]);

  const handleAddBot = useCallback(async ()=>{
    if (!onAddBot||addingBot) return; initAudio(); setAddingBot(true);
    try {
      const result = await onAddBot(liveBattle.id);
      if (result) {
        setLiveBattle(result as BattleResult);
        if ((result as BattleResult).status==="completed") { setAnimBattle(result as BattleResult); setPhase("countdown"); }
      }
    } finally { setAddingBot(false); }
  }, [onAddBot,addingBot,liveBattle.id,initAudio]);

  const handleLeave = useCallback(async ()=>{
    if (!onLeave||leaving) return; setLeaving(true);
    try { await onLeave(liveBattle.id); onClose(); }
    finally { setLeaving(false); setLeaveConfirm(false); }
  }, [onLeave,leaving,liveBattle.id,onClose]);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const battle = animBattle ?? liveBattle;
  const players = battle.players;
  const rounds  = animBattle?.rounds ?? [];
  const totalRounds = rounds.length;
  const winnerTeamIndex = battle.winnerTeamIndex;
  const gameMode = liveBattle.gameMode || "1v1";
  const battleType = liveBattle.battleType ?? (liveBattle.isShared ? "shared" : "normal");
  const maxPlayers = liveBattle.maxPlayers;
  const numTeams = getNumTeams(gameMode);
  const playersPerTeam = getPlayersPerTeam(gameMode);

  // Sorted players
  const sortedPlayers = useMemo(() =>
    [...players].sort((a,b)=>(a.slotIndex??0)-(b.slotIndex??0)), [players]);

  const teamIndices = useMemo(() =>
    [...new Set(sortedPlayers.map(p=>p.teamIndex))].sort(), [sortedPlayers]);

  const currentRoundData = (phase==="tiebreaker"||phase==="tiebreaker_pending")
    ? rounds[rounds.length-1]??null
    : rounds[currentRound]??null;

  const caseForRound = (phase==="tiebreaker"||phase==="tiebreaker_pending")
    ? (animBattle?.cases?.[rounds.length-1]??animBattle?.cases?.[0])
    : (animBattle?.cases?.[currentRound]??animBattle?.cases?.[0]);
  const caseItemsForRound: CaseItem[] = (caseForRound?.items??[]) as CaseItem[];

  const occupiedSlots = useMemo(()=>{
    const m=new Map<number,BattlePlayer>();
    for(const p of liveBattle.players) m.set(p.slotIndex??0,p);
    return m;
  },[liveBattle.players]);

  const totalPrize = useMemo(()=>
    (liveBattle.cases??[]).reduce((s,c)=>s+(c.price??0),0)*maxPlayers, [liveBattle.cases,maxPlayers]);

  // Triangle color: gold during bonus, purple otherwise
  const triColor = bonusActive ? "#fbbf24" : "#a78bfa";

  // Build reel entries for SharedReelBar
  const reelEntries = useMemo((): ReelEntry[] => {
    if (!animBattle||!currentRoundData) return [];
    return sortedPlayers.map((player,idx)=>{
      const result = currentRoundData.results.find(r=>String(r.userId)===String(player.userId))?.item??null;
      if (!result) return null;
      const catalogItem = caseItemsForRound.find(ci=>ci.id===result.id||(ci.name===result.name&&ci.value===result.value));
      return {
        key: `${player.userId}-${currentRound}`,
        caseItems: caseItemsForRound,
        result,
        resultChance: (catalogItem as any)?.chance,
        audioCtx: idx===0 ? audioCtxRef.current : null,
        mutedRef,
        isMaster: idx===0,
        onBonusStart: idx===0 ? ()=>setBonusActive(true) : undefined,
        onBonusEnd:   idx===0 ? ()=>setBonusActive(false) : undefined,
        onDone: idx===0 ? handleDone : undefined,
      };
    }).filter(Boolean) as ReelEntry[];
  }, [animBattle, currentRoundData, sortedPlayers, caseItemsForRound, currentRound, handleDone]);

  // Item lookup helper
  const getPlayerRoundItem = useCallback((player: BattlePlayer, roundIdx: number) => {
    const round = rounds[roundIdx];
    if (!round) return null;
    const res = round.results.find(r=>String(r.userId)===String(player.userId));
    if (!res) return null;
    const catalogItem = animBattle?.cases?.[roundIdx]?.items.find(ci=>ci.id===res.item.id||(ci.name===res.item.name&&ci.value===res.item.value));
    return { item: res.item, chance: (catalogItem as any)?.chance };
  }, [rounds, animBattle]);

  const isPlaying = phase==="playing"||phase==="tiebreaker"||phase==="tiebreaker_pending";

  return (
    // z-[70] — above sidebar z-[60] and mobile backdrop z-[55]
    <div className="fixed inset-0 z-[70] flex flex-col bg-background" onClick={initAudio}>

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 h-11 border-b border-border/20 bg-card/60 backdrop-blur">
        <button onClick={onClose}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs font-bold px-2 h-8 rounded-md hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />Back
        </button>
        {/* Case pills */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 scrollbar-none">
          {liveBattle.cases?.map((c,i)=>{
            const active=(isPlaying)&&i===(phase==="tiebreaker"?rounds.length-1:currentRound);
            return (
              <div key={c.id} className={`flex-shrink-0 flex items-center gap-1 rounded-md px-1.5 py-0.5 border text-[10px] font-semibold transition-all ${
                active?"border-primary bg-primary/15 text-foreground":"border-border/30 text-muted-foreground/50"}`}>
                <Package className={`w-2.5 h-2.5 ${active?"text-primary":""}`} />
                <span className="truncate max-w-[60px]">{c.name}</span>
              </div>
            );
          })}
        </div>
        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className="text-[10px] font-bold h-5 px-1.5">{gameMode}</Badge>
          {battleType!=="normal" && (
            <Badge className={`text-[10px] font-bold h-5 px-1.5 border ${
              battleType==="shared"?"bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
              :battleType==="top_pull"?"bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
              :battleType==="crazy"?"bg-purple-500/20 text-purple-300 border-purple-500/40"
              :"bg-orange-500/20 text-orange-300 border-orange-500/40"}`}>
              {battleType==="shared"?"SHARED":battleType==="top_pull"?"TOP PULL":battleType==="crazy"?"🃏 CRAZY":"TERMINAL"}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-0.5">
            <ValDisplay value={totalPrize} size={10}/>
          </span>
          <button onClick={e=>{e.stopPropagation();toggleMute();initAudio();}}
            className="w-7 h-7 rounded-md border border-border/30 bg-background/40 flex items-center justify-center hover:border-primary/50 transition-all">
            {muted?<VolumeX className="w-3.5 h-3.5 text-muted-foreground"/>:<Volume2 className="w-3.5 h-3.5"/>}
          </button>
        </div>
      </div>

      {/* ── WAITING LOBBY ──────────────────────────────────────────── */}
      {phase==="waiting" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-6">
          <div className="text-center">
            <div className="text-xl font-black mb-1">Waiting for players...</div>
            <div className="text-sm text-muted-foreground">{isCreator?"Add bots to fill slots, or wait for others.":"Waiting for the host to start."}</div>
          </div>
          <div className="flex gap-3 w-full max-w-2xl">
            {Array.from({length:numTeams},(_,teamIdx)=>{
              const ppTeam=maxPlayers/numTeams;
              return (
                <React.Fragment key={teamIdx}>
                  {teamIdx>0&&<div className="flex items-center px-1"><div className="text-xl font-black text-muted-foreground/30">VS</div></div>}
                  <div className="flex gap-2 flex-1">
                    {Array.from({length:ppTeam},(_,pi)=>{
                      const slotIdx=teamIdx*ppTeam+pi;
                      return <LobbySlot key={slotIdx} teamIndex={teamIdx} player={occupiedSlots.get(slotIdx)} isCreator={isCreator} addingBot={addingBot} onAddBot={handleAddBot}/>;
                    })}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          {onLeave&&!leaveConfirm&&(
            <button onClick={()=>setLeaveConfirm(true)} className="text-xs text-muted-foreground/40 hover:text-red-400 transition-colors flex items-center gap-1.5 mt-2">
              <LogOut className="w-3.5 h-3.5"/>Leave battle
            </button>
          )}
          {onLeave&&leaveConfirm&&(
            <div className="flex flex-col items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3">
              <div className="text-sm font-semibold text-red-400">{isCreator?"Cancel and refund everyone?":"Leave and get refunded?"}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={()=>setLeaveConfirm(false)} disabled={leaving}>Stay</Button>
                <Button size="sm" onClick={handleLeave} disabled={leaving} className="bg-red-600 hover:bg-red-700 text-white gap-1.5">
                  {leaving?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<LogOut className="w-3.5 h-3.5"/>}
                  {isCreator?"Cancel":"Leave"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── COUNTDOWN ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase==="countdown"&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <AnimatePresence mode="wait">
              <motion.div key={countdown}
                initial={{scale:2.5,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.5,opacity:0}} transition={{duration:0.5}}
                className="text-8xl font-black text-primary drop-shadow-[0_0_60px_rgba(139,92,246,0.9)]">
                {countdown===0?"GO!":countdown}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PLAYING — Battle animation ─────────────────────────────── */}
      {(isPlaying||phase==="done")&&animBattle&&(
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* DRAW overlay */}
          <AnimatePresence>
            {(phase==="tiebreaker"||phase==="tiebreaker_pending")&&!showWinner&&(
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="absolute inset-x-0 top-14 z-[5] flex justify-center pointer-events-none">
                <motion.div initial={{scale:0.6,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",stiffness:260,damping:18}}
                  className="flex items-center gap-3 bg-background/80 backdrop-blur px-6 py-2.5 rounded-2xl border border-yellow-500/30">
                  <span className="text-2xl">🤝</span>
                  <span className="text-2xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]">DRAW!</span>
                  <span className="text-sm font-bold text-muted-foreground animate-pulse">Tiebreaker...</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── DONE STATE: Winners panel + item grid ─────────────── */}
          {phase==="done"&&showWinner ? (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">

              {/* Winners panel */}
              <div className="flex-shrink-0 border-b border-border/20 bg-card/30 px-4 py-4">
                <div className="text-center mb-3">
                  <span className="text-lg font-black text-foreground tracking-wide">
                    {battleType==="shared" ? "🤝 Shared!" : "🏆 Winners"}
                  </span>
                </div>

                {/* Winner cards */}
                {battleType==="shared" ? (
                  <div className="text-center text-sm text-muted-foreground">
                    Everyone gets <span className="font-bold text-foreground"><ValDisplay value={Math.floor(totalPrize/Math.max(sortedPlayers.filter(p=>!p.isBot).length,1))} size={12}/></span>
                  </div>
                ) : winnerTeamIndex!==undefined && (
                  <div className="flex justify-center gap-3 flex-wrap">
                    {sortedPlayers.filter(p=>p.teamIndex===winnerTeamIndex).map(winner=>{
                      const tc=TEAM_COLORS[winner.teamIndex%TEAM_COLORS.length]??TEAM_COLORS[0];
                      const isMe=String(winner.userId)===String(currentUserId);
                      const bestItem=rounds.length>0
                        ?[...Array(rounds.length)].map((_,ri)=>getPlayerRoundItem(winner,ri)?.item).filter(Boolean).sort((a,b)=>(b?.value??0)-(a?.value??0))[0]??null
                        :null;
                      return (
                        <motion.div key={winner.userId}
                          initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",stiffness:260,damping:18}}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-3 min-w-[90px] ${tc.border} ${tc.bg}`}>
                          <div className={`w-9 h-9 rounded-full border-2 ${tc.border} ${tc.bg} flex items-center justify-center font-black text-base ${tc.text}`}>
                            {winner.username.charAt(0).toUpperCase()}
                          </div>
                          {bestItem?.imageUrl&&(
                            <img src={bestItem.imageUrl} alt={bestItem.name} style={{width:36,height:36,objectFit:"contain",imageRendering:"pixelated",filter:`drop-shadow(0 0 6px ${RARITY_COLOR[bestItem.rarity]??'#888'}aa)`}}/>
                          )}
                          <div className={`text-[11px] font-bold ${tc.text} truncate max-w-[80px] text-center`}>{isMe?"You 🎉":winner.username}</div>
                          <div className="text-[10px] text-muted-foreground"><ValDisplay value={winner.totalValue} size={9}/></div>
                          {winner.teamIndex===winnerTeamIndex&&<Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400"/>}
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-center gap-2 mt-3">
                  {onCopyBattle&&(
                    <Button size="sm" variant="outline" onClick={()=>onCopyBattle(animBattle)} className="gap-1.5 text-xs">
                      <Copy className="w-3 h-3"/>Replay battle
                    </Button>
                  )}
                  {onModifyBattle&&isCreator&&(
                    <Button size="sm" onClick={()=>onModifyBattle(animBattle)} className="gap-1.5 text-xs bg-primary hover:bg-primary/90">
                      <Pencil className="w-3 h-3"/>Modify battle
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={onClose} className="text-xs">Close</Button>
                </div>
              </div>

              {/* All players item grid — round by round */}
              <div className="flex-1 overflow-auto min-h-0">
                {/* Player headers row */}
                <div className="flex border-b border-border/20 bg-card/20 sticky top-0 z-10">
                  {sortedPlayers.map((player,pi)=>{
                    const tc=TEAM_COLORS[player.teamIndex%TEAM_COLORS.length]??TEAM_COLORS[0];
                    const isWinner=winnerTeamIndex!==undefined&&player.teamIndex===winnerTeamIndex;
                    const prevTeam=pi>0?sortedPlayers[pi-1].teamIndex:-1;
                    return (
                      <React.Fragment key={player.userId}>
                        {pi>0&&player.teamIndex!==prevTeam&&(
                          <div className="flex-shrink-0 w-6 flex items-center justify-center bg-background/40 border-x border-border/20">
                            <span className="text-[8px] font-black text-muted-foreground/30 [writing-mode:vertical-lr]">VS</span>
                          </div>
                        )}
                        <div className={`flex-1 flex flex-col items-center py-2 px-1 border-r border-border/10 ${isWinner?tc.bg:""} min-w-0`}>
                          <div className={`w-6 h-6 rounded-full border ${tc.border} ${tc.bg} flex items-center justify-center font-black text-[10px] ${tc.text} mb-0.5`}>
                            {player.username.charAt(0).toUpperCase()}
                          </div>
                          <div className={`text-[9px] font-bold truncate w-full text-center ${tc.text}`}>{player.username}</div>
                          <div className="text-[9px] text-muted-foreground"><ValDisplay value={player.totalValue} size={8}/></div>
                          {isWinner&&<Crown className="w-3 h-3 text-yellow-400 fill-yellow-400 mt-0.5"/>}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Rounds rows */}
                {rounds.map((round, ri)=>(
                  <div key={ri} className="flex border-b border-border/10 hover:bg-white/[0.01]">
                    {sortedPlayers.map((player, pi)=>{
                      const roundItem = getPlayerRoundItem(player, ri);
                      const prevTeam = pi>0?sortedPlayers[pi-1].teamIndex:-1;
                      return (
                        <React.Fragment key={player.userId}>
                          {pi>0&&player.teamIndex!==prevTeam&&(
                            <div className="flex-shrink-0 w-6 border-x border-border/20 bg-background/20"/>
                          )}
                          <div className="flex-1 p-1 border-r border-border/10 min-w-0">
                            {roundItem ? <ItemCard item={roundItem.item} chance={roundItem.chance}/> : <div className="h-8"/>}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // ── PLAYING STATE: reels + item labels ─────────────────
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">

              {/* Round progress dots */}
              {totalRounds>0&&(
                <div className="flex-shrink-0 flex items-center justify-center gap-1.5 py-1.5 border-b border-border/10 bg-background/20">
                  {rounds.map((_,i)=>(
                    <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i<revealedRounds?"bg-primary":i===currentRound&&!spinDone?"bg-primary/50 animate-pulse":"bg-border/30"}`}/>
                  ))}
                  <span className="text-[10px] text-muted-foreground ml-1">
                    Round <span className="text-foreground font-bold">{Math.min(currentRound+1,totalRounds)}</span>/{totalRounds}
                  </span>
                </div>
              )}

              {/* Player headers — compact horizontal row above reel */}
              <div className="flex-shrink-0 flex border-b border-border/10">
                {sortedPlayers.map((player,pi)=>{
                  const tc=TEAM_COLORS[player.teamIndex%TEAM_COLORS.length]??TEAM_COLORS[0];
                  const isWinner=showWinner&&winnerTeamIndex!==undefined&&player.teamIndex===winnerTeamIndex;
                  const isLoser=showWinner&&winnerTeamIndex!==undefined&&player.teamIndex!==winnerTeamIndex;
                  const prevTeam=pi>0?sortedPlayers[pi-1].teamIndex:-1;
                  return (
                    <React.Fragment key={player.userId}>
                      {pi>0&&player.teamIndex!==prevTeam&&(
                        <div className="flex-shrink-0 w-6 flex items-center justify-center border-x border-border/20 bg-background/40">
                          <span className="text-[8px] font-black text-muted-foreground/30 [writing-mode:vertical-lr]">VS</span>
                        </div>
                      )}
                      <div className={`flex-1 flex items-center justify-between gap-1 px-2 py-1.5 border-r border-border/10 min-w-0 transition-all ${
                        isLoser?"opacity-30":""} ${isWinner?tc.bg:""}`}>
                        <div className="flex items-center gap-1 min-w-0">
                          <div className={`w-4 h-4 rounded-full border ${tc.border} ${tc.bg} flex-shrink-0 flex items-center justify-center font-black text-[9px] ${tc.text}`}>
                            {player.username.charAt(0).toUpperCase()}
                          </div>
                          <span className={`text-[10px] font-bold truncate ${tc.text}`}>{player.username}</span>
                          {isWinner&&<Crown className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0"/>}
                          {player.isBot&&<Bot className="w-2.5 h-2.5 text-muted-foreground/40 flex-shrink-0"/>}
                        </div>
                        <span className="text-[9px] flex-shrink-0 text-muted-foreground"><ValDisplay value={player.totalValue} size={8}/></span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Shared reel bar — Cases.tsx exact layout with shared triangles + lozenge separators */}
              <div className="flex-shrink-0">
                {reelEntries.length>0 ? (
                  <SharedReelBar
                    key={phase==="tiebreaker" ? currentRound+1000 : currentRound}
                    columns={reelEntries}
                    triColor={triColor}
                  />
                ) : (
                  // Placeholder before first round
                  <div style={{position:"relative",height:VERT_ITEM_H,background:REEL_BG,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:0,height:0,borderTop:"12px solid transparent",borderBottom:"12px solid transparent",borderLeft:`14px solid ${triColor}40`,zIndex:100}}/>
                    <div style={{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",width:0,height:0,borderTop:"12px solid transparent",borderBottom:"12px solid transparent",borderRight:`14px solid ${triColor}40`,zIndex:100}}/>
                    <Package className="w-8 h-8 text-muted-foreground/20"/>
                  </div>
                )}
              </div>

              {/* Item labels row — shows after each spin completes */}
              <div className="flex-shrink-0 flex border-b border-border/10">
                {sortedPlayers.map((player,pi)=>{
                  const roundResult=currentRoundData?.results.find(r=>String(r.userId)===String(player.userId))?.item??null;
                  const rc=roundResult?(RARITY_COLOR[roundResult.rarity]??"#888"):undefined;
                  const prevTeam=pi>0?sortedPlayers[pi-1].teamIndex:-1;
                  return (
                    <React.Fragment key={player.userId}>
                      {pi>0&&player.teamIndex!==prevTeam&&(
                        <div className="flex-shrink-0 w-6 border-x border-border/20 bg-background/20"/>
                      )}
                      <div className="flex-1 h-9 flex flex-col items-center justify-center border-r border-border/10 bg-background/30 min-w-0 px-1">
                        {spinDone&&roundResult?(
                          <>
                            <div className="text-[9px] font-bold truncate w-full text-center leading-tight" style={{color:rc}}>{roundResult.name}</div>
                            <div className="text-[9px] text-muted-foreground/70"><ValDisplay value={roundResult.value} size={8}/></div>
                          </>
                        ):(
                          <div className="text-[9px] text-muted-foreground/20">—</div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Revealed items history — round rows */}
              <div className="flex-1 overflow-auto min-h-0">
                {revealedRounds===0?(
                  <div className="flex items-center justify-center h-full text-muted-foreground/20 text-sm">Items will appear here...</div>
                ):(
                  rounds.slice(0,revealedRounds).map((_,ri)=>{
                    const roundIdx=revealedRounds-1-ri; // most recent first
                    return (
                      <div key={roundIdx} className="flex border-b border-border/10 hover:bg-white/[0.01]">
                        {sortedPlayers.map((player,pi)=>{
                          const roundItem=getPlayerRoundItem(player,roundIdx);
                          const prevTeam=pi>0?sortedPlayers[pi-1].teamIndex:-1;
                          return (
                            <React.Fragment key={player.userId}>
                              {pi>0&&player.teamIndex!==prevTeam&&(
                                <div className="flex-shrink-0 w-6 border-x border-border/20 bg-background/20"/>
                              )}
                              <div className="flex-1 p-1 border-r border-border/10 min-w-0">
                                {roundItem?<ItemCard item={roundItem.item} chance={roundItem.chance}/>:<div className="h-8"/>}
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
