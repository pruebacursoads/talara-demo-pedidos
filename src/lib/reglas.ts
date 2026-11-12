// Reglas de negocio. Cada función recibe un BORRADOR de la base (copia) y lo modifica;
// si lanza ErrorNegocio, el almacén descarta el borrador completo (equivale a ROLLBACK).
// Replican los procedimientos y triggers de db_talara: sp_reservar_stock, sp_validar_ticket,
// sp_recalcular_pedido, sp_anular_ticket, sp_anular_pedido, sp_marcar_pedido_entregado, etc.
import type { DB, EstadoPedido, Item, MenuDiaPlato, Origen, Pedido, Rol, Ticket, Etapa } from './types'
import { ErrorNegocio } from './types'
import { ahora, fechaCorta, soles } from './fechas'

const nextId = (db: DB, tabla: string) => {
  db.seq[tabla] = (db.seq[tabla] ?? 0) + 1
  return db.seq[tabla]
}
const r2 = (n: number) => Math.round(n * 100) / 100

export const disponible = (m: MenuDiaPlato) => m.stockInicial - m.stockReservado
export const platoDe = (db: DB, mdpId: number) => {
  const m = db.mdp.find(x => x.id === mdpId)
  if (!m) throw new ErrorNegocio('PLATO_NO_EXISTE', 'Ese plato no está en el menú.')
  const p = db.platos.find(x => x.id === m.platoId)!
  const t = db.tipos.find(x => x.id === p.tipoId)!
  return { m, p, t }
}

// ------------------------------------------------------------------ eventos y mensajes
function evento(db: DB, tipo: DB['eventos'][number]['tipo'], texto: string, pedidoId?: number) {
  db.eventos.unshift({ id: nextId(db, 'eventos'), tipo, texto, at: ahora(), pedidoId })
  // Las alertas inmediatas salen por WhatsApp a los administradores (plantilla de utilidad).
  if (tipo !== 'anulacion') {
    mensaje(db, 'alerta_admin', 'Maritza (admin)', `Alerta Talara: ${texto}`, pedidoId)
  }
}
export function mensaje(db: DB, motivo: DB['notificaciones'][number]['motivo'], destino: string, texto: string, pedidoId?: number) {
  db.notificaciones.unshift({
    id: nextId(db, 'notificaciones'), canal: 'whatsapp', motivo, destino, texto,
    costoUsd: motivo === 'remarketing' ? 0.07 : db.parametros.costoUtilidadUsd, estado: 'entregado', at: ahora(), pedidoId,
  })
}

// ------------------------------------------------------------------ stock (sp_reservar_stock + trigger)
export function reservar(db: DB, mdpId: number, cantidad: number, ticketId: number) {
  const { m, p } = platoDe(db, mdpId)
  if (m.estado !== 'disponible' || disponible(m) < cantidad) {
    throw new ErrorNegocio('STOCK_INSUFICIENTE', `Ya no hay suficiente "${p.nombre}". Quedan ${Math.max(0, disponible(m))}.`)
  }
  m.stockReservado += cantidad
  db.movimientos.unshift({ id: nextId(db, 'movimientos'), mdpId, tipo: 'reserva', cantidad: -cantidad, ticketId, motivo: 'Reserva por pedido', at: ahora() })
  despuesDeCambiarStock(db, m, p.nombre, true)
}
export function liberar(db: DB, mdpId: number, cantidad: number, ticketId: number | undefined, motivo: string) {
  const { m, p } = platoDe(db, mdpId)
  if (m.stockReservado < cantidad) throw new ErrorNegocio('LIBERACION_INVALIDA', 'No hay unidades reservadas suficientes.')
  m.stockReservado -= cantidad
  db.movimientos.unshift({ id: nextId(db, 'movimientos'), mdpId, tipo: 'liberacion', cantidad, ticketId, motivo, at: ahora() })
  despuesDeCambiarStock(db, m, p.nombre, false)
}
function despuesDeCambiarStock(db: DB, m: MenuDiaPlato, nombre: string, bajo: boolean) {
  const disp = disponible(m)
  const umbral = db.parametros.umbralStock
  const fecha = db.menus.find(x => x.id === m.menuId)?.fecha ?? ''
  if (m.estado === 'disponible' && disp <= 0) {
    m.estado = 'agotado'
    evento(db, 'plato_agotado', `${nombre} se AGOTÓ para el ${fechaCorta(fecha)}.`)
  } else if (m.estado === 'agotado' && disp > 0) {
    m.estado = 'disponible'
  }
  if (bajo && !m.alertaStockBajoAt && disp > 0 && disp <= umbral) {
    m.alertaStockBajoAt = ahora()
    evento(db, 'stock_bajo', `${nombre} tiene ${disp} unidad(es) disponible(s) para el ${fechaCorta(fecha)}.`)
  }
  if (m.alertaStockBajoAt && disp > umbral) m.alertaStockBajoAt = undefined
}

