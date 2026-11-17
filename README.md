# Talara! · Demo de la plataforma de pedidos

**Demo en línea:** https://talara-demo-pedidos.vercel.app

Demo navegable de la **web pública** (el cliente arma su pedido) y de la **intranet** (la administradora gestiona menú, stock, pedidos, impresión, clientes y embudo). **Es la base visual y funcional para construir el sistema real.**

> **Es una demo.** Los datos son ficticios y se guardan en el navegador de quien la abre (localStorage). No hay servidor ni base de datos real: esa es la siguiente fase, sobre la base de datos `db_talara` v2.1.

## ⚠️ Decisiones tomadas después de la demo (tienen prioridad sobre lo que se ve)
| En la demo | En el sistema real |
|---|---|
| Confirmaciones y alertas por **WhatsApp** (plantillas de utilidad) | **No se usa WhatsApp.** Se reemplaza por **notificaciones del navegador (Web Push)**, gratuitas, enviadas desde nuestro propio servidor |
| Bot que publica el menú en el grupo de WhatsApp | **Fuera de alcance.** El enlace del menú se comparte a mano en el grupo |
| Página "WhatsApp y alertas" de la intranet | Pasa a ser "Notificaciones y alertas" (push al cliente y a la administradora) |
| Impresión simulada en pantalla | **Impresión automática real:** cola de impresión → agente local (PC o mini PC) → impresora térmica de 80 mm por ESC/POS |

Notificaciones push previstas:
- **Al cliente:** pedido confirmado, pedido listo, ticket anulado y menú del día (si lo acepta).
- **A la administradora:** nuevo pedido, stock en 5 unidades, plato agotado, anulación, caso especial e impresora desconectada.
- **En iPhone** solo llegan si la web está instalada en la pantalla de inicio (iOS 16.4 o superior).

## Qué replica de la base de datos
Las reglas de `src/lib/reglas.ts` imitan los procedimientos y triggers de `db_talara`. **Úsalas como especificación funcional.**

| Regla | En la base de datos |
|---|---|
| Una comida = un ticket con número correlativo del día | `tickets`, `sp_siguiente_numero_ticket` |
| Menú = 1 entrada + 1 fondo; suelto = 1 plato | `sp_validar_ticket` |
| Presas por plato (pierna, pecho, encuentro), cada una con su stock | `familias_plato`, `platos.familia_id`, `platos.variante` |
| No se vende más de lo disponible; agotado automático; alerta con 5 | `sp_reservar_stock`, `trg_menu_dia_platos_bu` |
| Adicional ligado a su plato con código (ej. `10-A1`) | `ticket_items.item_principal_id`, `codigo_referencia` |
| Anulación parcial o total, devuelve stock | `sp_anular_ticket`, `sp_anular_pedido` |
| Pedido para mañana con adelanto del 50 % | `pedidos.estado_pago`, `pagos` |
| Cada 10 menús completos entregados, 1 gratis | `sp_marcar_pedido_entregado`, `sp_canjear_premio` |
| Impresión automática en cola | `trg_tickets_ai`, `trabajos_impresion` |
| Cliente reconocido sin login (token en el navegador, nunca por IP) | `dispositivos.token`, `clientes.celular` único |
| Todo o nada: si una regla falla, no se guarda nada | Transacción (`ejecutar()` trabaja sobre una copia) |

## Arquitectura del sistema real
- **Servidor:** VPS Hostinger KVM 2 (2 vCPU, 8 GB, 100 GB NVMe), Ubuntu 24.04, Docker + EasyPanel. Dominio: almuerzostalara.com.
- **Aplicación:** web pública + intranet + API (Node.js), con canal en tiempo real (WebSocket) hacia el agente de impresión.
- **Base de datos:** MySQL 8.4 LTS con `db_talara` v2.1: 39 tablas, triggers, procedimientos y 52 pruebas automáticas aprobadas.
- **Worker:** cola de notificaciones push, alertas programadas, vencimiento de adelantos y respaldos.
- La guía técnica, los scripts SQL, el diccionario de datos y los diagramas EER se entregan aparte al equipo.

## Estructura del código
```
src/lib/types.ts       Tipos = tablas de db_talara
src/lib/reglas.ts      Reglas de negocio (equivalen a los procedimientos y triggers)
src/lib/seed.ts        Datos de ejemplo (ficticios)
src/lib/store.ts       "Base de datos" en el navegador con transacciones simuladas
src/pages/Cliente.tsx  Web pública: menú, presas, carrito, datos y confirmación
src/pages/admin/       Intranet: panel, pedidos, cocina, menú, impresión, mensajes, clientes, embudo, catálogos
```

## Cómo probarla
1. Abre la web del cliente en una ventana y la intranet (`#/intranet`) en otra, en el mismo navegador: se sincronizan solas.
2. Haz un pedido en la web. En la intranet aparece al instante y la "impresora" lo imprime en ~1 segundo.
3. Prueba a agotar un plato, elegir una presa, anular una comida, pedir para mañana o entregar el pedido de Ana (gana su menú gratis).
4. **Reiniciar datos** (barra superior) deja todo como al inicio.

## Desarrollo
```bash
npm install
npm run dev
npm run build
```
