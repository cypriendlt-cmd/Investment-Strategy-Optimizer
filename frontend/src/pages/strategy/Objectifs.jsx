import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Target, Shield, TrendingUp, Star, Plane, Home, Pencil, Trash2, X, Info } from 'lucide-react'
import { usePortfolio } from '../../context/PortfolioContext'
import { useBank } from '../../context/BankContext'
import { usePrivacyMask } from '../../hooks/usePrivacyMask'
import { createGoal, updateGoal, deleteGoal, computeAllGoalsProgress } from '../../services/goalsEngine'
import { fmtMonths, INFLATION_RATE } from '../../services/goalProjectionEngine'
import { fmt } from '../../utils/format'

const GOAL_TYPES = {
  short_term: { label: 'Court terme', color: 'var(--accent)', colorLight: 'var(--accent-light)' },
  security: { label: 'Sécurité', color: 'var(--success)', colorLight: 'var(--success-light)' },
  long_term: { label: 'Long terme', color: '#8b5cf6', colorLight: 'rgba(139, 92, 246, 0.12)' },
}

const ICON_MAP = { home: Home, shield: Shield, 'trending-up': TrendingUp, star: Star, plane: Plane, default: Target }
const ICON_OPTIONS = ['home', 'shield', 'trending-up', 'star', 'plane', 'default']

const RISK_PROFILES = [
  { value: 'conservative', label: 'Prudent (4%/an)' },
  { value: 'balanced', label: 'Équilibré (6%/an)' },
  { value: 'growth', label: 'Croissance (8%/an)' },
  { value: 'aggressive', label: 'Offensif (10%/an)' },
]

const EMPTY_FORM = { label: '', type: 'short_term', targetAmount: '', targetDate: '', icon: 'default', monthlyContribution: '', riskProfile: 'balanced' }

