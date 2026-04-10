import { Router, type IRouter } from "express";
import { db, usersTable, ppSessionsTable, ppRoundsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth } from "./auth";

const router: IRouter = Router();

// ── Config ──────────────────────────────────────────────────────────────────
const PP_SECRET_KEY  = process.env.PP_SECRET_KEY  || "";
const PP_PROVIDER_ID = process.env.PP_PROVIDER_ID || "";
const PP_GAME_SERVER = process.env.PP_GAME_SERVER  || "gs2c.pragmaticplaylive.net";
const PP_STYLENAME   = process.env.PP_STYLENAME    || "bettopia";
const SITE_URL       = process.env.SITE_URL        || "https://case-topia.replit.app";

// ── Hash verification (MD5, alphabetically sorted params + secret key) ──────
function computeHash(params: Record<string, string | number>): string {
  const sorted = Object.keys(params).sort();
  const str = sorted.map(k => `${k}=${params[k]}`).join("&") + PP_SECRET_KEY;
  return crypto.createHash("md5").update(str).digest("hex");
}

function validateHash(params: Record<string, string | number>, hash: string): boolean {
  if (!PP_SECRET_KEY) return false;
  return computeHash(params) === hash;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
async function getSessionUser(token: string) {
  const sessions = await db
    .select()
    .from(ppSessionsTable)
    .where(eq(ppSessionsTable.token, token))
    .limit(1);
  if (!sessions.length) return null;
  const session = sessions[0];
  if (session.expiresAt < new Date()) return null;
  const users = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return users.length ? { session, user: users[0] } : null;
}

function errorResponse(code: number, desc: string) {
  return { error: code, description: desc };
}

// ── PP Wallet API Endpoints ──────────────────────────────────────────────────

// POST /api/pragmaticplay/authenticate
router.post("/pragmaticplay/authenticate", async (req, res) => {
  try {
    const { token, providerId, hash } = req.body;
    if (!token || !providerId || !hash) {
      res.json(errorResponse(7, "BadParameters")); return;
    }
    if (PP_PROVIDER_ID && providerId !== PP_PROVIDER_ID) {
      res.json(errorResponse(7, "BadParameters")); return;
    }
    if (!validateHash({ providerId, token }, hash)) {
      res.json(errorResponse(5, "InvalidHashCode")); return;
    }
    const result = await getSessionUser(token);
    if (!result) {
      res.json(errorResponse(4, "TokenInvalid")); return;
    }
    const { user } = result;
    res.json({
      error: 0,
      description: "Success",
      userId: String(user.id),
      currency: "DL",
      cash: parseFloat(user.balance.toFixed(4)),
      bonus: 0.00,
      token,
    });
  } catch (err) {
    req.log?.error(err);
    res.json(errorResponse(120, "InternalServerError"));
  }
});

// POST /api/pragmaticplay/balance
router.post("/pragmaticplay/balance", async (req, res) => {
  try {
    const { token, providerId, userId, hash } = req.body;
    if (!token || !providerId || !userId || !hash) {
      res.json(errorResponse(7, "BadParameters")); return;
    }
    if (PP_PROVIDER_ID && providerId !== PP_PROVIDER_ID) {
      res.json(errorResponse(7, "BadParameters")); return;
    }
    if (!validateHash({ providerId, token, userId }, hash)) {
      res.json(errorResponse(5, "InvalidHashCode")); return;
    }
    const result = await getSessionUser(token);
    if (!result) {
      res.json(errorResponse(4, "TokenInvalid")); return;
    }
    const { user } = result;
    res.json({
      error: 0,
      description: "Success",
      currency: "DL",
      cash: parseFloat(user.balance.toFixed(4)),
      bonus: 0.00,
    });
  } catch (err) {
    req.log?.error(err);
    res.json(errorResponse(120, "InternalServerError"));
  }
});

// POST /api/pragmaticplay/bet
router.post("/pragmaticplay/bet", async (req, res) => {
  try {
    const { token, providerId, userId, amount, gameId, reference, roundDetails, roundId, timestamp, hash, bonusCode } = req.body;
    if (!token || !providerId || !userId || amount === undefined || !gameId || !reference || !roundId || !timestamp || !hash) {
      res.json(errorResponse(7, "BadParameters")); return;
    }
    if (PP_PROVIDER_ID && providerId !== PP_PROVIDER_ID) {
      res.json(errorResponse(7, "BadParameters")); return;
    }
    const hashParams: Record<string, string | number> = {
      amount: Number(amount),
      gameId, providerId, reference,
      roundDetails: roundDetails || "",
      roundId, timestamp, token, userId,
    };
    if (bonusCode) hashParams.bonusCode = bonusCode;
    if (!validateHash(hashParams, hash)) {
      res.json(errorResponse(5, "InvalidHashCode")); return;
    }

    const result = await getSessionUser(token);
    if (!result) { res.json(errorResponse(4, "TokenInvalid")); return; }
    const { user } = result;

    const betAmt = parseFloat(String(amount));
    if (user.balance < betAmt) {
      res.json(errorResponse(1, "InsufficientBalance")); return;
    }

    // Deduct balance and record round
    const [updatedUser] = await db
      .update(usersTable)
      .set({
        balance: sql`${usersTable.balance} - ${betAmt}`,
        totalWagered: sql`${usersTable.totalWagered} + ${betAmt}`,
      })
      .where(eq(usersTable.id, user.id))
      .returning();

    // Upsert round record
    await db.insert(ppRoundsTable).values({
      roundId: String(roundId),
      userId: user.id,
      gameSymbol: String(gameId),
      betAmount: String(betAmt),
      winAmount: "0",
      status: "open",
    }).onConflictDoNothing();

    res.json({
      error: 0,
      description: "Success",
      transactionId: reference,
      currency: "DL",
      cash: parseFloat(updatedUser.balance.toFixed(4)),
      bonus: 0.00,
      usedPromo: 0.00,
    });
  } catch (err) {
    req.log?.error(err);
    res.json(errorResponse(120, "InternalServerError"));
  }
});

// POST /api/pragmaticplay/result
router.post("/pragmaticplay/result", async (req, res) => {
  try {
    const { token, providerId, userId, amount, gameId, reference, roundDetails, roundId, timestamp, hash, bonusCode } = req.body;
    if (!token || !providerId || !userId || amount === undefined || !gameId || !reference || !roundId || !timestamp || !hash) {
      res.json(errorResponse(7, "BadParameters")); return;
    }
    if (PP_PROVIDER_ID && providerId !== PP_PROVIDER_ID) {
      res.json(errorResponse(7, "BadParameters")); return;
    }
    const hashParams: Record<string, string | number> = {
      amount: Number(amount),
      gameId, providerId, reference,
      roundDetails: roundDetails || "",
      roundId, timestamp, token, userId,
    };
    if (bonusCode) hashParams.bonusCode = bonusCode;
    if (!validateHash(hashParams, hash)) {
      res.json(errorResponse(5, "InvalidHashCode")); return;
    }

    const result = await getSessionUser(token);
    if (!result) { res.json(errorResponse(4, "TokenInvalid")); return; }
    const { user } = result;

    const winAmt = parseFloat(String(amount));
    const [updatedUser] = await db
      .update(usersTable)
      .set({
        balance: sql`${usersTable.balance} + ${winAmt}`,
        allTimeHigh: sql`GREATEST(COALESCE(${usersTable.allTimeHigh}, 0), ${usersTable.balance} + ${winAmt})`,
      })
      .where(eq(usersTable.id, user.id))
      .returning();

    // Update round record
    await db
      .update(ppRoundsTable)
      .set({ winAmount: String(winAmt), status: "closed", updatedAt: new Date() })
      .where(eq(ppRoundsTable.roundId, String(roundId)));

    res.json({
      error: 0,
      description: "Success",
      transactionId: reference,
      currency: "DL",
      cash: parseFloat(updatedUser.balance.toFixed(4)),
      bonus: 0.00,
    });
  } catch (err) {
    req.log?.error(err);
    res.json(errorResponse(120, "InternalServerError"));
  }
});

// POST /api/pragmaticplay/endround
router.post("/pragmaticplay/endround", async (req, res) => {
  try {
    const { token, providerId, userId, roundId, timestamp, hash } = req.body;
    if (!token || !providerId || !userId || !roundId || !timestamp || !hash) {
      res.json(errorResponse(7, "BadParameters")); return;
    }
    if (PP_PROVIDER_ID && providerId !== PP_PROVIDER_ID) {
      res.json(errorResponse(7, "BadParameters")); return;
    }
    if (!validateHash({ providerId, roundId, timestamp, token, userId }, hash)) {
      res.json(errorResponse(5, "InvalidHashCode")); return;
    }
    const result = await getSessionUser(token);
    if (!result) { res.json(errorResponse(4, "TokenInvalid")); return; }
    res.json({ error: 0, description: "Success" });
  } catch (err) {
    req.log?.error(err);
    res.json(errorResponse(130, "EndRoundInternalServerError"));
  }
});

// ── Session creation (our frontend calls this) ───────────────────────────────
// POST /api/games/pp-launch
router.post("/games/pp-launch", requireAuth, async (req: any, res) => {
  try {
    if (!PP_SECRET_KEY) {
      res.status(503).json({ error: "PP integration not configured" }); return;
    }
    const { gameSymbol } = req.body;
    if (!gameSymbol) { res.status(400).json({ error: "gameSymbol required" }); return; }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

    await db.insert(ppSessionsTable).values({
      token, userId: req.user.id, gameSymbol, expiresAt,
    });

    const gameUrl =
      `https://${PP_GAME_SERVER}/gs2c/playGame.do` +
      `?key=token=${token}` +
      `&symbol=${gameSymbol}` +
      `&technology=H5` +
      `&platform=WEB` +
      `&language=en` +
      `&cashierUrl=${encodeURIComponent(SITE_URL)}` +
      `&lobbyUrl=${encodeURIComponent(SITE_URL)}` +
      `&stylename=${PP_STYLENAME}`;

    res.json({ gameUrl, token });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
