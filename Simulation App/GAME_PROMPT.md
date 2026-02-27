# ROLE

You are a senior game architect, simulation engineer, and React Native (Expo) developer with 15+ years of experience building mobile games, economic simulators, and interactive 2D applications. You write production-grade, modular, scalable code with clear separation of concerns. You think in systems — state machines, event loops, reducer patterns, and deterministic simulations. You document every module with clear inline comments.

---

# OBJECTIVE

Build a **complete, fully-playable 2D Android farming simulation game** using React Native (Expo).

The game must be:
- **Turn-based** (each "Next Day" press advances the world by 1 day)
- **Self-contained** — all data is local, no external API calls, no backend server
- **Modular** — simulation logic is 100% separated from UI components
- **Scalable** — easy to add new crops, markets, events, and mechanics
- **Visually functional** — uses colored blocks / simple shapes as placeholder sprites rendered via React Native `View` components and `Animated` API

The player manages a farm: planting crops, monitoring weather, harvesting, storing produce, transporting to markets, and maximizing profit across fluctuating prices, spoilage, weather disruption, and foreign exchange rates.

---

# TECH STACK

| Layer | Technology |
|---|---|
| Framework | React Native (Expo SDK 51+) |
| Language | JavaScript (ES2022+) |
| Components | Functional components only |
| State | `useReducer` + `useContext` for global game state |
| Animation | React Native `Animated` API (no external animation libs) |
| Navigation | Simple state-driven screen switching (no React Navigation) |
| Storage | `AsyncStorage` for save/load (optional enhancement) |
| Styling | `StyleSheet.create` — all inline styles forbidden |
| Dependencies | Expo only — zero additional npm packages |

---

# GAME MECHANICS

## 1. World & Time

- The game world operates on a **day counter** starting at Day 1.
- Each press of the **"Next Day"** button advances the simulation by exactly 1 day.
- On each day advance, the following systems tick (in order):
  1. Weather generation
  2. Field growth updates
  3. Storage spoilage calculation
  4. Market price fluctuation
  5. Exchange rate fluctuation
  6. Transport progress (if active)
  7. Reputation update
  8. Season check
  9. Loan interest accrual

## 2. Farmer (Player)

Starting state:
```
Money: ₹1,00,000 (100000)
Fields: 3 (each 1000 kg capacity)
Storage Capacity: 5000 kg
Reputation: 50 (scale 0–100)
Loan Balance: 0
Season: Kharif (Day 1)
```

## 3. Fields & Planting

- The farmer owns **N fields** (starts with 3, can buy more).
- Each field has a **capacity in kg**.
- To plant: select a field → select a crop → confirm.
- A field can only grow **one crop at a time**.
- Planting costs money: `PlantingCost = CropSeedCostPerKg × FieldCapacity`

Field states:
```
EMPTY → PLANTED → GROWING → MATURE → OVERRIPE → DEAD
```

Transitions:
- EMPTY → PLANTED: Player plants a crop
- PLANTED → GROWING: After 1 day
- GROWING → MATURE: When `daysPlanted >= crop.maturityDays` (adjusted by weather)
- MATURE → OVERRIPE: If not harvested within `crop.overripeDays` after maturity
- OVERRIPE → DEAD: After `crop.deadDays` more days — yield drops to 0

## 4. Crops

Define at least **6 crops** with distinct characteristics:

| Crop | Seed Cost (₹/kg) | Maturity (days) | Base Yield (kg) | Base Price (₹/kg) | Spoilage Rate (%/day) | Weather Sensitivity | Season |
|---|---|---|---|---|---|---|---|
| Wheat | 5 | 12 | 950 | 25 | 1.0 | Low | Rabi |
| Rice | 8 | 15 | 900 | 30 | 1.5 | High | Kharif |
| Tomato | 12 | 8 | 800 | 45 | 3.0 | Medium | Both |
| Sugarcane | 10 | 20 | 1100 | 35 | 0.5 | Low | Kharif |
| Cotton | 15 | 18 | 700 | 55 | 0.8 | High | Kharif |
| Potato | 7 | 10 | 850 | 28 | 2.0 | Medium | Rabi |

