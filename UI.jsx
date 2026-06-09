import { COLORS, PRIORITY, STATUS } from './constants'

export function Avatar({ profile, size = 26, style: sx = {} }) {
  if (!profile) return null
  const c = COLORS[profile.color] || COLORS.blue
  return (
    <span title={profile.full_name} style={{
      width: size, height: size, borderRadius: '50%', display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38,
      fontWeight: 500, background: c.bg, color: c.color, flexShrink: 0,
      border: '1.5px solid #fff', ...sx,
    }}>
      {profile.initials || '??'}
    </span>
  )
}

export function Badge({ status }) {
  const map = {
    todo:     { bg: '#E1F5EE', c: '#0F6E56' },
    progress: { bg: '#E6F1FB', c: '#185FA5' },
    review:   { bg: '#FAEEDA', c: '#854F0B' },
    done:     { bg: '#EAF3DE', c: '#3B6D11' },
    blocked:  { bg: '#FCEBEB', c: '#A32D2D' },
  }
  const s = map[status] || map.todo
  return (
    <span style={{ background: s.bg, color: s.c, borderRadius: 20, fontSize: 11, fontWeight: 500, padding: '2px 9px', whiteSpace: 'nowrap' }}>
      {STATUS[status]?.label}
    </span>
  )
}

export function PriorityDot({ priority }) {
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY[priority]?.dot || '#888', display: 'inline-block', flexShrink: 0 }} title={PRIORITY[priority]?.label} />
}

export function ProgressBar({ value, color = '#3C3489', height = 4 }) {
  return (
    <div style={{ height, background: '#e5e5e5', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height, background: color, width: `${Math.min(100, Math.max(0, value))}%`, borderRadius: height, transition: 'width .3s' }} />
    </div>
  )
}

export function Btn({ onClick, children, primary, danger, small, disabled, style: sx = {} }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6, cursor: disabled ? 'not-allowed' : 'pointer',
    border: '0.5px solid #ccc', borderRadius: 7, fontSize: small ? 12 : 13,
    padding: small ? '4px 10px' : '7px 14px', fontFamily: 'inherit',
    opacity: disabled ? .45 : 1,
  }
  const variant = primary
    ? { background: '#3C3489', color: '#fff', border: 'none' }
    : danger
    ? { background: 'none', color: '#A32D2D', borderColor: '#F7C1C1' }
    : { background: 'none', color: '#111' }
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variant, ...sx }}>{children}</button>
}

export function FG({ label, children, mb = 14 }) {
  return (
    <div style={{ marginBottom: mb }}>
      <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 5, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

export function Spinner() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40, color: '#888', fontSize: 14 }}>Cargando…</div>
}
