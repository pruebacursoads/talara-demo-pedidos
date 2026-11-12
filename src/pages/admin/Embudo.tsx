import type { DB } from '../../lib/types'
import { horaDe } from '../../lib/fechas'
import { Head } from './comun'

export function Embudo({ db }: { db: DB }) {
  const vis = db.visitas
  const n = vis.length || 1
  const etapas: [string, number][] = [
    ['Vieron el menú', vis.length],
    ['Armaron un pedido', vis.filter(v => v.etapa !== 'vio_menu').length],
    ['Empezaron a poner sus datos', vis.filter(v => v.etapa === 'inicio_datos' || v.etapa === 'confirmo').length],
    ['Confirmaron', vis.filter(v => v.pedidoId).length],
  ]
  const candidatos = vis.filter(v => !v.pedidoId && (v.clienteId || v.celularCapturado))
    .filter(v => !db.pedidos.some(p => p.menuId === v.menuId && p.estado !== 'anulado' && (p.clienteId === v.clienteId || p.celular === v.celularCapturado)))
  return (
    <>
      <Head titulo="Embudo" sub="Cuántos entran y cuántos piden (vista v_embudo_diario). Base para el remarketing." />
      <div className="panel">
        <div className="funnel">
          {etapas.map(([t, c]) => (
            <div className="f" key={t}><span>{t}</span><div className="b"><span style={{ width: `${(c / n) * 100}%` }} /></div><b className="num">{c}</b></div>
          ))}
        </div>
        <p className="small muted">{vis.filter(v => !v.pedidoId).length} visitas sin pedido. De los anónimos solo se sabe cuántos son; son contactables los clientes conocidos y los carritos abandonados con celular.</p>
      </div>
      <div className="panel">
        <h2>Candidatos a remarketing</h2>
        <div className="tbl"><table>
          <thead><tr><th>Hora</th><th>Nombre</th><th>Celular</th><th>Llegó hasta</th><th>Canal sugerido</th></tr></thead>
          <tbody>
            {candidatos.length === 0 && <tr><td colSpan={5} className="muted">No hay candidatos por ahora.</td></tr>}
            {candidatos.map(v => {
              const c = db.clientes.find(x => x.id === v.clienteId)
              return (
                <tr key={v.id}><td className="num">{horaDe(v.inicio)}</td><td>{c?.nombres ?? v.nombreCapturado ?? '—'}</td><td className="mono">+{c?.celular ?? v.celularCapturado}</td>
                  <td>{v.etapa === 'inicio_datos' ? 'Puso sus datos (carrito abandonado)' : v.etapa === 'armo_pedido' ? 'Armó su pedido' : 'Vio el menú'}</td>
                  <td>{c?.aceptaMarketing ? 'Push (gratis) o WhatsApp' : 'Requiere consentimiento'}</td></tr>)
            })}
          </tbody>
        </table></div>
      </div>
    </>
  )
}
