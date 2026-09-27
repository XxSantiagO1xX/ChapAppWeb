/**
 * ChapApp - Generador de Reportes, CSV y Exportaciones
 */

import { formatCurrency, calculateEventTotals } from './calculations.js';

/**
 * Genera el reporte general del evento en formato texto plano para WhatsApp.
 */
export const generateEventReportPlainText = (event, totals = null) => {
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
  text += `• Total Gastado: ${formatCurrency(t.totalExpenses)}\n`;
  text += `• Asistencia: ${t.totalAttendingCount} de ${t.totalParticipantsCount} personas\n`;
  text += `• Unidades Ponderadas: ${t.totalWeightedUnits}\n`;
  text += `• Costo por Día (1.0): ${formatCurrency(t.costPerUnit)}\n\n`;

  text += `🏦 CUADRE Y FLUJO DE CAJA COMÚN:\n`;
  text += `------------------------------------\n`;
  text += `• Total por Recaudar: ${formatCurrency(t.totalToCollect)}\n`;
  text += `• Efectivo Recaudado: ${formatCurrency(t.totalCollected)} (Pendiente: ${formatCurrency(t.totalPendingToCollect)})\n`;
  text += `• Total por Reembolsar: ${formatCurrency(t.totalToRefund)}\n`;
  text += `• Reembolsos Pagados: ${formatCurrency(t.totalRefunded)} (Pendiente: ${formatCurrency(t.totalPendingToRefund)})\n`;
  text += `• 💵 Dinero en Mano (Caja): ${formatCurrency(t.cashInHand)}\n`;
  text += `• Estado: ${t.isCashBalanced ? '⚖️ Cuadre Balanceado' : '⚠️ Diferencia en Caja'}\n\n`;

  text += `👨‍👩‍👧‍👦 RESUMEN POR SUBFAMILIA:\n`;
  text += `------------------------------------\n`;
  for (const sf of t.subFamilies) {
    const isRefund = sf.finalBalance < 0;
    const isOwed = sf.finalBalance > 0;
    let sfStatus = '';
    if (isRefund) {
      sfStatus = `REEMBOLSO A FAVOR: ${formatCurrency(Math.abs(sf.finalBalance))}`;
    } else if (isOwed) {
      sfStatus = `DEBE PAGAR: ${formatCurrency(sf.finalBalance)}`;
    } else {
      sfStatus = `EN TABLAS ($0.00)`;
    }
    const settleMark = sf.isFullySettled ? '✅ [LIQUIDADA]' : '⏳ [PENDIENTE]';

    text += `🏡 ${sf.subFamilyName.toUpperCase()}\n`;
    text += `   • 1. Cuota Proporcional: ${formatCurrency(sf.proportionalShare)}\n`;
    text += `   • 2. Aporte de su Bolsillo: ${formatCurrency(sf.totalPaid)}\n`;
    text += `   • 3. Saldo Neto: ${sfStatus}\n`;
    text += `   • 4. Estatus: ${settleMark}\n\n`;
  }

  text += `====================================\n`;
  text += `Generado por ChapApp • Gestión Financiera Familiar\n`;

  return text;
};

/**
 * Genera el ticket individual por subfamilia para compartir por WhatsApp.
 */
export const generateSubfamilyWhatsAppText = (subFamilyName, event, totals = null) => {
  const t = totals ?? calculateEventTotals(event);
  const sf = t.bySubFamily[subFamilyName];
  if (!sf) return '';

  const isRefund = sf.finalBalance < 0;
  const isOwed = sf.finalBalance > 0;
  let balanceHeader = '';
  if (isRefund) {
    balanceHeader = `💰 REEMBOLSO A FAVOR: ${formatCurrency(Math.abs(sf.finalBalance))}`;
  } else if (isOwed) {
    balanceHeader = `💳 SALDO A PAGAR: ${formatCurrency(sf.finalBalance)}`;
  } else {
    balanceHeader = `✓ CUENTA EN TABLAS ($0.00)`;
  }

  let text = `====================================\n`;
  text += `🧾 TICKET DE COBRO POS: ${subFamilyName.toUpperCase()}\n`;
  text += `📅 Evento: ${event.title} (${event.year})\n`;
  text += `====================================\n\n`;

  text += `📊 ESTADO FINANCIERO FAMILIAR:\n`;
  text += `• Cuota Proporcional: ${formatCurrency(sf.proportionalShare)}\n`;
  text += `• Aporte de su Cartera: ${formatCurrency(sf.totalPaid)}\n`;
  text += `------------------------------------\n`;
  text += `${balanceHeader}\n`;
  text += `• Estatus: ${sf.isFullySettled ? '✅ LIQUIDADO' : '⏳ PENDIENTE'}\n\n`;

  text += `👥 DETALLE POR INTEGRANTE:\n`;
  text += `------------------------------------\n`;

  for (const pId of sf.participantIds) {
    const p = t.byParticipantId[pId];
    if (!p) continue;

    if (!p.isAttending) {
      text += `• ${p.participantName} [NO ASISTIÓ]\n`;
      text += `  Compras: ${formatCurrency(p.totalPaid)} | Saldo: ${p.totalPaid > 0 ? `Reembolso ${formatCurrency(p.totalPaid)}` : '$0.00'}\n`;
      continue;
    }

    let pBal = '';
    if (p.finalBalance < 0) {
      pBal = `Reembolso ${formatCurrency(Math.abs(p.finalBalance))}`;
    } else if (p.finalBalance > 0) {
      pBal = `Paga ${formatCurrency(p.finalBalance)}`;
    } else {
      pBal = 'En tablas ($0.00)';
    }

    text += `• ${p.participantName} (${p.category} - ${p.activeDaysCount} días)\n`;
    text += `  Cuota: ${formatCurrency(p.proportionalShare)} | Pagado: ${formatCurrency(p.totalPaid)}\n`;
    text += `  Saldo: ${pBal} ${p.isSettled ? '✅' : '⏳'}\n\n`;
  }

  text += `====================================\n`;
  text += `Generado por ChapApp • Finanzas Familiares\n`;

  return text;
};

