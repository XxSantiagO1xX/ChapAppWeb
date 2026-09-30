/**
 * ChapApp - Generador de Libros de Cálculo Excel Profesionales Multi-Hoja (XML Spreadsheet)
 * Compatible nativamente con Microsoft Excel, Apple Numbers, LibreOffice y Google Sheets sin dependencias externas.
 */

import { calculateEventTotals } from './calculations.js';

const escapeXml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Genera y descarga un libro de Excel profesional estructurado con 4 hojas
 * @param {Object} event - Objeto del evento
 * @param {Object} totals - Totales calculados (opcional)
 */
export const downloadExecutiveExcel = (event, totals = null) => {
  const t = totals ?? calculateEventTotals(event);
  const eventDate = new Date(event.createdAt || Date.now()).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <!-- Título Principal -->
  <Style ss:ID="sTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#0891B2"/>
  </Style>
  <Style ss:ID="sSubTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Italic="1" ss:Color="#64748B"/>
  </Style>
  <!-- Cabecera de Tablas -->
  <Style ss:ID="sHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0E7490" ss:Pattern="Solid"/>
  </Style>
  <!-- Filas de Datos -->
  <Style ss:ID="sData">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="sDataCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="sCurrency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <NumberFormat ss:Format="$#,##0.00"/>
  </Style>
  <Style ss:ID="sTotalRow">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0E7490"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0E7490"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#0E7490"/>
   <NumberFormat ss:Format="$#,##0.00"/>
  </Style>
  <Style ss:ID="sRefund">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:Color="#10B981" ss:Bold="1"/>
   <NumberFormat ss:Format="$#,##0.00"/>
  </Style>
  <Style ss:ID="sOwed">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:Color="#D97706" ss:Bold="1"/>
   <NumberFormat ss:Format="$#,##0.00"/>
  </Style>
 </Styles>

 <!-- ========================================================== -->
 <!-- HOJA 1: RESUMEN Y CUADRE DE CAJA                          -->
 <!-- ========================================================== -->
 <Worksheet ss:Name="Resumen Ejecutivo">
  <Table ss:DefaultColumnWidth="140" ss:DefaultRowHeight="20">
   <Column ss:Width="220"/>
   <Column ss:Width="160"/>
   <Column ss:Width="160"/>
   
   <Row ss:Height="28">
    <Cell ss:StyleID="sTitle"><Data ss:Type="String">CHAPAPP • CORTE Y LIQUIDACIÓN FINANCIERA</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="sSubTitle"><Data ss:Type="String">Evento: ${escapeXml(event.title)} (${event.year}) • Fecha: ${escapeXml(eventDate)}</Data></Cell>
   </Row>
   <Row><Cell><Data ss:Type="String"></Data></Cell></Row>

   <Row>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Concepto de Caja</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Importe ($ MXN)</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Estatus / Detalle</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="sData"><Data ss:Type="String">Total Gastado en Compras</Data></Cell>
    <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${t.totalExpenses}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${(event.expenses || []).length} compras registradas</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="sData"><Data ss:Type="String">Total Recaudado en Efectivo</Data></Cell>
    <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${t.totalCollected}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">Meta: $${t.totalToCollect.toFixed(2)}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="sData"><Data ss:Type="String">Reembolsos Pagados a Familias</Data></Cell>
    <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${t.totalRefunded}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">Por reembolsar: $${t.totalPendingToRefund.toFixed(2)}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="sData"><Data ss:Type="String">Dinero Líquido en Mano (Caja Común)</Data></Cell>
    <Cell ss:StyleID="sTotalRow"><Data ss:Type="Number">${t.cashInHand}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${t.isCashBalanced ? '✓ Cuadre Balanceado' : 'Revisar Pendientes'}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="sData"><Data ss:Type="String">Padrón de Asistentes</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${t.totalAttendingCount} de ${t.totalParticipantsCount}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${t.totalWeightedUnits} Unidades Ponderadas</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="sData"><Data ss:Type="String">Costo Diario por Unidad (1.0)</Data></Cell>
    <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${t.costPerUnit}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">Tarifa Base Adulto</Data></Cell>
   </Row>
  </Table>
 </Worksheet>

 <!-- ========================================================== -->
 <!-- HOJA 2: CONSOLIDADO POR SUBFAMILIA                        -->
 <!-- ========================================================== -->
 <Worksheet ss:Name="Subfamilias y Saldos">
  <Table ss:DefaultColumnWidth="130" ss:DefaultRowHeight="20">
   <Column ss:Width="200"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="130"/>
   <Column ss:Width="120"/>
   
   <Row ss:Height="24">
    <Cell ss:StyleID="sTitle"><Data ss:Type="String">CONSOLIDADO FINANCIERO POR SUBFAMILIA</Data></Cell>
   </Row>
   <Row><Cell><Data ss:Type="String"></Data></Cell></Row>

   <Row>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Subfamilia</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Asistentes</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Unidades</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Cuota Asignada</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Aporte en Compras</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Saldo Neto</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Estado de Liquidación</Data></Cell>
   </Row>

   ${t.subFamilies.map((sf) => `
   <Row>
    <Cell ss:StyleID="sData"><Data ss:Type="String">${escapeXml(sf.subFamilyName)}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${sf.attendingCount} de ${sf.membersCount}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="Number">${sf.totalWeightedUnits}</Data></Cell>
    <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${sf.proportionalShare}</Data></Cell>
    <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${sf.totalPaid}</Data></Cell>
    <Cell ss:StyleID="${sf.finalBalance < 0 ? 'sRefund' : sf.finalBalance > 0 ? 'sOwed' : 'sCurrency'}"><Data ss:Type="Number">${Math.abs(sf.finalBalance)}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${sf.isFullySettled ? 'LIQUIDADA' : sf.finalBalance < 0 ? 'POR REEMBOLSAR' : 'POR COBRAR'}</Data></Cell>
   </Row>
   `).join('')}

   <Row>
    <Cell ss:StyleID="sData"><Data ss:Type="String">TOTALES</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${t.totalAttendingCount} de ${t.totalParticipantsCount}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="Number">${t.totalWeightedUnits}</Data></Cell>
    <Cell ss:StyleID="sTotalRow"><Data ss:Type="Number">${t.totalExpenses}</Data></Cell>
    <Cell ss:StyleID="sTotalRow"><Data ss:Type="Number">${t.totalExpenses}</Data></Cell>
    <Cell ss:StyleID="sTotalRow"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">BALANCEADO</Data></Cell>
   </Row>
  </Table>
 </Worksheet>

 <!-- ========================================================== -->
 <!-- HOJA 3: PADRÓN DE PARTICIPANTES                           -->
 <!-- ========================================================== -->
 <Worksheet ss:Name="Padrón Integrantes">
  <Table ss:DefaultColumnWidth="120" ss:DefaultRowHeight="20">
   <Column ss:Width="180"/>
   <Column ss:Width="180"/>
   <Column ss:Width="90"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>

   <Row ss:Height="24">
    <Cell ss:StyleID="sTitle"><Data ss:Type="String">DESGLOSE INDIVIDUAL POR PARTICIPANTE</Data></Cell>
   </Row>
   <Row><Cell><Data ss:Type="String"></Data></Cell></Row>

   <Row>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Nombre Integrante</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Subfamilia</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Categoría</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Asiste</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Días</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Factor</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Cuota</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Compras Pagadas</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Saldo Individual</Data></Cell>
   </Row>

   ${t.participants.map((p) => `
   <Row>
    <Cell ss:StyleID="sData"><Data ss:Type="String">${escapeXml(p.participantName)}</Data></Cell>
    <Cell ss:StyleID="sData"><Data ss:Type="String">${escapeXml(p.subFamily)}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${escapeXml(p.category.toUpperCase())}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${p.isAttending ? 'SÍ' : 'NO'}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="Number">${p.activeDaysCount}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="Number">${p.weight}</Data></Cell>
    <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${p.proportionalShare}</Data></Cell>
    <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${p.totalPaid}</Data></Cell>
    <Cell ss:StyleID="${p.finalBalance < 0 ? 'sRefund' : p.finalBalance > 0 ? 'sOwed' : 'sCurrency'}"><Data ss:Type="Number">${Math.abs(p.finalBalance)}</Data></Cell>
   </Row>
   `).join('')}
  </Table>
 </Worksheet>

 <!-- ========================================================== -->
 <!-- HOJA 4: LIBRO DIARIO DE COMPRAS                           -->
 <!-- ========================================================== -->
 <Worksheet ss:Name="Libro de Gastos">
  <Table ss:DefaultColumnWidth="140" ss:DefaultRowHeight="20">
   <Column ss:Width="60"/>
   <Column ss:Width="220"/>
   <Column ss:Width="120"/>
   <Column ss:Width="160"/>
   <Column ss:Width="120"/>

   <Row ss:Height="24">
    <Cell ss:StyleID="sTitle"><Data ss:Type="String">LIBRO DIARIO DE COMPRAS Y GASTOS</Data></Cell>
   </Row>
   <Row><Cell><Data ss:Type="String"></Data></Cell></Row>

   <Row>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Concepto / Establecimiento</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Categoría</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Pagado Por</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Importe ($ MXN)</Data></Cell>
   </Row>

   ${(event.expenses || []).map((exp, idx) => {
     const payer = (event.participants || []).find((p) => p.id === exp.paidBy);
     const payerName = payer ? payer.name : 'Fondo Común';
     return `
   <Row>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="sData"><Data ss:Type="String">${escapeXml(exp.title)}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${escapeXml(exp.category || 'Varios')}</Data></Cell>
    <Cell ss:StyleID="sData"><Data ss:Type="String">${escapeXml(payerName)}</Data></Cell>
    <Cell ss:StyleID="sCurrency"><Data ss:Type="Number">${Number(exp.amount) || 0}</Data></Cell>
   </Row>
   `;
   }).join('')}

   <Row>
    <Cell ss:StyleID="sData"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="sData"><Data ss:Type="String">TOTAL COMPRAS</Data></Cell>
    <Cell ss:StyleID="sData"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="sData"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="sTotalRow"><Data ss:Type="Number">${t.totalExpenses}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeTitle = event.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
  a.href = url;
  a.download = `Corte_Financiero_${safeTitle}_${event.year}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
