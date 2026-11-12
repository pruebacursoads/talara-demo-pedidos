const pad = (n: number) => String(n).padStart(2, '0')

export const isoFecha = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const hoy = () => isoFecha(new Date())
export const manana = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return isoFecha(d)
}
export const ahora = () => new Date().toISOString()

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export const fechaLarga = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DIAS[dt.getDay()]} ${d} de ${MESES[m - 1]}`
}
export const fechaCorta = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
export const horaDe = (isoDateTime: string) => {
  const d = new Date(isoDateTime)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const soles = (n: number) => `S/ ${n.toFixed(2)}`
