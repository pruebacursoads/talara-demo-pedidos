// Datos iniciales: los mismos de 02_datos_prueba.sql (Excel del cliente). Precios de prueba.
import type { DB } from './types'
import { hoy, manana } from './fechas'
import { avanzarEstado, avanzarVisita, registrarPedido, registrarVisita, anularTicket } from './reglas'

export const VERSION = 5

export function crearBaseInicial(): DB {
  const db: DB = {
    version: VERSION, seq: {}, tickets_por_fecha: {},
    parametros: { impresionAutomatica: true, umbralStock: 5, consumosPremio: 10, costoUtilidadUsd: 0.03, tipoCambio: 3.466 },
    tipos: [
      { id: 1, codigo: 'T001', nombre: 'Entradas', rol: 'entrada', orden: 1, visibleWeb: true, activo: true },
      { id: 2, codigo: 'T002', nombre: 'Platos de fondo', rol: 'fondo', orden: 2, visibleWeb: true, activo: true },
      { id: 3, codigo: 'T003', nombre: 'A la carta', rol: 'independiente', orden: 3, visibleWeb: true, activo: true },
      { id: 4, codigo: 'T004', nombre: 'Adicionales', rol: 'adicional', orden: 4, visibleWeb: true, activo: true },
      { id: 5, codigo: 'T005', nombre: 'Postres', rol: 'independiente', orden: 5, visibleWeb: false, activo: true },
    ],
    platos: [
      { id: 1, codigo: 'P00001', tipoId: 1, nombre: 'Causa de atún', descripcion: 'Papa amarilla, atún, palta y mayonesa', precioSuelto: 5, icono: '🥔', activo: true },
      { id: 2, codigo: 'P00002', tipoId: 1, nombre: 'Ensalada de palta', descripcion: 'Palta, tomate, cebolla y limón', precioSuelto: 5, icono: '🥑', activo: true },
      { id: 3, codigo: 'P00003', tipoId: 1, nombre: 'Tequeños', descripcion: 'Con queso y guacamole', precioSuelto: 6, icono: '🧀', activo: true },
      { id: 4, codigo: 'P00004', tipoId: 2, nombre: 'Arroz con pollo (pierna)', descripcion: 'Con crema huancaína', precioSuelto: 11, icono: '🍗', activo: true, familia: 'Arroz con pollo', variante: 'Pierna', etiquetaVariante: 'Presa' },
      { id: 5, codigo: 'P00005', tipoId: 2, nombre: 'Arroz con pollo (pecho)', descripcion: 'Con crema huancaína', precioSuelto: 11, icono: '🍗', activo: true, familia: 'Arroz con pollo', variante: 'Pecho', etiquetaVariante: 'Presa' },
      { id: 6, codigo: 'P00006', tipoId: 2, nombre: 'Arroz con pollo (encuentro)', descripcion: 'Con crema huancaína', precioSuelto: 11, icono: '🍗', activo: true, familia: 'Arroz con pollo', variante: 'Encuentro', etiquetaVariante: 'Presa' },
      { id: 7, codigo: 'P00007', tipoId: 2, nombre: 'Chicharrón de pescado', descripcion: 'Con yuca y sarsa criolla', precioSuelto: 11, icono: '🐟', activo: true },
      { id: 8, codigo: 'P00008', tipoId: 2, nombre: 'Fetuchini chifa cau cau', descripcion: 'Salteado al wok', precioSuelto: 11, icono: '🍝', activo: true },
      { id: 9, codigo: 'P00009', tipoId: 2, nombre: 'Lomo saltado', descripcion: 'Con papas fritas y arroz', precioSuelto: 12, icono: '🥩', activo: true },
      { id: 10, codigo: 'P00010', tipoId: 2, nombre: 'Estofado de pollo (pierna)', descripcion: 'Con arroz blanco', precioSuelto: 11, icono: '🍲', activo: true, familia: 'Estofado de pollo', variante: 'Pierna', etiquetaVariante: 'Presa' },
      { id: 11, codigo: 'P00011', tipoId: 2, nombre: 'Estofado de pollo (pecho)', descripcion: 'Con arroz blanco', precioSuelto: 11, icono: '🍲', activo: true, familia: 'Estofado de pollo', variante: 'Pecho', etiquetaVariante: 'Presa' },
      { id: 12, codigo: 'P00012', tipoId: 2, nombre: 'Estofado de pollo (encuentro)', descripcion: 'Con arroz blanco', precioSuelto: 11, icono: '🍲', activo: true, familia: 'Estofado de pollo', variante: 'Encuentro', etiquetaVariante: 'Presa' },
      { id: 13, codigo: 'P00013', tipoId: 3, nombre: 'Bistec a lo pobre', descripcion: 'Con arroz blanco, plátano y huevo', precioSuelto: 15, icono: '🍳', activo: true },
      { id: 14, codigo: 'P00014', tipoId: 4, nombre: 'Solo pollo a la plancha', descripcion: 'Porción adicional, en envase aparte', precioSuelto: 4, icono: '🍗', activo: true },
      { id: 15, codigo: 'P00015', tipoId: 4, nombre: 'Solo bistec', descripcion: 'Porción adicional, en envase aparte', precioSuelto: 5, icono: '🥩', activo: true },
      { id: 16, codigo: 'P00016', tipoId: 4, nombre: 'Solo pescado frito', descripcion: 'Porción adicional, en envase aparte', precioSuelto: 4, icono: '🐟', activo: true },
      { id: 17, codigo: 'P00017', tipoId: 1, nombre: 'Ensalada fresca', descripcion: 'Lechuga, tomate, zanahoria, pepino y aliño', precioSuelto: 5, icono: '🥗', activo: true },
      { id: 18, codigo: 'P00018', tipoId: 1, nombre: 'Crema de rocoto', descripcion: 'Sopa cremosa ligeramente picante', precioSuelto: 5, icono: '🌶️', activo: true },
      { id: 19, codigo: 'P00019', tipoId: 2, nombre: 'Cau cau de pollo', descripcion: 'Con arroz blanco', precioSuelto: 11, icono: '🍛', activo: true },
      { id: 20, codigo: 'P00020', tipoId: 2, nombre: 'Ensalada rusa con pollo al horno', descripcion: 'Pollo al horno y ensalada rusa', precioSuelto: 11, icono: '🍗', activo: true },
    ],
    puntos: [
      { id: 1, codigo: 'U001', nombre: 'Olguín', direccion: 'Por confirmar', hora: '12:00', activo: true },
      { id: 2, codigo: 'U002', nombre: 'Derby', direccion: 'Por confirmar', hora: '14:00', activo: true },
    ],
    menus: [], mdp: [], clientes: [], dispositivos: [], visitas: [], pedidos: [], tickets: [], items: [],
    movimientos: [], anulaciones: [], historial: [], trabajos: [], eventos: [], notificaciones: [], fidelidad: [],
  }
  db.seq = { tipos: 5, platos: 20, puntos: 2 }

  // Menú de hoy (stock del Excel: entradas 30, fondos 10, carta 3, adicionales 2) y de mañana.
  db.menus.push({ id: 1, fecha: hoy(), precioMenu: 13, refresco: 'Chicha morada', estado: 'publicado' })
  db.menus.push({ id: 2, fecha: manana(), precioMenu: 13, refresco: 'Maracuyá', estado: 'publicado' })
  db.seq.menus = 2
  let mid = 0
  const cargar = (menuId: number, platoId: number, stock: number) => {
    const p = db.platos.find(x => x.id === platoId)!
    mid++
    db.mdp.push({ id: mid, menuId, platoId, stockInicial: stock, stockReservado: 0, precioSuelto: p.precioSuelto, permiteSuelto: true, estado: 'disponible' })
    db.movimientos.push({ id: mid, mdpId: mid, tipo: 'carga', cantidad: stock, motivo: 'Carga inicial del menú', at: new Date().toISOString() })
  }
  ;[1, 2, 3, 17].forEach(id => cargar(1, id, 30))
  ;[4, 5, 6, 7, 8, 9, 10, 11, 12, 19].forEach(id => cargar(1, id, 10))
  cargar(1, 13, 3)
  ;[14, 15, 16].forEach(id => cargar(1, id, 2))
  ;[17, 18].forEach(id => cargar(2, id, 30))
  ;[20, 19, 9].forEach(id => cargar(2, id, 10))
  cargar(2, 14, 2)
  db.seq.mdp = mid
  db.seq.movimientos = mid

  // Pedidos de ejemplo para que la intranet no empiece vacía.
  const m = (codigo: string, menuId = 1) => db.mdp.find(x => x.menuId === menuId && db.platos.find(p => p.id === x.platoId)!.codigo === codigo)!.id
  const base = { menuId: 1, aceptaWhatsapp: true, aceptaMarketing: true, usarPremio: false, conAdelanto: false }
  const p1 = registrarPedido(db, { ...base, nombre: 'Ana Torres', celular: '900000001', email: 'ana@ejemplo.test', puntoId: 2,
    comidas: [1, 2, 3].map(() => ({ tipo: 'menu' as const, mdpIds: [m('P00001'), m('P00011')], adicionales: [] })) })
  registrarPedido(db, { ...base, nombre: 'Pedro Ruiz', celular: '900000002', puntoId: 1, aceptaMarketing: false,
    comidas: [
      { tipo: 'menu', mdpIds: [m('P00001'), m('P00008')], adicionales: [] },
      { tipo: 'menu', mdpIds: [m('P00002'), m('P00008')], adicionales: [] },
      { tipo: 'suelto', mdpIds: [m('P00009')], adicionales: [] },
    ] })
  const p3 = registrarPedido(db, { ...base, nombre: 'Luis Campos', celular: '900000003', puntoId: 1, observaciones: 'Cambio de papa por camote',
    comidas: [{ tipo: 'menu', mdpIds: [m('P00003'), m('P00007')], adicionales: [{ mdpId: m('P00016'), cantidad: 1 }] }] })
  const p4 = registrarPedido(db, { ...base, nombre: 'Carla Díaz', celular: '900000004', puntoId: 2,
    comidas: [{ tipo: 'menu', mdpIds: [m('P00017'), m('P00009')], adicionales: [] }, { tipo: 'menu', mdpIds: [m('P00017'), m('P00019')], adicionales: [] }] })
  registrarPedido(db, { ...base, menuId: 2, conAdelanto: true, nombre: 'Jorge Salas', celular: '900000005', puntoId: 1,
    comidas: [{ tipo: 'menu', mdpIds: [m('P00018', 2), m('P00020', 2)], adicionales: [] }] })

  avanzarEstado(db, p1, 'en_preparacion')
  avanzarEstado(db, p3, 'en_preparacion')
  avanzarEstado(db, p3, 'listo')
  anularTicket(db, db.tickets.filter(t => t.pedidoId === p4)[1].id, 'cliente', 'Ya no lo necesito')
  // Ana ya tenía 7 menús entregados antes: le faltan 3 para su menú gratis.
  db.fidelidad.push({ clienteId: 1, acumulados: 7, historicos: 7, disponibles: 0, canjeados: 0 })

  // Impresiones ya hechas y visitas del día (embudo).
  db.trabajos.forEach(t => { t.estado = 'impreso'; t.impresoAt = t.at; const tk = db.tickets.find(x => x.id === t.ticketId); if (tk) tk.vecesImpreso = 1 })
  for (let i = 0; i < 9; i++) {
    const v = registrarVisita(db, `demo-anon-${i}`, 1)
    if (i === 2) avanzarVisita(db, v, 'inicio_datos', '900000006', 'Rosa')
    else if (i % 3 === 0) avanzarVisita(db, v, 'armo_pedido')
  }
  db.pedidos.forEach((p, k) => {
    const v = registrarVisita(db, `demo-cli-${k}`, p.menuId)
    avanzarVisita(db, v, 'confirmo')
    const vis = db.visitas.find(x => x.id === v)!
    vis.pedidoId = p.id; vis.clienteId = p.clienteId
  })
  return db
}
