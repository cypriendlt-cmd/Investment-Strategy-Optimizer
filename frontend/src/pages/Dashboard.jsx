import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from 'recharts'
import {
  TrendingUp, TrendingDown, Target, Zap, ArrowRight, FlaskConical,
  Wallet, Activity, Award, AlertTriangle, Sparkles, BarChart3, Shield,
  Lightbulb, Calendar, Layers, GitBranch, Compass
} from 'lucide-react'
import { usePortfolio } from '../context/PortfolioContext'
import { useBank } from '../context/BankContext'
import { useAuth } from '../context/AuthContext'
import { usePrivacyMask } from '../hooks/usePrivacyMask'
import { getInsights, getDashboardSummary } from '../services/insights'
import { getFearGreed } from '../services/market'
import { getMonthlyDcaSummary, getLinkedAsset, computeDcaProgress } from '../services/dcaEngine'
import { Link } from 'react-router-dom'
import { runProjection } from '../services/strategy'
import { fmt, fmtPct } from '../utils/format'

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const TIME_RANGES = [
  { key: '7d', label: '7J', days: 7 },
  { key: '1m', label: '1M', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: '1y', label: '1A', days: 365 },
  { key: 'all', label: 'MAX', days: null },
]

function getAllMovements(portfolio) {
  const allMovements = []
  for (const c of portfolio.crypto) {
    for (const m of (c.movements || [])) {
      allMovements.push({
        date: new Date(m.date),
        delta: m.type === 'sell' ? -(m.quantity * m.price) : (m.quantity * m.price + (m.fees || 0))
      })
    }
  }
  for (const p of portfolio.pea) {
    for (const m of (p.movements || [])) {
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
      points.push({ date: d, label: i === 0 ? "Auj." : DAY_NAMES[d.getDay()] + ' ' + d.getDate() })
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

function buildProjectionData(currentTotal) {
  const years = 10
  const rate = 0.07
  const monthlyContribution = 500
  const data = []
  let projected = currentTotal
  let nominal = currentTotal

  for (let y = 0; y <= years; y++) {
    data.push({
      year: y === 0 ? 'Auj.' : `+${y}a`,
      projected: Math.round(projected),
      nominal: Math.round(nominal),
    })
    projected = projected * (1 + rate) + monthlyContribution * 12
    nominal = nominal + monthlyContribution * 12
  }
  return data
}

function useStrategyProjection(portfolio, totals, accountBalances, aggregates, dcaPlans) {
  return useMemo(() => {
    try {
      const result = runProjection(portfolio, totals, accountBalances || [], aggregates || [], dcaPlans, {
        horizonYears: 10,
      })
      return result
    } catch {
      return null
    }
  }, [portfolio, totals, accountBalances, aggregates, dcaPlans])
}

function GaugeChart({ value, label }) {
  const r = 62
  const cx = 80, cy = 80
  const endAngle = Math.PI + (value / 100) * Math.PI
  const x2 = cx + r * Math.cos(endAngle)
  const y2 = cy + r * Math.sin(endAngle)
  const largeArc = value > 50 ? 1 : 0

  const getColor = (v) => {
    if (v <= 25) return '#ef4444'
    if (v <= 45) return '#f97316'
    if (v <= 55) return '#f59e0b'
    if (v <= 75) return '#84cc16'
    return '#10b981'
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
      <svg viewBox="0 0 160 100" width="160" height="100">
        <defs>
          <filter id={`glow-${label}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
        {value > 0 && (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none" stroke={c} strokeWidth="10" strokeLinecap="round"
            style={{ '--gauge-color': c }} filter={`url(#glow-${label})`}
          />
        )}
        <text x={cx} y={cy - 10} textAnchor="middle" fill="var(--text-primary)" fontSize="22" fontWeight="700">{value}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill={c} fontSize="8" fontWeight="600">{getLabel(value)}</text>
      </svg>
      <span className="gauge-label">{label}</span>
    </div>
  )
}

export default function Dashboard() {
  const { portfolio, totals, dcaPlans } = usePortfolio()
  const { accountBalances, aggregates, healthScore, coachInsights } = useBank() || {}
  const { isGuest } = useAuth()
  const { m, mp } = usePrivacyMask()
  const [fearGreed, setFearGreed] = useState({ crypto: 0, market: 0 })
  const [insight, setInsight] = useState(null)
  const [insightLoading, setInsightLoading] = useState(true)
  const [analysis, setAnalysis] = useState(null)
  const [timeRange, setTimeRange] = useState('6m')

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

  useEffect(() => {
    if (isGuest || !portfolio || !totals.total) return
    getDashboardSummary({
      crypto: portfolio.crypto || [], pea: portfolio.pea || [],
      livrets: portfolio.livrets || [], fundraising: portfolio.fundraising || [], totals,
    })
      .then(res => { if (res.data.synthesis) setAnalysis(res.data) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.total])

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

  const strategyResult = useStrategyProjection(portfolio, totals, accountBalances, aggregates, dcaPlans)

  const projectionData = useMemo(() => {
    if (strategyResult?.viewModel?.chartData) {
      return strategyResult.viewModel.chartData.map(p => ({
        year: p.label,
        projected: p.nominal,
        nominal: p.invested,
      }))
    }
    return buildProjectionData(patrimoineNet)
  }, [strategyResult, patrimoineNet])
  const projectedTarget = projectionData[projectionData.length - 1]?.projected || 0

  // Objective placeholder
  const objective = 500000
  const progressPct = Math.min((patrimoineNet / objective) * 100, 100)

  const allocationData = [
    { name: 'Crypto', value: totals.crypto, color: '#3b82f6' },
    { name: 'PEA', value: totals.pea, color: '#10b981' },
    { name: 'Livrets', value: totalLivrets, color: '#f59e0b' },
    { name: 'Levées', value: totals.fundraising, color: '#8b5cf6' },
  ]

  // DCA summary
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

  const lastAgg = aggregates?.[aggregates.length - 1]
  const monthIncome = lastAgg?.income || 0
  const monthExpenses = lastAgg?.expenses || 0
  const monthSavings = monthIncome - monthExpenses

  return (
    <div className="dashboard">

      {/* ═══ A. Strategic Hero ═══ */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <p className="dashboard-hero-eyebrow">Votre trajectoire patrimoniale</p>
          <p className="dashboard-total">{m(fmt(patrimoineNet))}</p>
          <span className={`dashboard-hero-badge ${totalGain >= 0 ? 'dashboard-hero-badge--up' : 'dashboard-hero-badge--down'}`}>
            {totalGain >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {m(fmt(totalGain))} depuis le début
          </span>
          <div className="dashboard-hero-actions">
            <Link to="/strategy" className="btn btn-primary btn-sm">
              <FlaskConical size={14} /> Strategy Lab
            </Link>
            <Link to="/portfolio/objectives" className="btn btn-ghost btn-sm">
              <Target size={14} /> Définir un objectif
            </Link>
          </div>
        </div>
        <div className="dashboard-hero-chart">
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={perfData}>
              <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ B. Strategic KPIs ═══ */}
      <div className="dashboard-stats">
        <div className="dash-stat" style={{ '--stat-accent': 'var(--accent)' }}>
          <div className="dash-stat-header">
            <div className="dash-stat-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}><Wallet size={17} /></div>
            <span className="dash-stat-label">Patrimoine actuel</span>
          </div>
          <div className="dash-stat-value">{m(fmt(patrimoineNet))}</div>
          <div className={`dash-stat-sub ${totalGain >= 0 ? 'text-success' : 'text-danger'}`}>{mp(fmtPct(totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0))}</div>
        </div>

        <div className="dash-stat" style={{ '--stat-accent': 'var(--success)' }}>
          <div className="dash-stat-header">
            <div className="dash-stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}><TrendingUp size={17} /></div>
            <span className="dash-stat-label">Trajectoire 10 ans</span>
          </div>
          <div className="dash-stat-value">{m(fmt(projectedTarget))}</div>
          <div className="dash-stat-sub text-muted">Croissance estimée 7% / an</div>
        </div>

        <div className="dash-stat" style={{ '--stat-accent': 'var(--warning)' }}>
          <div className="dash-stat-header">
            <div className="dash-stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}><Target size={17} /></div>
            <span className="dash-stat-label">Objectif patrimonial</span>
          </div>
          <div className="dash-stat-value">{m(fmt(objective))}</div>
          <div className="dash-stat-sub" style={{ color: 'var(--accent)' }}>{progressPct.toFixed(0)}% atteint</div>
        </div>

        <div className="dash-stat" style={{ '--stat-accent': '#8b5cf6' }}>
          <div className="dash-stat-header">
            <div className="dash-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}><Zap size={17} /></div>
            <span className="dash-stat-label">Épargne mensuelle</span>
          </div>
          <div className="dash-stat-value">{m(fmt(monthSavings > 0 ? monthSavings : 500))}</div>
          <div className="dash-stat-sub text-muted">/ mois</div>
        </div>
      </div>

      {/* ═══ C. Trajectory Chart ═══ */}
      <div className="dashboard-charts">
        <div className="dash-card dash-card--wide">
          <div className="perf-chart-header">
            <div className="dash-card-title">Trajectoire patrimoniale</div>
            <div className="time-range-selector">
              {TIME_RANGES.map(r => (
                <button key={r.key} className={`time-range-btn${timeRange === r.key ? ' active' : ''}`} onClick={() => setTimeRange(r.key)}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={perfData}>
              <defs>
                <linearGradient id="trajectoryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [m(fmt(v)), 'Valeur']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: '0.82rem' }} />
              <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} fill="url(#trajectoryGrad)" dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="dash-card">
          <div className="dash-card-title">Projection estimée</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={projectionData}>
              <defs>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--success)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [m(fmt(v))]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: '0.82rem' }} />
              <Area type="monotone" dataKey="projected" stroke="var(--success)" strokeWidth={2} fill="url(#projGrad)" name="Avec rendement" />
              <Area type="monotone" dataKey="nominal" stroke="var(--text-muted)" strokeWidth={1.5} strokeDasharray="4 4" fill="none" name="Épargne seule" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="projection-legend">
            <span className="projection-legend-item"><span className="projection-dot" style={{ background: 'var(--success)' }} /> Avec rendement</span>
            <span className="projection-legend-item"><span className="projection-dot projection-dot--dashed" /> Épargne seule</span>
          </div>
        </div>
      </div>

      {/* ═══ D. Objective Progress ═══ */}
      <div className="dash-card objective-card">
        <div className="objective-card-header">
          <div className="flex items-center gap-8">
            <Target size={16} style={{ color: 'var(--warning)' }} />
            <span className="dash-card-title" style={{ margin: 0 }}>Objectif patrimonial</span>
          </div>
          <Link to="/strategy" className="insight-link" style={{ margin: 0, padding: 0 }}>Strategy Lab <ArrowRight size={12} /></Link>
        </div>
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
            <span className="objective-stat-value" style={{ color: 'var(--accent)' }}>{progressPct.toFixed(1)}%</span>
          </div>
          <div className="objective-stat">
            <span className="objective-stat-label">Écart restant</span>
            <span className="objective-stat-value">{m(fmt(Math.max(objective - patrimoineNet, 0)))}</span>
          </div>
          <div className="objective-stat">
            <span className="objective-stat-label">Horizon estimé</span>
            <span className="objective-stat-value">~{Math.ceil(Math.log(objective / Math.max(patrimoineNet, 1)) / Math.log(1.07))} ans</span>
          </div>
        </div>
      </div>

      {/* ═══ E. Optimization Levers ═══ */}
      <div className="dashboard-levers">
        <div className="dash-card-title" style={{ marginBottom: 12 }}>Leviers d'optimisation</div>
        <div className="levers-grid">
          <div className="lever-card">
            <div className="lever-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}><TrendingUp size={16} /></div>
            <div className="lever-content">
              <span className="lever-title">Augmenter l'épargne mensuelle</span>
              <span className="lever-desc">+100€/mois pourrait vous rapprocher de 2 ans de votre objectif</span>
            </div>
          </div>
          <div className="lever-card">
            <div className="lever-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}><Layers size={16} /></div>
            <div className="lever-content">
              <span className="lever-title">Mieux répartir votre argent</span>
              <span className="lever-desc">Rééquilibrer vers des placements à meilleure croissance long terme</span>
            </div>
          </div>
          <div className="lever-card">
            <div className="lever-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}><Zap size={16} /></div>
            <div className="lever-content">
              <span className="lever-title">Réduire le cash dormant</span>
              <span className="lever-desc">Mobiliser l'épargne non investie vers des supports performants</span>
            </div>
          </div>
          <div className="lever-card">
            <div className="lever-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}><Compass size={16} /></div>
            <div className="lever-content">
              <span className="lever-title">Accélérer la date d'atteinte</span>
              <span className="lever-desc">Combinez les leviers pour atteindre votre objectif plus vite</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ F. Growth Engines + Allocation ═══ */}
      <div className="dashboard-middle">
        <div className="dash-card">
          <div className="dash-card-title">Répartition de votre argent</div>
          <div className="dashboard-pie-row">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={allocationData} cx={95} cy={95} innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
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

        <div className="dash-card">
          <div className="dash-card-title">Sentiment de marché</div>
          <div className="dashboard-gauges">
            <GaugeChart value={fearGreed.crypto} label="Crypto" />
            <GaugeChart value={fearGreed.market} label="Marchés" />
          </div>
        </div>
      </div>

      {/* ═══ G. Scenarios Preview ═══ */}
      <div className="dashboard-scenarios">
        <div className="dash-card-title" style={{ marginBottom: 12 }}>Aperçu des scénarios</div>
        <div className="scenarios-grid">
          {[
            { name: 'Actuel', value: projectionData[5]?.projected || 0, icon: Activity, desc: 'Stratégie inchangée', color: 'var(--text-muted)' },
            { name: 'Optimisé', value: Math.round((projectionData[5]?.projected || 0) * 1.15), icon: TrendingUp, desc: 'Allocation améliorée', color: 'var(--success)' },
            { name: 'Ambitieux', value: Math.round((projectionData[5]?.projected || 0) * 1.35), icon: Zap, desc: 'Effort + allocation max', color: 'var(--accent)' },
          ].map(s => (
            <div key={s.name} className="scenario-card">
              <div className="scenario-header">
                <s.icon size={16} style={{ color: s.color }} />
                <span className="scenario-name">{s.name}</span>
              </div>
              <div className="scenario-value" style={{ color: s.color }}>{m(fmt(s.value))}</div>
              <span className="scenario-desc">{s.desc}</span>
              <span className="scenario-horizon">Horizon 5 ans</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link to="/strategy" className="btn btn-secondary btn-sm">
            <GitBranch size={14} /> Comparer les scénarios
          </Link>
        </div>
      </div>

      {/* ═══ DCA + Insights (existing) ═══ */}
      {dcaSummary && (
        <div className="dash-card dca-dashboard-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={15} style={{ color: 'var(--accent)' }} />
              <span className="dash-card-title" style={{ margin: 0 }}>Plans DCA</span>
            </div>
            <Link to="/portfolio/dca" style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>Voir les plans →</Link>
          </div>
          <div className="dca-dash-stats">
            <div className="dca-dash-stat">
              <div className="dca-dash-stat-label">Versé total</div>
              <div className="dca-dash-stat-value">{m(fmt(dcaSummary.totalInvested))}</div>
            </div>
            <div className="dca-dash-stat">
              <div className="dca-dash-stat-label">Dans les temps</div>
              <div className="dca-dash-stat-value" style={{ color: dcaSummary.onTrack === dcaSummary.total ? 'var(--success)' : 'var(--warning)' }}>
                {dcaSummary.onTrack}/{dcaSummary.total}
              </div>
            </div>
            <div className="dca-dash-stat">
              <div className="dca-dash-stat-label">Ce mois prévu</div>
              <div className="dca-dash-stat-value">{m(fmt(dcaSummary.monthPlanned))}</div>
            </div>
            <div className="dca-dash-stat">
              <div className="dca-dash-stat-label">Ce mois versé</div>
              <div className="dca-dash-stat-value" style={{ color: dcaSummary.monthActual >= dcaSummary.monthPlanned ? 'var(--success)' : 'var(--warning)' }}>
                {m(fmt(dcaSummary.monthActual))}
              </div>
            </div>
          </div>
          {dcaSummary.nextDates.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Prochains :</span>
              {dcaSummary.nextDates.map((d, i) => (
                <span key={i} className="dca-upcoming-chip">
                  {new Date(d.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  {' · '}{d.label}{' · '}{fmt(d.amount)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Insights */}
      <div className="dashboard-bottom">
        <div className="dash-card dashboard-insight-card">
          <div className="flex items-center gap-8 mb-8">
            <Sparkles size={15} style={{ color: 'var(--accent)' }} />
            <span className="insight-tag">Analyse stratégique IA</span>
          </div>
          {insightLoading ? (
            <div className="skeleton" style={{ height: 14, width: '90%', marginBottom: 8 }} />
          ) : insight ? (
            <>
              <p className="insight-text">{typeof insight === 'string' ? insight.slice(0, 300) : 'Analyse disponible'}...</p>
              <Link to="/insights" className="insight-link">Voir l'analyse complète <span>→</span></Link>
            </>
          ) : (
            <p className="text-muted text-sm">Configurez l'IA pour obtenir des insights stratégiques.</p>
          )}
        </div>

        <div className="dash-card performer-card performer-card--best">
          <div className="flex items-center gap-8 mb-8">
            <Award size={14} style={{ color: 'var(--success)' }} />
            <span className="performer-tag" style={{ color: 'var(--success)' }}>Meilleur moteur</span>
          </div>
          {(() => {
            const cryptoGains = portfolio.crypto.map(c => ({ name: c.symbol, gain: ((c.currentPrice || c.buyPrice) - c.buyPrice) / c.buyPrice * 100 }))
            const best = cryptoGains.sort((a, b) => b.gain - a.gain)[0]
            return best ? (<><div className="performer-name">{best.name}</div><div className="performer-gain text-success">{fmtPct(best.gain)}</div></>) : null
          })()}
        </div>

        <div className="dash-card performer-card performer-card--worst">
          <div className="flex items-center gap-8 mb-8">
            <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
            <span className="performer-tag" style={{ color: 'var(--danger)' }}>Point d'attention</span>
          </div>
          {(() => {
            const cryptoGains = portfolio.crypto.map(c => ({ name: c.symbol, gain: ((c.currentPrice || c.buyPrice) - c.buyPrice) / c.buyPrice * 100 }))
            const worst = [...cryptoGains].sort((a, b) => a.gain - b.gain)[0]
            return worst ? (<><div className="performer-name">{worst.name}</div><div className="performer-gain text-danger">{fmtPct(worst.gain)}</div></>) : null
          })()}
        </div>
      </div>

      {/* AI Analysis Inline */}
      {analysis && (
        <div className="dashboard-analysis-row">
          {analysis.synthesis && (
            <div className="dashboard-analysis-item">
              <div className="analysis-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}><TrendingUp size={14} /></div>
              <span className="analysis-text">{analysis.synthesis}</span>
            </div>
          )}
          {analysis.diversification && (
            <div className="dashboard-analysis-item">
              <div className="analysis-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}><BarChart3 size={14} /></div>
              <span className="analysis-text">{analysis.diversification}</span>
            </div>
          )}
          {analysis.overexposures && (
            <div className="dashboard-analysis-item">
              <div className="analysis-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}><Shield size={14} /></div>
              <span className="analysis-text">{analysis.overexposures}</span>
            </div>
          )}
          {analysis.recommendations && (
            <div className="dashboard-analysis-item">
              <div className="analysis-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}><Lightbulb size={14} /></div>
              <span className="analysis-text">{analysis.recommendations}</span>
            </div>
          )}
          <div className="analysis-link"><Link to="/insights">Voir l'analyse complète →</Link></div>
        </div>
      )}

      {/* ═══ H. Priority Actions ═══ */}
      <div className="dashboard-actions">
        <div className="dash-card-title" style={{ marginBottom: 12 }}>Actions prioritaires</div>
        <div className="actions-grid">
          <Link to="/strategy" className="action-card">
            <FlaskConical size={16} style={{ color: 'var(--accent)' }} />
            <span>Explorer le Strategy Lab</span>
            <ArrowRight size={14} />
          </Link>
          <Link to="/portfolio/objectives" className="action-card">
            <Target size={16} style={{ color: 'var(--warning)' }} />
            <span>Définir un objectif financier</span>
            <ArrowRight size={14} />
          </Link>
          <Link to="/portfolio" className="action-card">
            <Wallet size={16} style={{ color: 'var(--success)' }} />
            <span>Compléter vos positions</span>
            <ArrowRight size={14} />
          </Link>
          <Link to="/insights" className="action-card">
            <Sparkles size={16} style={{ color: '#8b5cf6' }} />
            <span>Analyser votre stratégie</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
