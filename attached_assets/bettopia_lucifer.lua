-- BetTopia Deposit & Withdrawal Bot
-- Lucifer v2.83 p2
-- Paste into Executor and press Run

local WEBSITE_URL = "https://case-topia.replit.app"
local BOT_SECRET   = "your_bot_secret_here"   -- must match BOT_SECRET on server
local BOT_GROW_ID  = getLocalName()            -- reads the bot's own GrowID

-- DL value of each item (1 Diamond Lock = 1 DL)
local ITEM_VALUES = {
    ["World Lock"]     = 0.01,
    ["Diamond Lock"]   = 1,
    ["Blue Gem Lock"]  = 100,
    ["Dragon Lock"]    = 500,
}

local claimed_worlds  = {}   -- worlds already claimed
local processing_wd   = {}   -- withdrawal IDs being processed

-- ── HTTP helper ───────────────────────────────────────────────────────────────

local function api(method, path, body)
    local url = WEBSITE_URL .. "/api" .. path
    local headers = {
        ["X-Bot-Secret"] = BOT_SECRET,
        ["Content-Type"] = "application/json",
    }
    local body_str = body and jsonEncode(body) or nil
    local ok, res = pcall(function()
        return http(url, method, headers, body_str)
    end)
    if not ok or not res then return nil end
    local ok2, data = pcall(jsonDecode, res)
    return ok2 and data or nil
end

-- ── Trade value calculator ────────────────────────────────────────────────────

local function trade_value(items)
    local total = 0
    for _, item in ipairs(items or {}) do
        local val = ITEM_VALUES[item.name]
        if val then
            total = total + val * (item.count or item.quantity or 1)
        else
            print("[WARN] Unknown item: " .. tostring(item.name))
        end
    end
    return total
end

-- ── Deposit poller ────────────────────────────────────────────────────────────

local function poll_deposits()
    local deposits = api("GET", "/bot/pending-deposits")
    if not deposits then return end

    for _, dep in ipairs(deposits) do
        local world = dep.worldName
        if world and not claimed_worlds[world] then
            print("[DEPOSIT] New session → world: " .. world .. " growId: " .. tostring(dep.growId))

            -- Warp to the deposit world
            warp(world)
            sleep(3000)   -- wait until fully loaded

            -- Tell the website this bot is ready at the world
            local res = api("POST", "/bot/claim-deposit", {
                worldName = world,
                botGrowId = BOT_GROW_ID,
            })

            if res and res.ok then
                claimed_worlds[world] = true
                print("[DEPOSIT] Claimed " .. world .. " (txId=" .. tostring(res.transactionId) .. ")")
                say("@" .. tostring(dep.growId) .. " Hi! Trade me your DLs here at " .. world .. " to deposit.")
            else
                print("[DEPOSIT] claim-deposit failed for " .. world)
            end
        end
    end
end

-- ── Withdrawal poller ─────────────────────────────────────────────────────────

local function poll_withdrawals()
    local withdrawals = api("GET", "/bot/pending-withdrawals")
    if not withdrawals then return end

    for _, wd in ipairs(withdrawals) do
        local tx_id  = wd.id
        local grow_id = wd.growId
        local amount  = wd.amountDl

        if not processing_wd[tx_id] then
            processing_wd[tx_id] = true
            print("[WITHDRAW] txId=" .. tx_id .. " → " .. tostring(amount) .. " DL to " .. tostring(grow_id))

            -- Attempt to deliver the items in-game
            -- Adjust these calls to match how your bot delivers items
            local success = false
            local ok, err = pcall(function()
                warp("EXIT")       -- go to your trade/exit world
                sleep(2000)
                findPlayer(grow_id)
                sleep(1000)
                -- Add locks to trade based on amount
                -- addTradeItem("Diamond Lock", math.floor(amount))
                -- acceptTrade()
                success = true
            end)

            if ok and success then
                local res = api("POST", "/bot/withdraw-complete", { transactionId = tx_id })
                if res and res.ok then
                    print("[WITHDRAW] Completed txId=" .. tx_id)
                else
                    print("[WITHDRAW] withdraw-complete call failed for txId=" .. tx_id)
                end
            else
                print("[WITHDRAW] Delivery failed: " .. tostring(err))
                local res = api("POST", "/bot/withdraw-failed", { transactionId = tx_id })
                if res and res.ok then
                    print("[WITHDRAW] Refunded txId=" .. tx_id)
                end
            end

            processing_wd[tx_id] = nil
        end
    end
end

-- ── Trade accepted callback ───────────────────────────────────────────────────
-- Hook this to your trade-accepted event, or call it manually from onTrade()

function onTradeAccepted(player_name, items)
    local world = getWorld()
    local amount = trade_value(items)

    print("[TRADE] " .. player_name .. " traded " .. amount .. " DL at " .. world)

    if amount <= 0 then
        print("[TRADE] No recognised items — ignoring")
        return
    end

    local res = api("POST", "/bot/deposit-complete", {
        worldName = world,
        amountDl  = amount,
    })

    if res and res.ok then
        print("[TRADE] Credited " .. amount .. " DL (userId=" .. tostring(res.userId) .. ")")
        say("@" .. player_name .. " Deposit received! " .. amount .. " DL added to your balance.")
        claimed_worlds[world] = nil   -- free the slot
    else
        print("[TRADE] deposit-complete failed")
        say("@" .. player_name .. " Something went wrong — contact support.")
    end
end

-- ── Main loop ─────────────────────────────────────────────────────────────────

print("BetTopia bot started — " .. BOT_GROW_ID)

while true do
    poll_deposits()
    sleep(1000)
    poll_withdrawals()
    sleep(4000)   -- total ~5s per cycle
end
