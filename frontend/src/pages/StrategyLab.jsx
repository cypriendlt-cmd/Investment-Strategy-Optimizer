import { Link } from 'react-router-dom'
import { TrendingUp, Layers, GitBranch, Target, ArrowRight, Lock } from 'lucide-react'

const MODULES = [
  {
    id: 'projection',
    icon: TrendingUp,
    title: 'Projection globale',
    description: 'Visualisez la trajectoire de votre patrimoine sur 10 à 30 ans selon vos hypothèses de rendement et d\'effort d\'épargne.',
    status: 'active',
    color: 'var(--accent)',
    colorLight: 'var(--accent-light)',
  },
  {
    id: 'envelopes',
    icon: Layers,
    title: 'Projection par enveloppe',
    description: 'Analysez la contribution de chaque classe d\'actifs à votre croissance patrimoniale future.',
    status: 'coming',
    color: 'var(--success)',
    colorLight: 'var(--success-light)',
  },
  {
    id: 'scenarios',
    icon: GitBranch,
    title: 'Comparateur de scénarios',
    description: 'Comparez jusqu\'à 3 scénarios : actuel, optimisé et ambitieux. Identifiez la stratégie la plus efficace.',
    status: 'coming',
    color: '#8b5cf6',
    colorLight: 'rgba(139, 92, 246, 0.12)',
  },
  {
    id: 'objective',
    icon: Target,
    title: 'Objectif financier',
    description: 'Définissez un objectif patrimonial, calculez l\'écart restant et découvrez le chemin optimal pour l\'atteindre.',
    status: 'active',
    color: 'var(--warning)',
    colorLight: 'var(--warning-light)',
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