Season mismatch penalty: If crop is planted in the wrong season, yield is reduced by 40%.

## 5. Weather System

Weather is determined **randomly each day** with weighted probabilities that shift by season:

| Weather | Kharif Weight | Rabi Weight | Effect |
|---|---|---|---|
| ☀️ Sunny | 30% | 45% | Normal growth, normal spoilage |
| 🌧️ Rain | 35% | 25% | +20% growth speed, +10% spoilage |
| 🔥 Heatwave | 15% | 20% | -15% growth speed, +25% spoilage, +30% transport delay |
| ⛈️ Storm | 20% | 10% | -30% growth speed, +40% spoilage, +50% transport delay, 10% chance of crop damage (lose 20% yield) |

Growth speed modifier formula:
```
effectiveGrowthDays = baseDaysPlanted × (1 + weatherGrowthModifier)
```

A crop matures when `effectiveGrowthDays >= crop.maturityDays`.

## 6. Harvest System

When a field reaches **MATURE** status:
- Player taps "Harvest" on that field.
- Crop yield is calculated:
```
actualYield = baseYield × qualityMultiplier × seasonMultiplier × weatherDamageMultiplier
```
- Quality depends on how many optimal-weather days occurred during growth:
```
qualityPercent = min(100, 60 + (sunnyDays / totalGrowthDays) × 40)
```
- Harvested crop moves to **Storage**.
- Field resets to EMPTY.

## 7. Storage System

- Storage has a **max capacity** (starts at 5000 kg, expandable).
- Each stored crop item tracks:
  - cropType
  - quantity (kg)
  - quality (%)
  - daysInStorage
  - currentSpoilage (%)
- **Daily spoilage** applied to all stored items:
```
dailySpoilagePercent = crop.baseSpoilageRate + weatherSpoilageModifier
currentSpoilage = min(100, currentSpoilage + dailySpoilagePercent)
effectiveQuantity = quantity × (1 - currentSpoilage / 100)
```
- When `currentSpoilage >= 100%`, the item is **destroyed** (removed from storage).
- Player can see effective quantity vs original quantity.

## 8. Market System

Three markets exist:

| Market | Distance (km) | Transport Cost (₹/km) | Price Volatility | Currency |
|---|---|---|---|---|
| Local Market A | 20 | 2 | ±5% daily | INR |
| Local Market B | 50 | 2 | ±8% daily | INR |
| Export Market | 150 | 3 | ±12% daily | USD |

**Daily price update formula:**
```
newPrice = previousPrice × (1 + randomInRange(-volatility, +volatility))
newPrice = clamp(newPrice, baseCropPrice × 0.5, baseCropPrice × 2.0)
```

Each market also has a **demand cycle** (sinusoidal over 30-day period):
```
demandMultiplier = 1.0 + 0.3 × sin(2π × day / 30 + marketPhaseOffset)
finalOfferedPrice = newPrice × demandMultiplier
```

**Negotiation variance:** When selling, the actual offered price varies:
```
offeredPrice = finalOfferedPrice × randomInRange(0.90, 1.05)
```
Higher reputation gives better negotiation floor:
```
negotiationFloor = 0.90 + (reputation / 100) × 0.08  // ranges 0.90 to 0.98
offeredPrice = finalOfferedPrice × randomInRange(negotiationFloor, 1.05)
```

## 9. Selling & Revenue

When player selects a storage item and a market:
```
revenue = offeredPrice × effectiveQuantity × (quality / 100)
transportCost = market.distance × market.costPerKm × ceil(effectiveQuantity / 500)
```
(Each truck carries max 500 kg; more quantity = more trucks = more cost)

For Export Market:
```
revenueINR = revenueUSD × exchangeRate
```

```
finalProfit = revenue - transportCost
```

Player's money increases by `finalProfit`. If finalProfit is negative (transport cost exceeds revenue), player still pays — money decreases.

## 10. Transport Simulation

