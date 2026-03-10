import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Sun, Moon, Bell, Search, Check, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { usePrivacy } from '../context/PrivacyContext'
import { usePortfolio } from '../context/PortfolioContext'
import { getDueNotifications, markNotificationDone } from '../services/notifications'

const PAGE_TITLES = {
  '/': 'Strategy Dashboard',
  '/strategy': 'Strategy Lab',
  '/strategy/projection': 'Projection globale',
  '/strategy/objective': 'Objectif financier',
  '/strategy/objectifs': 'Vos objectifs',
  '/strategy/fire': 'Liberte financiere',
  '/strategy/scenarios': 'Scenarios',
  '/portfolio': 'Portfolio Analysis',
  '/portfolio/crypto': 'Crypto',
  '/portfolio/pea': 'PEA / Actions',
  '/portfolio/livrets': 'Livrets',
  '/portfolio/fundraising': 'Crowdfunding',
  '/portfolio/objectives': 'Financial Goals',
  '/portfolio/banking': 'Cash & Banking',
  '/portfolio/dca': 'DCA Plans',
  '/insights': 'AI Strategy Insights',
  '/settings': 'Settings',
}

const PAGE_DESCRIPTIONS = {
  '/': 'Your strategic command center',
  '/strategy': 'Projections, scenarios & optimization',
  '/portfolio': 'Asset overview & positions',
  '/portfolio/crypto': 'Cryptocurrency positions',
  '/portfolio/pea': 'Equity portfolio',
  '/portfolio/livrets': 'Savings accounts',
  '/portfolio/objectives': 'Track your financial goals',
  '/portfolio/banking': 'Bank accounts & cash flow',
  '/portfolio/dca': 'Dollar cost averaging plans',
  '/insights': 'AI-powered analysis & recommendations',
  '/settings': 'Preferences & integrations',
}

export default function Header({ onMenuClick }) {
  const { darkMode, toggleDarkMode } = useTheme()
  const { hideValues, toggleHideValues } = usePrivacy()
  const { pricesLastUpdated, isRefreshingPrices, manualRefreshRef } = usePortfolio()
  const location = useLocation()
  const [dueNotifs, setDueNotifs] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  const title = PAGE_TITLES[location.pathname] || 'Strategy Optimizer'
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
    if (diff < 1) return 'Just now'
    if (diff < 60) return `${diff}m ago`
    return pricesLastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-menu-btn" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <div className="header-title-group">
          <h1 className="header-title">{title}</h1>
          {description && <span className="header-description">{description}</span>}
        </div>
      </div>

      <div className="header-right">
        {/* Live data indicator */}
        <div className="header-live-indicator" title={formatLastUpdate() || 'Prices not loaded'}>
          <button
            className={`header-icon-btn header-refresh-btn ${isRefreshingPrices ? 'spinning' : ''}`}
            onClick={handleRefreshPrices}
            disabled={isRefreshingPrices}
            title="Refresh prices"
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
            className="header-icon-btn"
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
              <div className="header-notif-dropdown-title">DCA Reminders</div>
              <div className="header-notif-dropdown-list">
                {dueNotifs.length === 0 ? (
                  <div className="header-notif-empty">No pending reminders</div>
                ) : (
                  dueNotifs.map(n => (
                    <div key={n.id} className="header-notif-dropdown-item">
                      <div className="header-notif-dropdown-text">
                        Invest {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n.monthlyAmount)} in {n.assetName}
                        <span>DCA reminder {n.nextReminder}</span>
                      </div>
                      <button className="header-notif-done-btn" onClick={() => handleMarkDone(n.id)}>
                        <Check size={12} /> Done
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Privacy toggle */}
        <button className="header-icon-btn" onClick={toggleHideValues} title={hideValues ? 'Show values' : 'Hide values'}>
          {hideValues ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>

        {/* Theme toggle */}
        <button className="header-icon-btn" onClick={toggleDarkMode} title={darkMode ? 'Light mode' : 'Dark mode'}>
          {darkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  )
}
