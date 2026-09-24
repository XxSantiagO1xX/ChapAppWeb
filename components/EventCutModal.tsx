import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  useWindowDimensions,
  Share,
  Platform,
} from 'react-native';
import { FormatCurrency } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from './GlassCard';
import { SculptedIcon } from './SculptedIcon';
import type { EventConfig } from '../types';
import { calculateEventTotals } from '../utils/calculations';
import {
  generateEventReportPlainText,
  generateEventReportHtml,
} from '../utils/reportGenerator';

interface EventCutModalProps {
  visible: boolean;
  event: EventConfig;
  onClose: () => void;
  onToggleSettlement?: (participantId: string) => void;
  onToggleSubFamilySettlement?: (subFamilyName: string) => void;
}

export const EventCutModal: React.FC<EventCutModalProps> = ({
  visible,
  event,
  onClose,
  onToggleSettlement,
  onToggleSubFamilySettlement,
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { colors, isDark, getNeonGlow } = useTheme();
  const totals = useMemo(() => calculateEventTotals(event), [event]);

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'individuals' | 'families'>('individuals');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtro predictivo de participantes
  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return totals.participants;
    const q = searchQuery.trim().toLowerCase();
    return totals.participants.filter((p) => {
      const nameMatch = p.participantName.toLowerCase().includes(q);
      const sfMatch = (p.subFamily || '').toLowerCase().includes(q);
      return nameMatch || sfMatch;
    });
  }, [totals.participants, searchQuery]);

  // Filtro predictivo de subfamilias
  const filteredSubFamilies = useMemo(() => {
    if (!searchQuery.trim()) return totals.subFamilies;
    const q = searchQuery.trim().toLowerCase();
    return totals.subFamilies.filter((sf) =>
      sf.subFamilyName.toLowerCase().includes(q)
    );
  }, [totals.subFamilies, searchQuery]);

  const handleShareText = async () => {
    try {
      const reportText = generateEventReportPlainText(event, totals);
      await Share.share({
        message: reportText,
        title: `Corte Final - ${event.title}`,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      Alert.alert('Error', 'No se pudo compartir el reporte.');
    }
  };

  const handlePrintOrExport = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      const html = generateEventReportHtml(event, totals);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
        return;
      }
    }

    Alert.alert(
      'Exportar Reporte',
      'El reporte formal con las 4 columnas contables y cuadre de caja ha sido generado.',
      [
        { text: 'Compartir en WhatsApp', onPress: handleShareText },
        { text: 'Entendido', style: 'cancel' },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
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
          {/* Header del Modal */}
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: colors.borderLight, backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.modalHeaderTitleArea}>
              <View style={[styles.receiptIcon, { backgroundColor: colors.primaryLight }]}>
                <SculptedIcon name="receipt" size={20} variant="plain" color={colors.primaryText} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Corte Oficial y Liquidación</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {event.title} • {totals.totalAttendingCount} de {totals.totalParticipantsCount} Asistentes
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.surfaceSubtle }]}
              onPress={onClose}
            >
              <SculptedIcon name="close" size={15} variant="plain" color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* 1. Barra Superior Minimalista de Estado y Balanza */}
          <View
            style={[
              styles.topStatusBar,
              { backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.borderLight },
            ]}
          >
            <View style={styles.statusBarLeft}>
              <View
                style={[
                  totals.isFullySettled ? styles.statusBadgeSettled : styles.statusBadgePending,
                  { flexDirection: 'row', alignItems: 'center', gap: 4 },
                  totals.isFullySettled
                    ? { backgroundColor: colors.successLight, borderColor: colors.successBorder, borderWidth: 1 }
                    : { backgroundColor: colors.warningLight, borderColor: colors.warningBorder, borderWidth: 1 },
                ]}
              >
                <SculptedIcon
                  name={totals.isFullySettled ? 'check-circle' : 'clock'}
                  size={12}
                  variant="plain"
                  color={totals.isFullySettled ? colors.successText : colors.warningText}
                />
                <Text
                  style={[
                    totals.isFullySettled ? styles.statusBadgeTextSettled : styles.statusBadgeTextPending,
                    totals.isFullySettled
                      ? { color: colors.successText }
                      : { color: colors.warningText },
                  ]}
                >
                  {totals.isFullySettled ? '100% Liquidado' : 'Liquidación en Curso'}
                </Text>
              </View>
              <Text style={[styles.statusBarBalanceText, { color: colors.textSecondary }]}>
                Balanza: <Text style={styles.boldText}>$0.00</Text> • {totals.isCashBalanced ? 'Cuadrada' : 'Pendiente'}
              </Text>
            </View>

            <View style={styles.statusBarRight}>
              <Text style={[styles.statusBarMetricsText, { color: colors.textSecondary }]}>
                Recaudado: <Text style={styles.boldText}>{FormatCurrency(totals.totalCollected)}</Text>
                {' / Meta: '}
                <Text style={styles.boldText}>{FormatCurrency(totals.totalToCollect)}</Text>
                {' • Caja: '}
                <Text style={[styles.boldText, { color: colors.teal }]}>{FormatCurrency(totals.cashInHand)}</Text>
              </Text>
            </View>
          </View>

          {/* 2. Dos Pestañas Claras y Directas + Buscador Integrado */}
          <View
            style={[
              styles.tabsAndSearchRow,
              { borderBottomColor: colors.borderLight, backgroundColor: colors.surface },
            ]}
          >
            {/* Pestañas */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.borderLight },
                  activeTab === 'individuals' && {
                    backgroundColor: colors.primaryLight,
                    borderWidth: 1,
                    borderColor: colors.primaryBorder,
                  },
                ]}
                onPress={() => setActiveTab('individuals')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: colors.textSecondary },
                    activeTab === 'individuals' && { color: colors.primaryText, fontWeight: '700' },
                  ]}
                >
                  Detalle por Integrante ({totals.participants.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.borderLight },
                  activeTab === 'families' && {
                    backgroundColor: colors.primaryLight,
                    borderWidth: 1,
                    borderColor: colors.primaryBorder,
                  },
                ]}
                onPress={() => setActiveTab('families')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: colors.textSecondary },
                    activeTab === 'families' && { color: colors.primaryText, fontWeight: '700' },
                  ]}
                >
                  Consolidado por Subfamilia ({totals.subFamilies.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Buscador Rápido */}
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <SculptedIcon name="search" size={12} variant="plain" color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder={
                  activeTab === 'individuals'
                    ? 'Buscar participante...'
                    : 'Buscar subfamilia...'
                }
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={colors.textMuted}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                  <Text style={[styles.searchClearText, { color: colors.textMuted }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 3. Área de Contenido con Espacio en Blanco y Tipografía Clara */}
          <ScrollView
            style={[styles.scrollArea, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ================= PESTAÑA 1: DETALLE POR INTEGRANTE ================= */}
            {activeTab === 'individuals' && (
              <View style={styles.listSection}>
                {/* Encabezado de Columnas */}
                <View style={[styles.columnsHeader, { borderBottomColor: colors.borderLight }]}>
                  <Text style={[styles.colHeader, { flex: 2.2, color: colors.textMuted }]}>INTEGRANTE</Text>
                  <Text style={[styles.colHeader, { flex: 1, textAlign: 'right', color: colors.textMuted }]}>CUOTA</Text>
                  <Text style={[styles.colHeader, { flex: 1, textAlign: 'right', color: colors.textMuted }]}>BOLSILLO</Text>
                  <Text style={[styles.colHeader, { flex: 1.5, textAlign: 'right', color: colors.textMuted }]}>SALDO NETO</Text>
                  <Text style={[styles.colHeader, { flex: 1.2, textAlign: 'center', color: colors.textMuted }]}>ESTADO</Text>
                </View>

                {filteredParticipants.length === 0 ? (
                  <View style={styles.emptySearch}>
                    <Text style={[styles.emptySearchText, { color: colors.textMuted }]}>
                      No hay integrantes que coincidan con "{searchQuery}".
                    </Text>
                  </View>
                ) : (
                  <View style={styles.rowsList}>
                    {filteredParticipants.map((p) => {
                      const isRefund = p.finalBalance < 0;
                      const isOwed = p.finalBalance > 0;
                      const isSettled = p.isSettled;

                      return (
                        <View
                          key={p.participantId}
                          style={[
                            styles.participantRow,
                            {
                              backgroundColor: colors.surface,
                              borderColor: isDark ? colors.border : colors.borderLight,
                            },
                            isSettled && {
                              backgroundColor: colors.successLight,
                              borderColor: colors.successBorder,
                            },
                            !p.isAttending && styles.rowAbsentBg,
                          ]}
                        >
                          {/* Col 1: Nombre y Categoría */}
                          <View style={{ flex: 2.2 }}>
                            <View style={styles.nameBadgeRow}>
                              <Text style={[styles.participantName, { color: colors.textPrimary }]}>{p.participantName}</Text>
                              <View
                                style={
                                  p.category === 'nino'
                                    ? [
                                        styles.catBadgeNino,
                                        {
                                          backgroundColor: colors.purpleLight,
                                        },
                                      ]
                                    : [
                                        styles.catBadgeAdulto,
                                        { backgroundColor: colors.surfaceHighlight },
                                      ]
                                }
                              >
                                <Text
                                  style={
                                    p.category === 'nino'
                                      ? [
                                          styles.catBadgeTextNino,
                                          { color: colors.purple },
                                        ]
                                      : [
                                          styles.catBadgeTextAdulto,
                                          { color: colors.textSecondary },
                                        ]
                                  }
                                >
                                  {p.category.toUpperCase()}
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.participantSub, { color: colors.textMuted }]}>
                              {p.subFamily} • {p.isAttending ? `${p.activeDaysCount} días` : 'No asistió'}
                            </Text>
                          </View>

                          {/* Col 2: Cuota Proporcional */}
                          <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={[styles.amountText, { color: colors.textPrimary }]}>
                              {FormatCurrency(p.proportionalShare)}
                            </Text>
                            <Text style={[styles.amountSubHint, { color: colors.textMuted }]}>{p.weightedUnits} uds</Text>
                          </View>

                          {/* Col 3: Aporte de Bolsillo */}
                          <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text
                              style={[
                                styles.amountText,
                                { color: colors.textPrimary },
                                p.totalPaid === 0 && { color: colors.textMuted, fontWeight: '400' },
                              ]}
                            >
                              {FormatCurrency(p.totalPaid)}
                            </Text>
                            {p.totalPaid > 0 ? (
                              <Text style={[styles.amountSubHint, { color: colors.textMuted }]}>compras</Text>
                            ) : null}
                          </View>

                          {/* Col 4: Saldo Neto (Prominente) */}
                          <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                            {isRefund && (
                              <View
                                style={[
                                  styles.pillRefund,
                                  {
                                    backgroundColor: colors.primaryLight,
                                    borderColor: colors.primaryBorder,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.pillRefundText,
                                    { color: colors.primaryText },
                                  ]}
                                >
                                  Reembolso {FormatCurrency(Math.abs(p.finalBalance))}
                                </Text>
                              </View>
                            )}
                            {isOwed && (
                              <View
                                style={[
                                  styles.pillOwed,
                                  {
                                    backgroundColor: colors.warningLight,
                                    borderColor: colors.warningBorder,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.pillOwedText,
                                    { color: colors.warningText },
                                  ]}
                                >
                                  Paga {FormatCurrency(p.finalBalance)}
                                </Text>
                              </View>
                            )}
                            {!isRefund && !isOwed && (
                              <View style={[styles.pillEven, { backgroundColor: colors.surfaceHighlight }]}>
                                <Text style={[styles.pillEvenText, { color: colors.textSecondary }]}>✓ Al corriente</Text>
                              </View>
                            )}
                          </View>

                          {/* Col 5: Botón de Estado / Liquidación */}
                          <View style={{ flex: 1.2, alignItems: 'center' }}>
                            <TouchableOpacity
                              style={[
                                styles.settleToggleButton,
                                isSettled
                                  ? [
                                      styles.settleBtnActive,
                                      {
                                        backgroundColor: colors.successLight,
                                        borderColor: colors.successBorder,
                                      },
                                      isDark ? getNeonGlow(colors.neonGreen, 'low') : {},
                                    ]
                                  : [
                                      styles.settleBtnPending,
                                      {
                                        backgroundColor: colors.surfaceSubtle,
                                        borderColor: colors.borderLight,
                                      },
                                    ],
                              ]}
                              onPress={() => onToggleSettlement && onToggleSettlement(p.participantId)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.settleBtnText,
                                  isSettled
                                    ? { color: colors.successText }
                                    : { color: colors.textMuted },
                                ]}
                              >
                                {isSettled ? '✓ Liquidado' : '⏳ Pendiente'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* ================= PESTAÑA 2: CONSOLIDADO POR SUBFAMILIA ================= */}
            {activeTab === 'families' && (
              <View style={styles.listSection}>
                {filteredSubFamilies.length === 0 ? (
                  <View style={styles.emptySearch}>
                    <Text style={[styles.emptySearchText, { color: colors.textMuted }]}>
                      No hay subfamilias que coincidan con "{searchQuery}".
                    </Text>
                  </View>
                ) : (
                  <View style={styles.familyCardsList}>
                    {filteredSubFamilies.map((sf) => {
                      const isRefund = sf.finalBalance < 0;
                      const isOwed = sf.finalBalance > 0;
                      const isSettled = sf.isFullySettled;

                      return (
                        <GlassCard
                          key={sf.subFamilyName}
                          variant={isSettled ? 'lime' : isRefund ? 'cyan' : isOwed ? 'coral' : 'subtle'}
                          glow={isDark && isSettled}
                          borderRadius={14}
                          contentStyle={styles.familyCardInner}
                        >
                          {/* Encabezado de la Subfamilia */}
                          <View style={styles.familyCardHeader}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <SculptedIcon name="home" size={15} variant="plain" color={colors.textPrimary} />
                                <Text style={[styles.familyCardTitle, { color: colors.textPrimary }]}>{sf.subFamilyName}</Text>
                              </View>
                              <Text style={[styles.familyCardSub, { color: colors.textSecondary }]}>
                                {sf.attendingCount} de {sf.membersCount} asistentes • {sf.totalWeightedUnits} unidades de costo
                              </Text>
                            </View>

                            {/* Badge de Saldo Familiar */}
                            <View style={styles.familyBadgeArea}>
                              {isRefund && (
                                <View
                                  style={[
                                    styles.pillRefund,
                                    {
                                      backgroundColor: colors.primaryLight,
                                      borderColor: colors.primaryBorder,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.pillRefundText,
                                      { color: colors.primaryText },
                                    ]}
                                  >
                                    Reembolso {FormatCurrency(Math.abs(sf.finalBalance))}
                                  </Text>
                                </View>
                              )}
                              {isOwed && (
                                <View
                                  style={[
                                    styles.pillOwed,
                                    {
                                      backgroundColor: colors.warningLight,
                                      borderColor: colors.warningBorder,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.pillOwedText,
                                      { color: colors.warningText },
                                    ]}
                                  >
                                    Paga {FormatCurrency(sf.finalBalance)}
                                  </Text>
                                </View>
                              )}
                              {!isRefund && !isOwed && (
                                <View style={[styles.pillEven, { backgroundColor: colors.surfaceHighlight }]}>
                                  <Text style={[styles.pillEvenText, { color: colors.textSecondary }]}>✓ Liquidado ($0.00)</Text>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* Fila de Métricas Clave de la Familia */}
                          <View
                            style={[
                              styles.familyMetricsBar,
                              { backgroundColor: colors.surfaceSubtle },
                            ]}
                          >
                            <View style={styles.familyMetricItem}>
                              <Text style={[styles.familyMetricLabel, { color: colors.textMuted }]}>Cuota Total</Text>
                              <Text style={[styles.familyMetricVal, { color: colors.textPrimary }]}>
                                {FormatCurrency(sf.proportionalShare)}
                              </Text>
                            </View>

                            <View style={[styles.familyMetricDivider, { backgroundColor: colors.borderLight }]} />

                            <View style={styles.familyMetricItem}>
                              <Text style={[styles.familyMetricLabel, { color: colors.textMuted }]}>Aporte Bolsillo</Text>
                              <Text style={[styles.familyMetricVal, { color: colors.textPrimary }]}>
                                {FormatCurrency(sf.totalPaid)}
                              </Text>
                            </View>

                            <View style={[styles.familyMetricDivider, { backgroundColor: colors.borderLight }]} />

                            <View style={styles.familyMetricItem}>
                              <Text style={[styles.familyMetricLabel, { color: colors.textMuted }]}>Saldo Neto</Text>
                              <Text
                                style={[
                                  styles.familyMetricValBold,
                                  isRefund
                                    ? { color: colors.primaryText }
                                    : isOwed
                                    ? { color: colors.warningText }
                                    : { color: colors.success },
                                ]}
                              >
                                {FormatCurrency(sf.finalBalance)}
                              </Text>
                            </View>
                          </View>
                        </GlassCard>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer del Modal */}
          <View
            style={[
              styles.modalFooter,
              { borderTopColor: colors.borderLight, backgroundColor: colors.surface },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.actionSecondaryBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                },
              ]}
              onPress={handleShareText}
              activeOpacity={0.8}
            >
              <SculptedIcon name="whatsapp" size={16} variant="plain" color={colors.textPrimary} />
              <Text style={[styles.actionSecondaryBtnText, { color: colors.textPrimary }]}>
                {copied ? '¡Copiado!' : 'Compartir WhatsApp'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionPrimaryBtn,
                {
                  backgroundColor: colors.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  ...(isDark ? getNeonGlow(colors.neonGreen, 'medium') : {}),
                },
              ]}
              onPress={handlePrintOrExport}
              activeOpacity={0.8}
            >
              <SculptedIcon name="print" size={16} variant="plain" color={isDark ? '#0D1117' : '#FFFFFF'} />
              <Text style={[styles.actionPrimaryBtnText, { color: isDark ? '#0D1117' : '#FFFFFF' }]}>
                Imprimir / Exportar PDF
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
    height: '85%',
    maxHeight: '92%',
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
    maxWidth: 900,
    height: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalHeaderTitleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  receiptIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // BARRA SUPERIOR MINIMALISTA
  topStatusBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  statusBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadgeSettled: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeTextSettled: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusBadgePending: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeTextPending: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusBarBalanceText: {
    fontSize: 12,
  },
  statusBarRight: {
    alignItems: 'flex-end',
  },
  statusBarMetricsText: {
    fontSize: 12,
  },

  // PESTAÑAS Y BUSCADOR
  tabsAndSearchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    flex: 1,
    maxWidth: 320,
  },
  searchIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  searchClearBtn: {
    padding: 2,
  },
  searchClearText: {
    fontSize: 11,
  },

  // ÁREA DE CONTENIDO
  scrollArea: {
    flex: 1,
    minHeight: 400,
  },
  scrollContent: {
    padding: 22,
    flexGrow: 1,
    paddingBottom: 24,
  },
  listSection: {
    gap: 10,
  },
  columnsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.6,
  },
  rowsList: {
    gap: 8,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowAbsentBg: {
    opacity: 0.55,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
  },
  catBadgeAdulto: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  catBadgeTextAdulto: {
    fontSize: 9,
    fontWeight: '400',
  },
  catBadgeNino: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  catBadgeTextNino: {
    fontSize: 9,
    fontWeight: '400',
  },
  participantSub: {
    fontSize: 11,
    marginTop: 2,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '600',
  },
  amountSubHint: {
    fontSize: 9,
    marginTop: 1,
  },

  // PÍLDORAS DE SALDO NETO
  pillRefund: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillRefundText: {
    fontSize: 11,
    fontWeight: '500',
  },
  pillOwed: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillOwedText: {
    fontSize: 11,
    fontWeight: '500',
  },
  pillEven: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillEvenText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // BOTÓN DE ESTADO / LIQUIDADO
  settleToggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  settleBtnActive: {
    borderWidth: 1,
  },
  settleBtnPending: {
    borderWidth: 1,
  },
  settleBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // TARJETAS DE SUBFAMILIA
  familyCardsList: {
    gap: 12,
  },
  familyCardInner: {
    padding: 16,
    gap: 12,
  },
  familyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  familyCardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  familyCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  familyBadgeArea: {
    alignItems: 'flex-end',
  },
  familyMetricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  familyMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  familyMetricLabel: {
    fontSize: 10,
    fontWeight: '400',
    marginBottom: 2,
  },
  familyMetricVal: {
    fontSize: 12,
    fontWeight: '500',
  },
  familyMetricValBold: {
    fontSize: 13,
    fontWeight: '600',
  },
  familyMetricDivider: {
    width: 1,
    height: 20,
  },

  // FOOTER
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  actionSecondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionPrimaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  actionPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },

  emptySearch: {
    padding: 24,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 12,
    textAlign: 'center',
  },
  boldText: {
    fontWeight: '600',
  },
});
