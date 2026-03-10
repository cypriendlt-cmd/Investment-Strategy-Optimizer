import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Target, Shield, TrendingUp, Star, Plane, Home, Pencil, Trash2, X, Info } from 'lucide-react'
import { usePortfolio } from '../../context/PortfolioContext'
import { useBank } from '../../context/BankContext'
import { usePrivacyMask } from '../../hooks/usePrivacyMask'
import { createGoal, updateGoal, deleteGoal, computeAllGoalsProgress } from '../../services/goalsEngine'
import { fmtMonths } from '../../services/goalProjectionEngine'
import { fmt } from '../../utils/format'

const GOAL_TYPES = {
  short_term: { label: 'Short Term', color: 'var(--accent)', colorLight: 'var(--accent-light)' },
  security: { label: 'Security', color: 'var(--success)', colorLight: 'var(--success-light)' },
  long_term: { label: 'Long Term', color: '#8b5cf6', colorLight: 'rgba(139, 92, 246, 0.12)' },
}

const ICON_MAP = { home: Home, shield: Shield, 'trending-up': TrendingUp, star: Star, plane: Plane, default: Target }
const ICON_OPTIONS = ['home', 'shield', 'trending-up', 'star', 'plane', 'default']

const EMPTY_FORM = { label: '', type: 'short_term', targetAmount: '', targetDate: '', icon: 'default', monthlyContribution: '' }

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
          <ArrowLeft size={16} /> Strategy Lab
        </Link>
        <div>
          <h1 className="projection-title">Your Financial Goals</h1>
          <p className="projection-subtitle">
            Every euro you save can serve a specific purpose. Link your accounts to your projects to better steer your future.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* Goal Cards Grid */}
      {goalsWithProgress.length === 0 ? (
        <div className="goals-grid">
          <div className="goals-card" style={{ textAlign: 'center', padding: '3rem 2rem', gridColumn: '1 / -1' }}>
            <Target size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>No goals defined</h3>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 1.5rem', maxWidth: 420, marginInline: 'auto' }}>
              Create your first financial goal to give direction to your savings and track your progress.
            </p>
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> Create a Goal
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
                    <button className="btn btn-ghost btn-icon" onClick={() => openEdit(goal)} title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(goal.id)} style={{ color: 'var(--danger)' }} title="Delete">
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
                  Estimated date: {estimatedDate ? new Date(estimatedDate + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                  {goal.progress.monthsToReach != null && goal.progress.monthsToReach > 0 && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>({fmtMonths(goal.progress.monthsToReach)})</span>
                  )}
                </div>

                {/* Linked assets */}
                {linkedAssetsDetail.length > 0 && (
                  <div className="goals-card-meta">
                    Linked assets: {linkedAssetsDetail.map(a => a.label).join(', ')}
                  </div>
                )}

                {/* Link to projection for long-term goals */}
                {goal.type === 'long_term' && (
                  <Link
                    to={`/strategy/objective?target=${goal.targetAmount}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', color: 'var(--accent)', marginTop: 8, textDecoration: 'none', fontWeight: 600 }}
                  >
                    <TrendingUp size={14} /> View projection
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Summary Table */}
      {goalsWithProgress.length > 0 && (
        <div className="projection-milestones">
          <div className="projection-section-title">Goals Summary</div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Goal</th>
                  <th>Current Amount</th>
                  <th>Target</th>
                  <th>Progress</th>
                  <th>Estimated Date</th>
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
                        {goal.progress.estimatedDate
                          ? new Date(goal.progress.estimatedDate + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          : '—'}
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
          Why separate your goals? Knowing the purpose of every euro saved helps you make better choices: securing an emergency fund, preparing for a major purchase, or building long-term financial freedom.
        </p>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Edit Goal' : 'New Goal'}</h2>
              <button className="btn btn-ghost" onClick={closeModal} style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Goal Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="E.g.: Emergency fund, House deposit..."
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Goal Type</label>
              <select
                className="form-select"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="short_term">Short-term project</option>
                <option value="security">Safety reserve</option>
                <option value="long_term">Financial freedom</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Target Amount (EUR)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="500"
                placeholder="10,000"
                value={form.targetAmount}
                onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Dedicated Monthly Savings (optional)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="50"
                placeholder="E.g.: 200"
                value={form.monthlyContribution}
                onChange={e => setForm(f => ({ ...f, monthlyContribution: e.target.value }))}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Used to calculate the estimated date to reach the goal
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Target Date (optional)</label>
              <input
                className="form-input"
                type="date"
                value={form.targetDate}
                onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Icon</label>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingId ? 'Save' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
