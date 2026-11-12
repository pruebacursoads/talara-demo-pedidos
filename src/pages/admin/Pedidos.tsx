import { useState } from 'react'
import type { DB, EstadoPedido, Pedido } from '../../lib/types'
import { ejecutar } from '../../lib/store'
import { anularPedido, anularTicket, avanzarEstado, reimprimir, revisar, validarPago } from '../../lib/reglas'
import { fechaCorta, horaDe, soles } from '../../lib/fechas'
import { descargarCSV, EstadoPill, ESTADO, Head, SelectorFecha } from './comun'

const SIGUIENTE: Partial<Record<EstadoPedido, EstadoPedido>> = { reservado: 'en_preparacion', en_preparacion: 'listo', listo: 'entregado' }

export function Pedidos({ db }: { db: DB }) {
  const [menuId, setMenuId] = useState(db.menus[0].id)
  const [punto, setPunto] = useState(0)
  const [estado, setEstado] = useState('')
  const [q, setQ] = useState('')
  const [abierto, setAbierto] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  const texto = (p: Pedido) => [p.id, p.nombre, p.celular, ...db.tickets.filter(t => t.pedidoId === p.id).map(t => `#${t.numero}`),
    ...db.items.filter(i => db.tickets.find(t => t.id === i.ticketId)?.pedidoId === p.id).map(i => i.descripcion)].join(' ').toLowerCase()
  const lista = db.pedidos.filter(p => p.menuId === menuId && (!punto || p.puntoId === punto) && (!estado || p.estado === estado) && (!q || texto(p).includes(q.toLowerCase())))

  const run = (fn: Parameters<typeof ejecutar>[0], ok: string) => {
    const r = ejecutar(fn)
    setMsg(r.ok ? ok : `No se pudo: ${r.error}`)
  }
  const exportar = () => descargarCSV(`pedidos_${db.menus.find(m => m.id === menuId)!.fecha}.csv`, [
    ['Pedido', 'Fecha', 'Cliente', 'Celular', 'Punto', 'Hora', 'Ticket', 'Tipo', 'Contenido', 'Importe', 'Estado'],
    ...lista.flatMap(p => db.tickets.filter(t => t.pedidoId === p.id).map(t => [p.id, p.fecha, p.nombre, p.celular, db.puntos.find(x => x.id === p.puntoId)!.nombre, p.hora,
      t.numero, t.tipo, db.items.filter(i => i.ticketId === t.id).map(i => (i.codigoRef ? `[${i.codigoRef}] ` : '') + i.descripcion).join(' + '),
      (t.precioBase + t.montoAdicionales - t.descuento).toFixed(2), t.estado === 'anulado' ? 'anulado' : ESTADO[p.estado].txt])),
  ])

  return (
    <>
      <Head titulo="Pedidos" sub="Busca por cliente, celular, N.° de pedido, N.° de ticket (#12) o plato.">
        <SelectorFecha db={db} valor={menuId} onChange={setMenuId} />
        <select aria-label="Punto de entrega" value={punto} onChange={e => setPunto(Number(e.target.value))}>
          <option value={0}>Todos los puntos</option>{db.puntos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select aria-label="Estado" value={estado} onChange={e => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>{Object.entries(ESTADO).map(([k, v]) => <option key={k} value={k}>{v.txt}</option>)}
        </select>
        <input type="text" aria-label="Buscar" placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn" onClick={exportar}>Exportar a Excel</button>
        <button className="btn" onClick={() => run(d => reimprimir(d, db.tickets.filter(t => lista.some(p => p.id === t.pedidoId) && t.estado !== 'anulado').map(t => t.id), 'masivo'), 'Impresión masiva enviada a la cola.')}>Imprimir todos</button>
      </Head>
      {msg && <div className="pill sea" role="status" style={{ alignSelf: 'flex-start', padding: '8px 14px', position: 'sticky', top: 10, zIndex: 6, boxShadow: '0 6px 18px rgba(16,35,58,.18)' }}>{msg}</div>}
      <div className="panel">
        <div className="tbl"><table>
          <thead><tr><th>N.°</th><th>Hora</th><th>Cliente</th><th>Entrega</th><th>Tickets</th><th>Total</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={8} className="muted">No hay pedidos con esos filtros.</td></tr>}
            {lista.map(p => {
              const ts = db.tickets.filter(t => t.pedidoId === p.id)
              const sig = SIGUIENTE[p.estado]
              return [
                <tr key={p.id} className="click" onClick={() => setAbierto(abierto === p.id ? null : p.id)}>
                  <td className="num"><b>{p.id}</b></td><td className="num">{horaDe(p.creadoAt)}</td>
                  <td>{p.nombre}<div className="small muted">+{p.celular}</div>
                    {p.requiereRevision && p.estadoRevision === 'pendiente' && <span className="pill warn">Caso especial</span>}</td>
                  <td>{db.puntos.find(x => x.id === p.puntoId)?.nombre} {p.hora}</td>
                  <td className="num">{ts.map(t => <span key={t.id} style={{ textDecoration: t.estado === 'anulado' ? 'line-through' : undefined, marginRight: 6 }}>#{t.numero}</span>)}</td>
                  <td className="num">{soles(p.total)}{p.estadoPago === 'pendiente' && <div className="small" style={{ color: 'var(--warn)' }}>Adelanto {soles(p.montoAdelanto)}</div>}</td>
                  <td><EstadoPill e={p.estado} /></td>
                  <td onClick={e => e.stopPropagation()}>
                    {p.estadoPago === 'pendiente' && <button className="btn sm sea" onClick={() => run(d => validarPago(d, p.id), `Adelanto del pedido ${p.id} validado.`)}>Validar adelanto</button>}
                    {sig && <button className="btn sm sea" onClick={() => run(d => avanzarEstado(d, p.id, sig), `Pedido ${p.id}: ${ESTADO[sig].txt}.`)}>→ {ESTADO[sig].txt}</button>}
                  </td>
                </tr>,
                abierto === p.id && (
                  <tr key={p.id + '-d'}><td colSpan={8}>
                    <div className="detalle">
                      <div className="small">Fecha de atención {fechaCorta(p.fecha)} · subtotal {soles(p.subtotal)} · descuento {soles(p.descuento)} · total <b>{soles(p.total)}</b>{p.email ? ` · ${p.email}` : ''}</div>
                      {p.observaciones && (
                        <div className="tk-row"><span><b>Observación:</b> {p.observaciones} · revisión: {p.estadoRevision}</span>
                          {p.estadoRevision === 'pendiente' && <span style={{ display: 'flex', gap: 6 }}>
                            <button className="btn sm" onClick={() => run(d => revisar(d, p.id, 'aprobada'), 'Caso especial aprobado.')}>Aprobar</button>
                            <button className="btn sm danger" onClick={() => run(d => revisar(d, p.id, 'rechazada'), 'Caso especial rechazado.')}>Rechazar</button></span>}
                        </div>)}
                      {ts.map(t => {
                        const its = db.items.filter(i => i.ticketId === t.id)
                        return (
                          <div className="tk-row" key={t.id}>
                            <span><b>Ticket #{t.numero}</b> · {t.tipo === 'menu' ? 'Menú' : 'Suelto'}{t.premio ? ' (gratis por fidelidad)' : ''}: {its.map(i => (i.codigoRef ? `[${i.codigoRef}] ` : '') + i.descripcion).join(' + ')}
                              {' '}· {soles(t.precioBase + t.montoAdicionales - t.descuento)} · impreso {t.vecesImpreso} vez/veces
                              {t.estado === 'anulado' && <> <span className="pill bad">Anulado</span></>}</span>
                            <span style={{ display: 'flex', gap: 6 }}>
                              {t.estado !== 'anulado' && <button className="btn sm" onClick={() => run(d => reimprimir(d, [t.id], 'reimpresion'), `Ticket #${t.numero} enviado a imprimir.`)}>Reimprimir</button>}
                              {t.estado === 'activo' && p.estado !== 'entregado' && <button className="btn sm danger" onClick={() => run(d => anularTicket(d, t.id, 'admin', 'Anulado desde la intranet'), `Ticket #${t.numero} anulado; stock devuelto.`)}>Anular ticket</button>}
                            </span>
                          </div>)
                      })}
                      <div className="small muted">Historial: {db.historial.filter(h => h.pedidoId === p.id).slice().reverse().map(h => `${horaDe(h.at)} ${h.de ? ESTADO[h.de].txt + ' → ' : ''}${ESTADO[h.a].txt} (${h.origen})`).join(' · ')}</div>
                      {p.estado !== 'entregado' && p.estado !== 'anulado' && (
                        <button className="btn sm danger" style={{ alignSelf: 'flex-start' }} onClick={() => run(d => anularPedido(d, p.id, 'admin', 'Anulado desde la intranet'), `Pedido ${p.id} anulado; stock devuelto.`)}>Anular pedido completo</button>)}
                    </div>
                  </td></tr>
                ),
              ]
            })}
          </tbody>
        </table></div>
      </div>
    </>
  )
}
