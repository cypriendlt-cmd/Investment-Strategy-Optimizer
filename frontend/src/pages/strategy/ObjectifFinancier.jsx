import { useState, useMemo } from 'react'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { Target, ArrowLeft, CheckCircle, AlertTriangle, TrendingUp, Info, Lightbulb } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePortfolio } from '../../context/PortfolioContext'
import { useBank } from '../../context/BankContext'
import { usePrivacyMask } from '../../hooks/usePrivacyMask'
import { runObjectiveAnalysis, DEFAULT_RETURNS, DEFAULT_INFLATION } from '../../services/strategy'
import { fmt } from '../../utils/format'

const STRATEGY_PROFILES = [
  { value: 'conservative', label: 'Prudent', returnRate: 0.04 },
  { value: 'balanced', label: 'Équilibré', returnRate: 0.06 },
  { value: 'growth', label: 'Croissance', returnRate: 0.08 },
  { value: 'aggressive', label: 'Agressif', returnRate: 0.10 },
]

export default function ObjectifFinancier() {
  const { portfolio, totals, dcaPlans } = usePortfolio()
  const { accountBalances, aggregates } = useBank() || {}
  const { m } = usePrivacyMask()

  // Check for long-term goal to suggest as target
  const longTermGoal = useMemo(() => {
    const goals = portfolio?.goals || []
    return goals.find(g => g.type === 'long_term') || null
  }, [portfolio?.goals])

  // Read target from URL query param if provided
  const urlTarget = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('target')
    return t ? Number(t) : null
  }, [])

  const [targetAmount, setTargetAmount] = useState(urlTarget || 100000)
  const [horizonYears, setHorizonYears] = useState(10)
  const [contribution, setContribution] = useState(500)
  const [strategyProfile, setStrategyProfile] = useState('balanced')
  const [inflation, setInflation] = useState(DEFAULT_INFLATION * 100)
  const [goalBannerDismissed, setGoalBannerDismissed] = useState(false)

  const selectedProfile = STRATEGY_PROFILES.find(p => p.value === strategyProfile)

  const result = useMemo(() => {
    return runObjectiveAnalysis(portfolio, totals, accountBalances || [], aggregates || [], dcaPlans, {
      targetAmount,
      horizonYears,
      monthlyContribution: contribution,
      annualReturn: selectedProfile.returnRate,
      inflation: inflation / 100,
    })
  }, [portfolio, totals, accountBalances, aggregates, dcaPlans, targetAmount, horizonYears, contribution, strategyProfile, inflation])

  const { viewModel } = result

  return (
    <div className="projection-page">
      {/* Header */}
      <div className="projection-header">
        <Link to="/strategy" className="projection-back">
          <ArrowLeft size={16} /> Strategy Lab
        </Link>
        <div>
          <h1 className="projection-title">Objectif financier</h1>
          <p className="projection-subtitle">
            Définissez une cible (par exemple 100 000 €) et découvrez si votre stratégie actuelle vous permet de l'atteindre, et en combien de temps.
          </p>
        </div>
      </div>

      {/* Goal suggestion banner */}
      {longTermGoal && !goalBannerDismissed && !urlTarget && (
        <div className="projection-hypotheses" style={{ borderColor: 'var(--accent)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Lightbulb size={16} style={{ color: 'var(--accent)', minWidth: 16 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0 }}>
              Vous avez défini un objectif long terme : <strong>{longTermGoal.label}</strong> ({fmt(longTermGoal.targetAmount)}). Voulez-vous l'utiliser comme cible ici ?
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setTargetAmount(longTermGoal.targetAmount); setGoalBannerDismissed(true) }} style={{ whiteSpace: 'nowrap' }}>
            Utiliser cet objectif
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setGoalBannerDismissed(true)} style={{ padding: '4px 8px' }}>
            &times;
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="projection-controls">
        <div className="projection-control">
          <label>Objectif patrimonial</label>
          <div className="projection-input-group">
            <input type="number" value={targetAmount} onChange={e => setTargetAmount(Math.max(0, Number(e.target.value)))} min="0" step="10000" />
            <span>€</span>
          </div>
        </div>
        <div className="projection-control">
          <label>Horizon</label>
          <div className="projection-input-group">
            <input type="number" value={horizonYears} onChange={e => setHorizonYears(Math.max(1, Math.min(50, Number(e.target.value))))} min="1" max="50" step="1" />
            <span>ans</span>
          </div>
        </div>
        <div className="projection-control">
          <label>Épargne mensuelle</label>
          <div className="projection-input-group">
            <input type="number" value={contribution} onChange={e => setContribution(Math.max(0, Number(e.target.value)))} min="0" step="50" />
            <span>€/mois</span>
          </div>
        </div>
        <div className="projection-control">
          <label>Profil de risque</label>
          <select value={strategyProfile} onChange={e => setStrategyProfile(e.target.value)}>
            {STRATEGY_PROFILES.map(p => <option key={p.value} value={p.value}>{p.label} ({(p.returnRate * 100)}%/an)</option>)}
          </select>
        </div>
        <div className="projection-control">
          <label>Inflation</label>
          <div className="projection-input-group">
            <input type="number" value={inflation} onChange={e => setInflation(Number(e.target.value))} min="0" max="10" step="0.1" />
            <span>%/an</span>
          </div>
        </div>
      </div>

      {/* Result Banner */}
      <div className={`objective-result ${viewModel.isAchievable ? 'objective-result--success' : 'objective-result--warning'}`}>
        <div className="objective-result-icon">
          {viewModel.isAchievable ? <CheckCircle size={28} /> : <AlertTriangle size={28} />}
        </div>
        <div className="objective-result-content">
          <div className="objective-result-title">
            {viewModel.isAchievable ? 'Objectif atteignable !' : 'Objectif non atteint à horizon'}
          </div>
          <div className="objective-result-desc">
            {viewModel.isAchievable
              ? `Votre patrimoine projeté de ${m(viewModel.projectedValue)} dépasse l'objectif de ${m(viewModel.targetAmount)} en ${viewModel.yearsToTargetLabel}.`
              : `Patrimoine projeté : ${m(viewModel.projectedValue)}. Il manque ${m(viewModel.gap)} pour atteindre ${m(viewModel.targetAmount)}.`
            }
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="objective-progress-section">
        <div className="objective-progress-header">
          <span>Progression vers l'objectif</span>
          <span className="objective-progress-pct">{viewModel.progressPct.toFixed(0)}%</span>
        </div>
        <div className="objective-progress-bar">
          <div
            className="objective-progress-fill"
            style={{
              width: `${Math.min(viewModel.progressPct, 100)}%`,
              background: viewModel.isAchievable ? 'var(--success)' : 'var(--warning)',
            }}
          />
        </div>
        <div className="objective-progress-labels">
          <span>Aujourd'hui</span>
          <span>{m(viewModel.targetAmount)}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="projection-kpis">
        <div className="projection-kpi">
          <span className="projection-kpi-label">Patrimoine projeté</span>
          <span className="projection-kpi-value" style={{ color: 'var(--accent)' }}>{m(viewModel.projectedValue)}</span>
          <span className="projection-kpi-sub">à {horizonYears} ans</span>
        </div>
        <div className="projection-kpi">
          <span className="projection-kpi-label">Date estimée</span>
          <span className="projection-kpi-value" style={{ color: 'var(--success)' }}>{viewModel.yearsToTargetLabel}</span>
          <span className="projection-kpi-sub">pour atteindre l'objectif</span>
        </div>
        <div className="projection-kpi">
          <span className="projection-kpi-label">Effort mensuel requis</span>
          <span className="projection-kpi-value" style={{ color: 'var(--warning)' }}>{m(viewModel.requiredContribution)}</span>
          <span className="projection-kpi-sub">à {viewModel.annualReturn}/an sur {horizonYears} ans</span>
        </div>
        <div className="projection-kpi">
          <span className="projection-kpi-label">Effort supplémentaire</span>
          <span className="projection-kpi-value" style={{ color: '#8b5cf6' }}>{m(viewModel.extraEffort)}</span>
          <span className="projection-kpi-sub">au-delà de votre versement actuel</span>
        </div>
      </div>

      {/* Chart */}
      <div className="projection-chart-card">
        <div className="projection-chart-title">Trajectoire vs Objectif</div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={viewModel.chartData}>
            <defs>
              <linearGradient id="objGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={viewModel.isAchievable ? 'var(--success)' : 'var(--warning)'} stopOpacity={0.2} />
                <stop offset="100%" stopColor={viewModel.isAchievable ? 'var(--success)' : 'var(--warning)'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v, name) => [m(fmt(v)), name === 'value' ? 'Patrimoine projeté' : 'Objectif']}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: '0.82rem' }}
            />
            <ReferenceLine y={viewModel.targetRaw} stroke="var(--danger)" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: 'Objectif', fill: 'var(--danger)', fontSize: 11 }} />
            <Area type="monotone" dataKey="value" stroke={viewModel.isAchievable ? 'var(--success)' : 'var(--warning)'} strokeWidth={2.5} fill="url(#objGrad)" name="value" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="projection-chart-legend">
          <span><span className="projection-dot" style={{ background: viewModel.isAchievable ? 'var(--success)' : 'var(--warning)' }} /> Patrimoine projeté</span>
          <span><span className="projection-dot projection-dot--dashed" style={{ background: 'var(--danger)' }} /> Objectif</span>
        </div>
      </div>

      {/* Hypotheses */}
      <div className="projection-hypotheses">
        <Info size={14} style={{ color: 'var(--text-muted)', minWidth: 14 }} />
        <p>
          Croissance estimée : {(selectedProfile.returnRate * 100)}% / an ({selectedProfile.label}).
          Inflation : {inflation}%/an.
          Ces projections sont indicatives et ne constituent pas un conseil financier.
        </p>
      </div>
      <div className="projection-hypotheses" style={{ borderColor: 'var(--warning)' }}>
        <AlertTriangle size={14} style={{ color: 'var(--warning)', minWidth: 14 }} />
        <p>
          Les performances passées ne préjugent pas des performances futures.
          Les actifs volatils (crypto, actions) peuvent perdre une part significative de leur valeur.
          Ces projections sont des estimations à titre indicatif uniquement.
        </p>
      </div>
    </div>
  )
}
