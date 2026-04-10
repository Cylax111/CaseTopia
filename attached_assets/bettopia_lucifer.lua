-- BetTopia Deposit & Withdrawal Bot
-- Lucifer v2.83 p2
-- Non-blocking design: main loop uses short sleeps so Lucifer can process
-- trade requests (auto-accept) between inventory checks.

local WEBSITE_URL = "https://case-topia.replit.app"
local BOT_SECRET  = "0d68e6d0b7388733c797bfbe76ad3e5e2f3917de52365871ac1f3d7685f8037e"
local BOT_GROW_ID = "zPlaysGT"

-- Growtopia item IDs
local ITEM_BGL = 4532 -- Blue Gem Lock  (100 DL each)
local ITEM_DL  = 1796 -- Diamond Lock   (1 DL each)
local ITEM_WL  = 242  -- World Lock     (0.01 DL each)

local claimed_worlds = {}
local processing_wd  = {}

-- Currently watched deposit session (nil when idle)
-- Fields: world, growId, expiresAt, prevBGL, prevDL, prevWL
local activeDeposit = nil

local function api_get(path, params)
    local sep = path:find("?") and "&" or "?"
    local url = WEBSITE_URL .. "/api" .. path .. sep .. "secret=" .. BOT_SECRET
    if params then url = url .. "&" .. params end
    local ok, res = pcall(function()
        local h = io.popen('curl -s "' .. url .. '"')
        local r = h:read("*a")
        h:close()
        return r
    end)
    if not ok or not res then return nil end
    return res
end

local function api_post(path, params)
    local url = WEBSITE_URL .. "/api" .. path .. "?secret=" .. BOT_SECRET
    if params then url = url .. "&" .. params end
    local ok, res = pcall(function()
        local h = io.popen('curl -s -X POST "' .. url .. '"')
        local r = h:read("*a")
        h:close()
        return r
    end)
    if not ok or not res then return nil end
    return res
end

local function inv_snapshot(bot)
    local inv = bot:getInventory()
    return inv:getItemCount(ITEM_BGL), inv:getItemCount(ITEM_DL), inv:getItemCount(ITEM_WL)
end

-- Called every main loop tick while a deposit is active.
-- Returns immediately (non-blocking) after checking inventory.
local function check_active_deposit(bot)
    if not activeDeposit then return end

    local now = os.time()

    -- Check if the deposit timer expired
    if activeDeposit.expiresAt > 0 and now >= activeDeposit.expiresAt then
        print("[DEPOSIT] Expired - cancelling " .. activeDeposit.world)
        api_post("/bot/cancel-deposit", "worldName=" .. activeDeposit.world)
        bot:warp("EXIT")
        claimed_worlds[activeDeposit.world] = nil
        activeDeposit = nil
        return
    end

    -- Check if bot received any items
    local curBGL, curDL, curWL = inv_snapshot(bot)
    local gainBGL = curBGL - activeDeposit.prevBGL
    local gainDL  = curDL  - activeDeposit.prevDL
    local gainWL  = curWL  - activeDeposit.prevWL

    if gainBGL > 0 or gainDL > 0 or gainWL > 0 then
        local totalDL = (gainBGL * 100) + gainDL + (gainWL / 100)
        print("[INV] Trade detected! +" .. gainBGL .. " BGL +" .. gainDL .. " DL +" .. gainWL .. " WL = " .. totalDL .. " DL")

        local done_res = api_post("/bot/deposit-complete",
            "worldName=" .. activeDeposit.world .. "&amountDl=" .. tostring(totalDL))
        if done_res and done_res:find('"ok":true') then
            print("[DEPOSIT] Credited " .. totalDL .. " DL")
            bot:say("@" .. activeDeposit.growId .. " Deposit received! " .. tostring(totalDL) .. " DL added to your balance.")
        else
            print("[DEPOSIT] deposit-complete failed: " .. tostring(done_res))
            bot:say("@" .. activeDeposit.growId .. " Something went wrong - contact support.")
        end

        claimed_worlds[activeDeposit.world] = nil
        activeDeposit = nil
    end
end

-- Pick up the next pending deposit and warp to it.
-- Only sets activeDeposit and returns - does NOT block waiting for the trade.
local function poll_deposits(bot)
    if activeDeposit then return end

    local res = api_get("/bot/pending-deposits", "format=text")
    if not res or res == "" then return end

    for line in res:gmatch("[^\n]+") do
        local world, growId, userId, expiresAtStr = line:match("^([^|]+)|([^|]*)|([^|]+)|([^|]*)$")
        if world and not claimed_worlds[world] then
            local expiresAt = tonumber(expiresAtStr) or 0
            print("[DEPOSIT] New session - world: " .. world .. " player: " .. tostring(growId))

            claimed_worlds[world] = true
            bot:warp(world)
            sleep(3000) -- wait for warp to complete (one-time, not a loop)

            local claim_res = api_post("/bot/claim-deposit",
                "worldName=" .. world .. "&botGrowId=" .. BOT_GROW_ID)
            if not claim_res or not claim_res:find('"ok":true') then
                print("[DEPOSIT] Claim failed: " .. tostring(claim_res))
                claimed_worlds[world] = nil
                return
            end

            bot:say("@" .. tostring(growId) .. " Hi! Trade me your Diamond Locks to deposit.")

            -- Snapshot inventory NOW then return immediately to main loop
            local prevBGL, prevDL, prevWL = inv_snapshot(bot)
            activeDeposit = {
                world    = world,
                growId   = tostring(growId),
                expiresAt = expiresAt,
                prevBGL  = prevBGL,
                prevDL   = prevDL,
                prevWL   = prevWL,
            }
            print("[DEPOSIT] Now watching inventory in " .. world .. " (expires: " .. tostring(expiresAt) .. ")")
            return
        end
    end
end

local function poll_withdrawals(bot)
    local res = api_get("/bot/pending-withdrawals", "format=text")
    if not res or res == "" then return end
    for line in res:gmatch("[^\n]+") do
        local tx_id, grow_id, amount_str = line:match("^([^|]+)|([^|]*)|([^|]+)$")
        if tx_id and not processing_wd[tx_id] then
            processing_wd[tx_id] = true
            local amount = tonumber(amount_str) or 0
            print("[WITHDRAW] " .. tostring(amount) .. " DL to " .. tostring(grow_id))
            -- TODO: deliver items in-game
            local done_res = api_post("/bot/withdraw-complete", "transactionId=" .. tx_id)
            if done_res and done_res:find('"ok":true') then
                print("[WITHDRAW] Complete txId=" .. tx_id)
            end
            processing_wd[tx_id] = nil
        end
    end
end

-- Main loop
local bot = getBot(BOT_GROW_ID)
print("BetTopia bot started! Bot: " .. tostring(bot))

while true do
    check_active_deposit(bot)
    if not activeDeposit then
        poll_deposits(bot)
        poll_withdrawals(bot)
    end
    sleep(500) -- short sleep: Lucifer processes trade events between ticks
end
