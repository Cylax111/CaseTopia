import { Router, type IRouter } from "express";
import { db, usersTable, gameBetsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "./auth";

const router: IRouter = Router();

const COLS = 5;
const ROWS = 3;

const PAYTABLE: Record<number, Record<number, number>> = {
  0: { 3: 10, 4: 50,  5: 200 },
  1: { 3: 5,  4: 25,  5: 100 },
  2: { 3: 3,  4: 15,  5: 50  },
  3: { 3: 2,  4: 10,  5: 30  },
  4: { 2: 2,  3: 8,   4: 20,  5: 200 },
  5: { 3: 1,  4: 5,   5: 10  },
  6: { 3: 1,  4: 4,   5: 8   },
  7: { 3: 1,  4: 3,   5: 5   },
  8: { 3: 0.5,4: 2,   5: 3   },
};

const PAYLINES = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 0, 1, 0],
];

const WEIGHTS = [2, 4, 6, 8, 4, 15, 15, 22, 24];
const TOTAL_WEIGHT = WEIGHTS.reduce((a, b) => a + b, 0);

function weightedRandom(): number {
  let r = Math.random() * TOTAL_WEIGHT;
  for (let i = 0; i < WEIGHTS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return i;
  }
  return WEIGHTS.length - 1;
}

function generateGrid(): number[][] {
  return Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => weightedRandom())
  );
}

interface WinLine {
  lineIndex: number;
  symbol: number;
  count: number;
  positions: [number, number][];
  multiplier: number;
  winAmount: number;
}

function calculateWins(grid: number[][], bet: number): { wins: WinLine[]; totalWin: number; bookCount: number } {
  const wins: WinLine[] = [];
  let totalWin = 0;
  const BOOK = 4;

  for (let li = 0; li < PAYLINES.length; li++) {
    const line = PAYLINES[li];
    let count = 0;
    let symbol = -1;
    const positions: [number, number][] = [];

    for (let reel = 0; reel < COLS; reel++) {
      const row = line[reel];
      const sym = grid[reel][row];

      if (reel === 0) {
        symbol = sym === BOOK ? -1 : sym;
        count = 1;
        positions.push([reel, row]);
      } else {
        if (sym === BOOK || sym === symbol || (symbol === -1 && sym !== BOOK)) {
          if (symbol === -1 && sym !== BOOK) symbol = sym;
          count++;
          positions.push([reel, row]);
        } else {
          break;
        }
      }
    }

    if (symbol === -1) symbol = BOOK;
    if (count >= 3 && PAYTABLE[symbol]?.[count]) {
      const multiplier = PAYTABLE[symbol][count];
      const winAmount = parseFloat((bet * multiplier).toFixed(4));
      totalWin += winAmount;
      wins.push({ lineIndex: li, symbol, count, positions, multiplier, winAmount });
    }
  }

  let bookCount = 0;
  for (let reel = 0; reel < COLS; reel++)
    for (let row = 0; row < ROWS; row++)
      if (grid[reel][row] === BOOK) bookCount++;

  if (bookCount >= 3 && PAYTABLE[BOOK]?.[bookCount]) {
    const scatterWin = parseFloat((bet * PAYTABLE[BOOK][bookCount]).toFixed(4));
    totalWin += scatterWin;
    const positions: [number, number][] = [];
    for (let reel = 0; reel < COLS; reel++)
      for (let row = 0; row < ROWS; row++)
        if (grid[reel][row] === BOOK) positions.push([reel, row]);
    wins.push({ lineIndex: -1, symbol: BOOK, count: bookCount, positions, multiplier: PAYTABLE[BOOK][bookCount], winAmount: parseFloat((bet * PAYTABLE[BOOK][bookCount]).toFixed(4)) });
  }

  return { wins, totalWin: parseFloat(totalWin.toFixed(4)), bookCount };
}

router.post("/slots/egyptian/spin", requireAuth, async (req: any, res) => {
  try {
    const { bet } = req.body;
    if (!bet || bet <= 0 || bet > 10000) {
      res.status(400).json({ error: "Invalid bet" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.balance < bet) { res.status(400).json({ error: "Insufficient balance" }); return; }

    const grid = generateGrid();
    const { wins, totalWin, bookCount } = calculateWins(grid, bet);
    const newBalance = parseFloat((user.balance - bet + totalWin).toFixed(4));

    await db.update(usersTable).set({ balance: newBalance }).where(eq(usersTable.id, req.user.id));

    await db.insert(gameBetsTable).values({
      userId: req.user.id,
      game: "egyptian-gold",
      betAmount: bet,
      multiplier: totalWin > 0 ? parseFloat((totalWin / bet).toFixed(4)) : 0,
      profit: parseFloat((totalWin - bet).toFixed(4)),
    });

    res.json({ grid, wins, totalWin, freeSpins: bookCount >= 3, freeSpinsCount: bookCount >= 3 ? 10 : 0, balance: newBalance });
  } catch (err) {
    res.status(500).json({ error: "Spin failed" });
  }
});

export default router;