When a sale is initiated:
- A **truck animation** plays on a 2D top-down map.
- Travel time in days:
```
baseTravelDays = ceil(market.distance / 100)
weatherDelayMultiplier = 1.0 + weatherTransportModifier
actualTravelDays = ceil(baseTravelDays × weatherDelayMultiplier)
```
- During travel, **additional spoilage** occurs:
```
transitSpoilage = actualTravelDays × (crop.baseSpoilageRate + weatherSpoilageModifier)
effectiveQuantity = quantity × (1 - (currentSpoilage + transitSpoilage) / 100)
```
- The truck moves across the screen proportionally each day.
- A countdown shows remaining travel days.
- Revenue is finalized and credited when truck arrives.

## 11. Foreign Exchange System

- Exchange rate starts at ₹83.50 per $1 USD.
- Daily fluctuation:
```
newRate = previousRate × (1 + randomInRange(-0.02, +0.02))
newRate = clamp(newRate, 78.0, 90.0)
```
- Displayed on HUD at all times.
- Applied only to Export Market transactions.

## 12. Profit Prediction System

Before planting, the player can view a **Profit Forecast Panel** for each crop showing:

```
Predicted Revenue:
  avgMarketPrice = average of all 3 markets' current prices for that crop
  predictedYield = crop.baseYield × 0.85  (conservative estimate)
  predictedRevenue = avgMarketPrice × predictedYield × 0.90  (avg quality)

Predicted Cost:
  seedCost = crop.seedCostPerKg × fieldCapacity
  avgTransportCost = avgDistance × 2 × ceil(predictedYield / 500)
  totalCost = seedCost + avgTransportCost

Predicted Net Profit:
  netProfit = predictedRevenue - totalCost
```

Display color-coded: Green if positive, Red if negative, Yellow if marginal (< 10% ROI).

## 13. Reputation System

- Starts at 50.
- Selling high-quality produce (quality > 80%): +2 per sale
- Selling low-quality produce (quality < 50%): -3 per sale
- Successful Export Market sale: +5
- Letting crops die (DEAD state): -5
- Letting storage items spoil to 100%: -3
- Reputation affects negotiation floor (see Market System).
- Reputation affects loan interest rates.
- Clamp to 0–100.

## 14. Seasonal System

Two seasons, each lasting 60 days:
```
Day 1–60: Kharif (Monsoon season)
Day 61–120: Rabi (Winter season)
Day 121–180: Kharif again
... (repeating)
```
- Season affects weather probabilities (see Weather table).
- Season affects crop yield (see Crops table — season mismatch penalty).
- Season change notification shown to player.

## 15. Loan & Credit System

- Player can take a loan from the "Bank" at any time.
- Loan amounts: ₹25,000 / ₹50,000 / ₹1,00,000
- Interest rate per day:
```
dailyInterest = 0.05% + (max(0, 50 - reputation) × 0.002%)
// Good reputation (100): 0.05%/day
// Bad reputation (0): 0.15%/day
```
- Interest compounds daily:
```
loanBalance = loanBalance × (1 + dailyInterestRate)
```
- Player can repay any amount at any time.
- If `loanBalance > 500000`: **GAME OVER** — bank seizes farm.

## 16. Game Over Conditions

- Money < 0 AND no crops planted AND storage empty → GAME OVER (Bankrupt)
- Loan balance > ₹5,00,000 → GAME OVER (Debt seizure)
- Player can also "Win" by reaching ₹10,00,000 money with 0 loan balance.

## 17. Buying Additional Fields & Storage

- Buy new field: ₹30,000 (1000 kg capacity)
- Upgrade storage: ₹20,000 (+2000 kg capacity)
- Max 8 fields, max 15000 kg storage.

---

# SIMULATION RULES — COMPLETE FORMULA REFERENCE

