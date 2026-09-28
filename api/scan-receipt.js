/**
 * Vercel Serverless Function - Google Gemini Vision Ticket Scanner
 * Lee automáticamente las variables de entorno configuradas en Vercel
 * (GEMINI_API_KEY, EXPO_PUBLIC_GEMINI_API_KEY, VITE_GEMINI_API_KEY, NEXT_PUBLIC_GEMINI_API_KEY)
 */

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
const FALLBACK_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro'
];

const parseJsonResponse = (responseText) => {
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
};

export default async function handler(req, res) {
  // Configurar encabezados CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    const { base64, mimeType = 'image/jpeg' } = body || {};

    if (!base64) {
      return res.status(400).json({ error: 'No se recibió la imagen en Base64' });
    }

    const cleanBase64 = base64.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '');

    const apiKey = process.env.GEMINI_API_KEY || 
                   process.env.GOOGLE_GEMINI_API_KEY || 
                   process.env.GOOGLE_API_KEY || 
                   process.env.API_KEY_GEMINI || 
                   process.env.GEMINI_KEY ||
                   process.env.EXPO_PUBLIC_GEMINI_API_KEY || 
                   process.env.VITE_GEMINI_API_KEY || 
                   process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
                   process.env.REACT_APP_GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('[Vercel Serverless] Variable GEMINI_API_KEY no encontrada en process.env');
      return res.status(500).json({ 
        error: 'MISSING_ENV_KEY',
        message: 'No se encontró la variable GEMINI_API_KEY en las variables de entorno de Vercel. Asegúrate de que esté configurada en el Dashboard de Vercel.' 
      });
    }

    let lastError = null;

    for (const model of FALLBACK_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const requestBody = {
          contents: [
            {
              parts: [
                { text: SYSTEM_PROMPT },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: cleanBase64,
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
          const msg = errorData?.error?.message || `HTTP ${response.status}`;
          lastError = new Error(`Gemini (${model}): ${msg}`);
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

        return res.status(200).json({
          title: String(parsed.title || 'Gasto General').slice(0, 50),
          amount: typeof parsed.amount === 'number' ? Math.max(0, parsed.amount) : parseFloat(parsed.amount) || 0,
          category,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
        });
      } catch (err) {
        lastError = err;
      }
    }

    return res.status(500).json({ 
      error: 'GEMINI_ERROR', 
      message: lastError?.message || 'Error al comunicarse con Google Gemini.' 
    });
  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
}
