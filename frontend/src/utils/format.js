export const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export const fmtPct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
