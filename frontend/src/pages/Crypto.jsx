import { useState, useCallback, useMemo } from 'react'
import {
  Plus, X, Trash2, RefreshCw, Loader2,
  TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownLeft, Pencil,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { usePortfolio } from '../context/PortfolioContext'
import { usePriceRefresh } from '../hooks/usePriceRefresh'
import { usePrivacyMask } from '../hooks/usePrivacyMask'
import { searchCoinGecko, fetchCryptoPrices } from '../services/priceService'
import { syncBinanceToPortfolio } from '../services/binanceService'
import GoalSelector from '../components/GoalSelector'
import { assignAssetToGoal, unassignAsset } from '../services/goalsEngine'

const fmt = (n) => n != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n) : '—'
const fmtQty = (n) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 }).format(n) : '—'
const fmtPct = (n) => n != null ? `${n >= 0 ? '+' : ''}${n.toFixed(2)}%` : '—'
const fmtTime = (d) => d ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(d) : null
const fmtDate = (d) => d ? new Intl.DateTimeFormat('fr-FR').format(new Date(d)) : '—'

/* ===== Running PRU per movement ===== */
function computeRunningPRU(movements) {
  let cumQty = 0, cumCost = 0
  return movements.map(mv => {
    if (mv.type === 'buy') {
      cumQty += mv.quantity
      cumCost += mv.quantity * mv.price + (mv.fees || 0)
    } else {
      const oldQty = cumQty
      cumQty = Math.max(cumQty - mv.quantity, 0)
      if (oldQty > 0) cumCost = cumCost * (cumQty / oldQty)
    }
    return cumQty > 0 ? cumCost / cumQty : 0
  })
}

/* ===== Chart data builder ===== */
function buildChartData(asset) {
  const movements = [...(asset.movements || [])].sort((a, b) => a.date.localeCompare(b.date))
  if (movements.length === 0) return []
  let cumQty = 0, cumCost = 0
  const points = []
  for (const mv of movements) {
    if (mv.type === 'buy') { cumQty += mv.quantity; cumCost += mv.quantity * mv.price + (mv.fees || 0) }
    else { cumQty = Math.max(cumQty - mv.quantity, 0) }
    points.push({ date: mv.date, invested: Math.round(cumCost * 100) / 100, value: Math.round(cumQty * (asset.currentPrice || mv.price) * 100) / 100 })
  }
  const today = new Date().toISOString().slice(0, 10)
  if (points[points.length - 1]?.date !== today) {
    points.push({ date: today, invested: Math.round(cumCost * 100) / 100, value: Math.round(cumQty * (asset.currentPrice || asset.buyPrice) * 100) / 100 })
  }
  return points
}

