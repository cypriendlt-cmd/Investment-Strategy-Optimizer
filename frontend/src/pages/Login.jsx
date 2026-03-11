import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { TrendingUp, Shield, BarChart3, Brain, Zap } from 'lucide-react'
import stratifyIcon from '../assets/icon.svg'

const THEME_META = {
  crimson: { label: 'Crimson', accent: '#dc2626' },
  ocean: { label: 'Ocean', accent: '#2563eb' },
  slate: { label: 'Slate', accent: '#64748b' },
  amethyst: { label: 'Amethyst', accent: '#8b5cf6' },
  teal: { label: 'Teal', accent: '#06b6d4' },
}

const FEATURES = [
  { icon: TrendingUp, text: 'Projection de votre patrimoine et modélisation de trajectoire' },
  { icon: BarChart3, text: 'Comparaison et optimisation de plusieurs stratégies' },
  { icon: Shield, text: 'Suivi crypto, PEA, livrets et crowdfunding' },
  { icon: Brain, text: 'Recommandations stratégiques alimentées par l\'IA' },
  { icon: Zap, text: 'Données sécurisées sur votre Google Drive personnel' },
]

export default function Login() {
  const { login, loginAsGuest, error, handleOAuthCallback } = useAuth()
  const { theme, darkMode, toggleDarkMode, changeTheme, THEMES } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    if (!window.location.hash.includes('access_token')) return
    handleOAuthCallback().then(success => {
      if (success) navigate('/', { replace: true })
    })
  }, [handleOAuthCallback, navigate])

  const accent = THEME_META[theme]?.accent || '#dc2626'

  return (
    <div className="login-page">
      <div className="login-bg" />

      {/* Gauche — Présentation */}
      <div className="login-branding">
        <div className="login-branding-content">
          <div className="login-branding-logo">
            <img src={stratifyIcon} width="48" height="48" alt="Stratify" style={{borderRadius:'12px'}} />
          </div>
          <h1 className="login-branding-title">Stratify</h1>
          <p className="login-branding-subtitle">Votre copilote IA pour optimiser votre stratégie d'investissement</p>

          <div className="login-branding-features">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="login-branding-feature">
                <Icon size={16} style={{ color: accent, flexShrink: 0 }} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Droite — Carte de connexion */}
      <div className="login-card-wrapper">
        <div className="login-card">
          <h2 className="login-title">Bienvenue</h2>
          <p className="login-subtitle">Connectez-vous pour accéder à votre portefeuille et vos outils de stratégie</p>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button className="login-google-btn" onClick={login}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Se connecter avec Google
          </button>

          <div className="login-divider">
            <span>ou</span>
          </div>

          <button
            className="login-guest-btn"
            onClick={() => { loginAsGuest(); navigate('/', { replace: true }) }}
          >
            Continuer en mode invité
          </button>

          <p className="login-note">
            Vos données sont stockées en toute sécurité sur votre Google Drive personnel. Aucune donnée financière ne transite par nos serveurs.
          </p>

          <div className="login-themes">
            {THEMES.map(t => (
              <button
                key={t}
                onClick={() => changeTheme(t)}
                className={`login-theme-btn ${theme === t ? 'login-theme-btn--active' : ''}`}
                style={{ background: THEME_META[t]?.accent }}
                title={THEME_META[t]?.label}
              />
            ))}
            <button
              onClick={toggleDarkMode}
              className="login-theme-btn login-theme-btn--mode"
              title={darkMode ? 'Mode clair' : 'Mode sombre'}
            >
              {darkMode ? '☀' : '🌙'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
