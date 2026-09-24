import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { FormatCurrency, Radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from './GlassCard';
import { SculptedIcon } from './SculptedIcon';
import type { EventConfig, CategoryType } from '../types';
import type { EventTotalsResult } from '../utils/calculations';
import { generateId } from '../services/database';

export interface PosGuest {
  id: string;
  name: string;
  category: CategoryType;
  daysCount: number;
}

interface PosTicketViewProps {
  subFamilyName: string;
  event: EventConfig;
  totals: EventTotalsResult;
  onToggleAttendance: (participantId: string) => void;
  onToggleSettlement?: (participantId: string) => void;
  onSettleSubFamily?: (subFamilyName: string, isSettled: boolean) => void;
  onToggleParticipantRole?: (participantId: string) => void;
  onBackToList?: () => void;
  isMobile?: boolean;
}

export const PosTicketView: React.FC<PosTicketViewProps> = ({
  subFamilyName,
  event,
  totals,
  onToggleAttendance,
  onToggleSettlement,
  onSettleSubFamily,
  onToggleParticipantRole,
  onBackToList,
  isMobile = false,
}) => {
  const { colors, isDark, cardShadow, getNeonGlow } = useTheme();

  // Invitados temporales exclusivos para este ticket (no guardados en DB)
  const [ticketGuests, setTicketGuests] = useState<PosGuest[]>([]);
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestCategory, setGuestCategory] = useState<CategoryType>('adulto');
  const [guestDays, setGuestDays] = useState(event.availableDays.length || 3);

  // Miembros de la subfamilia
  const familyMembers = useMemo(() => {
    return event.participants.filter(
      (p) => (p.subFamily || 'Familia General').trim() === subFamilyName.trim()
    );
  }, [event.participants, subFamilyName]);

  // Datos de cálculo de la subfamilia
  const subFamilyCalc = useMemo(() => {
    return totals.subFamilies.find(
      (sf) => sf.subFamilyName.trim() === subFamilyName.trim()
    );
  }, [totals.subFamilies, subFamilyName]);

  const costPerUnit = totals.costPerUnit || 0;

  // Cálculo de invitados temporales
  const calculatedGuests = useMemo(() => {
    return ticketGuests.map((g) => {
      const weight = g.category === 'nino' ? 0.5 : 1.0;
      const cost = Math.round((g.daysCount * weight * costPerUnit + Number.EPSILON) * 100) / 100;
      return {
        ...g,
        weight,
        cost,
      };
    });
  }, [ticketGuests, costPerUnit]);

  const guestsTotalCost = useMemo(() => {
    return calculatedGuests.reduce((sum, g) => sum + g.cost, 0);
  }, [calculatedGuests]);

  // Desglose matemático claro
  const baseProportionalShare = subFamilyCalc?.proportionalShare || 0;
  const baseTotalPaid = subFamilyCalc?.totalPaid || 0;
  const grossTotalQuota = baseProportionalShare + guestsTotalCost;
  const finalBalance = Math.round((grossTotalQuota - baseTotalPaid + Number.EPSILON) * 100) / 100;

  const isRefund = finalBalance < 0;
  const isOwed = finalBalance > 0;
  const isZero = finalBalance === 0;

  // Estado de cuenta cerrada / liquidada para esta subfamilia
  const isSubFamilyPaid = useMemo(() => {
    if (subFamilyCalc) {
      return subFamilyCalc.isFullySettled;
    }
    return familyMembers.length > 0 && familyMembers.every((m) => m.isSettled);
  }, [subFamilyCalc, familyMembers]);

  // Manejador de confirmación para liquidar la cuenta
  const handleConfirmSettleAccount = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const ok = window.confirm(
        `💰 Confirmar Liquidación\n\n¿Confirmas que recibiste el monto total de ${FormatCurrency(Math.abs(finalBalance))} para la subfamilia "${subFamilyName}"?`
      );
      if (ok && onSettleSubFamily) {
        onSettleSubFamily(subFamilyName, true);
      }
      return;
    }

    Alert.alert(
      '💰 Confirmar Liquidación',
      `¿Confirmas que recibiste el monto total de ${FormatCurrency(Math.abs(finalBalance))} para la subfamilia "${subFamilyName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar y Liquidar',
          style: 'default',
          onPress: () => {
            if (onSettleSubFamily) {
              onSettleSubFamily(subFamilyName, true);
            }
          },
        },
      ]
    );
  };

  // Manejador para reabrir cuenta si se requiere ajustar
  const handleReopenAccount = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const ok = window.confirm(
        `↺ Reabrir Cuenta\n\n¿Deseas reactivar la cuenta de "${subFamilyName}" para registrar más pagos o revertir su estado a pendiente?`
      );
      if (ok && onSettleSubFamily) {
        onSettleSubFamily(subFamilyName, false);
      }
      return;
    }

    Alert.alert(
      '↺ Reabrir Cuenta',
      `¿Deseas reactivar la cuenta de "${subFamilyName}" para registrar más pagos o revertir su estado a pendiente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reabrir Cuenta',
          style: 'destructive',
          onPress: () => {
            if (onSettleSubFamily) {
              onSettleSubFamily(subFamilyName, false);
            }
          },
        },
      ]
    );
  };

  // Agregar invitado temporal
  const handleAddGuest = () => {
    if (!guestName.trim()) {
      Alert.alert('Nombre requerido', 'Ingresa una referencia o nombre para el invitado.');
      return;
    }
    if (guestDays <= 0) {
      Alert.alert('Días inválidos', 'El número de días debe ser mayor a 0.');
      return;
    }

    const newGuest: PosGuest = {
      id: generateId('pos_guest'),
      name: guestName.trim(),
      category: guestCategory,
      daysCount: guestDays,
    };

    setTicketGuests((prev) => [...prev, newGuest]);
    setGuestName('');
    setIsAddingGuest(false);
  };

  const handleRemoveGuest = (guestId: string) => {
    setTicketGuests((prev) => prev.filter((g) => g.id !== guestId));
  };

  // Compartir Ticket POS por WhatsApp
  const handleShareWhatsAppTicket = async () => {
    const attendingCount = familyMembers.filter((m) => m.isAttending !== false).length;

    let message = `🧾 *TICKET DE CUENTA POS - ${event.title.toUpperCase()}*\n`;
    message += `═════════════════════════\n`;
    message += `🏡 *SUBFAMILIA:* ${subFamilyName}\n`;
    message += `📅 *Año:* ${event.year} • *Costo base/día:* ${FormatCurrency(costPerUnit)}\n`;
    message += `👥 *Asistentes Fijos:* ${attendingCount} de ${familyMembers.length}\n`;
    message += `─────────────────────────\n`;

    message += `*INTEGRANTES REGISTRADOS:*\n`;
    familyMembers.forEach((m) => {
      const isAttending = m.isAttending !== false;
      const pCalc = totals.byParticipantId[m.id];
      if (isAttending && pCalc) {
        message += ` • ${m.name} (${m.category === 'nino' ? 'Niño 0.5' : 'Adulto 1.0'}, ${pCalc.activeDaysCount} d): ${FormatCurrency(pCalc.proportionalShare)}\n`;
      } else {
        message += ` • ${m.name} (NO ASISTIÓ): $0.00\n`;
      }
    });

    if (calculatedGuests.length > 0) {
      message += `─────────────────────────\n`;
      message += `*➕ INVITADOS TEMPORALES (${calculatedGuests.length}):*\n`;
      calculatedGuests.forEach((g) => {
        message += ` • ${g.name} (${g.category === 'nino' ? 'Niño 0.5' : 'Adulto 1.0'}, ${g.daysCount} d): ${FormatCurrency(g.cost)}\n`;
      });
      message += `Subtotal Invitados: ${FormatCurrency(guestsTotalCost)}\n`;
    }

    message += `═════════════════════════\n`;
    message += `*DESGLOSE MATEMÁTICO:*\n`;
    message += `(+) Cuota Familia: ${FormatCurrency(baseProportionalShare)}\n`;
    if (guestsTotalCost > 0) {
      message += `(+) Invitados Temp: ${FormatCurrency(guestsTotalCost)}\n`;
      message += `(=) Cuota Total Bruta: ${FormatCurrency(grossTotalQuota)}\n`;
    }
    message += `(-) Compras de Bolsillo: ${FormatCurrency(baseTotalPaid)}\n`;
    message += `═════════════════════════\n`;

    if (isRefund) {
      message += `🔄 *REEMBOLSO A DEVOLVER DE CAJA: ${FormatCurrency(Math.abs(finalBalance))}*\n`;
    } else if (isOwed) {
      message += `💵 *TOTAL NETO A PAGAR EN EFECTIVO: ${FormatCurrency(finalBalance)}*\n`;
    } else {
      message += `✓ *CUENTA SALDADA / EN TABLAS: $0.00*\n`;
    }
    message += `═════════════════════════\n`;
    message += `Emitido con ChapApp 📊`;

    try {
      await Share.share({
        message,
        title: `Ticket POS - ${subFamilyName}`,
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir el ticket.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra de Navegación Móvil */}
      {isMobile && onBackToList && (
        <TouchableOpacity style={styles.backButtonRow} onPress={onBackToList}>
          <SculptedIcon name="arrow-left" size={14} variant="plain" color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Volver a lista de familias</Text>
        </TouchableOpacity>
      )}

      {/* TARJETA RECIBO POS */}
      <GlassCard
        frosted={true}
        variant={isSubFamilyPaid ? 'lime' : isRefund ? 'cyan' : isOwed ? 'coral' : 'subtle'}
        glow={isDark}
        borderRadius={Radii.xl}
        contentStyle={styles.receiptCardInner}
      >
        {/* Encabezado POS */}
        <View style={styles.posHeader}>
          <View
            style={[
              styles.posBadge,
              {
                backgroundColor: isDark ? 'rgba(0, 240, 255, 0.12)' : 'rgba(2, 132, 199, 0.08)',
                borderColor: isDark ? colors.primaryBorder : 'rgba(2, 132, 199, 0.25)',
                borderWidth: 1,
                ...(isDark ? getNeonGlow(colors.primary, 'low') : {}),
              },
            ]}
          >
            <SculptedIcon name="receipt" size={13} variant="plain" color={colors.primary} />
            <Text style={[styles.posBadgeText, { color: colors.primary, fontWeight: '700' }]}>TICKET DE CUENTA POS</Text>
          </View>
          <Text style={[styles.posTitle, { color: colors.textPrimary }]}>{subFamilyName}</Text>
          <Text style={[styles.posSubtitle, { color: colors.textSecondary }]}>
            {event.title} • {event.year} • Cuota diaria: {FormatCurrency(costPerUnit)}
          </Text>
          <View style={[styles.dashedDivider, { borderColor: colors.border }]} />
        </View>

        {/* BANNER DE CUENTA LIQUIDADA */}
        {isSubFamilyPaid && (
          <View
            style={[
              styles.settledBanner,
              {
                backgroundColor: colors.successLight,
                borderColor: colors.successBorder,
                ...(isDark ? getNeonGlow(colors.neonGreen, 'medium') : {}),
              },
            ]}
          >
            <View style={styles.settledBannerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SculptedIcon name="check-circle" size={15} variant="plain" color={colors.successText} />
                <Text style={[styles.settledBannerBadge, { color: colors.successText }]}>CUENTA LIQUIDADA</Text>
              </View>
              <View style={[styles.settledStampPill, { backgroundColor: colors.success }]}>
                <Text style={styles.settledStampPillText}>PAGADO Y CERRADO</Text>
              </View>
            </View>
            <Text style={[styles.settledBannerText, { color: colors.successText }]}>
              Esta cuenta familiar se encuentra 100% saldada y registrada en la caja común.
            </Text>
          </View>
        )}

        {/* 1. SECCIÓN: MIEMBROS FIJOS CON TOGGLE DE ASISTENCIA */}
        <View style={styles.posSection}>
          <View style={styles.sectionTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <SculptedIcon name="family" size={16} variant="plain" color={colors.textPrimary} />
              <Text style={[styles.sectionHeaderTitle, { color: colors.textPrimary }]}>
                Integrantes Registrados ({familyMembers.length})
              </Text>
            </View>
            <Text style={[styles.sectionHelperText, { color: colors.textMuted }]}>Switch de Asistencia</Text>
          </View>

          <View style={styles.membersTable}>
            {familyMembers.map((member) => {
              const isAttending = member.isAttending !== false;
              const pCalc = totals.byParticipantId[member.id];
              const quota = isAttending && pCalc ? pCalc.proportionalShare : 0;

              return (
                <View
                  key={member.id}
                  style={[
                    styles.memberRow,
                    {
                      backgroundColor: isDark ? 'rgba(13, 17, 23, 0.55)' : 'rgba(255, 255, 255, 0.85)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.95)',
                      borderWidth: 1,
                    },
                    !isAttending && styles.memberRowAbsent,
                  ]}
                >
                  <View style={styles.memberLeftInfo}>
                    <View style={styles.memberNameRow}>
                      <Text
                        style={[
                          styles.memberNameText,
                          { color: colors.textPrimary },
                          !isAttending && styles.textLineThrough,
                        ]}
                      >
                        {member.name}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.memberCategoryBadge,
                          {
                            backgroundColor: member.category === 'nino' ? colors.purpleLight : colors.primaryLight,
                            borderColor: member.category === 'nino' ? colors.purpleBorder : colors.primaryBorder,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 7,
                            paddingVertical: 3,
                            borderRadius: Radii.sm,
                            borderWidth: 1,
                            ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
                          },
                        ]}
                        onPress={() => onToggleParticipantRole?.(member.id)}
                        activeOpacity={0.7}
                        accessibilityLabel={`Cambiar categoría de ${member.name}, actualmente ${member.category === 'nino' ? 'Niño (0.5)' : 'Adulto (1.0)'}`}
                        accessibilityHint="Presiona para cambiar tarifa entre Adulto y Niño"
                      >
                        <SculptedIcon
                          name={member.category === 'nino' ? 'child' : 'user'}
                          size={11}
                          variant="plain"
                          color={member.category === 'nino' ? (isDark ? colors.neonPurple : colors.purple) : colors.primary}
                        />
                        <Text
                          style={[
                            styles.memberCategoryBadgeText,
                            {
                              color: member.category === 'nino' ? (isDark ? colors.neonPurple : colors.purple) : colors.primary,
                              fontWeight: '600',
                            },
                          ]}
                        >
                          {member.category === 'nino' ? 'Niño (0.5)' : 'Adulto (1.0)'}
                        </Text>
                        <SculptedIcon
                          name="refresh"
                          size={9}
                          variant="plain"
                          color={member.category === 'nino' ? (isDark ? colors.neonPurple : colors.purple) : colors.primary}
                        />
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.memberDaysText, { color: colors.textSecondary }]}>
                      {isAttending
                        ? `${member.activeDays.length} días asistidos`
                        : 'No asiste al evento'}
                    </Text>
                  </View>

                  <View style={styles.memberRightControls}>
                    <Text
                      style={[
                        styles.memberQuotaText,
                        { color: colors.textPrimary },
                        !isAttending && { color: colors.textMuted },
                      ]}
                    >
                      {FormatCurrency(quota)}
                    </Text>

                    {/* Switch interactivo de asistencia */}
                    <Switch
                      value={isAttending}
                      onValueChange={() => onToggleAttendance(member.id)}
                      trackColor={{ false: isDark ? '#333333' : '#CBD5E1', true: colors.primary }}
                      thumbColor={colors.textInverse}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.dashedDivider, { borderColor: colors.border }]} />

        {/* 2. SECCIÓN: INVITADOS TEMPORALES DINÁMICOS */}
        <View style={styles.posSection}>
          <View style={styles.sectionTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <SculptedIcon name="plus" size={14} variant="plain" color={colors.textPrimary} />
              <Text style={[styles.sectionHeaderTitle, { color: colors.textPrimary }]}>
                Invitados Temporales ({calculatedGuests.length})
              </Text>
            </View>
            {!isAddingGuest && (
              <TouchableOpacity
                style={[
                  styles.addGuestSmallBtn,
                  {
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.primaryBorder,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  },
                ]}
                onPress={() => setIsAddingGuest(true)}
              >
                <SculptedIcon name="plus" size={12} variant="plain" color={colors.primaryText} />
                <Text style={[styles.addGuestSmallBtnText, { color: colors.primaryText }]}>Agregar Invitado</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Formulario Rápido de Agregar Invitado */}
          {isAddingGuest && (
            <View
              style={[
                styles.guestFormCard,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.primaryBorder,
                },
              ]}
            >
              <Text style={[styles.guestFormTitle, { color: colors.primaryText }]}>Nuevo Invitado Temporal</Text>
              <TextInput
                style={[
                  styles.guestInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Nombre o referencia (ej. Amigo Juan)..."
                value={guestName}
                onChangeText={setGuestName}
                placeholderTextColor={colors.textMuted}
                autoFocus
              />

              <View style={styles.guestCategorySelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.guestCatOption,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    guestCategory === 'adulto' && {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primaryBorder,
                    },
                  ]}
                  onPress={() => setGuestCategory('adulto')}
                >
                  <Text
                    style={[
                      styles.guestCatOptionText,
                      { color: colors.textSecondary },
                      guestCategory === 'adulto' && {
                        color: colors.primaryText,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    Adulto (1.0)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.guestCatOption,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    guestCategory === 'nino' && {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primaryBorder,
                    },
                  ]}
                  onPress={() => setGuestCategory('nino')}
                >
                  <Text
                    style={[
                      styles.guestCatOptionText,
                      { color: colors.textSecondary },
                      guestCategory === 'nino' && {
                        color: colors.primaryText,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    Niño (0.5)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Contador de días */}
              <View
                style={[
                  styles.guestDaysCounterRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.guestDaysLabel, { color: colors.textSecondary }]}>Días que asiste:</Text>
                <View style={styles.counterBox}>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.surfaceSubtle }]}
                    onPress={() => setGuestDays((prev) => Math.max(1, prev - 1))}
                  >
                    <Text style={[styles.counterBtnText, { color: colors.textPrimary }]}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.counterValText, { color: colors.textPrimary }]}>{guestDays} d</Text>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.surfaceSubtle }]}
                    onPress={() =>
                      setGuestDays((prev) =>
                        Math.min(event.availableDays.length || 7, prev + 1)
                      )
                    }
                  >
                    <Text style={[styles.counterBtnText, { color: colors.textPrimary }]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.counterEstimateText, { color: colors.primary }]}>
                  = {FormatCurrency(costPerUnit * (guestCategory === 'nino' ? 0.5 : 1.0) * guestDays)}
                </Text>
              </View>

              <View style={styles.guestFormButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.guestCancelBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    setIsAddingGuest(false);
                    setGuestName('');
                  }}
                >
                  <Text style={[styles.guestCancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.guestSubmitBtn,
                    {
                      backgroundColor: colors.primary,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      ...(isDark ? getNeonGlow(colors.primary, 'medium') : {}),
                    },
                  ]}
                  onPress={handleAddGuest}
                >
                  <SculptedIcon name="plus" size={13} variant="plain" color={isDark ? '#0D1117' : '#FFFFFF'} />
                  <Text style={[styles.guestSubmitBtnText, { color: isDark ? '#0D1117' : '#FFFFFF' }]}>Sumar al Ticket</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Lista de Invitados Insertados */}
          {calculatedGuests.length === 0 && !isAddingGuest ? (
            <View style={styles.emptyGuestsBox}>
              <Text style={[styles.emptyGuestsText, { color: colors.textMuted }]}>
                Sin invitados adicionales. Toca "+ Agregar Invitado" para sumarlos al cálculo.
              </Text>
            </View>
          ) : (
            <View style={styles.guestsListTable}>
              {calculatedGuests.map((guest) => (
                <View
                  key={guest.id}
                  style={[
                    styles.guestRow,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.guestLeftInfo}>
                    <Text style={[styles.guestNameText, { color: colors.textPrimary }]}>{guest.name}</Text>
                    <Text style={[styles.guestSubInfo, { color: colors.primaryText }]}>
                      {guest.category === 'nino' ? 'Niño (0.5)' : 'Adulto (1.0)'} • {guest.daysCount} días
                    </Text>
                  </View>

                  <View style={styles.guestRightControls}>
                    <Text style={[styles.guestCostText, { color: colors.textPrimary }]}>{FormatCurrency(guest.cost)}</Text>
                    <TouchableOpacity
                      style={[styles.guestDeleteBtn, { backgroundColor: colors.dangerLight }]}
                      onPress={() => handleRemoveGuest(guest.id)}
                    >
                      <SculptedIcon name="close" size={12} variant="plain" color={colors.dangerText} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.dashedDivider, { borderColor: colors.border }]} />

        {/* 3. DESGLOSE MATEMÁTICO */}
        <View
          style={[
            styles.mathBreakdownCard,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <SculptedIcon name="chart" size={14} variant="plain" color={colors.textMuted} />
            <Text style={[styles.mathCardTitle, { color: colors.textMuted, marginBottom: 0 }]}>DESGLOSE MATEMÁTICO</Text>
          </View>

          <View style={styles.mathLine}>
            <Text style={[styles.mathLabel, { color: colors.textSecondary }]}>Cuota Integrantes Fijos</Text>
            <Text style={[styles.mathVal, { color: colors.textPrimary }]}>{FormatCurrency(baseProportionalShare)}</Text>
          </View>

          {guestsTotalCost > 0 && (
            <View style={styles.mathLine}>
              <Text style={[styles.mathLabel, { color: colors.textSecondary }]}>+ Invitados Temporales ({calculatedGuests.length})</Text>
              <Text style={[styles.mathVal, { color: colors.textPrimary }]}>+{FormatCurrency(guestsTotalCost)}</Text>
            </View>
          )}

          <View style={[styles.mathLine, styles.mathLineHighlight, { borderTopColor: colors.border }]}>
            <Text style={[styles.mathLabelBold, { color: colors.textPrimary }]}>Cuota Total Bruta</Text>
            <Text style={[styles.mathValBold, { color: colors.textPrimary }]}>{FormatCurrency(grossTotalQuota)}</Text>
          </View>

          <View style={styles.mathLine}>
            <Text style={[styles.mathLabel, { color: colors.successText }]}>
              - Aportes en Compras (Bolsillo)
            </Text>
            <Text style={[styles.mathVal, { color: colors.successText, fontWeight: '700' }]}>
              -{FormatCurrency(baseTotalPaid)}
            </Text>
          </View>

          <View style={[styles.doubleLineSeparator, { borderColor: colors.border }]} />

          {/* TOTAL HERO ENORME */}
          <View
            style={[
              styles.heroBalanceBox,
              isSubFamilyPaid
                ? {
                    backgroundColor: colors.successLight,
                    borderColor: colors.successBorder,
                    ...(isDark ? getNeonGlow(colors.neonGreen, 'medium') : {}),
                  }
                : isRefund
                ? {
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.primaryBorder,
                    ...(isDark ? getNeonGlow(colors.neonCyan, 'medium') : {}),
                  }
                : isOwed
                ? {
                    backgroundColor: colors.coralLight,
                    borderColor: colors.coralBorder,
                    ...(isDark ? getNeonGlow(colors.neonCoral, 'medium') : {}),
                  }
                : {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
            ]}
          >
            <Text
              style={[
                styles.heroBalanceLabel,
                { color: isSubFamilyPaid ? colors.successText : colors.textSecondary },
              ]}
            >
              {isSubFamilyPaid
                ? 'CUENTA SALDADA Y REGISTRADA'
                : isRefund
                ? 'REEMBOLSO A DEVOLVER DE CAJA'
                : isOwed
                ? 'TOTAL NETO A PAGAR EN EFECTIVO'
                : 'EN TABLAS / AL CORRIENTE'}
            </Text>
            <Text
              style={[
                styles.heroBalanceAmount,
                {
                  color: isSubFamilyPaid
                    ? colors.successText
                    : isRefund
                    ? colors.primaryText
                    : isOwed
                    ? colors.coralText
                    : colors.textPrimary,
                },
              ]}
            >
              {FormatCurrency(Math.abs(finalBalance))}
            </Text>
            <Text style={[styles.heroBalanceExplain, { color: colors.textSecondary }]}>
              {isSubFamilyPaid
                ? `El saldo de ${FormatCurrency(Math.abs(finalBalance))} ya fue recibido/entregado y liquidado en caja.`
                : isRefund
                ? `Sus compras (${FormatCurrency(baseTotalPaid)}) superaron su cuota de ${FormatCurrency(grossTotalQuota)}. La caja común le entrega la diferencia.`
                : isOwed
                ? `Monto exacto a entregar en efectivo al responsable de la caja.`
                : `Compras de bolsillo cubren exactamente la cuota calculada.`}
            </Text>
          </View>
        </View>

        {/* 4. BOTONES DE ACCIÓN: WHATSAPP (SECUNDARIO) + LIQUIDAR CUENTA (PRIMARIO DESTACADO) */}
        <View style={styles.actionButtonsContainer}>
          {/* Botón Secundario: Compartir por WhatsApp */}
          <TouchableOpacity
            style={[
              styles.shareWhatsAppSecondaryBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              },
            ]}
            onPress={handleShareWhatsAppTicket}
            activeOpacity={0.8}
          >
            <SculptedIcon name="whatsapp" size={16} variant="plain" color={colors.textPrimary} />
            <Text style={[styles.shareWhatsAppSecondaryBtnText, { color: colors.textPrimary }]}>Compartir WhatsApp</Text>
          </TouchableOpacity>

          {/* Botón Primario: Liquidar Cuenta */}
          {!isSubFamilyPaid ? (
            <TouchableOpacity
              style={[
                styles.settleAccountPrimaryBtn,
                {
                  backgroundColor: colors.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  ...(isDark ? getNeonGlow(colors.neonGreen, 'high') : {}),
                },
              ]}
              onPress={handleConfirmSettleAccount}
              activeOpacity={0.8}
            >
              <SculptedIcon name="check" size={16} variant="plain" color={isDark ? '#0D1117' : '#FFFFFF'} />
              <Text style={[styles.settleAccountPrimaryBtnText, { color: isDark ? '#0D1117' : '#FFFFFF' }]}>Liquidar Cuenta</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.settledAccountDisabledBtn,
                {
                  backgroundColor: colors.coralLight,
                  borderColor: colors.coralBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  ...(isDark ? getNeonGlow(colors.neonCoral, 'low') : {}),
                },
              ]}
              onPress={handleReopenAccount}
              activeOpacity={0.7}
            >
              <SculptedIcon name="refresh" size={15} variant="plain" color={colors.coralText} />
              <Text style={[styles.settledAccountDisabledBtnText, { color: colors.coralText }]}>Reabrir Cuenta</Text>
            </TouchableOpacity>
          )}
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  receiptCardInner: {
    padding: 22,
    gap: 18,
  },
  posHeader: {
    alignItems: 'center',
    gap: 6,
  },
  posBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  posBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  posTitle: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  posSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  dashedDivider: {
    width: '100%',
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  posSection: {
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHelperText: {
    fontSize: 11,
  },
  addGuestSmallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  addGuestSmallBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
  membersTable: {
    gap: 8,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radii.md,
    padding: 12,
    borderWidth: 1,
  },
  memberRowAbsent: {
    opacity: 0.5,
  },
  memberLeftInfo: {
    flex: 1,
    gap: 2,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  memberNameText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textLineThrough: {
    textDecorationLine: 'line-through',
  },
  memberCategoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  memberCategoryBadgeText: {
    fontSize: 10,
    fontWeight: '400',
  },
  memberDaysText: {
    fontSize: 11,
  },
  memberRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberQuotaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  guestFormCard: {
    borderRadius: Radii.lg,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  guestFormTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  guestInput: {
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  guestCategorySelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  guestCatOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  guestCatOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  guestDaysCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  guestDaysLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  counterValText: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
  },
  counterEstimateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  guestFormButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  guestCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  guestCancelBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  guestSubmitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.sm,
  },
  guestSubmitBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyGuestsBox: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGuestsText: {
    fontSize: 12,
    textAlign: 'center',
  },
  guestsListTable: {
    gap: 8,
  },
  guestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radii.md,
    padding: 10,
    borderWidth: 1,
  },
  guestLeftInfo: {
    flex: 1,
  },
  guestNameText: {
    fontSize: 13,
    fontWeight: '500',
  },
  guestSubInfo: {
    fontSize: 11,
    marginTop: 1,
  },
  guestRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guestCostText: {
    fontSize: 13,
    fontWeight: '600',
  },
  guestDeleteBtn: {
    padding: 5,
    borderRadius: 6,
  },
  guestDeleteBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
  mathBreakdownCard: {
    borderRadius: Radii.lg,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  mathCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  mathLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mathLineHighlight: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
  mathLabel: {
    fontSize: 13,
  },
  mathVal: {
    fontSize: 13,
  },
  mathLabelBold: {
    fontSize: 13,
    fontWeight: '500',
  },
  mathValBold: {
    fontSize: 14,
    fontWeight: '600',
  },
  doubleLineSeparator: {
    height: 3,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 4,
  },
  heroBalanceBox: {
    borderRadius: Radii.lg,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
  },
  heroBalanceLabel: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.6,
  },
  heroBalanceAmount: {
    fontSize: 28,
    fontWeight: '600',
  },
  heroBalanceExplain: {
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 320,
  },
  settledBanner: {
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    padding: 14,
    gap: 4,
  },
  settledBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settledBannerBadge: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  settledStampPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  settledStampPillText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  settledBannerText: {
    fontSize: 12,
    fontWeight: '400',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  shareWhatsAppSecondaryBtn: {
    flex: 1,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareWhatsAppSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  settleAccountPrimaryBtn: {
    flex: 1.3,
    borderRadius: Radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleAccountPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  settledAccountDisabledBtn: {
    flex: 1.3,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settledAccountDisabledBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
