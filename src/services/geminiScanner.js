/**
 * ChapApp - Escáner de Tickets con Inteligencia Artificial (Google Gemini Vision)
 */

import { CONFIG } from '../config/config.js';

const SYSTEM_PROMPT = `Eres un auditor contable experto. Tu tarea es analizar la imagen de un comprobante de gasto (ticket de caja, nota de remisión, factura, recibo o nota manuscrita con precios).

Extrae exactamente:
1. "title": Nombre del establecimiento o concepto principal de compra (máximo 40 caracteres, conciso, ej. 'Supermercado OXXO', 'Gasolina Pemex', 'Restaurante', 'Compra de Frutas'). Si no hay nombre de comercio, describe brevemente qué se compró.
2. "amount": Monto total final pagado como número positivo con decimales si los tiene (ej. 154.50). Si es una nota o lista sin total, calcula la suma de todos los conceptos e impuestos/propinas.
3. "category": Clasifica en exactamente una de estas 5 categorías: "Comida", "Bebidas", "Mantenimiento", "Salarios", "Varios".
4. "confidence": Número entre 0.0 y 1.0 según la claridad de la imagen.

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "title": "string",
  "amount": number,
  "category": "Comida" | "Bebidas" | "Mantenimiento" | "Salarios" | "Varios",
  "confidence": number
}`;

const VALID_CATEGORIES = ['Comida', 'Bebidas', 'Mantenimiento', 'Salarios', 'Varios'];

const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest'
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

  const rawAmount = parsed.amount !== undefined ? parsed.amount : (parsed.total !== undefined ? parsed.total : (parsed.total_amount !== undefined ? parsed.total_amount : parsed.monto));
  const amount = parseAmount(rawAmount);

  let rawTitle = parsed.title || parsed.concept || parsed.concepto || parsed.store || parsed.establecimiento || parsed.description || 'Gasto General';
  let title = String(rawTitle).trim().slice(0, 50);
  if (!title) title = 'Gasto General';

  let category = 'Comida';
  let rawCategory = parsed.category || parsed.categoria;
  if (rawCategory) {
    const rawLower = String(rawCategory).toLowerCase();
    if (rawLower.includes('transporte')) rawCategory = 'Mantenimiento';
    if (rawLower.includes('hospedaje')) rawCategory = 'Salarios';
    const matched = VALID_CATEGORIES.find((c) => c.toLowerCase() === String(rawCategory).toLowerCase());
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
              role: 'user',
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
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
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
      if (errData.error === 'MISSING_ENV_KEY') {
        const missingErr = new Error('MISSING_API_KEY');
        missingErr.code = 'MISSING_API_KEY';
        throw missingErr;
      }
      if (errData.error === 'GEMINI_ERROR') {
        throw new Error(errData.message || 'Error en análisis con Gemini');
      }
    }
  } catch (serverErr) {
    if (serverErr.code === 'INVALID_API_KEY' || serverErr.code === 'MISSING_API_KEY') throw serverErr;
    console.warn('[Gemini Scanner] Serverless intento:', serverErr.message);
  }

  // 3. Si no hay clave ni en cliente ni funcionó serverless, solicitar al usuario
  const missingErr = new Error('MISSING_API_KEY');
  missingErr.code = 'MISSING_API_KEY';
  throw missingErr;
};

/**
 * Procesa múltiples imágenes de tickets en lotes con concurrencia controlada
 * @param {File[]} files - Lista de archivos de imagen a procesar
 * @param {Function} onProgress - Callback para reportar avance ({ current, total, result, error })
 * @returns {Promise<Array>} Lista de resultados analizados
 */
export const batchExtractDataFromReceipts = async (files = [], onProgress = null) => {
  if (!files || files.length === 0) return [];

  const results = [];
  const CONCURRENCY_LIMIT = 2; // Máximo 2 peticiones paralelas para respetar cuotas de Gemini
  let currentIndex = 0;

  const processFile = async (file, index) => {
    try {
      const extracted = await extractDataFromReceipt(file);
      const item = {
        id: 'batch_' + Date.now() + '_' + index + '_' + Math.random().toString(36).substring(2, 6),
        fileName: file.name,
        fileSize: file.size,
        title: extracted.title || 'Compra ' + (index + 1),
        amount: typeof extracted.amount === 'number' ? extracted.amount : 0,
        category: extracted.category || 'Comida',
        confidence: extracted.confidence || 0.9,
        status: 'success',
        included: true,
      };
      results.push(item);
      if (typeof onProgress === 'function') {
        onProgress({ current: results.length, total: files.length, item, status: 'success' });
      }
      return item;
    } catch (err) {
      console.warn(`[Batch Scanner] Error escaneando "${file.name}":`, err);
      const item = {
        id: 'batch_' + Date.now() + '_' + index + '_' + Math.random().toString(36).substring(2, 6),
        fileName: file.name,
        fileSize: file.size,
        title: file.name.replace(/\.[^/.]+$/, '').slice(0, 30) || 'Gasto General',
        amount: 0,
        category: 'Comida',
        confidence: 0,
        status: 'error',
        error: err.message || 'Error de lectura',
        included: true,
      };
      results.push(item);
      if (typeof onProgress === 'function') {
        onProgress({ current: results.length, total: files.length, item, status: 'error' });
      }
      return item;
    }
  };

  // Pool de ejecución concurrente
  const pool = [];
  for (let i = 0; i < files.length; i++) {
    const promise = Promise.resolve().then(() => processFile(files[i], i));
    pool.push(promise);

    if (CONCURRENCY_LIMIT <= files.length) {
      const e = promise.then(() => pool.splice(pool.indexOf(e), 1));
      pool.push(e);
      if (pool.length >= CONCURRENCY_LIMIT) {
        await Promise.race(pool);
      }
    }
  }

  await Promise.all(pool);
  return results;
};