export function ajustarStock(db: DB, mdpId: number, nuevoInicial: number) {
  const { m, p } = platoDe(db, mdpId)
  if (!Number.isInteger(nuevoInicial) || nuevoInicial < 0) throw new ErrorNegocio('CANTIDAD_INVALIDA', 'Ingresa un número entero.')
  if (nuevoInicial < m.stockReservado) {
    throw new ErrorNegocio('chk_mdp_stock', `No puedes bajar ${p.nombre} a ${nuevoInicial}: ya hay ${m.stockReservado} vendidas.`)
  }
  const dif = nuevoInicial - m.stockInicial
  m.stockInicial = nuevoInicial
  if (dif !== 0) db.movimientos.unshift({ id: nextId(db, 'movimientos'), mdpId, tipo: 'ajuste', cantidad: dif, motivo: 'Ajuste desde la intranet', at: ahora() })
  despuesDeCambiarStock(db, m, p.nombre, false)
}

// ------------------------------------------------------------------ tickets (sp_validar_ticket)
function validarTicket(db: DB, t: Ticket) {
  const its = db.items.filter(i => i.ticketId === t.id && i.estado === 'activo')
  const cuenta = (r: Rol) => its.filter(i => i.rol === r).length
  for (const i of its) {
    const { t: tipo, m } = platoDe(db, i.mdpId)
    if (tipo.rol !== i.rol) throw new ErrorNegocio('TICKET_INVALIDO', 'El rol del ítem no coincide con el tipo del plato.')
    if (t.tipo === 'suelto' && i.rol !== 'adicional' && !m.permiteSuelto) throw new ErrorNegocio('TICKET_INVALIDO', 'Ese plato no se vende suelto hoy.')
  }
  if (t.tipo === 'menu' && !(cuenta('entrada') === 1 && cuenta('fondo') === 1 && cuenta('independiente') === 0)) {
    throw new ErrorNegocio('TICKET_INVALIDO', 'Un menú lleva exactamente 1 entrada y 1 plato de fondo.')
  }
  if (t.tipo === 'suelto' && cuenta('entrada') + cuenta('fondo') + cuenta('independiente') !== 1) {
    throw new ErrorNegocio('TICKET_INVALIDO', 'Un ticket suelto lleva exactamente 1 plato.')
  }
}

export function recalcular(db: DB, pedidoId: number) {
  const p = db.pedidos.find(x => x.id === pedidoId)!
  const ts = db.tickets.filter(t => t.pedidoId === pedidoId && t.estado !== 'anulado')
  for (const t of ts) {
    t.montoAdicionales = r2(db.items.filter(i => i.ticketId === t.id && i.estado === 'activo' && i.rol === 'adicional')
      .reduce((s, i) => s + i.cantidad * i.precioUnitario, 0))
  }
  p.subtotal = r2(ts.reduce((s, t) => s + t.precioBase + t.montoAdicionales, 0))
  p.descuento = r2(ts.reduce((s, t) => s + t.descuento, 0))
  p.total = r2(p.subtotal - p.descuento)
  if (p.estadoPago === 'pendiente') p.montoAdelanto = r2(p.total * 0.5)
}

