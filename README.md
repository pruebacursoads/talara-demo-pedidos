# Talara! · Demo de la plataforma de pedidos

Demo navegable para presentar la **web pública** (el cliente arma su pedido) y la **intranet** (Maritza gestiona menú, stock, pedidos, impresión, WhatsApp, clientes y embudo).

> **Es una demo.** Los datos son de prueba y se guardan en el navegador de quien la abre (localStorage). No hay servidor ni base de datos real: esa es la siguiente fase, sobre `db_talara` v2.0 (carpeta *Entrega 01 - BD y Arquitectura*).

## Qué replica de la base de datos
Las reglas de `src/lib/reglas.ts` imitan los procedimientos y triggers de `db_talara`:

| Regla | En la BD |
|---|---|
| Una comida = un ticket con número correlativo del día | `tickets`, `sp_siguiente_numero_ticket` |
| Menú = 1 entrada + 1 fondo; suelto = 1 plato | `sp_validar_ticket` |
| No se vende más de lo disponible; agotado automático; alerta con 5 | `sp_reservar_stock`, `trg_menu_dia_platos_bu` |
| Adicional ligado a su plato con código (ej. `10-A1`) | `ticket_items.item_principal_id`, `codigo_referencia` |
| Anulación parcial o total, devuelve stock | `sp_anular_ticket`, `sp_anular_pedido` |
| Pedido para mañana con adelanto del 50 % | `pedidos.estado_pago`, `pagos` |
| Cada 10 menús completos entregados, 1 gratis | `sp_marcar_pedido_entregado`, `sp_canjear_premio` |
| Impresión automática en cola | `trg_tickets_ai`, `trabajos_impresion` |
| Todo o nada: si una regla falla, no se guarda nada | Transacción (`ejecutar()` trabaja sobre una copia) |

## Cómo presentarla
1. Abre la web del cliente en una ventana y la intranet en otra (`#/intranet`), en el mismo navegador: se sincronizan solas.
2. Haz un pedido en la web: en la intranet aparece al instante y la "impresora" lo imprime en ~1 segundo.
3. Prueba: agotar un plato, anular una comida, pedir para mañana, entregar el pedido de María (gana su menú gratis).
4. **Reiniciar datos** (barra superior) deja todo como al inicio.

## Desarrollo
```bash
npm install
npm run dev
npm run build
```

## Despliegue en Vercel
Importar el repositorio en Vercel → framework **Vite** (se detecta solo) → Deploy. Usa `HashRouter`, así que no necesita reglas de reescritura.
