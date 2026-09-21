import type { Expense, Participant } from '../types';

const generateId = (prefix = 'exp_csv'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export interface CsvParseResult {
  success: boolean;
  expenses: Expense[];
  errors: string[];
  totalAmount: number;
}

/**
 * Plantilla de ejemplo CSV para insumos y compras anticipadas.
 */
export const SAMPLE_CSV_TEMPLATE = `Nombre,Categoría,Monto,PagadoPor
Supermercado Despensa,Comida,1450.00,Carlos Santiago
Alquiler Cabaña Bosque,Hospedaje,3200.00,Carlos Santiago
Carbón y Asado,Comida,680.50,Roberto Santiago
Gasolina Camioneta,Transporte,450.00,Roberto Santiago
Entradas Parque Acuático,Varios,920.00,Mariana Bustamante
Bebidas y Hielo,Comida,350.00,Carlos Santiago`;

/**
 * Divide una línea de CSV respetando comillas y delimitadores (coma o punto y coma).
 */
const parseCsvLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
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

/**
 * Normaliza nombres para comparación insensible a mayúsculas y acentos.
 */
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Parsea un contenido CSV y crea los objetos Expense vinculándolos a los participantes del evento.
 */
export const parseExpensesCsv = (
  csvContent: string,
  participants: Participant[]
): CsvParseResult => {
  const lines = csvContent
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
      h.replace(/\s+/g, '')
    )
  );

  if (nameIdx === -1 || amountIdx === -1) {
    return {
      success: false,
      expenses: [],
      errors: [
        'Encabezados no reconocidos. Se requieren al menos las columnas: "Nombre" (o Concepto) y "Monto" (o Precio). Opcionales: "Categoría" y "PagadoPor".',
      ],
      totalAmount: 0,
    };
  }

  const parsedExpenses: Expense[] = [];
  const errors: string[] = [];
  let totalAmount = 0;

  const participantMap = new Map<string, Participant>();
  for (const p of participants) {
    participantMap.set(p.id, p);
    participantMap.set(normalizeText(p.name), p);
  }

  const fallbackPayerId = participants[0]?.id || '';

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const columns = parseCsvLine(rawLine, delimiter);

    const title = columns[nameIdx] || '';
    if (!title) {
      errors.push(`Línea ${i + 1}: Ignorada por no tener nombre/concepto.`);
      continue;
    }

    const rawAmount = (columns[amountIdx] || '')
      .replace(/[\$,]/g, '')
      .replace(/MXN|USD/gi, '')
      .trim();

    const amount = parseFloat(rawAmount);
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Línea ${i + 1} ("${title}"): Monto inválido ("${columns[amountIdx]}").`);
      continue;
    }

    const category = categoryIdx !== -1 && columns[categoryIdx] ? columns[categoryIdx].trim() : 'Comida';
    const rawPayer = paidByIdx !== -1 && columns[paidByIdx] ? columns[paidByIdx].trim() : '';

    let matchedPaidBy = fallbackPayerId;
    if (rawPayer) {
      const match = participantMap.get(rawPayer) || participantMap.get(normalizeText(rawPayer));
      if (match) {
        matchedPaidBy = match.id;
      } else {
        errors.push(
          `Línea ${i + 1} ("${title}"): No se encontró al participante "${rawPayer}". Se asignó al primer participante.`
        );
      }
    }

    const expense: Expense = {
      id: generateId('exp_csv'),
      title,
      amount: Math.round((amount + Number.EPSILON) * 100) / 100,
      category: category || 'Varios',
      paidBy: matchedPaidBy,
      splitBetween: [],
    };

    parsedExpenses.push(expense);
    totalAmount += expense.amount;
  }

  return {
    success: parsedExpenses.length > 0,
    expenses: parsedExpenses,
    errors,
    totalAmount: Math.round((totalAmount + Number.EPSILON) * 100) / 100,
  };
};
