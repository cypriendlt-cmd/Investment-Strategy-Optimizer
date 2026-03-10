import { useState, useMemo } from 'react'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { ArrowLeft, Sunrise, Target, TrendingUp, Info, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePortfolio } from '../../context/PortfolioContext'
import { useBank } from '../../context/BankContext'
import { usePrivacyMask } from '../../hooks/usePrivacyMask'
import { getDcaMonthlyContribution, buildPortfolioSnapshot } from '../../services/strategy'
import { computeFreedomNumber, computeYearsToFire, computeFireTrajectory, computeFireScenarios, WITHDRAWAL_RATES } from '../../services/strategy/fireEngine'
import { fmt } from '../../utils/format'

const RETURN_PROFILES = [
  { value: 0.04, label: 'Conservative (4%/yr)' },
  { value: 0.07, label: 'Balanced (7%/yr)' },
  { value: 0.10, label: 'Dynamic (10%/yr)' },
]

export default function FIRECalculator() {
  const { portfolio, totals, dcaPlans } = usePortfolio()
  const { accountBalances, aggregates } = useBank() || {}
  const { m } = usePrivacyMask()

  // Current total wealth
  const currentWealth = useMemo(() => {
    const investmentTotal = totals?.total || 0
    const bankTotal = (accountBalances || []).reduce((s, a) => s + (a.balance || 0), 0)
    return investmentTotal + bankTotal
  }, [totals, accountBalances])

  // Default monthly expenses from bank aggregates or 2000
  const defaultExpenses = useMemo(() => {
    if (!aggregates || aggregates.length === 0) return 2000
    const lastMonth = aggregates[aggregates.length - 1]
    const expenses = Math.abs(lastMonth?.totalExpenses || lastMonth?.expenses || 0)
    return expenses > 0 ? Math.round(expenses) : 2000
  }, [aggregates])

  // Default savings from DCA or 500
  const defaultSavings = useMemo(() => {
    const dca = getDcaMonthlyContribution(dcaPlans)
    if (dca > 0) return Math.round(dca)
    const snapshot = buildPortfolioSnapshot(portfolio, totals, accountBalances || [], aggregates || [])
    const avg = snapshot?.estimatedMonthlySavings || 0
    return avg > 0 ? Math.round(avg) : 500
  }, [dcaPlans, portfolio, totals, accountBalances, aggregates])

  const [monthlyExpenses, setMonthlyExpenses] = useState(defaultExpenses)
  const [withdrawalRate, setWithdrawalRate] = useState(0.04)
  const [annualReturn, setAnnualReturn] = useState(0.07)
  const [monthlySavings, setMonthlySavings] = useState(defaultSavings)

  // Freedom Number
  const freedomNumber = useMemo(
    () => computeFreedomNumber(monthlyExpenses, withdrawalRate),
    [monthlyExpenses, withdrawalRate]
  )

  // Years to FIRE
  const fireResult = useMemo(
    () => computeYearsToFire(currentWealth, freedomNumber, monthlySavings, annualReturn),
    [currentWealth, freedomNumber, monthlySavings, annualReturn]
  )

  // Progression
  const progressPct = useMemo(
    () => freedomNumber > 0 ? Math.min((currentWealth / freedomNumber) * 100, 100) : 0,
    [currentWealth, freedomNumber]
  )

  // Trajectory for chart
  const trajectory = useMemo(
    () => computeFireTrajectory(currentWealth, freedomNumber, monthlySavings, annualReturn),
    [currentWealth, freedomNumber, monthlySavings, annualReturn]
  )

  // Scenarios table
  const scenarios = useMemo(
    () => computeFireScenarios(currentWealth, monthlySavings, monthlyExpenses, withdrawalRate),
    [currentWealth, monthlySavings, monthlyExpenses, withdrawalRate]
  )

  // Estimated date label
  const estimatedDate = useMemo(() => {
    if (!fireResult) return 'Not reachable'
    const [year, month] = fireResult.projectedDate.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`
  }, [fireResult])

  // Find crossing year index for chart dot
  const crossingIndex = useMemo(() => {
    const idx = trajectory.findIndex(p => p.reached)
    return idx >= 0 ? idx : null
  }, [trajectory])

  return (
    <div className="projection-page">
      {/* Header */}
      <div className="projection-header">
        <Link to="/strategy" className="projection-back">
          <ArrowLeft size={16} /> Strategy Lab
        </Link>
        <div>
          <h1 className="projection-title">
            <Sunrise size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Financial Freedom
          </h1>
          <p className="projection-subtitle">
            Calculate your "Freedom Number" — the capital needed to live off your investments — and estimate how many years it will take to reach it using the FIRE method.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="projection-controls">
        <div className="projection-control">
          <label>Monthly Expenses</label>
          <div className="projection-input-group">
            <input
              type="number"
              value={monthlyExpenses}
              onChange={e => setMonthlyExpenses(Math.max(0, Number(e.target.value)))}
              min="0"
              step="100"
            />
            <span>€/mo</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
            Pre-filled from your bank transactions
          </span>
        </div>
        <div className="projection-control">
          <label>Withdrawal Rate</label>
          <select value={withdrawalRate} onChange={e => setWithdrawalRate(Number(e.target.value))}>
            {WITHDRAWAL_RATES.map(wr => (
              <option key={wr.value} value={wr.value}>{wr.label} — {wr.desc}</option>
            ))}
          </select>
        </div>
        <div className="projection-control">
          <label>Expected Return</label>
          <select value={annualReturn} onChange={e => setAnnualReturn(Number(e.target.value))}>
            {RETURN_PROFILES.map(rp => (
              <option key={rp.value} value={rp.value}>{rp.label}</option>
            ))}
          </select>
        </div>
        <div className="projection-control">
          <label>Monthly Savings</label>
          <div className="projection-input-group">
            <input
              type="number"
              value={monthlySavings}
              onChange={e => setMonthlySavings(Math.max(0, Number(e.target.value)))}
              min="0"
              step="50"
            />
            <span>€/mo</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
            Pre-filled from your active investment plans
          </span>
        </div>
      </div>

      {/* Freedom Number highlight */}
      <div className="projection-chart-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <Target size={20} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Freedom Number
          </span>
        </div>
        <div style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
          {m(fmt(freedomNumber))}
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 560, margin: '12px auto 0', lineHeight: 1.5 }}>
          The {(withdrawalRate * 100).toFixed(0)}% rule means you can withdraw {(withdrawalRate * 100).toFixed(0)}% of your net worth each year without depleting it over 30 years (Trinity Study, 1998). This is an estimate, not a guarantee.
        </p>
      </div>

      {/* KPIs */}
      <div className="projection-kpis">
        <div className="projection-kpi">
          <span className="projection-kpi-label">Freedom Number</span>
          <span className="projection-kpi-value" style={{ color: 'var(--accent)' }}>{m(fmt(freedomNumber))}</span>
          <span className="projection-kpi-sub">target capital</span>
        </div>
        <div className="projection-kpi">
          <span className="projection-kpi-label">Current Net Worth</span>
          <span className="projection-kpi-value" style={{ color: 'var(--text)' }}>{m(fmt(currentWealth))}</span>
          <span className="projection-kpi-sub">investments + bank</span>
        </div>
        <div className="projection-kpi">
          <span className="projection-kpi-label">Progress</span>
          <span className="projection-kpi-value" style={{ color: progressPct >= 100 ? 'var(--success)' : 'var(--warning)' }}>
            {progressPct.toFixed(1)} %
          </span>
          <span className="projection-kpi-sub">of Freedom Number</span>
        </div>
        <div className="projection-kpi">
          <span className="projection-kpi-label">Years Remaining</span>
          <span className="projection-kpi-value" style={{ color: 'var(--success)' }}>
            {fireResult ? fireResult.label : '50+ years'}
          </span>
          <span className="projection-kpi-sub">estimate</span>
        </div>
        <div className="projection-kpi">
          <span className="projection-kpi-label">Estimated Date</span>
          <span className="projection-kpi-value" style={{ color: '#8b5cf6' }}>
            {estimatedDate}
          </span>
          <span className="projection-kpi-sub">financial independence</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="objective-progress-section">
        <div className="objective-progress-header">
          <span>Progress toward Freedom Number</span>
          <span className="objective-progress-pct">{progressPct.toFixed(0)}%</span>
        </div>
        <div className="objective-progress-bar">
          <div
            className="objective-progress-fill"
            style={{
              width: `${Math.min(progressPct, 100)}%`,
              background: progressPct >= 100 ? 'var(--success)' : 'var(--accent)',
            }}
          />
        </div>
        <div className="objective-progress-labels">
          <span>{m(fmt(currentWealth))}</span>
          <span>{m(fmt(freedomNumber))}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="projection-chart-card">
        <div className="projection-chart-title">Trajectory Toward Financial Freedom</div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={trajectory}>
            <defs>
              <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(v, name) => [
                m(fmt(v)),
                name === 'wealth' ? 'Projected Net Worth' : 'Freedom Number',
              ]}
              contentStyle={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: '0.82rem',
              }}
            />
            <ReferenceLine
              y={freedomNumber}
              stroke="var(--success)"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{ value: 'Freedom Number', fill: 'var(--success)', fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="wealth"
              stroke="var(--accent)"
              strokeWidth={2.5}
              fill="url(#fireGrad)"
              name="wealth"
              dot={(props) => {
                if (crossingIndex !== null && props.index === crossingIndex) {
                  return (
                    <circle
                      key={props.index}
                      cx={props.cx}
                      cy={props.cy}
                      r={6}
                      fill="var(--success)"
                      stroke="var(--bg-card)"
                      strokeWidth={2}
                    />
                  )
                }
                return null
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="projection-chart-legend">
          <span><span className="projection-dot" style={{ background: 'var(--accent)' }} /> Projected Net Worth</span>
          <span><span className="projection-dot projection-dot--dashed" style={{ background: 'var(--success)' }} /> Freedom Number</span>
          {crossingIndex !== null && (
            <span><span className="projection-dot" style={{ background: 'var(--success)' }} /> Independence Point</span>
          )}
        </div>
      </div>

      {/* Scenarios Table */}
      <div className="projection-milestones">
        <div className="projection-section-title">
          <TrendingUp size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Scenario Comparison
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Profile</th>
                <th>Return</th>
                <th>Years</th>
                <th>Estimated Date</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map(sc => {
                const dateLabel = (() => {
                  if (!sc.result) return 'Not reachable'
                  const [y, mo] = sc.result.projectedDate.split('-')
                  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                  return `${monthNames[parseInt(mo, 10) - 1]} ${y}`
                })()
                return (
                  <tr key={sc.key}>
                    <td style={{ fontWeight: 600 }}>{sc.label}</td>
                    <td>{(sc.annualReturn * 100).toFixed(0)} %/yr</td>
                    <td style={{ color: sc.result ? 'var(--success)' : 'var(--text-muted)' }}>
                      {sc.result ? sc.result.label : '50+ years'}
                    </td>
                    <td style={{ color: sc.result ? '#8b5cf6' : 'var(--text-muted)' }}>
                      {dateLabel}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hypotheses */}
      <div className="projection-hypotheses">
        <Info size={14} style={{ color: 'var(--text-muted)', minWidth: 14 }} />
        <p>
          Withdrawal rate: {(withdrawalRate * 100).toFixed(0)}%/yr. Estimated return: {(annualReturn * 100).toFixed(0)}%/yr.
          Monthly savings: {fmt(monthlySavings)}/mo.
          These projections are indicative and do not constitute financial advice.
        </p>
      </div>

      {/* Risk disclaimer */}
      <div className="projection-hypotheses" style={{ borderColor: 'var(--warning)' }}>
        <AlertTriangle size={14} style={{ color: 'var(--warning)', minWidth: 14 }} />
        <p>
          The 4% rule is based on historical US data (Trinity Study, 1998).
          It does not guarantee that your capital will last 30 years in all future scenarios.
          Past performance does not guarantee future results.
          Volatile assets (crypto, stocks) can lose a significant portion of their value.
          These projections are estimates for informational purposes only.
        </p>
      </div>
    </div>
  )
}
