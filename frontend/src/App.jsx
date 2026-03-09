import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { usePriceRefreshManager } from './hooks/usePriceRefresh'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import StrategyLab from './pages/StrategyLab'
import ProjectionGlobale from './pages/strategy/ProjectionGlobale'
import ObjectifFinancier from './pages/strategy/ObjectifFinancier'
import Objectifs from './pages/strategy/Objectifs'
import Portfolio from './pages/Portfolio'
import Crypto from './pages/Crypto'
import PEA from './pages/PEA'
import Livrets from './pages/Livrets'
import Fundraising from './pages/Fundraising'
import Objectives from './pages/Objectives'
import Insights from './pages/Insights'
import DCA from './pages/DCA'
import Banking from './pages/Banking'
import Settings from './pages/Settings'
import Login from './pages/Login'
import InstallPrompt from './components/InstallPrompt'
import { BankProvider } from './context/BankContext'

function PriceRefreshManager({ children }) {
  usePriceRefreshManager(60000)
  return children
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', fontWeight: 700 }}>S</div>
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <PriceRefreshManager><BankProvider>{children}</BankProvider></PriceRefreshManager>
}

export default function App() {
  return (
    <>
    <InstallPrompt />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/settings" element={
        <Layout><Settings /></Layout>
      } />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/strategy" element={<StrategyLab />} />
              <Route path="/strategy/projection" element={<ProjectionGlobale />} />
              <Route path="/strategy/objective" element={<ObjectifFinancier />} />
              <Route path="/strategy/objectifs" element={<Objectifs />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/portfolio/crypto" element={<Crypto />} />
              <Route path="/portfolio/pea" element={<PEA />} />
              <Route path="/portfolio/livrets" element={<Livrets />} />
              <Route path="/portfolio/fundraising" element={<Fundraising />} />
              <Route path="/portfolio/objectives" element={<Objectives />} />
              <Route path="/portfolio/banking" element={<Banking />} />
              <Route path="/portfolio/dca" element={<DCA />} />
              <Route path="/insights" element={<Insights />} />
              {/* Legacy redirects */}
              <Route path="/crypto" element={<Navigate to="/portfolio/crypto" replace />} />
              <Route path="/pea" element={<Navigate to="/portfolio/pea" replace />} />
              <Route path="/livrets" element={<Navigate to="/portfolio/livrets" replace />} />
              <Route path="/fundraising" element={<Navigate to="/portfolio/fundraising" replace />} />
              <Route path="/objectives" element={<Navigate to="/portfolio/objectives" replace />} />
              <Route path="/banking" element={<Navigate to="/portfolio/banking" replace />} />
              <Route path="/dca" element={<Navigate to="/portfolio/dca" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
    </>
  )
}
