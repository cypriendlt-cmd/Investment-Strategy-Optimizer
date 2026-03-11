import { useState, useEffect, useMemo } from 'react'
import {
  PieChart, Pie, Cell, AreaChart, Area,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from 'recharts'
import {
  TrendingUp, TrendingDown, Target, ArrowRight,
  Award, AlertTriangle, Sparkles,
  Calendar, GitBranch, ArrowUpRight
} from 'lucide-react'
import { usePortfolio } from '../context/PortfolioContext'
import { useBank } from '../context/BankContext'
import { useAuth } from '../context/AuthContext'
import { usePrivacyMask } from '../hooks/usePrivacyMask'
import { getInsights } from '../services/insights'
import { getFearGreed } from '../services/market'
import { getMonthlyDcaSummary, getLinkedAsset, computeDcaProgress } from '../services/dcaEngine'
import { Link } from 'react-router-dom'
import { runProjection } from '../services/strategy'
import { analyzePortfolio } from '../services/portfolioAnalytics'
import { fmt, fmtPct } from '../utils/format'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const TIME_RANGES = [
  { key: '7d', label: '7J', days: 7 },
  { key: '1m', label: '1M', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: '1y', label: '1A', days: 365 },
  { key: 'all', label: 'TOUT', days: null },
]

function getAllMovements(portfolio) {
  const allMovements = []
  for (const asset of [...portfolio.crypto, ...portfolio.pea]) {
    for (const m of (asset.movements || [])) {
      allMovements.push({
        date: new Date(m.date),
        delta: m.type === 'sell' ? -(m.quantity * m.price) : (m.quantity * m.price + (m.fees || 0))
      })
    }
  }
  for (const l of portfolio.livrets) {
    for (const m of (l.movements || [])) {
      allMovements.push({
        date: new Date(m.date),
        delta: m.type === 'withdrawal' ? -(m.amount || 0) : (m.amount || 0)
      })
    }
  }
  allMovements.sort((a, b) => b.date - a.date)
  return allMovements
}

function buildPortfolioHistory(portfolio, totals, rangeKey = '6m') {
  const now = new Date()
  const currentTotal = totals.total
  const allMovements = getAllMovements(portfolio)
  const range = TIME_RANGES.find(r => r.key === rangeKey) || TIME_RANGES[3]
  const oldest = allMovements.length > 0 ? allMovements[allMovements.length - 1].date : now
  const startDate = range.days ? new Date(now.getTime() - range.days * 86400000) : oldest

  const points = []
  if (range.days && range.days <= 7) {
    for (let i = range.days; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      points.push({ date: d, label: i === 0 ? "Aujourd'hui" : DAY_NAMES[d.getDay()] + ' ' + d.getDate() })
    }
  } else if (range.days && range.days <= 30) {
    const step = 3
    for (let i = range.days; i >= 0; i -= step) {
      const d = new Date(now.getTime() - i * 86400000)
      points.push({ date: d, label: d.getDate() + ' ' + MONTH_NAMES[d.getMonth()] })
    }
    if (points[points.length - 1]?.date.toDateString() !== now.toDateString()) {
      points.push({ date: now, label: now.getDate() + ' ' + MONTH_NAMES[now.getMonth()] })
    }
  } else if (range.days && range.days <= 180) {
    for (let i = Math.ceil(range.days / 30); i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      if (d >= startDate) points.push({ date: d, label: MONTH_NAMES[d.getMonth()] })
    }
    points.push({ date: now, label: MONTH_NAMES[now.getMonth()] })
  } else {
    const totalMonths = range.days ? Math.ceil(range.days / 30) : Math.max(Math.ceil((now - oldest) / (86400000 * 30)), 6)
    const step = Math.max(1, Math.floor(totalMonths / 12))
    for (let i = totalMonths; i >= 0; i -= step) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      if (d >= startDate || !range.days) {
        const lbl = step >= 12 ? MONTH_NAMES[d.getMonth()] + ' ' + d.getFullYear() : MONTH_NAMES[d.getMonth()] + (d.getMonth() === 0 ? ' ' + d.getFullYear() : '')
        points.push({ date: d, label: lbl })
      }
    }
    if (points.length === 0 || points[points.length - 1]?.date.toDateString() !== now.toDateString()) {
      points.push({ date: now, label: MONTH_NAMES[now.getMonth()] })
    }
  }

  const result = points.map((p, i) => {
    if (i === points.length - 1) return { month: p.label, value: Math.round(currentTotal) }
    const investedAfter = allMovements
      .filter(mv => mv.date > p.date)
      .reduce((sum, mv) => sum + mv.delta, 0)
    return { month: p.label, value: Math.round(currentTotal - investedAfter) }
  })

  for (let i = 1; i < result.length; i++) {
    if (result[i].month === result[i - 1].month) result[i].month = result[i].month + ' '
  }

  return result.length > 0 ? result : [{ month: MONTH_NAMES[now.getMonth()], value: Math.round(currentTotal) }]
}

