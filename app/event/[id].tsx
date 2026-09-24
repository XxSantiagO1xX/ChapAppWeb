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
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormatCurrency, Radii, Fonts } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import type { EventConfig, Participant, Expense, CategoryType, DirectoryParticipant } from '../../types';

const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

const EXPENSE_CATEGORIES = [
  { id: 'Comida', label: 'Comida', icon: 'food' as const },
  { id: 'Gastos Generales', label: 'Gastos Generales', icon: 'bank' as const },
  { id: 'Varios', label: 'Varios', icon: 'receipt' as const },
  { id: 'Rentas', label: 'Rentas', icon: 'home' as const },
  { id: 'Mejoras', label: 'Mejoras', icon: 'trending-up' as const },
];
import {
  getEventById,
  updateEvent,
  archiveEvent,
  generateId,
  toggleParticipantSettlement,
  toggleParticipantAttendance,
  updateParticipantCategory,
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
import { ConfirmModal } from '../../components/ConfirmModal';
import { AmbientBackground } from '../../components/AmbientBackground';
import { generateEventReportPlainText } from '../../utils/reportGenerator';

export default function EventDetailDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width >= 768;
  const isSmallPhone = width < 420;
  const { colors, isDark, toggleTheme, getNeonGlow } = useTheme();

  const [event, setEvent] = useState<EventConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'participants' | 'expenses'>('summary');

  // Menú Lateral Colapsable Estático (Estilo iPadOS / Web)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

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

  // Modal de confirmación estilizado
  const [confirmConfig, setConfirmConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'success' | 'teal' | 'primary';
    icon?: any;
    onConfirm: () => void | Promise<void>;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

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

  // Alternar o cambiar tarifa/rol de un participante ('adulto' 1.0 <-> 'nino' 0.5) con recálculo en tiempo real
  const handleToggleParticipantRole = async (participantId: string) => {
    if (!event) return;
    const participant = event.participants.find((p) => p.id === participantId);
    if (!participant) return;

    const newCategory: CategoryType = participant.category === 'nino' ? 'adulto' : 'nino';
    const newWeight = newCategory === 'nino' ? 0.5 : 1.0;

    const previousEvent = event;
    const updatedParticipants = event.participants.map((p) => {
      if (p.id === participantId) {
        return {
          ...p,
          category: newCategory,
          weight: newWeight,
        };
      }
      return p;
    });

    // 1. Actualización de estado local reactiva e inmediata (recalcula automáticamente todas las métricas)
    setEvent({ ...event, participants: updatedParticipants });

    // 2. Persistencia en base de datos
    try {
      const updated = await updateParticipantCategory(event.id, participantId, newCategory, newWeight);
      if (updated) {
        setEvent(updated);
      }
    } catch (err: any) {
      console.error('[ToggleParticipantRole] Error:', err);
      setEvent(previousEvent);
      Alert.alert('Error', 'No se pudo actualizar la tarifa en el servidor.');
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

  // Subfamilias: Eliminar en cascada
  const handleDeleteSubFamily = (subFamilyName: string, passedCount?: number) => {
    if (!event) return;
    const membersInFamily = event.participants.filter(
      (p) => (p.subFamily || 'Familia General').trim() === subFamilyName.trim()
    );
    const count = passedCount !== undefined ? passedCount : membersInFamily.length;

    setConfirmConfig({
      visible: true,
      title: 'Eliminar Subfamilia',
      message: `¿Deseas eliminar permanentemente a "${subFamilyName}"?\n\nEsta acción borrará en cascada a sus ${count} integrante${count === 1 ? '' : 's'} y recalculará las cuotas y el balance general de todo el evento.`,
      confirmText: 'Eliminar en Cascada',
      variant: 'danger',
      icon: 'trash',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const updated = await deleteSubFamily(event.id, subFamilyName);
          if (updated) {
            setEvent(updated);
            if (selectedSubFamily === subFamilyName && updated.participants.length > 0) {
              setSelectedSubFamily(updated.participants[0].subFamily || 'Familia General');
            }
          }
          setConfirmConfig((prev) => ({ ...prev, visible: false }));
        } catch (err: any) {
          console.error('[DeleteSubFamily] Error:', err);
          setConfirmConfig((prev) => ({ ...prev, visible: false }));
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  // Participantes: Eliminar individual
  const handleDeleteParticipant = async (partId: string, name: string) => {
    if (!event) return;

    setConfirmConfig({
      visible: true,
      title: 'Eliminar Participante',
      message: `¿Deseas eliminar a "${name}" de este evento?\n\nSe removerá de las cuotas y los cálculos contables en la base de datos.`,
      confirmText: 'Eliminar',
      variant: 'danger',
      icon: 'trash',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const updated = await deleteParticipant(event.id, partId);
          if (updated) {
            setEvent(updated);
          }
          setConfirmConfig((prev) => ({ ...prev, visible: false }));
        } catch (err: any) {
          console.error('[DeleteParticipant] Error:', err);
          setConfirmConfig((prev) => ({ ...prev, visible: false }));
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  // Gastos: Agregar nuevo manual
  const handleAddExpense = async () => {
    if (!event) return;
    const amountNum = parseFloat(expAmount);
    if (!expTitle.trim() || isNaN(amountNum) || amountNum <= 0) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Datos inválidos: Ingresa un concepto y un monto válido mayor a 0.');
      } else {
        Alert.alert('Datos inválidos', 'Ingresa un concepto y un monto válido.');
      }
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
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`¡Gasto Guardado! Se registró "${savedExpense.title}" exitosamente.`);
      } else {
        Alert.alert('¡Gasto Guardado!', `Se registró "${savedExpense.title}" exitosamente.`);
      }
    } catch (err: any) {
      console.error('[AddExpense] Error al guardar gasto:', err);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Error al guardar gasto: ${err?.message || 'No se pudo registrar el gasto en Supabase.'}`);
      } else {
        Alert.alert('Error al guardar gasto', err?.message || 'No se pudo registrar el gasto en Supabase.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Gastos: Eliminar (Compatible con Web y Móvil con Actualización Optimista)
  const handleDeleteExpense = async (expId: string, title: string) => {
    if (!event) return;

    setConfirmConfig({
      visible: true,
      title: 'Eliminar Gasto',
      message: `¿Deseas eliminar el gasto "${title}"?\n\nSe eliminará de la base de datos y se recalculará el balance del evento.`,
      confirmText: 'Eliminar',
      variant: 'danger',
      icon: 'trash',
      onConfirm: async () => {
        setConfirmLoading(true);
        // 1. Actualización optimista instantánea
        const previousExpenses = event.expenses;
        setEvent({
          ...event,
          expenses: event.expenses.filter((e) => e.id !== expId),
        });
        setConfirmConfig((prev) => ({ ...prev, visible: false }));

        try {
          const updated = await deleteExpense(event.id, expId);
          if (updated) {
            setEvent(updated);
          }
        } catch (err: any) {
          console.error('[DeleteExpense] Error al eliminar gasto:', err);
          // Revertir en caso de fallo
          setEvent((prev) => (prev ? { ...prev, expenses: previousExpenses } : null));
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(`Error al eliminar gasto: ${err?.message || 'No se pudo eliminar el gasto en Supabase.'}`);
          } else {
            Alert.alert('Error al eliminar gasto', err?.message || 'No se pudo eliminar el gasto.');
          }
        } finally {
          setConfirmLoading(false);
        }
      },
    });
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
          <Text style={[styles.primaryButtonText, { color: isDark ? '#0D1117' : '#FFFFFF' }]}>Volver al Inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AmbientBackground />
      {/* Barra de Encabezado Superior Flotante (Opción A) */}
      <View
        style={[
          styles.topHeader,
          isTablet && styles.topHeaderTablet,
          {
            marginTop:
              Platform.OS === 'web'
                ? isTablet ? 20 : 12
                : Math.max(insets.top, 12) + (isTablet ? 8 : 4),
            backgroundColor: isDark ? 'rgba(13, 20, 32, 0.60)' : 'rgba(255, 255, 255, 0.65)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(226, 232, 240, 0.90)',
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.98)',
            ...(Platform.OS === 'web'
              ? ({
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  boxShadow: isDark
                    ? '0 12px 32px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.14)'
                    : '0 10px 30px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
                } as any)
              : {
                  shadowColor: isDark ? '#000000' : '#0F172A',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.35 : 0.08,
                  shadowRadius: 12,
                  elevation: 5,
                }),
          },
        ]}
      >
        <View style={[styles.headerLeft, isSmallPhone && { gap: 8, flex: 1 }]}>
          <TouchableOpacity
            style={[
              styles.backButton,
              isSmallPhone && { paddingHorizontal: 8, paddingVertical: 6 },
              { backgroundColor: colors.surfaceSubtle, flexDirection: 'row', alignItems: 'center', gap: 4 }
            ]}
            onPress={() => router.push('/')}
          >
            <SculptedIcon name="arrow-left" size={13} variant="plain" color={colors.textPrimary} />
            {!isSmallPhone && <Text style={[styles.backButtonText, { color: colors.textPrimary }]}>Inicio</Text>}
          </TouchableOpacity>
          <View style={{ flexShrink: 1 }}>
            <View style={styles.titleRow}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.eventTitle, isSmallPhone && { fontSize: 16 }, { color: colors.textPrimary }]}
              >
                {event.title}
              </Text>
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
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.eventSubtitle, { color: colors.textSecondary }]}
            >
              Año {event.year} • {totals?.totalAttendingCount || 0} Asistentes • {totals?.subFamilies.length || 0} Familias
            </Text>
          </View>
        </View>

        <View style={[styles.headerActions, isSmallPhone && { gap: 6 }]}>
          {/* Botón de Cambio de Tema */}
          <TouchableOpacity
            onPress={toggleTheme}
            activeOpacity={0.8}
            accessibilityLabel={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            <SculptedIcon
              name={isDark ? 'moon' : 'sun'}
              size={isSmallPhone ? 16 : 18}
              containerSize={isSmallPhone ? 34 : 40}
              variant="sunken"
              glow={isDark}
              accentColor={colors.neonAmber}
              color={isDark ? colors.neonAmber : colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.cutReportButton,
              isSmallPhone && { paddingHorizontal: 10, paddingVertical: 6 },
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.primaryBorder,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              },
            ]}
            onPress={() => setIsCutModalOpen(true)}
            activeOpacity={0.8}
          >
            <SculptedIcon name="receipt" size={14} variant="plain" color={colors.primaryText} />
            <Text style={[styles.cutReportButtonText, isSmallPhone && { fontSize: 12 }, { color: colors.primaryText }]}>
              {isSmallPhone ? 'Corte' : 'Corte General'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              isSmallPhone && { paddingHorizontal: 8, paddingVertical: 6 },
              {
                backgroundColor: event.isArchived ? colors.primaryLight : colors.surfaceSubtle,
                borderColor: event.isArchived ? colors.primaryBorder : colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              },
            ]}
            onPress={handleToggleArchive}
          >
            <SculptedIcon
              name={event.isArchived ? 'unarchive' : 'archive'}
              size={13}
              variant="plain"
              color={colors.textPrimary}
            />
            {isTablet && (
              <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
                {event.isArchived ? 'Desarchivar' : 'Archivar'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenido Principal Responsivo con Floating Capsule Sidebar (Image 3 Concept) */}
      <View style={[styles.dashboardLayout, isTablet && styles.dashboardLayoutTablet]}>
        {/* Barra lateral flotante en forma de cápsula (En tablet: lateral; En móvil: barra inferior flotante, oculta en detalle de ticket) */}
        {(!mobileDetailOpen || isTablet) && (
          <View
            style={[
              styles.floatingCapsuleSidebar,
              isTablet
                ? (isSidebarCollapsed ? styles.capsuleTabletCollapsed : styles.capsuleTabletExpanded)
                : [styles.capsuleMobileBottom, { bottom: Math.max(insets.bottom, 12) }],
              {
                backgroundColor: isDark ? 'rgba(13, 20, 32, 0.65)' : 'rgba(255, 255, 255, 0.70)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(226, 232, 240, 0.90)',
                borderTopColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.98)',
                ...(Platform.OS === 'web'
                  ? ({
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      boxShadow: isDark
                        ? '0 12px 36px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.16)'
                        : '0 10px 30px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
                    } as any)
                  : {
                      shadowColor: isDark ? '#000000' : '#0F172A',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isDark ? 0.35 : 0.08,
                      shadowRadius: 12,
                      elevation: 8,
                    }),
              },
            ]}
          >
            {/* Botón para Colapsar / Expandir Barra Lateral (Solo Tablet) */}
            {isTablet && (
              <TouchableOpacity
                style={[
                  styles.capsuleToggleBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
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
              </TouchableOpacity>
            )}

            {/* Grupo de Tabs en Cápsula */}
            <View style={[styles.capsuleTabsGroup, !isTablet && styles.capsuleTabsGroupMobile]}>
              {/* Tab 1: Corte y Tickets (Chart) */}
              <TouchableOpacity
                style={[
                  styles.capsuleTabItem,
                  isTablet
                    ? isSidebarCollapsed ? styles.capsuleTabItemCollapsed : styles.capsuleTabItemExpanded
                    : styles.capsuleTabItemMobile,
                  activeTab === 'summary' && [
                    styles.capsuleTabActiveSquircle,
                    {
                      backgroundColor: isDark ? 'rgba(0, 240, 255, 0.16)' : 'rgba(2, 132, 199, 0.12)',
                      borderColor: isDark ? 'rgba(0, 240, 255, 0.45)' : 'rgba(2, 132, 199, 0.35)',
                      ...(isDark && Platform.OS === 'web'
                        ? ({ boxShadow: '0 0 16px rgba(0, 240, 255, 0.35)' } as any)
                        : {}),
                    },
                  ],
                ]}
                onPress={() => {
                  setActiveTab('summary');
                  setMobileDetailOpen(false);
                }}
              >
                <View style={styles.capsuleIconContainer}>
                  <SculptedIcon
                    name="chart"
                    size={isTablet ? 19 : 17}
                    variant="plain"
                    color={activeTab === 'summary' ? (isDark ? '#00F0FF' : '#0284C7') : colors.textMuted}
                  />
                </View>
                {(!isSidebarCollapsed || !isTablet) && (
                  <View style={[styles.capsuleTextWrapper, !isTablet && { alignItems: 'center' }]}>
                    <Text
                      style={[
                        styles.capsuleTabTitle,
                        !isTablet && { fontSize: 10, marginTop: 1 },
                        {
                          color: activeTab === 'summary' ? (isDark ? '#00F0FF' : '#0284C7') : colors.textPrimary,
                          fontFamily: activeTab === 'summary' ? Fonts.bold : Fonts.medium,
                        },
                      ]}
                    >
                      {isTablet ? 'Corte y Tickets' : 'Corte & POS'}
                    </Text>
                    {isTablet && !isSidebarCollapsed && (
                      <Text style={[styles.capsuleTabSub, { color: colors.textSecondary }]}>
                        Métricas & POS
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>

              {/* Tab 2: Subfamilias y Asistencia (Users) */}
              <TouchableOpacity
                style={[
                  styles.capsuleTabItem,
                  isTablet
                    ? isSidebarCollapsed ? styles.capsuleTabItemCollapsed : styles.capsuleTabItemExpanded
                    : styles.capsuleTabItemMobile,
                  activeTab === 'participants' && [
                    styles.capsuleTabActiveSquircle,
                    {
                      backgroundColor: isDark ? 'rgba(0, 240, 255, 0.16)' : 'rgba(2, 132, 199, 0.12)',
                      borderColor: isDark ? 'rgba(0, 240, 255, 0.45)' : 'rgba(2, 132, 199, 0.35)',
                      ...(isDark && Platform.OS === 'web'
                        ? ({ boxShadow: '0 0 16px rgba(0, 240, 255, 0.35)' } as any)
                        : {}),
                    },
                  ],
                ]}
                onPress={() => setActiveTab('participants')}
              >
                <View style={styles.capsuleIconContainer}>
                  <SculptedIcon
                    name="users"
                    size={isTablet ? 19 : 17}
                    variant="plain"
                    color={activeTab === 'participants' ? (isDark ? '#00F0FF' : '#0284C7') : colors.textMuted}
                  />
                </View>
                {(!isSidebarCollapsed || !isTablet) && (
                  <View style={[styles.capsuleTextWrapper, !isTablet && { alignItems: 'center' }]}>
                    <Text
                      style={[
                        styles.capsuleTabTitle,
                        !isTablet && { fontSize: 10, marginTop: 1 },
                        {
                          color: activeTab === 'participants' ? (isDark ? '#00F0FF' : '#0284C7') : colors.textPrimary,
                          fontFamily: activeTab === 'participants' ? Fonts.bold : Fonts.medium,
                        },
                      ]}
                    >
                      Subfamilias
                    </Text>
                    {isTablet && !isSidebarCollapsed && (
                      <Text style={[styles.capsuleTabSub, { color: colors.textSecondary }]}>
                        {totals?.totalAttendingCount}/{event.participants.length} asistentes
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>

              {/* Tab 3: Gastos e Insumos (Cart) */}
              <TouchableOpacity
                style={[
                  styles.capsuleTabItem,
                  isTablet
                    ? isSidebarCollapsed ? styles.capsuleTabItemCollapsed : styles.capsuleTabItemExpanded
                    : styles.capsuleTabItemMobile,
                  activeTab === 'expenses' && [
                    styles.capsuleTabActiveSquircle,
                    {
                      backgroundColor: isDark ? 'rgba(0, 240, 255, 0.16)' : 'rgba(2, 132, 199, 0.12)',
                      borderColor: isDark ? 'rgba(0, 240, 255, 0.45)' : 'rgba(2, 132, 199, 0.35)',
                      ...(isDark && Platform.OS === 'web'
                        ? ({ boxShadow: '0 0 16px rgba(0, 240, 255, 0.35)' } as any)
                        : {}),
                    },
                  ],
                ]}
                onPress={() => setActiveTab('expenses')}
              >
                <View style={styles.capsuleIconContainer}>
                  <SculptedIcon
                    name="cart"
                    size={isTablet ? 19 : 17}
                    variant="plain"
                    color={activeTab === 'expenses' ? (isDark ? '#00F0FF' : '#0284C7') : colors.textMuted}
                  />
                </View>
                {(!isSidebarCollapsed || !isTablet) && (
                  <View style={[styles.capsuleTextWrapper, !isTablet && { alignItems: 'center' }]}>
                    <Text
                      style={[
                        styles.capsuleTabTitle,
                        !isTablet && { fontSize: 10, marginTop: 1 },
                        {
                          color: activeTab === 'expenses' ? (isDark ? '#00F0FF' : '#0284C7') : colors.textPrimary,
                          fontFamily: activeTab === 'expenses' ? Fonts.bold : Fonts.medium,
                        },
                      ]}
                    >
                      Gastos
                    </Text>
                    {isTablet && !isSidebarCollapsed && (
                      <Text style={[styles.capsuleTabSub, { color: colors.textSecondary }]}>
                        {event.expenses.length} compra{event.expenses.length === 1 ? '' : 's'}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

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
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.35)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.65)',
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <View style={styles.kpiHeaderRow}>
                      <Text style={[styles.heroMetricLabel, { color: colors.primary }]}>
                        TOTAL GASTADO
                      </Text>
                      <SculptedIcon
                        name="wallet"
                        size={14}
                        containerSize={28}
                        variant="sunken"
                        glow={false}
                        accentColor={colors.primary}
                        color={colors.primary}
                      />
                    </View>
                    <Text style={[styles.heroMetricValue, { color: colors.textPrimary }]}>
                      {FormatCurrency(totals.totalExpenses)}
                    </Text>
                    <Text style={[styles.heroMetricSub, { color: colors.textSecondary }]}>
                      {FormatCurrency(totals.costPerUnit)}/día base
                    </Text>
                  </View>

                  {/* Recaudado (Menta Pastel Suave) */}
                  <View
                    style={[
                      styles.heroMetricItem,
                      {
                        backgroundColor: isDark ? 'rgba(0, 229, 153, 0.08)' : 'rgba(16, 185, 129, 0.10)',
                        borderColor: isDark ? 'rgba(0, 229, 153, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <View style={styles.kpiHeaderRow}>
                      <Text style={[styles.heroMetricLabel, { color: colors.successText }]}>
                        RECAUDADO
                      </Text>
                      <SculptedIcon
                        name="trending-up"
                        size={14}
                        containerSize={28}
                        variant="sunken"
                        glow={false}
                        accentColor={colors.success}
                        color={colors.successText}
                      />
                    </View>
                    <Text style={[styles.heroMetricValue, { color: colors.successText }]}>
                      {FormatCurrency(totals.totalCollected)}
                    </Text>
                    <View
                      style={[
                        styles.kpiPillSuccess,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.45)',
                          borderColor: colors.successBorder,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Text style={[styles.kpiPillSuccessText, { color: colors.successText }]}>
                        {collectedPercent}% de la meta
                      </Text>
                    </View>
                  </View>

                  {/* Pendiente (Melocotón Suave / Ámbar Pastel) */}
                  <View
                    style={[
                      styles.heroMetricItem,
                      {
                        backgroundColor: totals.totalPendingToCollect > 0 ? (isDark ? 'rgba(244, 63, 94, 0.08)' : 'rgba(244, 63, 94, 0.10)') : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.35)'),
                        borderColor: totals.totalPendingToCollect > 0 ? (isDark ? 'rgba(244, 63, 94, 0.25)' : 'rgba(244, 63, 94, 0.25)') : (isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.65)'),
                        borderWidth: 1,
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
                                ? colors.warningText
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
                        glow={false}
                        accentColor={colors.warning}
                        color={
                          totals.totalPendingToCollect > 0
                            ? colors.warningText
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
                              ? colors.warningText
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
                              ? colors.warningText
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {pendingFamiliesCount} familia{pendingFamiliesCount === 1 ? '' : 's'} pendiente
                    </Text>
                  </View>

                  {/* En Caja (Menta Pastel / Azul Acero) */}
                  <View
                    style={[
                      styles.heroMetricItem,
                      {
                        backgroundColor: isDark ? 'rgba(0, 240, 255, 0.08)' : 'rgba(6, 182, 212, 0.10)',
                        borderColor: isDark ? 'rgba(0, 240, 255, 0.25)' : 'rgba(6, 182, 212, 0.25)',
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <View style={styles.kpiHeaderRow}>
                      <Text style={[styles.heroMetricLabel, { color: colors.successText }]}>
                        EN CAJA
                      </Text>
                      <SculptedIcon
                        name="bank"
                        size={14}
                        containerSize={28}
                        variant="sunken"
                        glow={false}
                        accentColor={colors.success}
                        color={colors.successText}
                      />
                    </View>
                    <Text style={[styles.heroMetricValue, { color: colors.successText }]}>
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
                            backgroundColor: colors.surfaceSubtle,
                            borderColor: colors.border,
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
                                      isOwed
                                        ? {
                                            backgroundColor: colors.warning,
                                          }
                                        : isRefund
                                        ? {
                                            backgroundColor: colors.teal,
                                          }
                                        : {
                                            backgroundColor: colors.primary,
                                          },
                                      {
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                      },
                                    ]}
                                    onPress={(e) => {
                                      handleSettleSubFamily(sf.subFamilyName, true);
                                    }}
                                  >
                                    <SculptedIcon
                                      name={isOwed ? 'wallet' : isRefund ? 'bank' : 'check'}
                                      size={11}
                                      variant="plain"
                                      color={isDark ? '#0D1117' : '#FFFFFF'}
                                    />
                                    <Text style={[styles.sfQuickSettleBtnText, { color: isDark ? '#0D1117' : '#FFFFFF' }]}>
                                      {isOwed ? 'Cobrar' : isRefund ? 'Reembolsar' : 'Saldar'}
                                    </Text>
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
                        onToggleParticipantRole={handleToggleParticipantRole}
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
                              backgroundColor: colors.surfaceSubtle,
                              borderColor: colors.border,
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
                                          backgroundColor: colors.warningLight,
                                          borderColor: colors.warningBorder,
                                        },
                                      ]}
                                    >
                                      <Text style={[styles.badgeOwedText, { color: colors.warningText }]}>
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
                                          },
                                        ]}
                                        onPress={() => {
                                          handleSettleSubFamily(sf.subFamilyName, true);
                                        }}
                                      >
                                        <SculptedIcon name="check" size={12} variant="plain" color={isDark ? '#0D1117' : '#FFFFFF'} />
                                        <Text style={[styles.sfQuickSettleBtnText, { color: isDark ? '#0D1117' : '#FFFFFF' }]}>Liquidar</Text>
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
                          onToggleParticipantRole={handleToggleParticipantRole}
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
                      },
                    ]}
                    onPress={() => {
                      setPartName('');
                      setPartCategory('adulto');
                      setPartWeight('1.0');
                      setIsParticipantModalOpen(true);
                    }}
                  >
                    <SculptedIcon name="plus" size={14} variant="plain" color={isDark ? '#0D1117' : '#FFFFFF'} />
                    <Text style={[styles.primaryButtonText, { color: isDark ? '#0D1117' : '#FFFFFF' }]}>Agregar Integrante</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Barra de Búsqueda Predictiva */}
              <View
                style={[
                  styles.searchBoxContainer,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
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
                                },
                              ]}
                              onPress={() => handleSettleSubFamily(familyName, true)}
                            >
                              <SculptedIcon name="check" size={12} variant="plain" color={isDark ? '#0D1117' : '#FFFFFF'} />
                              <Text style={[styles.familySettleHeaderBtnText, { color: isDark ? '#0D1117' : '#FFFFFF' }]}>Liquidar</Text>
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
                                      <TouchableOpacity
                                        style={[
                                          styles.categoryPill,
                                          {
                                            backgroundColor: p.category === 'nino' ? colors.purpleLight : colors.primaryLight,
                                            borderColor: p.category === 'nino' ? colors.purpleBorder : colors.primaryBorder,
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
                                        onPress={() => handleToggleParticipantRole(p.id)}
                                        activeOpacity={0.7}
                                        accessibilityLabel={`Cambiar categoría de ${p.name}, actualmente ${p.category === 'nino' ? 'Niño (0.5)' : 'Adulto (1.0)'}`}
                                        accessibilityHint="Presiona para cambiar tarifa entre Adulto y Niño"
                                      >
                                        <SculptedIcon
                                          name={p.category === 'nino' ? 'child' : 'user'}
                                          size={11}
                                          variant="plain"
                                          color={p.category === 'nino' ? (isDark ? colors.neonPurple : colors.purple) : colors.primary}
                                        />
                                        <Text
                                          style={[
                                            styles.categoryPillText,
                                            {
                                              color: p.category === 'nino' ? (isDark ? colors.neonPurple : colors.purple) : colors.primary,
                                              fontWeight: '600',
                                            },
                                          ]}
                                        >
                                          {p.category === 'nino' ? 'Niño (0.5)' : 'Adulto (1.0)'}
                                        </Text>
                                        <SculptedIcon
                                          name="refresh"
                                          size={9}
                                          variant="plain"
                                          color={p.category === 'nino' ? (isDark ? colors.neonPurple : colors.purple) : colors.primary}
                                        />
                                      </TouchableOpacity>
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
                        ...(isDark ? getNeonGlow(colors.neonGreen, 'low') : {}),
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
                    <SculptedIcon name="plus" size={14} variant="plain" color={isDark ? '#0D1117' : '#FFFFFF'} />
                    <Text style={[styles.primaryButtonText, { color: isDark ? '#0D1117' : '#FFFFFF' }]}>Registrar Gasto</Text>
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
                        : exp.category === 'Bebidas' || exp.category === 'Comida'
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
            ...(isDark ? getNeonGlow(colors.neonGreen, 'medium') : {}),
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
        <SculptedIcon name="plus" size={16} variant="plain" color={isDark ? '#0D1117' : '#FFFFFF'} />
        <Text style={[styles.fabText, { color: isDark ? '#0D1117' : '#FFFFFF', fontWeight: '700' }]}>+ Gasto Rápido</Text>
      </TouchableOpacity>

      {/* Modal: Captura Rápida de Gastos */}
      <QuickExpenseModal
        visible={isQuickExpenseOpen}
        participants={event.participants}
        onClose={() => setIsQuickExpenseOpen(false)}
        onSaveExpense={handleSaveQuickExpense}
      />

      {/* Modal: Agregar Participante */}
      <Modal
        visible={isParticipantModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsParticipantModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[
            styles.modalBackdrop,
            { backgroundColor: isDark ? 'rgba(20, 18, 16, 0.75)' : 'rgba(20, 18, 16, 0.40)' },
          ]}
        >
          <TouchableOpacity
            style={styles.modalBackdropTouchable}
            activeOpacity={1}
            onPress={() => setIsParticipantModalOpen(false)}
          />

          <View
            style={[
              styles.modalCard,
              isTablet && styles.modalCardTablet,
              {
                backgroundColor: colors.surface,
                borderWidth: 0,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isDark ? 0.45 : 0.3,
                shadowRadius: 18,
                elevation: 10,
              },
            ]}
          >
            {/* Header del Modal */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <View style={styles.modalHeaderTitleGroup}>
                <SculptedIcon
                  name="user"
                  size={18}
                  containerSize={38}
                  variant="sunken"
                  glow={isDark}
                  accentColor={colors.primary}
                  color={colors.primary}
                />
                <View>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
                    Agregar Integrante
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary, fontFamily: Fonts.regular }]}>
                    Nuevo integrante para el reparto de gastos
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsParticipantModalOpen(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <SculptedIcon name="close" size={16} variant="plain" color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBodyScroll}
              contentContainerStyle={styles.modalBodyScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Tarjeta de Previsualización en Vivo (Hero Card) */}
              <View
                style={[
                  styles.participantPreviewCard,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.participantPreviewAvatar,
                    {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text style={[styles.participantPreviewAvatarText, { color: colors.primary, fontFamily: Fonts.bold }]}>
                    {getInitials(partName)}
                  </Text>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={[
                      styles.participantPreviewName,
                      { color: partName.trim() ? colors.textPrimary : colors.textMuted, fontFamily: Fonts.bold },
                    ]}
                    numberOfLines={1}
                  >
                    {partName.trim() || 'Nombre del integrante'}
                  </Text>
                  <View style={styles.participantPreviewMetaRow}>
                    <SculptedIcon name="family" size={12} variant="plain" color={colors.textSecondary} />
                    <Text style={[styles.participantPreviewSub, { color: colors.textSecondary, fontFamily: Fonts.regular }]} numberOfLines={1}>
                      {partSubFamily.trim() || 'Familia General'}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.participantPreviewCategoryBadge,
                    {
                      backgroundColor: partCategory === 'adulto' ? colors.primaryLight : colors.purpleLight,
                      borderColor: partCategory === 'adulto' ? colors.primaryBorder : colors.purpleBorder,
                    },
                  ]}
                >
                  <SculptedIcon
                    name={partCategory === 'adulto' ? 'user' : 'child'}
                    size={11}
                    variant="plain"
                    color={partCategory === 'adulto' ? colors.primary : colors.purple}
                  />
                  <Text
                    style={[
                      styles.participantPreviewCategoryText,
                      {
                        color: partCategory === 'adulto' ? colors.primary : colors.purple,
                        fontFamily: Fonts.semiBold,
                      },
                    ]}
                  >
                    {partCategory === 'adulto' ? 'Adulto 1.0' : 'Niño 0.5'}
                  </Text>
                </View>
              </View>

              {/* 1. Nombre Completo */}
              <View style={styles.modalFieldGroup}>
                <Text style={[styles.modalFieldLabel, { color: colors.textPrimary, fontFamily: Fonts.semiBold }]}>
                  Nombre Completo
                </Text>
                <View
                  style={[
                    styles.modalInputWrapper,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <SculptedIcon name="user" size={15} variant="plain" color={colors.textMuted} />
                  <TextInput
                    style={[styles.modalTextInput, { color: colors.textPrimary, fontFamily: Fonts.regular }]}
                    placeholder="Ej. Juan Carlos Santiago"
                    value={partName}
                    onChangeText={setPartName}
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                  />
                  {partName.length > 0 && (
                    <TouchableOpacity onPress={() => setPartName('')}>
                      <SculptedIcon name="close" size={13} variant="plain" color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* 2. Subfamilia o Grupo Familiar */}
              <View style={styles.modalFieldGroup}>
                <Text style={[styles.modalFieldLabel, { color: colors.textPrimary, fontFamily: Fonts.semiBold }]}>
                  Subfamilia / Grupo Familiar
                </Text>
                <View
                  style={[
                    styles.modalInputWrapper,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <SculptedIcon name="family" size={15} variant="plain" color={colors.textMuted} />
                  <TextInput
                    style={[styles.modalTextInput, { color: colors.textPrimary, fontFamily: Fonts.regular }]}
                    placeholder="Ej. Familia Santiago Bustamante"
                    value={partSubFamily}
                    onChangeText={setPartSubFamily}
                    placeholderTextColor={colors.textMuted}
                  />
                  {partSubFamily.length > 0 && (
                    <TouchableOpacity onPress={() => setPartSubFamily('')}>
                      <SculptedIcon name="close" size={13} variant="plain" color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Sugerencias rápidas de subfamilias existentes */}
                {existingSubFamilies.length > 0 && (
                  <View style={styles.modalSuggestionsWrapper}>
                    <Text style={[styles.modalSuggestionsHint, { color: colors.textMuted, fontFamily: Fonts.medium }]}>
                      Sugerencias de familias en el evento:
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.modalSuggestionsScroll}
                    >
                      {existingSubFamilies.map((sf) => {
                        const isSelected = partSubFamily === sf;
                        return (
                          <TouchableOpacity
                            key={sf}
                            style={[
                              styles.modalSubFamilyChip,
                              {
                                backgroundColor: isSelected
                                  ? colors.primaryLight
                                  : colors.surfaceSubtle,
                                borderColor: isSelected
                                  ? colors.primary
                                  : colors.border,
                              },
                            ]}
                            onPress={() => setPartSubFamily(sf)}
                            activeOpacity={0.7}
                          >
                            <SculptedIcon
                              name={isSelected ? 'check' : 'family'}
                              size={11}
                              variant="plain"
                              color={isSelected ? colors.primary : colors.textSecondary}
                            />
                            <Text
                              style={[
                                styles.modalSubFamilyChipText,
                                {
                                  color: isSelected ? colors.primary : colors.textSecondary,
                                  fontFamily: isSelected ? Fonts.bold : Fonts.medium,
                                },
                              ]}
                            >
                              {sf}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* 3. Categoría y Ponderación */}
              <View style={styles.modalFieldGroup}>
                <Text style={[styles.modalFieldLabel, { color: colors.textPrimary, fontFamily: Fonts.semiBold }]}>
                  Categoría y Cuota
                </Text>
                <View style={styles.modalCategoryCardsRow}>
                  {[
                    {
                      key: 'adulto',
                      label: 'Adulto',
                      desc: '1.0 • Cuota Completa',
                      weight: '1.0',
                      icon: 'user' as const,
                    },
                    {
                      key: 'nino',
                      label: 'Niño',
                      desc: '0.5 • Media Cuota',
                      weight: '0.5',
                      icon: 'child' as const,
                    },
                  ].map((item) => {
                    const isSelected = partCategory === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.modalCategoryCard,
                          {
                            backgroundColor: isSelected
                              ? colors.primaryLight
                              : colors.surfaceSubtle,
                            borderColor: isSelected
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                        onPress={() => {
                          setPartCategory(item.key as CategoryType);
                          setPartWeight(item.weight);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.modalCategoryCardHeader}>
                          <View
                            style={[
                              styles.modalCategoryIconCircle,
                              {
                                backgroundColor: isSelected
                                  ? colors.primary
                                  : colors.surfaceSubtle,
                              },
                            ]}
                          >
                            <SculptedIcon
                              name={item.icon}
                              size={14}
                              variant="plain"
                              color={isSelected ? (isDark ? '#0D1117' : '#FFFFFF') : colors.textSecondary}
                            />
                          </View>
                          {isSelected && (
                            <View style={[styles.modalCategoryCheckBadge, { backgroundColor: colors.primary }]}>
                              <SculptedIcon name="check" size={10} variant="plain" color={isDark ? '#0D1117' : '#FFFFFF'} />
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.modalCategoryCardTitle,
                            {
                              color: isSelected ? colors.primary : colors.textPrimary,
                              fontFamily: isSelected ? Fonts.bold : Fonts.semiBold,
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={[
                            styles.modalCategoryCardDesc,
                            {
                              color: isSelected ? colors.primaryText : colors.textSecondary,
                              fontFamily: Fonts.regular,
                            },
                          ]}
                        >
                          {item.desc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Footer con Botones */}
            <View style={[styles.modalFooter, { borderTopColor: colors.borderLight }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => setIsParticipantModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary, fontFamily: Fonts.medium }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.45 : 0.25,
                    shadowRadius: 10,
                    elevation: 5,
                  },
                ]}
                onPress={handleAddParticipant}
                activeOpacity={0.8}
              >
                <SculptedIcon name="check" size={16} variant="plain" color={isDark ? '#0D1117' : '#FFFFFF'} />
                <Text style={[styles.modalSaveBtnText, { color: isDark ? '#0D1117' : '#FFFFFF', fontFamily: Fonts.bold }]}>
                  Guardar Integrante
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Registrar Gasto Completo */}
      <Modal
        visible={isExpenseModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsExpenseModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[
            styles.modalBackdrop,
            { backgroundColor: isDark ? 'rgba(20, 18, 16, 0.75)' : 'rgba(20, 18, 16, 0.40)' },
          ]}
        >
          <TouchableOpacity
            style={styles.modalBackdropTouchable}
            activeOpacity={1}
            onPress={() => setIsExpenseModalOpen(false)}
          />

          <View
            style={[
              styles.modalCard,
              isTablet && styles.modalCardTablet,
              {
                backgroundColor: colors.surface,
                borderWidth: 0,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isDark ? 0.45 : 0.3,
                shadowRadius: 18,
                elevation: 10,
              },
            ]}
          >
            {/* Header del Modal */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <View style={styles.modalHeaderTitleGroup}>
                <SculptedIcon
                  name="receipt"
                  size={18}
                  containerSize={38}
                  variant="sunken"
                  glow={isDark}
                  accentColor={colors.primary}
                  color={colors.primary}
                />
                <View>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
                    Registrar Nuevo Gasto
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary, fontFamily: Fonts.regular }]}>
                    Ingresa compras o insumos para prorrateo general
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsExpenseModalOpen(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <SculptedIcon name="close" size={16} variant="plain" color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBodyScroll}
              contentContainerStyle={styles.modalBodyScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* 1. Monto Numérico Gigante Inset */}
              <View
                style={[
                  styles.modalGiantAmountContainer,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.modalCurrencySymbol, { color: colors.primary, fontFamily: Fonts.bold }]}>$</Text>
                <TextInput
                  style={[styles.modalGiantAmountInput, { color: colors.textPrimary, fontFamily: Fonts.bold }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={expAmount}
                  onChangeText={setExpAmount}
                  autoFocus
                />
              </View>

              {/* 2. Concepto o Título */}
              <View style={styles.modalFieldGroup}>
                <Text style={[styles.modalFieldLabel, { color: colors.textPrimary, fontFamily: Fonts.semiBold }]}>
                  Concepto / ¿Qué se compró?
                </Text>
                <View
                  style={[
                    styles.modalInputWrapper,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <SculptedIcon name="receipt" size={15} variant="plain" color={colors.textMuted} />
                  <TextInput
                    style={[styles.modalTextInput, { color: colors.textPrimary, fontFamily: Fonts.regular }]}
                    placeholder="Ej. Supermercado día 1, Carnicería, Botanas..."
                    value={expTitle}
                    onChangeText={setExpTitle}
                    placeholderTextColor={colors.textMuted}
                  />
                  {expTitle.length > 0 && (
                    <TouchableOpacity onPress={() => setExpTitle('')}>
                      <SculptedIcon name="close" size={13} variant="plain" color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* 3. Rubro / Categoría (5 Opciones) */}
              <View style={styles.modalFieldGroup}>
                <Text style={[styles.modalFieldLabel, { color: colors.textPrimary, fontFamily: Fonts.semiBold }]}>
                  Rubro / Categoría
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.modalSuggestionsScroll}
                >
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const isSelected = expCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.modalSubFamilyChip,
                          {
                            backgroundColor: isSelected
                              ? colors.primaryLight
                              : colors.surfaceSubtle,
                            borderColor: isSelected
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                        onPress={() => setExpCategory(cat.id)}
                        activeOpacity={0.7}
                      >
                        <SculptedIcon
                          name={cat.icon}
                          size={13}
                          variant="plain"
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.modalSubFamilyChipText,
                            {
                              color: isSelected ? colors.primary : colors.textSecondary,
                              fontFamily: isSelected ? Fonts.bold : Fonts.medium,
                            },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 4. ¿Quién lo pagó? */}
              <View style={styles.modalFieldGroup}>
                <Text style={[styles.modalFieldLabel, { color: colors.textPrimary, fontFamily: Fonts.semiBold }]}>
                  ¿Quién lo pagó de su bolsillo?
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.modalSuggestionsScroll}
                >
                  {event.participants.map((p) => {
                    const activePayerId = expPaidBy || (event.participants[0]?.id ?? '');
                    const isSelected = activePayerId === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.modalSubFamilyChip,
                          {
                            backgroundColor: isSelected
                              ? colors.primaryLight
                              : colors.surfaceSubtle,
                            borderColor: isSelected
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                        onPress={() => setExpPaidBy(p.id)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              color: isSelected ? colors.primaryText : colors.textSecondary,
                              fontFamily: Fonts.bold,
                            }}
                          >
                            {getInitials(p.name)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.modalSubFamilyChipText,
                            {
                              color: isSelected ? colors.primary : colors.textSecondary,
                              fontFamily: isSelected ? Fonts.bold : Fonts.medium,
                            },
                          ]}
                        >
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>

            {/* Footer con Botones */}
            <View style={[styles.modalFooter, { borderTopColor: colors.borderLight }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => setIsExpenseModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary, fontFamily: Fonts.medium }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.45 : 0.25,
                    shadowRadius: 10,
                    elevation: 5,
                  },
                ]}
                onPress={handleAddExpense}
                activeOpacity={0.8}
              >
                <SculptedIcon name="check" size={16} variant="plain" color={isDark ? '#0D1117' : '#FFFFFF'} />
                <Text style={[styles.modalSaveBtnText, { color: isDark ? '#0D1117' : '#FFFFFF', fontFamily: Fonts.bold }]}>
                  Guardar Gasto
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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

      {/* Modal de confirmación estilizado para eliminaciones y acciones críticas */}
      <ConfirmModal
        visible={confirmConfig.visible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        icon={confirmConfig.icon}
        loading={confirmLoading}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, visible: false }))}
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
    marginHorizontal: 14,
    marginTop: Platform.OS === 'ios' ? 48 : 12,
    marginBottom: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: Radii.xl,
    borderWidth: 1,
    zIndex: 10,
  },
  topHeaderTablet: {
    marginHorizontal: 24,
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
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
  floatingCapsuleSidebar: {
    padding: 10,
    gap: 10,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  capsuleMobileBottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: Radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 100,
  },
  capsuleTabletCollapsed: {
    width: 68,
    borderRadius: Radii.pill,
    marginVertical: 18,
    marginLeft: 18,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    zIndex: 10,
  },
  capsuleTabletExpanded: {
    width: 230,
    borderRadius: Radii.xxl,
    marginVertical: 18,
    marginLeft: 18,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    zIndex: 10,
  },
  capsuleToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  capsuleTabsGroup: {
    gap: 8,
    width: '100%',
    alignItems: 'center',
  },
  capsuleTabsGroupMobile: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 4,
  },
  capsuleTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 4,
  },
  capsuleTabItemMobile: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  capsuleTabItemCollapsed: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capsuleTabItemExpanded: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 10,
  },
  capsuleTabActiveSquircle: {
    borderRadius: 14,
  },
  capsuleIconContainer: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleTextWrapper: {
    flex: 1,
  },
  capsuleTabTitle: {
    fontSize: 13,
  },
  capsuleTabSub: {
    fontSize: 11,
    marginTop: 1,
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
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      } as any,
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.10,
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
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  secondaryHeaderButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
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
    backgroundColor: 'rgba(20, 18, 16, 0.50)',
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
  modalBackdropTouchable: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalCard: {
    width: '92%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: Radii.xl,
    overflow: 'visible',
    borderWidth: 1,
  },
  modalCardTablet: {
    maxWidth: 520,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalTitle: {
    fontSize: 17,
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: Radii.pill,
  },
  modalBodyScroll: {
    maxHeight: 480,
  },
  modalBodyScrollContent: {
    padding: 20,
    gap: 16,
  },
  participantPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    gap: 12,
  },
  participantPreviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantPreviewAvatarText: {
    fontSize: 16,
  },
  participantPreviewName: {
    fontSize: 15,
  },
  participantPreviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  participantPreviewSub: {
    fontSize: 12,
  },
  participantPreviewCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  participantPreviewCategoryText: {
    fontSize: 11,
  },
  modalFieldGroup: {
    gap: 6,
  },
  modalFieldLabel: {
    fontSize: 13,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    ...Platform.select({
      web: {
        boxShadow: 'inset 1px 1px 3px rgba(0, 0, 0, 0.25)',
      } as any,
    }),
  },
  modalTextInput: {
    flex: 1,
    fontSize: 14,
  },
  modalSuggestionsWrapper: {
    marginTop: 6,
    gap: 6,
  },
  modalSuggestionsHint: {
    fontSize: 11,
  },
  modalSuggestionsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  modalSubFamilyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  modalSubFamilyChipText: {
    fontSize: 11,
  },
  modalCategoryCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCategoryCard: {
    flex: 1,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    padding: 14,
    gap: 6,
  },
  modalCategoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalCategoryIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCategoryCheckBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCategoryCardTitle: {
    fontSize: 14,
  },
  modalCategoryCardDesc: {
    fontSize: 11,
  },
  modalGiantAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radii.lg,
    borderWidth: 1,
    gap: 4,
    ...Platform.select({
      web: {
        boxShadow: 'inset 2px 2px 6px rgba(0, 0, 0, 0.35)',
      } as any,
    }),
  },
  modalCurrencySymbol: {
    fontSize: 28,
  },
  modalGiantAmountInput: {
    fontSize: 28,
    minWidth: 100,
    textAlign: 'center',
    padding: 0,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radii.md,
  },
  modalCancelBtnText: {
    fontSize: 13,
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radii.md,
  },
  modalSaveBtnText: {
    fontSize: 13,
  },
});

