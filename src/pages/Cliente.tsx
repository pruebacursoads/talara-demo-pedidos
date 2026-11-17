import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ejecutar, olvidarDispositivo, tokenDispositivo, useDB } from '../lib/store'
import { anularTicket, avanzarVisita, disponible, registrarComprobante, registrarPedido, registrarVisita } from '../lib/reglas'
import type { ComidaInput } from '../lib/reglas'
import type { DB, MenuDiaPlato } from '../lib/types'
import { fechaLarga, soles, horaDe } from '../lib/fechas'
import { Ticket80 } from '../components/Ticket80'
import { BannerDemo } from '../components/BannerDemo'

interface Comida extends ComidaInput { key: number }
type Info = {
  m: MenuDiaPlato; nombre: string; desc: string; icono: string; rol: string; tipo: string; orden: number
  grupo: string; titulo: string; variante?: string; etiqueta?: string
}

function infoMenu(db: DB, menuId: number): Info[] {
  return db.mdp.filter(m => m.menuId === menuId && m.estado !== 'retirado').map(m => {
    const p = db.platos.find(x => x.id === m.platoId)!
    const t = db.tipos.find(x => x.id === p.tipoId)!
    return {
      m, nombre: p.nombre, desc: p.descripcion, icono: p.icono, rol: t.rol, tipo: t.nombre, orden: t.orden,
      grupo: p.familia ? `f:${p.familia}` : `p:${m.id}`, titulo: p.familia ?? p.nombre, variante: p.variante, etiqueta: p.etiquetaVariante,
    }
  }).filter(i => db.tipos.find(t => t.nombre === i.tipo)?.visibleWeb)
}

// Agrupa las variantes de un mismo plato (ej. Arroz con pollo: pierna, pecho, encuentro) en una sola tarjeta.
function agrupar(items: Info[]) {
  const mapa = new Map<string, Info[]>()
  items.forEach(i => mapa.set(i.grupo, [...(mapa.get(i.grupo) ?? []), i]))
  return [...mapa.values()]
}