const cambiarEstado = (db: DB, p: Pedido, a: EstadoPedido, origen: Origen, comentario: string) => {
  if ((p.estado === 'entregado' || p.estado === 'anulado') && a !== p.estado) {
    throw new ErrorNegocio('TRANSICION_INVALIDA', 'Un pedido entregado o anulado no puede cambiar de estado.')
  }
  db.historial.unshift({ id: nextId(db, 'historial'), pedidoId: p.id, de: p.estado, a, origen, comentario, at: ahora() })
  p.estado = a
}

// ------------------------------------------------------------------ registrar pedido (transacción completa)
export interface ComidaInput { tipo: 'menu' | 'suelto'; mdpIds: number[]; adicionales: { mdpId: number; cantidad: number }[] }
export interface PedidoInput {
  menuId: number; comidas: ComidaInput[]; puntoId: number; nombre: string; celular: string; email?: string
  observaciones?: string; aceptaWhatsapp: boolean; aceptaMarketing: boolean; usarPremio: boolean
  token?: string; visitaId?: number; conAdelanto: boolean
}

export function normalizarCelular(c: string) {
  const d = c.replace(/\D/g, '')
  return d.length === 9 ? '51' + d : d
}

export function registrarPedido(db: DB, inp: PedidoInput): number {
  if (!inp.comidas.length) throw new ErrorNegocio('PEDIDO_VACIO', 'Agrega al menos una comida.')
  if (inp.comidas.length > 10) throw new ErrorNegocio('TOPE', 'El máximo es 10 comidas por pedido.')
  const celular = normalizarCelular(inp.celular)
  if (!/^[0-9]{9,15}$/.test(celular)) throw new ErrorNegocio('chk_clientes_celular', 'Revisa el celular: deben ser 9 dígitos.')
  if (!inp.nombre.trim()) throw new ErrorNegocio('NOMBRE', 'Escribe tu nombre.')
  const email = inp.email?.trim() || undefined
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ErrorNegocio('chk_clientes_email', 'Revisa el correo.')
  const menu = db.menus.find(m => m.id === inp.menuId)!
  const punto = db.puntos.find(x => x.id === inp.puntoId && x.activo)
  if (!punto) throw new ErrorNegocio('PUNTO', 'Elige un punto de entrega.')
  const at = ahora()

  // Cliente: el celular es la llave única.
  let cli = db.clientes.find(c => c.celular === celular)
  if (!cli) {
    cli = { id: nextId(db, 'clientes'), nombres: inp.nombre.trim(), celular, email, aceptaWhatsapp: inp.aceptaWhatsapp, aceptaMarketing: inp.aceptaMarketing, creadoAt: at }
    db.clientes.push(cli)
  } else {
    cli.nombres = inp.nombre.trim()
    cli.email = email ?? cli.email
    cli.aceptaWhatsapp = inp.aceptaWhatsapp
    cli.aceptaMarketing = inp.aceptaMarketing
  }
  cli.puntoHabitualId = punto.id
  cli.primerPedidoAt ??= at
  cli.ultimoPedidoAt = at
  if (inp.token) {
    const d = db.dispositivos.find(x => x.token === inp.token)
    if (d) d.clienteId = cli.id
  }

  const pedido: Pedido = {
    id: nextId(db, 'pedidos'), token: crypto.randomUUID().replace(/-/g, ''), clienteId: cli.id, menuId: menu.id, fecha: menu.fecha,
    puntoId: punto.id, hora: punto.hora, nombre: cli.nombres, celular, email,
    observaciones: inp.observaciones?.trim() || undefined, requiereRevision: !!inp.observaciones?.trim(),
    estadoRevision: inp.observaciones?.trim() ? 'pendiente' : 'no_aplica', subtotal: 0, descuento: 0, total: 0,
    estado: inp.conAdelanto ? 'pendiente_pago' : 'reservado', estadoPago: inp.conAdelanto ? 'pendiente' : 'no_requerido',
    montoAdelanto: 0, pagoVenceAt: inp.conAdelanto ? new Date(Date.now() + 60 * 60000).toISOString() : undefined, creadoAt: at,
  }
  db.pedidos.unshift(pedido)
  db.historial.unshift({ id: nextId(db, 'historial'), pedidoId: pedido.id, a: pedido.estado, origen: 'cliente', comentario: 'Pedido registrado', at })

  let premioPendiente = inp.usarPremio
  for (const c of inp.comidas) {
    db.tickets_por_fecha[menu.fecha] = (db.tickets_por_fecha[menu.fecha] ?? 0) + 1
    const numero = db.tickets_por_fecha[menu.fecha]
    const precioBase = c.tipo === 'menu' ? menu.precioMenu : platoDe(db, c.mdpIds[0]).m.precioSuelto
    const t: Ticket = { id: nextId(db, 'tickets'), pedidoId: pedido.id, fecha: menu.fecha, numero, tipo: c.tipo, precioBase, montoAdicionales: 0, descuento: 0, premio: false, estado: 'activo', vecesImpreso: 0 }
    db.tickets.push(t)
    let principal: Item | undefined
    for (const mdpId of c.mdpIds) {
      const { p, t: tipo } = platoDe(db, mdpId)
      const it: Item = { id: nextId(db, 'items'), ticketId: t.id, mdpId, rol: tipo.rol, descripcion: p.nombre, cantidad: 1, precioUnitario: 0, estado: 'activo' }
      db.items.push(it)
      reservar(db, mdpId, 1, t.id)
      if (!principal || tipo.rol === 'fondo') principal = it
    }
    c.adicionales.forEach((a, k) => {
      const { p, m, t: tipo } = platoDe(db, a.mdpId)
      if (tipo.rol !== 'adicional') throw new ErrorNegocio('TICKET_INVALIDO', 'Solo se agregan adicionales.')
      db.items.push({ id: nextId(db, 'items'), ticketId: t.id, mdpId: a.mdpId, rol: 'adicional', principalId: principal!.id,
        codigoRef: `${numero}-A${k + 1}`, descripcion: p.nombre, cantidad: a.cantidad, precioUnitario: m.precioSuelto, estado: 'activo' })
      reservar(db, a.mdpId, a.cantidad, t.id)
    })
    validarTicket(db, t)
    if (premioPendiente && c.tipo === 'menu') {
      const f = db.fidelidad.find(x => x.clienteId === cli!.id)
      if (!f || f.disponibles < 1) throw new ErrorNegocio('SIN_PREMIOS', 'No tienes menús gratis disponibles.')
      f.disponibles -= 1; f.canjeados += 1
      t.descuento = t.precioBase; t.premio = true
      premioPendiente = false
    }
    if (db.parametros.impresionAutomatica) {
      db.trabajos.unshift({ id: nextId(db, 'trabajos'), ticketId: t.id, pedidoId: pedido.id, origen: 'automatico', estado: 'pendiente', at })
    }
  }
  recalcular(db, pedido.id)

  if (pedido.requiereRevision) evento(db, 'pedido_con_observacion', `Pedido N.° ${pedido.id} (${pedido.nombre}) pide: "${pedido.observaciones}".`, pedido.id)
  const nums = db.tickets.filter(t => t.pedidoId === pedido.id).map(t => t.numero).join(', ')
  if (inp.aceptaWhatsapp) {
    mensaje(db, 'confirmacion_pedido', `${pedido.nombre} · +${celular}`,
      `Hola ${pedido.nombre}, tu pedido N.° ${pedido.id} para el ${fechaCorta(pedido.fecha)} quedó registrado. Entrega en ${punto.nombre} a las ${punto.hora}. Tickets: ${nums}. Total: ${soles(pedido.total)}.`, pedido.id)
    if (pedido.estadoPago === 'pendiente') {
      mensaje(db, 'recordatorio_pago', `${pedido.nombre} · +${celular}`,
        `Tu pedido N.° ${pedido.id} requiere un adelanto de ${soles(pedido.montoAdelanto)} en los próximos 60 minutos. Responde con tu comprobante.`, pedido.id)
    }
  }
  if (inp.visitaId) {
    const v = db.visitas.find(x => x.id === inp.visitaId)
    if (v) { v.etapa = 'confirmo'; v.pedidoId = pedido.id; v.clienteId = cli.id }
  }
  return pedido.id
}

