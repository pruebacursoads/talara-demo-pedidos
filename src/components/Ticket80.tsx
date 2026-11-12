import type { DB, Ticket } from '../lib/types'
import { fechaCorta, horaDe, soles } from '../lib/fechas'

// Representa el ticket que imprime la térmica de 80 mm (vista v_tickets_detalle).
export function Ticket80({ db, ticket, animar = false, copia }: { db: DB; ticket: Ticket; animar?: boolean; copia?: string }) {
  const p = db.pedidos.find(x => x.id === ticket.pedidoId)!
  const punto = db.puntos.find(x => x.id === p.puntoId)!
  const items = db.items.filter(i => i.ticketId === ticket.id)
  const principales = items.filter(i => i.rol !== 'adicional')
  const adicionales = items.filter(i => i.rol === 'adicional')
  return (
    <div className={'t80' + (animar ? ' printing' : '')}>
      <div className="c lg">Talara!</div>
      <div className="c">Sabores que nos unen</div>
      <hr />
      <div className="c">TICKET</div>
      <div className="c big">#{ticket.numero}</div>
      <div className="c">{ticket.tipo === 'menu' ? 'MENÚ' : 'PLATO SUELTO'}{ticket.premio ? ' · GRATIS' : ''}</div>
      <hr />
      <div>Pedido N.° {p.id} · {fechaCorta(ticket.fecha)}</div>
      <div><b>{p.nombre}</b></div>
      <div>ENTREGA: <b>{punto.nombre.toUpperCase()} {p.hora}</b></div>
      <hr />
      {principales.map(i => (
        <div key={i.id}>{i.rol === 'entrada' ? 'E ' : i.rol === 'fondo' ? 'F ' : '• '}1 x {i.descripcion}</div>
      ))}
      {ticket.tipo === 'menu' && <div>  + Refresco del día</div>}
      {adicionales.map(i => (
        <div key={i.id}><b>[{i.codigoRef}]</b> {i.cantidad} x {i.descripcion}</div>
      ))}
      {p.observaciones && <><hr /><div>OBS: {p.observaciones}</div></>}
      <hr />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>TOTAL TICKET</span><b>{soles(ticket.precioBase + ticket.montoAdicionales - ticket.descuento)}</b></div>
      <div className="c" style={{ marginTop: 6, fontSize: 11 }}>{copia ?? 'Copia bolsa'} · {horaDe(p.creadoAt)}</div>
      {ticket.estado === 'anulado' && <div className="anul">ANULADO</div>}
    </div>
  )
}
