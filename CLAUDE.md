# Investment Strategy Optimizer

## Vision du produit

L'application n'est pas un simple Portfolio Manager. C'est un **Investment Strategy Optimizer** dont la mission est d'aider l'utilisateur à :

- Visualiser la trajectoire future de son patrimoine
- Comparer plusieurs stratégies d'investissement
- Optimiser son allocation et son effort d'épargne
- Atteindre plus rapidement un objectif financier

Le message produit : **« Optimisez votre trajectoire patrimoniale »**

## Architecture

L'application repose sur trois couches :

### Portfolio Core
- Gestion des transactions (crypto, PEA, livrets, fundraising)
- Reconstruction des positions
- Valorisation actuelle (prix temps réel via CoinGecko, Yahoo Finance)
- Enrichissement des données marché
- Import bancaire Excel, catégorisation AI

### Strategy Engine
- `portfolioDataProvider` — agrège les données du Portfolio Core en entrée stratégique
- `strategyInputBuilder` — construit les hypothèses (rendement, inflation, effort d'épargne) + distribution DCA par enveloppe
- `projectionEngine` — moteur de projection patrimoniale sur N années
- `scenarioEngine` — compare 3 scénarios (actuel / recommandé / ambitieux)
- `fireEngine` — calcul Freedom Number, règle des 4 %, scénarios FIRE
- `strategyInsightsEngine` — génère des recommandations et leviers d'optimisation
- `strategyViewModelBuilder` — formate les données pour les composants UI

### Goals Engine
- `goalsEngine.js` — CRUD, asset assignment (1 asset = 1 goal), progress computation
- `goalProjectionEngine.js` — compound-interest projections, date estimée dynamique
- Pure functions, no side effects
- `Objectifs.jsx` — Strategy Lab page for creating/managing goals
- `GoalSelector.jsx` — inline selector on asset rows (Crypto, PEA, Livrets, Fundraising)
- Persistence via `portfolio.goals[]` in Google Drive

### Strategy UI
- Dashboard stratégique (cockpit de trajectoire)
- Strategy Lab (projection, scénarios, objectifs)
- Insights et recommandations
- Modules de simulation

## Tech Stack
- **Frontend** : React 18 + Vite (port 3000), React Router v6, Recharts, Axios, Lucide React, CSS Variables (themes)
- **Backend** : Node.js + Express (port 3001), Passport Google OAuth 2.0, Google Drive API, yahoo-finance2, @anthropic-ai/sdk
- **Déploiement** : GitHub Pages (frontend via `deploy.yml`), backend sur Render
- **PWA** : Service Worker, manifest.json, push notifications

## Structure des pages

Navigation principale :

| Section | Rôle |
|---------|------|
| **Dashboard** | Cockpit stratégique — trajectoire, objectif, KPIs orientés futur |
| **Strategy Lab** | Laboratoire stratégique — projection, scénarios, objectifs, enveloppes |
| **Portfolio** | Hub patrimonial — Crypto, PEA, Livrets, Fundraising, Banque, DCA |
| **Insights** | Recommandations, alertes, analyse stratégique, Invest LAB |
| **Settings** | Paramètres, clés API, thèmes, préférences |

## Strategy Lab

Le Strategy Lab est le cœur différenciant du produit. Il est composé de 6 modules :

| Module | Route | Description |
|--------|-------|-------------|
| **Projection globale** | `/strategy/projection` | Projection du patrimoine total sur 10-30 ans |
| **Objectif financier** | `/strategy/objective` | Définir un objectif, calculer l'écart et le chemin |
| **Vos objectifs** | `/strategy/objectifs` | CRUD d'objectifs, assignation d'actifs, suivi de progression |
| **Liberté financière** | `/strategy/fire` | FIRE Calculator — Freedom Number, règle des 4 % |
| **Comparateur de scénarios** | `/strategy/scenarios` | Comparer actuel vs recommandé vs ambitieux |
| **Projection par enveloppe** | — | Projection détaillée par classe d'actifs (à venir) |

Tous les modules utilisent un moteur de projection commun (`projectionEngine`).

## Structure des dossiers

```
frontend/
  src/
    components/    # Layout, Sidebar, Header, BankImportModal, InstallPrompt
    context/       # AuthContext, BankContext, PortfolioContext, PrivacyContext, ThemeContext
    hooks/         # usePriceRefresh, usePrivacyMask, useWindowSize
    pages/         # Dashboard, StrategyLab, Portfolio, Insights, Settings
    pages/portfolio/ # Crypto, PEA, Livrets, Banking, DCA, Fundraising, Objectives
    services/      # api, auth, bankAI, bankEngine, crypto, insights, portfolio, stocks, etc.
    workers/       # bankWorker.js
    styles/        # app.css (fichier unique)
backend/
  src/
    config/        # index.js
    middleware/     # auth.js
    routes/        # auth, categorize, coach, crypto, insights, livrets, market, portfolio, stocks
    services/      # ai/, crypto, googleDrive, insights, market, stocks, stockScreener
    utils/         # calculations.js
```

## Persistance des données
- **Google Drive** : `portfolio.json`, `bank_history.json`, `user-profile.json`, `secrets.json`
- **localStorage** : theme, darkMode, hideValues, DCA reminders, guest data
- **sessionStorage** : access token Google

## Principes de développement

1. Ne jamais casser le Portfolio Core
2. Architecture modulaire : séparer data, moteur et UI
3. Privilégier la lisibilité du code
4. Éviter les dépendances lourdes
5. Design SaaS financier moderne et premium
6. Le Strategy Lab est le cœur différenciant — toujours le protéger
7. Refactor incrémental, jamais de refonte destructrice
8. CSS unique via variables — pas de fichiers CSS par page
9. Langue UI : français, devise EUR par défaut

## Roadmap

| Phase | Objectif |
|-------|----------|
| **Phase 1** ✅ | Repositionnement produit + nouveau dashboard stratégique |
| **Phase 2** ✅ | Moteur de projection globale (`projectionEngine`) |
| **Phase 3** ✅ | Goals Engine + Objectifs + Lexique pédagogique |
| **Phase 4** ✅ | Scenario Engine + FIRE Calculator + corrections financières |
| **Phase 5** | Allocation optimizer |
| **Phase 6** | Time optimizer (gagner du temps vers l'objectif) |

## API Routes Backend

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/auth/google` | Initier OAuth |
| GET | `/auth/google/callback` | Callback OAuth → JWT |
| GET/PUT | `/api/portfolio` | Charger/sauvegarder portfolio (Drive) |
| GET | `/api/crypto/prices?ids=...&currency=eur` | Prix crypto |
| GET | `/api/stocks/:isin` | Prix par ISIN |
| GET | `/api/livrets/rates` | Taux livrets |
| GET | `/api/market/fear-greed` | Indices Fear & Greed |
| POST | `/api/insights/analyze` | Analyse portfolio AI |
| POST | `/api/insights/stocks` | Stock Screener (Claude AI) |
| POST | `/api/bank/categorize` | Catégorisation AI |
| POST | `/api/bank/coach` | Coach budgétaire AI |

## Conventions
- UUIDs pour les IDs d'assets
- Debounce 1.5s sur saves Drive
- Pas de base de données — tout sur Google Drive (JSON)
- CORS proxy Cloudflare Worker pour APIs bloquées
- 5 thèmes × 2 modes (light/dark) via CSS variables

## Corrections financières Phase 4
- Dashboard : objectif lu depuis `portfolio.goals` (type `long_term`), CTA si aucun objectif
- Contribution initiale : pré-remplie depuis DCA actif, puis moyenne épargne, puis 500 € fallback
- Distribution contribution : DCA par enveloppe en priorité, proportionnel en fallback (`buildEnvelopeContributions`)
- Goals : date estimée calculée dynamiquement via `goalProjectionEngine.projectGoal()`
- Fundraising : valeur courante utilisée (`currentPrice × quantity`) au lieu de `amountInvested`
- Objectifs unifiés : `ObjectifFinancier` propose d'utiliser un objectif `long_term` existant ; `Objectifs` offre un lien "Voir la projection" vers `/strategy/objective`
- Disclaimer de risque visible sur toutes les pages de projection (obligation légale)
