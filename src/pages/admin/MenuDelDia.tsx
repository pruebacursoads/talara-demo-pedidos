import { useState } from 'react'
import type { DB } from '../../lib/types'
import { ejecutar } from '../../lib/store'
import { agregarAlMenu, ajustarStock } from '../../lib/reglas'
import { soles } from '../../lib/fechas'
import { Head, SelectorFecha, produccion } from './comun'

export function MenuDelDia({ db }: { db: DB }) {
  const [menuId, setMenuId] = useState(db.menus[0].id)
  const [edit, setEdit] = useState<Record<number, string>>({})
  const [msg, setMsg] = useState('')
  const [nuevo, setNuevo] = useState({ platoId: 0, stock: '10' })
  const filas = produccion(db, menuId)
  const menu = db.menus.find(m => m.id === menuId)!
  const fuera = db.platos.filter(p => p.activo && !db.mdp.some(m => m.menuId === menuId && m.platoId === p.id))

  const guardar = (mdpId: number) => {
    const r = ejecutar(d => ajustarStock(d, mdpId, Number(edit[mdpId])))
    setMsg(r.ok ? 'Stock actualizado.' : r.error)
    if (r.ok) setEdit(e => { const x = { ...e }; delete x[mdpId]; return x })
  }
  const retirar = (mdpId: number, retirado: boolean) => ejecutar(d => {
    const m = d.mdp.find(x => x.id === mdpId)!
    m.estado = retirado ? 'retirado' : (m.stockInicial - m.stockReservado > 0 ? 'disponible' : 'agotado')
  })

  return (
    <>
      <Head titulo="Menú del día" sub={`Precio del menú ${soles(menu.precioMenu)} · refresco: ${menu.refresco} · stock por plato (tabla menu_dia_platos)`}>
        <SelectorFecha db={db} valor={menuId} onChange={setMenuId} />
      </Head>
      {msg && <div className={'pill ' + (msg.startsWith('Stock') ? 'ok' : 'bad')} role="status" style={{ alignSelf: 'flex-start', padding: '8px 14px', position: 'sticky', top: 10, zIndex: 6, boxShadow: '0 6px 18px rgba(16,35,58,.18)' }}>{msg}</div>}
      <div className="panel">
        <div className="tbl"><table>
          <thead><tr><th>Plato</th><th>Tipo</th><th>Stock inicial</th><th>Vendido</th><th>Disponible</th><th>Precio suelto</th><th>Estado</th><th></th></tr></thead>
          <tbody>{filas.map(({ m, p, t, disp }) => {
            const pct = m.stockInicial ? (disp / m.stockInicial) * 100 : 0
            return (
              <tr key={m.id}>
                <td>{p.icono} {p.nombre}<div className="small muted mono">{p.codigo}</div></td>
                <td>{t.nombre}</td>
                <td style={{ minWidth: 150 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="number" min={0} aria-label={`Stock inicial de ${p.nombre}`} style={{ width: 80 }} value={edit[m.id] ?? m.stockInicial}
                      onChange={e => setEdit(x => ({ ...x, [m.id]: e.target.value }))} />
                    {edit[m.id] !== undefined && <button className="btn sm sea" onClick={() => guardar(m.id)}>Guardar</button>}
                  </div>
                </td>
                <td className="num">{m.stockReservado}</td>
                <td><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="num" style={{ width: 24 }}>{disp}</span>
                  <div className="stockbar" style={{ flex: 1 }}><span style={{ width: pct + '%', background: disp <= db.parametros.umbralStock ? 'var(--rocoto)' : 'var(--ok)' }} /></div></div></td>
                <td className="num">{soles(m.precioSuelto)}</td>
                <td>{m.estado === 'agotado' ? <span className="pill bad">Agotado</span> : m.estado === 'retirado' ? <span className="pill">Retirado</span>
                  : disp <= db.parametros.umbralStock ? <span className="pill warn">Stock bajo</span> : <span className="pill ok">Disponible</span>}</td>
                <td><button className="btn sm" onClick={() => retirar(m.id, m.estado !== 'retirado')}>{m.estado === 'retirado' ? 'Volver a ofrecer' : 'Retirar'}</button></td>
              </tr>)
          })}</tbody>
        </table></div>
        <p className="small muted">Regla de la base de datos: no puedes bajar el stock inicial por debajo de lo ya vendido (CHECK chk_mdp_stock). Pruébalo.</p>
      </div>
      <div className="panel">
        <h2>Agregar un plato a este menú</h2>
        <div className="filters">
          <select aria-label="Plato" value={nuevo.platoId} onChange={e => setNuevo(n => ({ ...n, platoId: Number(e.target.value) }))}>
            <option value={0}>Elige un plato del catálogo…</option>
            {fuera.map(p => <option key={p.id} value={p.id}>{p.nombre} ({db.tipos.find(t => t.id === p.tipoId)?.nombre})</option>)}
          </select>
          <input type="number" min={0} aria-label="Stock" value={nuevo.stock} onChange={e => setNuevo(n => ({ ...n, stock: e.target.value }))} style={{ width: 100, minWidth: 0 }} />
          <button className="btn sea" disabled={!nuevo.platoId} onClick={() => {
            const r = ejecutar(d => agregarAlMenu(d, menuId, nuevo.platoId, Math.max(0, Math.floor(Number(nuevo.stock) || 0))))
            setMsg(r.ok ? 'Stock actualizado: plato agregado al menú.' : r.error); setNuevo({ platoId: 0, stock: '10' })
          }}>Agregar</button>
        </div>
      </div>
    </>
  )
}