const PROJECTION_HORIZONS = [
  { key: 1, label: '1A' },
  { key: 3, label: '3A' },
  { key: 5, label: '5A' },
  { key: 10, label: '10A' },
]

function useStrategyProjection(portfolio, totals, accountBalances, aggregates, dcaPlans, horizonYears) {
  return useMemo(() => {
    try {
      return runProjection(portfolio, totals, accountBalances || [], aggregates || [], dcaPlans, {
        horizonYears,
      })
    } catch {
      return null
    }
  }, [portfolio, totals, accountBalances, aggregates, dcaPlans, horizonYears])
}

function GaugeChart({ value, label }) {
  const r = 70
  const cx = 90, cy = 90
  const endAngle = Math.PI + (value / 100) * Math.PI
  const x2 = cx + r * Math.cos(endAngle)
  const y2 = cy + r * Math.sin(endAngle)
  const largeArc = value > 50 ? 1 : 0

  const getColor = (v) => {
    if (v <= 25) return '#ef4444'
    if (v <= 45) return '#f97316'
    if (v <= 55) return '#f59e0b'
    if (v <= 75) return '#84cc16'
    return '#11ec79'
  }

  const getLabel = (v) => {
    if (v <= 25) return 'Peur extrême'
    if (v <= 45) return 'Peur'
    if (v <= 55) return 'Neutre'
    if (v <= 75) return 'Avidité'
    return 'Avidité extrême'
  }

  const c = getColor(value)

  return (
    <div className="gauge-chart">
      <svg viewBox="0 0 180 110" width="180" height="110">
        <defs>
          <filter id={`glow-${label}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--bg-secondary)" strokeWidth="14" strokeLinecap="round" />
        {value > 0 && (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none" stroke={c} strokeWidth="14" strokeLinecap="round"
            filter={`url(#glow-${label})`}
          />
        )}
        <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-primary)" fontSize="24" fontWeight="700">{value}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill={c} fontSize="11" fontWeight="600">{getLabel(value)}</text>
      </svg>
      <span className="gauge-label">{label}</span>
    </div>
  )
}