```javascript
// ===================== WEATHER =====================
function generateWeather(season) {
  const weights = season === 'Kharif'
    ? { Sunny: 30, Rain: 35, Heatwave: 15, Storm: 20 }
    : { Sunny: 45, Rain: 25, Heatwave: 20, Storm: 10 };
  // Weighted random selection
}

const WEATHER_EFFECTS = {
  Sunny:    { growth: 0.00, spoilage: 0.00, transportDelay: 0.00, cropDamageChance: 0.00 },
  Rain:     { growth: 0.20, spoilage: 0.10, transportDelay: 0.00, cropDamageChance: 0.00 },
  Heatwave: { growth:-0.15, spoilage: 0.25, transportDelay: 0.30, cropDamageChance: 0.00 },
  Storm:    { growth:-0.30, spoilage: 0.40, transportDelay: 0.50, cropDamageChance: 0.10 },
};

// ===================== GROWTH =====================
// Each day, a growing field accumulates growth points:
// growthPoints += 1 + weather.growth
// Field matures when growthPoints >= crop.maturityDays

// ===================== QUALITY =====================
// qualityPercent = min(100, 60 + (sunnyDays / totalGrowthDays) * 40)

// ===================== HARVEST YIELD =====================
// actualYield = baseYield * (quality/100) * seasonMultiplier * (1 - weatherDamage)
// seasonMultiplier = 1.0 if correct season, 0.6 if wrong season

// ===================== SPOILAGE =====================
// dailySpoilage = baseSpoilageRate + (baseSpoilageRate * weather.spoilage)
// currentSpoilage = min(100, currentSpoilage + dailySpoilage)
// effectiveQuantity = originalQuantity * (1 - currentSpoilage/100)

// ===================== MARKET PRICE =====================
// dailyChange = randomInRange(-volatility, +volatility)
// newPrice = prevPrice * (1 + dailyChange)
// newPrice = clamp(newPrice, basePrice * 0.5, basePrice * 2.0)
// demandMultiplier = 1.0 + 0.3 * sin(2*PI * day/30 + phaseOffset)
// offeredPrice = newPrice * demandMultiplier * randomInRange(negotiationFloor, 1.05)

// ===================== TRANSPORT =====================
// baseTravelDays = ceil(distance / 100)
// actualTravelDays = ceil(baseTravelDays * (1 + weather.transportDelay))
// transportCost = distance * costPerKm * ceil(quantity / 500)
// transitSpoilage = actualTravelDays * dailySpoilageRate

// ===================== EXCHANGE RATE =====================
// newRate = prevRate * (1 + randomInRange(-0.02, 0.02))
// newRate = clamp(newRate, 78.0, 90.0)

// ===================== LOAN =====================
// dailyRate = 0.0005 + max(0, 50 - reputation) * 0.00002
// loanBalance *= (1 + dailyRate)

// ===================== REPUTATION =====================
// +2: sell quality > 80%
// -3: sell quality < 50%
// +5: export sale
// -5: crop dies
// -3: item fully spoils
// clamp(0, 100)
```

---

# STATE MODEL

```typescript
// ============= WORLD STATE =============
interface WorldState {
  day: number;                    // Current day (starts at 1)
  season: 'Kharif' | 'Rabi';     // Current season
  weather: Weather;               // Today's weather
  weatherHistory: Weather[];      // Last 30 days for analytics
  exchangeRate: number;           // Current INR/USD rate
  money: number;                  // Player's cash (INR)
  reputation: number;             // 0–100
  loanBalance: number;            // Outstanding loan amount
  fields: Field[];                // All farm fields
  storage: StorageItem[];         // Items in storage
  storageCapacity: number;        // Max kg in storage
  marketPrices: MarketPrices;     // Current prices per market
  activeTransports: Transport[];  // In-transit deliveries
  gameStatus: 'playing' | 'won' | 'lost';
  notifications: string[];       // Messages shown to player
}

// ============= FIELD =============
interface Field {
  id: number;
  cropType: string | null;        // null if empty
  status: 'EMPTY' | 'PLANTED' | 'GROWING' | 'MATURE' | 'OVERRIPE' | 'DEAD';
  daysPlanted: number;
  growthPoints: number;           // Accumulated growth (weather-adjusted)
  sunnyDays: number;              // Days of sunny weather during growth
  totalGrowthDays: number;        // Total days of growth
  quality: number;                // Calculated quality %
  quantity: number;               // Field capacity in kg
  weatherDamage: number;          // Accumulated damage from storms (0–1)
}

// ============= STORAGE ITEM =============
interface StorageItem {
  id: string;
  cropType: string;
  originalQuantity: number;       // Harvested amount
  currentSpoilage: number;        // 0–100 %
  quality: number;                // Quality at harvest
  daysInStorage: number;
}

// ============= TRANSPORT =============
interface Transport {
  id: string;
  cropType: string;
  quantity: number;
  quality: number;
  spoilageAtDeparture: number;
  marketId: string;
  totalTravelDays: number;
  daysRemaining: number;
  offeredPrice: number;
  transportCost: number;
}

// ============= MARKET PRICES =============
interface MarketPrices {
  localA: { [cropType: string]: number };
  localB: { [cropType: string]: number };
  export: { [cropType: string]: number };  // in USD
}

// ============= CROP DEFINITION =============
interface CropDefinition {
  name: string;
  seedCostPerKg: number;
  maturityDays: number;
  baseYield: number;
  basePrice: number;
  spoilageRate: number;
  weatherSensitivity: 'Low' | 'Medium' | 'High';
  season: 'Kharif' | 'Rabi' | 'Both';
  overripeDays: number;           // Days after maturity before overripe
  deadDays: number;               // Days after overripe before dead
}

// ============= MARKET DEFINITION =============
interface MarketDefinition {
  id: string;
  name: string;
  distance: number;               // km
  costPerKm: number;
  volatility: number;             // e.g., 0.05 = ±5%
  currency: 'INR' | 'USD';
  phaseOffset: number;            // For demand cycle sin wave
}
```

