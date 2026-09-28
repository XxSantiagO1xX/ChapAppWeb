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

/**
 * Obtener la API Key de Gemini desde LocalStorage o Config
 */
export const getGeminiApiKey = () => {
  if (typeof window === 'undefined') return '';
  const localKey = localStorage.getItem('chapapp_gemini_api_key');
  if (localKey && localKey.trim() && localKey.trim() !== 'undefined' && localKey.trim() !== 'null') {
    return localKey.trim();
  }
  const envKey = window.__ENV && window.__ENV.GEMINI_API_KEY ? window.__ENV.GEMINI_API_KEY.trim() : '';
  if (envKey && envKey !== 'undefined' && envKey !== 'null') {
    return envKey;
  }
  if (CONFIG.GEMINI.API_KEY && !CONFIG.GEMINI.API_KEY.includes('EXAMPLE')) {
    return CONFIG.GEMINI.API_KEY.trim();
  }
  return '';
};

/**
 * Guardar la API Key de Gemini en LocalStorage
 */
export const setGeminiApiKey = (key) => {
  if (typeof window !== 'undefined' && key) {
    localStorage.setItem('chapapp_gemini_api_key', key.trim());
  }
};

const parseJsonResponse = (responseText) => {
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
};

/**
 * Convierte y comprime imágenes a Base64 usando HTML5 Canvas para optimizar velocidad y memoria
 */
export const fileToBase64 = (file, maxDimension = 1600, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '');
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.onerror = () => {
        const rawBase64 = String(e.target.result).replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '');
        resolve({ base64: rawBase64, mimeType: file.type || 'image/jpeg' });
      };
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Analiza el comprobante de gasto enviándolo a Google Gemini Vision
 */
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

  const apiKey = getGeminiApiKey();

  // 1. Si tenemos API Key disponible en el cliente (desde Vercel env.js o localStorage)
  if (apiKey) {
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

    if (lastError) throw lastError;
  }

  // 2. Fallback con la función serverless de Vercel (/api/scan-receipt)
  try {
    const apiRes = await fetch('/api/scan-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: base64Data, mimeType: finalMime }),
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.title && typeof data.amount === 'number') {
        return data;
      }
    } else {
      const errData = await apiRes.json().catch(() => ({}));
      if (errData.error === 'GEMINI_ERROR') {
        throw new Error(errData.message || 'Error en análisis con Gemini');
      }
    }
  } catch (serverErr) {
    console.warn('[Gemini Scanner] Serverless intento:', serverErr);
  }

  // 3. Si no hay clave ni en cliente ni funcionó serverless, solicitar al usuario
  throw new Error('MISSING_API_KEY');
};
