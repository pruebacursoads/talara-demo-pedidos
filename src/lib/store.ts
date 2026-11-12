// Almacén de la demo: la "base de datos" vive en localStorage y se sincroniza entre pestañas
// (web pública en una ventana, intranet en otra). Cada operación trabaja sobre una copia:
// si la regla lanza un error, la copia se descarta y nada cambia (como un ROLLBACK).
import { useSyncExternalStore } from 'react'
import type { DB } from './types'
import { ErrorNegocio } from './types'
import { crearBaseInicial, VERSION } from './seed'
import { hoy } from './fechas'

const KEY = 'talara-demo-db'
let db: DB = cargar()
const subs = new Set<() => void>()

function cargar(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw) as DB
      // Si la base guardada es de otro día, se regenera con el menú de hoy.
      if (d.version === VERSION && d.menus?.[0]?.fecha === hoy()) return d
    }
  } catch { /* sin almacenamiento: se usa una base nueva en memoria */ }
  const nueva = crearBaseInicial()
  guardar(nueva)
  return nueva
}
function guardar(d: DB) {
  try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* modo privado */ }
}
const avisar = () => subs.forEach(f => f())

window.addEventListener('storage', e => {
  if (e.key === KEY && e.newValue) {
    try { db = JSON.parse(e.newValue) as DB; avisar() } catch { /* ignorar */ }
  }
})

export function useDB(): DB {
  return useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => db)
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string; codigo: string }

export function ejecutar<T>(op: (borrador: DB) => T): Resultado<T> {
  const borrador = structuredClone(db)
  try {
    const valor = op(borrador)
    db = borrador
    guardar(db)
    avisar()
    return { ok: true, valor }
  } catch (e) {
    if (e instanceof ErrorNegocio) return { ok: false, error: e.message, codigo: e.codigo }
    console.error(e)
    return { ok: false, error: 'Ocurrió un error inesperado.', codigo: 'ERROR' }
  }
}

export function reiniciarDemo() {
  db = crearBaseInicial()
  guardar(db)
  avisar()
}

// "¿No eres tú?": desvincula este navegador del cliente (útil en equipos compartidos).
export function olvidarDispositivo() {
  try { localStorage.setItem('talara-dispositivo', crypto.randomUUID()) } catch { /* sin almacenamiento */ }
  window.location.reload()
}

export function tokenDispositivo(): string {
  try {
    let t = localStorage.getItem('talara-dispositivo')
    if (!t) { t = crypto.randomUUID(); localStorage.setItem('talara-dispositivo', t) }
    return t
  } catch { return 'sin-almacenamiento' }
}
