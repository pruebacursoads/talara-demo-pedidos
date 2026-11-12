import { useState } from 'react'
import type { DB } from '../../lib/types'
import { ejecutar } from '../../lib/store'
import { horaDe } from '../../lib/fechas'
import { Ticket80 } from '../../components/Ticket80'
import { Head, agenteConectado } from './comun'

export function Impresion({ db }: { db: DB }) {
  const [conectado, setConectado] = useState(agenteConectado.get())
  const [imprimir, setImprimir] = useState<number | null>(null)
  const recientes = db.trabajos.filter(t => t.estado === 'impreso').slice(0, 6)
  const pendientes = db.trabajos.filter(t => t.estado === 'pendiente')
  const ultimo = recientes[0]?.id

  const imprimirDeVerdad = (ticketId: number) => { setImprimir(ticketId); setTimeout(() => { window.print(); setImprimir(null) }, 50) }

  return (
    <>
      <Head titulo="Impresión" sub="Cola de impresión (trabajos_impresion) y agente del local. Cada ticket confirmado se imprime solo.">
        <label className="switch"><input type="checkbox" checked={db.parametros.impresionAutomatica}
          onChange={e => ejecutar(d => { d.parametros.impresionAutomatica = e.target.checked })} />Impresión automática</label>
        <label className="switch"><input type="checkbox" checked={conectado}
          onChange={e => { agenteConectado.set(e.target.checked); setConectado(e.target.checked); ejecutar(() => undefined) }} />Agente conectado</label>
      </Head>
      <div className="kpis">
        <div className="kpi"><b>{pendientes.length}</b><span>en cola (pendientes)</span></div>
        <div className="kpi"><b>{db.trabajos.filter(t => t.estado === 'impreso').length}</b><span>impresos hoy</span></div>
        <div className="kpi"><b>{conectado ? 'En línea' : 'Desconectado'}</b><span>agente-cocina-01</span></div>
        <div className="kpi"><b>80 mm</b><span>térmica ESC/POS · 2 copias</span></div>
      </div>
      {!conectado && pendientes.length > 0 && <div className="pill warn" style={{ alignSelf: 'flex-start', padding: '6px 12px' }}>El agente está desconectado: los tickets esperan en la cola y se imprimen al reconectar.</div>}
      <div className="panel">
        <h2>Lo que salió de la impresora</h2>
        <div className="printer">
          {recientes.length === 0 && <p className="muted">Aún no se imprime nada.</p>}
          {recientes.map(tr => {
            const t = db.tickets.find(x => x.id === tr.ticketId)!
            return (
              <div key={tr.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 240 }}>
                <Ticket80 db={db} ticket={t} animar={tr.id === ultimo} />
                <span className="small muted">{tr.origen} · {horaDe(tr.impresoAt ?? tr.at)}</span>
                <button className="btn sm" onClick={() => imprimirDeVerdad(t.id)}>Imprimir en esta PC</button>
              </div>)
          })}
        </div>
      </div>
      <div className="panel">
        <h2>Cola</h2>
        <div className="tbl"><table>
          <thead><tr><th>Trabajo</th><th>Ticket</th><th>Pedido</th><th>Origen</th><th>Estado</th><th>Hora</th></tr></thead>
          <tbody>{db.trabajos.slice(0, 15).map(tr => (
            <tr key={tr.id}><td className="num">{tr.id}</td><td className="num">#{db.tickets.find(t => t.id === tr.ticketId)?.numero}</td><td className="num">{tr.pedidoId}</td>
              <td>{tr.origen}</td><td>{tr.estado === 'impreso' ? <span className="pill ok">Impreso</span> : <span className="pill warn">Pendiente</span>}</td><td className="num">{horaDe(tr.at)}</td></tr>
          ))}</tbody>
        </table></div>
      </div>
      {imprimir && <div className="print-area"><Ticket80 db={db} ticket={db.tickets.find(t => t.id === imprimir)!} /></div>}
    </>
  )
}
