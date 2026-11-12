import type { ReactNode } from 'react'
import type { DB, EstadoPedido } from '../../lib/types'
import { disponible } from '../../lib/reglas'

// Estado del agente de impresión simulado (solo en este navegador).
export const agenteConectado = {
  get: () => { try { return localStorage.getItem('talara-agente') !== '0' } catch { return true } },
  set: (v: boolean) => { try { localStorage.setItem('talara-agente', v ? '1' : '0') } catch { /* sin almacenamiento */ } },
}

export const ESTADO:Record<EstadoPedido, { txt: string; cls: string }> = {
  pendiente_pago: { txt: 'Pendiente de pago', cls: 'warn' },
  reservado: { txt: 'Reservado', cls: 'sea' },
  en_preparacion: { txt: 'En preparación', cls: 'rocoto' },
  listo: { txt: 'Listo', cls: 'ok' },
  entregado: { txt: 'Entregado', cls: '' },
  anulado: { txt: 'Anulado', cls: 'bad' },
}

export function EstadoPill({ e }: { e: EstadoPedido }) {
  return <span className={'pill ' + ESTADO[e].cls}>{ESTADO[e].txt}</span>
}

export function Head({ titulo, sub, children }: { titulo: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="adm-head">
      <div><h1>{titulo}</h1>{sub && <p className="muted">{sub}</p>}</div>
      {children && <div className="filters">{children}</div>}
    </div>
  )
}

export function SelectorFecha({ db, valor, onChange }: { db: DB; valor: number; onChange: (id: number) => void }) {
  return (
    <select aria-label="Fecha de atención" value={valor} onChange={e => onChange(Number(e.target.value))}>
      {db.menus.map((m, i) => <option key={m.id} value={m.id}>{i === 0 ? 'Hoy' : 'Mañana'} · {m.fecha.split('-').reverse().join('/')}</option>)}
    </select>
  )
}

export function produccion(db: DB, menuId: number) {
  return db.mdp.filter(m => m.menuId === menuId).map(m => {
    const p = db.platos.find(x => x.id === m.platoId)!
    const t = db.tipos.find(x => x.id === p.tipoId)!
    const cant = db.items.filter(i => i.mdpId === m.id && i.estado === 'activo' && db.tickets.find(tk => tk.id === i.ticketId)?.estado !== 'anulado')
      .reduce((s, i) => s + i.cantidad, 0)
    return { m, p, t, cant, disp: disponible(m) }
  }).sort((a, b) => a.t.orden - b.t.orden || b.cant - a.cant)
}

export function descargarCSV(nombre: string, filas: (string | number)[][]) {
  const csv = '﻿' + filas.map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = nombre; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
