import { useState, useRef, useEffect } from 'react'
import { Target, ChevronDown, X, Home, Shield, TrendingUp, Star, Plane } from 'lucide-react'

const GOAL_TYPE_COLORS = {
  short_term: 'var(--accent)',
  security: 'var(--success)',
  long_term: '#8b5cf6',
}

const ICON_MAP = { home: Home, shield: Shield, 'trending-up': TrendingUp, star: Star, plane: Plane, default: Target }

function GoalIcon({ iconKey, size = 14 }) {
  const Icon = ICON_MAP[iconKey] || Target
  return <Icon size={size} />
}

export default function GoalSelector({ assetId, assetType, goals, onAssign }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const currentGoal = (goals || []).find(g =>
    g.linkedAssets?.some(a => a.assetId === assetId && a.assetType === assetType)
  )

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const color = currentGoal ? (GOAL_TYPE_COLORS[currentGoal.type] || 'var(--accent)') : null

  const handleSelect = (goalId) => {
    onAssign(assetId, assetType, goalId || null)
    setOpen(false)
  }

  return (
    <div className="goal-selector-wrapper" ref={ref}>
      <button
        type="button"
        className={`goal-selector-trigger ${currentGoal ? 'goal-selector-trigger--active' : ''}`}
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        style={color ? { '--goal-color': color } : undefined}
      >
        {currentGoal ? (
          <>
            <GoalIcon iconKey={currentGoal.icon} size={12} />
            <span className="goal-selector-label">{currentGoal.label}</span>
            <button
              type="button"
              className="goal-selector-clear"
              onClick={(e) => { e.stopPropagation(); handleSelect(null) }}
            >
              <X size={10} />
            </button>
          </>
        ) : (
          <>
            <Target size={12} />
            <span className="goal-selector-label">Objectif</span>
            <ChevronDown size={11} />
          </>
        )}
      </button>

      {open && (
        <div className="goal-selector-dropdown">
          <div
            className={`goal-selector-option ${!currentGoal ? 'goal-selector-option--active' : ''}`}
            onClick={() => handleSelect(null)}
          >
            <span className="goal-selector-option-dot" style={{ background: 'var(--text-muted)' }} />
            <span>Aucun objectif</span>
          </div>
          {(goals || []).map(g => {
            const c = GOAL_TYPE_COLORS[g.type] || 'var(--accent)'
            const isActive = currentGoal?.id === g.id
            return (
              <div
                key={g.id}
                className={`goal-selector-option ${isActive ? 'goal-selector-option--active' : ''}`}
                onClick={() => handleSelect(g.id)}
              >
                <span className="goal-selector-option-dot" style={{ background: c }} />
                <GoalIcon iconKey={g.icon} size={13} />
                <span>{g.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
