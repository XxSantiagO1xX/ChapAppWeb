import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
  Share,
  Platform,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { FormatCurrency, Radii } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import type { EventConfig, Participant, Expense, CategoryType, DirectoryParticipant } from '../../types';
import {
  getEventById,
  updateEvent,
  archiveEvent,
  generateId,
  toggleParticipantSettlement,
  toggleParticipantAttendance,
  toggleSubFamilyAttendance,
  settleSubFamily,
  importDirectoryParticipantsToEvent,
  deleteParticipant,
  deleteSubFamily,
  addParticipant,
  updateParticipantDays,
  addExpense,
  batchAddExpenses,
  updateExpense,
  deleteExpense,
  initDB,
  subscribeToEventRealtime,
} from '../../services/database';
import { calculateEventTotals } from '../../utils/calculations';
import { EventCutModal } from '../../components/EventCutModal';
import { FinancialCharts } from '../../components/FinancialCharts';
import { CsvImportModal } from '../../components/CsvImportModal';
import { GlobalDirectoryModal } from '../../components/GlobalDirectoryModal';
import { PosTicketView } from '../../components/PosTicketView';
import { QuickExpenseModal } from '../../components/QuickExpenseModal';
import { GlassCard } from '../../components/GlassCard';
import { SculptedIcon } from '../../components/SculptedIcon';
import { generateEventReportPlainText } from '../../utils/reportGenerator';

