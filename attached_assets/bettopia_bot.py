import requests
import time
import threading

# ── Configuration ─────────────────────────────────────────────────────────────
WEBSITE_URL = "https://case-topia.replit.app"   # your deployed site URL
BOT_SECRET  = "your_bot_secret_here"             # must match BOT_SECRET env var on the server
BOT_GROW_ID = "YourBotGrowID"                    # the in-game GrowID of this bot account

# Item values in DL (Diamond Lock = 1 DL, Blue Gem Lock = 100 DL, etc.)
ITEM_VALUES_DL = {
    "World Lock":      0.01,   # 1 WL  = 0.01 DL
    "Diamond Lock":    1,      # 1 DL
    "Blue Gem Lock":   100,    # 100 DL
    "Dragon Lock":     500,    # adjust as needed
}

# ── Helpers ───────────────────────────────────────────────────────────────────
HEADERS = {
    "X-Bot-Secret":  BOT_SECRET,
    "Content-Type":  "application/json",
}

def api_get(path):
    try:
        r = requests.get(f"{WEBSITE_URL}/api{path}", headers=HEADERS, timeout=10)
        return r.json() if r.ok else None
    except Exception as e:
        print(f"[GET {path}] error: {e}")
        return None

def api_post(path, body):
    try:
        r = requests.post(f"{WEBSITE_URL}/api{path}", headers=HEADERS, json=body, timeout=10)
        return r.json() if r.ok else None
    except Exception as e:
        print(f"[POST {path}] error: {e}")
        return None

def calculate_trade_value(trade_items):
    """Convert a list of {name, quantity} trade items to a DL amount."""
    total = 0.0
    for item in trade_items:
        name = item.get("name", "")
        qty  = item.get("quantity", 0)
        if name in ITEM_VALUES_DL:
            total += ITEM_VALUES_DL[name] * qty
        else:
            print(f"  [WARNING] Unknown item '{name}' — not counted toward deposit")
    return total

# ── Deposit thread ────────────────────────────────────────────────────────────
claimed_worlds = set()   # worlds we've already called claim-deposit on

def poll_deposits():
    """
    Polls /api/bot/pending-deposits every 5 s.
    For each unclaimed deposit world the bot should warp to that world,
    then call claim-deposit to register its GrowID.
    """
    while True:
        try:
            deposits = api_get("/bot/pending-deposits") or []
            for dep in deposits:
                world = dep.get("worldName")
                if not world or world in claimed_worlds:
                    continue

                print(f"[DEPOSIT] New deposit session — world: {world}, growId: {dep.get('growId')}")

                # ── YOUR BOT LIBRARY: warp to world ──────────────────────────
                # bot.goto_world(world)
                # time.sleep(2)   # wait until loaded
                # -------------------------------------------------------------

                # Tell the server this bot is now at the world
                result = api_post("/bot/claim-deposit", {
                    "worldName": world,
                    "botGrowId": BOT_GROW_ID,
                })
                if result and result.get("ok"):
                    claimed_worlds.add(world)
                    print(f"  [DEPOSIT] Claimed world {world} (txId={result.get('transactionId')})")

                    # ── YOUR BOT LIBRARY: message the player ─────────────────
                    grow_id = dep.get("growId", "Player")
                    # bot.say(f"@{grow_id} I'm ready! Trade me your DLs at {world}.")
                    # ------------------------------------------------------------

        except Exception as e:
            print(f"[poll_deposits] error: {e}")

        time.sleep(5)

