import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Sun, Moon, Bell, Search, Check, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { usePrivacy } from '../context/PrivacyContext'
import { usePortfolio } from '../context/PortfolioContext'
import { getDueNotifications, markNotificationDone } from '../services/notifications'

const PAGE_TITLES = {
  '/': 'Tableau de bord',
  '/strategy': 'Laboratoire Stratégique',
  '/strategy/projection': 'Projection globale',
  '/strategy/objective': 'Objectif financier',
  '/strategy/objectifs': 'Vos objectifs',
  '/strategy/fire': 'Liberté financière',
  '/strategy/scenarios': 'Scénarios',
  '/portfolio': 'Analyse du portefeuille',
  '/portfolio/crypto': 'Crypto',
  '/portfolio/pea': 'PEA / Actions',
  '/portfolio/livrets': 'Livrets',
  '/portfolio/fundraising': 'Crowdfunding',
  '/portfolio/objectives': 'Objectifs financiers',
  '/portfolio/banking': 'Trésorerie & Banque',
  '/portfolio/dca': 'Plans DCA',
  '/insights': 'Analyses IA',
  '/settings': 'Paramètres',
}

const PAGE_DESCRIPTIONS = {
  '/': 'Votre cockpit stratégique pour piloter votre patrimoine',
  '/strategy': 'Projections, scénarios et optimisation de votre stratégie',
  '/portfolio': 'Vue d\'ensemble de vos actifs et positions',
  '/portfolio/crypto': 'Vos positions en cryptomonnaies',
  '/portfolio/pea': 'Votre portefeuille d\'actions et ETF',
  '/portfolio/livrets': 'Vos comptes d\'épargne réglementés',
  '/portfolio/objectives': 'Suivez la progression de vos objectifs financiers',
  '/portfolio/banking': 'Comptes bancaires et flux de trésorerie',
  '/portfolio/dca': 'Plans d\'investissement programmé (DCA)',
  '/insights': 'Analyses et recommandations alimentées par l\'IA',
  '/settings': 'Préférences et intégrations',
}

export default function Header({ onMenuClick }) {
  const { darkMode, toggleDarkMode } = useTheme()
  const { hideValues, toggleHideValues } = usePrivacy()
  const { pricesLastUpdated, isRefreshingPrices, manualRefreshRef } = usePortfolio()
  const location = useLocation()
  const [dueNotifs, setDueNotifs] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  const title = PAGE_TITLES[location.pathname] || 'Optimiseur de Stratégie'
  const description = PAGE_DESCRIPTIONS[location.pathname] || null

  useEffect(() => {
    const check = () => setDueNotifs(getDueNotifications())
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleMarkDone = (id) => {
    markNotificationDone(id)
    setDueNotifs(getDueNotifications())
  }

  const handleRefreshPrices = () => {
    if (manualRefreshRef?.current) manualRefreshRef.current()
  }

  const formatLastUpdate = () => {
    if (!pricesLastUpdated) return null
    const diff = Math.round((Date.now() - pricesLastUpdated.getTime()) / 60000)
    if (diff < 1) return 'À l\'instant'
    if (diff < 60) return `il y a ${diff} min`
    return pricesLastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="header-menu-btn" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <div className="header-title-group">
          <h1 className="header-title">{title}</h1>
          {description && <span className="header-description">{description}</span>}
        </div>
      </div>

      <div className="topbar-right">
        {/* Indicateur de données en direct */}
        <div className="header-live-indicator" title={formatLastUpdate() || 'Prix non chargés'}>
          <button
            className={`btn-icon header-refresh-btn ${isRefreshingPrices ? 'spinning' : ''}`}
            onClick={handleRefreshPrices}
            disabled={isRefreshingPrices}
            title="Rafraîchir les prix"
          >
            <RefreshCw size={16} />
          </button>
          {pricesLastUpdated && (
            <span className="header-live-dot" />
          )}
        </div>

        {/* Notifications */}
        <div className="header-notif-wrapper" ref={notifRef}>
          <button
            className="btn-icon"
            title="Notifications"
            onClick={() => setNotifOpen(!notifOpen)}
          >
            <Bell size={17} />
            {dueNotifs.length > 0 && (
              <span className="header-notif-badge">{dueNotifs.length}</span>
            )}
          </button>

          {notifOpen && (
            <div className="header-notif-dropdown">
              <div className="header-notif-dropdown-title">Rappels DCA</div>
              <div className="header-notif-dropdown-list">
                {dueNotifs.length === 0 ? (
                  <div className="header-notif-empty">Aucun rappel en attente</div>
                ) : (
                  dueNotifs.map(n => (
                    <div key={n.id} className="header-notif-dropdown-item">
                      <div className="header-notif-dropdown-text">
                        Investir {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n.monthlyAmount)} dans {n.assetName}
                        <span>Rappel DCA {n.nextReminder}</span>
                      </div>
                      <button className="header-notif-done-btn" onClick={() => handleMarkDone(n.id)}>
                        <Check size={12} /> Fait
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Confidentialité */}
        <button className="btn-icon" onClick={toggleHideValues} title={hideValues ? 'Afficher les montants' : 'Masquer les montants'}>
          {hideValues ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>

        {/* Mode sombre */}
        <button className="btn-icon" onClick={toggleDarkMode} title={darkMode ? 'Mode clair' : 'Mode sombre'}>
          {darkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  )
}
