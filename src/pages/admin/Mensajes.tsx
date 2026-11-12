import type { DB } from '../../lib/types'
import { ejecutar } from '../../lib/store'
import { enviarResumen } from '../../lib/reglas'
import { horaDe, soles } from '../../lib/fechas'
import { Head } from './comun'

const MOTIVO: Record<string, string> = {
  confirmacion_pedido: 'Confirmación', recordatorio_pago: 'Adelanto', anulacion: 'Anulación', alerta_admin: 'Alerta al admin', remarketing: 'Remarketing',
}

export function Mensajes({ db }: { db: DB }) {
  const usd = db.notificaciones.reduce((s, n) => s + n.costoUsd, 0)
  const conf = db.notificaciones.filter(n => n.motivo === 'confirmacion_pedido').length
  const proyeccion = 90 * 22 * db.parametros.costoUtilidadUsd * db.parametros.tipoCambio
  return (
    <>
      <Head titulo="WhatsApp y alertas" sub="Bitácora de mensajes (tabla notificaciones) con su costo. Plantillas de utilidad ≈ US$ 0.03.">
        <button className="btn sea" onClick={() => ejecutar(d => enviarResumen(d))}>Enviar resumen de las 12:00 ahora</button>
      </Head>
      <div className="kpis">
        <div className="kpi"><b>{db.notificaciones.length}</b><span>mensajes enviados</span></div>
        <div className="kpi"><b>{conf}</b><span>confirmaciones de pedido</span></div>
        <div className="kpi"><b>US$ {usd.toFixed(2)}</b><span>≈ {soles(usd * db.parametros.tipoCambio)} en esta demo</span></div>
        <div className="kpi"><b>{soles(proyeccion)}</b><span>proyección mensual (90 pedidos/día × 22)</span></div>
      </div>
      <div className="panel">
        <div className="tbl"><table>
          <thead><tr><th>Hora</th><th>Tipo</th><th>Para</th><th>Mensaje</th><th>Costo</th></tr></thead>
          <tbody>{db.notificaciones.map(n => (
            <tr key={n.id}><td className="num">{horaDe(n.at)}</td><td><span className={'pill ' + (n.motivo === 'alerta_admin' ? 'rocoto' : 'sea')}>{MOTIVO[n.motivo]}</span></td>
              <td>{n.destino}</td><td style={{ maxWidth: 520 }}>{n.texto}</td><td className="num">US$ {n.costoUsd.toFixed(2)}</td></tr>
          ))}</tbody>
        </table></div>
      </div>
    </>
  )
}