export default function Objectifs() {
  const { portfolio, totals, updateAndSave } = usePortfolio()
  const { accountBalances } = useBank() || {}
  const { m } = usePrivacyMask()

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const goals = portfolio?.goals || []

  const goalsWithProgress = useMemo(() => {
    return computeAllGoalsProgress(goals, portfolio, totals, accountBalances || [])
  }, [goals, portfolio, totals, accountBalances])

  /* --- Modal handlers --- */

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (goal) => {
    setEditingId(goal.id)
    setForm({
      label: goal.label,
      type: goal.type,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate || '',
      icon: goal.icon || 'default',
      monthlyContribution: goal.monthlyContribution || '',
      riskProfile: goal.riskProfile || 'balanced',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = () => {
    if (!form.label.trim() || !form.targetAmount) return

    if (editingId) {
      updateAndSave(p => ({
        ...p,
        goals: updateGoal(p.goals || [], editingId, {
          label: form.label.trim(),
          type: form.type,
          targetAmount: Number(form.targetAmount),
          targetDate: form.targetDate || null,
          icon: form.icon,
          monthlyContribution: form.monthlyContribution ? Number(form.monthlyContribution) : 0,
          riskProfile: form.riskProfile,
        }),
      }))
    } else {
      const newGoal = createGoal({
        label: form.label.trim(),
        type: form.type,
        targetAmount: Number(form.targetAmount),
        targetDate: form.targetDate || null,
        icon: form.icon,
        monthlyContribution: form.monthlyContribution ? Number(form.monthlyContribution) : 0,
        riskProfile: form.riskProfile,
      })
      updateAndSave(p => ({ ...p, goals: [...(p.goals || []), newGoal] }))
    }

    closeModal()
  }

  const handleDelete = (goalId) => {
    updateAndSave(p => ({ ...p, goals: deleteGoal(p.goals || [], goalId) }))
  }

  /* --- Render helpers --- */

  const renderIcon = (iconKey, size = 20) => {
    const IconComp = ICON_MAP[iconKey] || Target
    return <IconComp size={size} />
  }

  return (
    <div className="projection-page">
      {/* Header */}
      <div className="projection-header">
        <Link to="/strategy" className="projection-back">
          <ArrowLeft size={16} /> Labo Stratégie
        </Link>
        <div>
          <h1 className="projection-title">Vos objectifs financiers</h1>
          <p className="projection-subtitle">
            Chaque euro épargné peut servir un projet précis. Reliez vos comptes à vos objectifs pour mieux piloter votre avenir.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          <Plus size={16} /> Nouvel objectif
        </button>
      </div>

      {/* Goal Cards Grid */}
      {goalsWithProgress.length === 0 ? (
        <div className="goals-grid">
          <div className="goals-card" style={{ textAlign: 'center', padding: '3rem 2rem', gridColumn: '1 / -1' }}>
            <Target size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>Aucun objectif défini</h3>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 1.5rem', maxWidth: 420, marginInline: 'auto' }}>
              Créez votre premier objectif financier pour donner une direction à votre épargne et suivre vos progrès.
            </p>
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> Créer un objectif
            </button>
          </div>
        </div>
      ) : (
        <div className="goals-grid">
          {goalsWithProgress.map(goal => {
            const typeInfo = GOAL_TYPES[goal.type] || GOAL_TYPES.short_term
            const { currentAmount, progressPct, estimatedDate, linkedAssetsDetail } = goal.progress

            return (
              <div key={goal.id} className="goals-card">
                <div className="goals-card-header">
                  <div className="goals-card-icon" style={{ background: typeInfo.colorLight, color: typeInfo.color }}>
                    {renderIcon(goal.icon)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="goals-card-label">{goal.label}</div>
                    <span className="goals-card-badge" style={{ background: typeInfo.colorLight, color: typeInfo.color }}>
                      {typeInfo.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-icon" onClick={() => openEdit(goal)} title="Modifier">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(goal.id)} style={{ color: 'var(--danger)' }} title="Supprimer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="goals-card-progress">
                  <div className="goals-card-progress-header">
                    <span>{progressPct.toFixed(0)}%</span>
                    <span>{m(fmt(currentAmount))} / {m(fmt(goal.targetAmount))}</span>
                  </div>
                  <div className="goals-card-progress-bar">
                    <div className="goals-card-progress-fill" style={{ width: `${progressPct}%`, background: typeInfo.color }} />
                  </div>
                </div>

                {/* Estimated date */}
                <div className="goals-card-meta">
                  Date estimée : {(() => {
                    if (!estimatedDate) return '—'
                    try {
                      const d = new Date(estimatedDate + '-01')
                      if (isNaN(d.getTime())) return 'Horizon trop lointain'
                      return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                    } catch { return 'Horizon trop lointain' }
                  })()}
                  {goal.progress.monthsToReach != null && goal.progress.monthsToReach > 0 && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                      ({fmtMonths(goal.progress.monthsToReach)}
                      {['long_term', 'investment', 'real_estate', 'freedom'].includes(goal.type) ? `, inflation ${(INFLATION_RATE * 100).toFixed(0)}%/an incluse` : ''})
                    </span>
                  )}
                  {goal.progress.monthsToReach === null && goal.monthlyContribution > 0 && (
                    <span style={{ color: 'var(--danger)', marginLeft: 6 }}>Non atteignable avec ces paramètres</span>
                  )}
                </div>

                {/* Linked assets */}
                {linkedAssetsDetail.length > 0 && (
                  <div className="goals-card-meta">
                    Actifs reliés : {linkedAssetsDetail.map(a => a.label).join(', ')}
                  </div>
                )}

                {/* Link to projection */}
                <Link
                  to={`/strategy/objective?goalId=${goal.id}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', color: 'var(--accent)', marginTop: 8, textDecoration: 'none', fontWeight: 600 }}
                >
                  <TrendingUp size={14} /> Voir la projection
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary Table */}
      {goalsWithProgress.length > 0 && (
        <div className="projection-milestones">
          <div className="projection-section-title">Résumé des objectifs</div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Objectif</th>
                  <th>Montant actuel</th>
                  <th>Cible</th>
                  <th>Progression</th>
                  <th>Date estimée</th>
                </tr>
              </thead>
              <tbody>
                {goalsWithProgress.map(goal => {
                  const typeInfo = GOAL_TYPES[goal.type] || GOAL_TYPES.short_term
                  return (
                    <tr key={goal.id}>
                      <td style={{ fontWeight: 600 }}>{goal.label}</td>
                      <td>{m(fmt(goal.progress.currentAmount))}</td>
                      <td>{m(fmt(goal.targetAmount))}</td>
                      <td>
                        <span style={{ color: typeInfo.color, fontWeight: 600 }}>{goal.progress.progressPct.toFixed(0)}%</span>
                      </td>
                      <td>
                        {(() => {
                          if (!goal.progress.estimatedDate) return goal.progress.monthsToReach === null ? 'Non calculable' : '—'
                          try {
                            const d = new Date(goal.progress.estimatedDate + '-01')
                            if (isNaN(d.getTime())) return 'Horizon trop lointain'
                            return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                          } catch { return 'Horizon trop lointain' }
                        })()}
                        {goal.progress.monthsToReach != null && goal.progress.monthsToReach > 0 && (
                          <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: '0.82rem' }}>({fmtMonths(goal.progress.monthsToReach)})</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pedagogical block */}
      <div className="projection-hypotheses">
        <Info size={14} style={{ color: 'var(--text-muted)', minWidth: 14 }} />
        <p>
          Pourquoi séparer vos objectifs ? Savoir à quoi sert chaque euro épargné vous aide à faire de meilleurs choix : sécuriser un fonds d'urgence, préparer un achat important, ou construire votre indépendance financière à long terme.
        </p>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Modifier l\'objectif' : 'Nouvel objectif'}</h2>
              <button className="btn btn-ghost" onClick={closeModal} style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Nom de l'objectif</label>
              <input
                className="form-input"
                type="text"
                placeholder="Ex. : Fonds d'urgence, Apport immobilier..."
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Type d'objectif</label>
              <select
                className="form-select"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="short_term">Projet court terme</option>
                <option value="security">Réserve de sécurité</option>
                <option value="long_term">Indépendance financière</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Montant cible (€)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="500"
                placeholder="10 000"
                value={form.targetAmount}
                onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Épargne mensuelle dédiée (facultatif)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="50"
                placeholder="Ex. : 200"
                value={form.monthlyContribution}
                onChange={e => setForm(f => ({ ...f, monthlyContribution: e.target.value }))}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Utilisé pour calculer la date estimée d'atteinte de l'objectif
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Date cible (facultatif)</label>
              <input
                className="form-input"
                type="date"
                value={form.targetDate}
                onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Icône</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {ICON_OPTIONS.map(key => {
                  const isSelected = form.icon === key
                  return (
                    <div
                      key={key}
                      onClick={() => setForm(f => ({ ...f, icon: key }))}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 42, height: 42, borderRadius: 10, cursor: 'pointer',
                        border: isSelected ? '2px solid var(--accent)' : '2px solid var(--border)',
                        background: isSelected ? 'var(--accent-light)' : 'var(--bg-card)',
                        color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                        transition: 'all 0.15s ease',
                      }}
                      title={key}
                    >
                      {renderIcon(key, 18)}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Profil d'investisseur</label>
              <select
                className="form-select"
                value={form.riskProfile}
                onChange={e => setForm(f => ({ ...f, riskProfile: e.target.value }))}
              >
                {RISK_PROFILES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Détermine le rendement attendu dans les projections
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={closeModal}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingId ? 'Enregistrer' : 'Créer l\'objectif'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