// ------------------------------------------------------------------ anulaciones
function anularTicketNucleo(db: DB, t: Ticket, por: Origen, motivo: string) {
  const p = db.pedidos.find(x => x.id === t.pedidoId)!
  if (t.estado !== 'activo' || p.estado === 'entregado' || p.estado === 'anulado') {
    throw new ErrorNegocio('TICKET_NO_ANULABLE', 'Ese ticket ya fue anulado o entregado.')
  }
  for (const i of db.items.filter(x => x.ticketId === t.id && x.estado === 'activo')) {
    liberar(db, i.mdpId, i.cantidad, t.id, `Anulación: ${motivo}`)
    i.estado = 'anulado'
  }
  if (t.premio) {
    const f = db.fidelidad.find(x => x.clienteId === p.clienteId)
    if (f) { f.disponibles += 1; f.canjeados -= 1 }
  }
  t.estado = 'anulado'
  t.anuladoAt = ahora()
  void por
}

export function anularTicket(db: DB, ticketId: number, por: Origen, motivo: string) {
  const t = db.tickets.find(x => x.id === ticketId)!
  const monto = t.precioBase + t.montoAdicionales - t.descuento
  anularTicketNucleo(db, t, por, motivo)
  const p = db.pedidos.find(x => x.id === t.pedidoId)!
  db.anulaciones.unshift({ id: nextId(db, 'anulaciones'), pedidoId: p.id, ticketId, alcance: 'ticket', por, motivo, monto, at: ahora() })
  evento(db, 'anulacion', `Ticket ${t.numero} del pedido N.° ${p.id} (${p.nombre}) anulado por ${por}.`, p.id)
  recalcular(db, p.id)
  if (!db.tickets.some(x => x.pedidoId === p.id && x.estado !== 'anulado')) {
    cambiarEstado(db, p, 'anulado', por, motivo)
    p.anuladoAt = ahora(); p.anuladoPor = por; p.motivoAnulacion = motivo
  }
}

