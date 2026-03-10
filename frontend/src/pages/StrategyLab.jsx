import { Link } from 'react-router-dom'
import { TrendingUp, Layers, GitBranch, Target, Crosshair, ArrowRight, Lock, Sunrise, Sparkles } from 'lucide-react'

const MODULES = [
  {
    id: 'projection',
    icon: TrendingUp,
    title: 'Projection globale',
    description: 'Simulez l\'évolution de votre patrimoine sur 10 à 30 ans. C\'est une estimation, pas une garantie.',
    status: 'active',
    color: 'var(--accent)',
    colorLight: 'var(--accent-light)',
  },
  {
    id: 'objective',
    icon: Target,
    title: 'Objectif patrimonial',
    description: 'Fixez un montant cible et découvrez si votre stratégie actuelle peut l\'atteindre.',
    status: 'active',
    color: 'var(--warning)',
    colorLight: 'var(--warning-light)',
  },
  {
    id: 'objectifs',
    icon: Crosshair,
    title: 'Mes objectifs',
    description: 'Chaque euro épargné peut servir un projet précis. Reliez vos comptes à vos objectifs.',
    status: 'active',
    color: 'var(--success)',
    colorLight: 'var(--success-light)',
  },
  {
    id: 'fire',
    icon: Sunrise,
    title: 'Indépendance financière',
    description: 'Calculez votre nombre de liberté et estimez quand vous pourriez vivre de vos revenus passifs (règle des 4 %).',
    status: 'active',
    color: '#f59e0b',
    colorLight: 'rgba(245, 158, 11, 0.12)',
  },
  {
    id: 'scenarios',
    icon: GitBranch,
    title: 'Comparaison de scénarios',
    description: 'Comparez 3 stratégies et voyez laquelle vous rapproche le plus vite de votre objectif.',
    status: 'active',
    color: 'var(--danger)',
    colorLight: 'rgba(239, 68, 68, 0.12)',
  },
  {
    id: 'envelopes',
    icon: Layers,
    title: 'Projection par enveloppe',
    description: 'Analysez comment chaque type de compte contribue à votre patrimoine.',
    status: 'coming',
    color: '#8b5cf6',
    colorLight: 'rgba(139, 92, 246, 0.12)',
  },
]

export default function StrategyLab() {
  return (
    <div className="strategy-lab">
      <div className="strategy-lab-hero">
        <div className="strategy-lab-hero-content">
          <div className="strategy-lab-hero-badge">
            <Sparkles size={14} /> Optimisation stratégique
          </div>
          <h1 className="strategy-lab-title">Labo Stratégie</h1>
          <p className="strategy-lab-subtitle">
            Votre laboratoire stratégique. Projetez, comparez et optimisez la trajectoire de votre patrimoine.
          </p>
        </div>
      </div>

      <div className="strategy-lab-grid">
        {MODULES.map(({ id, icon: Icon, title, description, status, color, colorLight }) => (
          <div key={id} className={`strategy-lab-card ${status === 'coming' ? 'strategy-lab-card--disabled' : ''}`}>
            <div className="strategy-lab-card-header">
              <div className="strategy-lab-card-icon" style={{ background: colorLight, color }}>
                <Icon size={22} />
              </div>
              {status === 'coming' && (
                <span className="strategy-lab-badge">
                  <Lock size={10} />
                  Bientôt disponible
                </span>
              )}
            </div>
            <h3 className="strategy-lab-card-title">{title}</h3>
            <p className="strategy-lab-card-desc">{description}</p>
            <div className="strategy-lab-card-footer">
              {status === 'coming' ? (
                <span className="strategy-lab-card-cta strategy-lab-card-cta--disabled">
                  Disponible prochainement
                </span>
              ) : (
                <Link to={`/strategy/${id}`} className="strategy-lab-card-cta">
                  Ouvrir <ArrowRight size={14} />
                </Link>
              )}
            </div>

            <div className="strategy-lab-card-preview">
              <div className="strategy-lab-card-preview-placeholder">
                <Icon size={32} strokeWidth={1} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="strategy-lab-info">
        <div className="strategy-lab-info-icon">
          <TrendingUp size={18} />
        </div>
        <div>
          <h4>Comment fonctionne le Labo Stratégie ?</h4>
          <p>
            Le Labo Stratégie utilise les données réelles de votre patrimoine comme point de départ,
            puis applique des moteurs de projection pour simuler l'évolution de votre richesse
            selon différentes hypothèses. Chaque module vous permet d'explorer un aspect précis
            de votre stratégie d'investissement.
          </p>
        </div>
      </div>
    </div>
  )
}
