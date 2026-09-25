import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Estructura de datos devuelta por la extracción de comprobantes / tickets.
 */
export interface ExtractedReceiptData {
  /** Concepto o establecimiento detectado */
  title: string;
  /** Monto total detectado o calculado en el ticket */
  amount: number;
  /** Categoría sugerida automáticamente ('Comida', 'Hospedaje', 'Transporte', 'Bebidas', 'Varios') */
  category?: string;
  /** Confianza del análisis (0.0 - 1.0) */
  confidence?: number;
}

const extra = Constants.expoConfig?.extra || {};

/**
 * Obtención de credenciales de IA (Gemini o OpenAI)
 */
const GEMINI_API_KEY: string =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  extra.EXPO_PUBLIC_GEMINI_API_KEY ||
  '';

const OPENAI_API_KEY: string =
  process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
  extra.EXPO_PUBLIC_OPENAI_API_KEY ||
  '';

const VALID_CATEGORIES = ['Comida', 'Hospedaje', 'Transporte', 'Bebidas', 'Varios'];

/**
 * Prompt del sistema diseñado para extraer datos de tickets impresos y notas manuscritas.
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

/**
 * Limpia y parsea respuestas en formato JSON que contengan delimitadores markdown.
 */
const parseJsonResponse = (responseText: string): any => {
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
};

/**
 * Convierte un URI de imagen local/web a Base64 puro.
 */
const resolveBase64 = async (imageUri: string, providedBase64?: string | null): Promise<string> => {
  if (providedBase64 && providedBase64.trim().length > 0) {
    return providedBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
  }

  if (imageUri.startsWith('data:image/')) {
    return imageUri.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
  }

  // Si estamos en Web o es un Blob/URL fetchable
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('[ReceiptScanner] Error al convertir imagen a Base64:', err);
    throw new Error('No se pudo codificar la imagen en Base64 para el análisis de IA.');
  }
};

const DEFAULT_GEMINI_MODEL: string =
  process.env.EXPO_PUBLIC_GEMINI_MODEL ||
  extra.EXPO_PUBLIC_GEMINI_MODEL ||
  'gemini-2.5-flash';

/**
 * Procesa la imagen usando Google Gemini Vision (Flash).
 * Prueba en cascada los modelos vigentes de Google GenAI (gemini-2.5-flash, gemini-2.0-flash, etc.).
 */
const processWithGemini = async (base64Data: string, apiKey: string): Promise<ExtractedReceiptData> => {
  const candidateModels = Array.from(
    new Set([
      DEFAULT_GEMINI_MODEL,
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-flash-latest',
    ])
  );

  let lastError: Error | null = null;

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
                  mime_type: 'image/jpeg',
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        console.warn(`[Gemini Scanner] Modelo ${model} no disponible o falló:`, message);
        lastError = new Error(`Gemini Vision Error (${model}): ${message}`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        lastError = new Error(`Gemini (${model}) no devolvió texto en la respuesta.`);
        continue;
      }

      const parsed = parseJsonResponse(rawText);

      // Normalizar categoría
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
    } catch (err: any) {
      console.warn(`[Gemini Scanner] Excepción con modelo ${model}:`, err?.message);
      lastError = err;
    }
  }

  throw lastError || new Error('No se pudo procesar el ticket con ninguno de los modelos vigentes de Gemini.');
};

/**
 * Procesa la imagen usando OpenAI GPT-4o-mini Vision.
 */
const processWithOpenAI = async (base64Data: string, apiKey: string): Promise<ExtractedReceiptData> => {
  const url = 'https://api.openai.com/v1/chat/completions';

  const requestBody = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analiza este comprobante o ticket y extrae la información requerida en formato JSON.' },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Data}`,
            },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`OpenAI Vision Error: ${message}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content;

  if (!rawText) {
    throw new Error('OpenAI no devolvió contenido en la respuesta.');
  }

  const parsed = parseJsonResponse(rawText);

  // Normalizar categoría
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
};

/**
 * Extrae de forma real y asíncrona la información de un ticket o nota manuscrita mediante IA (Gemini / OpenAI).
 *
 * @param imageUri URI local o web de la imagen
 * @param base64Data Cadena Base64 opcional provista directamente por ImagePicker
 * @returns Objeto con title, amount, category y confidence
 */
export const extractDataFromReceipt = async (
  imageUri: string,
  base64Data?: string | null
): Promise<ExtractedReceiptData> => {
  if (!imageUri && !base64Data) {
    throw new Error('No se proporcionó una imagen válida para escanear.');
  }

  const base64 = await resolveBase64(imageUri, base64Data);

  // 1. Prioridad: Google Gemini Flash (Rápido, económico y de alta precisión OCR)
  if (GEMINI_API_KEY && !GEMINI_API_KEY.includes('tu-gemini-key')) {
    return await processWithGemini(base64, GEMINI_API_KEY);
  }

  // 2. Alternativa: OpenAI GPT-4o-mini
  if (OPENAI_API_KEY && !OPENAI_API_KEY.includes('tu-openai-key')) {
    return await processWithOpenAI(base64, OPENAI_API_KEY);
  }

  // 3. Si no hay llaves configuradas en el entorno
  throw new Error(
    'No se encontró una API Key de Inteligencia Artificial configurada. Por favor configura EXPO_PUBLIC_GEMINI_API_KEY o EXPO_PUBLIC_OPENAI_API_KEY en las variables de entorno para procesar tickets con IA.'
  );
};
