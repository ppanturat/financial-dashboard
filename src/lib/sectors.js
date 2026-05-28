// Sector metadata — keys match backend normalise_sector() output
export const SECTORS = {
  tech:        { label: 'Tech',       color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
  health:      { label: 'Health',     color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  finance:     { label: 'Finance',    color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  consumer:    { label: 'Consumer',   color: '#db2777', bg: 'rgba(219,39,119,0.12)' },
  comms:       { label: 'Comms',      color: '#9333ea', bg: 'rgba(147,51,234,0.12)' },
  industrial:  { label: 'Industrial', color: '#0891b2', bg: 'rgba(8,145,178,0.12)' },
  energy:      { label: 'Energy',     color: '#ea580c', bg: 'rgba(234,88,12,0.12)' },
  materials:   { label: 'Materials',  color: '#65a30d', bg: 'rgba(101,163,13,0.12)' },
  realestate:  { label: 'Real Est.',  color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
  utilities:   { label: 'Utilities',  color: '#0d9488', bg: 'rgba(13,148,136,0.12)' },
}

export function getSector(key) {
  if (!key) return null
  return SECTORS[key] ?? { label: key, color: 'var(--muted)', bg: 'rgba(128,128,128,0.1)' }
}
