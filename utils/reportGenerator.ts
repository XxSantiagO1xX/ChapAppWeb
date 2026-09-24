import type { EventConfig } from '../types';
import { calculateEventTotals, type EventTotalsResult } from './calculations';
import { FormatCurrency } from '../constants/theme';

/**
 * Genera un texto plano estructurado y elegante para WhatsApp/mensajería con las 4 columnas contables.
 */
export const generateEventReportPlainText = (
  event: EventConfig,
  totals?: EventTotalsResult
): string => {
  const t = totals ?? calculateEventTotals(event);
  const dateStr = new Date(event.createdAt || Date.now()).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let text = `====================================\n`;
  text += `🧾 CORTE Y BALANCE: ${event.title.toUpperCase()}\n`;
  text += `📅 Año: ${event.year} | Fecha: ${dateStr}\n`;
  text += `====================================\n\n`;

  text += `📊 TOTALES DEL EVENTO:\n`;
  text += `• Total Gastado: ${FormatCurrency(t.totalExpenses)}\n`;
  text += `• Asistencia: ${t.totalAttendingCount} de ${t.totalParticipantsCount} personas\n`;
  text += `• Unidades Ponderadas: ${t.totalWeightedUnits}\n`;
  text += `• Costo por Día (1.0): ${FormatCurrency(t.costPerUnit)}\n\n`;

  text += `🏦 CUADRE Y FLUJO DE CAJA COMÚN:\n`;
  text += `------------------------------------\n`;
  text += `• Total por Recaudar (Entradas): ${FormatCurrency(t.totalToCollect)}\n`;
  text += `• Efectivo Recaudado en Caja: ${FormatCurrency(t.totalCollected)} (Faltan: ${FormatCurrency(t.totalPendingToCollect)})\n`;
  text += `• Total por Reembolsar (Salidas): ${FormatCurrency(t.totalToRefund)}\n`;
  text += `• Reembolsos Entregados: ${FormatCurrency(t.totalRefunded)} (Faltan: ${FormatCurrency(t.totalPendingToRefund)})\n`;
  text += `• 💵 Dinero en Mano (Caja Actual): ${FormatCurrency(t.cashInHand)}\n`;
  text += `• Estado Contable: ${t.isCashBalanced ? '⚖️ Cuadre a Cero Balanceado' : '⚠️ Diferencia en Caja'}\n\n`;

  text += `👨‍👩‍👧‍👦 RESUMEN POR SUBFAMILIA:\n`;
  text += `------------------------------------\n`;
  for (const sf of t.subFamilies) {
    const isRefund = sf.finalBalance < 0;
    const isOwed = sf.finalBalance > 0;
    let sfStatus = '';
    if (isRefund) {
      sfStatus = `REEMBOLSO A FAVOR: ${FormatCurrency(Math.abs(sf.finalBalance))}`;
    } else if (isOwed) {
      sfStatus = `DEBE PAGAR: ${FormatCurrency(sf.finalBalance)}`;
    } else {
      sfStatus = `EN TABLAS ($0.00)`;
    }
    const settleMark = sf.isFullySettled ? '✅ [LIQUIDADA]' : '⏳ [PENDIENTE]';

    text += `🏡 ${sf.subFamilyName.toUpperCase()}\n`;
    text += `   • 1. Cuota Proporcional: ${FormatCurrency(sf.proportionalShare)}\n`;
    text += `   • 2. Aporte de su Bolsillo: ${FormatCurrency(sf.totalPaid)}\n`;
    text += `   • 3. Saldo Neto: ${sfStatus}\n`;
    text += `   • 4. Estatus: ${settleMark}\n\n`;
  }

  text += `👥 DESGLOSE CONTABLE POR PARTICIPANTE:\n`;
  text += `------------------------------------\n`;

  for (const p of t.participants) {
    if (!p.isAttending) {
      text += `👤 ${p.participantName} [NO ASISTIÓ]\n`;
      text += `   • Subfamilia: ${p.subFamily}\n`;
      text += `   • 1. Cuota Proporcional: $0.00 (Ausente)\n`;
      text += `   • 2. Aporte de su Bolsillo: ${FormatCurrency(p.totalPaid)}\n`;
      text += `   • 3. Saldo Neto: ${p.totalPaid > 0 ? `REEMBOLSO ${FormatCurrency(p.totalPaid)}` : 'EN TABLAS ($0.00)'}\n`;
      text += `   • 4. Estatus: ${p.isSettled ? '✅ [LIQUIDADO]' : '⏳ [PENDIENTE]'}\n\n`;
      continue;
    }

    const statusMark = p.isSettled ? '✅ [LIQUIDADO]' : '⏳ [PENDIENTE]';
    let balanceText = '';
    if (p.finalBalance < 0) {
      balanceText = `REEMBOLSAR ${FormatCurrency(Math.abs(p.finalBalance))}`;
    } else if (p.finalBalance > 0) {
      balanceText = `A PAGAR ${FormatCurrency(p.finalBalance)}`;
    } else {
      balanceText = `EN TABLAS ($0.00)`;
    }

    text += `👤 ${p.participantName} (${p.category.toUpperCase()} - ${p.subFamily})\n`;
    text += `   • 1. Cuota Proporcional: ${FormatCurrency(p.proportionalShare)} (${p.activeDaysCount} días / ${p.weightedUnits} uds)\n`;
    text += `   • 2. Aporte de su Bolsillo: ${FormatCurrency(p.totalPaid)}\n`;
    text += `   • 3. Saldo Neto: ${balanceText}\n`;
    text += `   • 4. Estatus: ${statusMark}\n\n`;
  }

  text += `====================================\n`;
  text += `Generado por ChapApp • Gestión Financiera Familiar\n`;

  return text;
};