export default function Cliente() {
  const db = useDB()
  const token = useMemo(() => tokenDispositivo(), [])
  const [manana, setManana] = useState(false)
  const menu = db.menus[manana ? 1 : 0]
  const [carrito, setCarrito] = useState<Comida[]>([])
  const [armando, setArmando] = useState<{ entrada?: number; fondo?: number }>({})
  const [abierto, setAbierto] = useState(false)
  const [resultado, setResultado] = useState<number | null>(null)
  const [visitaId, setVisitaId] = useState<number | undefined>()
  const [presa, setPresa] = useState<Record<string, number>>({})
  const keyRef = useRef(1)

  const dispositivo = db.dispositivos.find(d => d.token === token)
  const conocido = db.clientes.find(c => c.id === dispositivo?.clienteId)
  const fid = db.fidelidad.find(f => f.clienteId === conocido?.id)

  useEffect(() => {
    const r = ejecutar(d => registrarVisita(d, token, menu.id))
    if (r.ok) setVisitaId(r.valor)
    setCarrito([]); setArmando({}); setResultado(null)
  }, [menu.id, token])

  const items = infoMenu(db, menu.id)
  const enCarrito = (mdpId: number) => carrito.reduce((s, c) => s + c.mdpIds.filter(x => x === mdpId).length + c.adicionales.filter(a => a.mdpId === mdpId).reduce((t, a) => t + a.cantidad, 0), 0)
  const libre = (m: MenuDiaPlato) => Math.max(0, disponible(m) - enCarrito(m.id))
  const nombreDe = (mdpId: number) => items.find(i => i.m.id === mdpId)?.nombre ?? ''
  const precioComida = (c: Comida) => (c.tipo === 'menu' ? menu.precioMenu : items.find(i => i.m.id === c.mdpIds[0])!.m.precioSuelto)
    + c.adicionales.reduce((s, a) => s + a.cantidad * items.find(i => i.m.id === a.mdpId)!.m.precioSuelto, 0)
  const total = carrito.reduce((s, c) => s + precioComida(c), 0)

  const agregar = (c: Omit<Comida, 'key'>) => {
    if (carrito.length >= 10) return
    setCarrito(x => [...x, { ...c, key: keyRef.current++ }])
    if (visitaId) ejecutar(d => avanzarVisita(d, visitaId, 'armo_pedido'))
  }
  const elegir = (rol: 'entrada' | 'fondo', mdpId: number) => {
    const sig = { ...armando, [rol]: armando[rol] === mdpId ? undefined : mdpId }
    if (sig.entrada && sig.fondo) {
      agregar({ tipo: 'menu', mdpIds: [sig.entrada, sig.fondo], adicionales: [] })
      setArmando({})
    } else setArmando(sig)
  }
  const addAdicional = (key: number, mdpId: number) => setCarrito(cs => cs.map(c => {
    if (c.key !== key) return c
    const ya = c.adicionales.find(a => a.mdpId === mdpId)
    return { ...c, adicionales: ya ? c.adicionales.map(a => a.mdpId === mdpId ? { ...a, cantidad: a.cantidad + 1 } : a) : [...c.adicionales, { mdpId, cantidad: 1 }] }
  }))

  if (resultado) return <Confirmacion db={db} pedidoId={resultado} onNuevo={() => { setResultado(null); setCarrito([]) }} />

  const secciones = [...new Set(items.sort((a, b) => a.orden - b.orden).map(i => i.tipo))]
  const adicionales = items.filter(i => i.rol === 'adicional')

  return (
    <>
      <BannerDemo />
      <header className="pub-top"><div className="in">
        <Link to="/" className="logo">Talara<span>!</span><small>Sabores que nos unen</small></Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {conocido && <span className="pill sea">Hola, {conocido.nombres.split(' ')[0]}</span>}
          <Link to="/intranet" className="btn sm">Intranet</Link>
        </div>
      </div></header>
      <section className="hero"><div className="in">
        <div>
          <h1>Menú del {fechaLarga(menu.fecha)}</h1>
          <p className="sub">Entrada + fondo + {menu.refresco.toLowerCase()} por {soles(menu.precioMenu)}. También puedes pedir platos sueltos.</p>
          <div className="chips">
            <span>{manana ? 'Pedidos para mañana: hoy de 14:00 a 17:00' : 'Pedidos de 8:00 a 10:00'}</span>
            {db.puntos.filter(p => p.activo).map(p => <span key={p.id}>Entrega {p.nombre} {p.hora}</span>)}
          </div>
        </div>
        <div className="seg" role="group" aria-label="Fecha de atención">
          <button type="button" aria-pressed={!manana} onClick={() => setManana(false)}>Para hoy<small>{fechaLarga(db.menus[0].fecha)}</small></button>
          <button type="button" aria-pressed={manana} onClick={() => setManana(true)}>Para mañana<small>Separa con el 50 %</small></button>
        </div>
      </div></section>

      <main className="pub-main">
        <div>
          <div className="armador" style={{ marginBottom: 20 }}>
            <div className="slots">
              <b>Arma tu menú {soles(menu.precioMenu)}:</b>
              <span className={'slot' + (armando.entrada ? ' full' : '')}>{armando.entrada ? nombreDe(armando.entrada) : 'Elige una entrada'}</span>
              <span>+</span>
              <span className={'slot' + (armando.fondo ? ' full' : '')}>{armando.fondo ? nombreDe(armando.fondo) : 'Elige un fondo'}</span>
            </div>
            {(armando.entrada || armando.fondo) && <button className="btn sm ghost" onClick={() => setArmando({})}>Limpiar</button>}
          </div>
          {secciones.map(sec => (
            <div className="sec" key={sec}>
              <div className="sec-h"><h2>{sec}</h2>{items.find(i => i.tipo === sec)?.rol === 'adicional' && <span className="muted small">Se agregan a una comida del carrito</span>}</div>
              <div className="grid-platos">
                {agrupar(items.filter(x => x.tipo === sec)).map(vars => {
                  const g = vars[0].grupo
                  const elegida = vars.find(v => v.m.id === presa[g]) ?? vars.find(v => libre(v.m) > 0) ?? vars[0]
                  const i = elegida
                  const l = libre(i.m)
                  const lTotal = vars.reduce((s, v) => s + libre(v.m), 0)
                  const sel = vars.some(v => armando.entrada === v.m.id || armando.fondo === v.m.id)
                  return (
                    <article key={g} className={'plato' + (sel ? ' sel' : '') + (lTotal === 0 ? ' off' : '')}>
                      <div className="foto" aria-hidden="true">{i.icono}</div>
                      <div className="body">
                        <h3>{i.titulo}</h3>
                        <p className="desc">{i.desc}</p>
                        {vars.length > 1 && (
                          <div className="presas" role="group" aria-label={`${i.etiqueta ?? 'Opción'} de ${i.titulo}`}>
                            <span className="small muted">{i.etiqueta ?? 'Opción'}:</span>
                            {vars.map(v => (
                              <button key={v.m.id} type="button" className={'presa' + (v.m.id === i.m.id ? ' on' : '')} aria-pressed={v.m.id === i.m.id}
                                disabled={libre(v.m) === 0} onClick={() => setPresa(x => ({ ...x, [g]: v.m.id }))}>
                                {v.variante}<small>{libre(v.m) === 0 ? 'agotado' : `quedan ${libre(v.m)}`}</small>
                              </button>
                            ))}
                          </div>
                        )}
                        <div>{l === 0 ? <span className="pill bad">Agotado</span> : l <= 5 ? <span className="pill warn">Quedan {l}{i.variante ? ` (${i.variante.toLowerCase()})` : ''}</span> : <span className="pill ok">Disponible</span>}</div>
                        <div className="row">
                          {(i.rol === 'entrada' || i.rol === 'fondo') && (
                            <button className={'btn sm' + (sel ? ' primary' : '')} disabled={l === 0 && !sel} onClick={() => elegir(i.rol as 'entrada' | 'fondo', i.m.id)}>
                              {sel ? 'Elegido' : 'Para el menú'}
                            </button>
                          )}
                          {i.rol !== 'adicional' && i.m.permiteSuelto && (
                            <button className="btn sm" disabled={l === 0} onClick={() => agregar({ tipo: 'suelto', mdpIds: [i.m.id], adicionales: [] })}>
                              Solo · {soles(i.m.precioSuelto)}
                            </button>
                          )}
                          {i.rol === 'adicional' && <span className="muted small">{soles(i.m.precioSuelto)} · en envase aparte</span>}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {carrito.length > 0 && (
          <button type="button" className="barra-movil" onClick={() => document.getElementById('carrito')?.scrollIntoView({ behavior: 'smooth' })}>
            <span>Ver mi pedido · {carrito.length} comida(s)</span><b className="num">{soles(total)}</b>
          </button>
        )}
        <aside className="carrito" id="carrito" aria-label="Tu pedido">
          <h2>Tu pedido</h2>
          {conocido && (
            <div className="fid">
              <b>¡Hola de nuevo, {conocido.nombres.split(' ')[0]}!</b>
              <span className="small">Tus datos ya están listos: no tienes que volver a escribirlos.</span>
              {fid && <>
                <span>Llevas {fid.acumulados} de {db.parametros.consumosPremio} menús para tu menú gratis{fid.disponibles > 0 ? ` · tienes ${fid.disponibles} gratis` : ''}.</span>
                <div className="bar"><span style={{ width: `${(fid.acumulados / db.parametros.consumosPremio) * 100}%` }} /></div>
              </>}
              <button type="button" className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={olvidarDispositivo}>¿No eres {conocido.nombres.split(' ')[0]}? Cambiar</button>
            </div>
          )}
          {carrito.length === 0 && <div className="vacio">Elige una entrada y un fondo para armar tu menú, o pide un plato suelto.</div>}
          {carrito.map((c, k) => (
            <div className="comida" key={c.key}>
              <div className="top">
                <div>
                  <b>Comida {k + 1} · {c.tipo === 'menu' ? 'Menú' : 'Plato suelto'}</b>
                  <div className="small muted">{c.mdpIds.map(nombreDe).join(' + ')}</div>
                  {c.adicionales.map(a => <div className="small" key={a.mdpId}>+ {a.cantidad} {nombreDe(a.mdpId)}</div>)}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b className="num">{soles(precioComida(c))}</b><br />
                  <button className="x" aria-label="Quitar comida" onClick={() => setCarrito(cs => cs.filter(x => x.key !== c.key))}>×</button>
                </div>
              </div>
              {adicionales.length > 0 && (
                <select aria-label="Agregar adicional" value="" onChange={e => e.target.value && addAdicional(c.key, Number(e.target.value))}>
                  <option value="">+ Agregar adicional</option>
                  {adicionales.map(a => <option key={a.m.id} value={a.m.id} disabled={libre(a.m) === 0}>{a.nombre} · {soles(a.m.precioSuelto)}{libre(a.m) === 0 ? ' (agotado)' : ''}</option>)}
                </select>
              )}
            </div>
          ))}
          <div className="total"><span>Total</span><span className="num">{soles(total)}</span></div>
          {manana && carrito.length > 0 && <p className="small muted">Para mañana se separa con el 50 %: {soles(total / 2)}.</p>}
          <button className="btn primary" disabled={!carrito.length} onClick={() => setAbierto(true)}>Continuar</button>
        </aside>
      </main>

      {abierto && <Checkout db={db} menuId={menu.id} carrito={carrito} manana={manana} token={token} visitaId={visitaId}
        onCerrar={() => setAbierto(false)} onListo={id => { setAbierto(false); setResultado(id) }} />}
    </>
  )
}

function Checkout({ db, menuId, carrito, manana, token, visitaId, onCerrar, onListo }: {
  db: DB; menuId: number; carrito: Comida[]; manana: boolean; token: string; visitaId?: number; onCerrar: () => void; onListo: (id: number) => void
}) {
  const d = db.dispositivos.find(x => x.token === token)
  const c = db.clientes.find(x => x.id === d?.clienteId)
  const fid = db.fidelidad.find(f => f.clienteId === c?.id)
  const [nombre, setNombre] = useState(c?.nombres ?? '')
  const [celular, setCelular] = useState(c ? c.celular.replace(/^51/, '') : '')
  const [email, setEmail] = useState(c?.email ?? '')
  const [puntoId, setPuntoId] = useState<number>(c?.puntoHabitualId ?? db.puntos.find(p => p.activo)!.id)
  const [obs, setObs] = useState('')
  const [privacidad, setPrivacidad] = useState(!!c)
  const [wa, setWa] = useState(c?.aceptaWhatsapp ?? true)
  const [mkt, setMkt] = useState(c?.aceptaMarketing ?? false)
  const [premio, setPremio] = useState(false)
  const [error, setError] = useState('')

  const confirmar = () => {
    if (!privacidad) { setError('Acepta la política de privacidad para continuar.'); return }
    const r = ejecutar(dbx => registrarPedido(dbx, {
      menuId, comidas: carrito.map(({ tipo, mdpIds, adicionales }) => ({ tipo, mdpIds, adicionales })), puntoId, nombre, celular, email,
      observaciones: obs, aceptaWhatsapp: wa, aceptaMarketing: mkt, usarPremio: premio, token, visitaId, conAdelanto: manana,
    }))
    if (r.ok) onListo(r.valor)
    else setError(r.error)
  }
  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-labelledby="ck-t" onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className="modal">
        <h2 id="ck-t">{c ? `Confirma tu pedido, ${c.nombres.split(' ')[0]}` : 'Tus datos para la entrega'}</h2>
        <label className="field">Nombre y apellido<input id="ck-nombre" type="text" value={nombre} onChange={e => setNombre(e.target.value)} /></label>
        <label className="field">Celular<input id="ck-cel" type="tel" inputMode="numeric" placeholder="9XXXXXXXX" value={celular}
          onChange={e => setCelular(e.target.value)} onBlur={() => visitaId && celular && ejecutar(x => avanzarVisita(x, visitaId, 'inicio_datos', celular, nombre))} /></label>
        <label className="field">Correo (opcional)<input id="ck-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <div className="field">Punto de entrega
          <div className="puntos">
            {db.puntos.filter(p => p.activo).map(p => (
              <label className="punto" key={p.id}><input type="radio" name="punto" checked={puntoId === p.id} onChange={() => setPuntoId(p.id)} /><span><b>{p.nombre}</b><br /><span className="small muted">Entrega {p.hora}</span></span></label>
            ))}
          </div>
        </div>
        <label className="field">Observaciones (opcional)<textarea id="ck-obs" placeholder="Ej.: cambio de papa por camote" value={obs} onChange={e => setObs(e.target.value)} /></label>
        {fid && fid.disponibles > 0 && carrito.some(x => x.tipo === 'menu') && (
          <label className="checkline"><input type="checkbox" checked={premio} onChange={e => setPremio(e.target.checked)} />Usar mi menú gratis ({fid.disponibles} disponible)</label>
        )}
        <label className="checkline"><input type="checkbox" checked={privacidad} onChange={e => setPrivacidad(e.target.checked)} />Acepto la política de privacidad (Ley N.° 29733).</label>
        <label className="checkline"><input type="checkbox" checked={wa} onChange={e => setWa(e.target.checked)} />Quiero recibir la confirmación de mi pedido por WhatsApp.</label>
        <label className="checkline"><input type="checkbox" checked={mkt} onChange={e => setMkt(e.target.checked)} />Quiero recibir el menú del día y promociones.</label>
        {manana && <p className="small" style={{ background: 'var(--warn-soft)', padding: '8px 10px', borderRadius: 10 }}>Para mañana tu pedido queda separado y debes enviar el 50 % de adelanto en los próximos 60 minutos.</p>}
        {error && <div className="err" role="alert">{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onCerrar}>Volver</button>
          <button className="btn primary" onClick={confirmar}>Confirmar pedido</button>
        </div>
      </div>
    </div>
  )
}

function Confirmacion({ db, pedidoId, onNuevo }: { db: DB; pedidoId: number; onNuevo: () => void }) {
  const p = db.pedidos.find(x => x.id === pedidoId)!
  const punto = db.puntos.find(x => x.id === p.puntoId)!
  const ts = db.tickets.filter(t => t.pedidoId === p.id)
  const msgs = db.notificaciones.filter(n => n.pedidoId === p.id && n.motivo !== 'alerta_admin').slice().reverse()
  const [aviso, setAviso] = useState('')
  return (
    <>
      <BannerDemo />
      <header className="pub-top"><div className="in">
        <Link to="/" className="logo" onClick={onNuevo}>Talara<span>!</span><small>Sabores que nos unen</small></Link>
        <button className="btn sm" onClick={onNuevo}>Hacer otro pedido</button>
      </div></header>
      <div className="confirm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="head">
            <span className={'pill ' + (p.estado === 'anulado' ? 'bad' : p.estado === 'pendiente_pago' ? 'warn' : 'ok')}>{p.estado === 'pendiente_pago' ? 'Separado: falta el adelanto' : p.estado === 'anulado' ? 'Anulado' : 'Pedido confirmado'}</span>
            <h1>Pedido N.° {p.id} · {p.nombre.split(' ')[0]}</h1>
            <p className="muted">{fechaLarga(p.fecha)} · entrega en <b>{punto.nombre} a las {p.hora}</b> · {ts.length} comida(s) · total <b>{soles(p.total)}</b></p>
            {p.estadoPago === 'pendiente' && (
              <div className="fid" style={{ background: 'var(--warn-soft)' }}>
                <b>Adelanto pendiente: {soles(p.montoAdelanto)}</b>
                <span>Envíalo por Yape o Plin antes de las {horaDe(p.pagoVenceAt!)}. Si no llega, el pedido se libera.</span>
                <button className="btn sm" onClick={() => { ejecutar(d => registrarComprobante(d, p.id)); setAviso('Comprobante enviado. Talara lo validará.') }}>Enviar comprobante (demo)</button>
              </div>
            )}
            {aviso && <p className="small" role="status">{aviso}</p>}
          </div>
          <div className="tickets-grid">
            {ts.map(t => (
              <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
                <Ticket80 db={db} ticket={t} copia="Copia cliente" />
                {t.estado === 'activo' && p.estado !== 'entregado' && (
                  <button className="btn sm danger" onClick={() => {
                    const r = ejecutar(d => anularTicket(d, t.id, 'cliente', 'Anulado por el cliente desde la web'))
                    setAviso(r.ok ? `Ticket ${t.numero} anulado. Talara ya fue notificado.` : r.error)
                  }}>Anular esta comida</button>
                )}
              </div>
            ))}
          </div>
          <p className="small muted">Esta es una constancia interna de tu reserva, no una boleta. Muéstrala al recoger.</p>
        </div>
        <aside className="wa" aria-label="Mensaje de WhatsApp">
          <div className="who">WhatsApp · Talara! (cuenta oficial)</div>
          {msgs.length === 0 && <div className="msg">No pediste confirmación por WhatsApp.</div>}
          {msgs.map(m => <div className="msg" key={m.id}>{m.texto}<div className="meta">{horaDe(m.at)} · plantilla de utilidad</div></div>)}
        </aside>
      </div>
    </>
  )
}
