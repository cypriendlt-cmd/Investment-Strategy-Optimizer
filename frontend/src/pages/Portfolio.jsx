import { Link } from 'react-router-dom'
import { Bitcoin, TrendingUp, PiggyBank, Rocket, Target, Landmark, Calculator, ArrowRight } from 'lucide-react'
import { usePortfolio } from '../context/PortfolioContext'
import { useBank } from '../context/BankContext'
import { usePrivacyMask } from '../hooks/usePrivacyMask'

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const SECTIONS = [
  { path: '/portfolio/crypto', icon: Bitcoin, label: 'Crypto', color: '#3b82f6', colorLight: 'rgba(59, 130, 246, 0.12)', key: 'crypto' },
  { path: '/portfolio/pea', icon: TrendingUp, label: 'PEA', color: '#10b981', colorLight: 'rgba(16, 185, 129, 0.12)', key: 'pea' },
  { path: '/portfolio/livrets', icon: PiggyBank, label: 'Livrets', color: '#f59e0b', colorLight: 'rgba(245, 158, 11, 0.12)', key: 'livrets' },
  { path: '/portfolio/fundraising', icon: Rocket, label: 'Levées de fonds', color: '#8b5cf6', colorLight: 'rgba(139, 92, 246, 0.12)', key: 'fundraising' },
  { path: '/portfolio/objectives', icon: Target, label: 'Objectifs', color: '#06b6d4', colorLight: 'rgba(6, 182, 212, 0.12)', key: null },
  { path: '/portfolio/banking', icon: Landmark, label: 'Banque & Cash', color: '#64748b', colorLight: 'rgba(100, 116, 139, 0.12)', key: null },
  { path: '/portfolio/dca', icon: Calculator, label: 'DCA', color: '#ec4899', colorLight: 'rgba(236, 72, 153, 0.12)', key: null },
]

export default function Portfolio() {
  const { totals, portfolio } = usePortfolio()
  const { accountBalances } = useBank() || {}
  const { m } = usePrivacyMask()

  const bankLivrets = (accountBalances || []).filter(a => a.type !== 'courant').reduce((s, a) => s + a.balance, 0)
  const bankTotal = (accountBalances || []).filter(a => a.type === 'courant').reduce((s, a) => s + a.balance, 0)
  const patrimoineTotal = totals.total + bankLivrets + bankTotal

  const getValue = (key) => {
    if (!key) return null
    if (key === 'livrets') return totals.livrets + bankLivrets
    return totals[key] || 0
  }

  const getCount = (key) => {
    if (!key || !portfolio[key]) return null
    return portfolio[key].length
  }

  return (
    <div className="portfolio-hub">
      <div className="portfolio-hub-header">
        <div>
          <h1 className="portfolio-hub-title">Patrimoine</h1>
          <p className="portfolio-hub-subtitle">
            Vue d'ensemble de vos actifs et positions. Base de données de votre stratégie.
          </p>
        </div>
        <div className="portfolio-hub-total">
          <span className="portfolio-hub-total-label">Patrimoine total</span>
          <span className="portfolio-hub-total-value">{m(fmt(patrimoineTotal))}</span>
        </div>
      </div>

      <div className="portfolio-hub-grid">
        {SECTIONS.map(({ path, icon: Icon, label, color, colorLight, key }) => {
          const value = getValue(key)
          const count = getCount(key)
          const pct = value && patrimoineTotal > 0 ? ((value / patrimoineTotal) * 100).toFixed(1) : null
          return (
            <Link key={path} to={path} className="portfolio-hub-card">
              <div className="portfolio-hub-card-icon" style={{ background: colorLight, color }}>
                <Icon size={20} />
              </div>
              <div className="portfolio-hub-card-content">
                <span className="portfolio-hub-card-label">{label}</span>
                {value != null ? (
                  <>
                    <span className="portfolio-hub-card-value">{m(fmt(value))}</span>
                    <span className="portfolio-hub-card-meta">
                      {pct && `${pct}%`}{count != null && ` · ${count} position${count > 1 ? 's' : ''}`}
                    </span>
                  </>
                ) : (
                  <span className="portfolio-hub-card-meta">Gérer →</span>
                )}
              </div>
              <ArrowRight size={16} className="portfolio-hub-card-arrow" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
