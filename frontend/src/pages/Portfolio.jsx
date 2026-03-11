import { Link } from 'react-router-dom'
import { Bitcoin, TrendingUp, PiggyBank, Rocket, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { usePortfolio } from '../context/PortfolioContext'
import { useBank } from '../context/BankContext'
import { usePrivacyMask } from '../hooks/usePrivacyMask'

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const SECTIONS = [
  { path: '/portfolio/crypto', icon: Bitcoin, label: 'Crypto', description: 'Mes cryptomonnaies', color: '#3b82f6', colorLight: 'rgba(59, 130, 246, 0.1)', key: 'crypto' },
  { path: '/portfolio/pea', icon: TrendingUp, label: 'PEA / Actions', description: 'Mon portefeuille actions', color: '#10b981', colorLight: 'rgba(16, 185, 129, 0.1)', key: 'pea' },
  { path: '/portfolio/livrets', icon: PiggyBank, label: 'Livrets', description: 'Mes livrets d\'épargne', color: '#f59e0b', colorLight: 'rgba(245, 158, 11, 0.1)', key: 'livrets' },
  { path: '/portfolio/fundraising', icon: Rocket, label: 'Crowdfunding', description: 'Mes levées de fonds', color: '#8b5cf6', colorLight: 'rgba(139, 92, 246, 0.1)', key: 'fundraising' },
]

export default function Portfolio() {
  const { totals, portfolio } = usePortfolio()
  const { accountBalances } = useBank() || {}
  const { m } = usePrivacyMask()

  const bankLivrets = (accountBalances || []).filter(a => a.type !== 'courant').reduce((s, a) => s + a.balance, 0)
  const bankTotal = (accountBalances || []).filter(a => a.type === 'courant').reduce((s, a) => s + a.balance, 0)
  const patrimoineTotal = totals.total + bankLivrets + bankTotal

  const totalInvested = [
    ...portfolio.crypto.map(c => c.buyPrice * c.quantity),
    ...portfolio.pea.map(p => p.buyPrice * p.quantity),
  ].reduce((a, b) => a + b, 0)
  const totalGain = totals.crypto + totals.pea - totalInvested
  const gainPct = totalInvested > 0 ? (totalGain / totalInvested * 100) : 0

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
          <h1 className="portfolio-hub-title">Analyse du patrimoine</h1>
          <p className="portfolio-hub-subtitle">
            Vue complète de vos actifs, positions et placements.
          </p>
        </div>
        <div className="portfolio-hub-total">
          <span className="portfolio-hub-total-label">Patrimoine total</span>
          <span className="portfolio-hub-total-value">{m(fmt(patrimoineTotal))}</span>
          <span className={`portfolio-hub-total-gain ${totalGain >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalGain >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {m(fmt(totalGain))} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)
          </span>
        </div>
      </div>

      <div className="portfolio-hub-grid">
        {SECTIONS.map(({ path, icon: Icon, label, description, color, colorLight, key }) => {
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
                <span className="portfolio-hub-card-description">{description}</span>
                {value != null ? (
                  <>
                    <span className="portfolio-hub-card-value">{m(fmt(value))}</span>
                    <span className="portfolio-hub-card-meta">
                      {pct && `${pct}% du patrimoine`}{count != null && ` · ${count} position${count > 1 ? 's' : ''}`}
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