# ── Withdrawal thread ─────────────────────────────────────────────────────────
def poll_withdrawals():
    """
    Polls /api/bot/pending-withdrawals every 10 s.
    For each pending withdrawal the bot should deliver the items in-game,
    then call withdraw-complete (or withdraw-failed on error).
    """
    while True:
        try:
            withdrawals = api_get("/bot/pending-withdrawals") or []
            for wd in withdrawals:
                tx_id   = wd.get("id")
                grow_id = wd.get("growId")
                amount  = wd.get("amountDl", 0)

                print(f"[WITHDRAW] Processing txId={tx_id} — {amount} DL → {grow_id}")

                success = deliver_items(grow_id, amount)

                if success:
                    result = api_post("/bot/withdraw-complete", {"transactionId": tx_id})
                    if result and result.get("ok"):
                        print(f"  [WITHDRAW] Completed txId={tx_id}")
                    else:
                        print(f"  [WITHDRAW] withdraw-complete call failed for txId={tx_id}")
                else:
                    result = api_post("/bot/withdraw-failed", {"transactionId": tx_id})
                    if result and result.get("ok"):
                        print(f"  [WITHDRAW] Marked failed + refunded txId={tx_id}")

        except Exception as e:
            print(f"[poll_withdrawals] error: {e}")

        time.sleep(10)

def deliver_items(grow_id, amount_dl):
    """
    Deliver `amount_dl` DL worth of items to `grow_id` in-game.
    Replace the body with actual bot library calls.
    Returns True on success, False on failure.
    """
    try:
        print(f"  Delivering {amount_dl} DL to {grow_id}…")

        # ── YOUR BOT LIBRARY: trade items to the player ──────────────────────
        # bot.goto_world("TRADE")       # go to your trade world
        # bot.find_player(grow_id)
        # bot.offer_trade(build_locks(amount_dl))
        # bot.accept_trade()
        # return True
        # ---------------------------------------------------------------------

        # Placeholder — always returns True in demo mode
        print(f"  [DEMO] Would deliver {amount_dl} DL to {grow_id}")
        return True

    except Exception as e:
        print(f"  [deliver_items] error: {e}")
        return False

# ── Trade event callback (called by your bot library) ─────────────────────────
def on_trade_received(player_name, trade_items, world_name):
    """
    Call this function from your bot library's trade-accepted event.

    Parameters
    ----------
    player_name : str   GrowID of the player who traded
    trade_items : list  [{"name": "Diamond Lock", "quantity": 5}, ...]
    world_name  : str   World the bot is currently in (must match worldName)
    """
    amount_dl = calculate_trade_value(trade_items)
    print(f"[TRADE] {player_name} traded {amount_dl} DL at {world_name}")

    if amount_dl <= 0:
        print("  [TRADE] No recognised items — ignoring trade")
        return

    # Credit the balance on the website
    result = api_post("/bot/deposit-complete", {
        "worldName": world_name,
        "amountDl":  amount_dl,
    })

    if result and result.get("ok"):
        print(f"  [TRADE] Deposit credited: {amount_dl} DL for userId={result.get('userId')}")
        # ── YOUR BOT LIBRARY: thank the player ───────────────────────────────
        # bot.say(f"@{player_name} Deposit of {amount_dl} DL received! Check your balance.")
        # ---------------------------------------------------------------------
        claimed_worlds.discard(world_name)   # free the slot for the next session
    else:
        print(f"  [TRADE] deposit-complete failed — server rejected the trade")
        # ── YOUR BOT LIBRARY: tell the player something went wrong ───────────
        # bot.say(f"@{player_name} Something went wrong. Contact support.")
        # ---------------------------------------------------------------------

# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"BetTopia bot starting — connecting to {WEBSITE_URL}")
    print(f"Bot GrowID: {BOT_GROW_ID}")

    threading.Thread(target=poll_deposits,    daemon=True).start()
    threading.Thread(target=poll_withdrawals, daemon=True).start()

    # ── YOUR BOT LIBRARY: connect and run event loop ─────────────────────────
    # bot = GrowtopiaBot(username=BOT_GROW_ID, password="…")
    # bot.on("trade_accepted", lambda player, items: on_trade_received(player, items, bot.current_world))
    # bot.connect()
    # bot.run()
    # -------------------------------------------------------------------------

    # Keep-alive (remove once you hook in the real bot library)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Bot shutting down.")
