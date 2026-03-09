import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, Landmark, Target, Brain, Settings,
  ChevronLeft, ChevronRight, ChevronDown, X,
  Bitcoin, LineChart, PiggyBank, Rocket, Calculator,
  FlaskConical, Crosshair, GitBranch, Flame, ArrowUpRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const NAV_ITEMS = [
  {
    id: 'dashboard',
    path: '/',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    id: 'portfolio',
    path: '/portfolio',
    icon: TrendingUp,
    label: 'Portefeuille',
    children: [
      { path: '/portfolio', label: 'Vue globale', exact: true },
      { path: '/portfolio/crypto', label: 'Crypto', icon: Bitcoin },
      { path: '/portfolio/pea', label: 'PEA / Actions', icon: LineChart },
      { path: '/portfolio/livrets', label: 'Livrets', icon: PiggyBank },
      { path: '/portfolio/fundraising', label: 'Crowdfunding', icon: Rocket },
      { path: '/portfolio/dca', label: 'DCA', icon: Calculator },
    ],
  },
  {
    id: 'banking',
    path: '/portfolio/banking',
    icon: Landmark,
    label: 'Banque & Cash',
  },
  {
    id: 'strategy',
    path: '/strategy',
    icon: Target,
    label: 'Stratégie',
    children: [
      { path: '/portfolio/objectives', label: 'Objectifs', icon: Crosshair, exact: true },
      { path: '/strategy', label: 'Strategy Lab', icon: FlaskConical, exact: true },
      { path: '/strategy/projection', label: 'Projection', icon: ArrowUpRight },
      { path: '/strategy/fire', label: 'Liberté FIRE', icon: Flame },
      { path: '/strategy/scenarios', label: 'Scénarios', icon: GitBranch },
    ],
  },
  {
    id: 'insights',
    path: '/insights',
    icon: Brain,
    label: 'Insights IA',
  },
  {
    id: 'settings',
    path: '/settings',
    icon: Settings,
    label: 'Paramètres',
  },
]

const themeColors = {
  crimson: '#dc2626',
  ocean: '#2563eb',
  slate: '#64748b',
  amethyst: '#8b5cf6',
  teal: '#06b6d4',
}

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false)
  const [openSections, setOpenSections] = useState({})
  const { user } = useAuth()
  const { theme } = useTheme()
  const location = useLocation()

  const accent = themeColors[theme] || themeColors.crimson

  const isChildActive = (children) => {
    if (!children) return false
    return children.some(c =>
      c.exact ? location.pathname === c.path : location.pathname.startsWith(c.path)
    )
  }

  const toggleSection = (id) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const isSectionOpen = (item) => {
    if (openSections[item.id] !== undefined) return openSections[item.id]
    return isChildActive(item.children)
  }

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-mobile-overlay" onClick={onMobileClose} />
      )}
      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>
        <div className="sidebar-header">
          {!collapsed && (
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon" style={{ background: accent }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <span className="sidebar-logo-text">Strategy</span>
            </div>
          )}
          {collapsed && (
            <div className="sidebar-logo-icon" style={{ background: accent, margin: '0 auto' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
          )}
          <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button className="sidebar-mobile-close" onClick={onMobileClose}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const { id, path, icon: Icon, label, children } = item
            const hasChildren = children && children.length > 0
            const childActive = isChildActive(children)
            const isOpen = isSectionOpen(item)

            if (hasChildren) {
              return (
                <div key={id} className="sidebar-group">
                  <button
                    className={`sidebar-link ${childActive ? 'sidebar-link--active' : ''}`}
                    onClick={() => {
                      if (collapsed) {
                        setCollapsed(false)
                        setOpenSections(prev => ({ ...prev, [id]: true }))
                      } else {
                        toggleSection(id)
                      }
                    }}
                  >
                    <Icon size={19} />
                    {!collapsed && (
                      <>
                        <span className="sidebar-link-text">{label}</span>
                        <ChevronDown
                          size={14}
                          className={`sidebar-chevron ${isOpen ? 'sidebar-chevron--open' : ''}`}
                        />
                      </>
                    )}
                  </button>
                  {!collapsed && isOpen && (
                    <div className="sidebar-sub">
                      {children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          end={child.exact}
                          className={({ isActive }) =>
                            `sidebar-sub-link ${isActive ? 'sidebar-sub-link--active' : ''}`
                          }
                          onClick={onMobileClose}
                        >
                          {child.icon && <child.icon size={14} />}
                          <span>{child.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <NavLink
                key={id}
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
                }
                onClick={onMobileClose}
              >
                <Icon size={19} />
                {!collapsed && <span className="sidebar-link-text">{label}</span>}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-theme-dot" style={{ background: accent }} title={theme} />
          {!collapsed && user && (
            <div className="sidebar-user">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="sidebar-avatar" />
              ) : (
                <div className="sidebar-avatar sidebar-avatar--placeholder">
                  {(user.name || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user.name || 'Utilisateur'}</span>
                <span className="sidebar-user-email">{user.email}</span>
              </div>
            </div>
          )}
          {!collapsed && !user && (
            <div className="sidebar-user">
              <div className="sidebar-avatar sidebar-avatar--placeholder">D</div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">Mode Démo</span>
                <span className="sidebar-user-email">Non connecté</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
