import { useState } from 'react'
import type { DB, Rol } from '../../lib/types'
import { ejecutar } from '../../lib/store'
import { crearPlato, crearPunto, crearTipo } from '../../lib/reglas'
import { soles } from '../../lib/fechas'
import { Head } from './comun'

const ROLES: [Rol, string][] = [['entrada', 'Entrada (arma menú)'], ['fondo', 'Fondo (arma menú)'], ['independiente', 'Se vende solo'], ['adicional', 'Adicional']]

export function Catalogos({ db }: { db: DB }) {
  const [msg, setMsg] = useState('')
  const [tipo, setTipo] = useState({ nombre: '', rol: 'entrada' as Rol })
  const [punto, setPunto] = useState({ nombre: '', hora: '13:00' })
  const [plato, setPlato] = useState({ nombre: '', tipoId: 1, precio: '5', icono: '🍽️' })
  const run = (fn: (d: DB) => void, ok: string) => { const r = ejecutar(fn); setMsg(r.ok ? ok : r.error) }
  const toggle = (tabla: 'tipos' | 'platos' | 'puntos', id: number) => ejecutar(d => {
    const x = (d[tabla] as { id: number; activo: boolean }[]).find(y => y.id === id)!
    x.activo = !x.activo
  })
  return (
    <>
      <Head titulo="Catálogos" sub="Mantenimiento de tipos de plato (sin límite), platos y puntos de entrega. Nada se borra: se desactiva." />
      {msg && <div className="pill sea" role="status" style={{ alignSelf: 'flex-start', padding: '8px 14px', position: 'sticky', top: 10, zIndex: 6, boxShadow: '0 6px 18px rgba(16,35,58,.18)' }}>{msg}</div>}
      <div className="cols">
        <div className="panel">
          <h2>Tipos de plato</h2>
          <div className="tbl"><table><thead><tr><th>Código</th><th>Nombre</th><th>Rol</th><th></th></tr></thead>
            <tbody>{db.tipos.map(t => (
              <tr key={t.id}><td className="mono">{t.codigo}</td><td>{t.nombre}</td><td>{ROLES.find(r => r[0] === t.rol)?.[1]}</td>
                <td><button className="btn sm" onClick={() => toggle('tipos', t.id)}>{t.activo ? 'Desactivar' : 'Activar'}</button></td></tr>))}</tbody></table></div>
          <div className="filters">
            <input type="text" aria-label="Nombre del tipo" placeholder="Ej.: Sopas" value={tipo.nombre} onChange={e => setTipo(x => ({ ...x, nombre: e.target.value }))} />
            <select aria-label="Rol" value={tipo.rol} onChange={e => setTipo(x => ({ ...x, rol: e.target.value as Rol }))}>{ROLES.map(([r, l]) => <option key={r} value={r}>{l}</option>)}</select>
            <button className="btn sea" onClick={() => { run(d => crearTipo(d, tipo.nombre, tipo.rol), `Tipo "${tipo.nombre}" creado.`); setTipo({ nombre: '', rol: 'entrada' }) }}>Crear tipo</button>
          </div>
        </div>
        <div className="panel">
          <h2>Puntos de entrega</h2>
          <div className="tbl"><table><thead><tr><th>Código</th><th>Punto</th><th>Hora</th><th></th></tr></thead>
            <tbody>{db.puntos.map(p => (
              <tr key={p.id}><td className="mono">{p.codigo}</td><td>{p.nombre}</td><td className="num">{p.hora}</td>
                <td><button className="btn sm" onClick={() => toggle('puntos', p.id)}>{p.activo ? 'Desactivar' : 'Activar'}</button></td></tr>))}</tbody></table></div>
          <div className="filters">
            <input type="text" aria-label="Nombre del punto" placeholder="Ej.: Cubo" value={punto.nombre} onChange={e => setPunto(x => ({ ...x, nombre: e.target.value }))} />
            <input type="time" aria-label="Hora de entrega" value={punto.hora} onChange={e => setPunto(x => ({ ...x, hora: e.target.value }))} style={{ minWidth: 0, width: 120 }} />
            <button className="btn sea" onClick={() => { run(d => crearPunto(d, punto.nombre, punto.hora), `Punto "${punto.nombre}" creado.`); setPunto({ nombre: '', hora: '13:00' }) }}>Crear punto</button>
          </div>
        </div>
      </div>
      <div className="panel">
        <h2>Platos</h2>
        <div className="filters">
          <input type="text" aria-label="Nombre del plato" placeholder="Nombre del plato" value={plato.nombre} onChange={e => setPlato(x => ({ ...x, nombre: e.target.value }))} />
          <select aria-label="Tipo" value={plato.tipoId} onChange={e => setPlato(x => ({ ...x, tipoId: Number(e.target.value) }))}>{db.tipos.filter(t => t.activo).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
          <input type="number" aria-label="Precio suelto" min={0} step="0.5" value={plato.precio} onChange={e => setPlato(x => ({ ...x, precio: e.target.value }))} style={{ width: 100, minWidth: 0 }} />
          <input type="text" aria-label="Ícono" value={plato.icono} onChange={e => setPlato(x => ({ ...x, icono: e.target.value }))} style={{ width: 70, minWidth: 0 }} />
          <button className="btn sea" onClick={() => { run(d => crearPlato(d, plato.nombre, plato.tipoId, Number(plato.precio), plato.icono), `Plato "${plato.nombre}" creado.`); setPlato(x => ({ ...x, nombre: '' })) }}>Crear plato</button>
        </div>
        <div className="tbl"><table><thead><tr><th>Código</th><th>Plato</th><th>Tipo</th><th>Precio suelto</th><th></th></tr></thead>
          <tbody>{db.platos.map(p => (
            <tr key={p.id} style={{ opacity: p.activo ? 1 : .5 }}><td className="mono">{p.codigo}</td><td>{p.icono} {p.nombre}</td><td>{db.tipos.find(t => t.id === p.tipoId)?.nombre}</td>
              <td className="num">{soles(p.precioSuelto)}</td><td><button className="btn sm" onClick={() => toggle('platos', p.id)}>{p.activo ? 'Desactivar' : 'Activar'}</button></td></tr>))}</tbody></table></div>
      </div>
    </>
  )
}