---

# ARCHITECTURE REQUIREMENTS

## Folder Structure (MANDATORY)

```
market2d/
├── App.js                           // Entry point — wraps GameProvider + screen router
├── app.json                         // Expo config
├── package.json
│
├── src/
│   ├── engine/                      // === PURE LOGIC — NO React imports ===
│   │   ├── simulationEngine.js      // Master tick function: advanceDay(state) → newState
│   │   ├── weatherEngine.js         // generateWeather(), getWeatherEffects()
│   │   ├── cropEngine.js            // updateFields(), calculateYield(), calculateQuality()
│   │   ├── marketEngine.js          // updateMarketPrices(), calculateOfferedPrice(), getDemandMultiplier()
│   │   ├── storageEngine.js         // applySpoilage(), addToStorage(), removeFromStorage()
│   │   ├── transportEngine.js       // initiateTransport(), advanceTransports()
│   │   ├── economyEngine.js         // updateExchangeRate(), processLoan(), calculateProfit()
│   │   ├── reputationEngine.js      // updateReputation()
│   │   ├── predictionEngine.js      // predictProfit(crop, field, marketPrices, weather)
│   │   └── gameRules.js             // checkGameOver(), checkWinCondition(), constants
│   │
│   ├── data/                        // === STATIC DATA ===
│   │   ├── crops.js                 // Array of CropDefinition objects
│   │   ├── markets.js               // Array of MarketDefinition objects
│   │   └── constants.js             // Game balance constants
│   │
│   ├── state/                       // === STATE MANAGEMENT ===
│   │   ├── GameContext.js           // React Context + Provider
│   │   ├── gameReducer.js           // useReducer reducer function (all actions)
│   │   ├── actions.js               // Action type constants
│   │   └── initialState.js          // Default WorldState
│   │
│   ├── components/                  // === REUSABLE UI COMPONENTS ===
│   │   ├── FarmView.js              // Top-down 2D farm grid (fields + buildings)
│   │   ├── FieldTile.js             // Single field rectangle with crop stage visuals
│   │   ├── StoragePanel.js          // Storage inventory list
│   │   ├── MarketPanel.js           // Market selection + prices
│   │   ├── WeatherDisplay.js        // Current weather + icon
│   │   ├── HUD.js                   // Top bar: Day, Money, Weather, Exchange Rate, Reputation
│   │   ├── ProfitForecast.js        // Prediction panel for crop planting
│   │   ├── TruckAnimation.js        // Animated truck on 2D map
│   │   ├── TransportStatus.js       // Active transport list + countdown
│   │   ├── LoanPanel.js            // Loan management UI
│   │   ├── NotificationBar.js       // In-game notifications
│   │   ├── CropSelector.js          // Crop selection modal/list
│   │   ├── ActionButton.js          // Reusable styled button
│   │   └── ProgressBar.js           // Reusable progress bar (growth, spoilage)
│   │
│   ├── screens/                     // === SCREEN-LEVEL COMPONENTS ===
│   │   ├── GameScreen.js            // Main game screen (farm + HUD + actions)
│   │   ├── MarketScreen.js          // Market selling interface
│   │   ├── StorageScreen.js         // Storage management
│   │   ├── PlantingScreen.js        // Field selection + crop planting
│   │   ├── BankScreen.js            // Loan management
│   │   ├── GameOverScreen.js        // Win/Lose screen
│   │   └── TitleScreen.js           // Start screen
│   │
│   ├── utils/                       // === UTILITY FUNCTIONS ===
│   │   ├── random.js                // randomInRange(), weightedRandom(), clamp()
│   │   └── formatters.js           // Currency formatting, percentage formatting
│   │
│   └── styles/                      // === SHARED STYLES ===
│       ├── colors.js                // Color palette constants
│       ├── typography.js            // Font sizes, weights
│       └── commonStyles.js          // Shared StyleSheet definitions
```

