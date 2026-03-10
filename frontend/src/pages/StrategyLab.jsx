import { Link } from 'react-router-dom'
import { TrendingUp, Layers, GitBranch, Target, Crosshair, ArrowRight, Lock, Sunrise, Sparkles } from 'lucide-react'

const MODULES = [
  {
    id: 'projection',
    icon: TrendingUp,
    title: 'Global Projection',
    description: 'Model how your portfolio could grow over 10-30 years based on your current strategy. This is a simulation, not a guarantee.',
    status: 'active',
    color: 'var(--accent)',
    colorLight: 'var(--accent-light)',
  },
  {
    id: 'objective',
    icon: Target,
    title: 'Financial Target',
    description: 'Set a target amount and discover if your current strategy can reach it, and how long it would take.',
    status: 'active',
    color: 'var(--warning)',
    colorLight: 'var(--warning-light)',
  },
  {
    id: 'objectifs',
    icon: Crosshair,
    title: 'Your Goals',
    description: 'Every euro you save can serve a specific purpose. Link your accounts to your projects for better control.',
    status: 'active',
    color: 'var(--success)',
    colorLight: 'var(--success-light)',
  },
  {
    id: 'fire',
    icon: Sunrise,
    title: 'Financial Freedom',
    description: 'Calculate your Freedom Number and estimate when you could live off passive income using the 4% rule.',
    status: 'active',
    color: '#f59e0b',
    colorLight: 'rgba(245, 158, 11, 0.12)',
  },
  {
    id: 'scenarios',
    icon: GitBranch,
    title: 'Scenario Comparison',
    description: 'Compare 3 investment strategies and see which one gets you to your goal fastest.',
    status: 'active',
    color: 'var(--danger)',
    colorLight: 'rgba(239, 68, 68, 0.12)',
  },
  {
    id: 'envelopes',
    icon: Layers,
    title: 'Account-Type Projection',
    description: 'Analyze how each account type contributes to your overall wealth growth over time.',
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
            <Sparkles size={14} /> Strategy Optimization
          </div>
          <h1 className="strategy-lab-title">Strategy Lab</h1>
          <p className="strategy-lab-subtitle">
            Your strategic laboratory. Project, compare and optimize your wealth trajectory with data-driven tools.
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
                  Coming Soon
                </span>
              )}
            </div>
            <h3 className="strategy-lab-card-title">{title}</h3>
            <p className="strategy-lab-card-desc">{description}</p>
            <div className="strategy-lab-card-footer">
              {status === 'coming' ? (
                <span className="strategy-lab-card-cta strategy-lab-card-cta--disabled">
                  Available soon
                </span>
              ) : (
                <Link to={`/strategy/${id}`} className="strategy-lab-card-cta">
                  Open <ArrowRight size={14} />
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
          <h4>How does Strategy Lab work?</h4>
          <p>
            Strategy Lab uses your real portfolio data as a starting point,
            then applies projection engines to simulate wealth evolution
            under different assumptions. Each module lets you explore a specific
            aspect of your investment strategy.
          </p>
        </div>
      </div>
    </div>
  )
}