export function anularPedido(db: DB, pedidoId: number, por: Origen, motivo: string) {
  const p = db.pedidos.find(x => x.id === pedidoId)!
  if (p.estado === 'entregado' || p.estado === 'anulado') throw new ErrorNegocio('PEDIDO_NO_ANULABLE', 'Ya fue entregado o anulado.')
  const monto = p.total
  for (const t of db.tickets.filter(x => x.pedidoId === p.id && x.estado === 'activo')) anularTicketNucleo(db, t, por, motivo)
  db.anulaciones.unshift({ id: nextId(db, 'anulaciones'), pedidoId: p.id, alcance: 'pedido', por, motivo, monto, at: ahora() })
  evento(db, 'anulacion', `Pedido N.° ${p.id} (${p.nombre}) anulado por ${por}.`, p.id)
  recalcular(db, p.id)
  cambiarEstado(db, p, 'anulado', por, motivo)
  p.anuladoAt = ahora(); p.anuladoPor = por; p.motivoAnulacion = motivo
  if (p.estadoPago === 'pendiente') p.estadoPago = 'vencido'
}

// ------------------------------------------------------------------ estados, entrega y fidelidad
export function avanzarEstado(db: DB, pedidoId: number, a: EstadoPedido) {
  const p = db.pedidos.find(x => x.id === pedidoId)!
  if (a === 'entregado') return entregar(db, pedidoId)
  if (p.estado === 'pendiente_pago') throw new ErrorNegocio('PAGO_PENDIENTE', 'Primero valida el adelanto.')
  cambiarEstado(db, p, a, 'admin', 'Cambio desde la intranet')
}