/* ===== Add / Edit Crypto Modal ===== */
function AddCryptoModal({ onClose, onAdd, editAsset }) {
  const isEdit = !!editAsset

  // Pre-fill state when editing
  const [query, setQuery] = useState(isEdit ? editAsset.name : '')
  const [suggestions, setSuggestions] = useState([])
  const [selected, setSelected] = useState(
    isEdit
      ? { id: editAsset.coingeckoId, name: editAsset.name, symbol: editAsset.symbol, thumb: editAsset.coinImage }
      : null
  )
  const [searching, setSearching] = useState(false)
  const [form, setForm] = useState({
    quantity: isEdit ? String(editAsset.quantity) : '',
    buyPrice: isEdit ? String(editAsset.buyPrice) : '',
    buyDate: isEdit ? (editAsset.buyDate || '') : '',
  })

  const handleSearch = useCallback(async (q) => {
    setQuery(q)
    if (q.length < 2) { setSuggestions([]); return }
    setSearching(true)
    try {
      const results = await searchCoinGecko(q)
      setSuggestions(results)
    } catch {
      setSuggestions([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleSelect = (coin) => {
    setSelected(coin)
    setQuery(coin.name)
    setSuggestions([])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selected) return
    onAdd({
      ...(isEdit ? { id: editAsset.id } : {}),
      name: selected.name,
      symbol: selected.symbol,
      coingeckoId: selected.id,
      coinImage: selected.thumb,
      quantity: parseFloat(form.quantity),
      buyPrice: parseFloat(form.buyPrice),
      currentPrice: isEdit ? editAsset.currentPrice : parseFloat(form.buyPrice),
      buyDate: form.buyDate,
      source: 'manual',
    })
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? 'Modifier la crypto' : 'Ajouter une crypto'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group pos-relative">
            <label className="form-label">Rechercher une crypto (CoinGecko)</label>
            <div className="pos-relative">
              <input
                className="form-input"
                placeholder="Bitcoin, BTC..."
                value={query}
                onChange={e => handleSearch(e.target.value)}
                autoComplete="off"
              />
              {searching && (
                <span className="crypto-search-spinner">
                  <Loader2 size={14} className="animate-spin text-muted" />
                </span>
              )}
            </div>
            {suggestions.length > 0 && (
              <div className="crypto-suggestions">
                {suggestions.map(c => (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className="crypto-suggestion-item"
                  >
                    {c.thumb && <img src={c.thumb} alt={c.name} className="crypto-suggestion-img" />}
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-xs text-muted">{c.symbol}</span>
                    {c.marketCapRank && <span className="text-xs text-muted ml-auto">#{c.marketCapRank}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div className="crypto-selected-chip">
              {selected.thumb && <img src={selected.thumb} alt={selected.name} className="crypto-selected-img" />}
              <span className="font-semibold">{selected.name}</span>
              <span className="text-xs text-muted">{selected.symbol}</span>
              <button type="button" className="crypto-selected-clear" onClick={() => { setSelected(null); setQuery('') }}>
                <X size={14} />
              </button>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Quantite</label>
            <input className="form-input" type="number" step="any" placeholder="0.5" required
              value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Prix d'achat (EUR)</label>
            <input className="form-input" type="number" step="any" placeholder="30000" required
              value={form.buyPrice} onChange={e => setForm({ ...form, buyPrice: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Date d'achat</label>
            <input className="form-input" type="date" required value={form.buyDate}
              onChange={e => setForm({ ...form, buyDate: e.target.value })} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={!selected}>
              {isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ===== Movement Form ===== */
function MovementForm({ assetId, onAdd }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [type, setType] = useState('buy')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [fees, setFees] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const qty = parseFloat(quantity)
    const px = parseFloat(price)
    if (!qty || qty <= 0 || !px || px <= 0) return
    onAdd(assetId, { date, type, quantity: qty, price: px, fees: parseFloat(fees) || 0 })
    setQuantity('')
    setPrice('')
    setFees('')
  }

  return (
    <form onSubmit={handleSubmit} className="asset-movement-form">
      <input type="date" className="form-input asset-form-date" value={date} onChange={e => setDate(e.target.value)} />
      <div className="asset-type-toggle">
        <button type="button" className={type === 'buy' ? 'active-buy' : ''} onClick={() => setType('buy')}>
          <ArrowDownLeft size={12} />Achat
        </button>
        <button type="button" className={type === 'sell' ? 'active-sell' : ''} onClick={() => setType('sell')}>
          <ArrowUpRight size={12} />Vente
        </button>
      </div>
      <input type="number" className="form-input asset-form-qty" step="any" min="0.000001" placeholder="Qte" required value={quantity} onChange={e => setQuantity(e.target.value)} />
      <input type="number" className="form-input asset-form-price" step="0.01" min="0.01" placeholder="Prix" required value={price} onChange={e => setPrice(e.target.value)} />
      <input type="number" className="form-input asset-form-fees" step="0.01" min="0" placeholder="Frais" value={fees} onChange={e => setFees(e.target.value)} />
      <button type="submit" className="btn btn-primary btn-sm"><Plus size={14} /> Ajouter</button>
    </form>
  )
}

/* ===== Performance Chart ===== */
function PerformanceChart({ asset }) {
  const data = useMemo(() => buildChartData(asset), [asset])

  if (data.length < 2) {
    return <div className="asset-chart-empty">Pas assez de donnees pour afficher le graphique (min. 2 points)</div>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" tickFormatter={v => `${v} \u20AC`} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.8rem' }}
          formatter={(value) => [fmt(value)]}
          labelFormatter={(label) => fmtDate(label)}
        />
        <Line type="monotone" dataKey="invested" name="Investissement" stroke="var(--accent)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="value" name="Valeur" stroke="var(--success)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

/* ===== Accordion Card ===== */
const CRYPTO_PERIODS = [
  { key: '1h', label: '1h' },
  { key: '24h', label: '24h' },
  { key: '7d', label: '7j' },
  { key: '30d', label: '30j' },
  { key: '1y', label: '1a' },
  { key: 'max', label: 'Max' },
]

function getChangePct(asset, period, gainPct) {
  if (period === '1h') return asset.change1h
  if (period === '24h') return asset.change24h
  if (period === '7d') return asset.change7d
  if (period === '30d') return asset.change30d
  if (period === '1y') return asset.change1y
  if (period === 'max') return gainPct
  return null
}

function getChangeEur(asset, period, gain) {
  if (period === 'max') return gain
  const pct = getChangePct(asset, period, null)
  if (pct == null) return null
  return (pct / 100) * asset.currentPrice * asset.quantity
}

function CryptoCard({ asset, isExpanded, onToggle, onDelete, onEdit, onAddMovement, onDeleteMovement }) {
  const { m, mp } = usePrivacyMask()
  const [changePeriod, setChangePeriod] = useState('24h')
  const current = asset.currentPrice || asset.buyPrice
  const totalValue = current * asset.quantity
  // Compute totalInvested from movements for accuracy (avoids PRU rounding drift)
  const rawMovements = asset.movements || []
  const totalInvested = rawMovements.length > 0
    ? rawMovements.reduce((sum, mv) => mv.type === 'buy' ? sum + mv.quantity * mv.price + (mv.fees || 0) : sum, 0)
    : asset.buyPrice * asset.quantity
  const gain = totalValue - totalInvested
  const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0
  // Sort movements chronologically for display
  const movements = [...rawMovements].sort((a, b) => a.date.localeCompare(b.date))
  const prusPerMovement = computeRunningPRU(movements)
  const currentPRU = prusPerMovement.length > 0 ? prusPerMovement[prusPerMovement.length - 1] : asset.buyPrice
  const borderClass = gain > 0 ? 'asset-card--positive' : gain < 0 ? 'asset-card--negative' : 'asset-card--neutral'

  return (
    <div className={`asset-card ${borderClass}`}>
      {/* Collapsed header */}
      <div className="asset-card-header" onClick={onToggle}>
        <div className="asset-card-left">
          {asset.coinImage
            ? <img src={asset.coinImage} alt={asset.symbol} className="crypto-card-img" />
            : <div className="crypto-icon">{(asset.symbol || '?')[0]}</div>
          }
          <div>
            <span className="asset-card-name">{asset.name || 'Sans nom'}</span>
            <span className="crypto-card-symbol">{asset.symbol}</span>
          </div>
        </div>
        <div className="crypto-card-middle">
          <span>{fmtQty(asset.quantity)} x {fmt(current)}</span>
        </div>
        <div className="asset-card-right">
          <span className={`badge ${gain >= 0 ? 'badge-success' : 'badge-danger'}`}>
            {gain >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {m(fmt(gain))} ({mp(fmtPct(gainPct))})
          </span>
          <div className="asset-card-chevron">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Summary stats — always visible */}
      <div className="asset-card-summary">
        <div className="asset-card-summary-item">
          <span className="asset-card-summary-label">Investi</span>
          <span className="asset-card-summary-value">{m(fmt(totalInvested))}</span>
        </div>
        <div className="asset-card-summary-item">
          <span className="asset-card-summary-label">PRU</span>
          <span className="asset-card-summary-value">{m(fmt(currentPRU))}</span>
        </div>
        <div className="asset-card-summary-item">
          <span className="asset-card-summary-label">Valeur actuelle</span>
          <span className="asset-card-summary-value font-semibold">{m(fmt(totalValue))}</span>
        </div>
        <div className="asset-card-summary-item">
          <span className="asset-card-summary-label">+/- value</span>
          <span className={`asset-card-summary-value font-semibold ${gain >= 0 ? 'text-success' : 'text-danger'}`}>
            {m(`${gain >= 0 ? '+' : ''}${fmt(gain)}`)}
          </span>
        </div>
        <div className="asset-card-summary-item">
          <span className="asset-card-summary-label">Performance</span>
          <span className={`asset-card-summary-value font-semibold ${gainPct >= 0 ? 'text-success' : 'text-danger'}`}>
            {mp(fmtPct(gainPct))}
          </span>
        </div>
        <div className="asset-card-summary-item asset-summary-item--change">
          <div className="change-period-selector">
            {CRYPTO_PERIODS.map(p => (
              <button key={p.key} className={`change-period-btn${changePeriod === p.key ? ' active' : ''}`}
                onClick={e => { e.stopPropagation(); setChangePeriod(p.key) }}>{p.label}</button>
            ))}
          </div>
          {(() => {
            const pct = getChangePct(asset, changePeriod, gainPct)
            const eur = getChangeEur(asset, changePeriod, gain)
            return (
              <span className={`asset-card-summary-value font-semibold ${pct != null ? (pct >= 0 ? 'text-success' : 'text-danger') : ''}`}>
                {pct != null ? m(`${eur >= 0 ? '+' : ''}${fmt(eur)}`) + ` (${mp(fmtPct(pct))})` : '—'}
              </span>
            )
          })()}
        </div>
      </div>

      {/* Expanded body */}
      <div className={`asset-card-body ${isExpanded ? 'asset-card-body--open' : ''}`}>
        <div className="asset-card-body-inner">
          {/* Market Data */}
          <div>
            <h4 className="asset-section-title">Donnees de marche</h4>
            <div className="asset-market-grid">
              <div className="asset-market-box">
                <div className="asset-market-box-label">Var. 24h</div>
                <div className={`asset-market-box-value ${asset.change24h >= 0 ? 'text-success' : 'text-danger'}`}>
                  {fmtPct(asset.change24h)}
                </div>
              </div>
              <div className="asset-market-box">
                <div className="asset-market-box-label">Haut 24h</div>
                <div className="asset-market-box-value">{fmt(asset.high24h)}</div>
              </div>
              <div className="asset-market-box">
                <div className="asset-market-box-label">Bas 24h</div>
                <div className="asset-market-box-value">{fmt(asset.low24h)}</div>
              </div>
              <div className="asset-market-box">
                <div className="asset-market-box-label">Volume</div>
                <div className="asset-market-box-value">{asset.volume ? fmt(asset.volume) : '—'}</div>
              </div>
            </div>
          </div>

          {/* Movements */}
          <div>
            <h4 className="asset-section-title">Historique des mouvements</h4>
            {movements.length === 0 && (
              <p className="text-sm text-muted mb-8">Aucun mouvement enregistre.</p>
            )}
            {movements.length > 0 && (
              <div className="asset-table-wrap">
                <table className="asset-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Quantite</th>
                      <th>Prix</th>
                      <th>PRU</th>
                      <th className="col-fees">Frais</th>
                      <th className="col-total">Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((mv, idx) => (
                      <tr key={`${mv.date}-${mv.type}-${mv.quantity}-${mv.price}-${idx}`}>
                        <td>{fmtDate(mv.date)}</td>
                        <td>
                          <span className={`badge ${mv.type === 'buy' ? 'badge-success' : 'badge-danger'}`}>
                            {mv.type === 'buy' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                            {mv.type === 'buy' ? 'Achat' : 'Vente'}
                          </span>
                        </td>
                        <td className="font-mono">{fmtQty(mv.quantity)}</td>
                        <td className="font-mono">{fmt(mv.price)}</td>
                        <td className="font-mono text-muted">{prusPerMovement[idx] > 0 ? fmt(prusPerMovement[idx]) : '—'}</td>
                        <td className="font-mono text-muted col-fees">{mv.fees ? fmt(mv.fees) : '—'}</td>
                        <td className="font-mono font-semibold col-total">{m(fmt(mv.quantity * mv.price + (mv.fees || 0)))}</td>
                        <td>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDeleteMovement(asset.id, rawMovements.indexOf(mv))}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <MovementForm assetId={asset.id} onAdd={onAddMovement} />
          </div>

          {/* Chart */}
          <div>
            <h4 className="asset-section-title">Evolution investissement vs valeur</h4>
            <div className="asset-chart-container">
              <PerformanceChart asset={asset} />
            </div>
          </div>
        </div>
      </div>

      {/* Card actions: Edit + Delete */}
      <div className="asset-card-actions">
        <button
          className="btn btn-ghost btn-sm"
          onClick={(e) => { e.stopPropagation(); onEdit(asset) }}
        >
          <Pencil size={14} /> Modifier
        </button>
        <button
          className="btn btn-ghost btn-sm btn-text-danger"
          onClick={() => onDelete(asset.id)}
        >
          <Trash2 size={14} /> Supprimer
        </button>
      </div>
    </div>
  )
}

/* ===== Main Page ===== */
export default function Crypto() {
  const { portfolio, totals, addCrypto, updateCrypto, deleteCrypto, addCryptoMovement, deleteCryptoMovement, pricesLastUpdated, updateAndSave } = usePortfolio()
  const { isRefreshing, refreshNow } = usePriceRefresh()
  const { m, mp } = usePrivacyMask()

  const handleGoalAssign = (assetId, assetType, goalId) => {
    updateAndSave(p => ({
      ...p,
      goals: goalId
        ? assignAssetToGoal(p.goals || [], assetId, assetType, goalId)
        : unassignAsset(p.goals || [], assetId, assetType),
    }))
  }
  const [showModal, setShowModal] = useState(false)
  const [editAsset, setEditAsset] = useState(null) // asset being edited, or null

  const totalInvested = portfolio.crypto.reduce((s, c) => s + c.buyPrice * c.quantity, 0)
  const totalGain = totals.crypto - totalInvested
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0

  const [headerPeriod, setHeaderPeriod] = useState('max')
  const [expandedId, setExpandedId] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  const hasBinanceKeys = !!(localStorage.getItem('pm_binance_api_key') && localStorage.getItem('pm_binance_api_secret'))

  const handleBinanceSync = async () => {
    const apiKey = localStorage.getItem('pm_binance_api_key')
    const apiSecret = localStorage.getItem('pm_binance_api_secret')
    if (!apiKey || !apiSecret) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const balances = await syncBinanceToPortfolio(apiKey, apiSecret)
      let added = 0, updated = 0
      const delay = (ms) => new Promise(r => setTimeout(r, ms))
      for (const bal of balances) {
        // Try to find matching crypto by symbol
        const existing = portfolio.crypto.find(c => c.symbol?.toUpperCase() === bal.asset.toUpperCase())
        if (existing) {
          // Update quantity if different
          if (Math.abs(existing.quantity - bal.total) > 0.00001) {
            updateCrypto(existing.id, { quantity: bal.total, source: 'binance' })
            updated++
          }
        } else {
          // Search CoinGecko for this asset to get coingeckoId (with rate limit delay)
          try {
            await delay(1500)
            const results = await searchCoinGecko(bal.asset)
            const match = results.find(r => r.symbol?.toUpperCase() === bal.asset.toUpperCase())
            if (match) {
              addCrypto({
                name: match.name,
                symbol: match.symbol,
                coingeckoId: match.id,
                coinImage: match.thumb,
                quantity: bal.total,
                buyPrice: 0,
                currentPrice: 0,
                source: 'binance',
              })
              added++
            }
          } catch {}
        }
      }
      setSyncResult({ success: true, added, updated, total: balances.length })
    } catch (e) {
      setSyncResult({ success: false, error: e.message })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncResult(null), 5000)
    }
  }

  const handleOpenEdit = (asset) => {
    setEditAsset(asset)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditAsset(null)
  }

  const handleSubmit = (data) => {
    if (editAsset) {
      // Update existing asset — preserve movements and currentPrice
      updateCrypto(editAsset.id, {
        ...data,
        currentPrice: editAsset.currentPrice, // keep live price
        movements: editAsset.movements,
      })
    } else {
      addCrypto(data)
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Header card */}
      <div className="card mb-24 page-hero">
        <div className="asset-header-top">
          <div>
            <p className="stat-label">Valeur totale Crypto</p>
            <p className="stat-value page-hero-value">{m(fmt(totals.crypto))}</p>
            <div className="flex items-center gap-12 mt-8 flex-wrap">
              {(() => {
                // Aggregate change for header based on selected period
                let aggEur = null, aggPct = null
                if (headerPeriod === 'max') {
                  aggEur = totalGain; aggPct = totalGainPct
                } else {
                  const sum = portfolio.crypto.reduce((acc, c) => {
                    const pct = getChangePct(c, headerPeriod, null)
                    if (pct == null) return acc
                    return { eur: acc.eur + (pct / 100) * (c.currentPrice || 0) * c.quantity, count: acc.count + 1 }
                  }, { eur: 0, count: 0 })
                  if (sum.count > 0) {
                    aggEur = sum.eur
                    aggPct = totals.crypto > 0 ? (sum.eur / totals.crypto) * 100 : 0
                  }
                }
                return (
                  <>
                    <span className={`badge ${(aggPct ?? 0) >= 0 ? 'badge-success' : 'badge-danger'}`}>
                      {(aggPct ?? 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {aggEur != null ? `${m(fmt(aggEur))} (${mp(fmtPct(aggPct))})` : '—'}
                    </span>
                    <div className="change-period-selector">
                      {CRYPTO_PERIODS.map(p => (
                        <button key={p.key} className={`change-period-btn${headerPeriod === p.key ? ' active' : ''}`}
                          onClick={() => setHeaderPeriod(p.key)}>{p.label}</button>
                      ))}
                    </div>
                  </>
                )
              })()}
              <span className="text-sm text-muted">Investi: {m(fmt(totalInvested))}</span>
            </div>
          </div>
          <div className="asset-header-actions">
            {pricesLastUpdated && (
              <span className="text-xs text-muted">
                Mis a jour {fmtTime(pricesLastUpdated)}
              </span>
            )}
            {hasBinanceKeys && (
              <button
                className="btn btn-secondary"
                onClick={handleBinanceSync}
                disabled={syncing}
                title="Synchroniser depuis Binance"
              >
                {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Binance
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={refreshNow}
              disabled={isRefreshing}
              title="Forcer la mise a jour des prix"
            >
              <RefreshCw size={16} />
              Rafraichir
            </button>
            <button className="btn btn-primary" onClick={() => { setEditAsset(null); setShowModal(true) }}>
              <Plus size={16} /> Ajouter
            </button>
          </div>
        </div>
      </div>

      {syncResult && (
        <div className={`card mb-16 crypto-sync-result ${syncResult.success ? 'crypto-sync-result--success' : 'crypto-sync-result--error'}`}>
          {syncResult.success
            ? `Binance sync : ${syncResult.total} actifs trouves, ${syncResult.added} ajoutes, ${syncResult.updated} mis a jour`
            : `Erreur Binance : ${syncResult.error}`
          }
        </div>
      )}

      {/* Accordion cards */}
      <div className="crypto-cards-list">
        {portfolio.crypto.length === 0 && (
          <div className="card crypto-empty-state">
            <p>Aucune crypto en portefeuille</p>
            <button className="btn btn-primary" onClick={() => { setEditAsset(null); setShowModal(true) }}>
              <Plus size={16} /> Ajouter une crypto
            </button>
          </div>
        )}
        {portfolio.crypto.map(c => (
          <div key={c.id} className="relative">
            <CryptoCard
              asset={c}
              isExpanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
              onDelete={deleteCrypto}
              onEdit={handleOpenEdit}
              onAddMovement={addCryptoMovement}
              onDeleteMovement={deleteCryptoMovement}
            />
            {(portfolio.goals || []).length > 0 && (
              <div className="asset-goal-selector">
                <GoalSelector assetId={c.id} assetType="crypto" goals={portfolio.goals} onAssign={handleGoalAssign} />
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <AddCryptoModal
          onClose={handleCloseModal}
          onAdd={handleSubmit}
          editAsset={editAsset}
        />
      )}
    </div>
  )
}