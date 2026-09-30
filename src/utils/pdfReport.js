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
        <th class="col-num">Saldo Neto</th>
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
          <td class="col-num ${sf.finalBalance < 0 ? 'text-emerald' : sf.finalBalance > 0 ? 'text-amber' : ''}">
            ${sf.finalBalance < 0 ? `Reembolso ${formatCurrency(Math.abs(sf.finalBalance))}` : formatCurrency(sf.finalBalance)}
          </td>
          <td style="text-align:center;">
            <span class="badge ${sf.isFullySettled ? 'badge-paid' : 'badge-pending'}">
              ${sf.isFullySettled ? 'Liquidada' : 'Pendiente'}
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
