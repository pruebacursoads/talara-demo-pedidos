import type { DB } from '../../lib/types'
import { soles } from '../../lib/fechas'
import { Head } from './comun'

export function Clientes({ db }: { db: DB }) {
  const meta = db.parametros.consumosPremio
  return (
    <>
      <Head titulo="Clientes" sub={`Identificados por celular, sin contraseña. Fidelidad: cada ${meta} menús completos entregados, 1 gratis.`} />
      <div className="panel">
        <div className="tbl"><table>
          <thead><tr><th>Cliente</th><th>Celular</th><th>Pedidos</th><th>Comprado</th><th>Fidelidad</th><th>WhatsApp</th><th>Marketing</th></tr></thead>
          <tbody>{db.clientes.map(c => {
            const peds = db.pedidos.filter(p => p.clienteId === c.id && p.estado !== 'anulado')
            const f = db.fidelidad.find(x => x.clienteId === c.id)
            return (
              <tr key={c.id}>
                <td><b>{c.nombres}</b>{c.email && <div className="small muted">{c.email}</div>}</td>
                <td className="mono">+{c.celular}</td>
                <td className="num">{peds.length}</td>
                <td className="num">{soles(peds.reduce((s, p) => s + p.total, 0))}</td>
                <td style={{ minWidth: 170 }}>
                  <div className="small">{f ? `${f.acumulados}/${meta}` : `0/${meta}`}{f && f.disponibles > 0 && <> · <span className="pill ok">{f.disponibles} gratis</span></>}</div>
                  <div className="stockbar"><span style={{ width: `${((f?.acumulados ?? 0) / meta) * 100}%`, background: 'var(--sea)' }} /></div>
                </td>
                <td>{c.aceptaWhatsapp ? <span className="pill ok">Sí</span> : <span className="pill">No</span>}</td>
                <td>{c.aceptaMarketing ? <span className="pill ok">Sí</span> : <span className="pill">No</span>}</td>
              </tr>)
          })}</tbody>
        </table></div>
        <p className="small muted">Para probar la fidelidad: entrega pedidos de María desde "Pedidos". Le faltan 3 menús para su menú gratis.</p>
      </div>
    </>
  )
}
