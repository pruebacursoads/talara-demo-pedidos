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
              <tbody>{(() => {
                const rows = filas.filter(f => f.t.nombre === tp)
                const vistos = new Set<string>()
                return rows.flatMap(f => {
                  const fila = (x: typeof f, sub: boolean) => (
                    <tr key={x.m.id}><td style={sub ? { paddingLeft: 30 } : undefined}>{sub ? `${x.p.etiquetaVariante ?? 'Opción'}: ${x.p.variante}` : <>{x.p.icono} {x.p.nombre}</>}</td>
                      <td className="num"><b style={{ fontSize: sub ? 15 : 18 }}>{x.cant}</b></td>
                      <td className="num">{x.disp === 0 ? <span className="pill bad">Agotado</span> : x.disp}</td></tr>)
                  if (!f.p.familia) return [fila(f, false)]
                  if (vistos.has(f.p.familia)) return []
                  vistos.add(f.p.familia)
                  const fam = rows.filter(x => x.p.familia === f.p.familia)
                  return [
                    <tr key={'fam-' + f.p.familia} style={{ background: 'var(--sunken)' }}><td><b>{f.p.icono} {f.p.familia}</b></td>
                      <td className="num"><b style={{ fontSize: 18 }}>{fam.reduce((s, x) => s + x.cant, 0)}</b></td><td /></tr>,
                    ...fam.map(x => fila(x, true)),
                  ]
                })
              })()}</tbody>
            </table></div>
          </div>
        ))}
        {tipos.length === 0 && <div className="panel"><p className="muted">Aún no hay pedidos para esta fecha.</p></div>}
      </div>
    </>
  )
}
