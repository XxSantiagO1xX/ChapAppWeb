import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import type { EventConfig } from '../types';
import type { EventTotalsResult } from '../utils/calculations';
import {
  generateEventCutHtml,
  generatePosTicketHtml,
  type PosTicketHtmlParams,
} from '../utils/pdfTemplates';

export interface PdfExportResult {
  uri: string;
  shared: boolean;
}

/**
 * Genera y exporta o comparte el PDF del Corte General del Evento.
 * Compatible con Web, iPadOS, iOS y Android.
 */
export const exportEventCutPdf = async (
  event: EventConfig,
  totals?: EventTotalsResult
): Promise<PdfExportResult> => {
  try {
    const html = generateEventCutHtml(event, totals);
    const safeTitle = (event.title || 'Evento').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Corte_General_${safeTitle}_${event.year}.pdf`;

    // 1. En entorno Web
    if (Platform.OS === 'web') {
      try {
        const { uri } = await Print.printToFileAsync({ html });
        const isSharingAvailable = await Sharing.isAvailableAsync().catch(() => false);

        if (isSharingAvailable && uri) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Corte General - ${event.title}`,
            UTI: 'com.adobe.pdf',
          });
          return { uri, shared: true };
        }

        // Descarga directa en navegador Web
        if (typeof document !== 'undefined' && uri) {
          const link = document.createElement('a');
          link.href = uri;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return { uri, shared: true };
        }

        // Fallback: imprimir en ventana del navegador
        await Print.printAsync({ html });
        return { uri: '', shared: true };
      } catch (webErr) {
        console.warn('[PDFService Web Fallback] Imprimiendo directamente:', webErr);
        await Print.printAsync({ html });
        return { uri: '', shared: true };
      }
    }

    // 2. En entorno Nativo (iPad / iOS / Android)
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Corte General - ${event.title}`,
        UTI: 'com.adobe.pdf',
      });
      return { uri, shared: true };
    } else {
      Alert.alert(
        'PDF Generado',
        `El documento se generó correctamente en:\n${uri}`,
        [{ text: 'Aceptar' }]
      );
      return { uri, shared: false };
    }
  } catch (error: any) {
    console.error('[PDFService] Error al generar PDF de Corte General:', error);
    Alert.alert('Error al exportar PDF', error?.message || 'No se pudo generar el documento PDF.');
    throw error;
  }
};

/**
 * Abre el cuadro de diálogo de impresión para el Corte General.
 */
export const printEventCut = async (
  event: EventConfig,
  totals?: EventTotalsResult
): Promise<void> => {
  try {
    const html = generateEventCutHtml(event, totals);
    await Print.printAsync({ html });
  } catch (error: any) {
    console.error('[PDFService] Error al imprimir Corte General:', error);
    Alert.alert('Error al imprimir', error?.message || 'No se pudo abrir el diálogo de impresión.');
  }
};

/**
 * Genera y exporta o comparte el PDF del Ticket POS Familiar (Optimizado para WhatsApp).
 * Compatible con Web, iPadOS, iOS y Android.
 */
export const exportPosTicketPdf = async (
  params: PosTicketHtmlParams
): Promise<PdfExportResult> => {
  const { subFamilyName, event } = params;
  try {
    const html = generatePosTicketHtml(params);
    const safeFamily = subFamilyName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeTitle = (event.title || 'Evento').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Ticket_POS_${safeFamily}_${safeTitle}_${event.year}.pdf`;

    // 1. En entorno Web
    if (Platform.OS === 'web') {
      try {
        const { uri } = await Print.printToFileAsync({ html });
        const isSharingAvailable = await Sharing.isAvailableAsync().catch(() => false);

        if (isSharingAvailable && uri) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Ticket POS - ${subFamilyName}`,
            UTI: 'com.adobe.pdf',
          });
          return { uri, shared: true };
        }

        // Descarga directa en navegador Web
        if (typeof document !== 'undefined' && uri) {
          const link = document.createElement('a');
          link.href = uri;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return { uri, shared: true };
        }

        // Fallback: imprimir en navegador
        await Print.printAsync({ html });
        return { uri: '', shared: true };
      } catch (webErr) {
        console.warn('[PDFService Web Fallback] Imprimiendo ticket directamente:', webErr);
        await Print.printAsync({ html });
        return { uri: '', shared: true };
      }
    }

    // 2. En entorno Nativo (iPad / iOS / Android)
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Ticket POS - ${subFamilyName}`,
        UTI: 'com.adobe.pdf',
      });
      return { uri, shared: true };
    } else {
      Alert.alert(
        'Ticket PDF Generado',
        `El ticket para "${subFamilyName}" se guardó en:\n${uri}`,
        [{ text: 'Aceptar' }]
      );
      return { uri, shared: false };
    }
  } catch (error: any) {
    console.error('[PDFService] Error al generar PDF de Ticket POS:', error);
    Alert.alert('Error al exportar Ticket PDF', error?.message || 'No se pudo generar el ticket en PDF.');
    throw error;
  }
};

/**
 * Abre el cuadro de diálogo de impresión para el Ticket POS Familiar.
 */
export const printPosTicket = async (
  params: PosTicketHtmlParams
): Promise<void> => {
  try {
    const html = generatePosTicketHtml(params);
    await Print.printAsync({ html });
  } catch (error: any) {
    console.error('[PDFService] Error al imprimir Ticket POS:', error);
    Alert.alert('Error al imprimir ticket', error?.message || 'No se pudo abrir el diálogo de impresión.');
  }
};
