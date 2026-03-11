import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, Landmark, Target, Brain, Settings,
  ChevronLeft, ChevronRight, ChevronDown, X,
  Bitcoin, LineChart, PiggyBank, Rocket, Calculator,
  FlaskConical, Crosshair, GitBranch, Flame, ArrowUpRight, Compass,
  HelpCircle, Sparkles
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import stratifyIcon from '../assets/icon.svg'

const NAV_GROUPS = [
  {
    sectionLabel: 'Menu principal',
    items: [
      {
        id: 'dashboard',
        path: '/',
        icon: LayoutDashboard,
        label: 'Tableau de bord',
        shortLabel: 'Tableau de bord',
      },
      {
        id: 'portfolio',
        path: '/portfolio',
        icon: TrendingUp,
        label: 'Patrimoine',
        shortLabel: 'Patrimoine',
        children: [
          { path: '/portfolio', label: 'Vue globale', exact: true },
          { path: '/portfolio/crypto', label: 'Crypto', icon: Bitcoin },
          { path: '/portfolio/pea', label: 'PEA / Actions', icon: LineChart },
          { path: '/portfolio/livrets', label: 'Livrets', icon: PiggyBank },
          { path: '/portfolio/fundraising', label: 'Crowdfunding', icon: Rocket },
          { path: '/portfolio/dca', label: 'Invest. programmé', icon: Calculator },
        ],
      },
      {
        id: 'banking',
        path: '/portfolio/banking',
        icon: Landmark,
        label: 'Banque',
        shortLabel: 'Banque',
      },
      {
        id: 'strategy',
        path: '/strategy',
        icon: Compass,
        label: 'Stratégie',
        shortLabel: 'Stratégie',
        children: [
          { path: '/portfolio/objectives', label: 'Objectifs', icon: Crosshair, exact: true },
          { path: '/strategy', label: 'Labo Stratégie', icon: FlaskConical, exact: true },
          { path: '/strategy/projection', label: 'Projection', icon: ArrowUpRight },
          { path: '/strategy/fire', label: 'Liberté financière', icon: Flame },
          { path: '/strategy/scenarios', label: 'Scénarios', icon: GitBranch },
        ],
      },
    ],
  },
  {
    sectionLabel: 'Outils',
    items: [
      {
        id: 'insights',
        path: '/insights',
        icon: Sparkles,
        label: 'Analyses IA',
        shortLabel: 'Analyses IA',
      },
      {
        id: 'settings',
        path: '/settings',
        icon: Settings,
        label: 'Paramètres',
        shortLabel: 'Paramètres',
      },
    ],
  },
]

const themeColors = {
  crimson: '#e53e3e',
  ocean: '#0177fb',
  slate: '#7c7fff',
  amethyst: '#9f17df',
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

  useEffect(() => {
    if (mobileOpen) onMobileClose()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayName = user?.name || user?.email?.split('@')[0] || 'Démo'
  const initials = displayName[0]?.toUpperCase()

  const renderNavItem = (item) => {
    const { id, path, icon: Icon, label, shortLabel, children } = item
    const hasChildren = children && children.length > 0
    const childActive = isChildActive(children)
    const isOpen = isSectionOpen(item)

    if (hasChildren) {
      return (
        <div key={id} className="sidebar-group">
          <button
            className={`nav-item ${childActive ? 'active' : ''}`}
            onClick={() => {
              if (collapsed) {
                setCollapsed(false)
                setOpenSections(prev => ({ ...prev, [id]: true }))
              } else {
                toggleSection(id)
              }
            }}
          >
            <span className="nav-icon">
              <Icon size={18} />
            </span>
            {!collapsed && (
              <>
                <span className="nav-label">{shortLabel || label}</span>
                <ChevronDown
                  size={13}
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
          `nav-item ${isActive ? 'active' : ''}`
        }
        onClick={onMobileClose}
      >
        <span className="nav-icon">
          <Icon size={18} />
        </span>
        {!collapsed && <span className="nav-label">{shortLabel || label}</span>}
      </NavLink>
    )
  }

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-mobile-overlay" onClick={onMobileClose} />
      )}
      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-header">
          {!collapsed ? (
            <div className="sidebar-logo">
              <img src={stratifyIcon} width="30" height="30" alt="" className="sidebar-logo-icon-img" />
              <span className="sidebar-logo-title">Stratify</span>
            </div>
          ) : (
            <img src={stratifyIcon} width="30" height="30" alt="Stratify" className="sidebar-logo-collapsed" />
          )}
          <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Développer' : 'Réduire'}>
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
          <button className="sidebar-mobile-close" onClick={onMobileClose}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation par groupes */}
        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className="nav-section">
              {!collapsed && (
                <span className="nav-section-label">{group.sectionLabel}</span>
              )}
              {group.items.map(renderNavItem)}
            </div>
          ))}
        </nav>

        {/* Footer utilisateur */}
        <div className="sidebar-footer">
          <div className="sidebar-divider" />
          <div className="sidebar-user">
            <div className="sidebar-avatar sidebar-avatar--placeholder" style={{ '--avatar-bg': accent }}>
              {initials}
            </div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{displayName}</span>
                <span className="sidebar-user-email">{user ? user.email : 'Mode démo'}</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
