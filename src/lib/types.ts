// Tipos que replican las tablas de db_talara v2.0 (ver 01_estructura.sql).

export type Rol = 'entrada' | 'fondo' | 'adicional' | 'independiente'
export type EstadoPedido = 'pendiente_pago' | 'reservado' | 'en_preparacion' | 'listo' | 'entregado' | 'anulado'
export type EstadoPago = 'no_requerido' | 'pendiente' | 'pagado' | 'vencido'
export type Origen = 'cliente' | 'admin' | 'sistema'
export type Etapa = 'vio_menu' | 'armo_pedido' | 'inicio_datos' | 'confirmo'

export interface TipoPlato { id: number; codigo: string; nombre: string; rol: Rol; orden: number; visibleWeb: boolean; activo: boolean }
export interface Plato { id: number; codigo: string; tipoId: number; nombre: string; descripcion: string; precioSuelto: number; icono: string; activo: boolean }
export interface PuntoEntrega { id: number; codigo: string; nombre: string; direccion: string; hora: string; activo: boolean }
export interface MenuDia { id: number; fecha: string; precioMenu: number; refresco: string; estado: 'borrador' | 'publicado' | 'cerrado' }
export interface MenuDiaPlato {
  id: number; menuId: number; platoId: number; stockInicial: number; stockReservado: number
  precioSuelto: number; permiteSuelto: boolean; estado: 'disponible' | 'agotado' | 'retirado'; alertaStockBajoAt?: string
}
export interface Cliente {
  id: number; nombres: string; celular: string; email?: string; puntoHabitualId?: number
  aceptaWhatsapp: boolean; aceptaMarketing: boolean; primerPedidoAt?: string; ultimoPedidoAt?: string; creadoAt: string
}
export interface Dispositivo { token: string; clienteId?: number; primeraVisita: string }
export interface Visita {
  id: number; token: string; clienteId?: number; menuId: number; inicio: string; etapa: Etapa
  celularCapturado?: string; nombreCapturado?: string; pedidoId?: number
}
export interface Pedido {
  id: number; token: string; clienteId: number; menuId: number; fecha: string; puntoId: number; hora: string
  nombre: string; celular: string; email?: string; observaciones?: string
  requiereRevision: boolean; estadoRevision: 'no_aplica' | 'pendiente' | 'aprobada' | 'rechazada'
  subtotal: number; descuento: number; total: number
  estado: EstadoPedido; estadoPago: EstadoPago; montoAdelanto: number; pagoVenceAt?: string
  creadoAt: string; entregadoAt?: string; anuladoAt?: string; anuladoPor?: Origen; motivoAnulacion?: string
}
export interface Ticket {
  id: number; pedidoId: number; fecha: string; numero: number; tipo: 'menu' | 'suelto'
  precioBase: number; montoAdicionales: number; descuento: number; premio: boolean
  estado: 'activo' | 'entregado' | 'anulado'; vecesImpreso: number; anuladoAt?: string
}
export interface Item {
  id: number; ticketId: number; mdpId: number; rol: Rol; principalId?: number; codigoRef?: string
  descripcion: string; cantidad: number; precioUnitario: number; estado: 'activo' | 'anulado'
}
export interface Movimiento { id: number; mdpId: number; tipo: 'carga' | 'ajuste' | 'reserva' | 'liberacion'; cantidad: number; ticketId?: number; motivo: string; at: string }
export interface Anulacion { id: number; pedidoId: number; ticketId?: number; alcance: 'pedido' | 'ticket'; por: Origen; motivo: string; monto: number; at: string }
export interface Historial { id: number; pedidoId: number; de?: EstadoPedido; a: EstadoPedido; origen: Origen; comentario: string; at: string }
export interface Trabajo { id: number; ticketId: number; pedidoId: number; origen: 'automatico' | 'manual' | 'masivo' | 'reimpresion'; estado: 'pendiente' | 'impreso'; at: string; impresoAt?: string }
export interface Evento { id: number; tipo: 'stock_bajo' | 'plato_agotado' | 'anulacion' | 'pedido_con_observacion' | 'pago_por_validar'; texto: string; at: string; pedidoId?: number }
export interface Notificacion {
  id: number; canal: 'whatsapp' | 'email' | 'push'; motivo: 'confirmacion_pedido' | 'recordatorio_pago' | 'anulacion' | 'alerta_admin' | 'remarketing'
  destino: string; texto: string; costoUsd: number; estado: 'enviado' | 'entregado' | 'leido'; at: string; pedidoId?: number
}
export interface Fidelidad { clienteId: number; acumulados: number; historicos: number; disponibles: number; canjeados: number }
export interface Parametros { impresionAutomatica: boolean; umbralStock: number; consumosPremio: number; costoUtilidadUsd: number; tipoCambio: number }

export interface DB {
  version: number
  seq: Record<string, number>
  tickets_por_fecha: Record<string, number>
  parametros: Parametros
  tipos: TipoPlato[]; platos: Plato[]; puntos: PuntoEntrega[]
  menus: MenuDia[]; mdp: MenuDiaPlato[]
  clientes: Cliente[]; dispositivos: Dispositivo[]; visitas: Visita[]
  pedidos: Pedido[]; tickets: Ticket[]; items: Item[]
  movimientos: Movimiento[]; anulaciones: Anulacion[]; historial: Historial[]
  trabajos: Trabajo[]; eventos: Evento[]; notificaciones: Notificacion[]; fidelidad: Fidelidad[]
}

export class ErrorNegocio extends Error {
  codigo: string
  constructor(codigo: string, mensaje: string) {
    super(mensaje)
    this.codigo = codigo
  }
}
