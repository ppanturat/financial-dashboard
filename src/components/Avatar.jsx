export function Avatar({ name, avatarUrl, size = 40, style = {} }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const hue = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  const fontSize = size > 50 ? 20 : size > 36 ? 15 : 12
  if (avatarUrl) return (
    <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: '2px solid var(--border-md)', ...style }} />
  )
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue}, 55%, 62%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize, fontFamily: "var(--font-body), sans-serif",
      userSelect: 'none', ...style,
    }}>{initials}</div>
  )
}
