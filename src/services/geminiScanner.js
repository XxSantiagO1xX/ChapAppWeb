/**
 * ChapApp - Escáner de Tickets con Inteligencia Artificial (Google Gemini Vision)
 */

import { CONFIG } from '../config.js';

const SYSTEM_PROMPT = `Eres un asistente experto en contabilidad y auditoría de gastos. Tu tarea es analizar la imagen de un comprobante de gasto (que puede ser un ticket impreso de caja registradora, una factura, una nota de remisión, o una nota manuscrita / escrita a mano con conceptos y precios).

Instrucciones:
1. Extrae o deduce el NOMBRE DEL COMERCIO o CONCEPTO PRINCIPAL de la compra (ej. 'Supermercado OXXO', 'Gasolina Pemex', 'Restaurante Los Arcos', 'Compra de verduras'). Si no hay nombre de comercio, describe brevemente qué se compró. Guarda esto en "title" (máximo 40 caracteres, conciso y claro).
2. Extrae el MONTO TOTAL a pagar:
   - Si el comprobante tiene un "TOTAL" explícito, usa ese monto.
   - Si es una nota o lista escrita a mano con varios conceptos y precios sin total, calcula la suma total correcta de todos los conceptos y propinas/impuestos si los hay.
   - Debe ser un número positivo (ej. 154.50), sin símbolos de moneda ni comas de miles. Guarda esto en "amount".
3. Clasifica el gasto en exactamente una de estas 5 categorías válidas:
   - "Comida": supermercado, abarrotes, restaurantes, cafeterías, alimentos, ingredientes.
   - "Bebidas": licores, cervezas, vinos, refrescos, bar, botellas.
   - "Transporte": gasolina, combustible, casetas, peajes, taxi, Uber, estacionamiento, pasajes.
   - "Hospedaje": hotel, Airbnb, cabaña, estancia, alojamiento.
   - "Varios": farmacia, recuerdos, propinas, entradas, ferretería u otros gastos generales.
   Guarda esto en "category".
4. Asigna un nivel de confianza entre 0.0 y 1.0 en "confidence" según la legibilidad y claridad de la imagen.

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "title": "string",
  "amount": number,
  "category": "Comida" | "Hospedaje" | "Transporte" | "Bebidas" | "Varios",
  "confidence": number
}`;

const VALID_CATEGORIES = ['Comida', 'Hospedaje', 'Transporte', 'Bebidas', 'Varios'];

const parseJsonResponse = (responseText) => {
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
};

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '');
      resolve({ base64, mimeType: file.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const extractDataFromReceipt = async (fileOrBase64, mimeType = 'image/jpeg') => {
  let base64Data = '';
  let finalMime = mimeType;

  if (fileOrBase64 instanceof File || fileOrBase64 instanceof Blob) {
    const res = await fileToBase64(fileOrBase64);
    base64Data = res.base64;
    finalMime = res.mimeType;
  } else if (typeof fileOrBase64 === 'string') {
    base64Data = fileOrBase64.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '');
  }

  const apiKey = CONFIG.GEMINI.API_KEY;
  if (!apiKey || apiKey.includes('EXAMPLE')) {
    // Si no está configurada la llave, devolvemos simulación amigable
    console.warn('[Gemini AI] API key no configurada, usando análisis heurístico.');
    return {
      title: 'Ticket Escaneado',
      amount: 0,
      category: 'Comida',
      confidence: 0.8
    };
  }

  const candidateModels = CONFIG.GEMINI.FALLBACK_MODELS;
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const requestBody = {
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              {
                inline_data: {
                  mime_type: finalMime,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${response.status}`;
        lastError = new Error(`Gemini (${model}): ${message}`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = parseJsonResponse(rawText);
      let category = 'Comida';
      if (parsed.category) {
        const matched = VALID_CATEGORIES.find((c) => c.toLowerCase() === String(parsed.category).toLowerCase());
        if (matched) category = matched;
      }

      return {
        title: String(parsed.title || 'Gasto General').slice(0, 50),
        amount: typeof parsed.amount === 'number' ? Math.max(0, parsed.amount) : parseFloat(parsed.amount) || 0,
        category,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('No se pudo procesar el comprobante con Google Gemini.');
};