export function entregar(db: DB, pedidoId: number) {
  const p = db.pedidos.find(x => x.id === pedidoId)!
  if (!['reservado', 'en_preparacion', 'listo'].includes(p.estado)) throw new ErrorNegocio('ENTREGA_INVALIDA', 'El pedido no está listo para entregarse.')
  const ts = db.tickets.filter(t => t.pedidoId === p.id && t.estado === 'activo')
  ts.forEach(t => { t.estado = 'entregado' })
  cambiarEstado(db, p, 'entregado', 'admin', 'Entregado')
  p.entregadoAt = ahora()
  const menus = ts.filter(t => t.tipo === 'menu' && !t.premio).length
  if (menus > 0) {
    let f = db.fidelidad.find(x => x.clienteId === p.clienteId)
    if (!f) { f = { clienteId: p.clienteId, acumulados: 0, historicos: 0, disponibles: 0, canjeados: 0 }; db.fidelidad.push(f) }
    const total = f.acumulados + menus
    f.disponibles += Math.floor(total / db.parametros.consumosPremio)
    f.acumulados = total % db.parametros.consumosPremio
    f.historicos += menus
  }
}

export function validarPago(db: DB, pedidoId: number) {
  const p = db.pedidos.find(x => x.id === pedidoId)!
  if (p.estadoPago !== 'pendiente') throw new ErrorNegocio('PAGO', 'Ese pedido no tiene un adelanto pendiente.')
  p.estadoPago = 'pagado'
  cambiarEstado(db, p, 'reservado', 'admin', 'Adelanto validado')
}

export function registrarComprobante(db: DB, pedidoId: number) {
  const p = db.pedidos.find(x => x.id === pedidoId)!
  evento(db, 'pago_por_validar', `Llegó el comprobante del pedido N.° ${p.id} (${soles(p.montoAdelanto)}).`, p.id)
}

export function revisar(db: DB, pedidoId: number, decision: 'aprobada' | 'rechazada') {
  const p = db.pedidos.find(x => x.id === pedidoId)!
  p.estadoRevision = decision
}

// ------------------------------------------------------------------ impresión
export function marcarImpreso(db: DB, trabajoId: number) {
  const tr = db.trabajos.find(x => x.id === trabajoId)
  if (!tr || tr.estado === 'impreso') return
  tr.estado = 'impreso'; tr.impresoAt = ahora()
  const t = db.tickets.find(x => x.id === tr.ticketId)
  if (t) t.vecesImpreso += 1
}
export function reimprimir(db: DB, ticketIds: number[], origen: 'manual' | 'masivo' | 'reimpresion') {
  for (const id of ticketIds) {
    const t = db.tickets.find(x => x.id === id)!
    db.trabajos.unshift({ id: nextId(db, 'trabajos'), ticketId: id, pedidoId: t.pedidoId, origen, estado: 'pendiente', at: ahora() })
  }
}

// ------------------------------------------------------------------ embudo
export function registrarVisita(db: DB, token: string, menuId: number): number {
  let d = db.dispositivos.find(x => x.token === token)
  if (!d) { d = { token, primeraVisita: ahora() }; db.dispositivos.push(d) }
  const id = nextId(db, 'visitas')
  db.visitas.unshift({ id, token, clienteId: d.clienteId, menuId, inicio: ahora(), etapa: 'vio_menu' })
  return id
}
const ORDEN: Etapa[] = ['vio_menu', 'armo_pedido', 'inicio_datos', 'confirmo']
export function avanzarVisita(db: DB, visitaId: number, etapa: Etapa, celular?: string, nombre?: string) {
  const v = db.visitas.find(x => x.id === visitaId)
  if (!v) return
  if (ORDEN.indexOf(etapa) > ORDEN.indexOf(v.etapa)) v.etapa = etapa
  if (celular) v.celularCapturado = normalizarCelular(celular)
  if (nombre) v.nombreCapturado = nombre
}