export default function EventDetailDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { colors, isDark, toggleTheme, getNeonGlow } = useTheme();

  const [event, setEvent] = useState<EventConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'participants' | 'expenses'>('summary');

  // Menú Lateral Colapsable Estático (Estilo iPadOS / Web)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  // Estado de Master-Detail de Subfamilias y Ticket
  const [selectedSubFamily, setSelectedSubFamily] = useState<string>('');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [subFamilySearchQuery, setSubFamilySearchQuery] = useState('');

  // Estado de secciones colapsables de Subfamilias en Pestaña 2
  const [collapsedFamilies, setCollapsedFamilies] = useState<Record<string, boolean>>({});

  // Modales
  const [isCutModalOpen, setIsCutModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isDirectoryImportOpen, setIsDirectoryImportOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);

  // Modal para agregar participante manual
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [partName, setPartName] = useState('');
  const [partSubFamily, setPartSubFamily] = useState('Familia Santiago Bustamante');
  const [partCategory, setPartCategory] = useState<CategoryType>('adulto');
  const [partWeight, setPartWeight] = useState('1.0');

  // Modal para agregar gasto individual (completo)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Comida');
  const [expPaidBy, setExpPaidBy] = useState('');

  // Buscador de participantes en Pestaña 2
  const [participantFilterQuery, setParticipantFilterQuery] = useState('');

  const loadEvent = useCallback(async (showLoadingSpinner = true) => {
    if (!id) return;
    if (showLoadingSpinner) setLoading(true);
    try {
      await initDB();
      const data = await getEventById(id);
      setEvent(data);
      if (data && data.participants.length > 0) {
        setSelectedSubFamily((prev) => {
          if (prev && data.participants.some((p) => (p.subFamily || 'Familia General') === prev)) {
            return prev;
          }
          return data.participants[0].subFamily || 'Familia General';
        });
      }
    } catch (error) {
      console.error('Error cargando el evento:', error);
    } finally {
      if (showLoadingSpinner) setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  // Carga inicial y suscripción Realtime en Supabase
  useEffect(() => {
    loadEvent(true);
    if (!id) return;

    const unsubs: (() => void)[] = [];
    unsubs.push(
      subscribeToEventRealtime(id, () => {
        loadEvent(false);
      })
    );

    if (event?.id && event.id !== id) {
      unsubs.push(
        subscribeToEventRealtime(event.id, () => {
          loadEvent(false);
        })
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [id, event?.id, loadEvent]);

  // Sincronización automática al enfocar la pantalla en iPadOS / iOS / Web
  useFocusEffect(
    useCallback(() => {
      loadEvent(false);
    }, [loadEvent])
  );

  // Pull-to-Refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvent(false);
  }, [loadEvent]);

  // Totales calculados en tiempo real
  const totals = useMemo(() => {
    if (!event) return null;
    return calculateEventTotals(event);
  }, [event]);

  // Subfamilia actualmente seleccionada para el Ticket POS
  const activeSubFamilyName = useMemo(() => {
    if (!totals?.subFamilies || totals.subFamilies.length === 0) return 'Familia General';
    if (selectedSubFamily && totals.subFamilies.some((sf) => sf.subFamilyName === selectedSubFamily)) {
      return selectedSubFamily;
    }
    return totals.subFamilies[0].subFamilyName;
  }, [totals?.subFamilies, selectedSubFamily]);

  // Subfamilias filtradas para la lista maestra
  const filteredSubFamilies = useMemo(() => {
    if (!totals?.subFamilies) return [];
    if (!subFamilySearchQuery.trim()) return totals.subFamilies;
    const q = subFamilySearchQuery.trim().toLowerCase();
    return totals.subFamilies.filter((sf) => sf.subFamilyName.toLowerCase().includes(q));
  }, [totals?.subFamilies, subFamilySearchQuery]);

  // Porcentaje recaudado y conteo de pendientes
  const collectedPercent = useMemo(() => {
    if (!totals || totals.totalExpenses === 0) return 0;
    return Math.min(100, Math.round((totals.totalCollected / totals.totalExpenses) * 100));
  }, [totals]);

  const pendingFamiliesCount = useMemo(() => {
    if (!totals?.subFamilies) return 0;
    return totals.subFamilies.filter((sf) => sf.finalBalance > 0 && !sf.isFullySettled).length;
  }, [totals?.subFamilies]);

  const existingSubFamilies = useMemo(() => {
    if (!event) return ['Familia Santiago Bustamante', 'Familia Santiago Velázquez'];
    const set = new Set(event.participants.map((p) => p.subFamily || 'Familia General'));
    return Array.from(set);
  }, [event]);

  // Participantes agrupados por subfamilia (Pestaña 2)
  const participantsByFamily = useMemo(() => {
    if (!event) return [];
    const q = participantFilterQuery.trim().toLowerCase();
    const map = new Map<string, Participant[]>();

    for (const p of event.participants) {
      if (q) {
        const nameMatch = p.name.toLowerCase().includes(q);
        const sfMatch = (p.subFamily || '').toLowerCase().includes(q);
        if (!nameMatch && !sfMatch) continue;
      }
      const sf = p.subFamily || 'Familia General';
      const list = map.get(sf) || [];
      list.push(p);
      map.set(sf, list);
    }

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [event, participantFilterQuery]);

  // Guardar estado del evento
  const saveEventState = async (updated: EventConfig) => {
    setEvent(updated);
    await updateEvent(updated);
  };

  // Alternar colapsado de subfamilia
  const toggleCollapseFamily = (familyName: string) => {
    setCollapsedFamilies((prev) => ({
      ...prev,
      [familyName]: !prev[familyName],
    }));
  };

  // Alternar archivado
  const handleToggleArchive = async () => {
    if (!event) return;
    const targetState = !event.isArchived;
    const updated = await archiveEvent(event.id, targetState);
    if (updated) {
      setEvent(updated);
    }
  };

  // Alternar asistencia individual
  const handleToggleAttendance = async (participantId: string) => {
    if (!event) return;
    const previousEvent = event;
    const updatedParticipants = event.participants.map((p) => {
      if (p.id === participantId) {
        return { ...p, isAttending: !p.isAttending };
      }
      return p;
    });
    setEvent({ ...event, participants: updatedParticipants });

    try {
      const updated = await toggleParticipantAttendance(event.id, participantId);
      if (updated) {
        setEvent(updated);
      }
    } catch (err: any) {
      console.error('[ToggleAttendance] Error:', err);
      setEvent(previousEvent);
      Alert.alert('Error', 'No se pudo actualizar la asistencia en el servidor.');
    }
  };

  // Alternar asistencia de toda una subfamilia
  const handleToggleFamilyAttendance = async (familyName: string, targetAttending: boolean) => {
    if (!event) return;
    const previousEvent = event;
    const targetSf = familyName.trim().toLowerCase();
    const updatedParticipants = event.participants.map((p) => {
      const pSf = (p.subFamily || 'Familia General').trim().toLowerCase();
      if (pSf === targetSf) {
        return { ...p, isAttending: targetAttending };
      }
      return p;
    });
    setEvent({ ...event, participants: updatedParticipants });

    try {
      const updated = await toggleSubFamilyAttendance(event.id, familyName, targetAttending);
      if (updated) {
        setEvent(updated);
      }
    } catch (err: any) {
      console.error('[ToggleFamilyAttendance] Error:', err);
      setEvent(previousEvent);
      Alert.alert('Error', 'No se pudo actualizar la asistencia de la subfamilia en el servidor.');
    }
  };

  // Alternar liquidación de participante
  const handleToggleSettlement = async (participantId: string) => {
    if (!event) return;
    const previousEvent = event;
    const updatedParticipants = event.participants.map((p) => {
      if (p.id === participantId) {
        return { ...p, isSettled: !p.isSettled };
      }
      return p;
    });
    setEvent({ ...event, participants: updatedParticipants });

    try {
      const updated = await toggleParticipantSettlement(event.id, participantId);
      if (updated) {
        setEvent(updated);
      }
    } catch (err: any) {
      console.error('[ToggleSettlement] Error:', err);
      setEvent(previousEvent);
      Alert.alert('Error', 'No se pudo actualizar la liquidación en el servidor.');
    }
  };

  // Liquidar o reabrir toda una Subfamilia (1 Toque Ágil con Actualización Optimista)
  const handleSettleSubFamily = async (subFamilyName: string, isSettled: boolean = true) => {
    if (!event) return;
    const previousEvent = event;
    const targetSf = subFamilyName.trim().toLowerCase();
    const updatedParticipants = event.participants.map((p) => {
      const pSf = (p.subFamily || 'Familia General').trim().toLowerCase();
      if (pSf === targetSf) {
        return { ...p, isSettled };
      }
      return p;
    });
    setEvent({ ...event, participants: updatedParticipants });

    try {
      const updated = await settleSubFamily(event.id, subFamilyName, isSettled);
      if (updated) {
        setEvent(updated);
      }
    } catch (err: any) {
      console.error('[SettleSubFamily] Error:', err);
      setEvent(previousEvent);
      Alert.alert('Error al liquidar', 'No se pudo registrar la liquidación en Supabase.');
    }
  };

  // Compartir corte general por WhatsApp
  const handleQuickShare = async () => {
    if (!event) return;
    try {
      const report = generateEventReportPlainText(event, totals || undefined);
      await Share.share({
        message: report,
        title: `Corte ${event.title}`,
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir el corte.');
    }
  };

  // Importar desde Directorio Global
  const handleImportFromDirectory = async (selectedContacts: DirectoryParticipant[]) => {
    if (!event) return;
    const directoryIds = selectedContacts.map((c) => c.id);
    const updated = await importDirectoryParticipantsToEvent(event.id, directoryIds);
    if (updated) {
      setEvent(updated);
      Alert.alert('Éxito', `Se importaron ${selectedContacts.length} participantes del directorio.`);
    }
  };

  // Importar gastos por CSV
  const handleImportCsvExpenses = async (newExpenses: Expense[]) => {
    if (!event) return;
    try {
      setLoading(true);
      const insertedExpenses = await batchAddExpenses(event.id, newExpenses);
      if (insertedExpenses.length > 0) {
        setEvent((prev) => {
          if (!prev) return null;
          const insertedIds = new Set(insertedExpenses.map((e) => e.id));
          return {
            ...prev,
            expenses: [...insertedExpenses, ...prev.expenses.filter((e) => !insertedIds.has(e.id))],
          };
        });
        Alert.alert('¡Éxito!', `Se importaron ${insertedExpenses.length} gastos correctamente.`);
      }
    } catch (err: any) {
      console.error('[ImportCsvExpenses] Error al importar gastos:', err);
      Alert.alert('Error al importar gastos', err?.message || 'No se pudieron guardar los gastos importados en Supabase.');
    } finally {
      setLoading(false);
    }
  };

  // Registrar Gasto Rápido desde el FAB
  const handleSaveQuickExpense = async (expData: {
    title: string;
    amount: number;
    category: string;
    paidBy: string;
  }) => {
    if (!event) return;
    try {
      setLoading(true);
      const savedExpense = await addExpense(event.id, {
        title: expData.title,
        amount: expData.amount,
        category: expData.category || 'Comida',
        paidBy: expData.paidBy,
        splitBetween: [],
      });

      setEvent((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          expenses: [savedExpense, ...prev.expenses.filter((e) => e.id !== savedExpense.id)],
        };
      });

      Alert.alert('¡Gasto Guardado!', `Se registró "${savedExpense.title}" por ${FormatCurrency(savedExpense.amount)}.`);
    } catch (err: any) {
      console.error('[QuickExpense] Error al guardar gasto:', err);
      Alert.alert('Error al guardar gasto', err?.message || 'Ocurrió un error al guardar el gasto en Supabase.');
    } finally {
      setLoading(false);
    }
  };

  // Participantes: Alternar día activo
  const handleToggleDay = async (participantId: string, day: string) => {
    if (!event) return;
    const participant = event.participants.find((p) => p.id === participantId);
    if (!participant) return;

    const hasDay = participant.activeDays.includes(day);
    const newDays = hasDay
      ? participant.activeDays.filter((d) => d !== day)
      : [...participant.activeDays, day];

    const updatedParticipants = event.participants.map((p) =>
      p.id === participantId ? { ...p, activeDays: newDays } : p
    );

    setEvent({ ...event, participants: updatedParticipants });
    try {
      const updated = await updateParticipantDays(event.id, participantId, newDays);
      if (updated) {
        setEvent(updated);
      }
    } catch (err: any) {
      console.error('[ToggleDay] Error al actualizar días:', err);
    }
  };

  // Participantes: Seleccionar o deseleccionar todos los días
  const handleToggleAllDays = async (participantId: string, selectAll: boolean) => {
    if (!event) return;
    const newDays = selectAll ? [...event.availableDays] : [];
    const updatedParticipants = event.participants.map((p) => {
      if (p.id === participantId) {
        return {
          ...p,
          activeDays: newDays,
        };
      }
      return p;
    });

    setEvent({ ...event, participants: updatedParticipants });
    try {
      const updated = await updateParticipantDays(event.id, participantId, newDays);
      if (updated) {
        setEvent(updated);
      }
    } catch (err: any) {
      console.error('[ToggleAllDays] Error al actualizar días:', err);
    }
  };

  // Participantes: Agregar nuevo manual
  const handleAddParticipant = async () => {
    if (!event) return;
    if (!partName.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el nombre del participante.');
      return;
    }

    const weightNum = parseFloat(partWeight) || (partCategory === 'nino' ? 0.5 : 1.0);
    try {
      setLoading(true);
      const newParticipant = await addParticipant(event.id, {
        name: partName.trim(),
        category: partCategory,
        weight: weightNum,
        subFamily: partSubFamily.trim() || 'Familia General',
        activeDays: [...event.availableDays],
        isAttending: true,
        isSettled: false,
      });

      setEvent((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          participants: [...prev.participants, newParticipant],
        };
      });

      setIsParticipantModalOpen(false);
      setPartName('');
      setPartCategory('adulto');
      setPartWeight('1.0');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo agregar el participante.');
    } finally {
      setLoading(false);
    }
  };

  // Subfamilias: Eliminar con borrado en cascada
  const handleDeleteSubFamily = (subFamilyName: string) => {
    if (!event) return;
    const membersInFamily = event.participants.filter(
      (p) => (p.subFamily || 'Familia General').trim() === subFamilyName.trim()
    );
    const count = membersInFamily.length;

    Alert.alert(
      '⚠️ Eliminar Subfamilia',
      `¿Deseas eliminar permanentemente a "${subFamilyName}"?\n\nEsta acción borrará en cascada a sus ${count} integrante${count === 1 ? '' : 's'} y recalculará las cuotas y el balance general de todo el evento.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar en Cascada',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const updated = await deleteSubFamily(event.id, subFamilyName);
              if (updated) {
                setEvent(updated);
                if (selectedSubFamily === subFamilyName && updated.participants.length > 0) {
                  setSelectedSubFamily(updated.participants[0].subFamily || 'Familia General');
                }
              }
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar la subfamilia.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Participantes: Eliminar individual
  const handleDeleteParticipant = (partId: string, name: string) => {
    if (!event) return;
    Alert.alert(
      '⚠️ Eliminar Participante',
      `¿Deseas eliminar a "${name}" de este evento?\n\nSe removerá de las cuotas y los cálculos contables en la base de datos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const updated = await deleteParticipant(event.id, partId);
              if (updated) {
                setEvent(updated);
              }
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar el participante.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Gastos: Agregar nuevo manual
  const handleAddExpense = async () => {
    if (!event) return;
    const amountNum = parseFloat(expAmount);
    if (!expTitle.trim() || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Datos inválidos', 'Ingresa un concepto y un monto válido.');
      return;
    }

    try {
      setLoading(true);
      const savedExpense = await addExpense(event.id, {
        title: expTitle.trim(),
        amount: amountNum,
        category: expCategory || 'Comida',
        paidBy: expPaidBy || event.participants[0]?.id || '',
        splitBetween: [],
      });

      setEvent((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          expenses: [savedExpense, ...prev.expenses.filter((e) => e.id !== savedExpense.id)],
        };
      });

      setIsExpenseModalOpen(false);
      setExpTitle('');
      setExpAmount('');
      setExpCategory('Comida');
      Alert.alert('¡Gasto Guardado!', `Se registró "${savedExpense.title}" exitosamente.`);
    } catch (err: any) {
      console.error('[AddExpense] Error al guardar gasto:', err);
      Alert.alert('Error al guardar gasto', err?.message || 'No se pudo registrar el gasto en Supabase.');
    } finally {
      setLoading(false);
    }
  };

  // Gastos: Eliminar
  const handleDeleteExpense = (expId: string, title: string) => {
    if (!event) return;
    Alert.alert(
      '⚠️ Eliminar Gasto',
      `¿Deseas eliminar el gasto "${title}"?\n\nSe eliminará de la base de datos y se recalculará el balance del evento.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const updated = await deleteExpense(event.id, expId);
              if (updated) {
                setEvent(updated);
              } else {
                setEvent((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    expenses: prev.expenses.filter((e) => e.id !== expId),
                  };
                });
              }
              Alert.alert('Gasto eliminado', `Se eliminó "${title}" correctamente.`);
            } catch (err: any) {
              console.error('[DeleteExpense] Error al eliminar gasto:', err);
              Alert.alert('Error al eliminar gasto', err?.message || 'No se pudo eliminar el gasto.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando dashboard...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Evento no encontrado</Text>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/')}
        >
          <Text style={[styles.primaryButtonText, { color: isDark ? '#0B0F19' : '#FFFFFF' }]}>Volver al Inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Barra de Encabezado Superior Sci-Fi Glass */}
      <View style={[styles.topHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surfaceSubtle, flexDirection: 'row', alignItems: 'center', gap: 6 }]}
            onPress={() => router.push('/')}
          >
            <SculptedIcon name="arrow-left" size={14} variant="plain" color={colors.textPrimary} />
            <Text style={[styles.backButtonText, { color: colors.textPrimary }]}>Inicio</Text>
          </TouchableOpacity>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>{event.title}</Text>
              <View
                style={[
                  styles.badgeStatus,
                  event.isArchived
                    ? { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }
                    : { backgroundColor: colors.successLight, borderColor: colors.successBorder },
                ]}
              >
                <Text
                  style={[
                    styles.badgeStatusText,
                    event.isArchived ? { color: colors.textMuted } : { color: colors.successText },
                  ]}
                >
                  {event.isArchived ? 'Archivado' : 'Activo'}
                </Text>
              </View>
            </View>
            <Text style={[styles.eventSubtitle, { color: colors.textSecondary }]}>
              Año {event.year} • {totals?.totalAttendingCount || 0} Asistentes de {event.participants.length} Registrados • {totals?.subFamilies.length || 0} Subfamilias
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {/* Botón de Cambio de Tema: EXCLUSIVAMENTE ICONO (☀️ / 🌙) */}
          <TouchableOpacity
            onPress={toggleTheme}
            activeOpacity={0.8}
            accessibilityLabel={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            <SculptedIcon
              name={isDark ? 'moon' : 'sun'}
              size={18}
              containerSize={40}
              variant="sunken"
              glow={isDark}
              accentColor={colors.neonAmber}
              color={isDark ? colors.neonAmber : colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.cutReportButton,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.primaryBorder,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                ...(isDark ? getNeonGlow(colors.neonCyan, 'low') : {}),
              },
            ]}
            onPress={() => setIsCutModalOpen(true)}
            activeOpacity={0.8}
          >
            <SculptedIcon name="receipt" size={15} variant="plain" color={colors.primaryText} />
            <Text style={[styles.cutReportButtonText, { color: colors.primaryText }]}>Corte General</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: event.isArchived ? colors.primaryLight : colors.surfaceSubtle,
                borderColor: event.isArchived ? colors.primaryBorder : colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              },
            ]}
            onPress={handleToggleArchive}
          >
            <SculptedIcon
              name={event.isArchived ? 'unarchive' : 'archive'}
              size={14}
              variant="plain"
              color={colors.textPrimary}
            />
            <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
              {event.isArchived ? 'Desarchivar' : 'Archivar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenido Principal Responsivo con Sidebar iPadOS Reanimated */}
      <View style={[styles.dashboardLayout, isTablet && styles.dashboardLayoutTablet]}>
        {/* Barra lateral de navegación estática */}
        <View
          style={[
            styles.tabBar,
            isTablet && (isSidebarCollapsed ? styles.tabBarTabletCollapsed : styles.tabBarTablet),
            {
              backgroundColor: colors.surface,
              borderRightColor: colors.border,
              borderBottomColor: colors.border,
            },
          ]}
        >
          {/* Botón para Colapsar / Expandir Barra Lateral (iPad) */}
          {isTablet && (
            <TouchableOpacity
              style={[
                styles.sidebarCollapseBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                },
              ]}
              onPress={toggleSidebar}
              accessibilityLabel={isSidebarCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            >
              <SculptedIcon
                name={isSidebarCollapsed ? 'chevron-right' : 'chevron-left'}
                size={14}
                variant="plain"
                color={colors.textPrimary}
              />
              {!isSidebarCollapsed && (
                <Text style={[styles.sidebarCollapseBtnText, { color: colors.textSecondary }]}>
                  Colapsar Menú
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* Tab 1: Corte y Tickets */}
          <TouchableOpacity
            style={[
              styles.tabItem,
              isSidebarCollapsed && styles.tabItemCollapsed,
              {
                backgroundColor: activeTab === 'summary' ? colors.primaryLight : colors.surfaceSubtle,
                borderColor: activeTab === 'summary' ? colors.primaryBorder : colors.borderLight,
                borderWidth: 1,
                ...(activeTab === 'summary' && isDark ? getNeonGlow(colors.neonCyan, 'low') : {}),
              },
            ]}
            onPress={() => {
              setActiveTab('summary');
              setMobileDetailOpen(false);
            }}
          >
            <SculptedIcon
              name="chart"
              size={18}
              containerSize={36}
              variant="sunken"
              color={activeTab === 'summary' ? colors.primary : colors.textMuted}
              glow={activeTab === 'summary' && isDark}
              accentColor={colors.primary}
            />
            {!isSidebarCollapsed && (
              <View style={styles.tabTextWrapper}>
                <Text
                  style={[
                    styles.tabTitle,
                    { color: activeTab === 'summary' ? colors.primaryText : colors.textPrimary },
                  ]}
                >
                  Corte y Tickets
                </Text>
                <Text style={[styles.tabDescription, { color: colors.textSecondary }]}>
                  Métricas HUD y tickets POS
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Tab 2: Subfamilias y Asistencia */}
          <TouchableOpacity
            style={[
              styles.tabItem,
              isSidebarCollapsed && styles.tabItemCollapsed,
              {
                backgroundColor: activeTab === 'participants' ? colors.primaryLight : colors.surfaceSubtle,
                borderColor: activeTab === 'participants' ? colors.primaryBorder : colors.borderLight,
                borderWidth: 1,
                ...(activeTab === 'participants' && isDark ? getNeonGlow(colors.neonCyan, 'low') : {}),
              },
            ]}
            onPress={() => setActiveTab('participants')}
          >
            <SculptedIcon
              name="users"
              size={18}
              containerSize={36}
              variant="sunken"
              color={activeTab === 'participants' ? colors.primary : colors.textMuted}
              glow={activeTab === 'participants' && isDark}
              accentColor={colors.primary}
            />
            {!isSidebarCollapsed && (
              <View style={styles.tabTextWrapper}>
                <Text
                  style={[
                    styles.tabTitle,
                    { color: activeTab === 'participants' ? colors.primaryText : colors.textPrimary },
                  ]}
                >
                  Subfamilias & Asistencia
                </Text>
                <Text style={[styles.tabDescription, { color: colors.textSecondary }]}>
                  {totals?.totalAttendingCount}/{event.participants.length} asistentes
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Tab 3: Gastos e Insumos */}
          <TouchableOpacity
            style={[
              styles.tabItem,
              isSidebarCollapsed && styles.tabItemCollapsed,
              {
                backgroundColor: activeTab === 'expenses' ? colors.primaryLight : colors.surfaceSubtle,
                borderColor: activeTab === 'expenses' ? colors.primaryBorder : colors.borderLight,
                borderWidth: 1,
                ...(activeTab === 'expenses' && isDark ? getNeonGlow(colors.neonCyan, 'low') : {}),
              },
            ]}
            onPress={() => setActiveTab('expenses')}
          >
            <SculptedIcon
              name="cart"
              size={18}
              containerSize={36}
              variant="sunken"
              color={activeTab === 'expenses' ? colors.primary : colors.textMuted}
              glow={activeTab === 'expenses' && isDark}
              accentColor={colors.primary}
            />
            {!isSidebarCollapsed && (
              <View style={styles.tabTextWrapper}>
                <Text
                  style={[
                    styles.tabTitle,
                    { color: activeTab === 'expenses' ? colors.primaryText : colors.textPrimary },
                  ]}
                >
                  Gastos e Insumos
                </Text>
                <Text style={[styles.tabDescription, { color: colors.textSecondary }]}>
                  {event.expenses.length} compras / CSV
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Área de Visualización */}
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.tabContentInner}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
        >
          {/* ================= PESTAÑA 1: MASTER-DETAIL DE SUBFAMILIAS Y TICKET POS ================= */}
          {activeTab === 'summary' && totals && (
            <View style={styles.sectionContainer}>
              {/* Tira Sci-Fi HUD Glassmorphism de Métricas Clave */}
              <GlassCard variant="default" glow={isDark} contentStyle={styles.heroSummaryContainer}>
                <View style={styles.heroMetricsGrid}>
                  {/* Gasto Total (Cian / Azul Neutral) */}
                  <View
                    style={[
                      styles.heroMetricItem,
                      {
                        backgroundColor: isDark ? '#1A1C22' : colors.surfaceSubtle,
                        borderColor: isDark ? 'rgba(0, 229, 255, 0.28)' : 'rgba(2, 132, 199, 0.25)',
                        ...(isDark ? getNeonGlow(colors.neonCyan, 'low') : {}),
                      },
                    ]}
                  >
                    <View style={styles.kpiHeaderRow}>
                      <Text style={[styles.heroMetricLabel, { color: isDark ? colors.neonCyan : colors.primary }]}>
                        TOTAL GASTADO
                      </Text>
                      <SculptedIcon
                        name="wallet"
                        size={14}
                        containerSize={28}
                        variant="sunken"
                        glow={isDark}
                        accentColor={colors.neonCyan}
                        color={isDark ? colors.neonCyan : colors.primary}
                      />
                    </View>
                    <Text style={[styles.heroMetricValue, { color: colors.textPrimary }]}>
                      {FormatCurrency(totals.totalExpenses)}
                    </Text>
                    <Text style={[styles.heroMetricSub, { color: colors.textSecondary }]}>
                      {FormatCurrency(totals.costPerUnit)}/día base
                    </Text>
                  </View>

                  {/* Recaudado (Verde Esmeralda Suave) */}
                  <View
                    style={[
                      styles.heroMetricItem,
                      {
                        backgroundColor: isDark ? '#1A1C22' : colors.successLight,
                        borderColor: isDark ? 'rgba(0, 230, 118, 0.32)' : colors.successBorder,
                        ...(isDark ? getNeonGlow(colors.neonGreen, 'low') : {}),
                      },
                    ]}
                  >
                    <View style={styles.kpiHeaderRow}>
                      <Text style={[styles.heroMetricLabel, { color: isDark ? colors.neonGreen : colors.successText }]}>
                        RECAUDADO
                      </Text>
                      <SculptedIcon
                        name="trending-up"
                        size={14}
                        containerSize={28}
                        variant="sunken"
                        glow={isDark}
                        accentColor={colors.neonGreen}
                        color={isDark ? colors.neonGreen : colors.successText}
                      />
                    </View>
                    <Text style={[styles.heroMetricValue, { color: isDark ? colors.neonGreen : colors.successText }]}>
                      {FormatCurrency(totals.totalCollected)}
                    </Text>
                    <View
                      style={[
                        styles.kpiPillSuccess,
                        {
                          backgroundColor: isDark ? 'rgba(0, 230, 118, 0.16)' : '#DCFCE7',
                          borderColor: isDark ? 'rgba(0, 230, 118, 0.32)' : colors.successBorder,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Text style={[styles.kpiPillSuccessText, { color: isDark ? colors.neonGreen : colors.successText }]}>
                        {collectedPercent}% de la meta
                      </Text>
                    </View>
                  </View>

                  {/* Pendiente (Ámbar / Coral Sutil) */}
                  <View
                    style={[
                      styles.heroMetricItem,
                      totals.totalPendingToCollect > 0
                        ? {
                            backgroundColor: isDark ? '#1A1C22' : colors.warningLight,
                            borderColor: isDark ? 'rgba(255, 171, 0, 0.32)' : colors.warningBorder,
                            ...(isDark ? getNeonGlow(colors.neonAmber, 'low') : {}),
                          }
                        : {
                            backgroundColor: isDark ? '#1A1C22' : colors.surfaceSubtle,
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.border,
                          },
                    ]}
                  >
                    <View style={styles.kpiHeaderRow}>
                      <Text
                        style={[
                          styles.heroMetricLabel,
                          {
                            color:
                              totals.totalPendingToCollect > 0
                                ? (isDark ? colors.neonAmber : colors.warningText)
                                : colors.textMuted,
                          },
                        ]}
                      >
                        PENDIENTE
                      </Text>
                      <SculptedIcon
                        name="clock"
                        size={14}
                        containerSize={28}
                        variant="sunken"
                        glow={totals.totalPendingToCollect > 0 && isDark}
                        accentColor={colors.neonAmber}
                        color={
                          totals.totalPendingToCollect > 0
                            ? (isDark ? colors.neonAmber : colors.warningText)
                            : colors.textMuted
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.heroMetricValue,
                        {
                          color:
                            totals.totalPendingToCollect > 0
                              ? (isDark ? colors.neonAmber : colors.warningText)
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {FormatCurrency(totals.totalPendingToCollect)}
                    </Text>
                    <Text
                      style={[
                        styles.heroMetricSub,
                        {
                          color:
                            totals.totalPendingToCollect > 0
                              ? (isDark ? 'rgba(255, 171, 0, 0.85)' : colors.warningText)
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {pendingFamiliesCount} familia{pendingFamiliesCount === 1 ? '' : 's'} pendiente
                    </Text>
                  </View>

                  {/* En Caja (Verde Esmeralda / Teal) */}
                  <View
                    style={[
                      styles.heroMetricItem,
                      {
                        backgroundColor: isDark ? '#1A1C22' : colors.tealLight,
                        borderColor: isDark ? 'rgba(0, 229, 255, 0.28)' : colors.tealBorder,
                        ...(isDark ? getNeonGlow(colors.neonCyan, 'low') : {}),
                      },
                    ]}
                  >
                    <View style={styles.kpiHeaderRow}>
                      <Text style={[styles.heroMetricLabel, { color: isDark ? colors.neonCyan : colors.tealText }]}>
                        EN CAJA
                      </Text>
                      <SculptedIcon
                        name="bank"
                        size={14}
                        containerSize={28}
                        variant="sunken"
                        glow={isDark}
                        accentColor={colors.neonCyan}
                        color={isDark ? colors.neonCyan : colors.tealText}
                      />
                    </View>
                    <Text style={[styles.heroMetricValue, { color: isDark ? colors.neonCyan : colors.tealText }]}>
                      {FormatCurrency(totals.cashInHand)}
                    </Text>
                    <Text style={[styles.heroMetricSub, { color: colors.textSecondary }]}>Líquido disponible</Text>
                  </View>
                </View>

                {/* Acciones Rápidas */}
                <View style={styles.heroActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.heroShareBtn,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      },
                    ]}
                    onPress={handleQuickShare}
                    activeOpacity={0.8}
                  >
                    <SculptedIcon name="whatsapp" size={15} variant="plain" color={colors.textPrimary} />
                    <Text style={[styles.heroShareBtnText, { color: colors.textPrimary }]}>WhatsApp Resumen</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.heroCutBtn,
                      {
                        backgroundColor: colors.primaryLight,
                        borderColor: colors.primaryBorder,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        ...(isDark ? getNeonGlow(colors.neonCyan, 'low') : {}),
                      },
                    ]}
                    onPress={() => setIsCutModalOpen(true)}
                    activeOpacity={0.8}
                  >
                    <SculptedIcon name="receipt" size={15} variant="plain" color={colors.primaryText} />
                    <Text style={[styles.heroCutBtnText, { color: colors.primaryText }]}>Resumen de Liquidación</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>

              {/* 2 Gráficos Esenciales (HUD Segmented Gauge y Donut Glass) */}
              <View style={styles.financialChartsContainer}>
                <FinancialCharts event={event} totals={totals} />
              </View>

              {/* SECCIÓN MASTER-DETAIL: SUBFAMILIAS (35%) VS TICKET POS DETALLE (65%) */}
              <View style={styles.masterDetailSection}>
                <View style={styles.masterDetailHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <SculptedIcon name="receipt" size={16} variant="plain" color={colors.primary} />
                    <Text style={[styles.masterDetailTitle, { color: colors.textPrimary }]}>
                      Cuentas y Tickets de Cobro POS
                    </Text>
                  </View>
                  <Text style={[styles.masterDetailSub, { color: colors.textSecondary }]}>
                    Selecciona una subfamilia para ajustar asistencia, liquidar al instante o consultar su desglose
                  </Text>
                </View>

                {/* Layout Dos Columnas en Tablets / Pantallas Anchas */}
                {isTablet ? (
                  <View style={styles.masterDetailRow}>
                    {/* COLUMNA IZQUIERDA (35%): LISTA DE SUBFAMILIAS */}
                    <View style={styles.masterColumn}>
                      <View style={styles.masterColumnHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <SculptedIcon name="home" size={14} variant="plain" color={colors.textPrimary} />
                          <Text style={[styles.masterColumnTitle, { color: colors.textPrimary }]}>
                            Subfamilias ({totals.subFamilies.length})
                          </Text>
                        </View>
                      </View>

                      {/* Buscador de Subfamilias */}
                      <View
                        style={[
                          styles.searchBoxContainer,
                          {
                            backgroundColor: isDark ? '#16181D' : colors.surfaceSubtle,
                            borderColor: isDark ? '#111317' : colors.border,
                          },
                        ]}
                      >
                        <SculptedIcon name="search" size={14} variant="plain" color={colors.textMuted} />
                        <TextInput
                          style={[styles.searchBoxInput, { color: colors.textPrimary }]}
                          placeholder="Buscar familia..."
                          value={subFamilySearchQuery}
                          onChangeText={setSubFamilySearchQuery}
                          placeholderTextColor={colors.textMuted}
                        />
                        {subFamilySearchQuery.length > 0 && (
                          <TouchableOpacity onPress={() => setSubFamilySearchQuery('')}>
                            <SculptedIcon name="close" size={13} variant="plain" color={colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>

                      <ScrollView style={styles.subFamilyListScroll} showsVerticalScrollIndicator={false}>
                        {filteredSubFamilies.map((sf) => {
                          const isSelected = activeSubFamilyName === sf.subFamilyName;
                          const isPaid = sf.isFullySettled;
                          const isRefund = sf.finalBalance < 0;
                          const isOwed = sf.finalBalance > 0;

                          return (
                            <GlassCard
                              key={sf.subFamilyName}
                              variant={isSelected ? (isDark ? 'cyan' : 'lime') : 'subtle'}
                              glow={isSelected && isDark}
                              style={styles.subFamilyMasterCardWrapper}
                              contentStyle={styles.subFamilyMasterCard}
                              onPress={() => setSelectedSubFamily(sf.subFamilyName)}
                            >
                              <View style={styles.sfMasterCardTop}>
                                <Text
                                  style={[
                                    styles.sfMasterCardName,
                                    {
                                      color: isSelected
                                        ? colors.primaryText
                                        : isPaid
                                        ? colors.textSecondary
                                        : colors.textPrimary,
                                    },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {sf.subFamilyName}
                                </Text>
                                {isPaid ? (
                                  <View
                                    style={[
                                      styles.badgePaidMaster,
                                      {
                                        backgroundColor: colors.successLight,
                                        borderColor: colors.successBorder,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                      },
                                    ]}
                                  >
                                    <SculptedIcon name="check-circle" size={11} variant="plain" color={colors.successText} />
                                    <Text style={[styles.badgePaidMasterText, { color: colors.successText }]}>
                                      Liquidada
                                    </Text>
                                  </View>
                                ) : isRefund ? (
                                  <View
                                    style={[
                                      styles.badgeRefundSmall,
                                      {
                                        backgroundColor: colors.primaryLight,
                                        borderColor: colors.primaryBorder,
                                      },
                                    ]}
                                  >
                                    <Text style={[styles.badgeRefundSmallText, { color: colors.primaryText }]}>
                                      Reembolso {FormatCurrency(Math.abs(sf.finalBalance))}
                                    </Text>
                                  </View>
                                ) : isOwed ? (
                                  <View
                                    style={[
                                      styles.badgeOwedSmall,
                                      {
                                        backgroundColor: colors.coralLight,
                                        borderColor: colors.coralBorder,
                                      },
                                    ]}
                                  >
                                    <Text style={[styles.badgeOwedSmallText, { color: colors.coralText }]}>
                                      Paga {FormatCurrency(sf.finalBalance)}
                                    </Text>
                                  </View>
                                ) : (
                                  <View
                                    style={[
                                      styles.badgeSettledSmall,
                                      {
                                        backgroundColor: colors.surfaceSubtle,
                                        borderColor: colors.border,
                                      },
                                    ]}
                                  >
                                    <Text style={[styles.badgeSettledSmallText, { color: colors.textSecondary }]}>
                                      $0.00
                                    </Text>
                                  </View>
                                )}
                              </View>

                              <Text style={[styles.sfMasterCardSub, { color: colors.textSecondary }]}>
                                {sf.attendingCount} de {sf.membersCount} asisten • Cuota: {FormatCurrency(sf.proportionalShare)}
                              </Text>

                              {/* Acciones Rápidas: Liquidación Ágil de 1 Toque y Borrado */}
                              <View style={styles.sfQuickActionsRow}>
                                {isPaid ? (
                                  <TouchableOpacity
                                    style={[
                                      styles.sfQuickReopenBtn,
                                      {
                                        backgroundColor: colors.coralLight,
                                        borderColor: colors.coralBorder,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                      },
                                    ]}
                                    onPress={(e) => {
                                      handleSettleSubFamily(sf.subFamilyName, false);
                                    }}
                                  >
                                    <SculptedIcon name="refresh" size={11} variant="plain" color={colors.coralText} />
                                    <Text style={[styles.sfQuickReopenBtnText, { color: colors.coralText }]}>Reabrir</Text>
                                  </TouchableOpacity>
                                ) : (
                                  <TouchableOpacity
                                    style={[
                                      styles.sfQuickSettleBtn,
                                      {
                                        backgroundColor: colors.primary,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                        ...(isDark ? getNeonGlow(colors.neonGreen, 'low') : {}),
                                      },
                                    ]}
                                    onPress={(e) => {
                                      handleSettleSubFamily(sf.subFamilyName, true);
                                    }}
                                  >
                                    <SculptedIcon name="check" size={12} variant="plain" color={isDark ? '#0B0F19' : '#FFFFFF'} />
                                    <Text style={[styles.sfQuickSettleBtnText, { color: isDark ? '#0B0F19' : '#FFFFFF' }]}>Liquidar</Text>
                                  </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                  style={[styles.sfQuickDeleteBtn, { backgroundColor: colors.dangerLight }]}
                                  onPress={(e) => {
                                    handleDeleteSubFamily(sf.subFamilyName);
                                  }}
                                  accessibilityLabel={`Eliminar ${sf.subFamilyName}`}
                                >
                                  <SculptedIcon name="trash" size={12} variant="plain" color={colors.dangerText} />
                                </TouchableOpacity>
                              </View>
                            </GlassCard>
                          );
                        })}
                      </ScrollView>
                    </View>

                    {/* COLUMNA DERECHA (65%): TICKET DE CUENTA POS DETALLE */}
                    <View style={styles.detailColumn}>
                      <PosTicketView
                        subFamilyName={activeSubFamilyName}
                        event={event}
                        totals={totals}
                        onToggleAttendance={handleToggleAttendance}
                        onToggleSettlement={handleToggleSettlement}
                        onSettleSubFamily={handleSettleSubFamily}
                      />
                    </View>
                  </View>
                ) : (
                  /* Layout Móvil (Lista Apilada -> Detalle al Tocar) */
                  <View style={styles.mobileLayoutContainer}>
                    {!mobileDetailOpen ? (
                      <View style={styles.mobileListContainer}>
                        {/* Buscador Móvil */}
                        <View
                          style={[
                            styles.searchBoxContainer,
                            {
                              backgroundColor: isDark ? '#16181D' : colors.surfaceSubtle,
                              borderColor: isDark ? '#111317' : colors.border,
                            },
                          ]}
                        >
                          <SculptedIcon name="search" size={14} variant="plain" color={colors.textMuted} />
                          <TextInput
                            style={[styles.searchBoxInput, { color: colors.textPrimary }]}
                            placeholder="Buscar subfamilia..."
                            value={subFamilySearchQuery}
                            onChangeText={setSubFamilySearchQuery}
                            placeholderTextColor={colors.textMuted}
                          />
                          {subFamilySearchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSubFamilySearchQuery('')}>
                              <SculptedIcon name="close" size={13} variant="plain" color={colors.textMuted} />
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={styles.mobileCardsList}>
                          {filteredSubFamilies.map((sf) => {
                            const isPaid = sf.isFullySettled;
                            const isRefund = sf.finalBalance < 0;
                            const isOwed = sf.finalBalance > 0;

                            return (
                              <GlassCard
                                key={sf.subFamilyName}
                                variant={isPaid ? 'subtle' : isOwed ? 'coral' : 'cyan'}
                                glow={!isPaid && isDark}
                                contentStyle={styles.mobileFamilyCard}
                                onPress={() => {
                                  setSelectedSubFamily(sf.subFamilyName);
                                  setMobileDetailOpen(true);
                                }}
                              >
                                <View style={styles.mobileCardHeader}>
                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      <SculptedIcon name="home" size={14} variant="plain" color={isPaid ? colors.textSecondary : colors.textPrimary} />
                                      <Text
                                        style={[
                                          styles.mobileCardTitle,
                                          { color: isPaid ? colors.textSecondary : colors.textPrimary },
                                        ]}
                                      >
                                        {sf.subFamilyName}
                                      </Text>
                                    </View>
                                    <Text style={[styles.mobileCardSub, { color: colors.textSecondary }]}>
                                      {sf.attendingCount} de {sf.membersCount} asistentes • Cuota: {FormatCurrency(sf.proportionalShare)}
                                    </Text>
                                  </View>
                                  <SculptedIcon name="chevron-right" size={14} variant="plain" color={colors.textMuted} />
                                </View>

                                <View style={styles.mobileCardFooter}>
                                  {isPaid ? (
                                    <View
                                      style={[
                                        styles.badgePaidMaster,
                                        {
                                          backgroundColor: colors.successLight,
                                          borderColor: colors.successBorder,
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          gap: 4,
                                        },
                                      ]}
                                    >
                                      <SculptedIcon name="check-circle" size={11} variant="plain" color={colors.successText} />
                                      <Text style={[styles.badgePaidMasterText, { color: colors.successText }]}>
                                        Cuenta Liquidada ($0.00)
                                      </Text>
                                    </View>
                                  ) : isRefund ? (
                                    <View
                                      style={[
                                        styles.badgeRefund,
                                        {
                                          backgroundColor: colors.primaryLight,
                                          borderColor: colors.primaryBorder,
                                        },
                                      ]}
                                    >
                                      <Text style={[styles.badgeRefundText, { color: colors.primaryText }]}>
                                        Reembolso: {FormatCurrency(Math.abs(sf.finalBalance))}
                                      </Text>
                                    </View>
                                  ) : isOwed ? (
                                    <View
                                      style={[
                                        styles.badgeOwed,
                                        {
                                          backgroundColor: colors.coralLight,
                                          borderColor: colors.coralBorder,
                                        },
                                      ]}
                                    >
                                      <Text style={[styles.badgeOwedText, { color: colors.coralText }]}>
                                        Pagar: {FormatCurrency(sf.finalBalance)}
                                      </Text>
                                    </View>
                                  ) : (
                                    <View
                                      style={[
                                        styles.badgeSettled,
                                        {
                                          backgroundColor: colors.surfaceSubtle,
                                          borderColor: colors.border,
                                        },
                                      ]}
                                    >
                                      <Text style={[styles.badgeSettledText, { color: colors.textSecondary }]}>
                                        $0.00
                                      </Text>
                                    </View>
                                  )}

                                  <View style={styles.mobileActionsGroup}>
                                    {isPaid ? (
                                      <TouchableOpacity
                                        style={[
                                          styles.sfQuickReopenBtn,
                                          {
                                            backgroundColor: colors.coralLight,
                                            borderColor: colors.coralBorder,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 4,
                                          },
                                        ]}
                                        onPress={() => {
                                          handleSettleSubFamily(sf.subFamilyName, false);
                                        }}
                                      >
                                        <SculptedIcon name="refresh" size={11} variant="plain" color={colors.coralText} />
                                        <Text style={[styles.sfQuickReopenBtnText, { color: colors.coralText }]}>Reabrir</Text>
                                      </TouchableOpacity>
                                    ) : (
                                      <TouchableOpacity
                                        style={[
                                          styles.sfQuickSettleBtn,
                                          {
                                            backgroundColor: colors.primary,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 4,
                                            ...(isDark ? getNeonGlow(colors.neonGreen, 'low') : {}),
                                          },
                                        ]}
                                        onPress={() => {
                                          handleSettleSubFamily(sf.subFamilyName, true);
                                        }}
                                      >
                                        <SculptedIcon name="check" size={12} variant="plain" color={isDark ? '#0B0F19' : '#FFFFFF'} />
                                        <Text style={[styles.sfQuickSettleBtnText, { color: isDark ? '#0B0F19' : '#FFFFFF' }]}>Liquidar</Text>
                                      </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                      style={[styles.sfQuickDeleteBtn, { backgroundColor: colors.dangerLight }]}
                                      onPress={() => {
                                        handleDeleteSubFamily(sf.subFamilyName);
                                      }}
                                    >
                                      <SculptedIcon name="trash" size={12} variant="plain" color={colors.dangerText} />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </GlassCard>
                            );
                          })}
                        </View>
                      </View>
                    ) : (
                      /* Vista Detalle en Móvil */
                      <View style={styles.mobileDetailWrapper}>
                        <PosTicketView
                          subFamilyName={activeSubFamilyName}
                          event={event}
                          totals={totals}
                          onToggleAttendance={handleToggleAttendance}
                          onToggleSettlement={handleToggleSettlement}
                          onSettleSubFamily={handleSettleSubFamily}
                          onBackToList={() => setMobileDetailOpen(false)}
                          isMobile={true}
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ================= PESTAÑA 2: SUBFAMILIAS Y ASISTENCIA ================= */}
          {activeTab === 'participants' && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Subfamilias y Control de Asistencia
                  </Text>
                  <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                    Confirma asistencia, liquida cuentas familiares o agrega integrantes al evento
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[
                      styles.secondaryHeaderButton,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      },
                    ]}
                    onPress={() => setIsDirectoryImportOpen(true)}
                  >
                    <SculptedIcon name="users" size={15} variant="plain" color={colors.textPrimary} />
                    <Text style={[styles.secondaryHeaderButtonText, { color: colors.textPrimary }]}>
                      Importar del Directorio
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor: colors.primary,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        ...(isDark ? getNeonGlow(colors.neonCyan, 'medium') : {}),
                      },
                    ]}
                    onPress={() => {
                      setPartName('');
                      setPartCategory('adulto');
                      setPartWeight('1.0');
                      setIsParticipantModalOpen(true);
                    }}
                  >
                    <SculptedIcon name="plus" size={14} variant="plain" color={isDark ? '#0B0F19' : '#FFFFFF'} />
                    <Text style={[styles.primaryButtonText, { color: isDark ? '#0B0F19' : '#FFFFFF' }]}>Agregar Integrante</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Barra de Búsqueda Predictiva */}
              <View
                style={[
                  styles.searchBoxContainer,
                  {
                    backgroundColor: isDark ? '#16181D' : colors.surfaceSubtle,
                    borderColor: isDark ? '#111317' : colors.border,
                  },
                ]}
              >
                <SculptedIcon name="search" size={14} variant="plain" color={colors.textMuted} />
                <TextInput
                  style={[styles.searchBoxInput, { color: colors.textPrimary }]}
                  placeholder="Buscar por nombre o familia..."
                  value={participantFilterQuery}
                  onChangeText={setParticipantFilterQuery}
                  placeholderTextColor={colors.textMuted}
                />
                {participantFilterQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setParticipantFilterQuery('')}>
                    <SculptedIcon name="close" size={13} variant="plain" color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.familiesContainer}>
                {participantsByFamily.map(([familyName, members]) => {
                  const sfCalc = totals?.bySubFamily[familyName];
                  const isCollapsed = Boolean(collapsedFamilies[familyName]);
                  const attendingMembersCount = members.filter((m) => m.isAttending !== false).length;
                  const allAttending = attendingMembersCount === members.length;
                  const isFamilyPaid = sfCalc?.isFullySettled;

                  return (
                    <GlassCard
                      key={familyName}
                      variant={isFamilyPaid ? 'lime' : 'subtle'}
                      glow={isFamilyPaid && isDark}
                      style={styles.familySectionCard}
                    >
                      <View
                        style={[
                          styles.familySectionHeader,
                          {
                            backgroundColor: colors.surfaceSubtle,
                            borderBottomColor: colors.border,
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.familyTitleArea}
                          onPress={() => toggleCollapseFamily(familyName)}
                          activeOpacity={0.7}
                        >
                          <SculptedIcon
                            name={isCollapsed ? 'chevron-right' : 'chevron-down'}
                            size={12}
                            variant="plain"
                            color={colors.textMuted}
                          />
                          <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <SculptedIcon name="home" size={14} variant="plain" color={colors.textPrimary} />
                              <Text style={[styles.familyCardTitle, { color: colors.textPrimary }]}>
                                {familyName}
                              </Text>
                            </View>
                            <Text style={[styles.familyCardSub, { color: colors.textSecondary }]}>
                              {attendingMembersCount} de {members.length} asisten • Saldo:{' '}
                              <Text style={[styles.boldText, { color: colors.textPrimary }]}>
                                {FormatCurrency(sfCalc?.finalBalance ?? 0)}
                              </Text>
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <View style={styles.familyHeaderActions}>
                          <TouchableOpacity
                            style={[
                              styles.familyToggleAllBtn,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                              },
                            ]}
                            onPress={() => handleToggleFamilyAttendance(familyName, !allAttending)}
                          >
                            <Text style={[styles.familyToggleAllText, { color: colors.primary }]}>
                              {allAttending ? 'Marcar Ausentes' : 'Marcar Asistentes'}
                            </Text>
                          </TouchableOpacity>

                          {isFamilyPaid ? (
                            <TouchableOpacity
                              style={[
                                styles.familyReopenHeaderBtn,
                                {
                                  backgroundColor: colors.coralLight,
                                  borderColor: colors.coralBorder,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 4,
                                },
                              ]}
                              onPress={() => handleSettleSubFamily(familyName, false)}
                            >
                              <SculptedIcon name="refresh" size={11} variant="plain" color={colors.coralText} />
                              <Text style={[styles.familyReopenHeaderBtnText, { color: colors.coralText }]}>Reabrir</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[
                                styles.familySettleHeaderBtn,
                                {
                                  backgroundColor: colors.primary,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 4,
                                  ...(isDark ? getNeonGlow(colors.neonGreen, 'low') : {}),
                                },
                              ]}
                              onPress={() => handleSettleSubFamily(familyName, true)}
                            >
                              <SculptedIcon name="check" size={12} variant="plain" color={isDark ? '#0B0F19' : '#FFFFFF'} />
                              <Text style={[styles.familySettleHeaderBtnText, { color: isDark ? '#0B0F19' : '#FFFFFF' }]}>Liquidar</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={[styles.familyDeleteHeaderBtn, { backgroundColor: colors.dangerLight }]}
                            onPress={() => handleDeleteSubFamily(familyName)}
                            accessibilityLabel={`Eliminar ${familyName}`}
                          >
                            <SculptedIcon name="trash" size={13} variant="plain" color={colors.dangerText} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {!isCollapsed && (
                        <View style={styles.familyMembersList}>
                          {members.map((p) => {
                            const isAttending = p.isAttending !== false;
                            const pCalc = totals?.byParticipantId[p.id];
                            const allDaysSelected = p.activeDays.length === event.availableDays.length;

                            return (
                              <View
                                key={p.id}
                                style={[
                                  styles.memberCard,
                                  {
                                    backgroundColor: colors.surfaceSubtle,
                                    borderColor: colors.border,
                                  },
                                  !isAttending && styles.memberCardAbsent,
                                ]}
                              >
                                <View style={styles.memberHeaderRow}>
                                  <View style={styles.memberInfo}>
                                    <View style={styles.nameRow}>
                                      <Text
                                        style={[
                                          styles.memberName,
                                          { color: colors.textPrimary },
                                          !isAttending && styles.textMutedName,
                                        ]}
                                      >
                                        {p.name}
                                      </Text>
                                      <View
                                        style={[
                                          styles.categoryPill,
                                          {
                                            backgroundColor: colors.surface,
                                            borderColor: colors.border,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 4,
                                          },
                                        ]}
                                      >
                                        <SculptedIcon
                                          name={p.category === 'nino' ? 'child' : 'user'}
                                          size={11}
                                          variant="plain"
                                          color={colors.textSecondary}
                                        />
                                        <Text style={[styles.categoryPillText, { color: colors.textSecondary }]}>
                                          {p.category === 'nino' ? 'Niño (0.5)' : 'Adulto (1.0)'}
                                        </Text>
                                      </View>
                                    </View>
                                    <Text style={[styles.memberQuotaSub, { color: colors.textSecondary }]}>
                                      Cuota:{' '}
                                      <Text style={[styles.boldText, { color: colors.textPrimary }]}>
                                        {FormatCurrency(pCalc?.proportionalShare ?? 0)}
                                      </Text>{' '}
                                      • Pagó de su bolsillo:{' '}
                                      <Text style={[styles.boldText, { color: colors.textPrimary }]}>
                                        {FormatCurrency(pCalc?.totalPaid ?? 0)}
                                      </Text>
                                    </Text>
                                  </View>

                                  <View style={styles.attendanceControl}>
                                    <TouchableOpacity
                                      style={[
                                        styles.attendanceToggleBtn,
                                        isAttending
                                          ? [
                                              styles.attendanceBtnActive,
                                              {
                                                backgroundColor: colors.primaryLight,
                                                borderColor: colors.primaryBorder,
                                              },
                                            ]
                                          : [
                                              styles.attendanceBtnInactive,
                                              {
                                                backgroundColor: colors.surface,
                                                borderColor: colors.border,
                                              },
                                            ],
                                      ]}
                                      onPress={() => handleToggleAttendance(p.id)}
                                    >
                                      <Text
                                        style={[
                                          styles.attendanceBtnText,
                                          isAttending
                                            ? [styles.attendanceBtnTextActive, { color: colors.primary }]
                                            : [styles.attendanceBtnTextInactive, { color: colors.textMuted }],
                                        ]}
                                      >
                                        {isAttending ? '✓ Asiste' : '✕ Ausente'}
                                      </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                      style={[styles.deleteMemberIcon, { backgroundColor: colors.dangerLight }]}
                                      onPress={() => handleDeleteParticipant(p.id, p.name)}
                                      accessibilityLabel={`Eliminar ${p.name}`}
                                    >
                                      <SculptedIcon name="trash" size={12} variant="plain" color={colors.dangerText} />
                                    </TouchableOpacity>
                                  </View>
                                </View>

                                {isAttending && (
                                  <View style={[styles.daysSection, { borderTopColor: colors.border }]}>
                                    <View style={styles.daysHeader}>
                                      <Text style={[styles.daysLabel, { color: colors.textSecondary }]}>Días de Asistencia:</Text>
                                      <TouchableOpacity
                                        onPress={() => handleToggleAllDays(p.id, !allDaysSelected)}
                                      >
                                        <Text style={[styles.toggleAllText, { color: colors.primary }]}>
                                          {allDaysSelected ? 'Desmarcar todos' : 'Marcar todos'}
                                        </Text>
                                      </TouchableOpacity>
                                    </View>

                                    <View style={styles.daysChipsContainer}>
                                      {event.availableDays.map((day) => {
                                        const isActive = p.activeDays.includes(day);
                                        return (
                                          <TouchableOpacity
                                            key={day}
                                            style={[
                                              styles.dayChip,
                                              {
                                                backgroundColor: isActive
                                                  ? colors.primaryLight
                                                  : colors.surface,
                                                borderColor: isActive
                                                  ? colors.primaryBorder
                                                  : colors.border,
                                              },
                                            ]}
                                            onPress={() => handleToggleDay(p.id, day)}
                                          >
                                            <Text
                                              style={[
                                                styles.dayChipText,
                                                { color: isActive ? colors.primary : colors.textSecondary },
                                                isActive && { fontWeight: '600' },
                                              ]}
                                            >
                                              {day}
                                            </Text>
                                          </TouchableOpacity>
                                        );
                                      })}
                                    </View>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </GlassCard>
                  );
                })}
              </View>
            </View>
          )}

          {/* ================= PESTAÑA 3: GASTOS E INSUMOS ================= */}
          {activeTab === 'expenses' && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Gastos Registrados</Text>
                  <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                    Listado de compras e insumos realizadas por los participantes
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[
                      styles.secondaryHeaderButton,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      },
                    ]}
                    onPress={() => setIsCsvModalOpen(true)}
                  >
                    <SculptedIcon name="receipt" size={15} variant="plain" color={colors.textPrimary} />
                    <Text style={[styles.secondaryHeaderButtonText, { color: colors.textPrimary }]}>
                      Importar CSV
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor: colors.primary,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        ...(isDark ? getNeonGlow(colors.neonCyan, 'medium') : {}),
                      },
                    ]}
                    onPress={() => {
                      setExpTitle('');
                      setExpAmount('');
                      setExpCategory('Comida');
                      setExpPaidBy(event.participants[0]?.id || '');
                      setIsExpenseModalOpen(true);
                    }}
                  >
                    <SculptedIcon name="plus" size={14} variant="plain" color={isDark ? '#0B0F19' : '#FFFFFF'} />
                    <Text style={[styles.primaryButtonText, { color: isDark ? '#0B0F19' : '#FFFFFF' }]}>Registrar Gasto</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {event.expenses.length === 0 ? (
                <View
                  style={[
                    styles.emptyContainer,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <SculptedIcon
                    name="cart"
                    size={38}
                    containerSize={70}
                    variant="sunken"
                    glow={isDark}
                    accentColor={colors.primary}
                    color={colors.primary}
                  />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 12 }]}>No hay gastos registrados</Text>
                  <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                    Agrega los recibos de las compras para calcular el balance y prorrateo general.
                  </Text>
                </View>
              ) : (
                <View style={styles.expensesList}>
                  {event.expenses.map((exp) => {
                    const payer = event.participants.find((p) => p.id === exp.paidBy);
                    const categoryIcon =
                      exp.category === 'Hospedaje'
                        ? 'bed'
                        : exp.category === 'Bebidas'
                        ? 'food'
                        : exp.category === 'Transporte'
                        ? 'car'
                        : 'cart';

                    return (
                      <GlassCard
                        key={exp.id}
                        variant="subtle"
                        contentStyle={styles.expenseCard}
                      >
                        <View style={styles.expenseLeft}>
                          <SculptedIcon
                            name={categoryIcon as any}
                            size={16}
                            containerSize={36}
                            variant="sunken"
                            color={colors.primary}
                          />
                          <View>
                            <Text style={[styles.expenseTitle, { color: colors.textPrimary }]}>{exp.title}</Text>
                            <Text style={[styles.expensePayer, { color: colors.textSecondary }]}>
                              Pagado por:{' '}
                              <Text style={[styles.boldText, { color: colors.textPrimary }]}>
                                {payer ? payer.name : 'Caja Común'}
                              </Text>{' '}
                              ({payer?.subFamily || 'General'}) • {exp.category}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.expenseRight}>
                          <Text style={[styles.expenseAmount, { color: colors.textPrimary }]}>
                            {FormatCurrency(exp.amount)}
                          </Text>
                          <TouchableOpacity
                            style={[styles.deleteIcon, { backgroundColor: colors.dangerLight }]}
                            onPress={() => handleDeleteExpense(exp.id, exp.title)}
                            accessibilityLabel={`Eliminar ${exp.title}`}
                          >
                            <SculptedIcon name="trash" size={13} variant="plain" color={colors.dangerText} />
                          </TouchableOpacity>
                        </View>
                      </GlassCard>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* ⚡ BOTÓN FLOTANTE DE ACCIÓN (FAB) "+ GASTO RÁPIDO" */}
      <TouchableOpacity
        style={[
          styles.fabButton,
          {
            backgroundColor: colors.primary,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            ...(isDark ? getNeonGlow(colors.neonCyan, 'high') : {}),
          },
        ]}
        onPress={() => {
          if (event.participants.length === 0) {
            Alert.alert('Atención', 'Primero agrega participantes al evento para asignar el pago.');
            return;
          }
          setIsQuickExpenseOpen(true);
        }}
        activeOpacity={0.85}
      >
        <SculptedIcon name="plus" size={16} variant="plain" color={isDark ? '#0B0F19' : '#FFFFFF'} />
        <Text style={[styles.fabText, { color: isDark ? '#0B0F19' : '#FFFFFF' }]}>Gasto Rápido</Text>
      </TouchableOpacity>

      {/* Modal: Captura Rápida de Gastos */}
      <QuickExpenseModal
        visible={isQuickExpenseOpen}
        participants={event.participants}
        onClose={() => setIsQuickExpenseOpen(false)}
        onSaveExpense={handleSaveQuickExpense}
      />

      {/* Modal: Agregar Participante */}
      <Modal visible={isParticipantModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <GlassCard
            variant="cyan"
            glow={isDark}
            style={[styles.modalCard, isTablet && styles.modalCardTablet]}
            contentStyle={styles.modalCardContent}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Agregar Integrante al Evento</Text>
              <TouchableOpacity onPress={() => setIsParticipantModalOpen(false)}>
                <SculptedIcon name="close" size={16} variant="plain" color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Nombre completo</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDark ? '#16181D' : colors.surfaceSubtle,
                    borderColor: isDark ? '#111317' : colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Ej. Juan Santiago"
                value={partName}
                onChangeText={setPartName}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Subfamilia</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDark ? '#16181D' : colors.surfaceSubtle,
                    borderColor: isDark ? '#111317' : colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Ej. Familia Santiago Bustamante"
                value={partSubFamily}
                onChangeText={setPartSubFamily}
                placeholderTextColor={colors.textMuted}
              />
              {existingSubFamilies.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subFamilySuggestions}>
                  {existingSubFamilies.map((sf) => (
                    <TouchableOpacity
                      key={sf}
                      style={[
                        styles.subFamilyChip,
                        {
                          backgroundColor: partSubFamily === sf ? colors.primaryLight : colors.surfaceSubtle,
                          borderColor: partSubFamily === sf ? colors.primaryBorder : colors.border,
                        },
                      ]}
                      onPress={() => setPartSubFamily(sf)}
                    >
                      <Text
                        style={[
                          styles.subFamilyChipText,
                          { color: partSubFamily === sf ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {sf}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Categoría</Text>
              <View style={styles.categorySelectors}>
                {[
                  { key: 'adulto', label: 'Adulto (1.0)', weight: '1.0', icon: 'user' as const },
                  { key: 'nino', label: 'Niño (0.5)', weight: '0.5', icon: 'child' as const },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.categoryOption,
                      {
                        backgroundColor: partCategory === item.key ? colors.primaryLight : colors.surfaceSubtle,
                        borderColor: partCategory === item.key ? colors.primaryBorder : colors.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      },
                    ]}
                    onPress={() => {
                      setPartCategory(item.key as CategoryType);
                      setPartWeight(item.weight);
                    }}
                  >
                    <SculptedIcon
                      name={item.icon}
                      size={12}
                      variant="plain"
                      color={partCategory === item.key ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryOptionText,
                        { color: partCategory === item.key ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => setIsParticipantModalOpen(false)}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: colors.primary,
                    ...(isDark ? getNeonGlow(colors.neonCyan, 'medium') : {}),
                  },
                ]}
                onPress={handleAddParticipant}
              >
                <Text style={[styles.primaryButtonText, { color: isDark ? '#0B0F19' : '#FFFFFF' }]}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* Modal: Registrar Gasto Completo */}
      <Modal visible={isExpenseModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <GlassCard
            variant="cyan"
            glow={isDark}
            style={[styles.modalCard, isTablet && styles.modalCardTablet]}
            contentStyle={styles.modalCardContent}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Registrar Nuevo Gasto</Text>
              <TouchableOpacity onPress={() => setIsExpenseModalOpen(false)}>
                <SculptedIcon name="close" size={16} variant="plain" color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Concepto o Título</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDark ? '#16181D' : colors.surfaceSubtle,
                    borderColor: isDark ? '#111317' : colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Ej. Supermercado día 1"
                value={expTitle}
                onChangeText={setExpTitle}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Monto Pagado ($)</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDark ? '#16181D' : colors.surfaceSubtle,
                    borderColor: isDark ? '#111317' : colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={expAmount}
                onChangeText={setExpAmount}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => setIsExpenseModalOpen(false)}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: colors.primary,
                    ...(isDark ? getNeonGlow(colors.neonCyan, 'medium') : {}),
                  },
                ]}
                onPress={handleAddExpense}
              >
                <Text style={[styles.primaryButtonText, { color: isDark ? '#0B0F19' : '#FFFFFF' }]}>Guardar Gasto</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* Modales Complementarios */}
      <EventCutModal
        visible={isCutModalOpen}
        event={event}
        onClose={() => setIsCutModalOpen(false)}
        onToggleSettlement={handleToggleSettlement}
        onToggleSubFamilySettlement={handleSettleSubFamily}
      />

      <CsvImportModal
        visible={isCsvModalOpen}
        participants={event.participants}
        onClose={() => setIsCsvModalOpen(false)}
        onImport={handleImportCsvExpenses}
      />

      <GlobalDirectoryModal
        visible={isDirectoryImportOpen}
        onClose={() => setIsDirectoryImportOpen(false)}
        mode="import"
        onImportSelected={handleImportFromDirectory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 52 : 42,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.sm,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  eventSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  badgeStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeIconOnlyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleIcon: {
    fontSize: 18,
  },
  cutReportButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  cutReportButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dashboardLayout: {
    flex: 1,
    flexDirection: 'column',
  },
  dashboardLayoutTablet: {
    flexDirection: 'row',
  },
  tabBar: {
    padding: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  tabBarTablet: {
    borderBottomWidth: 0,
    borderRightWidth: 1,
    padding: 16,
    width: '22%',
    minWidth: 200,
    maxWidth: 260,
  },
  tabBarTabletCollapsed: {
    borderBottomWidth: 0,
    borderRightWidth: 1,
    padding: 12,
    width: 72,
  },
  sidebarCollapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: Radii.sm,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  sidebarCollapseBtnIcon: {
    fontSize: 16,
    fontWeight: '500',
  },
  sidebarCollapseBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radii.md,
    gap: 12,
  },
  tabItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    alignItems: 'center',
    height: 48,
  },
  tabIcon: {
    fontSize: 20,
    textAlign: 'center',
  },
  tabTextWrapper: {
    flex: 1,
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabDescription: {
    fontSize: 11,
    marginTop: 2,
  },
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    padding: 20,
    paddingBottom: 90,
    flexGrow: 1,
  },
  sectionContainer: {
    gap: 20,
  },
  heroSummaryContainer: {
    padding: 20,
    gap: 16,
  },
  heroMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  heroMetricItem: {
    flex: 1,
    minWidth: 150,
    borderRadius: Radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    gap: 4,
    ...Platform.select({
      web: {
        boxShadow:
          '-2px -2px 6px rgba(255, 255, 255, 0.035), 3px 3px 8px rgba(0, 0, 0, 0.55)',
      } as any,
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  kpiIconBadge: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconText: {
    fontSize: 14,
  },
  heroMetricLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroMetricValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heroMetricSub: {
    fontSize: 12,
    fontWeight: '400',
  },
  kpiPillSuccess: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  kpiPillSuccessText: {
    fontSize: 11,
    fontWeight: '500',
  },
  heroActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  heroShareBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  heroShareBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  heroCutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  heroCutBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  financialChartsContainer: {
    width: '100%',
    alignSelf: 'stretch',
  },
  masterDetailSection: {
    gap: 18,
    marginTop: 28,
    marginBottom: 20,
  },
  masterDetailHeader: {
    gap: 6,
    marginBottom: 4,
  },
  masterDetailTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  masterDetailSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  masterDetailRow: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'flex-start',
  },
  masterColumn: {
    width: '38%',
    gap: 14,
  },
  masterColumnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  masterColumnTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  searchBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    ...Platform.select({
      web: {
        boxShadow: 'inset 2px 2px 5px rgba(0, 0, 0, 0.45)',
      } as any,
    }),
  },
  searchBoxIcon: {
    fontSize: 14,
  },
  searchBoxInput: {
    flex: 1,
    fontSize: 13,
  },
  searchClearBtnText: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  subFamilyListScroll: {
    maxHeight: 680,
    minHeight: 200,
  },
  subFamilyMasterCardWrapper: {
    marginBottom: 10,
  },
  subFamilyMasterCard: {
    padding: 14,
    gap: 8,
  },
  sfMasterCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sfMasterCardName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  sfMasterCardSub: {
    fontSize: 11,
  },
  sfQuickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  sfQuickSettleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
  },
  sfQuickSettleBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
  sfQuickReopenBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  sfQuickReopenBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
  sfQuickDeleteBtn: {
    padding: 6,
    borderRadius: Radii.sm,
  },
  badgePaidMaster: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgePaidMasterText: {
    fontSize: 10,
    fontWeight: '500',
  },
  badgeRefundSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeRefundSmallText: {
    fontSize: 10,
    fontWeight: '500',
  },
  badgeOwedSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeOwedSmallText: {
    fontSize: 10,
    fontWeight: '500',
  },
  badgeSettledSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeSettledSmallText: {
    fontSize: 10,
    fontWeight: '500',
  },
  detailColumn: {
    flex: 1,
  },
  mobileLayoutContainer: {
    gap: 12,
  },
  mobileListContainer: {
    gap: 12,
  },
  mobileCardsList: {
    gap: 10,
  },
  mobileFamilyCard: {
    padding: 16,
    gap: 12,
  },
  mobileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  mobileCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  mobileChevron: {
    fontSize: 20,
    fontWeight: '500',
  },
  mobileCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  mobileActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileDetailWrapper: {
    marginTop: 4,
  },
  badgeRefund: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeRefundText: {
    fontSize: 11,
    fontWeight: '500',
  },
  badgeOwed: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeOwedText: {
    fontSize: 11,
    fontWeight: '500',
  },
  badgeSettled: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeSettledText: {
    fontSize: 11,
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 13,
    marginTop: 2,
  },
  secondaryHeaderButton: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radii.md,
  },
  secondaryHeaderButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  primaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  familiesContainer: {
    gap: 16,
    marginTop: 10,
    minHeight: 180,
  },
  familySectionCard: {
    overflow: 'hidden',
  },
  familySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  familyTitleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  collapseArrow: {
    fontSize: 12,
  },
  familyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  familyCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  familyHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  familyToggleAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  familyToggleAllText: {
    fontSize: 11,
    fontWeight: '500',
  },
  familySettleHeaderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  familySettleHeaderBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
  familyReopenHeaderBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  familyReopenHeaderBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
  familyDeleteHeaderBtn: {
    padding: 6,
    borderRadius: Radii.sm,
  },
  familyMembersList: {
    padding: 16,
    gap: 12,
  },
  memberCard: {
    padding: 14,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: 10,
  },
  memberCardAbsent: {
    opacity: 0.55,
  },
  memberHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  textMutedName: {
    textDecorationLine: 'line-through',
  },
  memberQuotaSub: {
    fontSize: 12,
    marginTop: 4,
  },
  attendanceControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attendanceToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  attendanceBtnActive: {},
  attendanceBtnInactive: {},
  attendanceBtnText: {
    fontSize: 11,
  },
  attendanceBtnTextActive: {
    fontWeight: '600',
  },
  attendanceBtnTextInactive: {
    fontWeight: '400',
  },
  deleteMemberIcon: {
    padding: 6,
    borderRadius: Radii.sm,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '400',
  },
  daysSection: {
    borderTopWidth: 1,
    paddingTop: 10,
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  daysLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  toggleAllText: {
    fontSize: 12,
    fontWeight: '500',
  },
  daysChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  expensesList: {
    gap: 12,
    minHeight: 120,
  },
  expenseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  expenseCategoryIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseIconText: {
    fontSize: 22,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  expensePayer: {
    fontSize: 12,
    marginTop: 2,
  },
  boldText: {
    fontWeight: '600',
  },
  expenseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expenseAmount: {
    fontSize: 17,
    fontWeight: '600',
  },
  deleteIcon: {
    padding: 6,
    borderRadius: Radii.sm,
  },
  deleteIconText: {
    fontSize: 14,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: Radii.pill,
    gap: 8,
    zIndex: 99,
  },
  fabIcon: {
    fontSize: 18,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: Radii.xl,
    borderWidth: 1,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 380,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 25, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
  },
  modalCardTablet: {
    maxWidth: 560,
  },
  modalCardContent: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseText: {
    fontSize: 18,
    padding: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  subFamilySuggestions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  subFamilyChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
    borderWidth: 1,
    marginRight: 6,
  },
  subFamilyChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  categorySelectors: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  secondaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

