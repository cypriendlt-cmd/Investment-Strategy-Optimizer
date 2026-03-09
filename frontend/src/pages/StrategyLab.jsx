import { Link } from 'react-router-dom'
import { TrendingUp, Layers, GitBranch, Target, Crosshair, ArrowRight, Lock, Sunrise } from 'lucide-react'

const MODULES = [
  {
    id: 'projection',
    icon: TrendingUp,
    title: 'Projection globale',
    description: 'Cette simulation montre comment votre patrimoine pourrait évoluer si vous continuez à épargner au même rythme. C\'est une estimation, pas une garantie.',
    status: 'active',
    color: 'var(--accent)',
    colorLight: 'var(--accent-light)',
  },
  {
    id: 'objective',
    icon: Target,
    title: 'Objectif financier',
    description: 'Définissez une cible (par exemple 100 000 €) et découvrez si votre stratégie actuelle vous permet de l\'atteindre, et en combien de temps.',
    status: 'active',
    color: 'var(--warning)',
    colorLight: 'var(--warning-light)',
  },
  {
    id: 'objectifs',
    icon: Crosshair,
    title: 'Vos objectifs',
    description: 'Chaque euro que vous épargnez peut servir un but précis. Associez vos comptes à vos projets pour mieux piloter votre avenir.',
    status: 'active',
    color: 'var(--success)',
    colorLight: 'var(--success-light)',
  },
  {
    id: 'fire',
    icon: Sunrise,
    title: 'Liberté financière',
    description: 'Calculez votre "Freedom Number" et estimez quand vous pourrez vivre de vos revenus passifs selon la règle des 4 %.',
    status: 'active',
    color: '#f59e0b',
    colorLight: 'rgba(245, 158, 11, 0.12)',
  },
  {
    id: 'scenarios',
    icon: GitBranch,
    title: 'Comparateur de scénarios',
    description: 'Comparez 3 stratégies d\'investissement et voyez laquelle vous rapproche le plus vite de votre objectif.',
    status: 'active',
    color: 'var(--danger)',
    colorLight: 'rgba(239, 68, 68, 0.12)',
  },
  {
    id: 'envelopes',
    icon: Layers,
    title: 'Projection par type de compte',
    description: 'Analysez la contribution de chaque type de compte à la croissance de votre argent.',
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
          <h1 className="strategy-lab-title">Strategy Lab</h1>
          <p className="strategy-lab-subtitle">
            Votre laboratoire stratégique. Projetez, comparez et optimisez votre trajectoire patrimoniale.
          </p>
        </div>
      </div>

      <div className="strategy-lab-grid">
        {MODULES.map(({ id, icon: Icon, title, description, status, color, colorLight }) => (
          <div key={id} className="strategy-lab-card">
            <div className="strategy-lab-card-header">
              <div className="strategy-lab-card-icon" style={{ background: colorLight, color }}>
                <Icon size={22} />
              </div>
              {status === 'coming' && (
                <span className="strategy-lab-badge">
                  <Lock size={10} />
                  Bientôt
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
                  Accéder <ArrowRight size={14} />
                </Link>
              )}
            </div>

            {/* Placeholder zone for future chart/preview */}
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
          <h4>Comment fonctionne le Strategy Lab ?</h4>
          <p>
            Le Strategy Lab utilise vos données patrimoniales réelles comme point de départ,
            puis applique des moteurs de projection pour simuler l'évolution de votre patrimoine
            selon différentes hypothèses. Chaque module vous permet d'explorer un aspect
            spécifique de votre stratégie d'investissement.
          </p>
        </div>
      </div>
    </div>
  )
}
