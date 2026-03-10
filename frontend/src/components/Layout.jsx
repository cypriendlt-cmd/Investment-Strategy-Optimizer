import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, Landmark, Compass, Sparkles } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAuth } from '../context/AuthContext'

const BOTTOM_NAV = [
  { path: '/', icon: LayoutDashboard, label: 'Accueil', exact: true },
  { path: '/portfolio', icon: TrendingUp, label: 'Patrimoine' },
  { path: '/portfolio/banking', icon: Landmark, label: 'Banque' },
  { path: '/strategy', icon: Compass, label: 'Stratégie' },
  { path: '/insights', icon: Sparkles, label: 'IA' },
]

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isGuest } = useAuth()

  return (
    <div className="app-layout">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="main-content">
        {isGuest && (
          <div className="demo-banner">
            <span className="demo-banner-dot" />
            Mode démo — Données d'exemple affichées.{' '}
            <a href="#/login" className="demo-banner-link">
              Se connecter
            </a>{' '}
            pour accéder à votre vrai portefeuille.
          </div>
        )}
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="page-content animate-fade-in">
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav className="mobile-bottom-nav">
        {BOTTOM_NAV.map(({ path, icon: Icon, label, exact }) => (
          <NavLink
            key={path}
            to={path}
            end={exact}
            className={({ isActive }) => `mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
