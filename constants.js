export const STATUS = {
  todo:     { label: 'Por hacer' },
  progress: { label: 'En progreso' },
  review:   { label: 'En revisión' },
  done:     { label: 'Completada' },
  blocked:  { label: 'Bloqueada' },
}

export const PRIORITY = {
  critical: { label: 'Crítica',  dot: '#E24B4A' },
  high:     { label: 'Alta',     dot: '#EF9F27' },
  medium:   { label: 'Media',    dot: '#378ADD' },
  low:      { label: 'Baja',     dot: '#888780' },
}

export const TAGS = [
  'Backend', 'Frontend', 'Infraestructura',
  'QA / Testing', 'Datos', 'Diseño',
]

export const COLORS = {
  purple: { bg: '#EEEDFE', color: '#3C3489' },
  teal:   { bg: '#E1F5EE', color: '#0F6E56' },
  blue:   { bg: '#E6F1FB', color: '#185FA5' },
  coral:  { bg: '#FAECE7', color: '#993C1D' },
}

export function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function isOverdue(task) {
  return task.status !== 'done' && task.due_date && new Date(task.due_date) < new Date()
}

export function quadrant(task) {
  const hi = task.impact >= 6, loE = task.effort <= 5
  if (hi && loE)  return 'do-first'
  if (hi && !loE) return 'plan'
  if (!hi && loE) return 'fill-in'
  return 'avoid'
}

export const QUADS = {
  'do-first': { label: 'Hacer primero',    sub: 'Alto impacto · bajo esfuerzo',  bg: '#EAF3DE', bc: '#C0DD97', tc: '#3B6D11' },
  'plan':     { label: 'Planificar',        sub: 'Alto impacto · alto esfuerzo',  bg: '#E6F1FB', bc: '#B5D4F4', tc: '#185FA5' },
  'fill-in':  { label: 'Relleno',           sub: 'Bajo impacto · bajo esfuerzo',  bg: '#FAEEDA', bc: '#FAC775', tc: '#854F0B' },
  'avoid':    { label: 'Evitar / delegar',  sub: 'Bajo impacto · alto esfuerzo',  bg: '#FCEBEB', bc: '#F7C1C1', tc: '#A32D2D' },
}
