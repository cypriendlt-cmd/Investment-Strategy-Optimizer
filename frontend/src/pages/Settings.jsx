import { useState, useEffect } from 'react'
import { Download, Upload, LogOut, Key, Globe, User, Check, AlertCircle, CheckCircle, Bell, BellOff, Send, MessageSquare, Bug, Lightbulb, HelpCircle, Loader2, Trash2, Info } from 'lucide-react'
import packageJson from '../../package.json'
import { useAuth } from '../context/AuthContext'
import { usePortfolio } from '../context/PortfolioContext'
import { loadFileFromDrive, saveFileToDrive } from '../services/googleDrive'
import {
  isNotificationSupported, getNotificationPermission,
  requestPermission, testNotification
} from '../services/pushNotifications'
import { sendBugReport } from '../services/emailService'

const BINANCE_KEY_STORAGE = 'pm_binance_api_key'
const BINANCE_SECRET_STORAGE = 'pm_binance_api_secret'
const ANTHROPIC_KEY_STORAGE = 'pm_anthropic_api_key'

function Section({ title, icon: Icon, children }) {
  return (
    <div className="settings-section card">
      <div className="settings-section-header">
        <Icon size={18} style={{ color: 'var(--accent)' }} />
        <h3>{title}</h3>
      </div>
      <div className="divider" />
      {children}
    </div>
  )
}

