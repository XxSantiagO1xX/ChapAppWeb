import type { EventConfig, CategoryType } from '../types';
import { calculateEventTotals, type EventTotalsResult } from './calculations';
import { FormatCurrency } from '../constants/theme';

export interface PosGuestParam {
  id: string;
  name: string;
  category: CategoryType;
  daysCount: number;
}

export interface PosTicketHtmlParams {
  subFamilyName: string;
  event: EventConfig;
  totals?: EventTotalsResult;
  guests?: PosGuestParam[];
  isSettled?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  Comida: '#00E676',
  'Gastos Generales': '#00E5FF',
  Varios: '#D500F9',
  Rentas: '#FFAB00',
  Mejoras: '#FF1744',
};

const DEFAULT_CATEGORY_COLOR = '#00E5FF';

/**
 * Plantilla 1: PDF de Corte General del Evento
 * Basado estrictamente en la estética Dark Neumorphism (fondos grises oscuros mate, sombras suaves de profundidad y acentos LED tenues).
 */
export const generateEventCutHtml = (
  event: EventConfig,
  totals?: EventTotalsResult
): string => {
  const t = totals ?? calculateEventTotals(event);
  const dateStr = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const collectionPercent =
    t.totalToCollect > 0
      ? Math.min(100, Math.round((t.totalCollected / t.totalToCollect) * 100))
      : 100;

  // Cálculo de distribución por categorías
  const categoryTotals: Record<string, { total: number; count: number }> = {};
  event.expenses.forEach((exp) => {
    const cat = exp.category || 'Varios';
    if (!categoryTotals[cat]) {
      categoryTotals[cat] = { total: 0, count: 0 };
    }
    categoryTotals[cat].total += exp.amount;
    categoryTotals[cat].count += 1;
  });

  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1].total - a[1].total);

  const categoryBarsHtml = categoryEntries
    .map(([cat, data]) => {
      const percentage = t.totalExpenses > 0 ? (data.total / t.totalExpenses) * 100 : 0;
      const color = CATEGORY_COLORS[cat] || DEFAULT_CATEGORY_COLOR;
      return `
        <div class="category-item">
          <div class="category-header">
            <span class="category-name">
              <span class="category-dot" style="background-color: ${color}; box-shadow: 0 0 8px ${color}80;"></span>
              ${cat} <span class="category-count">(${data.count} gasto${data.count === 1 ? '' : 's'})</span>
            </span>
            <span class="category-amount">${FormatCurrency(data.total)} <span class="category-percent">(${percentage.toFixed(1)}%)</span></span>
          </div>
          <div class="progress-track">
            <div class="progress-bar" style="width: ${Math.max(2, percentage)}%; background: linear-gradient(90deg, ${color}AA, ${color}); box-shadow: 0 0 10px ${color}60;"></div>
          </div>
        </div>
      `;
    })
    .join('');

  // Filas de Subfamilias (Tabla Maestra)
  const subFamilyRows = t.subFamilies
    .map((sf) => {
      const isRefund = sf.finalBalance < 0;
      const isOwed = sf.finalBalance > 0;
      const balanceColor = isRefund ? '#00E676' : isOwed ? '#FF1744' : '#9CA3AF';
      const balanceBg = isRefund
        ? 'rgba(0, 230, 118, 0.12)'
        : isOwed
        ? 'rgba(255, 23, 68, 0.12)'
        : 'rgba(255, 255, 255, 0.05)';
      const balanceBorder = isRefund
        ? 'rgba(0, 230, 118, 0.35)'
        : isOwed
        ? 'rgba(255, 23, 68, 0.35)'
        : 'rgba(255, 255, 255, 0.08)';
      const balanceText = isRefund
        ? `Reembolso ${FormatCurrency(Math.abs(sf.finalBalance))}`
        : isOwed
        ? `Paga ${FormatCurrency(sf.finalBalance)}`
        : `En tablas ($0.00)`;

      const statusBadge = sf.isFullySettled
        ? `<span class="badge-settled">✓ LIQUIDADA</span>`
        : `<span class="badge-pending">⏳ PENDIENTE</span>`;

      return `
        <tr>
          <td class="col-name">
            <div class="main-title">🏡 ${sf.subFamilyName}</div>
            <div class="sub-info">${sf.attendingCount} de ${sf.membersCount} asistentes • ${sf.totalWeightedUnits} uds</div>
          </td>
          <td class="col-currency">${FormatCurrency(sf.proportionalShare)}</td>
          <td class="col-currency">${FormatCurrency(sf.totalPaid)}</td>
          <td class="col-balance">
            <span class="balance-pill" style="background: ${balanceBg}; color: ${balanceColor}; border-color: ${balanceBorder};">
              ${balanceText}
            </span>
          </td>
          <td class="col-status">${statusBadge}</td>
        </tr>
      `;
    })
    .join('');

  // Filas de Desglose por Integrante
  const participantRows = t.participants
    .map((p) => {
      const isRefund = p.finalBalance < 0;
      const isOwed = p.finalBalance > 0;
      const balanceColor = isRefund ? '#00E676' : isOwed ? '#FFAB00' : '#9CA3AF';
      const balanceBg = isRefund
        ? 'rgba(0, 230, 118, 0.1)'
        : isOwed
        ? 'rgba(255, 171, 0, 0.1)'
        : 'rgba(255, 255, 255, 0.04)';
      const balanceBorder = isRefund
        ? 'rgba(0, 230, 118, 0.3)'
        : isOwed
        ? 'rgba(255, 171, 0, 0.3)'
        : 'rgba(255, 255, 255, 0.06)';

      const balanceText = !p.isAttending
        ? p.totalPaid > 0
          ? `Reembolso ${FormatCurrency(p.totalPaid)}`
          : 'En tablas ($0.00)'
        : isRefund
        ? `Reembolsar ${FormatCurrency(Math.abs(p.finalBalance))}`
        : isOwed
        ? `A Pagar ${FormatCurrency(p.finalBalance)}`
        : `En tablas ($0.00)`;

      const statusBadge =
        !p.isAttending && p.totalPaid === 0
          ? `<span class="badge-absent">✕ AUSENTE</span>`
          : p.isSettled
          ? `<span class="badge-settled-sm">✓ LIQUIDADO</span>`
          : `<span class="badge-pending-sm">⏳ PENDIENTE</span>`;

      return `
        <tr>
          <td class="col-name">
            <div class="main-title">${p.participantName}</div>
            <div class="sub-info">${p.subFamily} • ${p.category.toUpperCase()} • ${p.isAttending ? `${p.activeDaysCount} días (${p.weightedUnits} uds)` : 'Ausente'}</div>
          </td>
          <td class="col-currency">${FormatCurrency(p.proportionalShare)}</td>
          <td class="col-currency">${FormatCurrency(p.totalPaid)}</td>
          <td class="col-balance">
            <span class="balance-pill-sm" style="background: ${balanceBg}; color: ${balanceColor}; border-color: ${balanceBorder};">
              ${balanceText}
            </span>
          </td>
          <td class="col-status">${statusBadge}</td>
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
  <title>Corte General - ${event.title}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page-break { page-break-before: always; }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #121419;
      color: #F1F3F9;
      padding: 32px;
      line-height: 1.4;
    }
    .document-wrapper {
      max-width: 960px;
      margin: 0 auto;
      background: #181B23;
      border-radius: 20px;
      padding: 36px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: -6px -6px 16px rgba(255, 255, 255, 0.03), 8px 8px 24px rgba(0, 0, 0, 0.7);
    }
    
    /* Header Neumórfico */
    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 28px;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-badge {
      width: 48px;
      height: 48px;
      background: #13151B;
      border: 1px solid rgba(0, 229, 255, 0.35);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.7), 0 0 14px rgba(0, 229, 255, 0.25);
    }
    .app-title {
      font-size: 24px;
      font-weight: 800;
      color: #F1F3F9;
      letter-spacing: -0.5px;
    }
    .app-subtitle {
      font-size: 12px;
      font-weight: 600;
      color: #00E5FF;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .header-event-info {
      text-align: right;
    }
    .event-title-badge {
      display: inline-block;
      font-size: 16px;
      font-weight: 700;
      color: #F1F3F9;
      background: #20242E;
      padding: 6px 14px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: -2px -2px 6px rgba(255, 255, 255, 0.03), 3px 3px 8px rgba(0, 0, 0, 0.4);
    }
    .event-date-text {
      font-size: 12px;
      color: #9CA3AF;
      margin-top: 6px;
    }

    /* 4 KPIs Financieros Neumórficos */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .kpi-card {
      background: #20242E;
      border-radius: 14px;
      padding: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      border-left: 1px solid rgba(255, 255, 255, 0.08);
      border-bottom: 1px solid rgba(0, 0, 0, 0.6);
      border-right: 1px solid rgba(0, 0, 0, 0.4);
      box-shadow: -3px -3px 8px rgba(255, 255, 255, 0.03), 4px 4px 12px rgba(0, 0, 0, 0.5);
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 700;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .kpi-val {
      font-size: 19px;
      font-weight: 800;
      color: #F1F3F9;
    }
    .kpi-val-primary { color: #00E5FF; text-shadow: 0 0 10px rgba(0, 229, 255, 0.3); }
    .kpi-val-success { color: #00E676; text-shadow: 0 0 10px rgba(0, 230, 118, 0.3); }
    .kpi-val-warning { color: #FFAB00; text-shadow: 0 0 10px rgba(255, 171, 0, 0.3); }
    .kpi-sub {
      font-size: 11px;
      color: #6B7280;
      margin-top: 4px;
      font-weight: 500;
    }

    /* Caja Común / Cuadre Banner */
    .cashbox-banner {
      background: #14161C;
      border-radius: 14px;
      padding: 16px 20px;
      border: 1px solid rgba(0, 230, 118, 0.25);
      box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.65), 0 0 12px rgba(0, 230, 118, 0.15);
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }
    .cashbox-left-title {
      font-size: 14px;
      font-weight: 700;
      color: #00E676;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cashbox-left-desc {
      font-size: 12px;
      color: #9CA3AF;
      margin-top: 4px;
    }
    .cashbox-right-val {
      font-size: 22px;
      font-weight: 800;
      color: #00E676;
      text-align: right;
      text-shadow: 0 0 12px rgba(0, 230, 118, 0.4);
    }
    .cashbox-right-lbl {
      font-size: 10px;
      text-transform: uppercase;
      color: #6B7280;
      letter-spacing: 0.5px;
      text-align: right;
    }

    /* Sección de Presupuesto y Categorías */
    .section-card {
      background: #1D212A;
      border-radius: 16px;
      padding: 22px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      box-shadow: -4px -4px 10px rgba(255, 255, 255, 0.02), 5px 5px 14px rgba(0, 0, 0, 0.5);
      margin-bottom: 30px;
    }
    .section-header-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #F1F3F9;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .category-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }
    .category-item {
      background: #14161C;
      border-radius: 10px;
      padding: 12px 14px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.5);
    }
    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .category-name {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #F1F3F9;
    }
    .category-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .category-count {
      color: #6B7280;
      font-size: 11px;
      font-weight: 400;
    }
    .category-amount {
      color: #F1F3F9;
    }
    .category-percent {
      color: #9CA3AF;
      font-size: 11px;
    }
    .progress-track {
      width: 100%;
      height: 6px;
      background: #252932;
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      border-radius: 3px;
    }

    /* Tabla Maestra Neumórfica */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      background: #14161C;
      padding: 12px 14px;
      text-align: left;
      font-weight: 700;
      color: #9CA3AF;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    td {
      padding: 14px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      vertical-align: middle;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .col-name { width: 34%; }
    .col-currency { width: 18%; text-align: right; font-weight: 600; color: #F1F3F9; }
    .col-balance { width: 20%; text-align: right; }
    .col-status { width: 10%; text-align: center; }

    .main-title {
      font-weight: 700;
      color: #F1F3F9;
      font-size: 13px;
    }
    .sub-info {
      font-size: 10px;
      color: #9CA3AF;
      margin-top: 3px;
    }
    .balance-pill {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
      border: 1px solid;
    }
    .balance-pill-sm {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 10px;
      border: 1px solid;
    }
    .badge-settled {
      display: inline-block;
      background: rgba(0, 230, 118, 0.15);
      color: #00E676;
      border: 1px solid rgba(0, 230, 118, 0.4);
      padding: 4px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 10px;
      box-shadow: 0 0 8px rgba(0, 230, 118, 0.25);
    }
    .badge-pending {
      display: inline-block;
      background: rgba(255, 171, 0, 0.15);
      color: #FFAB00;
      border: 1px solid rgba(255, 171, 0, 0.4);
      padding: 4px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 10px;
    }
    .badge-settled-sm {
      display: inline-block;
      background: rgba(0, 230, 118, 0.12);
      color: #00E676;
      border: 1px solid rgba(0, 230, 118, 0.3);
      padding: 3px 6px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 9px;
    }
    .badge-pending-sm {
      display: inline-block;
      background: rgba(255, 171, 0, 0.12);
      color: #FFAB00;
      border: 1px solid rgba(255, 171, 0, 0.3);
      padding: 3px 6px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 9px;
    }
    .badge-absent {
      display: inline-block;
      background: rgba(107, 114, 128, 0.15);
      color: #6B7280;
      padding: 3px 6px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 9px;
    }

    /* Footer */
    .document-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 20px;
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #6B7280;
    }
    .footer-stamp {
      color: #00E5FF;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="document-wrapper">
    <!-- Header -->
    <div class="header-banner">
      <div class="header-brand">
        <div class="logo-badge">💵</div>
        <div>
          <div class="app-title">ChapApp</div>
          <div class="app-subtitle">Corte General de Evento</div>
        </div>
      </div>
      <div class="header-event-info">
        <div class="event-title-badge">${event.title} (${event.year})</div>
        <div class="event-date-text">Emisión: ${dateStr} • ${timeStr}</div>
      </div>
    </div>

    <!-- 4 KPIs Financieros -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label"><span>🧾</span> Total Gastado</div>
        <div class="kpi-val">${FormatCurrency(t.totalExpenses)}</div>
        <div class="kpi-sub">${event.expenses.length} compras registradas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><span>📥</span> Recaudado en Caja</div>
        <div class="kpi-val kpi-val-primary">${FormatCurrency(t.totalCollected)}</div>
        <div class="kpi-sub">${collectionPercent}% de la meta de cobro</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><span>⏳</span> Pendiente x Cobrar</div>
        <div class="kpi-val ${t.totalPendingToCollect === 0 ? 'kpi-val-success' : 'kpi-val-warning'}">
          ${FormatCurrency(t.totalPendingToCollect)}
        </div>
        <div class="kpi-sub">${t.totalPendingToCollect === 0 ? 'Cobros al 100%' : 'Saldo por recibir'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><span>💵</span> En Caja (Mano)</div>
        <div class="kpi-val kpi-val-success">${FormatCurrency(t.cashInHand)}</div>
        <div class="kpi-sub">Fondo disponible en caja</div>
      </div>
    </div>

    <!-- Cuadre de Caja Común -->
    <div class="cashbox-banner">
      <div>
        <div class="cashbox-left-title">
          <span>🏦</span> Cuadre de Caja y Liquidación
        </div>
        <div class="cashbox-left-desc">
          Entradas Recaudadas: ${FormatCurrency(t.totalCollected)} | Salidas de Reembolso: ${FormatCurrency(t.totalRefunded)}
        </div>
      </div>
      <div>
        <div class="cashbox-right-val">${FormatCurrency(t.cashInHand)}</div>
        <div class="cashbox-right-lbl">Efectivo Físico en Caja</div>
      </div>
    </div>

    <!-- Distribución Presupuestaria por Rubros -->
    ${
      categoryEntries.length > 0
        ? `
      <div class="section-card">
        <div class="section-header-title">
          <span>📊 Distribución Presupuestaria por Rubro</span>
          <span style="font-size: 11px; color: #9CA3AF; font-weight: 500;">Costo/Día Unitario: ${FormatCurrency(t.costPerUnit)}</span>
        </div>
        <div class="category-grid">
          ${categoryBarsHtml}
        </div>
      </div>
    `
        : ''
    }

    <!-- Tabla Maestra de Control de Subfamilias -->
    <div class="section-card">
      <div class="section-header-title">
        <span>🏡 Control Contable por Subfamilia</span>
        <span style="font-size: 11px; color: ${t.isFullySettled ? '#00E676' : '#FFAB00'}; font-weight: 600;">
          ${t.isFullySettled ? '✓ Todas las Cuentas Liquidadas' : '⏳ Cuentas Pendientes'}
        </span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Subfamilia / Asistentes</th>
            <th style="text-align: right;">1. Cuota Proporcional</th>
            <th style="text-align: right;">2. Aporte Bolsillo</th>
            <th style="text-align: right;">3. Saldo Neto</th>
            <th style="text-align: center;">4. Estatus</th>
          </tr>
        </thead>
        <tbody>
          ${subFamilyRows}
        </tbody>
      </table>
    </div>

    <!-- Desglose por Integrante -->
    <div class="section-card">
      <div class="section-header-title">
        <span>👥 Desglose Transparente por Integrante (${t.totalAttendingCount} asistentes)</span>
        <span style="font-size: 11px; color: #9CA3AF; font-weight: 500;">4 Columnas Contables</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Participante</th>
            <th style="text-align: right;">1. Cuota</th>
            <th style="text-align: right;">2. Aporte</th>
            <th style="text-align: right;">3. Saldo Neto</th>
            <th style="text-align: center;">4. Estatus</th>
          </tr>
        </thead>
        <tbody>
          ${participantRows}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div class="document-footer">
      <div>ChapApp • Sistema de Control Financiero Grupal & Prorrateo</div>
      <div class="footer-stamp">⚖️ ${t.isCashBalanced ? 'Contabilidad Balanceada a Cero' : 'Diferencia en Caja'}</div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Plantilla 2: PDF de Ticket Individual / Familiar (Formato Recibo Digital para WhatsApp)
 * Basado estrictamente en la estética Dark Neumorphism (vertical, recibo tipo POS con pastilla verde esmeralda y glow).
 */
export const generatePosTicketHtml = (params: PosTicketHtmlParams): string => {
  const { subFamilyName, event, totals: passedTotals, guests = [] } = params;
  const totals = passedTotals ?? calculateEventTotals(event);
  const dateStr = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Miembros de la subfamilia
  const familyMembers = event.participants.filter(
    (p) => (p.subFamily || 'Familia General').trim() === subFamilyName.trim()
  );

  const subFamilyCalc = totals.subFamilies.find(
    (sf) => sf.subFamilyName.trim() === subFamilyName.trim()
  );

  const costPerUnit = totals.costPerUnit || 0;

  // Cálculo de invitados
  const calculatedGuests = guests.map((g) => {
    const weight = g.category === 'nino' ? 0.5 : 1.0;
    const cost = Math.round((g.daysCount * weight * costPerUnit + Number.EPSILON) * 100) / 100;
    return { ...g, weight, cost };
  });

  const guestsTotalCost = calculatedGuests.reduce((sum, g) => sum + g.cost, 0);
  const baseProportionalShare = subFamilyCalc?.proportionalShare || 0;
  const baseTotalPaid = subFamilyCalc?.totalPaid || 0;
  const grossTotalQuota = baseProportionalShare + guestsTotalCost;
  const finalBalance = Math.round((grossTotalQuota - baseTotalPaid + Number.EPSILON) * 100) / 100;

  const isRefund = finalBalance < 0;
  const isOwed = finalBalance > 0;

  const isSettled =
    params.isSettled !== undefined
      ? params.isSettled
      : subFamilyCalc
      ? subFamilyCalc.isFullySettled
      : familyMembers.length > 0 && familyMembers.every((m) => m.isSettled);

  const attendingMembers = familyMembers.filter((m) => m.isAttending !== false);

  const membersRowsHtml = familyMembers
    .map((m) => {
      const isAttending = m.isAttending !== false;
      const pCalc = totals.byParticipantId[m.id];
      const share = isAttending && pCalc ? pCalc.proportionalShare : 0;
      const weightText = m.category === 'nino' ? 'Niño (0.5)' : 'Adulto (1.0)';
      const daysText = isAttending && pCalc ? `${pCalc.activeDaysCount} d` : '0 d';

      return `
        <div class="member-item ${!isAttending ? 'member-absent' : ''}">
          <div class="member-info">
            <div class="member-name">${m.name} ${!isAttending ? '<span class="absent-tag">Ausente</span>' : ''}</div>
            <div class="member-meta">${weightText} • ${daysText}</div>
          </div>
          <div class="member-share">${isAttending ? FormatCurrency(share) : '$0.00'}</div>
        </div>
      `;
    })
    .join('');

  const guestsRowsHtml = calculatedGuests
    .map((g) => {
      const weightText = g.category === 'nino' ? 'Niño (0.5)' : 'Adulto (1.0)';
      return `
        <div class="member-item guest-item">
          <div class="member-info">
            <div class="member-name">➕ ${g.name} <span class="guest-tag">Invitado</span></div>
            <div class="member-meta">${weightText} • ${g.daysCount} días</div>
          </div>
          <div class="member-share">${FormatCurrency(g.cost)}</div>
        </div>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ticket POS - ${subFamilyName}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #121419;
      color: #F1F3F9;
      padding: 24px 16px;
      line-height: 1.4;
      display: flex;
      justify-content: center;
    }
    .ticket-card {
      width: 100%;
      max-width: 480px;
      background: #191C24;
      border-radius: 24px;
      padding: 28px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.14);
      border-left: 1px solid rgba(255, 255, 255, 0.09);
      border-bottom: 1px solid rgba(0, 0, 0, 0.7);
      border-right: 1px solid rgba(0, 0, 0, 0.5);
      box-shadow: -6px -6px 16px rgba(255, 255, 255, 0.03), 8px 8px 24px rgba(0, 0, 0, 0.75);
    }

    /* Encabezado del Recibo POS */
    .pos-header {
      text-align: center;
      margin-bottom: 22px;
    }
    .pos-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(0, 229, 255, 0.12);
      border: 1px solid rgba(0, 229, 255, 0.35);
      color: #00E5FF;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 5px 12px;
      border-radius: 20px;
      margin-bottom: 12px;
      box-shadow: 0 0 10px rgba(0, 229, 255, 0.25);
    }
    .event-title {
      font-size: 16px;
      font-weight: 800;
      color: #F1F3F9;
      letter-spacing: -0.3px;
    }
    .ticket-meta {
      font-size: 11px;
      color: #9CA3AF;
      margin-top: 4px;
    }

    /* Sección Cóncava de la Subfamilia */
    .concave-family-box {
      background: #13151C;
      border-radius: 16px;
      padding: 16px 18px;
      border: 1px solid rgba(0, 0, 0, 0.6);
      box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.7), inset -2px -2px 6px rgba(255, 255, 255, 0.03);
      margin-bottom: 20px;
      text-align: center;
    }
    .family-name {
      font-size: 19px;
      font-weight: 800;
      color: #00E5FF;
      letter-spacing: -0.4px;
      text-shadow: 0 0 10px rgba(0, 229, 255, 0.3);
      margin-bottom: 4px;
    }
    .family-stats {
      font-size: 11px;
      color: #9CA3AF;
      display: flex;
      justify-content: center;
      gap: 12px;
    }

    /* Pastilla Verde Esmeralda de Cuenta Liquidada */
    .settled-pill-banner {
      background: rgba(0, 230, 118, 0.12);
      border: 1px solid rgba(0, 230, 118, 0.45);
      border-radius: 14px;
      padding: 12px 16px;
      text-align: center;
      margin-bottom: 20px;
      box-shadow: 0 0 16px rgba(0, 230, 118, 0.25), inset 1px 1px 3px rgba(0, 230, 118, 0.2);
    }
    .settled-pill-badge {
      display: inline-block;
      background: #00E676;
      color: #0D1117;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 12px;
      box-shadow: 0 0 12px rgba(0, 230, 118, 0.5);
      margin-bottom: 4px;
    }
    .settled-pill-text {
      font-size: 11px;
      font-weight: 600;
      color: #00E676;
    }

    .pending-pill-banner {
      background: rgba(255, 171, 0, 0.12);
      border: 1px solid rgba(255, 171, 0, 0.4);
      border-radius: 14px;
      padding: 10px 16px;
      text-align: center;
      margin-bottom: 20px;
    }
    .pending-pill-text {
      font-size: 11px;
      font-weight: 700;
      color: #FFAB00;
    }

    /* Divisor Punteado */
    .dashed-line {
      border-top: 1px dashed rgba(255, 255, 255, 0.14);
      margin: 18px 0;
    }

    /* Tabla Minimalista de Integrantes */
    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 10px;
    }
    .members-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }
    .member-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #14161C;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.4);
    }
    .member-absent {
      opacity: 0.55;
    }
    .guest-item {
      border-left: 2px solid #00E5FF;
    }
    .member-name {
      font-size: 13px;
      font-weight: 700;
      color: #F1F3F9;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .member-meta {
      font-size: 10px;
      color: #9CA3AF;
      margin-top: 2px;
    }
    .member-share {
      font-size: 13px;
      font-weight: 700;
      color: #F1F3F9;
    }
    .absent-tag {
      font-size: 9px;
      background: rgba(255, 255, 255, 0.08);
      color: #9CA3AF;
      padding: 2px 5px;
      border-radius: 4px;
    }
    .guest-tag {
      font-size: 9px;
      background: rgba(0, 229, 255, 0.15);
      color: #00E5FF;
      padding: 2px 5px;
      border-radius: 4px;
    }

    /* Desglose Matemático */
    .math-breakdown {
      background: #14161C;
      border-radius: 14px;
      padding: 14px 16px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      margin-bottom: 18px;
    }
    .math-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 6px;
      color: #9CA3AF;
    }
    .math-row-bold {
      font-weight: 700;
      color: #F1F3F9;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 6px;
      margin-top: 6px;
    }
    .math-row-credit {
      color: #00E676;
      font-weight: 600;
    }

    /* Hero Saldo Final */
    .hero-balance-box {
      border-radius: 16px;
      padding: 16px;
      text-align: center;
      margin-bottom: 20px;
      border: 1px solid;
    }
    .hero-balance-owed {
      background: rgba(255, 23, 68, 0.12);
      border-color: rgba(255, 23, 68, 0.35);
      box-shadow: 0 0 16px rgba(255, 23, 68, 0.2);
    }
    .hero-balance-refund {
      background: rgba(0, 229, 255, 0.12);
      border-color: rgba(0, 229, 255, 0.35);
      box-shadow: 0 0 16px rgba(0, 229, 255, 0.2);
    }
    .hero-balance-settled {
      background: rgba(0, 230, 118, 0.12);
      border-color: rgba(0, 230, 118, 0.35);
      box-shadow: 0 0 16px rgba(0, 230, 118, 0.2);
    }
    .hero-label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .hero-amount {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }
    .hero-explain {
      font-size: 10px;
      color: #9CA3AF;
      margin-top: 6px;
      line-height: 1.3;
    }

    /* Footer del Ticket */
    .ticket-footer {
      text-align: center;
      font-size: 10px;
      color: #6B7280;
      margin-top: 16px;
    }
    .ticket-brand {
      color: #00E5FF;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="ticket-card">
    <!-- Encabezado POS -->
    <div class="pos-header">
      <div class="pos-badge">🧾 TICKET DE CUENTA POS</div>
      <div class="event-title">${event.title} (${event.year})</div>
      <div class="ticket-meta">Emisión: ${dateStr} • ${timeStr}</div>
    </div>

    <!-- Sección Cóncava de la Subfamilia -->
    <div class="concave-family-box">
      <div class="family-name">🏡 ${subFamilyName}</div>
      <div class="family-stats">
        <span>${attendingMembers.length} de ${familyMembers.length} Asistentes</span>
        <span>•</span>
        <span>${FormatCurrency(costPerUnit)}/día base</span>
      </div>
    </div>

    <!-- Pastilla de Estado -->
    ${
      isSettled
        ? `
      <div class="settled-pill-banner">
        <div class="settled-pill-badge">PAGADO Y CERRADO</div>
        <div class="settled-pill-text">✓ CUENTA 100% LIQUIDADA EN CAJA</div>
      </div>
    `
        : `
      <div class="pending-pill-banner">
        <div class="pending-pill-text">⏳ PENDIENTE DE LIQUIDAR EN CAJA</div>
      </div>
    `
    }

    <!-- Desglose de Integrantes -->
    <div class="section-title">Integrantes Registrados (${familyMembers.length})</div>
    <div class="members-list">
      ${membersRowsHtml}
    </div>

    <!-- Invitados Temporales (si existen) -->
    ${
      calculatedGuests.length > 0
        ? `
      <div class="section-title">Invitados Temporales (${calculatedGuests.length})</div>
      <div class="members-list">
        ${guestsRowsHtml}
      </div>
    `
        : ''
    }

    <div class="dashed-line"></div>

    <!-- Desglose Matemático -->
    <div class="section-title">Desglose Matemático</div>
    <div class="math-breakdown">
      <div class="math-row">
        <span>(+) Cuota Familia</span>
        <span>${FormatCurrency(baseProportionalShare)}</span>
      </div>
      ${
        guestsTotalCost > 0
          ? `
        <div class="math-row">
          <span>(+) Invitados Temporales (${calculatedGuests.length})</span>
          <span>+${FormatCurrency(guestsTotalCost)}</span>
        </div>
      `
          : ''
      }
      <div class="math-row math-row-bold">
        <span>(=) Cuota Total Bruta</span>
        <span>${FormatCurrency(grossTotalQuota)}</span>
      </div>
      <div class="math-row math-row-credit">
        <span>(-) Compras de Bolsillo</span>
        <span>-${FormatCurrency(baseTotalPaid)}</span>
      </div>
    </div>

    <!-- Bloque Hero Total -->
    <div class="hero-balance-box ${
      isSettled
        ? 'hero-balance-settled'
        : isRefund
        ? 'hero-balance-refund'
        : isOwed
        ? 'hero-balance-owed'
        : 'hero-balance-settled'
    }">
      <div class="hero-label" style="color: ${
        isSettled ? '#00E676' : isRefund ? '#00E5FF' : isOwed ? '#FF1744' : '#00E676'
      };">
        ${
          isSettled
            ? 'CUENTA SALDADA Y CERRADA'
            : isRefund
            ? 'REEMBOLSO A DEVOLVER DE CAJA'
            : isOwed
            ? 'TOTAL NETO A PAGAR EN EFECTIVO'
            : 'CUENTA AL CORRIENTE'
        }
      </div>
      <div class="hero-amount" style="color: ${
        isSettled ? '#00E676' : isRefund ? '#00E5FF' : isOwed ? '#FF1744' : '#00E676'
      };">
        ${FormatCurrency(Math.abs(finalBalance))}
      </div>
      <div class="hero-explain">
        ${
          isSettled
            ? 'El saldo de esta subfamilia ya fue liquidado formalmente en la caja común.'
            : isRefund
            ? `Sus compras (${FormatCurrency(baseTotalPaid)}) cubrieron su cuota (${FormatCurrency(grossTotalQuota)}). Se le devuelve la diferencia.`
            : isOwed
            ? `Monto exacto a entregar en efectivo al administrador de la caja.`
            : `Las compras de bolsillo cubren exactamente la cuota calculada.`
        }
      </div>
    </div>

    <!-- Footer -->
    <div class="ticket-footer">
      <div>Emitido con <span class="ticket-brand">ChapApp POS</span> • Control Financiero</div>
      <div style="margin-top: 4px;">Folio de Verificación: SF-${subFamilyName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}-${event.year}</div>
    </div>
  </div>
</body>
</html>
  `;
};
