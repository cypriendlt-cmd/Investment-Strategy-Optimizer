import { Target } from 'lucide-react'

const GOAL_TYPE_COLORS = {
  short_term: 'var(--accent)',
  security: 'var(--success)',
  long_term: '#8b5cf6',
}

export default function GoalSelector({ assetId, assetType, goals, onAssign }) {
  const currentGoal = (goals || []).find(g =>
    g.linkedAssets?.some(a => a.assetId === assetId && a.assetType === assetType)
  )

  return (
    <select
      className="goal-selector"
      value={currentGoal?.id || ''}
      onChange={e => onAssign(assetId, assetType, e.target.value || null)}
      title="Associer à un objectif"
      style={{
        borderColor: currentGoal ? (GOAL_TYPE_COLORS[currentGoal.type] || 'var(--border)') : 'var(--border)',
        color: currentGoal ? 'var(--text)' : 'var(--text-muted)',
      }}
    >
      <option value="">Aucun objectif</option>
      {(goals || []).map(g => (
        <option key={g.id} value={g.id}>{g.label}</option>
      ))}
    </select>
  )
}
