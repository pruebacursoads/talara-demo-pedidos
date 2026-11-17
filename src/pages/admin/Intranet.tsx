import { useEffect, useRef, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { ejecutar, reiniciarDemo, useDB } from '../../lib/store'
import { marcarImpreso } from '../../lib/reglas'
import { Panel } from './Panel'
import { Pedidos } from './Pedidos'
import { Cocina } from './Cocina'
import { MenuDelDia } from './MenuDelDia'
import { Impresion } from './Impresion'
import { Mensajes } from './Mensajes'
import { Clientes } from './Clientes'
import { Embudo } from './Embudo'
import { Catalogos } from './Catalogos'
import { agenteConectado } from './comun'

const LINKS: [string, string][] = [
  ['panel', 'Panel'], ['pedidos', 'Pedidos'], ['cocina', 'Cocina'], ['menu', 'Menú del día'], ['impresion', 'Impresión'],
  ['mensajes', 'WhatsApp y alertas'], ['clientes', 'Clientes'], ['embudo', 'Embudo'], ['catalogos', 'Catálogos'],
]

export default function Intranet() {
  const db = useDB()
  const [toasts, setToasts] = useState<{ id: number; txt: string }[]>([])
  const vistos = useRef(new Set<number>(db.trabajos.filter(t => t.estado === 'impreso').map(t => t.id)))

  // Agente de impresión simulado: imprime cada trabajo pendiente ~1 s después de llegar.
  useEffect(() => {
    if (!agenteConectado.get() || !db.parametros.impresionAutomatica) return
    const pend = db.trabajos.filter(t => t.estado === 'pendiente' && !vistos.current.has(t.id))
    if (!pend.length) return
    pend.forEach(t => vistos.current.add(t.id))
    const timer = setTimeout(() => {
      pend.forEach(t => ejecutar(d => marcarImpreso(d, t.id)))
      const nums = pend.map(t => db.tickets.find(x => x.id === t.ticketId)?.numero).join(', ')
      const id = Date.now()
      setToasts(x => [...x, { id, txt: `Impresora cocina: ${pend.length} ticket(s) impreso(s) · N.° ${nums}` }])
      setTimeout(() => setToasts(x => x.filter(y => y.id !== id)), 5000)
    }, 1000)
    return () => clearTimeout(timer)
  }, [db])

  const pendRevision = db.pedidos.filter(p => p.estadoRevision === 'pendiente' || p.estadoPago === 'pendiente').length
  const nav = (cls: string) => LINKS.map(([to, label]) => (
    <NavLink key={to} to={`/intranet/${to}`} className={({ isActive }) => (isActive ? 'active ' : '') + cls}>
      <span>{label}</span>{to === 'pedidos' && pendRevision > 0 && <span className="badge">{pendRevision}</span>}
    </NavLink>
  ))

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="logo">Talara<span>!</span><small>Intranet</small></div>
        <nav className="adm-nav">{nav('')}</nav>
        <div className="foot">
          <span>Sesión: Administradora (demo)</span>
          <a href="#/" style={{ color: '#fff' }}>Ver web del cliente</a>
          <button className="btn sm" onClick={() => reiniciarDemo()}>Reiniciar datos de la demo</button>
        </div>
      </aside>
      <div style={{ minWidth: 0 }}>
        <nav className="mobile-nav">{nav('')}<a href="#/">Web</a></nav>
        <main className="adm-main">
          <Routes>
            <Route index element={<Navigate to="/intranet/panel" replace />} />
            <Route path="panel" element={<Panel db={db} />} />
            <Route path="pedidos" element={<Pedidos db={db} />} />
            <Route path="cocina" element={<Cocina db={db} />} />
            <Route path="menu" element={<MenuDelDia db={db} />} />
            <Route path="impresion" element={<Impresion db={db} />} />
            <Route path="mensajes" element={<Mensajes db={db} />} />
            <Route path="clientes" element={<Clientes db={db} />} />
            <Route path="embudo" element={<Embudo db={db} />} />
            <Route path="catalogos" element={<Catalogos db={db} />} />
          </Routes>
        </main>
      </div>
      <div className="toast-wrap" aria-live="polite">{toasts.map(t => <div className="toast" key={t.id}>{t.txt}</div>)}</div>
    </div>
  )
}