export default function Dashboard() {
  const { portfolio, totals, dcaPlans } = usePortfolio()
  const { accountBalances, aggregates, financeProfile, updateFinanceProfile } = useBank() || {}
  const { user, isGuest } = useAuth()
  const { m, mp } = usePrivacyMask()
  const [fearGreed, setFearGreed] = useState({ crypto: 0, market: 0 })
  const [insight, setInsight] = useState(null)
  const [insightLoading, setInsightLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('6m')
  const [projectionHorizon, setProjectionHorizon] = useState(10)

  useEffect(() => {
    if (isGuest) { setInsightLoading(false); return }
    getFearGreed()
      .then(res => {
        const d = res.data
        setFearGreed({ crypto: d.crypto?.value ?? 0, market: d.stock?.value ?? 0 })
      })
      .catch(() => {})
    getInsights()
      .then(res => {
        const data = res.data
        const summary = data.insights?.summary || data.summary || data.content
        if (summary) setInsight(summary)
      })
      .catch(() => {})
      .finally(() => setInsightLoading(false))
  }, [isGuest])

  const perfData = buildPortfolioHistory(portfolio, totals, timeRange)
  const bankLivrets = (accountBalances || []).filter(a => a.type !== 'courant').reduce((s, a) => s + a.balance, 0)
  const bankTotal = (accountBalances || []).filter(a => a.type === 'courant').reduce((s, a) => s + a.balance, 0)
  const totalLivrets = totals.livrets + bankLivrets
  const patrimoineNet = totals.total + bankLivrets + bankTotal

  const totalInvested = [
    ...portfolio.crypto.map(c => c.buyPrice * c.quantity),
    ...portfolio.pea.map(p => p.buyPrice * p.quantity),
  ].reduce((a, b) => a + b, 0)
  const totalGain = totals.total + bankLivrets - totalLivrets - totals.fundraising - totalInvested
  const gainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0
  const isPositive = totalGain >= 0

  const strategyResult = useStrategyProjection(portfolio, totals, accountBalances, aggregates, dcaPlans, projectionHorizon)

  const projectionData = useMemo(() => {
    if (!strategyResult?.viewModel?.chartData?.length) return []
    return strategyResult.viewModel.chartData.map(p => ({
      year: p.label,
      projected: p.nominal,
      invested: p.invested,
      gains: Math.max(0, p.nominal - p.invested),
    }))
  }, [strategyResult])

  const projectionKpis = useMemo(() => {
    if (!projectionData.length) return null
    const last = projectionData[projectionData.length - 1]
    return {
      projected: last.projected,
      invested: last.invested,
      gains: last.gains,
    }
  }, [projectionData])

  const projectedTarget = projectionKpis?.projected || 0

  const goalsData = useMemo(() => {
    const goals = portfolio?.goals || []
    if (goals.length === 0) return null
    const totalTarget = goals.reduce((s, g) => s + (g.targetAmount || 0), 0)
    return { count: goals.length, totalTarget }
  }, [portfolio?.goals])
  const objective = goalsData?.totalTarget || null
  const progressPct = objective ? Math.min((patrimoineNet / objective) * 100, 100) : 0

  const analytics = useMemo(() => analyzePortfolio(totals, bankLivrets), [totals, bankLivrets])
  const allocationData = analytics.allocation.map(c => ({ name: c.label, value: c.value, color: c.color }))

  const dcaSummary = useMemo(() => {
    const plans = dcaPlans?.plans || []
    const enabled = plans.filter(p => p.enabled)
    if (enabled.length === 0) return null
    const t = new Date().toISOString().slice(0, 10)
    const currentMonth = t.slice(0, 7)
    let totalInvestedDca = 0, onTrack = 0
    const nextDates = []
    for (const plan of enabled) {
      const asset = getLinkedAsset(plan, portfolio)
      const prog = computeDcaProgress(plan, asset, t)
      totalInvestedDca += prog.actual_contribution
      if (prog.on_track || prog.status === 'ahead') onTrack++
      if (prog.upcoming_dates?.[0]) nextDates.push({ date: prog.upcoming_dates[0], label: plan.label, amount: plan.amount_per_period })
    }
    nextDates.sort((a, b) => a.date.localeCompare(b.date))
    const monthly = getMonthlyDcaSummary(enabled, portfolio, currentMonth)
    return { totalInvested: totalInvestedDca, onTrack, total: enabled.length, nextDates: nextDates.slice(0, 3), monthPlanned: monthly.planned_total, monthActual: monthly.actual_total }
  }, [dcaPlans, portfolio])

  // Revenus : override manuel > moyenne agrégats bank > profil finance > 0
  const recentAggs = (aggregates || []).slice(-3)
  const aggIncome = recentAggs.length > 0 ? Math.round(recentAggs.reduce((s, a) => s + a.income, 0) / recentAggs.length) : 0
  const aggExpenses = recentAggs.length > 0 ? Math.round(recentAggs.reduce((s, a) => s + a.expenses, 0) / recentAggs.length) : 0
  const monthlyIncome = financeProfile?.dashIncomeOverride || aggIncome || financeProfile?.monthlyIncome || 0
  const monthlyExpenses = financeProfile?.dashExpensesOverride || aggExpenses || financeProfile?.monthlyExpenses || 0
  const monthSavings = monthlyIncome - monthlyExpenses
  const savingsRate = monthlyIncome > 0 ? (monthSavings / monthlyIncome) * 100 : null
  const hasAutoIncome = aggIncome > 0
  const [editingField, setEditingField] = useState(null) // 'income' | 'savings' | null
  const [editValue, setEditValue] = useState('')

  const monthlyEvolution = useMemo(() => {
    if (perfData.length < 2) return null
    const prev = perfData[perfData.length - 2]?.value
    const curr = perfData[perfData.length - 1]?.value
    if (!prev || prev === 0) return null
    const delta = curr - prev
    const pct = (delta / prev) * 100
    return { delta, pct }
  }, [perfData])

  const handleOverrideSave = (field) => {
    const val = Number(editValue)
    if (!Number.isFinite(val) || val < 0) { setEditingField(null); return }
    if (field === 'income') {
      updateFinanceProfile?.({ dashIncomeOverride: Math.round(val) })
    } else if (field === 'savings') {
      // Savings override = on stocke les dépenses overridées (revenu - épargne souhaitée)
      updateFinanceProfile?.({ dashExpensesOverride: Math.round(monthlyIncome - val) })
    }
    setEditingField(null)
  }

  const performers = useMemo(() => {
    const cryptoGains = portfolio.crypto
      .filter(c => c.buyPrice > 0)
      .map(c => ({
        name: c.symbol,
        gain: ((c.currentPrice || c.buyPrice) - c.buyPrice) / c.buyPrice * 100
      }))
    const sorted = [...cryptoGains].sort((a, b) => b.gain - a.gain)
    return { best: sorted[0] || null, worst: sorted[sorted.length - 1] || null }
  }, [portfolio.crypto])

  const riskLevel = analytics.risk
  const diversification = analytics.diversification

  const firstName = user?.name?.split(' ')[0] || 'Investisseur'

  return (
    <div className="dashboard">

      {/* ══ GREETING ══ */}
      <div className="dashboard-greeting">
        <div>
          <h1 className="dashboard-greeting-title">Bonjour, {firstName} 👋</h1>
          <p className="dashboard-greeting-sub">Voici l'état de votre patrimoine en temps réel.</p>
        </div>
        <div className="dashboard-date">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* ══ BENTO ROW 1 : Hero + KPIs ══ */}
      <div className="bento-row bento-row--hero">

        {/* Hero card — patrimoine total */}
        <div className="bento-card bento-card--hero dash-card">
          <span className="bento-card-eyebrow">Patrimoine total</span>
          <p className="dashboard-total">{m(fmt(patrimoineNet))}</p>
          <span className={`dashboard-hero-badge ${isPositive ? 'dashboard-hero-badge--up' : 'dashboard-hero-badge--down'}`}>
            {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {m(fmt(totalGain))} ({mp(fmtPct(gainPct))})
          </span>
          <div className="bento-hero-divider" />
          <div className="bento-hero-metas">
            <div className="bento-hero-meta">
              <span className="bento-hero-meta-label">Projection {projectionHorizon} ans</span>
              <span className="bento-hero-meta-value">{m(fmt(projectedTarget))}</span>
            </div>
            {monthlyEvolution && (
              <div className="bento-hero-meta">
                <span className="bento-hero-meta-label">Évolution récente</span>
                <span className="bento-hero-meta-value" style={{ color: monthlyEvolution.delta >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {monthlyEvolution.delta >= 0 ? '+' : ''}{m(fmt(monthlyEvolution.delta))} ({monthlyEvolution.pct >= 0 ? '+' : ''}{monthlyEvolution.pct.toFixed(1)}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* KPI cards */}
        <div className="bento-card bento-card--kpi dash-card">
          <span className="bento-card-eyebrow">Revenu mensuel</span>
          {editingField === 'income' ? (
            <form className="bento-kpi-edit" onSubmit={e => { e.preventDefault(); handleOverrideSave('income') }}>
              <input type="number" min="0" autoFocus value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => handleOverrideSave('income')}
                className="bento-kpi-input" placeholder="€ / mois" />
            </form>
          ) : (
            <span className="bento-kpi-value bento-kpi-editable"
              onClick={() => { setEditingField('income'); setEditValue(monthlyIncome || '') }}
              title="Cliquez pour corriger">
              {monthlyIncome > 0 ? m(fmt(monthlyIncome)) : <span className="text-muted">—</span>}
            </span>
          )}
          <span className="bento-kpi-sub">
            {monthlyIncome > 0
              ? (hasAutoIncome
                ? (financeProfile?.dashIncomeOverride ? 'corrigé manuellement' : 'via transactions bank')
                : 'saisie manuelle')
              : <span className="bento-kpi-link" onClick={() => { setEditingField('income'); setEditValue('') }}>Saisir →</span>}
          </span>
        </div>

        <div className="bento-card bento-card--kpi dash-card">
          <span className="bento-card-eyebrow">Épargne mensuelle</span>
          {editingField === 'savings' ? (
            <form className="bento-kpi-edit" onSubmit={e => { e.preventDefault(); handleOverrideSave('savings') }}>
              <input type="number" autoFocus value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => handleOverrideSave('savings')}
                className="bento-kpi-input" placeholder="€ / mois" />
            </form>
          ) : (
            <span className="bento-kpi-value bento-kpi-editable"
              style={{ color: monthSavings > 0 ? 'var(--color-success)' : monthSavings < 0 ? 'var(--color-error)' : undefined }}
              onClick={() => { setEditingField('savings'); setEditValue(monthSavings || '') }}
              title="Cliquez pour corriger">
              {monthlyIncome > 0 ? m(fmt(monthSavings)) : <span className="text-muted">—</span>}
            </span>
          )}
          <span className="bento-kpi-sub">
            {monthlyIncome > 0
              ? (financeProfile?.dashExpensesOverride ? 'corrigé manuellement' : 'revenu − dépenses')
              : 'revenu requis'}
          </span>
        </div>

        <div className="bento-card bento-card--kpi dash-card">
          <span className="bento-card-eyebrow">Taux d'épargne</span>
          <span className="bento-kpi-value" style={{ color: savingsRate !== null && savingsRate >= 20 ? 'var(--color-success)' : savingsRate !== null && savingsRate >= 10 ? 'var(--warning)' : savingsRate !== null ? 'var(--color-error)' : undefined }}>
            {savingsRate !== null ? <>{savingsRate.toFixed(0)}<span className="bento-kpi-unit">%</span></> : <span className="text-muted">—</span>}
          </span>
          <span className="bento-kpi-sub">{savingsRate !== null ? (savingsRate >= 20 ? 'excellent' : savingsRate >= 10 ? 'correct' : 'à améliorer') : 'revenu requis'}</span>
        </div>

        <div className="bento-card bento-card--kpi dash-card">
          <span className="bento-card-eyebrow">Diversification</span>
          <span className="bento-kpi-value" style={{ color: diversification.color }}>{diversification.score}<span className="bento-kpi-unit">/100</span></span>
          <span className="bento-kpi-sub">{diversification.level}</span>
        </div>

        <div className="bento-card bento-card--kpi dash-card">
          <span className="bento-card-eyebrow">Niveau de risque</span>
          <span className="bento-kpi-value" style={{ color: riskLevel.color }}>{riskLevel.score}<span className="bento-kpi-unit">/100</span></span>
          <span className="bento-kpi-sub">{riskLevel.level} — {riskLevel.description?.split(' ').slice(-1)[0]}</span>
        </div>

        <div className="bento-card bento-card--kpi dash-card">
          <span className="bento-card-eyebrow">Objectif</span>
          {objective ? (
            <>
              <span className="bento-kpi-value text-accent">{progressPct.toFixed(0)}<span className="bento-kpi-unit">%</span></span>
              <span className="bento-kpi-sub">{m(fmt(objective))}</span>
            </>
          ) : (
            <>
              <span className="bento-kpi-value text-muted">—</span>
              <Link to="/strategy/objectifs" className="bento-kpi-sub bento-kpi-link">Définir →</Link>
            </>
          )}
        </div>
      </div>

      {/* ══ BENTO ROW 2 : Trajectory chart ══ */}
      <div className="bento-card bento-card--chart dash-card">
        <div className="perf-chart-header">
          <div className="dash-card-title">Trajectoire du patrimoine</div>
          <div className="time-range-selector">
            {TIME_RANGES.map(r => (
              <button key={r.key} className={`time-range-btn${timeRange === r.key ? ' active' : ''}`} onClick={() => setTimeRange(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={perfData}>
            <defs>
              <linearGradient id="trajectoryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v) => [m(fmt(v)), 'Valeur']}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: '0.82rem', boxShadow: 'var(--shadow)' }}
              cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} fill="url(#trajectoryGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--accent)' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ══ BENTO ROW 3 : Allocation + Sentiment + Objectif ══ */}
      <div className="bento-row bento-row--middle">

        {/* Allocation */}
        <div className="bento-card dash-card">
          <div className="dash-card-title">Répartition des actifs</div>
          <div className="dashboard-pie-row">
            <ResponsiveContainer width={170} height={170}>
              <PieChart>
                <Pie data={allocationData} cx={80} cy={80} innerRadius={46} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {allocationData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => m(fmt(v))} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: '0.82rem' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="dashboard-legend">
              {allocationData.map((item) => (
                <div key={item.name} className="dashboard-legend-item">
                  <span className="dashboard-legend-dot" style={{ background: item.color }} />
                  <div>
                    <div className="legend-name">{item.name}</div>
                    <div className="legend-detail">{m(fmt(item.value))} · {mp(`${(((item.value) / Math.max(totals.total + bankLivrets, 1)) * 100).toFixed(1)}%`)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sentiment */}
        <div className="bento-card dash-card">
          <div className="dash-card-title">Sentiment de marché</div>
          <div className="dashboard-gauges">
            <GaugeChart value={fearGreed.crypto} label="Crypto" />
            <GaugeChart value={fearGreed.market} label="Marchés" />
          </div>
          {performers.best && (
            <div className="dashboard-performers">
              <div className="dashboard-performer">
                <Award size={13} className="text-success" />
                <span className="dashboard-performer-name">{performers.best.name}</span>
                <span className="dashboard-performer-gain text-success">{fmtPct(performers.best.gain)}</span>
              </div>
              {performers.worst && performers.worst.name !== performers.best.name && (
                <div className="dashboard-performer">
                  <AlertTriangle size={13} className="text-danger" />
                  <span className="dashboard-performer-name">{performers.worst.name}</span>
                  <span className="dashboard-performer-gain text-danger">{fmtPct(performers.worst.gain)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Objectif */}
        <div className="bento-card dash-card objective-card">
          <div className="objective-card-header">
            <div className="flex items-center gap-8">
              <Target size={16} className="text-warning" />
              <span className="dash-card-title" style={{ margin: 0 }}>Objectif financier</span>
            </div>
            <Link to="/strategy" className="insight-link" style={{ margin: 0, padding: 0 }}>Stratégie <ArrowRight size={12} /></Link>
          </div>
          {objective ? (
            <>
              <div className="objective-progress-container">
                <div className="objective-progress-bar">
                  <div className="objective-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="objective-progress-labels">
                  <span>{m(fmt(patrimoineNet))}</span>
                  <span className="text-muted">{m(fmt(objective))}</span>
                </div>
              </div>
              <div className="objective-stats">
                <div className="objective-stat">
                  <span className="objective-stat-label">Progression</span>
                  <span className="objective-stat-value text-accent">{progressPct.toFixed(1)}%</span>
                </div>
                <div className="objective-stat">
                  <span className="objective-stat-label">Reste</span>
                  <span className="objective-stat-value">{m(fmt(Math.max(objective - patrimoineNet, 0)))}</span>
                </div>
                <div className="objective-stat">
                  <span className="objective-stat-label">Horizon</span>
                  <span className="objective-stat-value">~{Math.ceil(Math.log(objective / Math.max(patrimoineNet, 1)) / Math.log(1.07))} ans</span>
                </div>
              </div>
            </>
          ) : (
            <div className="objective-empty">
              <Target size={28} className="text-muted" />
              <p>Définissez un objectif financier pour suivre votre progression.</p>
              <Link to="/strategy/objectifs" className="btn btn-primary btn-sm">
                <Target size={14} /> Définir un objectif
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ══ BENTO ROW 3b : Analyse portefeuille ══ */}
      {analytics.totalValue > 0 && (
        <div className="bento-row bento-row--analytics">

          {/* Risque — gauge horizontale */}
          <div className="bento-card dash-card dash-analytics-card">
            <div className="dash-card-title">Risque du portefeuille</div>
            <div className="dash-risk-gauge">
              <div className="dash-risk-gauge-track">
                <div className="dash-risk-gauge-fill" style={{ width: `${riskLevel.score}%`, background: riskLevel.color }} />
                <div className="dash-risk-gauge-cursor" style={{ left: `${riskLevel.score}%` }} />
              </div>
              <div className="dash-risk-gauge-labels">
                <span>Faible</span>
                <span>Modéré</span>
                <span>Élevé</span>
              </div>
            </div>
            <div className="dash-risk-score">
              <span className="dash-risk-score-value" style={{ color: riskLevel.color }}>{riskLevel.score}</span>
              <span className="dash-risk-score-label">/100 — {riskLevel.description}</span>
            </div>
          </div>

          {/* Diversification — badge + barres */}
          <div className="bento-card dash-card dash-analytics-card">
            <div className="dash-card-title">Diversification</div>
            <div className="dash-diversification-header">
              <span className="dash-diversification-badge" style={{ background: diversification.color }}>
                {diversification.score}/100 · {diversification.level}
              </span>
              <span className="dash-diversification-meta">
                {diversification.effectiveN} classes effectives
              </span>
            </div>
            <div className="dash-concentration-bars">
              {analytics.allocation.filter(c => c.value > 0).sort((a, b) => b.pct - a.pct).map(c => (
                <div key={c.key} className="dash-concentration-bar-row">
                  <span className="dash-concentration-bar-label">{c.label}</span>
                  <div className="dash-concentration-bar-track">
                    <div className="dash-concentration-bar-fill" style={{ width: `${Math.round(c.pct * 100)}%`, background: c.color }} />
                  </div>
                  <span className="dash-concentration-bar-pct">{mp(`${Math.round(c.pct * 100)}%`)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alertes + Conseils */}
          <div className="bento-card dash-card dash-analytics-card">
            <div className="dash-card-title">Alertes & Conseils</div>
            {analytics.alerts.length > 0 && (
              <div className="dash-alerts">
                {analytics.alerts.map((a, i) => (
                  <div key={i} className={`dash-alert dash-alert--${a.severity}`}>
                    <AlertTriangle size={14} />
                    <span>{a.message}</span>
                  </div>
                ))}
              </div>
            )}
            {analytics.insights.length > 0 && (
              <div className="dash-insights-list">
                {analytics.insights.map((ins, i) => (
                  <div key={i} className="dash-insight-item">
                    <Sparkles size={13} className="text-accent" />
                    <span>{ins.message}</span>
                  </div>
                ))}
              </div>
            )}
            {analytics.alerts.length === 0 && analytics.insights.length === 0 && (
              <p className="text-muted text-sm" style={{ margin: '12px 0 0' }}>Aucune alerte — portefeuille équilibré.</p>
            )}
          </div>

        </div>
      )}

      {/* ══ BENTO ROW 4 : Projection + DCA + IA ══ */}
      <div className="bento-row bento-row--bottom">

        {/* Projection patrimoniale */}
        <div className="bento-card dash-card dash-projection-card">
          <div className="perf-chart-header">
            <div className="dash-card-title">Projection patrimoniale</div>
            <div className="time-range-selector">
              {PROJECTION_HORIZONS.map(h => (
                <button key={h.key} className={`time-range-btn${projectionHorizon === h.key ? ' active' : ''}`} onClick={() => setProjectionHorizon(h.key)}>
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {projectionData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={projectionData}>
                  <defs>
                    <linearGradient id="projInvestedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--text-muted)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="var(--text-muted)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="projGainsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v, name) => [m(fmt(v)), name === 'invested' ? 'Capital investi' : name === 'gains' ? 'Gains estimés' : 'Valeur projetée']}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: '0.82rem', boxShadow: 'var(--shadow)' }}
                    cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="invested" stackId="1" stroke="var(--text-muted)" strokeWidth={1.5} fill="url(#projInvestedGrad)" dot={false} />
                  <Area type="monotone" dataKey="gains" stackId="1" stroke="var(--accent)" strokeWidth={2} fill="url(#projGainsGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--accent)' }} />
                </AreaChart>
              </ResponsiveContainer>

              {projectionKpis && (
                <div className="dash-projection-summary">
                  <div className="dash-projection-kpi">
                    <span className="dash-projection-kpi-label">Capital investi</span>
                    <span className="dash-projection-kpi-value">{m(fmt(projectionKpis.invested))}</span>
                  </div>
                  <div className="dash-projection-kpi">
                    <span className="dash-projection-kpi-label">Gains estimés</span>
                    <span className="dash-projection-kpi-value" style={{ color: 'var(--accent)' }}>{m(fmt(projectionKpis.gains))}</span>
                  </div>
                  <div className="dash-projection-kpi">
                    <span className="dash-projection-kpi-label">Valeur projetée</span>
                    <span className="dash-projection-kpi-value" style={{ fontWeight: 700 }}>{m(fmt(projectionKpis.projected))}</span>
                  </div>
                </div>
              )}

              <div className="dash-projection-footer">
                <Link to="/strategy/projection" className="btn btn-secondary btn-sm">
                  <ArrowUpRight size={14} /> Projection détaillée
                </Link>
                <Link to="/strategy/scenarios" className="btn btn-secondary btn-sm">
                  <GitBranch size={14} /> Scénarios
                </Link>
              </div>
            </>
          ) : (
            <div className="objective-empty" style={{ padding: '24px 0' }}>
              <TrendingUp size={28} className="text-muted" />
              <p className="text-muted text-sm">Ajoutez des actifs pour voir la projection.</p>
            </div>
          )}
        </div>

        {/* DCA */}
        {dcaSummary ? (
          <div className="bento-card dash-card dca-dashboard-card">
            <div className="dca-dashboard-header">
              <div className="flex items-center gap-8">
                <Calendar size={15} className="text-accent" />
                <span className="dash-card-title" style={{ margin: 0 }}>Invest. programmé</span>
              </div>
              <Link to="/strategy" className="insight-link" style={{ margin: 0, padding: 0 }}>Voir <ArrowRight size={12} /></Link>
            </div>
            <div className="dca-dash-stats">
              <div className="dca-dash-stat">
                <div className="dca-dash-stat-label">Total investi</div>
                <div className="dca-dash-stat-value">{m(fmt(dcaSummary.totalInvested))}</div>
              </div>
              <div className="dca-dash-stat">
                <div className="dca-dash-stat-label">Dans les temps</div>
                <div className={`dca-dash-stat-value ${dcaSummary.onTrack === dcaSummary.total ? 'text-success' : 'text-warning'}`}>
                  {dcaSummary.onTrack}/{dcaSummary.total}
                </div>
              </div>
              <div className="dca-dash-stat">
                <div className="dca-dash-stat-label">Mensualité prévue</div>
                <div className="dca-dash-stat-value">{m(fmt(dcaSummary.monthPlanned))}</div>
              </div>
              <div className="dca-dash-stat">
                <div className="dca-dash-stat-label">Réalisé</div>
                <div className={`dca-dash-stat-value ${dcaSummary.monthActual >= dcaSummary.monthPlanned ? 'text-success' : 'text-warning'}`}>
                  {m(fmt(dcaSummary.monthActual))}
                </div>
              </div>
            </div>
            {dcaSummary.nextDates.length > 0 && (
              <div className="dca-upcoming">
                <span className="dca-upcoming-label">Prochains :</span>
                {dcaSummary.nextDates.map((d, i) => (
                  <span key={i} className="dca-upcoming-chip">
                    {new Date(d.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    {' · '}{d.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bento-card dash-card bento-card--empty">
            <Calendar size={28} className="text-muted" />
            <p className="text-muted text-sm">Aucun plan DCA actif</p>
            <Link to="/strategy" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Créer un plan</Link>
          </div>
        )}

        {/* IA */}
        <div className="bento-card dash-card dashboard-insight-card">
          <div className="flex items-center gap-8 mb-8">
            <Sparkles size={15} className="text-accent" />
            <span className="insight-tag">Analyse IA</span>
          </div>
          {insightLoading ? (
            <>
              <div className="skeleton" style={{ height: 13, width: '90%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 13, width: '70%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 13, width: '80%' }} />
            </>
          ) : insight ? (
            <>
              <p className="insight-text">{typeof insight === 'string' ? insight.slice(0, 240) : 'Analyse disponible'}...</p>
              <Link to="/insights" className="insight-link">Voir l'analyse complète <ArrowRight size={12} /></Link>
            </>
          ) : (
            <p className="text-muted text-sm">Configurez l'IA dans les paramètres pour obtenir des recommandations stratégiques.</p>
          )}
        </div>
      </div>

    </div>
  )
}
