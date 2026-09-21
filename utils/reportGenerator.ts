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

/**
 * Genera un documento HTML formal para impresión/PDF con las 4 columnas contables exactas y cuadre de caja.
 */
export const generateEventReportHtml = (
  event: EventConfig,
  totals?: EventTotalsResult
): string => {
  const t = totals ?? calculateEventTotals(event);
  const dateStr = new Date(event.createdAt || Date.now()).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const participantsRows = t.participants
    .map((p) => {
      const isRefund = p.finalBalance < 0;
      const isOwed = p.finalBalance > 0;
      const balanceColor = isRefund ? '#059669' : isOwed ? '#D97706' : '#64748B';
      const balanceBg = isRefund ? '#ECFDF5' : isOwed ? '#FFFBEB' : '#F1F5F9';
      const balanceText = !p.isAttending
        ? p.totalPaid > 0 ? `Reembolso ${FormatCurrency(p.totalPaid)}` : 'En tablas ($0.00)'
        : isRefund
        ? `Reembolsar ${FormatCurrency(Math.abs(p.finalBalance))}`
        : isOwed
        ? `A Pagar ${FormatCurrency(p.finalBalance)}`
        : `En tablas ($0.00)`;

      const statusBadge = !p.isAttending && p.totalPaid === 0
        ? `<span style="background: #F1F5F9; color: #64748B; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 11px;">✕ AUSENTE</span>`
        : p.isSettled
        ? `<span style="background: #D1FAE5; color: #065F46; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px;">✓ LIQUIDADO</span>`
        : `<span style="background: #FEF3C7; color: #92400E; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px;">⏳ PENDIENTE</span>`;

      return `
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 12px 14px; font-weight: 600; color: #0F172A;">
            ${p.participantName}
            <div style="font-size: 11px; color: #64748B; font-weight: 400; margin-top: 2px;">
              ${p.subFamily} • ${p.category.toUpperCase()} • ${p.isAttending ? `${p.activeDaysCount} días` : 'No asistió'}
            </div>
          </td>
          <!-- 1. Cuota Proporcional -->
          <td style="padding: 12px 14px; text-align: right; color: #334155; font-weight: 500;">
            ${FormatCurrency(p.proportionalShare)}
          </td>
          <!-- 2. Aporte de su Bolsillo -->
          <td style="padding: 12px 14px; text-align: right; color: #334155; font-weight: 500;">
            ${FormatCurrency(p.totalPaid)}
          </td>
          <!-- 3. Saldo Neto -->
          <td style="padding: 12px 14px; text-align: right;">
            <div style="display: inline-block; background: ${balanceBg}; color: ${balanceColor}; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 12px;">
              ${balanceText}
            </div>
          </td>
          <!-- 4. Estatus de Liquidación -->
          <td style="padding: 12px 14px; text-align: center;">${statusBadge}</td>
        </tr>
      `;
    })
    .join('');

  const subFamilyRows = t.subFamilies
    .map((sf) => {
      const isRefund = sf.finalBalance < 0;
      const isOwed = sf.finalBalance > 0;
      const balanceColor = isRefund ? '#059669' : isOwed ? '#D97706' : '#64748B';
      const balanceBg = isRefund ? '#ECFDF5' : isOwed ? '#FFFBEB' : '#F1F5F9';
      const balanceText = isRefund
        ? `Reembolso ${FormatCurrency(Math.abs(sf.finalBalance))}`
        : isOwed
        ? `Paga ${FormatCurrency(sf.finalBalance)}`
        : `En tablas ($0.00)`;

      const statusBadge = sf.isFullySettled
        ? `<span style="background: #D1FAE5; color: #065F46; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px;">✓ LIQUIDADA</span>`
        : `<span style="background: #FEF3C7; color: #92400E; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px;">⏳ PENDIENTE</span>`;

      return `
        <tr style="border-bottom: 1px solid #E2E8F0; background-color: #F8FAFC;">
          <td style="padding: 12px 14px; font-weight: 700; color: #0F172A;">
            🏡 ${sf.subFamilyName}
            <div style="font-size: 11px; color: #64748B; font-weight: 400; margin-top: 2px;">
              ${sf.attendingCount} de ${sf.membersCount} asistentes
            </div>
          </td>
          <td style="padding: 12px 14px; text-align: right; color: #334155; font-weight: 600;">${FormatCurrency(sf.proportionalShare)}</td>
          <td style="padding: 12px 14px; text-align: right; color: #334155; font-weight: 600;">${FormatCurrency(sf.totalPaid)}</td>
          <td style="padding: 12px 14px; text-align: right;">
            <div style="display: inline-block; background: ${balanceBg}; color: ${balanceColor}; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 12px;">
              ${balanceText}
            </div>
          </td>
          <td style="padding: 12px 14px; text-align: center;">${statusBadge}</td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Corte y Liquidación - ${event.title}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 32px;
      background-color: #F8FAFC;
      color: #0F172A;
    }
    .ticket-container {
      max-width: 920px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 16px;
      padding: 36px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border: 1px solid #E2E8F0;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #F1F5F9;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      color: #0F172A;
      margin: 0 0 6px 0;
    }
    .subtitle {
      font-size: 13px;
      color: #64748B;
      margin: 0;
    }
    .badge-year {
      background: #EFF6FF;
      color: #2563EB;
      font-weight: 800;
      font-size: 16px;
      padding: 6px 14px;
      border-radius: 8px;
      border: 1px solid #BFDBFE;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }
    .kpi-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 16px;
      border-radius: 12px;
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748B;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .kpi-value {
      font-size: 20px;
      font-weight: 800;
      color: #0F172A;
    }
    .kpi-value-primary {
      font-size: 20px;
      font-weight: 800;
      color: #2563EB;
    }
    .cashbox-box {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cashbox-title {
      font-size: 14px;
      font-weight: 700;
      color: #166534;
      margin-bottom: 4px;
    }
    .cashbox-sub {
      font-size: 12px;
      color: #15803D;
    }
    .cashbox-amount {
      font-size: 22px;
      font-weight: 800;
      color: #166534;
      text-align: right;
    }
    .table-section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      background: #F8FAFC;
      padding: 12px 14px;
      text-align: left;
      font-weight: 700;
      color: #475569;
      border-bottom: 2px solid #E2E8F0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 20px;
      font-size: 12px;
      color: #94A3B8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="ticket-container">
    <div class="header-row">
      <div>
        <h1 class="title">Corte Oficial y Liquidación</h1>
        <p class="subtitle">${event.title} • Fecha: ${dateStr}</p>
      </div>
      <div class="badge-year">${event.year}</div>
    </div>

    <!-- KPIs Globales -->
    <div class="kpi-grid">
      <div class="kpi-box">
        <div class="kpi-label">Total Gastado</div>
        <div class="kpi-value">${FormatCurrency(t.totalExpenses)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Asistencia Real</div>
        <div class="kpi-value">${t.totalAttendingCount} / ${t.totalParticipantsCount}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Costo x Día (1.0)</div>
        <div class="kpi-value-primary">${FormatCurrency(t.costPerUnit)}</div>
      </div>
      <div class="kpi-box" style="background: ${t.totalPendingToCollect === 0 ? '#ECFDF5' : '#FFFBEB'}; border-color: ${t.totalPendingToCollect === 0 ? '#A7F3D0' : '#FDE68A'};">
        <div class="kpi-label" style="color: ${t.totalPendingToCollect === 0 ? '#065F46' : '#92400E'};">Pendiente x Cobrar</div>
        <div class="kpi-value" style="color: ${t.totalPendingToCollect === 0 ? '#065F46' : '#92400E'};">${FormatCurrency(t.totalPendingToCollect)}</div>
      </div>
    </div>

    <!-- Cuadre de Caja Común -->
    <div class="cashbox-box">
      <div>
        <div class="cashbox-title">🏦 Cuadre de Caja y Reembolsos</div>
        <div class="cashbox-sub">
          Recaudado de Deudores: ${FormatCurrency(t.totalCollected)} | Reembolsos Entregados a Compradores: ${FormatCurrency(t.totalRefunded)}
        </div>
      </div>
      <div>
        <div class="cashbox-amount">${FormatCurrency(t.cashInHand)}</div>
        <div style="font-size: 11px; color: #15803D; text-align: right;">Efectivo en Mano Disponible</div>
      </div>
    </div>

    <!-- 1. Desglose Transparente con las 4 Columnas Inalterables -->
    <div class="table-section">
      <div class="section-title">
        <span>👥 Desglose Contable por Participante</span>
        <span style="font-size: 12px; font-weight: 600; color: #64748B;">
          ${t.isFullySettled ? '✅ 100% Liquidado' : '⏳ Cobros en curso'}
        </span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Participante</th>
            <th style="text-align: right;">1. Cuota Proporcional</th>
            <th style="text-align: right;">2. Aporte de su Bolsillo</th>
            <th style="text-align: right;">3. Saldo Neto</th>
            <th style="text-align: center;">4. Estatus</th>
          </tr>
        </thead>
        <tbody>
          ${participantsRows}
        </tbody>
      </table>
    </div>

    <!-- 2. Resumen Consolidado por Subfamilia -->
    <div class="table-section">
      <div class="section-title">🏡 Consolidado por Subfamilia</div>
      <table>
        <thead>
          <tr>
            <th>Subfamilia</th>
            <th style="text-align: right;">1. Cuota Proporcional</th>
            <th style="text-align: right;">2. Aporte de su Bolsillo</th>
            <th style="text-align: right;">3. Saldo Neto</th>
            <th style="text-align: center;">4. Estatus</th>
          </tr>
        </thead>
        <tbody>
          ${subFamilyRows}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div>ChapApp • Sistema de Gestión de Gastos y Eventos Familiares</div>
      <div>Cuadre Contable: ${t.isCashBalanced ? '⚖️ Balance a Cero Cuadrado' : '⚠️ Pendiente'}</div>
    </div>
  </div>
</body>
</html>
  `;
};
