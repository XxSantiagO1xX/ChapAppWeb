import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { SculptedIcon } from './SculptedIcon';
import type { Participant } from '../types';
import { extractDataFromReceipt, type ExtractedReceiptData } from '../services/receiptScanner';

export { extractDataFromReceipt, type ExtractedReceiptData };

interface QuickExpenseModalProps {
  visible: boolean;
  participants: Participant[];
  onClose: () => void;
  onSaveExpense: (expense: {
    title: string;
    amount: number;
    category: string;
    paidBy: string;
  }) => void;
}

const CATEGORIES = [
  { id: 'Comida', label: 'Comida', icon: 'cart' as const },
  { id: 'Hospedaje', label: 'Hospedaje', icon: 'bed' as const },
  { id: 'Transporte', label: 'Transporte', icon: 'car' as const },
  { id: 'Bebidas', label: 'Bebidas', icon: 'food' as const },
  { id: 'Varios', label: 'Varios', icon: 'receipt' as const },
];

export const QuickExpenseModal: React.FC<QuickExpenseModalProps> = ({
  visible,
  participants,
  onClose,
  onSaveExpense,
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { colors, isDark, getNeonGlow } = useTheme();

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Comida');
  const [paidBy, setPaidBy] = useState('');
  const [payerSearch, setPayerSearch] = useState('');

  // Estados de escaneo y procesamiento IA
  const [isScanning, setIsScanning] = useState(false);
  const [scannedImageUri, setScannedImageUri] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Inicializar pagador si no hay uno seleccionado
  const activePaidBy = paidBy || (participants.length > 0 ? participants[0].id : '');

  // Filtrado predictivo de pagador
  const filteredParticipants = useMemo(() => {
    if (!payerSearch.trim()) return participants;
    const q = payerSearch.toLowerCase();
    return participants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.subFamily || '').toLowerCase().includes(q)
    );
  }, [participants, payerSearch]);

  const selectedParticipant = useMemo(() => {
    return participants.find((p) => p.id === activePaidBy);
  }, [participants, activePaidBy]);

  // Procesar imagen con IA
  const processReceiptImage = async (uri: string) => {
    setScannedImageUri(uri);
    setIsScanning(true);
    setAiSuccessMessage(null);

    try {
      const result = await extractDataFromReceipt(uri);
      // Autocompletar los campos del formulario con el resultado de la IA
      setAmount(result.amount.toFixed(2));
      setTitle(result.title);
      if (result.category) {
        setCategory(result.category);
      }
      setAiSuccessMessage('✓ ¡Ticket analizado con éxito! Revisa o ajusta los datos.');
    } catch (error) {
      Alert.alert('Error al escanear', 'No se pudieron extraer los datos del ticket.');
    } finally {
      setIsScanning(false);
    }
  };

  // Abrir Cámara
  const handleLaunchCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso denegado',
          'Se necesita acceso a la cámara para fotografiar el ticket.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processReceiptImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir la cámara.');
    }
  };

  // Abrir Galería de Imágenes
  const handleLaunchGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso denegado',
          'Se necesita acceso a la galería para seleccionar la foto del ticket.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processReceiptImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  // Diálogo selector de Escaneo (Cámara vs Galería)
  const handleScanTicket = () => {
    Alert.alert(
      '📸 Escanear Ticket de Compra',
      'Elige cómo deseas capturar la foto de tu comprobante o factura:',
      [
        {
          text: '📷 Tomar Foto con Cámara',
          onPress: handleLaunchCamera,
        },
        {
          text: '🖼️ Elegir de la Galería',
          onPress: handleLaunchGallery,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const handleSave = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Monto requerido', 'Ingresa un monto válido mayor a 0.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Concepto requerido', 'Ingresa qué se compró o pagó.');
      return;
    }

    if (!activePaidBy) {
      Alert.alert('Pagador requerido', 'Selecciona quién pagó este gasto.');
      return;
    }

    onSaveExpense({
      title: title.trim(),
      amount: numAmount,
      category,
      paidBy: activePaidBy,
    });

    // Limpiar campos
    setAmount('');
    setTitle('');
    setCategory('Comida');
    setPayerSearch('');
    setScannedImageUri(null);
    setAiSuccessMessage(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.backdrop}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.bottomSheet,
            isTablet && styles.bottomSheetTablet,
            { backgroundColor: colors.surface },
          ]}
        >
          {/* Barra superior del BottomSheet */}
          <View style={styles.sheetHeader}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Captura Rápida de Gasto</Text>
                <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
                  Registra compras manuales o con escáner de IA
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <SculptedIcon name="close" size={16} variant="plain" color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
            {/* BOTÓN DESTACADO: ESCANEAR TICKET CON IA */}
            <TouchableOpacity
              style={[
                styles.scanTicketButton,
                {
                  backgroundColor: isDark ? 'rgba(0, 229, 255, 0.12)' : '#EFF6FF',
                  borderColor: isDark ? colors.neonCyan : '#93C5FD',
                },
                isDark ? getNeonGlow(colors.neonCyan, 'low') : {},
                isScanning && {
                  backgroundColor: isDark ? 'rgba(0, 229, 255, 0.2)' : '#DBEAFE',
                  borderColor: colors.primary,
                },
              ]}
              onPress={handleScanTicket}
              disabled={isScanning}
              activeOpacity={0.8}
            >
              {isScanning ? (
                <View style={styles.scanningLoaderRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.scanTicketButtonTextActive, { color: colors.primary }]}>
                    Analizando ticket con IA... (extrayendo monto y concepto)
                  </Text>
                </View>
              ) : (
                <View style={styles.scanButtonContent}>
                  <SculptedIcon name="receipt" size={20} variant="plain" color={isDark ? colors.neonCyan : '#1D4ED8'} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.scanTicketTitle, { color: isDark ? colors.neonCyan : '#1D4ED8' }]}>
                      Escanear Ticket con IA
                    </Text>
                    <Text style={[styles.scanTicketSub, { color: isDark ? colors.textSecondary : '#3B82F6' }]}>
                      Toma una foto para autocompletar monto y concepto
                    </Text>
                  </View>
                  <View style={[styles.scanBadge, { backgroundColor: isDark ? colors.primary : '#2563EB' }]}>
                    <Text style={styles.scanBadgeText}>NUEVO</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Banner de éxito de IA */}
            {aiSuccessMessage && !isScanning && (
              <View
                style={[
                  styles.aiSuccessBanner,
                  {
                    backgroundColor: colors.successLight,
                    borderColor: colors.successBorder,
                  },
                ]}
              >
                <Text style={[styles.aiSuccessText, { color: colors.successText }]}>{aiSuccessMessage}</Text>
              </View>
            )}

            {/* Miniatura del ticket escaneado */}
            {scannedImageUri && !isScanning && (
              <View
                style={[
                  styles.scannedPreviewRow,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Image source={{ uri: scannedImageUri }} style={styles.scannedThumbnail} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scannedLabel, { color: colors.textMuted }]}>Ticket adjuntado:</Text>
                  <Text style={[styles.scannedSub, { color: colors.textPrimary }]} numberOfLines={1}>
                    {title || 'Comprobante escaneado'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setScannedImageUri(null);
                    setAiSuccessMessage(null);
                  }}
                  style={styles.removeImageBtn}
                >
                  <Text style={[styles.removeImageText, { color: colors.dangerText }]}>✕ Quitar</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 1. MONTO NUMÉRICO GIGANTE EN EL CENTRO */}
            <View
              style={[
                styles.giantAmountContainer,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: isDark ? colors.border : colors.primaryLight,
                },
              ]}
            >
              <Text style={[styles.currencySymbol, { color: colors.primary }]}>$</Text>
              <TextInput
                style={[styles.giantAmountInput, { color: colors.textPrimary }]}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                autoFocus={!scannedImageUri}
              />
            </View>

            {/* 2. CONCEPTO O TÍTULO */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Concepto / ¿Qué se compró?</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Ej. Supermercado, Cena día 1, Gasolina..."
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* 3. CATEGORÍA */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Rubro / Categoría</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: colors.border,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        },
                        isSelected && {
                          backgroundColor: colors.primaryLight,
                          borderColor: colors.primaryBorder,
                        },
                      ]}
                      onPress={() => setCategory(cat.id)}
                    >
                      <SculptedIcon
                        name={cat.icon}
                        size={13}
                        variant="plain"
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: colors.textSecondary },
                          isSelected && { color: colors.primary, fontWeight: '700' },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 4. ¿QUIÉN LO PAGÓ? */}
            <View style={styles.fieldGroup}>
              <View style={styles.payerLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>¿Quién lo pagó de su bolsillo?</Text>
                {selectedParticipant && (
                  <View style={[styles.selectedPayerPill, { backgroundColor: colors.primaryLight, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                    <SculptedIcon name="user" size={11} variant="plain" color={colors.primary} />
                    <Text style={[styles.selectedPayerText, { color: colors.primary }]}>
                      {selectedParticipant.name}
                    </Text>
                  </View>
                )}
              </View>

              <TextInput
                style={[
                  styles.searchPayerInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Buscar por nombre o familia..."
                value={payerSearch}
                onChangeText={setPayerSearch}
                placeholderTextColor={colors.textMuted}
              />

              <ScrollView
                style={[
                  styles.payerChipsScroll,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
                contentContainerStyle={styles.payerChipsContent}
                nestedScrollEnabled
              >
                {filteredParticipants.slice(0, 8).map((p) => {
                  const isSelected = activePaidBy === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.payerItemCard,
                        { backgroundColor: colors.surface },
                        isSelected && {
                          backgroundColor: colors.primaryLight,
                          borderColor: colors.primaryBorder,
                        },
                      ]}
                      onPress={() => setPaidBy(p.id)}
                    >
                      <View
                        style={[
                          styles.payerRadioCircle,
                          { borderColor: colors.border },
                          isSelected && { borderColor: colors.primary },
                        ]}
                      >
                        {isSelected && (
                          <View style={[styles.payerRadioInner, { backgroundColor: colors.primary }]} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.payerNameText,
                            { color: colors.textPrimary },
                            isSelected && { color: colors.primary, fontWeight: '700' },
                          ]}
                        >
                          {p.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <SculptedIcon name="home" size={10} variant="plain" color={colors.textSecondary} />
                          <Text style={[styles.payerSubFamilyText, { color: colors.textSecondary }]}>
                            {p.subFamily || 'General'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </ScrollView>

          {/* BOTÓN GUARDAR GASTO DE ANCHO COMPLETO */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={[
                styles.saveExpenseBtn,
                {
                  backgroundColor: colors.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                },
                isDark ? getNeonGlow(colors.neonGreen, 'medium') : {},
              ]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <SculptedIcon name="check" size={16} variant="plain" color={isDark ? '#121212' : '#FFFFFF'} />
              <Text style={[styles.saveExpenseBtnText, { color: isDark ? '#121212' : '#FFFFFF' }]}>
                Guardar Gasto
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomSheet: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 20,
    gap: 12,
  },
  bottomSheetTablet: {
    maxWidth: 540,
    borderRadius: 24,
    marginBottom: 40,
  },
  sheetHeader: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 2,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sheetSub: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  sheetContent: {
    maxHeight: 460,
  },
  scanTicketButton: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
      } as any,
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanIcon: {
    fontSize: 24,
  },
  scanTicketTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  scanTicketSub: {
    fontSize: 11,
    marginTop: 1,
  },
  scanBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scanBadgeText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scanningLoaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  scanTicketButtonTextActive: {
    fontSize: 12,
    fontWeight: '500',
  },
  aiSuccessBanner: {
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  aiSuccessText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  scannedPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  scannedThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  scannedLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  scannedSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  removeImageBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeImageText: {
    fontSize: 11,
    fontWeight: '500',
  },
  giantAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    gap: 6,
  },
  currencySymbol: {
    fontSize: 34,
    fontWeight: '600',
  },
  giantAmountInput: {
    fontSize: 34,
    fontWeight: '600',
    minWidth: 120,
    textAlign: 'left',
    padding: 0,
  },
  fieldGroup: {
    marginTop: 10,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  categoryScroll: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  payerLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedPayerPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selectedPayerText: {
    fontSize: 11,
    fontWeight: '500',
  },
  searchPayerInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
  },
  payerChipsScroll: {
    maxHeight: 120,
    borderRadius: 8,
    borderWidth: 1,
  },
  payerChipsContent: {
    padding: 4,
    gap: 4,
  },
  payerItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 10,
  },
  payerRadioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payerRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  payerNameText: {
    fontSize: 13,
    fontWeight: '500',
  },
  payerSubFamilyText: {
    fontSize: 10,
  },
  sheetFooter: {
    marginTop: 4,
  },
  saveExpenseBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveExpenseBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
