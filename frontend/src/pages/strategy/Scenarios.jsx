import { useState, useMemo } from 'react'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { ArrowLeft, GitBranch, TrendingUp, Info, AlertTriangle, ArrowRight, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePortfolio } from '../../context/PortfolioContext'
import { useBank } from '../../context/BankContext'
import { usePrivacyMask } from '../../hooks/usePrivacyMask'
import { runScenarioSet } from '../../services/strategy/scenarioEngine'
import { fmt } from '../../utils/format'

const HORIZON_OPTIONS = [
  { value: 10, label: '10 ans' },
  { value: 20, label: '20 ans' },
  { value: 30, label: '30 ans' },
]

export default function Scenarios() {
  const { portfolio, totals, dcaPlans } = usePortfolio()
  const { accountBalances, aggregates } = useBank() || {}
  const { m } = usePrivacyMask()

  const [horizon, setHorizon] = useState(20)

  const result = useMemo(() => {
    return runScenarioSet(portfolio, totals, accountBalances || [], aggregates || [], dcaPlans, horizon)
  }, [portfolio, totals, accountBalances, aggregates, dcaPlans, horizon])

  const { scenarios } = result

  const current = scenarios.find(s => s.key === 'current')
  const optimized = scenarios.find(s => s.key === 'optimized')
  const ambitious = scenarios.find(s => s.key === 'ambitious')

  // Build merged chart data: combine all scenario chartData into one array keyed by year/label
  const chartData = useMemo(() => {
    const map = new Map()
    scenarios.forEach(s => {
      s.chartData.forEach(pt => {
        const key = pt.year ?? pt.label
        if (!map.has(key)) {
          map.set(key, { year: pt.year, label: pt.label })
        }
        map.get(key)[s.key] = pt.nominal
      })
    })
    return Array.from(map.values()).sort((a, b) => a.year - b.year)
  }, [scenarios])

  return (
    <div className="projection-page">
      {/* Header */}
      <div className="projection-header">
        <Link to="/strategy" className="projection-back">
          <ArrowLeft size={16} /> Labo Stratégie
        </Link>
        <div>
          <h1 className="projection-title">
            <GitBranch size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Comparaison de scénarios
          </h1>
          <p className="projection-subtitle">
            Comparez votre trajectoire actuelle avec des stratégies optimisées pour visualiser l'impact de chaque décision sur votre patrimoine.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="projection-controls">
        <div className="projection-control">
          <label>Horizon de projection</label>
          <select value={horizon} onChange={e => setHorizon(Number(e.target.value))}>
            {HORIZON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="projection-kpis">
        {scenarios.map(s => (
          <div key={s.key} className="projection-kpi">
            <span className="projection-kpi-label">{s.label}</span>
            <span className="projection-kpi-value" style={{ color: s.color }}>{m(fmt(s.kpis.finalValue))}</span>
            <span className="projection-kpi-sub">Patrimoine projeté à {horizon} ans</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="projection-chart-card">
        <div className="projection-chart-title">Trajectoire comparée sur {horizon} ans</div>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--text-muted)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--text-muted)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="optimizedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ambitiousGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--success)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
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
              formatter={(v, name) => {
                const labels = { current: 'Stratégie actuelle', optimized: 'Recommandée', ambitious: 'Ambitieuse' }
                return [m(fmt(v)), labels[name] || name]
              }}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: '0.82rem' }}
            />
            <Area type="monotone" dataKey="current" stroke="var(--text-muted)" strokeWidth={1.5} fill="url(#currentGrad)" name="current" />
            <Area type="monotone" dataKey="optimized" stroke="var(--accent)" strokeWidth={2.5} fill="url(#optimizedGrad)" name="optimized" />
            <Area type="monotone" dataKey="ambitious" stroke="var(--success)" strokeWidth={2.5} fill="url(#ambitiousGrad)" name="ambitious" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="projection-chart-legend">
          <span><span className="projection-dot" style={{ background: 'var(--text-muted)' }} /> Stratégie actuelle</span>
          <span><span className="projection-dot" style={{ background: 'var(--accent)' }} /> Recommandée</span>
          <span><span className="projection-dot" style={{ background: 'var(--success)' }} /> Ambitieuse</span>
        </div>
      </div>

      {/* Comparative table */}
      <div className="projection-milestones">
        <div className="projection-section-title">Comparaison détaillée</div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th></th>
                <th style={{ color: 'var(--text-muted)' }}>Stratégie actuelle</th>
                <th style={{ color: 'var(--accent)' }}>Recommandée</th>
                <th style={{ color: 'var(--success)' }}>Ambitieuse</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Patrimoine final</td>
                <td>{m(fmt(current?.kpis.finalValue))}</td>
                <td>{m(fmt(optimized?.kpis.finalValue))}</td>
                <td>{m(fmt(ambitious?.kpis.finalValue))}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Gains projetés</td>
                <td>{m(fmt(current?.kpis.totalGains))}</td>
                <td style={{ color: 'var(--success)' }}>{m(fmt(optimized?.kpis.totalGains))}</td>
                <td style={{ color: 'var(--success)' }}>{m(fmt(ambitious?.kpis.totalGains))}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Effort mensuel</td>
                <td>{m(fmt(current?.monthlyContribution))} /mois</td>
                <td>{m(fmt(optimized?.monthlyContribution))} /mois</td>
                <td>{m(fmt(ambitious?.monthlyContribution))} /mois</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Effort supplémentaire</td>
                <td style={{ color: 'var(--text-muted)' }}>{'\u2014'}</td>
                <td>0 {'\u20ac'}/mois</td>
                <td style={{ color: 'var(--accent)' }}>+{m(fmt(ambitious?.kpis.extraEffort))} /mois</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Changes sections */}
      {[optimized, ambitious].filter(Boolean).map(scenario => (
        scenario.changes.length > 0 && (
          <div key={scenario.key} className="projection-insights">
            <div className="projection-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} style={{ color: scenario.color }} />
              Ce que le moteur a changé — {scenario.label}
            </div>
            {scenario.changes.map((change, i) => (
              <div key={i} className="projection-insight projection-insight--info">
                <div className="projection-insight-icon">
                  <ArrowRight size={16} />
                </div>
                <div>
                  <div className="projection-insight-title">{change.label}</div>
                  <div className="projection-insight-desc">{change.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )
      ))}

      {/* Pedagogical note */}
      <div className="projection-hypotheses">
        <Info size={14} style={{ color: 'var(--text-muted)', minWidth: 14 }} />
        <p>
          Ces simulations reposent sur des hypothèses de rendement constant. Les marchés fluctuent — ces chiffres sont des estimations indicatives.
        </p>
      </div>

      {/* Risk disclaimer */}
      <div className="projection-hypotheses" style={{ borderColor: 'var(--warning)' }}>
        <AlertTriangle size={14} style={{ color: 'var(--warning)', minWidth: 14 }} />
        <p>
          Les performances passées ne garantissent pas les résultats futurs.
          Les actifs volatils (crypto, actions) peuvent perdre une part importante de leur valeur.
          Ces projections sont des estimations à titre informatif et ne constituent pas un conseil en investissement.
        </p>
      </div>
    </div>
  )
}
