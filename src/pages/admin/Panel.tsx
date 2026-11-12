import { Link } from 'react-router-dom'
import type { DB } from '../../lib/types'
import { fechaLarga, horaDe, soles } from '../../lib/fechas'
import { EstadoPill, Head, produccion } from './comun'

export function Panel({ db }: { db: DB }) {
  const menu = db.menus[0]
  const peds = db.pedidos.filter(p => p.menuId === menu.id)
  const vivos = peds.filter(p => p.estado !== 'anulado')
  const tks = db.tickets.filter(t => t.fecha === menu.fecha && t.estado !== 'anulado')
  const ingreso = vivos.reduce((s, p) => s + p.total, 0)
  const vis = db.visitas.filter(v => v.menuId === menu.id)
  const conv = vis.length ? Math.round(100 * vis.filter(v => v.pedidoId).length / vis.length) : 0
  const bajos = produccion(db, menu.id).filter(x => x.t.rol !== 'adicional' && x.disp <= db.parametros.umbralStock)
  return (
    <>
      <Head titulo="Panel del día" sub={`Menú del ${fechaLarga(menu.fecha)}`}>
        <Link className="btn sea" to="/" target="_blank">Abrir la web del cliente</Link>
      </Head>
      <div className="kpis">
        <div className="kpi"><b>{vivos.length}</b><span>pedidos para hoy</span></div>
        <div className="kpi"><b>{tks.length}</b><span>comidas (tickets)</span></div>
        <div className="kpi"><b>{soles(ingreso)}</b><span>importe reservado</span></div>
        <div className="kpi"><b>{conv} %</b><span>conversión ({vis.length} visitas)</span></div>
      </div>
      <div className="cols">
        <div className="panel">
          <h2>Últimos pedidos</h2>
          <div className="tbl"><table>
            <thead><tr><th>N.°</th><th>Cliente</th><th>Entrega</th><th>Tickets</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody>{db.pedidos.slice(0, 8).map(p => (
              <tr key={p.id}><td className="num">{p.id}</td><td>{p.nombre}{p.requiereRevision && p.estadoRevision === 'pendiente' && <> <span className="pill warn">Revisar</span></>}</td>
                <td>{db.puntos.find(x => x.id === p.puntoId)?.nombre} {p.hora}</td>
                <td className="num">{db.tickets.filter(t => t.pedidoId === p.id && t.estado !== 'anulado').map(t => t.numero).join(', ') || '—'}</td>
                <td className="num">{soles(p.total)}</td><td><EstadoPill e={p.estado} /></td></tr>
            ))}</tbody></table></div>
          <Link to="../pedidos">Ver todos los pedidos</Link>
        </div>
        <div className="panel">
          <h2>Alertas</h2>
          {bajos.length > 0 && <div className="small"><b>Stock bajo:</b> {bajos.map(b => `${b.p.nombre} (${b.disp})`).join(' · ')}</div>}
          <div className="feed">
            {db.eventos.length === 0 && <p className="muted small">Sin alertas por ahora.</p>}
            {db.eventos.slice(0, 12).map(e => (
              <div className="ev" key={e.id}><time>{horaDe(e.at)}</time><span>{e.texto}</span></div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
