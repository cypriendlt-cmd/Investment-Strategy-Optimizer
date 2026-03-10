import { useState, useEffect, useMemo } from 'react'
import {
  PieChart, Pie, Cell, AreaChart, Area,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from 'recharts'
import {
  TrendingUp, TrendingDown, Target, Zap, ArrowRight,
  Activity, Award, AlertTriangle, Sparkles,
  Calendar, GitBranch, Shield, BarChart3, Flame
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
import { fmt, fmtPct } from '../utils/format'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const TIME_RANGES = [
  { key: '7d', label: '7D', days: 7 },
  { key: '1m', label: '1M', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: '1y', label: '1Y', days: 365 },
  { key: 'all', label: 'ALL', days: null },
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
      points.push({ date: d, label: i === 0 ? "Today" : DAY_NAMES[d.getDay()] + ' ' + d.getDate() })
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
      year: y === 0 ? 'Now' : `+${y}y`,
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
      return runProjection(portfolio, totals, accountBalances || [], aggregates || [], dcaPlans, {
        horizonYears: 10,
      })
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
    if (v <= 25) return 'Extreme Fear'
    if (v <= 45) return 'Fear'
    if (v <= 55) return 'Neutral'
    if (v <= 75) return 'Greed'
    return 'Extreme Greed'
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

/* Strategy Score — computed from diversification + objective progress */
function computeStrategyScore(allocationData, progressPct, dcaSummary) {
  let score = 50
  // Diversification bonus: more than 2 non-zero categories
  const nonZero = allocationData.filter(a => a.value > 0).length
  if (nonZero >= 4) score += 15
  else if (nonZero >= 3) score += 10
  else if (nonZero >= 2) score += 5

  // Objective progress
  if (progressPct > 0) score += Math.min(progressPct * 0.2, 15)

  // DCA discipline
  if (dcaSummary) {
    const ratio = dcaSummary.onTrack / Math.max(dcaSummary.total, 1)
    score += ratio * 10
  }

  // Concentration penalty
  const total = allocationData.reduce((s, a) => s + a.value, 0)
  if (total > 0) {
    const max = Math.max(...allocationData.map(a => a.value))
    if (max / total > 0.8) score -= 10
    else if (max / total > 0.6) score -= 5
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

export default function Dashboard() {
  const { portfolio, totals, dcaPlans } = usePortfolio()
  const { accountBalances, aggregates } = useBank() || {}
  const { isGuest } = useAuth()
  const { m, mp } = usePrivacyMask()
  const [fearGreed, setFearGreed] = useState({ crypto: 0, market: 0 })
  const [insight, setInsight] = useState(null)
  const [insightLoading, setInsightLoading] = useState(true)
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

  const objective = useMemo(() => {
    const goals = portfolio?.goals || []
    const longTermGoals = goals.filter(g => g.type === 'long_term')
    if (longTermGoals.length === 1) return longTermGoals[0].targetAmount
    if (longTermGoals.length > 1) return longTermGoals.reduce((s, g) => s + g.targetAmount, 0)
    return null
  }, [portfolio?.goals])
  const progressPct = objective ? Math.min((patrimoineNet / objective) * 100, 100) : 0

  const allocationData = [
    { name: 'Crypto', value: totals.crypto, color: 'var(--color-crypto)' },
    { name: 'PEA', value: totals.pea, color: 'var(--color-pea)' },
    { name: 'Livrets', value: totalLivrets, color: 'var(--color-livrets)' },
    { name: 'Crowdfunding', value: totals.fundraising, color: 'var(--color-fundraising)' },
  ]

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
  const monthSavings = (lastAgg?.income || 0) - (lastAgg?.expenses || 0)

  const performers = useMemo(() => {
    const cryptoGains = portfolio.crypto.map(c => ({
      name: c.symbol,
      gain: ((c.currentPrice || c.buyPrice) - c.buyPrice) / c.buyPrice * 100
    }))
    const sorted = [...cryptoGains].sort((a, b) => b.gain - a.gain)
    return { best: sorted[0] || null, worst: sorted[sorted.length - 1] || null }
  }, [portfolio.crypto])

  const strategyScore = useMemo(() =>
    computeStrategyScore(allocationData, progressPct, dcaSummary),
    [allocationData, progressPct, dcaSummary]
  )

  // Risk level from allocation concentration
  const riskLevel = useMemo(() => {
    const total = allocationData.reduce((s, a) => s + a.value, 0)
    if (total === 0) return { label: 'N/A', color: 'var(--text-muted)' }
    const cryptoPct = totals.crypto / total
    if (cryptoPct > 0.6) return { label: 'High', color: 'var(--danger)' }
    if (cryptoPct > 0.35) return { label: 'Medium', color: 'var(--warning)' }
    return { label: 'Low', color: 'var(--success)' }
  }, [allocationData, totals.crypto])

  return (
    <div className="dashboard">

      {/* ═══ 1. HERO — Total Net Worth + Key Metrics ═══ */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <p className="dashboard-hero-eyebrow">Total Net Worth</p>
          <p className="dashboard-total">{m(fmt(patrimoineNet))}</p>
          <span className={`dashboard-hero-badge ${totalGain >= 0 ? 'dashboard-hero-badge--up' : 'dashboard-hero-badge--down'}`}>
            {totalGain >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {m(fmt(totalGain))} ({mp(fmtPct(gainPct))})
          </span>
        </div>
        <div className="dashboard-hero-right">
          <div className="dashboard-hero-kpis">
            <div className="dashboard-hero-kpi">
              <span className="dashboard-hero-kpi-label">10Y Projection</span>
              <span className="dashboard-hero-kpi-value">{m(fmt(projectedTarget))}</span>
            </div>
            <div className="dashboard-hero-kpi">
              <span className="dashboard-hero-kpi-label">Monthly Savings</span>
              <span className="dashboard-hero-kpi-value">{m(fmt(monthSavings > 0 ? monthSavings : 500))}</span>
            </div>
            <div className="dashboard-hero-kpi">
              <span className="dashboard-hero-kpi-label">Strategy Score</span>
              <span className="dashboard-hero-kpi-value dashboard-hero-kpi-value--accent">{strategyScore}/100</span>
            </div>
            <div className="dashboard-hero-kpi">
              <span className="dashboard-hero-kpi-label">Risk Level</span>
              <span className="dashboard-hero-kpi-value" style={{ color: riskLevel.color }}>{riskLevel.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 2. TRAJECTORY CHART ═══ */}
      <div className="dash-card">
        <div className="perf-chart-header">
          <div className="dash-card-title">Portfolio Trajectory</div>
          <div className="time-range-selector">
            {TIME_RANGES.map(r => (
              <button key={r.key} className={`time-range-btn${timeRange === r.key ? ' active' : ''}`} onClick={() => setTimeRange(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={perfData}>
            <defs>
              <linearGradient id="trajectoryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v) => [m(fmt(v)), 'Value']}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: '0.82rem', boxShadow: 'var(--shadow)' }}
              cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} fill="url(#trajectoryGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--accent)' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ═══ 3. ALLOCATION + MARKET SENTIMENT ═══ */}
      <div className="dashboard-middle">
        <div className="dash-card">
          <div className="dash-card-title">Asset Allocation</div>
          <div className="dashboard-pie-row">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={allocationData} cx={85} cy={85} innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value" strokeWidth={0}>
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
          <div className="dash-card-title">Market Sentiment</div>
          <div className="dashboard-gauges">
            <GaugeChart value={fearGreed.crypto} label="Crypto" />
            <GaugeChart value={fearGreed.market} label="Markets" />
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
      </div>

      {/* ═══ 4. OBJECTIVE PROGRESS ═══ */}
      <div className="dash-card objective-card">
        <div className="objective-card-header">
          <div className="flex items-center gap-8">
            <Target size={16} className="text-warning" />
            <span className="dash-card-title" style={{ margin: 0 }}>Financial Goal</span>
          </div>
          <Link to="/strategy" className="insight-link" style={{ margin: 0, padding: 0 }}>Strategy Lab <ArrowRight size={12} /></Link>
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
                <span className="objective-stat-label">Progress</span>
                <span className="objective-stat-value text-accent">{progressPct.toFixed(1)}%</span>
              </div>
              <div className="objective-stat">
                <span className="objective-stat-label">Remaining</span>
                <span className="objective-stat-value">{m(fmt(Math.max(objective - patrimoineNet, 0)))}</span>
              </div>
              <div className="objective-stat">
                <span className="objective-stat-label">Est. Horizon</span>
                <span className="objective-stat-value">~{Math.ceil(Math.log(objective / Math.max(patrimoineNet, 1)) / Math.log(1.07))} years</span>
              </div>
            </div>
          </>
        ) : (
          <div className="objective-empty">
            <Target size={28} className="text-muted" />
            <p>Set a financial goal to track your progress toward it.</p>
            <Link to="/strategy/objectifs" className="btn btn-primary btn-sm">
              <Target size={14} /> Set Your Goal
            </Link>
          </div>
        )}
      </div>

      {/* ═══ 5. SCENARIOS PREVIEW ═══ */}
      <div className="dashboard-scenarios">
        <div className="dash-card-title">5-Year Scenarios</div>
        <div className="scenarios-grid">
          {[
            { name: 'Current', value: projectionData[5]?.projected || 0, icon: Activity, desc: 'No strategy change', variant: 'muted' },
            { name: 'Optimized', value: Math.round((projectionData[5]?.projected || 0) * 1.15), icon: TrendingUp, desc: 'Improved allocation', variant: 'success' },
            { name: 'Ambitious', value: Math.round((projectionData[5]?.projected || 0) * 1.35), icon: Zap, desc: 'Max effort + allocation', variant: 'accent' },
          ].map(s => (
            <div key={s.name} className={`scenario-card scenario-card--${s.variant}`}>
              <div className="scenario-header">
                <s.icon size={16} />
                <span className="scenario-name">{s.name}</span>
              </div>
              <div className="scenario-value">{m(fmt(s.value))}</div>
              <span className="scenario-desc">{s.desc}</span>
            </div>
          ))}
        </div>
        <div className="dashboard-scenarios-cta">
          <Link to="/strategy/scenarios" className="btn btn-secondary btn-sm">
            <GitBranch size={14} /> Compare Scenarios
          </Link>
        </div>
      </div>

      {/* ═══ 6. DCA SUMMARY (conditional) ═══ */}
      {dcaSummary && (
        <div className="dash-card dca-dashboard-card">
          <div className="dca-dashboard-header">
            <div className="flex items-center gap-8">
              <Calendar size={15} className="text-accent" />
              <span className="dash-card-title" style={{ margin: 0 }}>DCA Plans</span>
            </div>
            <Link to="/portfolio/dca" className="insight-link" style={{ margin: 0, padding: 0 }}>View plans <ArrowRight size={12} /></Link>
          </div>
          <div className="dca-dash-stats">
            <div className="dca-dash-stat">
              <div className="dca-dash-stat-label">Total Invested</div>
              <div className="dca-dash-stat-value">{m(fmt(dcaSummary.totalInvested))}</div>
            </div>
            <div className="dca-dash-stat">
              <div className="dca-dash-stat-label">On Track</div>
              <div className={`dca-dash-stat-value ${dcaSummary.onTrack === dcaSummary.total ? 'text-success' : 'text-warning'}`}>
                {dcaSummary.onTrack}/{dcaSummary.total}
              </div>
            </div>
            <div className="dca-dash-stat">
              <div className="dca-dash-stat-label">Month Planned</div>
              <div className="dca-dash-stat-value">{m(fmt(dcaSummary.monthPlanned))}</div>
            </div>
            <div className="dca-dash-stat">
              <div className="dca-dash-stat-label">Month Actual</div>
              <div className={`dca-dash-stat-value ${dcaSummary.monthActual >= dcaSummary.monthPlanned ? 'text-success' : 'text-warning'}`}>
                {m(fmt(dcaSummary.monthActual))}
              </div>
            </div>
          </div>
          {dcaSummary.nextDates.length > 0 && (
            <div className="dca-upcoming">
              <span className="dca-upcoming-label">Upcoming:</span>
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

      {/* ═══ 7. AI INSIGHTS SUMMARY ═══ */}
      <div className="dash-card dashboard-insight-card">
        <div className="flex items-center gap-8 mb-8">
          <Sparkles size={15} className="text-accent" />
          <span className="insight-tag">AI Strategy Analysis</span>
        </div>
        {insightLoading ? (
          <div className="skeleton" style={{ height: 14, width: '90%', marginBottom: 8 }} />
        ) : insight ? (
          <>
            <p className="insight-text">{typeof insight === 'string' ? insight.slice(0, 300) : 'Analysis available'}...</p>
            <Link to="/insights" className="insight-link">View full analysis <span>→</span></Link>
          </>
        ) : (
          <p className="text-muted text-sm">Configure AI in settings to get strategic insights.</p>
        )}
      </div>
    </div>
  )
}
