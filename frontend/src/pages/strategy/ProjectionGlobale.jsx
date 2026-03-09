import { useState, useMemo } from 'react'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, Cell,
} from 'recharts'
import { TrendingUp, ArrowLeft, Wallet, Shield, PiggyBank, Sparkles, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePortfolio } from '../../context/PortfolioContext'
import { useBank } from '../../context/BankContext'
import { usePrivacyMask } from '../../hooks/usePrivacyMask'
import { runProjection, DEFAULT_RETURNS, DEFAULT_INFLATION } from '../../services/strategy'
import { fmt } from '../../utils/format'

const HORIZON_OPTIONS = [
  { value: 5, label: '5 ans' },
  { value: 10, label: '10 ans' },
  { value: 15, label: '15 ans' },
  { value: 20, label: '20 ans' },
  { value: 30, label: '30 ans' },
]

const ENVELOPE_COLORS = {
  crypto: '#3b82f6',
  pea: '#10b981',
  livrets: '#f59e0b',
  fundraising: '#8b5cf6',
}

export default function ProjectionGlobale() {
  const { portfolio, totals, dcaPlans } = usePortfolio()
  const { accountBalances, aggregates } = useBank() || {}
  const { m } = usePrivacyMask()

  const [horizon, setHorizon] = useState(10)
  const [contribution, setContribution] = useState(500)
  const [inflation, setInflation] = useState(DEFAULT_INFLATION * 100)

  const result = useMemo(() => {
    return runProjection(portfolio, totals, accountBalances || [], aggregates || [], dcaPlans, {
      horizonYears: horizon,
      monthlyContribution: contribution,
      inflation: inflation / 100,
    })
  }, [portfolio, totals, accountBalances, aggregates, dcaPlans, horizon, contribution, inflation])

  const { viewModel, insights } = result

  return (
    <div className="projection-page">
      {/* Header */}
      <div className="projection-header">
        <Link to="/strategy" className="projection-back">
          <ArrowLeft size={16} /> Strategy Lab
        </Link>
        <div>
          <h1 className="projection-title">Projection globale</h1>
          <p className="projection-subtitle">
            Cette simulation montre comment votre patrimoine pourrait évoluer si vous continuez à épargner au même rythme. C'est une estimation, pas une garantie.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="projection-controls">
        <div className="projection-control">
          <label>Sur combien d'années</label>
          <select value={horizon} onChange={e => setHorizon(Number(e.target.value))}>
            {HORIZON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="projection-control">
          <label>Épargne mensuelle</label>
          <div className="projection-input-group">
            <input type="number" value={contribution} onChange={e => setContribution(Math.max(0, Number(e.target.value)))} min="0" step="50" />
            <span>€/mois</span>
          </div>
        </div>
        <div className="projection-control">
          <label>Inflation</label>
          <div className="projection-input-group">
            <input type="number" value={inflation} onChange={e => setInflation(Number(e.target.value))} min="0" max="10" step="0.1" />
            <span>%/an</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="projection-kpis">
        {viewModel.kpis.map(kpi => (
          <div key={kpi.id} className="projection-kpi">
            <span className="projection-kpi-label">{kpi.label}</span>
            <span className="projection-kpi-value" style={{ color: kpi.color }}>{m(kpi.value)}</span>
            <span className="projection-kpi-sub">{kpi.sublabel}</span>
          </div>
        ))}
      </div>

      {/* Main Chart */}
      <div className="projection-chart-card">
        <div className="projection-chart-title">Trajectoire patrimoniale projetée</div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={viewModel.chartData}>
            <defs>
              <linearGradient id="nominalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--success)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v, name) => [m(fmt(v)), name === 'nominal' ? 'Valeur estimée' : name === 'real' ? 'Valeur après inflation' : 'Capital + versements']}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: '0.82rem' }}
            />
            <Area type="monotone" dataKey="nominal" stroke="var(--accent)" strokeWidth={2.5} fill="url(#nominalGrad)" name="nominal" />
            <Area type="monotone" dataKey="real" stroke="var(--success)" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#realGrad)" name="real" />
            <Area type="monotone" dataKey="invested" stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="3 3" fill="none" name="invested" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="projection-chart-legend">
          <span><span className="projection-dot" style={{ background: 'var(--accent)' }} /> Valeur estimée</span>
          <span><span className="projection-dot" style={{ background: 'var(--success)' }} /> Valeur après inflation</span>
          <span><span className="projection-dot projection-dot--dashed" /> Capital + versements</span>
        </div>
      </div>

      {/* Milestones Table */}
      <div className="projection-milestones">
        <div className="projection-section-title">Jalons de progression</div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Horizon</th>
                <th>Valeur estimée</th>
                <th>Valeur après inflation</th>
                <th>Versements cumulés</th>
                <th>Gains projetés</th>
              </tr>
            </thead>
            <tbody>
              {viewModel.milestonesTable.map(row => (
                <tr key={row.year}>
                  <td style={{ fontWeight: 600 }}>{row.label}</td>
                  <td>{m(row.nominal)}</td>
                  <td>{m(row.real)}</td>
                  <td>{m(row.contributions)}</td>
                  <td style={{ color: 'var(--success)' }}>{m(row.gains)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Growth Drivers */}
      <div className="projection-drivers">
        <div className="projection-section-title">Ce qui fait grandir votre argent</div>
        <div className="projection-drivers-grid">
          {viewModel.growthDrivers.map(driver => (
            <div key={driver.id} className="projection-driver-card">
              <div className="projection-driver-header">
                <span className="projection-driver-dot" style={{ background: ENVELOPE_COLORS[driver.id] || 'var(--accent)' }} />
                <span className="projection-driver-label">{driver.label}</span>
              </div>
              <div className="projection-driver-values">
                <div>
                  <span className="projection-driver-sub">Départ</span>
                  <span className="projection-driver-value">{m(fmt(driver.startValue))}</span>
                </div>
                <div>
                  <span className="projection-driver-sub">Projeté</span>
                  <span className="projection-driver-value" style={{ color: 'var(--success)' }}>{m(fmt(driver.endValue))}</span>
                </div>
                <div>
                  <span className="projection-driver-sub">Gain</span>
                  <span className="projection-driver-value" style={{ color: driver.gainPct >= 0 ? 'var(--success)' : 'var(--danger)' }}>+{driver.gainPct}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="projection-insights">
          <div className="projection-section-title">Analyse stratégique</div>
          {insights.map((ins, i) => (
            <div key={i} className={`projection-insight projection-insight--${ins.type}`}>
              <div className="projection-insight-icon">
                {ins.type === 'success' ? <TrendingUp size={16} /> : ins.type === 'warning' ? <Shield size={16} /> : <Sparkles size={16} />}
              </div>
              <div>
                <div className="projection-insight-title">{ins.title}</div>
                <div className="projection-insight-desc">{ins.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hypotheses */}
      <div className="projection-hypotheses">
        <Info size={14} style={{ color: 'var(--text-muted)', minWidth: 14 }} />
        <p>
          Croissance estimée utilisée : ETF {(DEFAULT_RETURNS.etf * 100)}%, Crypto {(DEFAULT_RETURNS.crypto * 100)}%, Cash {(DEFAULT_RETURNS.cash * 100)}%, Autres {(DEFAULT_RETURNS.other * 100)}%.
          Ces projections sont indicatives et ne constituent pas un conseil financier.
        </p>
      </div>
    </div>
  )
}
