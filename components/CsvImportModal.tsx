import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { FormatCurrency } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import type { Expense, Participant } from '../types';
import { parseExpensesCsv, SAMPLE_CSV_TEMPLATE } from '../utils/csvParser';

interface CsvImportModalProps {
  visible: boolean;
  participants: Participant[];
  onClose: () => void;
  onImport: (newExpenses: Expense[]) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  visible,
  participants,
  onClose,
  onImport,
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { colors, isDark, getNeonGlow } = useTheme();

  const [csvText, setCsvText] = useState('');
  const [parseResult, setParseResult] = useState<ReturnType<typeof parseExpensesCsv> | null>(null);

  const handleParsePreview = (text: string) => {
    setCsvText(text);
    if (text.trim().length > 0) {
      const result = parseExpensesCsv(text, participants);
      setParseResult(result);
    } else {
      setParseResult(null);
    }
  };

  const handleLoadSample = () => {
    const samplePayer = participants[0]?.name || 'Carlos Santiago';
    const sampleWithRealPayer = SAMPLE_CSV_TEMPLATE.replace(/Carlos Mendoza/g, samplePayer);
    handleParsePreview(sampleWithRealPayer);
  };

  const handleConfirmImport = () => {
    if (!parseResult || !parseResult.success || parseResult.expenses.length === 0) {
      Alert.alert('Sin datos válidos', 'Ingresa o pega un formato CSV válido para importar.');
      return;
    }

    onImport(parseResult.expenses);
    Alert.alert(
      'Importación Exitosa',
      `Se agregaron ${parseResult.expenses.length} gastos por un total de ${FormatCurrency(
        parseResult.totalAmount
      )}.`
    );
    onClose();
    setCsvText('');
    setParseResult(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={[
          styles.backdrop,
          {
            backgroundColor: isDark ? 'rgba(20, 18, 16, 0.75)' : 'rgba(20, 18, 16, 0.40)',
          },
        ]}
      >
        <View
          style={[
            styles.container,
            isTablet && styles.containerTablet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIcon, { backgroundColor: colors.primaryLight }]}>
                <Text style={{ fontSize: 20 }}>📁</Text>
              </View>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Importar Insumos / Gastos por CSV</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Carga rápida de compras anticipadas y facturas desde Excel o CSV
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
              onPress={onClose}
            >
              <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {/* Instrucciones y botón de ejemplo */}
            <View
              style={[
                styles.infoBox,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primaryBorder,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { color: colors.primaryText }]}>Formato de Columnas Requerido:</Text>
                <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
                  <Text style={[styles.bold, { color: colors.textPrimary }]}>Nombre, Categoría, Monto, PagadoPor</Text> (el pagador se vincula automáticamente por nombre).
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.sampleBtn,
                  { backgroundColor: colors.surface, borderColor: colors.primaryBorder },
                ]}
                onPress={handleLoadSample}
              >
                <Text style={[styles.sampleBtnText, { color: colors.primaryText }]}>📋 Cargar Ejemplo</Text>
              </TouchableOpacity>
            </View>

            {/* Área de texto para pegar el CSV */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Pega el contenido CSV aquí:</Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                multiline
                numberOfLines={6}
                value={csvText}
                onChangeText={handleParsePreview}
                placeholder={`Nombre,Categoría,Monto,PagadoPor\nSupermercado,Comida,1200.00,${
                  participants[0]?.name || 'Carlos Santiago'
                }`}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Vista previa de parseo */}
            {parseResult && (
              <View style={styles.previewSection}>
                <View style={styles.previewHeader}>
                  <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
                    Vista Previa ({parseResult.expenses.length} gastos detectados)
                  </Text>
                  <Text style={[styles.previewTotal, { color: colors.primaryText }]}>
                    Total: {FormatCurrency(parseResult.totalAmount)}
                  </Text>
                </View>

                {/* Advertencias / Errores de líneas */}
                {parseResult.errors.length > 0 && (
                  <View
                    style={[
                      styles.warningsBox,
                      {
                        backgroundColor: colors.warningLight,
                        borderColor: colors.warningBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.warningsTitle, { color: colors.warningText }]}>
                      ⚠️ Observaciones:
                    </Text>
                    {parseResult.errors.slice(0, 4).map((err, idx) => (
                      <Text key={idx} style={[styles.warningItem, { color: colors.warningText }]}>
                        • {err}
                      </Text>
                    ))}
                    {parseResult.errors.length > 4 && (
                      <Text style={[styles.warningItem, { color: colors.warningText }]}>
                        ... y {parseResult.errors.length - 4} observaciones más.
                      </Text>
                    )}
                  </View>
                )}

                {/* Lista de gastos detectados */}
                <View
                  style={[
                    styles.previewList,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {parseResult.expenses.map((exp, idx) => {
                    const payer = participants.find((p) => p.id === exp.paidBy);
                    return (
                      <View
                        key={idx}
                        style={[styles.previewRow, { borderBottomColor: colors.borderLight }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{exp.title}</Text>
                          <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                            {exp.category} • Pagado por: <Text style={[styles.bold, { color: colors.textPrimary }]}>{payer?.name || 'Desconocido'}</Text>
                          </Text>
                        </View>
                        <Text style={[styles.rowAmount, { color: colors.textPrimary }]}>{FormatCurrency(exp.amount)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              styles.footer,
              { borderTopColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: colors.primary },
                isDark && parseResult && parseResult.success && parseResult.expenses.length > 0
                  ? getNeonGlow(colors.neonGreen, 'medium')
                  : {},
                (!parseResult || !parseResult.success) && {
                  backgroundColor: colors.surfaceHighlight,
                  opacity: 0.6,
                },
              ]}
              onPress={handleConfirmImport}
              disabled={!parseResult || !parseResult.success}
            >
              <Text style={[styles.confirmBtnText, { color: isDark ? '#0D1117' : '#FFFFFF' }]}>
                {parseResult && parseResult.expenses.length > 0
                  ? `Importar ${parseResult.expenses.length} Gastos`
                  : 'Importar Gastos'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      } as any,
    }),
  },
  container: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
      } as any,
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  containerTablet: {
    maxWidth: 680,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  sampleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  sampleBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 13,
    fontFamily: 'monospace',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  previewSection: {
    gap: 10,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningsBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  warningsTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  warningItem: {
    fontSize: 11,
  },
  previewList: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  rowSub: {
    fontSize: 11,
    marginTop: 2,
  },
  rowAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  bold: {
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 18,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  confirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
