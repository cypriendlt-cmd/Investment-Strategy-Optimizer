import { useState } from 'react'
import { Plus, X, Rocket, Trash2 } from 'lucide-react'
import { usePortfolio } from '../context/PortfolioContext'
import { usePrivacyMask } from '../hooks/usePrivacyMask'
import GoalSelector from '../components/GoalSelector'
import { assignAssetToGoal, unassignAsset } from '../services/goalsEngine'

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR')

function AddFundraisingModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ projectName: '', amountInvested: '', unitPrice: '', units: '', date: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd({
      ...form,
      amountInvested: parseFloat(form.amountInvested),
      unitPrice: parseFloat(form.unitPrice),
      units: parseFloat(form.units),
    })
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Add Project</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Project Name</label>
            <input className="form-input" placeholder="Startup XYZ" required value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })} />
          </div>
          <div className="grid grid-2 gap-16">
            <div className="form-group">
              <label className="form-label">Amount Invested (€)</label>
              <input className="form-input" type="number" step="0.01" required value={form.amountInvested} onChange={e => setForm({ ...form, amountInvested: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Unit Price (€)</label>
              <input className="form-input" type="number" step="0.01" required value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Number of Units</label>
            <input className="form-input" type="number" step="any" required value={form.units} onChange={e => setForm({ ...form, units: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Investment Date</label>
            <input className="form-input" type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Fundraising() {
  const { portfolio, totals, addFundraising, deleteFundraising, updateAndSave } = usePortfolio()
  const { m } = usePrivacyMask()

  const handleGoalAssign = (assetId, assetType, goalId) => {
    updateAndSave(p => ({
      ...p,
      goals: goalId
        ? assignAssetToGoal(p.goals || [], assetId, assetType, goalId)
        : unassignAsset(p.goals || [], assetId, assetType),
    }))
  }
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="animate-fade-in">
      <div className="card mb-24 page-hero">
        <div className="flex items-center justify-between">
          <div>
            <p className="stat-label">Total Invested — Fundraising</p>
            <p className="stat-value page-hero-value">{m(fmt(totals.fundraising))}</p>
            <p className="stat-sub mt-8">{portfolio.fundraising.length} project{portfolio.fundraising.length > 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Project
          </button>
        </div>
      </div>

      <div className="card card--table">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Amount Invested</th>
                <th>Unit Price</th>
                <th>Number of Units</th>
                <th>Date</th>
                {(portfolio.goals || []).length > 0 && <th>Goal</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {portfolio.fundraising.map(f => (
                <tr key={f.id}>
                  <td>
                    <div className="flex items-center gap-12">
                      <div className="fundraising-project-icon">
                        <Rocket size={16} />
                      </div>
                      <span className="font-semibold">{f.projectName}</span>
                    </div>
                  </td>
                  <td className="font-mono font-semibold">{m(fmt(f.amountInvested))}</td>
                  <td className="font-mono">{m(fmt(f.unitPrice))}</td>
                  <td className="font-mono">{new Intl.NumberFormat('fr-FR').format(f.units)}</td>
                  <td>{f.date ? fmtDate(f.date) : '—'}</td>
                  {(portfolio.goals || []).length > 0 && (
                    <td><GoalSelector assetId={f.id} assetType="fundraising" goals={portfolio.goals} onAssign={handleGoalAssign} /></td>
                  )}
                  <td>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteFundraising(f.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {portfolio.fundraising.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Rocket /></div>
                      <h3>No Projects</h3>
                      <p>Add your fundraising projects to track them here.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <AddFundraisingModal onClose={() => setShowModal(false)} onAdd={addFundraising} />}
    </div>
  )
}
