/**
 * Goals Engine — CRUD, asset assignment, and progress computation for financial goals.
 * Pure functions, no side effects.
 */

import { projectGoal } from './goalProjectionEngine.js'

// ─── UUID Generator ─────────────────────────────────────────────────────────────

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ─── CRUD ────────────────────────────────────────────────────────────────────────

function createGoal({ label, type, targetAmount, targetDate = null, icon = 'default', monthlyContribution = 0, riskProfile = 'balanced' }) {
  return {
    id: generateId(),
    label,
    type,
    targetAmount,
    targetDate,
    monthlyContribution,
    riskProfile,
    linkedAssets: [],
    createdAt: new Date().toISOString(),
    icon,
  }
}

function updateGoal(goals, goalId, changes) {
  return goals.map((g) => (g.id === goalId ? { ...g, ...changes } : g))
}

function deleteGoal(goals, goalId) {
  return goals.filter((g) => g.id !== goalId)
}

// ─── Asset Assignment (1 asset = 1 goal rule) ───────────────────────────────────

function assignAssetToGoal(goals, assetId, assetType, goalId) {
  return goals.map((goal) => {
    // Remove the asset from any goal it was previously assigned to
    const cleaned = goal.linkedAssets.filter(
      (a) => !(a.assetId === assetId && a.assetType === assetType)
    )

    // Add the asset to the target goal
    if (goal.id === goalId) {
      return { ...goal, linkedAssets: [...cleaned, { assetId, assetType }] }
    }

    return cleaned.length !== goal.linkedAssets.length
      ? { ...goal, linkedAssets: cleaned }
      : goal
  })
}

function unassignAsset(goals, assetId, assetType) {
  return goals.map((goal) => {
    const filtered = goal.linkedAssets.filter(
      (a) => !(a.assetId === assetId && a.assetType === assetType)
    )
    return filtered.length !== goal.linkedAssets.length
      ? { ...goal, linkedAssets: filtered }
      : goal
  })
}

// ─── Asset Value Resolution ──────────────────────────────────────────────────────

function resolveAssetValue(assetId, assetType, portfolio, accountBalances) {
  if (assetType === 'crypto') {
    const asset = (portfolio.crypto || []).find((a) => a.id === assetId)
    if (!asset) return { value: 0, label: null }
    const price = asset.currentPrice || asset.buyPrice || 0
    return { value: price * (asset.quantity || 0), label: asset.name || asset.symbol || assetId }
  }

  if (assetType === 'pea') {
    const asset = (portfolio.pea || []).find((a) => a.id === assetId)
    if (!asset) return { value: 0, label: null }
    const price = asset.currentPrice || asset.buyPrice || 0
    return { value: price * (asset.quantity || 0), label: asset.name || asset.symbol || assetId }
  }

  if (assetType === 'livrets') {
    const asset = (portfolio.livrets || []).find((a) => a.id === assetId)
    if (!asset) return { value: 0, label: null }
    return { value: asset.balance || 0, label: asset.name || asset.type || assetId }
  }

  if (assetType === 'fundraising') {
    const asset = (portfolio.fundraising || []).find((a) => a.id === assetId)
    if (!asset) return { value: 0, label: null }
    // Use current value if available (price × quantity), otherwise fall back to amountInvested
    const currentPrice = asset.currentPrice || asset.unitPrice || 0
    const quantity = asset.quantity || 1
    const currentValue = currentPrice > 0 ? currentPrice * quantity : asset.amountInvested || 0
    return { value: currentValue, label: asset.projectName || asset.name || assetId }
  }

  if (assetType === 'bankAccount') {
    const account = (accountBalances || []).find((a) => a.id === assetId)
    if (!account) return { value: 0, label: null }
    return { value: account.balance || 0, label: account.name || account.label || assetId }
  }

  return { value: 0, label: null }
}

// ─── Progress Computation ────────────────────────────────────────────────────────

function computeGoalProgress(goal, portfolio, totals, accountBalances) {
  const linkedAssetsDetail = []
  let currentAmount = 0

  for (const { assetId, assetType } of goal.linkedAssets) {
    const { value, label } = resolveAssetValue(assetId, assetType, portfolio, accountBalances)
    currentAmount += value
    linkedAssetsDetail.push({ assetId, assetType, label: label || assetId, value })
  }

  const targetAmount = goal.targetAmount || 0
  const progressPct = targetAmount > 0
    ? Math.min(100, Math.round((currentAmount / targetAmount) * 1000) / 10)
    : 0
  const gap = Math.max(targetAmount - currentAmount, 0)

  // Dynamically compute estimated date using goalProjectionEngine
  const goalProjection = projectGoal({
    type: goal.type,
    targetAmount,
    currentAmount,
    monthlyContribution: goal.monthlyContribution || 0,
  })

  const estimatedDate = goalProjection.projectedDate || goal.targetDate || null
  const monthsToReach = goalProjection.monthsToReach
  const isAchievable = monthsToReach !== null

  return { currentAmount, progressPct, estimatedDate, monthsToReach, isAchievable, gap, linkedAssetsDetail }
}

function computeAllGoalsProgress(goals, portfolio, totals, accountBalances) {
  return goals.map((goal) => ({
    ...goal,
    progress: computeGoalProgress(goal, portfolio, totals, accountBalances),
  }))
}

// ─── Exports ─────────────────────────────────────────────────────────────────────

export {
  generateId,
  createGoal,
  updateGoal,
  deleteGoal,
  assignAssetToGoal,
  unassignAsset,
  computeGoalProgress,
  computeAllGoalsProgress,
}
