/**
 * ChapApp - Generador de Reporte Ejecutivo Imprimible / PDF
 */

import { formatCurrency, calculateEventTotals } from './calculations.js';

export const openExecutivePrintReport = (event, totals = null) => {
  const t = totals ?? calculateEventTotals(event);
  const dateStr = new Date(event.createdAt || Date.now()).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    window.print();
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte Ejecutivo - ${event.title}</title>
  <style>
    @page { size: A4; margin: 18mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 24px;
      font-size: 13px;
      line-height: 1.4;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .brand-title { font-size: 24px; font-weight: 900; color: #0284c7; letter-spacing: -0.5px; }
    .brand-sub { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; }
    .meta-box { text-align: right; font-size: 12px; color: #475569; }
    .meta-title { font-size: 15px; font-weight: 800; color: #0f172a; }
    
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .kpi-label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
    .kpi-val { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 4px; }
    .kpi-val.emerald { color: #059669; }
    .kpi-val.amber { color: #d97706; }
    .kpi-val.cyan { color: #0284c7; }

    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin: 18px 0 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 11.5px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
    }
    td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .col-num { text-align: right; }
    .text-emerald { color: #059669; font-weight: 700; }
    .text-amber { color: #d97706; font-weight: 700; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-pending { background: #fef3c7; color: #b45309; }

    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 48px;
      page-break-inside: avoid;
    }
    .sig-line {
      border-top: 1px solid #475569;
      padding-top: 6px;
      text-align: center;
      font-size: 11px;
      color: #475569;
    }
    .footer-note {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      margin-top: 32px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <h1 class="brand-title">ChapApp</h1>
      <span class="brand-sub">Sistema Contable & Prorrateo Familiar</span>
    </div>
    <div class="meta-box">
      <div class="meta-title">${event.title} (${event.year})</div>
      <div>Fecha de Emisión: ${dateStr}</div>
      <div>Auditoría: ${t.totalAttendingCount} Asistentes • ${t.totalWeightedUnits} Uds</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Gastado</div>
      <div class="kpi-val">${formatCurrency(t.totalExpenses)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Recaudado en Caja</div>
      <div class="kpi-val emerald">${formatCurrency(t.totalCollected)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Reembolsos Pagados</div>
      <div class="kpi-val amber">${formatCurrency(t.totalRefunded)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Fondo Líquido en Caja</div>
      <div class="kpi-val cyan">${formatCurrency(t.cashInHand)}</div>
    </div>
  </div>

  <h3 class="section-title">1. Resumen Consolidado por Subfamilia</h3>
  <table>
    <thead>
      <tr>
        <th>Subfamilia</th>
        <th>Asistentes</th>
        <th class="col-num">Cuota Asignada</th>
        <th class="col-num">Aportes en Compras</th>
        <th class="col-num">Abonado en Caja</th>
        <th class="col-num">Saldo / Resta</th>
        <th style="text-align:center;">Estado</th>
      </tr>
    </thead>
    <tbody>
      ${t.subFamilies.map((sf) => `
        <tr>
          <td><strong>${sf.subFamilyName}</strong></td>
          <td>${sf.attendingCount} de ${sf.membersCount}</td>
          <td class="col-num">${formatCurrency(sf.proportionalShare)}</td>
          <td class="col-num">${formatCurrency(sf.totalPaid)}</td>
          <td class="col-num">${formatCurrency(sf.partialPayment || 0)}</td>
          <td class="col-num ${sf.isFullySettled ? '' : sf.finalBalance < 0 ? 'text-emerald' : sf.finalBalance > 0 ? 'text-amber' : ''}">
            ${sf.isFullySettled
              ? '$0.00'
              : sf.finalBalance < 0
              ? `Reembolso ${formatCurrency(Math.abs(sf.hasPartialPayment ? sf.remainingBalance : sf.finalBalance))}`
              : formatCurrency(sf.hasPartialPayment ? sf.remainingBalance : sf.finalBalance)}
          </td>
          <td style="text-align:center;">
            <span class="badge ${sf.isFullySettled ? 'badge-paid' : 'badge-pending'}">
              ${sf.isFullySettled ? 'Liquidada' : sf.hasPartialPayment ? `Abono ${sf.paymentProgressPercent}%` : 'Pendiente'}
            </span>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h3 class="section-title">2. Desglose Individual de Integrantes</h3>
  <table>
    <thead>
      <tr>
        <th>Nombre</th>
        <th>Subfamilia</th>
        <th>Categoría</th>
        <th>Días</th>
        <th class="col-num">Cuota</th>
        <th class="col-num">Compras Propias</th>
        <th class="col-num">Saldo</th>
      </tr>
    </thead>
    <tbody>
      ${t.participants.map((p) => `
        <tr>
          <td>${p.participantName}</td>
          <td>${p.subFamily}</td>
          <td>${p.category.toUpperCase()} (${p.weight} ud)</td>
          <td>${p.activeDaysCount} días</td>
          <td class="col-num">${formatCurrency(p.proportionalShare)}</td>
          <td class="col-num">${formatCurrency(p.totalPaid)}</td>
          <td class="col-num">${formatCurrency(p.finalBalance)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="signatures-grid">
    <div>
      <div class="sig-line">Responsable de Caja y Administración</div>
    </div>
    <div>
      <div class="sig-line">Representante de Familias / Conformidad</div>
    </div>
  </div>

  <div class="footer-note">
    Documento oficial generado por ChapApp • Datos enlazados y respaldados en Supabase Cloud.
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * Genera el Reporte / Ticket POS Imprimible (PDF) individual para una Subfamilia específica.
 */
export const openSubfamilyTicketPrintReport = (subFamilyName, event, totals = null) => {
  const t = totals ?? calculateEventTotals(event);
  const sf = t.bySubFamily?.[subFamilyName];
  if (!sf) return;

  const dateStr = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const members = (sf.participantIds || [])
    .map((id) => t.byParticipantId[id])
    .filter(Boolean);
  const guests = sf.guests || [];
  const memberIdsSet = new Set(sf.participantIds || []);
  const familyExpenses = (event.expenses || []).filter((ex) => memberIdsSet.has(ex.paidByParticipantId));

  const isRefund = sf.finalBalance < 0;
  const isOwed = sf.finalBalance > 0;
  const effectiveBal = sf.hasPartialPayment ? sf.remainingBalance : sf.finalBalance;

  const statusText = sf.isFullySettled
    ? 'CUENTA 100% LIQUIDADA'
    : sf.hasPartialPayment
    ? `ABONO PARCIAL (${sf.paymentProgressPercent}%)`
    : 'PENDIENTE DE LIQUIDAR';

  const printWindow = window.open('', '_blank', 'width=840,height=960');
  if (!printWindow) {
    window.print();
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Ticket POS - ${sf.subFamilyName} (${event.title})</title>
  <style>
    @page { size: A4; margin: 15mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 20px;
      font-size: 13px;
      line-height: 1.45;
    }
    .ticket-shell {
      border: 1.5px solid #cbd5e1;
      border-radius: 14px;
      overflow: hidden;
    }
    .top-accent {
      height: 6px;
      background: ${sf.isFullySettled ? '#10b981' : sf.hasPartialPayment ? '#0284c7' : '#f43f5e'};
    }
    .ticket-inner {
      padding: 22px 24px;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .badge-top {
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #0284c7;
      background: #e0f2fe;
      padding: 3px 8px;
      border-radius: 99px;
      margin-bottom: 6px;
    }
    .sf-title { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
    .sf-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
    .meta-box { text-align: right; font-size: 12px; color: #475569; }
    .status-pill {
      display: inline-block;
      margin-top: 6px;
      padding: 4px 10px;
      border-radius: 99px;
      font-size: 10.5px;
      font-weight: 800;
      background: ${sf.isFullySettled ? '#dcfce7' : sf.hasPartialPayment ? '#e0f2fe' : '#ffe4e6'};
      color: ${sf.isFullySettled ? '#15803d' : sf.hasPartialPayment ? '#0369a1' : '#be123c'};
    }
    .rollup-note {
      background: #f0f9ff;
      border-left: 4px solid #0284c7;
      padding: 8px 12px;
      font-size: 11.5px;
      color: #0c4a6e;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
    }
    .kpi-label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
    .kpi-val { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 4px; }
    .kpi-val.emerald { color: #059669; }
    .kpi-val.rose { color: #e11d48; }
    .kpi-val.cyan { color: #0284c7; }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 16px 0 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 11.5px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
    }
    td {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .col-num { text-align: right; font-variant-numeric: tabular-nums; }
    .settlement-box {
      margin-top: 18px;
      padding: 16px;
      border-radius: 12px;
      text-align: center;
      background: ${sf.isFullySettled ? '#f0fdf4' : isRefund ? '#ecfdf5' : '#fff1f2'};
      border: 1.5px dashed ${sf.isFullySettled ? '#10b981' : isRefund ? '#059669' : '#f43f5e'};
    }
    .settlement-label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; }
    .settlement-amount {
      font-size: 26px;
      font-weight: 900;
      margin: 4px 0;
      color: ${sf.isFullySettled ? '#15803d' : isRefund ? '#059669' : '#be123c'};
    }
    .footer-note {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
    }
  </style>
</head>
<body>
  <div class="ticket-shell">
    <div class="top-accent"></div>
    <div class="ticket-inner">
      <div class="header-bar">
        <div>
          <span class="badge-top">TICKET DE COBRO POS • CHAPAPP</span>
          <h1 class="sf-title">${sf.subFamilyName}</h1>
          <div class="sf-sub">
            ${sf.attendingCount} asistentes (${sf.membersCount} integrantes${guests.length > 0 ? ` + ${guests.length} invitados` : ''}) • ${sf.totalWeightedUnits} unidades ponderadas
          </div>
        </div>
        <div class="meta-box">
          <div><strong>${event.title} (${event.year})</strong></div>
          <div>Emitido: ${dateStr}</div>
          <span class="status-pill">${statusText}</span>
        </div>
      </div>

      ${sf.hasMultipleNuclei ? `
        <div class="rollup-note">
          <strong>Roll-Up Consolidado:</strong> Incluye los núcleos dependientes: ${(sf.subGroups || []).join(', ')}.
        </div>
      ` : ''}

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">1. Cuota Familiar Bruta</div>
          <div class="kpi-val">${formatCurrency(sf.proportionalShare)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">2. Aporte en Compras</div>
          <div class="kpi-val emerald">-${formatCurrency(sf.totalPaid)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">3. Saldo Neto Original</div>
          <div class="kpi-val ${isRefund ? 'emerald' : isOwed ? 'rose' : 'cyan'}">
            ${isRefund ? `Reembolso ${formatCurrency(Math.abs(sf.finalBalance))}` : formatCurrency(sf.finalBalance)}
          </div>
        </div>
      </div>

      <h3 class="section-title">Integrantes del Núcleo Familiar</h3>
      <table>
        <thead>
          <tr>
            <th>Integrante</th>
            <th>Rol / Ponderación</th>
            <th>Días Asistidos</th>
            <th class="col-num">Cuota Individual</th>
            <th class="col-num">Compras de Bolsillo</th>
          </tr>
        </thead>
        <tbody>
          ${members.map((p) => `
            <tr>
              <td><strong>${p.participantName}</strong> ${!p.isAttending ? '<em>(Ausente)</em>' : ''}</td>
              <td>${p.category === 'nino' ? 'Niño (0.5x)' : 'Adulto (1.0x)'}</td>
              <td>${p.isAttending ? `${p.activeDaysCount} días (${p.weightedUnits} uds)` : '0 días'}</td>
              <td class="col-num">${formatCurrency(p.proportionalShare)}</td>
              <td class="col-num">${formatCurrency(p.totalPaid)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${guests.length > 0 ? `
        <h3 class="section-title">Invitados Temporales en este Ticket</h3>
        <table>
          <thead>
            <tr>
              <th>Invitado</th>
              <th>Categoría</th>
              <th>Días</th>
              <th class="col-num">Cargo Proporcional</th>
            </tr>
          </thead>
          <tbody>
            ${guests.map((g) => `
              <tr>
                <td>${g.name}</td>
                <td>${g.category === 'nino' ? 'Niño (0.5x)' : 'Adulto (1.0x)'}</td>
                <td>${g.daysCount} días (${g.weightedUnits} uds)</td>
                <td class="col-num">+${formatCurrency(g.cost)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${familyExpenses.length > 0 ? `
        <h3 class="section-title">Gastos Aportados por esta Familia (${familyExpenses.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Categoría</th>
              <th>Pagado por</th>
              <th class="col-num">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${familyExpenses.map((ex) => {
              const payer = t.byParticipantId[ex.paidByParticipantId]?.participantName || 'Integrante';
              return `
                <tr>
                  <td>${ex.description}</td>
                  <td>${ex.category || 'General'}</td>
                  <td>${payer}</td>
                  <td class="col-num">${formatCurrency(ex.amount)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      ` : ''}

      <div class="settlement-box">
        <div class="settlement-label">
          ${sf.isFullySettled
            ? 'CUENTA LIQUIDADA EN CAJA'
            : isRefund
            ? (sf.hasPartialPayment ? 'RESTA POR REEMBOLSAR A LA FAMILIA' : 'REEMBOLSO TOTAL A FAVOR DE LA FAMILIA')
            : (sf.hasPartialPayment ? 'RESTA POR ENTREGAR EN CAJA' : 'SALDO TOTAL A ENTREGAR EN CAJA')}
        </div>
        <div class="settlement-amount">
          ${sf.isFullySettled ? '$0.00' : formatCurrency(Math.abs(effectiveBal))}
        </div>
        ${sf.hasPartialPayment ? `
          <div style="font-size:12px; color:#0369a1; font-weight:700; margin-top:4px;">
            Abono registrado en caja: ${formatCurrency(sf.partialPayment)} (${sf.paymentProgressPercent}% cubierto de ${formatCurrency(Math.abs(sf.finalBalance))})
          </div>
        ` : ''}
      </div>

      <div class="footer-note">
        Ticket POS generado por ChapApp • Costo base diario adulto: ${formatCurrency(t.dailyAdultCost)}
      </div>
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * Dibuja un rectángulo con esquinas redondeadas en un contexto 2D de Canvas.
 */
const drawRoundedRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

/**
 * Genera y descarga una imagen PNG de alta resolución (2x Retina) del Ticket POS de una Subfamilia,
 * ideal para enviarse directamente como imagen por WhatsApp.
 */
export const downloadSubfamilyTicketImage = async (subFamilyName, event, totals = null) => {
  const t = totals ?? calculateEventTotals(event);
  const sf = t.bySubFamily?.[subFamilyName];
  if (!sf) return false;

  const members = (sf.participantIds || [])
    .map((id) => t.byParticipantId[id])
    .filter(Boolean);
  const guests = sf.guests || [];
  const isRefund = sf.finalBalance < 0;
  const isOwed = sf.finalBalance > 0;
  const effectiveBal = sf.hasPartialPayment ? sf.remainingBalance : sf.finalBalance;

  const dateStr = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Cálculo dinámico del alto del ticket según cantidad de integrantes e invitados
  const width = 760;
  const memberRowH = 44;
  const guestRowH = 38;
  const headerH = sf.hasMultipleNuclei ? 195 : 155;
  const membersSectionH = 52 + Math.max(1, members.length) * memberRowH;
  const guestsSectionH = guests.length > 0 ? 48 + guests.length * guestRowH : 0;
  const mathBoxH = sf.hasPartialPayment ? 215 : 165;
  const settlementBoxH = 135;
  const footerH = 56;
  const height = headerH + membersSectionH + guestsSectionH + mathBoxH + settlementBoxH + footerH + 48;

  const scale = 2; // Retina 2x
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // 1. Fondo principal estilo Liquid Glass Oscuro
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#070D19');
  bgGrad.addColorStop(0.5, '#0F172A');
  bgGrad.addColorStop(1, '#091020');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Halo decorativo superior
  const accentColor = sf.isFullySettled ? '#10B981' : sf.hasPartialPayment ? '#00F0FF' : '#F43F5E';
  const radialGlow = ctx.createRadialGradient(width / 2, 0, 10, width / 2, 0, 360);
  radialGlow.addColorStop(0, sf.isFullySettled ? 'rgba(16, 185, 129, 0.22)' : sf.hasPartialPayment ? 'rgba(0, 240, 255, 0.20)' : 'rgba(244, 63, 94, 0.20)');
  radialGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, width, 280);

  // Marco exterior del ticket
  drawRoundedRect(ctx, 18, 18, width - 36, height - 36, 22);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.stroke();

  // Línea láser superior
  drawRoundedRect(ctx, 20, 18, width - 40, 5, 3);
  ctx.fillStyle = accentColor;
  ctx.fill();

  let cursorY = 48;

  // 2. Cabecera
  ctx.fillStyle = '#38BDF8';
  ctx.font = '800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('TICKET DE COBRO POS • CHAPAPP', 44, cursorY);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${event.title} (${event.year}) • ${dateStr}`, width - 44, cursorY);
  ctx.textAlign = 'left';

  cursorY += 32;
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(sf.subFamilyName, 44, cursorY);

  // Pastilla de estado a la derecha
  const pillText = sf.isFullySettled
    ? '✓ LIQUIDADA'
    : sf.hasPartialPayment
    ? `ABONO ${sf.paymentProgressPercent}%`
    : 'PENDIENTE';
  ctx.font = '800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const pillW = ctx.measureText(pillText).width + 24;
  drawRoundedRect(ctx, width - 44 - pillW, cursorY - 20, pillW, 26, 13);
  ctx.fillStyle = sf.isFullySettled
    ? 'rgba(16, 185, 129, 0.18)'
    : sf.hasPartialPayment
    ? 'rgba(0, 240, 255, 0.16)'
    : 'rgba(244, 63, 94, 0.18)';
  ctx.fill();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = accentColor;
  ctx.textAlign = 'center';
  ctx.fillText(pillText, width - 44 - pillW / 2, cursorY - 3);
  ctx.textAlign = 'left';

  cursorY += 22;
  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(
    `${sf.attendingCount} asistentes (${sf.membersCount} integrantes${guests.length > 0 ? ` + ${guests.length} invitados` : ''}) • ${sf.totalWeightedUnits} uds ponderadas`,
    44,
    cursorY
  );

  if (sf.hasMultipleNuclei) {
    cursorY += 16;
    drawRoundedRect(ctx, 44, cursorY, width - 88, 30, 8);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.10)';
    ctx.fill();
    ctx.fillStyle = '#7DD3FC';
    ctx.font = '600 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(
      `Roll-Up Consolidado: ${(sf.subGroups || []).join(', ')}`,
      56,
      cursorY + 19
    );
    cursorY += 32;
  }

  cursorY += 24;

  // 3. Lista de Integrantes
  ctx.fillStyle = '#94A3B8';
  ctx.font = '800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('INTEGRANTES Y ASISTENCIA', 44, cursorY);
  ctx.textAlign = 'right';
  ctx.fillText('CUOTA / APORTE', width - 44, cursorY);
  ctx.textAlign = 'left';
  cursorY += 12;

  for (const p of members) {
    drawRoundedRect(ctx, 44, cursorY, width - 88, memberRowH - 6, 10);
    ctx.fillStyle = p.isAttending ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.015)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const roleTag = p.category === 'nino' ? 'NIÑO 0.5x' : 'ADULTO 1.0x';
    ctx.fillStyle = p.isAttending ? '#F8FAFC' : '#64748B';
    ctx.font = '700 13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(p.participantName, 58, cursorY + 23);

    const nameW = ctx.measureText(p.participantName).width;
    ctx.fillStyle = p.category === 'nino' ? '#C084FC' : '#38BDF8';
    ctx.font = '700 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(
      p.isAttending ? `${roleTag} • ${p.activeDaysCount}d (${p.weightedUnits}u)` : 'AUSENTE (0d)',
      68 + nameW,
      cursorY + 23
    );

    ctx.textAlign = 'right';
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const rightSummary =
      p.totalPaid > 0
        ? `Cuota ${formatCurrency(p.proportionalShare)}  |  Aportó ${formatCurrency(p.totalPaid)}`
        : `Cuota ${formatCurrency(p.proportionalShare)}`;
    ctx.fillText(rightSummary, width - 58, cursorY + 23);
    ctx.textAlign = 'left';

    cursorY += memberRowH;
  }

  // 4. Invitados Temporales (si existen)
  if (guests.length > 0) {
    cursorY += 12;
    ctx.fillStyle = '#FBBF24';
    ctx.font = '800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(`INVITADOS TEMPORALES (${guests.length})`, 44, cursorY);
    cursorY += 10;

    for (const g of guests) {
      drawRoundedRect(ctx, 44, cursorY, width - 88, guestRowH - 6, 8);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.06)';
      ctx.fill();

      ctx.fillStyle = '#FDE68A';
      ctx.font = '700 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(`${g.name} (${g.category === 'nino' ? 'Niño' : 'Adulto'} • ${g.daysCount} días)`, 58, cursorY + 20);

      ctx.textAlign = 'right';
      ctx.fillText(`+${formatCurrency(g.cost)}`, width - 58, cursorY + 20);
      ctx.textAlign = 'left';

      cursorY += guestRowH;
    }
  }

  cursorY += 14;

  // 5. Caja de Desglose Matemático
  drawRoundedRect(ctx, 44, cursorY, width - 88, mathBoxH - 14, 14);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.stroke();

  let mathY = cursorY + 28;
  const drawMathRow = (label, value, color = '#E2E8F0', bold = false) => {
    ctx.fillStyle = bold ? '#F8FAFC' : '#94A3B8';
    ctx.font = `${bold ? '800 13.5px' : '600 13px'} -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillText(label, 62, mathY);
    ctx.textAlign = 'right';
    ctx.fillStyle = color;
    ctx.font = `${bold ? '900 15px' : '700 13.5px'} -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillText(value, width - 62, mathY);
    ctx.textAlign = 'left';
    mathY += 28;
  };

  drawMathRow('Cuota Proporcional de Integrantes', formatCurrency(sf.membersProportionalShare));
  if (sf.guestsTotalCost > 0) {
    drawMathRow(`(+) Cargo de Invitados (${guests.length})`, `+${formatCurrency(sf.guestsTotalCost)}`, '#FBBF24');
  }
  drawMathRow('(=) Cuota Familiar Bruta', formatCurrency(sf.proportionalShare), '#F8FAFC', true);
  drawMathRow('(-) Compras Pagadas de su Bolsillo', `-${formatCurrency(sf.totalPaid)}`, '#34D399');

  if (sf.hasPartialPayment) {
    drawMathRow(
      `(-) Abono Parcial Entregado (${sf.paymentProgressPercent}%)`,
      `-${formatCurrency(sf.partialPayment)}`,
      '#38BDF8',
      true
    );
  }

  cursorY += mathBoxH;

  // 6. Línea punteada tipo recibo
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.beginPath();
  ctx.moveTo(44, cursorY - 6);
  ctx.lineTo(width - 44, cursorY - 6);
  ctx.stroke();
  ctx.restore();

  // 7. Caja Gran Total de Liquidación
  drawRoundedRect(ctx, 44, cursorY + 6, width - 88, settlementBoxH - 16, 18);
  ctx.fillStyle = sf.isFullySettled
    ? 'rgba(16, 185, 129, 0.14)'
    : isRefund
    ? 'rgba(16, 185, 129, 0.12)'
    : 'rgba(244, 63, 94, 0.12)';
  ctx.fill();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '800 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const finalTitle = sf.isFullySettled
    ? 'CUENTA FAMILIAR 100% LIQUIDADA'
    : isRefund
    ? (sf.hasPartialPayment ? 'RESTA POR REEMBOLSAR A LA FAMILIA' : 'REEMBOLSO A DEVOLVER A LA FAMILIA')
    : (sf.hasPartialPayment ? 'RESTA POR ENTREGAR EN CAJA' : 'SALDO NETO A ENTREGAR EN CAJA');
  ctx.fillText(finalTitle, width / 2, cursorY + 36);

  ctx.fillStyle = sf.isFullySettled ? '#34D399' : isRefund ? '#34D399' : '#FB7185';
  ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(
    sf.isFullySettled ? '$0.00' : formatCurrency(Math.abs(effectiveBal)),
    width / 2,
    cursorY + 78
  );

  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(
    `Costo base por día adulto (1.0x): ${formatCurrency(t.dailyAdultCost)} • ChapApp Finanzas Familiares`,
    width / 2,
    cursorY + 105
  );
  ctx.textAlign = 'left';

  // Convertir a Blob y descargar PNG
  const safeName = sf.subFamilyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Ticket_POS_${safeName}_${event.year || ''}.png`;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      resolve(true);
    }, 'image/png');
  });
};

