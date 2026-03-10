# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commandes de développement

```bash
# Frontend (port 3000)
cd frontend && npm run dev

# Backend (port 3001)
cd backend && npm run dev

# Build frontend
cd frontend && npm run build

# Tests
cd frontend && npm test          # vitest run (one-shot)
cd frontend && npm run test:watch # vitest watch
```

Le frontend proxifie `/api` et `/auth` vers `http://localhost:3001` (vite.config.js).

---

## Stack technique

- **Frontend** : React 18 + Vite, React Router v6 (HashRouter), Recharts, Axios, Lucide React
- **Backend** : Node.js + Express (port 3001), Passport Google OAuth 2.0, Google Drive API, yahoo-finance2, @anthropic-ai/sdk
- **CSS** : Un seul fichier `frontend/src/styles/styles.css` — CSS variables, 5 thèmes × 2 modes (dark/light). Jamais de fichier CSS par composant.
- **Déploiement** : GitHub Pages (frontend via `.github/workflows/deploy.yml`), backend sur Render
- **PWA** : Service Worker, manifest.json, push notifications

---

## Architecture globale

```
frontend/src/
  App.jsx              # Routes (HashRouter)
  main.jsx             # Providers nesting (voir ci-dessous)
  context/             # 6 providers React Context
  pages/               # 25 pages (main + strategy/ + beta/)
  services/            # 20+ modules métier
  components/          # 8 composants partagés
  hooks/               # 3 hooks custom
  workers/             # bankWorker.js (Web Worker)
  styles/styles.css    # CSS unique
  data/                # guestDemoData.js

backend/src/
  server.js            # Express app
  config/index.js      # Centralized env vars
  middleware/auth.js   # requireAuth / optionalAuth (JWT)
  routes/              # 9 fichiers de routes
  services/            # 11 services + ai/ (multi-provider)
  utils/calculations.js
```

### Nesting des providers (main.jsx)
```
HashRouter
  → ThemeProvider
    → PrivacyProvider
      → AuthProvider
        → PortfolioProvider
          → App  (BankProvider est injecté dans ProtectedRoute)
```

---

## Context providers — responsabilités

| Context | Fichier | Ce qu'il gère |
|---------|---------|---------------|
| **AuthContext** | `context/AuthContext.jsx` | Google OAuth (redirect, pas popup), JWT, guest mode, user, accessToken, gapiReady |
| **PortfolioContext** | `context/PortfolioContext.jsx` | CRUD assets (crypto/pea/livrets/fundraising/objectives/goals), DCA plans, totals, rates, prices, Drive persistence |
| **BankContext** | `context/BankContext.jsx` | Import Excel, catégorisation (AI + règles), transactions, aggregates, healthScore, budgetProfile, coach |
| **ThemeContext** | `context/ThemeContext.jsx` | 5 thèmes (crimson/ocean/slate/amethyst/teal), dark/light, localStorage |
| **PrivacyContext** | `context/PrivacyContext.jsx` | hideValues toggle, localStorage `pm-hide-values` |
| **BetaContext** | `context/BetaContext.jsx` | Feature flags, profil utilisateur (monthlyIncome, riskTolerance, horizon), user-profile.json sur Drive |

---

## Persistance des données

| Stockage | Fichiers / Clés | Contenu |
|----------|----------------|---------|
| **Google Drive** | `portfolio.json` | Actifs (crypto, pea, livrets, fundraising, objectives, goals), DCA config |
| **Google Drive** | `bank_history.json` | Transactions bancaires, catégorisations, règles apprises, audit log |
| **Google Drive** | `user-profile.json` | Profil BetaContext (revenus, horizon, tolérance risque) |
| **Google Drive** | `dca_plans.json` + `dca_snapshots.json` | Plans DCA et historique snapshots |
| **localStorage** | `pm-theme`, `pm-dark-mode` | Thème et mode |
| **localStorage** | `pm-hide-values` | Privacy mask |
| **sessionStorage** | access token Google | Token OAuth éphémère |

Saves Drive : debounce **1.5s** (portfolio), **2s** (DCA snapshots). Pas de base de données.

---

## Routes frontend (App.jsx)