export function enviarResumen(db: DB) {
  const hoyIso = new Date().toISOString().slice(0, 10)
  const sinPedido = db.visitas.filter(v => !v.pedidoId).length
  const anul = db.anulaciones.filter(a => a.at.slice(0, 10) === hoyIso).length
  mensaje(db, 'alerta_admin', 'Maritza (admin)', `Resumen: ${sinPedido} visita(s) sin pedido y ${anul} anulación(es). Ver detalle en la intranet.`)
}

// ------------------------------------------------------------------ catálogos
export function crearTipo(db: DB, nombre: string, rol: Rol) {
  if (!nombre.trim()) throw new ErrorNegocio('NOMBRE', 'Escribe un nombre.')
  if (db.tipos.some(t => t.nombre.toLowerCase() === nombre.trim().toLowerCase())) throw new ErrorNegocio('UQ', 'Ese tipo ya existe.')
  const id = nextId(db, 'tipos')
  db.tipos.push({ id, codigo: `T${String(id).padStart(3, '0')}`, nombre: nombre.trim(), rol, orden: id, visibleWeb: true, activo: true })
}
export function crearPunto(db: DB, nombre: string, hora: string) {
  if (!nombre.trim() || !/^\d{2}:\d{2}$/.test(hora)) throw new ErrorNegocio('DATOS', 'Escribe el nombre y la hora (HH:MM).')
  if (db.puntos.some(p => p.nombre.toLowerCase() === nombre.trim().toLowerCase())) throw new ErrorNegocio('UQ', 'Ese punto ya existe.')
  const id = nextId(db, 'puntos')
  db.puntos.push({ id, codigo: `U${String(id).padStart(3, '0')}`, nombre: nombre.trim(), direccion: 'Por confirmar', hora, activo: true })
}
// Si se indican variantes (ej. "Pierna, Pecho, Encuentro"), se crea un plato por variante dentro de la misma familia:
// cada variante tiene su propio stock, como en el Excel del cliente.
export function crearPlato(db: DB, nombre: string, tipoId: number, precio: number, icono: string, variantes = '', etiqueta = 'Presa') {
  if (!nombre.trim() || !(precio >= 0)) throw new ErrorNegocio('DATOS', 'Escribe el nombre y un precio válido.')
  const lista = variantes.split(',').map(v => v.trim()).filter(Boolean)
  const base = nombre.trim()
  const crear = (n: string, variante?: string) => {
    if (db.platos.some(p => p.tipoId === tipoId && p.nombre.toLowerCase() === n.toLowerCase())) throw new ErrorNegocio('UQ', `"${n}" ya existe en ese tipo.`)
    const id = nextId(db, 'platos')
    db.platos.push({ id, codigo: `P${String(id).padStart(5, '0')}`, tipoId, nombre: n, descripcion: '', precioSuelto: precio, icono: icono || '🍽️', activo: true,
      ...(variante ? { familia: base, variante, etiquetaVariante: etiqueta.trim() || 'Opción' } : {}) })
  }
  if (lista.length) lista.forEach(v => crear(`${base} (${v.toLowerCase()})`, v))
  else crear(base)
}
export function agregarAlMenu(db: DB, menuId: number, platoId: number, stock: number) {
  if (db.mdp.some(m => m.menuId === menuId && m.platoId === platoId)) throw new ErrorNegocio('UQ', 'Ese plato ya está en el menú.')
  const p = db.platos.find(x => x.id === platoId)!
  const id = nextId(db, 'mdp')
  db.mdp.push({ id, menuId, platoId, stockInicial: stock, stockReservado: 0, precioSuelto: p.precioSuelto, permiteSuelto: true, estado: stock > 0 ? 'disponible' : 'agotado' })
  db.movimientos.unshift({ id: nextId(db, 'movimientos'), mdpId: id, tipo: 'carga', cantidad: stock, motivo: 'Carga inicial', at: ahora() })
}
