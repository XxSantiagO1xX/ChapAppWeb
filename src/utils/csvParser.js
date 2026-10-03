/**
 * ChapApp - Parser de Archivos y Texto CSV de Gastos
 */

import { generateUUID } from '../services/database.js';

export const SAMPLE_CSV_TEMPLATE = `Nombre,Categoría,Monto,PagadoPor
Supermercado Despensa,Comida,1450.00,Don Carlos Santiago
Alquiler Cabaña Bosque,Hospedaje,3200.00,Don Carlos Santiago
Carbón y Asado,Comida,680.50,Roberto Santiago
Gasolina Camioneta,Transporte,450.00,Roberto Santiago
Entradas Balneario,Varios,920.00,Carmen Morales
Bebidas y Hielo,Bebidas,350.00,Don Carlos Santiago`;

const parseCsvLine = (line, delimiter) => {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === delimiter && !insideQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
};

const normalizeText = (text) => {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export const parseExpensesCsv = (csvContent, participants = []) => {
  const lines = (csvContent || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      success: false,
      expenses: [],
      errors: ['El archivo CSV está vacío.'],
      totalAmount: 0,
    };
  }

  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';
  const headers = parseCsvLine(headerLine, delimiter).map((h) => normalizeText(h));

  const nameIdx = headers.findIndex((h) =>
    ['nombre', 'concepto', 'titulo', 'item', 'descripcion', 'name', 'title'].includes(h)
  );
  const categoryIdx = headers.findIndex((h) =>
    ['categoria', 'category', 'tipo', 'rubro'].includes(h)
  );
  const amountIdx = headers.findIndex((h) =>
    ['monto', 'precio', 'costo', 'cantidad', 'amount', 'total'].includes(h)
  );
  const paidByIdx = headers.findIndex((h) =>
    ['pagadopor', 'pagado_por', 'pagador', 'payer', 'paidby', 'comprador', 'quienpago'].includes(
      h.replace(/[\s_]+/g, '')
    )
  );

  if (amountIdx === -1) {
    return {
      success: false,
      expenses: [],
      errors: ['No se encontró la columna "Monto" o "Total" en el encabezado CSV.'],
      totalAmount: 0,
    };
  }

  const validCategories = ['Comida', 'Bebidas', 'Mantenimiento', 'Salarios', 'Varios'];
  const categoryAliases = {
    transporte: 'Mantenimiento',
    hospedaje: 'Salarios',
  };
  const expenses = [];
  const errors = [];
  let totalAmount = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawCols = parseCsvLine(lines[i], delimiter);
    if (rawCols.length <= 1 && !rawCols[0]) continue;

    const title = (nameIdx !== -1 ? rawCols[nameIdx] : `Gasto fila ${i}`) || `Gasto fila ${i}`;
    const rawAmount = amountIdx !== -1 ? rawCols[amountIdx] : '0';
    const cleanAmount = parseFloat(rawAmount.replace(/[^0-9.-]+/g, '')) || 0;

    if (cleanAmount <= 0) {
      errors.push(`Fila ${i + 1}: Monto inválido ($${rawAmount}).`);
      continue;
    }

    let category = 'Comida';
    if (categoryIdx !== -1 && rawCols[categoryIdx]) {
      const parsedCat = rawCols[categoryIdx].trim();
      const normCat = normalizeText(parsedCat);
      if (categoryAliases[normCat]) {
        category = categoryAliases[normCat];
      } else {
        const match = validCategories.find(
          (vc) => normalizeText(vc) === normCat
        );
        if (match) category = match;
      }
    }

    let paidById = participants[0]?.id || 'caja_general';
    let payerName = participants[0]?.name || 'Caja General';

    if (paidByIdx !== -1 && rawCols[paidByIdx]) {
      const parsedPayer = normalizeText(rawCols[paidByIdx]);
      const matchedParticipant = participants.find((p) => {
        const normP = normalizeText(p.name);
        return normP === parsedPayer || normP.includes(parsedPayer) || parsedPayer.includes(normP);
      });
      if (matchedParticipant) {
        paidById = matchedParticipant.id;
        payerName = matchedParticipant.name;
      }
    }

    expenses.push({
      id: generateUUID(),
      title,
      category,
      amount: Math.round((cleanAmount + Number.EPSILON) * 100) / 100,
      paidBy: paidById,
      payerName,
    });
    totalAmount += cleanAmount;
  }

  return {
    success: expenses.length > 0,
    expenses,
    errors,
    totalAmount: Math.round((totalAmount + Number.EPSILON) * 100) / 100,
  };
};