| Route | Composant | Remarque |
|-------|-----------|----------|
| `/login` | Login | Public |
| `/settings` | Settings | Pas de ProtectedRoute |
| `/` | Dashboard | Cockpit stratégique |
| `/strategy` | StrategyLab | Hub Strategy Lab |
| `/strategy/projection` | ProjectionGlobale | Projection 10-30 ans |
| `/strategy/objective` | ObjectifFinancier | Objectif + calcul écart |
| `/strategy/objectifs` | Objectifs | CRUD objectifs, assignation actifs |
| `/strategy/fire` | FIRECalculator | Freedom Number, règle 4 % |
| `/strategy/scenarios` | Scenarios | 3 scénarios comparés |
| `/portfolio` | Portfolio | Hub patrimonial |
| `/portfolio/crypto` | Crypto | Actifs crypto |
| `/portfolio/pea` | PEA | Actions PEA |
| `/portfolio/livrets` | Livrets | Épargne réglementée + importée |
| `/portfolio/fundraising` | Fundraising | Levées de fonds |
| `/portfolio/banking` | Banking | Transactions + import |
| `/portfolio/dca` | DCA | Plans DCA |
| `/insights` | Insights | Recommandations AI |

---

## API Routes backend

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/auth/google` | Initier OAuth |
| GET | `/auth/google/callback` | Callback OAuth → JWT |
| GET/PUT | `/api/portfolio` | Charger/sauvegarder portfolio (Drive) |
| GET | `/api/crypto/prices?ids=...&currency=eur` | Prix CoinGecko |
| GET | `/api/stocks/:isin` | Prix action par ISIN (Yahoo Finance) |
| GET | `/api/livrets/rates` | Taux réglementés |
| GET | `/api/market/fear-greed` | Indices Fear & Greed |
| POST | `/api/insights/analyze` | Analyse portfolio AI |
| POST | `/api/insights/stocks` | Stock Screener (Claude AI) |
| POST | `/api/bank/categorize` | Catégorisation marchands (LRU cache 500 entries, 7j TTL) |
| POST | `/api/bank/categorize-lines` | Catégorisation lignes |
| POST | `/api/bank/coach` | Coach budgétaire AI |

---

## Services frontend — carte des modules

### Données de marché
- `services/priceService.js` — CoinGecko (crypto), Yahoo Finance (stocks via proxy chain). Cache 5min. Exports: `fetchCryptoPrices`, `fetchStockPrice(s)`, `searchISIN`, `searchCoinGecko`
- `services/rateProvider.js` — Taux livrets (cached)
- `services/market.js` — Fear & Greed index
- `services/interestEngine.js` — Calcul intérêts quinzaines livrets : `calculateInterestYTD`, `calculateInterestAnnualEstimate`

### Banque
- `services/bankParser.js` — Parse Excel XLSX → transactions. Convention feuilles : `ACC__TYPE__ALIAS` (ex: `ACC__LIVRET__LivretA`). Type `'livret'` ou `'courant'`.
- `services/bankEngine.js` — Facade : `categorize`, `categorizeAll`, `deduplicateTransactions`, DEFAULT_RULES (11 regex)
- `services/bankAI.js` — Batches catégorisation AI (backend)
- `services/bankWorkerBridge.js` — IPC avec Web Worker
- `workers/bankWorker.js` — Traitement off-main-thread (catégorisation, agrégation, détection virements)
- `services/allocationEngine.js` — MACRO_BUCKETS, ALLOCATION_MODELS (prudent/équilibré/offensif), `computeCurrentAllocation`, `getAllocationGaps`
- `services/financialHealthScoring.js` — Score santé financière 0-100
- `services/budgetCoachEngine.js` — Insights budget

### Strategy Engine (pipeline)
```
portfolioDataProvider → strategyInputBuilder → projectionEngine
        ↓                       ↓                    ↓
  buildPortfolioSnapshot  buildStrategyInputs   projectTrajectory
  getDcaMonthlyContrib    buildEnvelopeContribs  computeTimeToTarget
                                                 computeMilestones
                          ↓              ↓
                    scenarioEngine   fireEngine
                          ↓
                  strategyInsightsEngine → strategyViewModelBuilder
