export interface PPGame {
  symbol: string;
  name: string;
  catalogName: string;
  volatility: "low" | "medium" | "high" | "very-high";
  lines?: number;
  ways?: number;
  description: string;
  gradient: string;
  emoji: string;
}

export const PP_GAMES: PPGame[] = [
  {
    symbol: "vs20fruitsw",
    name: "Sweet Bonanza",
    catalogName: "SweetBonanza",
    volatility: "high",
    lines: 20,
    description: "Load up on sugar in Sweet Bonanza, the 6×5, pays anywhere, tumbling videoslot. The more candies you land, the bigger your wins!",
    gradient: "linear-gradient(135deg, #e91e8c 0%, #ff6b9d 40%, #ffb347 100%)",
    emoji: "🍬",
  },
  {
    symbol: "vs20sbn1000",
    name: "Sweet Bonanza 1000",
    catalogName: "SweetBonanza1000",
    volatility: "very-high",
    ways: 20736,
    description: "The super-charged Sweet Bonanza experience with max win of up to 25,000x and explosive multiplier bombs worth up to 1000x.",
    gradient: "linear-gradient(135deg, #c0392b 0%, #e91e8c 50%, #ff69b4 100%)",
    emoji: "💣",
  },
  {
    symbol: "vs20olympgate",
    name: "Gates of Olympus",
    catalogName: "GatesofOlympus",
    volatility: "very-high",
    ways: 20736,
    description: "Summon the power of Zeus in Gates of Olympus, a cluster pays tumbling slot where the Ante Bet & Free Spins with unlimited multipliers bring Olympian rewards.",
    gradient: "linear-gradient(135deg, #1a1a6e 0%, #4a0080 50%, #ffd700 100%)",
    emoji: "⚡",
  },
  {
    symbol: "vs20olympgate1000",
    name: "Gates of Olympus 1000",
    catalogName: "GatesofOlympus1000",
    volatility: "very-high",
    ways: 20736,
    description: "The ultimate Gates of Olympus experience, featuring 1000x multipliers and monumental wins from the king of the gods.",
    gradient: "linear-gradient(135deg, #0d0d4e 0%, #6a0080 50%, #ffd700 100%)",
    emoji: "🏛️",
  },
  {
    symbol: "vs9doghouse",
    name: "The Dog House",
    catalogName: "TheDogHouse",
    volatility: "high",
    lines: 20,
    description: "Join the gang in Dog House, the 5×3, 20 lines videoslot. All WILDs have multipliers on reels 2, 3 and 4, and stacked WILDS in Free Spins.",
    gradient: "linear-gradient(135deg, #8B4513 0%, #d2691e 50%, #ffd700 100%)",
    emoji: "🐶",
  },
  {
    symbol: "vs9dogswaysx",
    name: "The Dog House Megaways",
    catalogName: "TheDogHouseMegaways",
    volatility: "very-high",
    ways: 117649,
    description: "The iconic Dog House is back with up to 117,649 Megaways, sticky wilds with multipliers and an exciting Ante Bet feature.",
    gradient: "linear-gradient(135deg, #6B3410 0%, #c0651e 50%, #ff9900 100%)",
    emoji: "🦴",
  },
  {
    symbol: "vs10bbb",
    name: "Big Bass Bonanza",
    catalogName: "BigBassBonanza",
    volatility: "high",
    lines: 10,
    description: "Reel up the biggest wins in Big Bass Bonanza the 5×3 videoslot with 10 paylines where the Fisherman is WILD and collects cash symbols.",
    gradient: "linear-gradient(135deg, #005f73 0%, #0a9396 50%, #94d2bd 100%)",
    emoji: "🎣",
  },
  {
    symbol: "vs12bbb",
    name: "Bigger Bass Bonanza",
    catalogName: "BiggerBassBonanza",
    volatility: "very-high",
    lines: 12,
    description: "Cast your net and fish up a colossal catch in Bigger Bass Bonanza™, the 12-payline videoslot with even bigger potential than the original.",
    gradient: "linear-gradient(135deg, #003f5c 0%, #0077b6 50%, #00b4d8 100%)",
    emoji: "🐟",
  },
  {
    symbol: "vswaystbbb",
    name: "Big Bass Bonanza Megaways",
    catalogName: "BigBassBonanzaMegaways1",
    volatility: "very-high",
    ways: 46656,
    description: "The fan favourite is back with Megaways. Reel in monumental wins with up to 46,656 Megaways and Fishing Free Spins stacked with Wilds.",
    gradient: "linear-gradient(135deg, #004e89 0%, #1a659e 50%, #37a8c6 100%)",
    emoji: "🎏",
  },
  {
    symbol: "vs20starlight",
    name: "Starlight Princess",
    catalogName: "StarLightPrincess",
    volatility: "very-high",
    ways: 4096,
    description: "Journey into the magical realm of the Starlight Princess in this celestial 6×5 grid slot with multiplier wilds, free spins and a max win of 5,000x.",
    gradient: "linear-gradient(135deg, #4b0082 0%, #9b59b6 50%, #ff69b4 100%)",
    emoji: "⭐",
  },
  {
    symbol: "vs20starlight1000",
    name: "Starlight Princess 1000",
    catalogName: "StarLightPrincess1000",
    volatility: "very-high",
    ways: 4096,
    description: "The Starlight Princess returns with turbo-charged 1000x multipliers for cosmic wins of up to 50,000x in this dazzling sequel.",
    gradient: "linear-gradient(135deg, #2d006e 0%, #7b2ff7 50%, #ff4da6 100%)",
    emoji: "🌟",
  },
  {
    symbol: "vs20wildwest",
    name: "Wild West Gold",
    catalogName: "WildWestGold",
    volatility: "high",
    lines: 40,
    description: "Ride to riches in Wild West Gold, the 4×5, 40 lines videoslot. All Wilds multiply up to 5x for huge wins in the Free Spins.",
    gradient: "linear-gradient(135deg, #8B6914 0%, #c9933f 50%, #ffe0a3 100%)",
    emoji: "🤠",
  },
  {
    symbol: "vs20sugarrush",
    name: "Sugar Rush",
    catalogName: "SugarRush",
    volatility: "low",
    lines: 20,
    description: "Get your sweet tooth ready in Sugar Rush! Candy Street is open for business with cluster pays, cascades and an exciting bonus game.",
    gradient: "linear-gradient(135deg, #ff6eb4 0%, #ff9de2 50%, #ffe0f0 100%)",
    emoji: "🍭",
  },
  {
    symbol: "vs20sugarrush1000",
    name: "Sugar Rush 1000",
    catalogName: "SugarRush1000",
    volatility: "very-high",
    lines: 20,
    description: "The Sugar Rush universe explodes with 1000x multipliers turning the sweetest spins into astronomical wins.",
    gradient: "linear-gradient(135deg, #c0006e 0%, #ff4fa6 50%, #ffc0e0 100%)",
    emoji: "🍫",
  },
  {
    symbol: "vs20fruitparty",
    name: "Fruit Party",
    catalogName: "FruitParty",
    volatility: "very-high",
    lines: 20,
    description: "Mix up juicy wins in Fruit Party, the cluster pay videoslot where symbols award prizes for blocks of 5 or more.",
    gradient: "linear-gradient(135deg, #e74c3c 0%, #f39c12 50%, #2ecc71 100%)",
    emoji: "🍎",
  },
  {
    symbol: "vs20fruitparty2",
    name: "Fruit Party 2",
    catalogName: "FruitParty2",
    volatility: "very-high",
    lines: 20,
    description: "The party continues in Fruit Party 2 with bigger clusters, new symbols and even more explosive win potential.",
    gradient: "linear-gradient(135deg, #c0392b 0%, #e67e22 50%, #27ae60 100%)",
    emoji: "🍊",
  },
  {
    symbol: "vswaysftitans",
    name: "Power of Thor Megaways",
    catalogName: "PowerofThorMegaways",
    volatility: "very-high",
    ways: 117649,
    description: "Prove yourself worthy to wield Thor's hammer in Power of Thor Megaways™, the 117,649 ways to win videoslot with unlimited free spins multipliers.",
    gradient: "linear-gradient(135deg, #0d1b2a 0%, #1b4f72 50%, #f0e68c 100%)",
    emoji: "🔨",
  },
];

export function getGameBySymbol(symbol: string): PPGame | undefined {
  return PP_GAMES.find(g => g.symbol === symbol);
}

export function getDemoUrl(symbol: string): string {
  return `https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?gameSymbol=${symbol}&lang=en&cur=USD&jurisdiction=MT`;
}

export function getVolatilityColor(v: string): string {
  switch (v) {
    case "low": return "text-green-400 bg-green-400/10";
    case "medium": return "text-yellow-400 bg-yellow-400/10";
    case "high": return "text-orange-400 bg-orange-400/10";
    case "very-high": return "text-red-400 bg-red-400/10";
    default: return "text-muted-foreground bg-muted";
  }
}