import { generateEventCutHtml, generatePosTicketHtml } from './pdfTemplates';
export { generateEventCutHtml, generatePosTicketHtml };

/**
 * Genera un documento HTML formal Dark Neumorphism para impresión/PDF con las 4 columnas contables exactas y cuadre de caja.
 */
export const generateEventReportHtml = (
  event: EventConfig,
  totals?: EventTotalsResult
): string => {
  return generateEventCutHtml(event, totals);
};

/**
 * Escapa valores para CSV estándar.
 */
const escapeCsv = (val: string | number | null | undefined): string => {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
};

/**
 * Genera un archivo CSV con codificación UTF-8 BOM compatible con Excel,
 * conteniendo el resumen del evento, el desglose por participante y el consolidado por subfamilia.
 */
export const generateEventReportCsv = (
  event: EventConfig,
  totals?: EventTotalsResult
): string => {
  const t = totals ?? calculateEventTotals(event);
  const dateStr = new Date(event.createdAt || Date.now()).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const lines: string[] = [];

  // UTF-8 BOM para soporte de acentos en Microsoft Excel
  const BOM = '\uFEFF';

  // 1. Resumen General del Evento
  lines.push(`${escapeCsv('REPORTE CONTABLE Y CORTE DE LIQUIDACIÓN')}`);
  lines.push(`${escapeCsv('Evento:')},${escapeCsv(event.title)},${escapeCsv('Año:')},${escapeCsv(event.year)},${escapeCsv('Fecha:')},${escapeCsv(dateStr)}`);
  lines.push(`${escapeCsv('Total Gastado:')},${escapeCsv(t.totalExpenses)},${escapeCsv('Asistencia:')},${escapeCsv(`${t.totalAttendingCount} de ${t.totalParticipantsCount}`)},${escapeCsv('Costo x Unidad Base:')},${escapeCsv(t.costPerUnit)}`);
  lines.push(`${escapeCsv('Total x Recaudar:')},${escapeCsv(t.totalToCollect)},${escapeCsv('Recaudado en Caja:')},${escapeCsv(t.totalCollected)},${escapeCsv('Reembolsos Pagados:')},${escapeCsv(t.totalRefunded)},${escapeCsv('Efectivo en Caja:')},${escapeCsv(t.cashInHand)}`);
  lines.push('');

  // 2. Desglose Contable por Participante (Las 4 Columnas)
  lines.push(`${escapeCsv('--- DESGLOSE POR INTEGRANTE (4 COLUMNAS CONTABLES) ---')}`);
  lines.push([
    escapeCsv('Participante'),
    escapeCsv('Subfamilia'),
    escapeCsv('Categoría'),
    escapeCsv('Asiste'),
    escapeCsv('Días Asistidos'),
    escapeCsv('Unidades Ponderadas'),
    escapeCsv('1. Cuota Proporcional'),
    escapeCsv('2. Aporte de Bolsillo (Compras)'),
    escapeCsv('3. Saldo Neto'),
    escapeCsv('Tipo de Saldo'),
    escapeCsv('4. Estatus de Liquidación'),
  ].join(','));

  for (const p of t.participants) {
    const isRefund = p.finalBalance < 0;
    const isOwed = p.finalBalance > 0;
    const saldoTipo = !p.isAttending && p.totalPaid > 0
      ? 'Reembolso por Ausencia'
      : isRefund
      ? 'Reembolso a Favor'
      : isOwed
      ? 'Debe Pagar Efectivo'
      : 'Al Corriente ($0.00)';
    const statusText = p.isSettled ? 'Liquidado' : 'Pendiente';

    lines.push([
      escapeCsv(p.participantName),
      escapeCsv(p.subFamily),
      escapeCsv(p.category.toUpperCase()),
      escapeCsv(p.isAttending ? 'SÍ' : 'NO'),
      escapeCsv(p.activeDaysCount),
      escapeCsv(p.weightedUnits),
      escapeCsv(p.proportionalShare),
      escapeCsv(p.totalPaid),
      escapeCsv(p.finalBalance),
      escapeCsv(saldoTipo),
      escapeCsv(statusText),
    ].join(','));
  }

  lines.push('');

  // 3. Consolidado por Subfamilia
  lines.push(`${escapeCsv('--- CONSOLIDADO POR SUBFAMILIA ---')}`);
  lines.push([
    escapeCsv('Subfamilia'),
    escapeCsv('Miembros Asistentes'),
    escapeCsv('Total Miembros'),
    escapeCsv('Unidades de Costo'),
    escapeCsv('1. Cuota Proporcional'),
    escapeCsv('2. Compras de Bolsillo'),
    escapeCsv('3. Saldo Neto Familiar'),
    escapeCsv('Tipo de Saldo'),
    escapeCsv('4. Estatus de Cuenta'),
  ].join(','));

  for (const sf of t.subFamilies) {
    const isRefund = sf.finalBalance < 0;
    const isOwed = sf.finalBalance > 0;
    const saldoTipo = isRefund
      ? 'Reembolso a Devolver'
      : isOwed
      ? 'Debe Entregar Efectivo'
      : 'Al Corriente ($0.00)';
    const statusText = sf.isFullySettled ? 'Liquidada' : 'Pendiente';

    lines.push([
      escapeCsv(sf.subFamilyName),
      escapeCsv(sf.attendingCount),
      escapeCsv(sf.membersCount),
      escapeCsv(sf.totalWeightedUnits),
      escapeCsv(sf.proportionalShare),
      escapeCsv(sf.totalPaid),
      escapeCsv(sf.finalBalance),
      escapeCsv(saldoTipo),
      escapeCsv(statusText),
    ].join(','));
  }

  lines.push('');
  lines.push(`${escapeCsv('Generado automáticamente por ChapApp')} - ${escapeCsv(new Date().toISOString())}`);

  return BOM + lines.join('\r\n');
};
