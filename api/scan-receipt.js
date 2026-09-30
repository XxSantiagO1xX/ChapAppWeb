/**
 * Vercel Serverless Function - Google Gemini Vision Ticket Scanner
 * Lee automáticamente las variables de entorno configuradas en Vercel
 */

const SYSTEM_PROMPT = `Eres un auditor contable experto. Tu tarea es analizar la imagen de un comprobante de gasto (ticket de caja, nota de remisión, factura, recibo o nota manuscrita con precios).

Extrae exactamente:
1. "title": Nombre del establecimiento o concepto principal de compra (máximo 40 caracteres, conciso, ej. 'Supermercado OXXO', 'Gasolina Pemex', 'Restaurante', 'Compra de Frutas'). Si no hay nombre de comercio, describe brevemente qué se compró.
2. "amount": Monto total final pagado como número positivo con decimales si los tiene (ej. 154.50). Si es una nota o lista sin total, calcula la suma de todos los conceptos e impuestos/propinas.
3. "category": Clasifica en exactamente una de estas 5 categorías: "Comida", "Bebidas", "Transporte", "Hospedaje", "Varios".
4. "confidence": Número entre 0.0 y 1.0 según la claridad de la imagen.

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "title": "string",
  "amount": number,
  "category": "Comida" | "Bebidas" | "Transporte" | "Hospedaje" | "Varios",
  "confidence": number
}`;

const VALID_CATEGORIES = ['Comida', 'Bebidas', 'Transporte', 'Hospedaje', 'Varios'];

const FALLBACK_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash',
  'gemini-1.5-pro'
];

const parseAmount = (val) => {
  if (typeof val === 'number') return Math.max(0, val);
  if (!val) return 0;
  let str = String(val).trim().replace(/[$€MXN\s]/gi, '');
  
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf('.') > str.lastIndexOf(',')) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(/\./g, '').replace(',', '.');
    }
  } else if (str.includes(',')) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.max(0, num);
};

const parseJsonResponse = (responseText) => {
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  const parsed = JSON.parse(cleaned);

  const amount = parseAmount(parsed.amount);

  let title = String(parsed.title || 'Gasto General').trim().slice(0, 50);
  if (!title) title = 'Gasto General';

  let category = 'Comida';
  if (parsed.category) {
    const matched = VALID_CATEGORIES.find((c) => c.toLowerCase() === String(parsed.category).toLowerCase());
    if (matched) category = matched;
  }

  const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.9;

  return { title, amount, category, confidence };
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
                   process.env.REACT_APP_GEMINI_API_KEY ||
                   process.env.GEMINI_API;

    if (!apiKey) {
      console.warn('[Vercel Serverless] Variable GEMINI_API_KEY no encontrada en process.env');
      return res.status(500).json({ 
        error: 'MISSING_ENV_KEY',
        message: 'No se encontró la variable GEMINI_API_KEY en las variables de entorno de Vercel.' 
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
                  inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
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
        return res.status(200).json(parsed);
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
