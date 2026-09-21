/**
 * Estructura de datos devuelta por la extracción de comprobantes / tickets.
 */
export interface ExtractedReceiptData {
  /** Concepto o establecimiento detectado */
  title: string;
  /** Monto total detectado en el ticket */
  amount: number;
  /** Categoría sugerida automáticamente */
  category?: string;
  /** Confianza del análisis (0.0 - 1.0) */
  confidence?: number;
}

/**
 * Función asíncrona de procesamiento de tickets (Placeholder de IA).
 * Simula una llamada a API de Visión / IA (Gemini Vision) con un retardo de 2 segundos.
 * 
 * @param imageUri URI local de la imagen capturada por la cámara o galería
 * @returns Objeto con los datos extraídos (concepto, monto, categoría)
 */
export const extractDataFromReceipt = async (
  imageUri: string
): Promise<ExtractedReceiptData> => {
  if (!imageUri) {
    throw new Error('URI de imagen no proporcionada');
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulación de respuesta de IA extrayendo comercio y total
      resolve({
        title: 'Supermercado e Insumos',
        amount: 150.0,
        category: 'Comida',
        confidence: 0.95,
      });
    }, 2000);
  });
};