export default function Settings() {
  const { user, login, logout, isGuest } = useAuth()
  const { driveConnected, driveError, portfolio } = usePortfolio()
  const [binanceKey, setBinanceKey] = useState(() => localStorage.getItem(BINANCE_KEY_STORAGE) || '')
  const [binanceSecret, setBinanceSecret] = useState(() => localStorage.getItem(BINANCE_SECRET_STORAGE) || '')
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem(ANTHROPIC_KEY_STORAGE) || '')
  const [anthropicSaved, setAnthropicSaved] = useState(false)
  const [currency, setCurrency] = useState('EUR')
  const [language, setLanguage] = useState('fr')
  const [saved, setSaved] = useState(false)
  const [binanceTest, setBinanceTest] = useState(null)
  const [binanceError, setBinanceError] = useState('')
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission())
  const notifSupported = isNotificationSupported()

  const [cacheCleared, setCacheCleared] = useState(false)

  useEffect(() => {
    if (!driveConnected) return
    loadFileFromDrive('secrets.json').then(data => {
      if (!data) return
      if (data.binanceKey && !binanceKey) {
        setBinanceKey(data.binanceKey)
        localStorage.setItem(BINANCE_KEY_STORAGE, data.binanceKey)
      }
      if (data.binanceSecret && !binanceSecret) {
        setBinanceSecret(data.binanceSecret)
        localStorage.setItem(BINANCE_SECRET_STORAGE, data.binanceSecret)
      }
      if (data.anthropicKey && !anthropicKey) {
        setAnthropicKey(data.anthropicKey)
        localStorage.setItem(ANTHROPIC_KEY_STORAGE, data.anthropicKey)
      }
    }).catch(() => {})
  }, [driveConnected]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClearCache = async () => {
    try {
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.map(name => caches.delete(name)))
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map(r => r.unregister()))
      }
      localStorage.clear()
      sessionStorage.clear()
      document.cookie.split(';').forEach(c => {
        document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
      })
      try {
        const token = window.gapi?.client?.getToken()
        if (token) window.google?.accounts?.oauth2?.revoke(token.access_token)
      } catch {}
      window.location.reload()
    } catch (e) {
      console.error('Cache clear error:', e)
      window.location.reload()
    }
  }

  const [reportType, setReportType] = useState('bug')
  const [reportSubject, setReportSubject] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [reportEmail, setReportEmail] = useState('')
  const [reportHoneypot, setReportHoneypot] = useState('')
  const [reportStatus, setReportStatus] = useState(null)
  const [reportError, setReportError] = useState('')

  const handleSendReport = async (e) => {
    e.preventDefault()
    setReportStatus('loading')
    setReportError('')
    const result = await sendBugReport({
      type: reportType,
      subject: reportSubject,
      description: reportDesc,
      userEmail: reportEmail,
      honeypot: reportHoneypot,
    })
    if (result.success) {
      setReportStatus('success')
      setReportSubject('')
      setReportDesc('')
      setReportEmail('')
      setReportType('bug')
      setTimeout(() => setReportStatus(null), 4000)
    } else {
      setReportStatus('error')
      setReportError(result.error || 'Erreur inconnue.')
    }
  }

  const handleSave = async () => {
    const key = binanceKey.trim()
    const secret = binanceSecret.trim()
    localStorage.setItem(BINANCE_KEY_STORAGE, key)
    localStorage.setItem(BINANCE_SECRET_STORAGE, secret)
    if (driveConnected) {
      try {
        const existing = await loadFileFromDrive('secrets.json').catch(() => null)
        await saveFileToDrive('secrets.json', { ...existing, binanceKey: key, binanceSecret: secret })
      } catch (e) {
        console.warn('Failed to save keys to Drive:', e.message)
      }
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveAnthropic = async () => {
    const key = anthropicKey.trim()
    localStorage.setItem(ANTHROPIC_KEY_STORAGE, key)
    if (driveConnected) {
      try {
        const existing = await loadFileFromDrive('secrets.json').catch(() => null)
        await saveFileToDrive('secrets.json', { ...existing, anthropicKey: key })
      } catch (e) {
        console.warn('Failed to save Anthropic key to Drive:', e.message)
      }
    }
    setAnthropicSaved(true)
    setTimeout(() => setAnthropicSaved(false), 2000)
  }

  const handleTestBinance = async () => {
    const key = binanceKey.trim()
    const secret = binanceSecret.trim()
    if (!key || !secret) { setBinanceTest('error'); setBinanceError('Clé API et clé secrète requises'); return }
    setBinanceTest('testing')
    setBinanceError('')
    try {
      const { testBinanceConnection } = await import('../services/binanceService')
      const result = await testBinanceConnection(key, secret)
      if (result.success) {
        setBinanceTest('ok')
      } else {
        setBinanceTest('error')
        setBinanceError(result.error || 'Erreur de connexion')
      }
    } catch (e) {
      setBinanceTest('error')
      setBinanceError(e.message || 'Erreur inconnue')
    }
  }

  const handleExport = () => {
    const data = JSON.stringify(portfolio, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  return (
    <div className="settings animate-fade-in">
      <Section title="Connexion Google" icon={User}>
        {user && !isGuest ? (
          <div className="settings-account">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} style={{ width: 56, height: 56, borderRadius: '50%' }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
                {(user.name || 'U')[0]}
              </div>
            )}
            <div>
              <div className="font-semibold">{user.name}</div>
              <div className="text-sm text-muted">{user.email}</div>
              <div className="text-xs text-muted mt-4">Connecté via Google OAuth</div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-muted text-sm" style={{ marginBottom: 12 }}>{isGuest ? 'Mode invité — connectez-vous pour synchroniser vos données.' : 'Non connecté.'}</p>
            <button className="btn btn-primary" onClick={login} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={16} /> Se connecter avec Google Drive
            </button>
          </div>
        )}

        <div className="gc-status mt-16">
          <div className={`gc-status-item ${user && !isGuest ? 'gc-ok' : 'gc-warn'}`}>
            {user && !isGuest ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>Compte Google {user && !isGuest ? `connecté (${user.email})` : 'non connecté'}</span>
          </div>
          <div className={`gc-status-item ${driveConnected ? 'gc-ok' : driveError ? 'gc-error' : 'gc-warn'}`}>
            {driveConnected ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>Google Drive {driveConnected ? 'synchronisé' : driveError || 'en attente'}</span>
          </div>
        </div>
      </Section>

      <Section title="Préférences" icon={Globe}>
        <div className="settings-row">
          <div>
            <div className="settings-label">Langue</div>
            <div className="settings-hint">Langue de l'interface</div>
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Devise</div>
            <div className="settings-hint">Devise d'affichage par défaut</div>
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={currency} onChange={e => setCurrency(e.target.value)}>
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
      </Section>

      <Section title="Notifications" icon={Bell}>
        {notifSupported ? (
          <>
            <div className="gc-status">
              <div className={`gc-status-item ${notifPermission === 'granted' ? 'gc-ok' : notifPermission === 'denied' ? 'gc-error' : 'gc-warn'}`}>
                {notifPermission === 'granted' ? <CheckCircle size={16} /> : notifPermission === 'denied' ? <BellOff size={16} /> : <AlertCircle size={16} />}
                <span>
                  {notifPermission === 'granted' && 'Notifications activées'}
                  {notifPermission === 'denied' && 'Notifications bloquées — modifiez les paramètres du navigateur'}
                  {notifPermission === 'default' && 'Notifications non configurées'}
                </span>
              </div>
            </div>
            <div className="gc-actions mt-16">
              {notifPermission !== 'granted' && notifPermission !== 'denied' && (
                <button className="btn btn-primary" onClick={async () => {
                  const result = await requestPermission()
                  setNotifPermission(result)
                }}>
                  <Bell size={16} /> Activer les notifications
                </button>
              )}
              <button className="btn btn-secondary" onClick={async () => {
                if (notifPermission !== 'granted') {
                  const result = await requestPermission()
                  setNotifPermission(result)
                  if (result !== 'granted') return
                }
                await testNotification()
              }}>
                <Send size={16} /> Tester
              </button>
            </div>
            <p className="text-xs text-muted mt-12">
              Les notifications servent aux rappels DCA. Aucun serveur tiers requis.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">Votre navigateur ne prend pas en charge les notifications.</p>
        )}
      </Section>

      <Section title="API Binance" icon={Key}>
        <p className="text-sm text-muted mb-16">
          Connectez votre compte Binance pour synchroniser automatiquement vos cryptomonnaies.
          Utilisez une clé API en lecture seule (activer la lecture uniquement).
        </p>
        <div className="form-group">
          <label className="form-label">Clé API</label>
          <input className="form-input" type="password" placeholder="Entrez votre clé API Binance" value={binanceKey} onChange={e => setBinanceKey(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Clé secrète</label>
          <input className="form-input" type="password" placeholder="Entrez votre clé secrète Binance" value={binanceSecret} onChange={e => setBinanceSecret(e.target.value)} />
        </div>
        <div className="gc-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? <><Check size={16} /> Enregistré</> : 'Enregistrer les clés'}
          </button>
          <button className="btn btn-secondary" onClick={handleTestBinance}>
            {binanceTest === 'testing' ? <><Loader2 size={16} /> Test en cours...</> : 'Tester la connexion'}
          </button>
        </div>
        <div className="gc-status mt-16">
          <div className={`gc-status-item ${binanceKey ? 'gc-ok' : 'gc-warn'}`}>
            {binanceKey ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>Clé API {binanceKey ? 'configurée' : 'non configurée'}</span>
          </div>
          {binanceTest === 'ok' && (
            <div className="gc-status-item gc-ok"><CheckCircle size={16} /><span>Connexion Binance OK</span></div>
          )}
          {binanceTest === 'error' && (
            <div className="gc-status-item gc-error"><AlertCircle size={16} /><span>{binanceError || 'Échec de la connexion'}</span></div>
          )}
        </div>
      </Section>

      <Section title="API Anthropic (Invest LAB)" icon={Key}>
        <p className="text-sm text-muted mb-16">
          Clé API Anthropic pour le Stock Screener (Invest LAB).
          Obtenez votre clé sur <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>console.anthropic.com</a>.
        </p>
        <div className="form-group">
          <label className="form-label">Clé API Anthropic</label>
          <input className="form-input" type="password" placeholder="sk-ant-..." value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} />
        </div>
        <div className="gc-actions">
          <button className="btn btn-primary" onClick={handleSaveAnthropic}>
            {anthropicSaved ? <><Check size={16} /> Enregistré</> : 'Enregistrer'}
          </button>
        </div>
        <div className="gc-status mt-16">
          <div className={`gc-status-item ${anthropicKey ? 'gc-ok' : 'gc-warn'}`}>
            {anthropicKey ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>Clé API {anthropicKey ? 'configurée' : 'non configurée'}</span>
          </div>
        </div>
      </Section>

      <Section title="Données" icon={Download}>
        <div className="settings-data-btns">
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={16} /> Exporter les données
          </button>
          <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Importer des données
            <input type="file" accept=".json" style={{ display: 'none' }} />
          </label>
          <button className="btn btn-ghost" onClick={handleClearCache} style={{ color: 'var(--danger)' }}>
            {cacheCleared ? <><Check size={16} /> Cache vidé</> : <><Trash2 size={16} /> Vider le cache</>}
          </button>
        </div>
        <p className="text-xs text-muted mt-12">Les données sont stockées sur votre Google Drive personnel.</p>
      </Section>

      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <span className="text-xs text-muted">
          <Info size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Strategy Optimizer v{packageJson.version}
        </span>
      </div>

      <Section title="Signaler un bug / FAQ" icon={MessageSquare}>
        <p className="text-sm text-muted mb-16">
          Vous avez trouvé un problème, une idée ou une question ? Envoyez-nous un message.
        </p>

        <form onSubmit={handleSendReport}>
          <input
            type="text"
            name="website"
            value={reportHoneypot}
            onChange={e => setReportHoneypot(e.target.value)}
            style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }}
            tabIndex={-1}
            autoComplete="off"
          />

          <div className="form-group mb-16">
            <label className="form-label">Type de message</label>
            <div className="report-type-toggle">
              {[
                { key: 'bug', label: 'Bug', icon: Bug },
                { key: 'suggestion', label: 'Suggestion', icon: Lightbulb },
                { key: 'question', label: 'Question', icon: HelpCircle },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  className={reportType === key ? 'active' : ''}
                  onClick={() => setReportType(key)}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Sujet *</label>
            <input
              className="form-input"
              type="text"
              placeholder="Résumez votre message"
              value={reportSubject}
              onChange={e => setReportSubject(e.target.value)}
              required
              disabled={reportStatus === 'loading'}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea
              className="form-input"
              rows={5}
              placeholder="Décrivez le problème, la suggestion ou la question en détail..."
              value={reportDesc}
              onChange={e => setReportDesc(e.target.value)}
              required
              disabled={reportStatus === 'loading'}
              style={{ resize: 'vertical', minHeight: 100 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email de contact (optionnel)</label>
            <input
              className="form-input"
              type="email"
              placeholder="votre@email.com"
              value={reportEmail}
              onChange={e => setReportEmail(e.target.value)}
              disabled={reportStatus === 'loading'}
            />
            <span className="text-xs text-muted" style={{ marginTop: 4 }}>
              Pour que nous puissions vous recontacter si besoin.
            </span>
          </div>

          <div className="gc-actions">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={reportStatus === 'loading' || !reportSubject.trim() || !reportDesc.trim()}
            >
              {reportStatus === 'loading' ? (
                <><Loader2 size={16} className="animate-pulse" /> Envoi en cours...</>
              ) : (
                <><Send size={16} /> Envoyer</>
              )}
            </button>
          </div>
        </form>

        {reportStatus === 'success' && (
          <div className="gc-status mt-16">
            <div className="gc-status-item gc-ok">
              <CheckCircle size={16} />
              <span>Message envoyé avec succès ! Merci pour votre retour.</span>
            </div>
          </div>
        )}
        {reportStatus === 'error' && (
          <div className="gc-status mt-16">
            <div className="gc-status-item gc-error">
              <AlertCircle size={16} />
              <span>{reportError}</span>
            </div>
          </div>
        )}
      </Section>

      {user && (
        <div className="settings-logout">
          <button className="btn btn-danger" onClick={logout}>
            <LogOut size={16} /> Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}
