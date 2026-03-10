import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAuth } from '../context/AuthContext'

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
    </div>
  )
}