## Architecture Rules (MANDATORY)

1. **Engine files must be PURE JavaScript** — no React, no JSX, no hooks, no components. Only functions that take state and return new state.
2. **All randomness must go through `utils/random.js`** so it can be seeded later for testing.
3. **The reducer is the ONLY place state changes** — components dispatch actions, reducer calls engine functions.
4. **Components never call engine functions directly** — always through dispatch.
5. **No mutation** — all state updates must return new objects/arrays (immutable pattern).
6. **Every function must have a JSDoc comment** explaining parameters, return values, and game logic.
7. **No `any` types in comments** — be specific about data shapes even in JS.
8. **Constants must be in `data/constants.js`** — no magic numbers in engine or components.
9. **Each component file exports exactly one default component.**
10. **Styles are co-located in the same file** using `StyleSheet.create` at the bottom.

---

# VISUAL DESIGN SPECIFICATION

## Color Palette for Crop Stages
```
EMPTY field:      #8B7355 (brown dirt)
PLANTED:          #8B7355 with small green dot center
GROWING:          #228B22 (forest green) — light
MATURE:           #FFD700 (gold)
OVERRIPE:         #FF8C00 (dark orange)
DEAD:             #4A4A4A (gray)
```

## Weather Overlays
```
Sunny:    Pale yellow tint (#FFFACD20) over farm
Rain:     Blue tint (#4169E140) + animated blue dots falling
Heatwave: Red tint (#FF634720) + shimmer effect
Storm:    Dark overlay (#00000060) + animated white streaks
```

## Layout
```
┌─────────────────────────────────┐
│  HUD: Day | ₹Money | ☀️Weather │ Rep ⭐ │ $/₹ Rate │
├─────────────────────────────────┤
│                                 │
│       ┌───┐  ┌───┐  ┌───┐      │
│       │ F1│  │ F2│  │ F3│      │   ← Farm View (top-down grid)
│       └───┘  └───┘  └───┘      │
│                                 │
│              🏠                 │   ← Storage building
│         ┌──────────┐            │
│         │  Storage │            │
│         └──────────┘            │
│                                 │
│  ┌─── Transport Map ──────┐    │
│  │  🚜 ───────→  🏪       │    │   ← Truck animation area
│  └─────────────────────────┘    │
│                                 │
├─────────────────────────────────┤
│ [Plant] [Harvest] [Market] [Bank] [Next Day ▶] │  ← Action bar
└─────────────────────────────────┘
```

## Field Tile Visual (60×60 px conceptual)
```
┌──────────┐
│ 🌾 Wheat │  ← Crop emoji/icon
│ Day 8/12 │  ← Growth progress
│ ██████░░ │  ← Progress bar
│ GROWING  │  ← Status label
└──────────┘
```

---

# REDUCER ACTIONS (Complete List)