/**
 * Escapa valores para CSV estándar.
 */
const escapeCsv = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
};

/**
 * Genera el archivo CSV con UTF-8 BOM compatible con Excel y lo descarga directamente en el navegador.
 */
export const downloadEventCsv = (event, totals = null) => {
  const t = totals ?? calculateEventTotals(event);
  const dateStr = new Date(event.createdAt || Date.now()).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const lines = [];
  const BOM = '\uFEFF';

  // 1. Encabezado
  lines.push(`${escapeCsv('REPORTE CONTABLE Y CORTE DE LIQUIDACIÓN')}`);
  lines.push(`${escapeCsv('Evento:')},${escapeCsv(event.title)},${escapeCsv('Año:')},${escapeCsv(event.year)},${escapeCsv('Fecha:')},${escapeCsv(dateStr)}`);
  lines.push(`${escapeCsv('Total Gastado:')},${escapeCsv(t.totalExpenses)},${escapeCsv('Asistencia:')},${escapeCsv(`${t.totalAttendingCount} de ${t.totalParticipantsCount}`)},${escapeCsv('Costo x Unidad:')},${escapeCsv(t.costPerUnit)}`);
  lines.push(`${escapeCsv('Total x Recaudar:')},${escapeCsv(t.totalToCollect)},${escapeCsv('Recaudado en Caja:')},${escapeCsv(t.totalCollected)},${escapeCsv('Reembolsos:')},${escapeCsv(t.totalRefunded)},${escapeCsv('Efectivo en Caja:')},${escapeCsv(t.cashInHand)}`);
  lines.push('');

  // 2. Participantes
  lines.push(`${escapeCsv('--- DESGLOSE POR INTEGRANTE ---')}`);
  lines.push([
    escapeCsv('Participante'),
    escapeCsv('Subfamilia'),
    escapeCsv('Categoría'),
    escapeCsv('Asiste'),
    escapeCsv('Días'),
    escapeCsv('Unidades'),
    escapeCsv('Cuota Proporcional'),
    escapeCsv('Compras Propias'),
    escapeCsv('Saldo Neto'),
    escapeCsv('Estado')
  ].join(','));

  for (const p of t.participants) {
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
      escapeCsv(p.isSettled ? 'Liquidado' : 'Pendiente')
    ].join(','));
  }

  lines.push('');

  // 3. Subfamilias
  lines.push(`${escapeCsv('--- CONSOLIDADO POR SUBFAMILIA ---')}`);
  lines.push([
    escapeCsv('Subfamilia'),
    escapeCsv('Asistentes'),
    escapeCsv('Total Integrantes'),
    escapeCsv('Unidades'),
    escapeCsv('Cuota Familiar'),
    escapeCsv('Compras Pagadas'),
    escapeCsv('Saldo Neto'),
    escapeCsv('Estado')
  ].join(','));

  for (const sf of t.subFamilies) {
    lines.push([
      escapeCsv(sf.subFamilyName),
      escapeCsv(sf.attendingCount),
      escapeCsv(sf.membersCount),
      escapeCsv(sf.totalWeightedUnits),
      escapeCsv(sf.proportionalShare),
      escapeCsv(sf.totalPaid),
      escapeCsv(sf.finalBalance),
      escapeCsv(sf.isFullySettled ? 'Liquidada' : 'Pendiente')
    ].join(','));
  }

  const csvContent = BOM + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `corte_${event.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_${event.year}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Abre la app de WhatsApp o WhatsApp Web con el texto pre-cargado.
 */
export const shareViaWhatsApp = (text) => {
  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Imprime un documento o ticket abriendo una ventana limpia de impresión.
 */
export const printReportHtml = (title, htmlContent) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite las ventanas emergentes para generar el PDF / Impresión.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: #ffffff;
          color: #0f172a;
          margin: 0;
          padding: 24px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
        .print-btn-bar {
          margin-bottom: 20px;
          display: flex;
          gap: 12px;
        }
        .btn-print {
          background: #0284c7;
          color: white;
          padding: 10px 18px;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="print-btn-bar no-print">
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
        <button class="btn-print" style="background:#64748b" onclick="window.close()">Cerrar</button>
      </div>
      ${htmlContent}
    </body>
    </html>
  `);
  printWindow.document.close();
};
