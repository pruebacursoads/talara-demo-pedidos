import { useState } from 'react'
import type { DB } from '../../lib/types'
import { Head, SelectorFecha, produccion } from './comun'

export function Cocina({ db }: { db: DB }) {
  const [menuId, setMenuId] = useState(db.menus[0].id)
  const filas = produccion(db, menuId).filter(x => x.cant > 0)
  const tipos = [...new Set(filas.map(f => f.t.nombre))]
  const porPunto = db.puntos.map(pt => {
    const peds = db.pedidos.filter(p => p.menuId === menuId && p.puntoId === pt.id && p.estado !== 'anulado')
    const tks = db.tickets.filter(t => peds.some(p => p.id === t.pedidoId) && t.estado !== 'anulado')
    return { pt, peds: peds.length, tks: tks.length }
  })
  return (
    <>
      <Head titulo="Cocina" sub="Lo que hay que preparar (vista v_produccion_cocina). Descuenta lo anulado.">
        <SelectorFecha db={db} valor={menuId} onChange={setMenuId} />
      </Head>
      <div className="kpis">
        {porPunto.map(x => <div className="kpi" key={x.pt.id}><b>{x.tks}</b><span>comidas para {x.pt.nombre} ({x.pt.hora}) · {x.peds} pedidos</span></div>)}
      </div>
      <div className="cols">
        {tipos.map(tp => (
          <div className="panel" key={tp}>
            <h2>{tp}</h2>
            <div className="tbl"><table>
              <thead><tr><th>Plato</th><th>A preparar</th><th>Quedan</th></tr></thead>
              <tbody>{filas.filter(f => f.t.nombre === tp).map(f => (
                <tr key={f.m.id}><td>{f.p.icono} {f.p.nombre}</td><td className="num"><b style={{ fontSize: 18 }}>{f.cant}</b></td>
                  <td className="num">{f.disp === 0 ? <span className="pill bad">Agotado</span> : f.disp}</td></tr>
              ))}</tbody>
            </table></div>
          </div>
        ))}
        {tipos.length === 0 && <div className="panel"><p className="muted">Aún no hay pedidos para esta fecha.</p></div>}
      </div>
    </>
  )
}
