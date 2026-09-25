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
  {
    id: 'Comida',
    label: 'Comida',
    icon: 'cart' as const,
    colorLight: '#D97706',
    colorDark: '#FBBF24',
    bgLight: 'rgba(217, 119, 6, 0.12)',
    bgDark: 'rgba(251, 191, 36, 0.16)',
    borderLight: 'rgba(217, 119, 6, 0.40)',
    borderDark: 'rgba(251, 191, 36, 0.45)',
  },
  {
    id: 'Hospedaje',
    label: 'Hospedaje',
    icon: 'bed' as const,
    colorLight: '#7C3AED',
    colorDark: '#C084FC',
    bgLight: 'rgba(124, 58, 237, 0.12)',
    bgDark: 'rgba(192, 132, 252, 0.16)',
    borderLight: 'rgba(124, 58, 237, 0.40)',
    borderDark: 'rgba(192, 132, 252, 0.45)',
  },
  {
    id: 'Transporte',
    label: 'Transporte',
    icon: 'car' as const,
    colorLight: '#0284C7',
    colorDark: '#38BDF8',
    bgLight: 'rgba(2, 132, 199, 0.12)',
    bgDark: 'rgba(56, 189, 248, 0.16)',
    borderLight: 'rgba(2, 132, 199, 0.40)',
    borderDark: 'rgba(56, 189, 248, 0.45)',
  },
  {
    id: 'Bebidas',
    label: 'Bebidas',
    icon: 'food' as const,
    colorLight: '#E11D48',
    colorDark: '#FB7185',
    bgLight: 'rgba(225, 29, 72, 0.12)',
    bgDark: 'rgba(251, 113, 133, 0.16)',
    borderLight: 'rgba(225, 29, 72, 0.40)',
    borderDark: 'rgba(251, 113, 133, 0.45)',
  },
  {
    id: 'Varios',
    label: 'Varios',
    icon: 'receipt' as const,
    colorLight: '#059669',
    colorDark: '#34D399',
    bgLight: 'rgba(5, 150, 105, 0.12)',
    bgDark: 'rgba(52, 211, 153, 0.16)',
    borderLight: 'rgba(5, 150, 105, 0.40)',
    borderDark: 'rgba(52, 211, 153, 0.45)',
  },
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
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Monto requerido: Ingresa un monto válido mayor a 0.');
      } else {
        Alert.alert('Monto requerido', 'Ingresa un monto válido mayor a 0.');
      }
      return;
    }

    if (!title.trim()) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Concepto requerido: Ingresa qué se compró o pagó.');
      } else {
        Alert.alert('Concepto requerido', 'Ingresa qué se compró o pagó.');
      }
      return;
    }

    onSaveExpense({
      title: title.trim(),
      amount: numAmount,
      category,
      paidBy: activePaidBy || '',
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
        style={[
          styles.backdrop,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.52)',
            ...(Platform.OS === 'web'
              ? ({
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                } as any)
              : {}),
          },
        ]}
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
            {
              backgroundColor: isDark ? 'rgba(19, 25, 36, 0.92)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.95)',
              borderWidth: 1.5,
              ...(Platform.OS === 'web'
                ? ({
                    backdropFilter: 'blur(36px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(36px) saturate(200%)',
                    boxShadow: isDark
                      ? '0 -12px 48px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                      : '0 -12px 48px rgba(15, 23, 42, 0.20), 0 0 0 1px rgba(226, 232, 240, 0.90), inset 0 1px 0 rgba(255, 255, 255, 1)',
                  } as any)
                : {}),
            },
          ]}
        >
          {/* Barra superior del BottomSheet */}
          <View style={styles.sheetHeader}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(148, 163, 184, 0.5)' }]} />
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary, fontWeight: '700' }]}>Captura Rápida de Gasto</Text>
                <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
                  Registra compras manuales o con escáner de IA
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(241, 245, 249, 0.90)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.90)',
                    borderWidth: 1,
                    borderRadius: 16,
                  },
                ]}
              >
                <SculptedIcon name="close" size={14} variant="plain" color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
            {/* BOTÓN DESTACADO: ESCANEAR TICKET CON IA */}
            <TouchableOpacity
              style={[
                styles.scanTicketButton,
                {
                  backgroundColor: isDark ? 'rgba(0, 240, 255, 0.12)' : 'rgba(2, 132, 199, 0.08)',
                  borderColor: isDark ? colors.neonCyan : colors.primary,
                  borderWidth: 1.5,
                },
                isDark ? getNeonGlow(colors.neonCyan, 'low') : {},
                isScanning && {
                  backgroundColor: isDark ? 'rgba(0, 240, 255, 0.22)' : 'rgba(2, 132, 199, 0.14)',
                },
              ]}
              onPress={handleScanTicket}
              disabled={isScanning}
              activeOpacity={0.8}
            >
              {isScanning ? (
                <View style={styles.scanningLoaderRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.scanTicketButtonTextActive, { color: colors.primary, fontWeight: '700' }]}>
                    Analizando ticket con IA... (extrayendo monto y concepto)
                  </Text>
                </View>
              ) : (
                <View style={styles.scanButtonContent}>
                  <View
                    style={[
                      styles.scanIconCircle,
                      {
                        backgroundColor: isDark ? 'rgba(0, 240, 255, 0.20)' : 'rgba(2, 132, 199, 0.14)',
                      },
                    ]}
                  >
                    <SculptedIcon name="receipt" size={18} variant="plain" color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.scanTicketTitle, { color: colors.primary, fontWeight: '700' }]}>
                      Escanear Ticket con IA
                    </Text>
                    <Text style={[styles.scanTicketSub, { color: colors.textSecondary }]}>
                      Toma una foto para autocompletar monto y concepto
                    </Text>
                  </View>
                  <View style={[styles.scanBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.scanBadgeText, { color: isDark ? '#0D1117' : '#FFFFFF', fontWeight: '800' }]}>IA</Text>
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
                <Text style={[styles.aiSuccessText, { color: colors.successText, fontWeight: '700' }]}>{aiSuccessMessage}</Text>
              </View>
            )}

            {/* Miniatura del ticket escaneado */}
            {scannedImageUri && !isScanning && (
              <View
                style={[
                  styles.scannedPreviewRow,
                  {
                    backgroundColor: isDark ? 'rgba(13, 17, 23, 0.70)' : 'rgba(241, 245, 249, 0.90)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(226, 232, 240, 0.95)',
                    borderWidth: 1,
                  },
                ]}
              >
                <Image source={{ uri: scannedImageUri }} style={styles.scannedThumbnail} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scannedLabel, { color: colors.textMuted }]}>Ticket adjuntado:</Text>
                  <Text style={[styles.scannedSub, { color: colors.textPrimary, fontWeight: '700' }]} numberOfLines={1}>
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
                  <Text style={[styles.removeImageText, { color: colors.dangerText, fontWeight: '700' }]}>✕ Quitar</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 1. MONTO NUMÉRICO GIGANTE EN EL CENTRO */}
            <View
              style={[
                styles.giantAmountContainer,
                {
                  backgroundColor: isDark ? 'rgba(13, 17, 23, 0.75)' : 'rgba(241, 245, 249, 0.95)',
                  borderColor: isDark ? 'rgba(0, 240, 255, 0.35)' : 'rgba(203, 213, 225, 0.95)',
                  borderWidth: 1.5,
                },
              ]}
            >
              <Text style={[styles.currencySymbol, { color: isDark ? colors.neonCyan : colors.primary, fontWeight: '700' }]}>$</Text>
              <TextInput
                style={[styles.giantAmountInput, { color: colors.textPrimary, fontWeight: '800' }]}
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
              <Text style={[styles.fieldLabel, { color: colors.textPrimary, fontWeight: '700' }]}>Concepto / ¿Qué se compró?</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? 'rgba(13, 17, 23, 0.75)' : 'rgba(248, 250, 252, 0.95)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(203, 213, 225, 0.95)',
                    borderWidth: 1.5,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Ej. Supermercado, Cena día 1, Gasolina..."
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* 3. CATEGORÍA / RUBRO */}
            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary, fontWeight: '700' }]}>Rubro / Categoría</Text>
                <Text style={[styles.fieldLabelSub, { color: colors.textMuted, fontSize: 11, fontWeight: '600' }]}>
                  {category}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScrollContent}
                style={styles.categoryScroll}
              >
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  const catColor = isDark ? cat.colorDark : cat.colorLight;
                  const catBg = isDark ? cat.bgDark : cat.bgLight;
                  const catBorder = isDark ? cat.borderDark : cat.borderLight;

                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: isSelected
                            ? catBg
                            : isDark
                            ? 'rgba(26, 36, 52, 0.80)'
                            : 'rgba(248, 250, 252, 0.95)',
                          borderColor: isSelected
                            ? catBorder
                            : isDark
                            ? 'rgba(255, 255, 255, 0.10)'
                            : 'rgba(203, 213, 225, 0.90)',
                          borderWidth: isSelected ? 1.5 : 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
                        },
                        isSelected && isDark ? getNeonGlow(catColor, 'low') : {},
                      ]}
                      onPress={() => setCategory(cat.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.categoryIconCircle,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? 'rgba(0, 0, 0, 0.35)'
                                : 'rgba(255, 255, 255, 0.90)'
                              : isDark
                              ? 'rgba(13, 17, 23, 0.50)'
                              : 'rgba(241, 245, 249, 0.85)',
                          },
                        ]}
                      >
                        <SculptedIcon
                          name={cat.icon}
                          size={13}
                          variant="plain"
                          color={isSelected ? catColor : (isDark ? colors.textSecondary : '#475569')}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryChipText,
                          {
                            color: isSelected ? catColor : colors.textPrimary,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {cat.label}
                      </Text>
                      {isSelected && (
                        <View style={[styles.categoryActiveCheck, { backgroundColor: catColor }]}>
                          <SculptedIcon name="check" size={8} variant="plain" color={isDark ? '#0D1117' : '#FFFFFF'} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 4. ¿QUIÉN LO PAGÓ? */}
            <View style={styles.fieldGroup}>
              <View style={styles.payerLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary, fontWeight: '700' }]}>¿Quién lo pagó de su bolsillo?</Text>
                {selectedParticipant ? (
                  <View style={[styles.selectedPayerPill, { backgroundColor: isDark ? 'rgba(0, 240, 255, 0.15)' : colors.primaryLight, borderColor: isDark ? colors.primaryBorder : colors.primaryBorder, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                    <SculptedIcon name="user" size={11} variant="plain" color={colors.primary} />
                    <Text style={[styles.selectedPayerText, { color: isDark ? colors.neonCyan : colors.primary, fontWeight: '700' }]}>
                      {selectedParticipant.name}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.selectedPayerPill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceSubtle, borderColor: colors.border, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                    <SculptedIcon name="bank" size={11} variant="plain" color={colors.textSecondary} />
                    <Text style={[styles.selectedPayerText, { color: colors.textSecondary, fontWeight: '600' }]}>
                      Fondo Común / General
                    </Text>
                  </View>
                )}
              </View>

              {participants.length === 0 ? (
                <View
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(226, 232, 240, 0.95)',
                    backgroundColor: isDark ? 'rgba(13, 17, 23, 0.60)' : 'rgba(241, 245, 249, 0.85)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <SculptedIcon name="bank" size={18} variant="plain" color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                      Gasto General / Fondo Común
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      Se registrará como gasto general del evento.
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <TextInput
                    style={[
                      styles.searchPayerInput,
                      {
                        backgroundColor: isDark ? 'rgba(13, 17, 23, 0.75)' : 'rgba(248, 250, 252, 0.95)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(203, 213, 225, 0.95)',
                        borderWidth: 1.5,
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
                        backgroundColor: isDark ? 'rgba(13, 17, 23, 0.60)' : 'rgba(241, 245, 249, 0.85)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(226, 232, 240, 0.95)',
                        borderWidth: 1.5,
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
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(0, 240, 255, 0.15)'
                              : 'rgba(2, 132, 199, 0.12)'
                            : isDark
                            ? 'rgba(19, 25, 36, 0.85)'
                            : 'rgba(255, 255, 255, 0.95)',
                          borderColor: isSelected
                            ? colors.primary
                            : isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(226, 232, 240, 0.95)',
                          borderWidth: isSelected ? 1.5 : 1,
                        },
                      ]}
                      onPress={() => setPaidBy(p.id)}
                    >
                      <View
                        style={[
                          styles.payerRadioCircle,
                          { borderColor: isSelected ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(203, 213, 225, 0.90)') },
                          isSelected && { borderColor: colors.primary, backgroundColor: colors.surface },
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
                            isSelected && { color: isDark ? colors.neonCyan : colors.primary, fontWeight: '700' },
                          ]}
                        >
                          {p.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <SculptedIcon name="home" size={11} variant="plain" color={colors.textSecondary} />
                          <Text style={[styles.payerSubFamilyText, { color: colors.textSecondary }]}>
                            {p.subFamily || 'General'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      </ScrollView>

          {/* BOTÓN GUARDAR GASTO DE ANCHO COMPLETO */}
          <View style={[styles.sheetFooter, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(226, 232, 240, 0.95)' }]}>
            <TouchableOpacity
              style={[
                styles.saveExpenseBtn,
                {
                  backgroundColor: colors.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                },
                isDark ? getNeonGlow(colors.neonGreen, 'medium') : {},
              ]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <SculptedIcon name="check" size={16} variant="plain" color={isDark ? '#0D1117' : '#FFFFFF'} />
              <Text style={[styles.saveExpenseBtnText, { color: isDark ? '#0D1117' : '#FFFFFF', fontWeight: '700' }]}>
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
    gap: 12,
  },
  scanIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIcon: {
    fontSize: 24,
  },
  scanTicketTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  scanTicketSub: {
    fontSize: 11,
    marginTop: 1,
  },
  scanBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scanBadgeText: {
    fontSize: 10,
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
    borderRadius: 10,
    padding: 8,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    gap: 8,
  },
  currencySymbol: {
    fontSize: 34,
    fontWeight: '700',
  },
  giantAmountInput: {
    fontSize: 34,
    fontWeight: '700',
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
  },
  fieldLabelSub: {
    textTransform: 'capitalize',
  },
  textInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryScrollContent: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },
  categoryIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryActiveCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  categoryChipText: {
    fontSize: 12,
  },
  payerLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedPayerPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  selectedPayerText: {
    fontSize: 11,
  },
  searchPayerInput: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
  },
  payerChipsScroll: {
    maxHeight: 125,
    borderRadius: 12,
  },
  payerChipsContent: {
    padding: 6,
    gap: 6,
  },
  payerItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 10,
  },
  payerRadioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
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
    fontSize: 11,
  },
  sheetFooter: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  saveExpenseBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveExpenseBtnText: {
    fontSize: 15,
  },
});