```

Tous dans `services/strategy/`. Entry point : `services/strategy/index.js`.

Formule projection (projectionEngine) :
```
Value(m+1) = (Value(m) + Contribution) × (1 + return_m)
```
Retourne : nominal, réel (inflation-ajusté), contributions, gains par mois.

### Goals Engine
- `services/goalsEngine.js` — Pure functions. `createGoal`, `updateGoal`, `deleteGoal`, `assignAssetToGoal` (1 actif = 1 objectif), `unassignAsset`, `resolveAssetValue`, `computeGoalProgress`
- `services/goalProjectionEngine.js` — Binary search pour mois-jusqu'à-objectif. `projectGoal`, `getDefaultGoals`. Types : emergency_fund, investment, real_estate, freedom, other.

### DCA
- `services/dcaEngine.js` — `matchPlanToAsset` (Jaccard similarity), `getDCASchedule`, `updateDCASnapshots`, `migrateLegacyConfig` (dca-config.json → dca_plans.json version=1)

### Autres
- `services/api.js` — Axios instance, redirect /login sur 401
- `services/googleDrive.js` — `loadPortfolioFromDrive`, `savePortfolioToDrive`, `loadFileFromDrive`, `saveFileToDrive`
- `services/notifications.js`, `services/pushNotifications.js`, `services/emailService.js`
- `data/guestDemoData.js` — Portfolio démo pour mode invité

---

## Composants partagés

| Composant | Rôle |
|-----------|------|
| `Layout.jsx` | Wrapper principal avec Sidebar + Header |
| `Sidebar.jsx` | Navigation latérale |
| `Header.jsx` | Barre top |
| `GoalSelector.jsx` | Sélecteur inline d'objectif sur chaque ligne d'actif |
| `BankImportModal.jsx` | Import Excel bancaire (drag & drop) |
| `InstallPrompt.jsx` | CTA installation PWA |

---

## Hooks custom

| Hook | Rôle |
|------|------|
| `usePrivacyMask` | Retourne `m(value)` — masque si hideValues actif |
| `usePriceRefresh` | Polling prix toutes les N ms (défaut 60s) |
| `useWindowSize` | Dimensions fenêtre réactives |

---

## CSS — règles critiques

- **Fichier unique** : `frontend/src/styles/styles.css`. Toutes les règles ici, jamais dans les composants.
- **Variables** : couleurs, spacing, radius via `var(--...)`. Thème appliqué via `data-theme` et `data-mode` sur `<html>`.
- **Responsive** : `overflow-x: hidden` sur html/body/app-layout/main-content. `min-width: 0` sur les enfants de grilles CSS pour éviter l'overflow.
- **Select natif** : `color-scheme: dark` + `select option { background: var(--bg-secondary) }` pour thèmer les dropdowns.
- **Breakpoints** : `@media (max-width: 768px)` et `@media (max-width: 480px)`.
- **Grilles** : `.grid-2`, `.grid-3`, `.grid-4` — passent à 1-2 col sur mobile.

---

## Conventions de code

- **IDs** : UUIDs pour tous les actifs
- **Devise** : EUR par défaut, format `fr-FR`
- **Langue UI** : Français
- **Proxy CORS** : Cloudflare Worker pour APIs bloquées (Yahoo Finance, etc.)
- **Privacy** : Toujours utiliser `m(value)` depuis `usePrivacyMask` pour afficher les montants sensibles
- **Disclaimer** : Obligation légale — visible sur toutes les pages de projection
- **Fundraising** : Valeur courante = `currentPrice × quantity` (pas `amountInvested`)
- **Livrets importés** : `accountBalances.filter(a => a.type === 'livret')` depuis BankContext. Convention feuille Excel : `ACC__LIVRET__NOM`

---

## Roadmap

| Phase | Statut | Objectif |
|-------|--------|----------|
| Phase 1 | ✅ | Repositionnement produit + dashboard stratégique |
| Phase 2 | ✅ | Moteur de projection globale |
| Phase 3 | ✅ | Goals Engine + Objectifs |
| Phase 4 | ✅ | Scenario Engine + FIRE Calculator |
| Phase 5 | 🔲 | Allocation optimizer |
| Phase 6 | 🔲 | Time optimizer (gagner du temps vers l'objectif) |

---

## Principes de développement

1. Ne jamais casser le Portfolio Core (PortfolioContext + services CRUD)
2. Le Strategy Lab est le cœur différenciant — toujours le protéger
3. Architecture modulaire : data / moteur / UI séparés
4. CSS unique via variables — pas de fichiers CSS par page
5. Refactor incrémental, jamais de refonte destructrice
6. Design SaaS financier moderne et premium
7. Langue UI : français, devise EUR par défaut
