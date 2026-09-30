/**
 * ChapApp - Escáner de Tickets con Inteligencia Artificial (Google Gemini Vision)
 */

import { CONFIG } from '../config.js';

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

/**
 * Obtener la API Key de Gemini desde LocalStorage, Env o Config
 */
export const getGeminiApiKey = () => {
  if (typeof window === 'undefined') return '';
  const localKey = localStorage.getItem('chapapp_gemini_api_key');
  if (localKey && localKey.trim() && localKey.trim() !== 'undefined' && localKey.trim() !== 'null') {
    return localKey.trim();
  }
  const envKey = window.__ENV && window.__ENV.GEMINI_API_KEY ? window.__ENV.GEMINI_API_KEY.trim() : '';
  if (envKey && envKey !== 'undefined' && envKey !== 'null' && envKey.length > 5) {
    return envKey;
  }
  if (CONFIG.GEMINI.API_KEY && !CONFIG.GEMINI.API_KEY.includes('EXAMPLE') && CONFIG.GEMINI.API_KEY.length > 5) {
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

/**
 * Parsea y sanitiza montos numéricos desde strings con formato o números
 */
export const parseAmount = (val) => {
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

/**
 * Parsea y normaliza la respuesta JSON devuelta por Gemini
 */
export const parseJsonResponse = (responseText) => {
  if (!responseText || typeof responseText !== 'string') {
    throw new Error('Respuesta vacía de Google Gemini');
  }
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Extraer el primer objeto JSON encontrado
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
    const candidateModels = FALLBACK_MODELS;
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
                  inlineData: {
                    mimeType: finalMime,
                    data: base64Data,
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
          const message = errorData?.error?.message || `HTTP ${response.status}`;
          
          if (response.status === 401 || response.status === 403 || message.includes('API key not valid')) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('chapapp_gemini_api_key');
            }
            const authErr = new Error('La API Key de Gemini es inválida o no está autorizada');
            authErr.code = 'INVALID_API_KEY';
            throw authErr;
          }

          lastError = new Error(`Gemini (${model}): ${message}`);
          continue;
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        return parseJsonResponse(rawText);
      } catch (err) {
        if (err.code === 'INVALID_API_KEY') throw err;
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
    if (serverErr.code === 'INVALID_API_KEY') throw serverErr;
    console.warn('[Gemini Scanner] Serverless intento:', serverErr.message);
  }

  // 3. Si no hay clave ni en cliente ni funcionó serverless, solicitar al usuario
  const missingErr = new Error('MISSING_API_KEY');
  missingErr.code = 'MISSING_API_KEY';
  throw missingErr;
};