```javascript
// Time
'NEXT_DAY'                    // Advance simulation by 1 day

// Planting
'PLANT_CROP'                  // { fieldId, cropType }
'HARVEST_FIELD'               // { fieldId }

// Market
'SELL_TO_MARKET'              // { storageItemId, marketId }
'REFRESH_MARKET_PRICES'       // (auto on day advance)

// Transport
'COMPLETE_TRANSPORT'          // { transportId }

// Economy
'TAKE_LOAN'                   // { amount }
'REPAY_LOAN'                  // { amount }
'BUY_FIELD'                   // {}
'UPGRADE_STORAGE'             // {}

// UI State
'SET_SCREEN'                  // { screen: 'game' | 'market' | 'storage' | 'planting' | 'bank' | 'gameover' | 'title' }
'DISMISS_NOTIFICATION'        // { index }
'SELECT_FIELD'                // { fieldId }
```

---

# DETAILED COMPONENT SPECIFICATIONS

## HUD.js
Display in a single horizontal bar:
- 📅 Day {day} | {season}
- 💰 ₹{money} (green if positive, red if < 10000)
- ☀️/🌧️/🔥/⛈️ {weather}
- ⭐ Rep: {reputation}
- 💱 ₹{exchangeRate}/$ 
- 🏦 Loan: ₹{loanBalance} (hidden if 0)

## FarmView.js
- Render fields in a responsive grid (3 columns).
- Each field is a tappable `FieldTile`.
- Below the field grid, show the storage building icon.
- Tapping a field opens context actions (plant/harvest depending on state).

## FieldTile.js
- Background color based on field status.
- Show crop name (if planted).
- Show growth progress bar.
- Show status text.
- Show quality indicator for MATURE fields.
- Pulsing animation for MATURE fields (ready to harvest).
- Red border for OVERRIPE/DEAD fields.

## MarketPanel.js
- List all 3 markets.
- For each market show:
  - Name
  - Distance
  - Current price for selected crop
  - Demand indicator (High/Medium/Low based on demandMultiplier)
  - Estimated transport cost
  - Estimated revenue
  - Estimated profit (color-coded)
- "Sell" button for each market.

## TruckAnimation.js
- Show a horizontal path from left (Farm) to right (Market).
- Truck icon (🚜 or colored rectangle) moves from left to right.
- Position calculated as: `(totalDays - daysRemaining) / totalDays * pathWidth`
- Below the truck: "Day X of Y — Arriving in Z days"
- Shows crop being transported and quantity.

## ProfitForecast.js
- Before planting, show a card for each crop:
  - Crop name & icon
  - Maturity days
  - Predicted yield
  - Current avg price across markets
  - Estimated revenue
  - Seed cost
  - Transport cost estimate
  - **NET PROFIT** (large, bold, color-coded)
  - ROI percentage
  - Season compatibility indicator

---

# OUTPUT FORMAT

Generate ALL files listed in the folder structure above. Every file must be complete, functional, and well-commented.

Specifically output:

1. **`App.js`** — Complete entry point with GameProvider and screen router
2. **All engine files** (`src/engine/*.js`) — Pure simulation logic with JSDoc comments
3. **All data files** (`src/data/*.js`) — Crop definitions, market definitions, constants
4. **All state files** (`src/state/*.js`) — Context, reducer, actions, initial state
5. **All component files** (`src/components/*.js`) — Full UI components with styles
6. **All screen files** (`src/screens/*.js`) — Full screen compositions
7. **All utility files** (`src/utils/*.js`) — Helper functions
8. **All style files** (`src/styles/*.js`) — Shared style constants

Each file must:
- Be complete (no "// TODO" or "// implement later")
- Have a file header comment explaining its purpose
- Have JSDoc on every exported function
- Use `StyleSheet.create` for all styles (no inline)
- Follow the immutable state pattern
- Be immediately runnable with `npx expo start`

The total codebase should be a **fully playable game** from the first run.

---

# CRITICAL CONSTRAINTS

1. **NO external packages** — only what Expo provides out of the box
2. **NO TypeScript** — pure JavaScript only (use JSDoc for type documentation)
3. **NO class components** — functional only
4. **NO React Navigation** — use simple state-based screen switching
5. **NO inline styles** — all `StyleSheet.create`
6. **NO async/await in game logic** — simulation must be synchronous and deterministic
7. **Every formula listed above must be implemented EXACTLY as specified**
8. **The game must compile and run on first `npx expo start`**
