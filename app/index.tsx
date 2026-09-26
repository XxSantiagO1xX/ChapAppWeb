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
  Platform,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormatCurrency, Radii, Fonts, NeumorphicShadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import type { EventConfig, DirectoryParticipant, Participant } from '../types';
import {
  getAllEvents,
  createEvent,
  archiveEvent,
  deleteEvent,
  generateId,
  initDB,
  subscribeToEventsListRealtime,
} from '../services/database';
import { calculateEventTotals } from '../utils/calculations';
import { GlobalDirectoryModal } from '../components/GlobalDirectoryModal';
import { GlassCard } from '../components/GlassCard';
import { SculptedIcon } from '../components/SculptedIcon';
import { ConfirmModal } from '../components/ConfirmModal';
import { AmbientBackground } from '../components/AmbientBackground';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

export default function HomeScreen() {
  const router = useRouter();
  const { isMobile, isTablet, isDesktop, isTabletOrDesktop, insets } = useResponsiveLayout();
  const isSmallPhone = isMobile;
  const { colors, isDark, toggleTheme, getLiquidGlass } = useTheme();

  const [events, setEvents] = useState<EventConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<'active' | 'archived' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Modal para Directorio Global
  const [isDirectoryModalOpen, setIsDirectoryModalOpen] = useState(false);

  // Estado del Modal para Nuevo Evento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newTitle, setNewTitle] = useState('');
  const [newDaysCount, setNewDaysCount] = useState('4');
  const [selectedDirectoryContacts, setSelectedDirectoryContacts] = useState<DirectoryParticipant[]>([]);
  const [isPickDirectoryForNewEventOpen, setIsPickDirectoryForNewEventOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Modal de confirmación estilizado
  const [confirmConfig, setConfirmConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
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

  const loadEvents = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      await initDB();
      const data = await getAllEvents();
      setEvents(data);
    } catch (error) {
      console.error('Error cargando eventos:', error);
    } finally {
      if (showLoadingSpinner) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Carga inicial y suscripción Realtime a eventos
  useEffect(() => {
    loadEvents(true);
    const unsubscribe = subscribeToEventsListRealtime(() => {
      loadEvents(false);
    });
    return () => {
      unsubscribe();
    };
  }, [loadEvents]);

  // Recarga automática al volver a enfocar la pantalla en iPadOS / iOS / Web
  useFocusEffect(
    useCallback(() => {
      loadEvents(false);
    }, [loadEvents])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents(false);
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (filterTab === 'active' && evt.isArchived) return false;
      if (filterTab === 'archived' && !evt.isArchived) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = evt.title.toLowerCase().includes(q);
        const matchesYear = evt.year.toString().includes(q);
        return matchesTitle || matchesYear;
      }
      return true;
    });
  }, [events, filterTab, searchQuery]);

  const activeCount = useMemo(() => events.filter((e) => !e.isArchived).length, [events]);
  const archivedCount = useMemo(() => events.filter((e) => e.isArchived).length, [events]);

  // Resumen ejecutivo global calculado sobre eventos activos
  const globalSummary = useMemo(() => {
    const activeEvents = events.filter((e) => !e.isArchived);
    let totalExpenses = 0;
    let totalParticipants = 0;
    const subFamilySet = new Set<string>();

    activeEvents.forEach((evt) => {
      const totals = calculateEventTotals(evt);
      totalExpenses += totals.totalExpenses;
      totalParticipants += evt.participants.length;
      evt.participants.forEach((p) => {
        if (p.subFamily) subFamilySet.add(p.subFamily);
      });
    });

    return {
      activeEventsCount: activeEvents.length,
      totalExpenses,
      totalParticipants,
      subFamiliesCount: subFamilySet.size,
    };
  }, [events]);

  const handleCreateEvent = async () => {
    const yearNumber = parseInt(newYear, 10);
    if (!yearNumber || yearNumber < 2000 || yearNumber > 2100) {
      Alert.alert('Error', 'Por favor ingresa un año válido (ej. 2026)');
      return;
    }

    const titleText = newTitle.trim() || `Vacaciones ${yearNumber}`;
    const daysNum = Math.max(1, Math.min(30, parseInt(newDaysCount, 10) || 3));
    const generatedDays = Array.from({ length: daysNum }, (_, i) => `Día ${i + 1}`);

    const initialParticipants: Participant[] = selectedDirectoryContacts.map((c) => ({
      id: generateId('part'),
      name: c.name,
      category: c.category,
      weight: c.weight,
      subFamily: c.subFamily || c.familyGroup || 'Familia General',
      activeDays: [...generatedDays],
      isAttending: true,
      isSettled: false,
    }));

    setCreating(true);
    try {
      const created = await createEvent({
        year: yearNumber,
        title: titleText,
        availableDays: generatedDays,
        initialParticipants,
      });

      setIsModalOpen(false);
      setNewTitle('');
      setNewDaysCount('4');
      setSelectedDirectoryContacts([]);
      await loadEvents();
      router.push(`/event/${created.id}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el evento.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleArchive = async (event: EventConfig) => {
    const targetState = !event.isArchived;
    await archiveEvent(event.id, targetState);
    await loadEvents();
  };

  const handleDelete = (event: EventConfig) => {
    setConfirmConfig({
      visible: true,
      title: 'Eliminar Evento',
      message: `¿Estás seguro de que deseas eliminar permanentemente "${event.title}"?\n\nEsta acción borrará en cascada todos sus participantes y gastos asociados en la base de datos de forma irreversible.`,
      confirmText: 'Eliminar Definitivamente',
      variant: 'danger',
      icon: 'trash',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await deleteEvent(event.id);
          await loadEvents();
          setConfirmConfig((prev) => ({ ...prev, visible: false }));
        } catch (err: any) {
          console.error('Error al eliminar evento:', err);
          setConfirmConfig((prev) => ({ ...prev, visible: false }));
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.centeredLoading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingTitle, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
          ChapApp
        </Text>
        <Text style={[styles.loadingSubtitle, { color: colors.textSecondary, fontFamily: Fonts.regular }]}>
          Cargando entorno contable...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AmbientBackground />
      {/* Header Principal con Isla Flotante de Cristal (Opción A) */}
      <View
        style={[
          styles.header,
          isTablet && styles.headerTablet,
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
        <View style={[styles.headerLeft, isSmallPhone && { gap: 8, flexShrink: 1 }]}>
          <SculptedIcon
            name="money"
            size={isTablet ? 22 : 18}
            containerSize={isTablet ? 46 : 38}
            variant="sunken"
            glow={isDark}
            accentColor={colors.primary}
            color={colors.primary}
          />
          <View style={{ flexShrink: 1 }}>
            <Text style={[styles.appTitle, isSmallPhone && { fontSize: 18 }, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
              ChapApp
            </Text>
            {!isSmallPhone && (
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.appSubtitle, { color: colors.textSecondary, fontFamily: Fonts.medium }]}
              >
                {isTablet ? 'Control de Finanzas Grupales & Prorrateo' : 'Finanzas Grupales'}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.headerRightActions, isSmallPhone && { gap: 6 }]}>
          {/* Botón de Cambio de Tema en Cristal */}
          <TouchableOpacity
            onPress={toggleTheme}
            activeOpacity={0.8}
            accessibilityLabel={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            style={[
              styles.themeIconButton,
              isSmallPhone && { width: 36, height: 36 },
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                ...(Platform.OS === 'web'
                  ? ({
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      boxShadow: isDark
                        ? '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                        : '0 2px 8px rgba(31, 38, 135, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                    } as any)
                  : {}),
              },
            ]}
          >
            <SculptedIcon
              name={isDark ? 'moon' : 'sun'}
              size={isSmallPhone ? 16 : 18}
              variant="plain"
              color={isDark ? colors.neonAmber : colors.primary}
            />
          </TouchableOpacity>

          {/* Botón Directorio Global de Cristal */}
          <TouchableOpacity
            style={[
              styles.directoryHeaderButton,
              isSmallPhone && { paddingHorizontal: 10, paddingVertical: 8 },
              {
                backgroundColor: colors.purpleLight,
                borderColor: colors.purpleBorder,
              },
            ]}
            onPress={() => setIsDirectoryModalOpen(true)}
            activeOpacity={0.8}
          >
            <SculptedIcon name="users" size={14} variant="plain" color={colors.purple} />
            {isTablet && (
              <Text style={[styles.directoryHeaderButtonText, { color: colors.purple, fontFamily: Fonts.semiBold }]}>
                Directorio
              </Text>
            )}
          </TouchableOpacity>

          {/* Botón Crear Nuevo Evento */}
          <TouchableOpacity
            style={[
              styles.primaryHeaderButton,
              isSmallPhone && { paddingHorizontal: 10, paddingVertical: 8 },
              {
                backgroundColor: colors.primary,
                borderWidth: 0,
              },
            ]}
            onPress={() => {
              setNewYear(new Date().getFullYear().toString());
              setNewTitle(`Vacaciones ${new Date().getFullYear()}`);
              setSelectedDirectoryContacts([]);
              setIsModalOpen(true);
            }}
            activeOpacity={0.85}
          >
            <SculptedIcon name="plus" size={14} variant="plain" color={isDark ? '#141210' : '#FFFFFF'} />
            <Text
              style={[
                styles.primaryHeaderButtonText,
                isSmallPhone && { fontSize: 12 },
                { color: isDark ? '#141210' : '#FFFFFF', fontFamily: Fonts.bold },
              ]}
            >
              {isTablet ? 'Nuevo Evento' : 'Nuevo'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Layout Master-Detail / Grid */}
      <View style={[styles.mainLayout, isTablet && styles.mainLayoutTablet]}>
        {/* Barra de Filtro Desplegable para Móvil (Oculto por defecto) */}
        {!isTablet && (
          <View style={styles.mobileFilterBar}>
            <TouchableOpacity
              style={[
                styles.mobileFilterTriggerBtn,
                {
                  backgroundColor: isMobileFilterOpen || searchQuery ? colors.primaryLight : colors.surface,
                  borderColor: isMobileFilterOpen || searchQuery ? colors.primaryBorder : colors.border,
                },
              ]}
              onPress={() => setIsMobileFilterOpen((prev) => !prev)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <SculptedIcon
                  name="search"
                  size={14}
                  variant="plain"
                  color={isMobileFilterOpen || searchQuery ? colors.primaryText : colors.textMuted}
                />
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    styles.mobileFilterTriggerText,
                    {
                      color: isMobileFilterOpen || searchQuery ? colors.primaryText : colors.textSecondary,
                      fontFamily: Fonts.medium,
                    },
                  ]}
                >
                  {searchQuery
                    ? `Búsqueda: "${searchQuery}"`
                    : filterTab === 'active'
                    ? `Eventos Activos (${activeCount})`
                    : filterTab === 'archived'
                    ? `Archivados (${archivedCount})`
                    : `Todos los Años (${events.length})`}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.mobileFilterBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.mobileFilterBadgeText, { color: colors.primaryText, fontFamily: Fonts.bold }]}>
                    {filterTab === 'active' ? activeCount : filterTab === 'archived' ? archivedCount : events.length}
                  </Text>
                </View>
                <SculptedIcon
                  name={isMobileFilterOpen ? 'chevron-down' : 'chevron-right'}
                  size={13}
                  variant="plain"
                  color={isMobileFilterOpen ? colors.primaryText : colors.textMuted}
                />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Panel lateral / Filtros de Cristal (Visible en Tablet o cuando el usuario lo despliega en Móvil) */}
        {(isTablet || isMobileFilterOpen) && (
          <View
            style={[
              styles.sidebar,
              isTablet && styles.sidebarTablet,
              !isTablet && styles.sidebarMobileExpanded,
              {
                backgroundColor: isDark ? 'rgba(13, 20, 32, 0.50)' : 'rgba(255, 255, 255, 0.55)',
                borderRightColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(226, 232, 240, 0.80)',
                borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(226, 232, 240, 0.80)',
                borderTopColor: isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(255, 255, 255, 0.95)',
                ...(Platform.OS === 'web'
                  ? ({
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      boxShadow: isDark
                        ? '4px 0 24px rgba(0, 0, 0, 0.35)'
                        : '4px 0 24px rgba(31, 38, 135, 0.05)',
                    } as any)
                  : {}),
              },
            ]}
          >
            <View style={styles.sidebarHeaderRow}>
              <Text style={[styles.sectionHeading, { color: colors.textMuted, fontFamily: Fonts.bold }]}>
                Vistas y Filtros
              </Text>
              {!isTablet && (
                <TouchableOpacity
                  onPress={() => setIsMobileFilterOpen(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <SculptedIcon name="close" size={13} variant="plain" color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

          {/* Pestañas de Filtro en Cristal */}
          <View style={styles.tabsContainer}>
            {/* Pestaña: Activos */}
            <TouchableOpacity
              style={[
                styles.tabButton,
                filterTab === 'active'
                  ? [
                      styles.tabButtonActive,
                      {
                        backgroundColor: isDark ? 'rgba(0, 240, 255, 0.14)' : 'rgba(2, 132, 199, 0.12)',
                        borderColor: isDark ? 'rgba(0, 240, 255, 0.40)' : 'rgba(2, 132, 199, 0.35)',
                      },
                    ]
                  : [
                      styles.tabButtonInactive,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.40)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)',
                      },
                    ],
              ]}
              onPress={() => setFilterTab('active')}
              activeOpacity={0.8}
            >
              <View style={styles.tabContentRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={[
                      styles.tabStatusDot,
                      {
                        backgroundColor: filterTab === 'active' ? colors.success : colors.textMuted,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                      {
                        color: filterTab === 'active' ? colors.primaryText : colors.textSecondary,
                        fontFamily: filterTab === 'active' ? Fonts.bold : Fonts.medium,
                      },
                    ]}
                  >
                    Activos
                  </Text>
                </View>
                <View
                  style={[
                    styles.tabBadge,
                    {
                      backgroundColor: filterTab === 'active' ? colors.primaryLight : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.50)'),
                      borderColor: filterTab === 'active' ? colors.primaryBorder : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      {
                        color: filterTab === 'active' ? colors.primaryText : colors.textMuted,
                        fontFamily: Fonts.bold,
                      },
                    ]}
                  >
                    {activeCount}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Pestaña: Historial Archivado */}
            <TouchableOpacity
              style={[
                styles.tabButton,
                filterTab === 'archived'
                  ? [
                      styles.tabButtonActive,
                      {
                        backgroundColor: isDark ? 'rgba(0, 240, 255, 0.14)' : 'rgba(2, 132, 199, 0.12)',
                        borderColor: isDark ? 'rgba(0, 240, 255, 0.40)' : 'rgba(2, 132, 199, 0.35)',
                      },
                    ]
                  : [
                      styles.tabButtonInactive,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.40)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)',
                      },
                    ],
              ]}
              onPress={() => setFilterTab('archived')}
              activeOpacity={0.8}
            >
              <View style={styles.tabContentRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <SculptedIcon
                    name="archive"
                    size={13}
                    variant="plain"
                    color={filterTab === 'archived' ? colors.primaryText : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                      {
                        color: filterTab === 'archived' ? colors.primaryText : colors.textSecondary,
                        fontFamily: filterTab === 'archived' ? Fonts.bold : Fonts.medium,
                      },
                    ]}
                  >
                    Historial Archivado
                  </Text>
                </View>
                <View
                  style={[
                    styles.tabBadge,
                    {
                      backgroundColor: filterTab === 'archived' ? colors.primaryLight : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.50)'),
                      borderColor: filterTab === 'archived' ? colors.primaryBorder : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      {
                        color: filterTab === 'archived' ? colors.primaryText : colors.textMuted,
                        fontFamily: Fonts.bold,
                      },
                    ]}
                  >
                    {archivedCount}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Pestaña: Todos los Años */}
            <TouchableOpacity
              style={[
                styles.tabButton,
                filterTab === 'all'
                  ? [
                      styles.tabButtonActive,
                      {
                        backgroundColor: isDark ? 'rgba(0, 240, 255, 0.14)' : 'rgba(2, 132, 199, 0.12)',
                        borderColor: isDark ? 'rgba(0, 240, 255, 0.40)' : 'rgba(2, 132, 199, 0.35)',
                      },
                    ]
                  : [
                      styles.tabButtonInactive,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.40)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)',
                      },
                    ],
              ]}
              onPress={() => setFilterTab('all')}
              activeOpacity={0.8}
            >
              <View style={styles.tabContentRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <SculptedIcon
                    name="calendar"
                    size={13}
                    variant="plain"
                    color={filterTab === 'all' ? colors.primaryText : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                      {
                        color: filterTab === 'all' ? colors.primaryText : colors.textSecondary,
                        fontFamily: filterTab === 'all' ? Fonts.bold : Fonts.medium,
                      },
                    ]}
                  >
                    Todos los Años
                  </Text>
                </View>
                <View
                  style={[
                    styles.tabBadge,
                    {
                      backgroundColor: filterTab === 'all' ? colors.primaryLight : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.50)'),
                      borderColor: filterTab === 'all' ? colors.primaryBorder : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      {
                        color: filterTab === 'all' ? colors.primaryText : colors.textMuted,
                        fontFamily: Fonts.bold,
                      },
                    ]}
                  >
                    {events.length}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Buscador de Cristal con Cavidad Rehundida */}
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.40)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)',
                ...(Platform.OS === 'web'
                  ? ({
                      boxShadow: isDark
                        ? 'inset 0 2px 4px rgba(0, 0, 0, 0.4), inset 0 -1px 0 rgba(255, 255, 255, 0.04)'
                        : 'inset 0 2px 4px rgba(31, 38, 135, 0.06), inset 0 -1px 0 rgba(255, 255, 255, 0.6)',
                    } as any)
                  : {}),
              },
            ]}
          >
            <SculptedIcon name="search" size={14} variant="plain" color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary, fontFamily: Fonts.regular }]}
              placeholder="Buscar año o título..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textMuted}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <SculptedIcon name="close" size={13} variant="plain" color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Tarjeta informativa de Directorio Global */}
          {isTablet && (
            <GlassCard
              variant="purple"
              glow={isDark}
              style={styles.directoryCardPromo}
              contentStyle={styles.directoryCardPromoContent}
              onPress={() => setIsDirectoryModalOpen(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                <SculptedIcon
                  name="users"
                  size={14}
                  containerSize={28}
                  variant="sunken"
                  accentColor={colors.purple}
                  color={colors.purple}
                />
                <Text style={[styles.directoryCardPromoTitle, { color: colors.purple, fontFamily: Fonts.bold, flex: 1, flexWrap: 'wrap' }]}>
                  Directorio Global de Subfamilias
                </Text>
              </View>
              <Text style={[styles.directoryCardPromoText, { color: colors.textSecondary, fontFamily: Fonts.regular }]}>
                Reutiliza familias e integrantes para crear eventos rápidamente.
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Text style={[styles.directoryCardPromoLink, { color: colors.purple, fontFamily: Fonts.semiBold }]}>
                  Gestionar familias
                </Text>
                <SculptedIcon name="chevron-right" size={12} variant="plain" color={colors.purple} />
              </View>
            </GlassCard>
          )}
        </View>
      )}

      {/* Área de Contenido Principal */}
        <View style={styles.contentArea}>
          {/* Barra de Resumen Ejecutivo Global en Cristal */}
          {events.length > 0 && (
            <View
              style={[
                styles.executiveSummaryBar,
                {
                  backgroundColor: isDark ? 'rgba(14, 22, 36, 0.45)' : 'rgba(255, 255, 255, 0.48)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.65)',
                  borderTopColor: isDark ? 'rgba(255, 255, 255, 0.30)' : 'rgba(255, 255, 255, 0.95)',
                  borderWidth: 1,
                  ...(Platform.OS === 'web'
                    ? ({
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        boxShadow: isDark
                          ? '0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.18)'
                          : '0 8px 24px rgba(31, 38, 135, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
                      } as any)
                    : {
                        shadowColor: isDark ? '#000000' : '#1F2687',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isDark ? 0.35 : 0.08,
                        shadowRadius: 8,
                        elevation: 3,
                      }),
                },
              ]}
            >
              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <View style={[styles.pulseDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.summaryLabel, { color: colors.textMuted, fontFamily: Fonts.medium }]}>
                    Eventos Activos
                  </Text>
                </View>
                <Text style={[styles.summaryValue, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
                  {globalSummary.activeEventsCount} {globalSummary.activeEventsCount === 1 ? 'Evento' : 'Eventos'}
                </Text>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <SculptedIcon name="receipt" size={12} variant="plain" color={colors.primary} />
                  <Text style={[styles.summaryLabel, { color: colors.textMuted, fontFamily: Fonts.medium }]}>
                    Gastos Acumulados
                  </Text>
                </View>
                <Text style={[styles.summaryValue, { color: colors.primary, fontFamily: Fonts.bold }]}>
                  {FormatCurrency(globalSummary.totalExpenses)}
                </Text>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <SculptedIcon name="users" size={12} variant="plain" color={colors.purple} />
                  <Text style={[styles.summaryLabel, { color: colors.textMuted, fontFamily: Fonts.medium }]}>
                    Asistentes Totales
                  </Text>
                </View>
                <Text style={[styles.summaryValue, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
                  {globalSummary.totalParticipants} Asistentes
                </Text>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

              <View style={styles.summaryItem}>
                <View style={styles.summaryItemHeader}>
                  <SculptedIcon name="family" size={12} variant="plain" color={colors.warning} />
                  <Text style={[styles.summaryLabel, { color: colors.textMuted, fontFamily: Fonts.medium }]}>
                    Subfamilias
                  </Text>
                </View>
                <Text style={[styles.summaryValue, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
                  {globalSummary.subFamiliesCount} Familias
                </Text>
              </View>
            </View>
          )}

          {/* Grid de Tarjetas o Estado Vacío */}
          {filteredEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <SculptedIcon
                name="calendar"
                size={42}
                containerSize={76}
                variant="sunken"
                glow={isDark}
                accentColor={colors.primary}
                color={colors.primary}
              />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, fontFamily: Fonts.bold, marginTop: 14 }]}>
                No hay eventos en esta sección
              </Text>
              <Text style={[styles.emptyDescription, { color: colors.textSecondary, fontFamily: Fonts.regular }]}>
                {searchQuery
                  ? 'No se encontraron eventos que coincidan con la búsqueda.'
                  : 'Crea tu primer evento anual para comenzar a gestionar gastos y prorrateo.'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.primaryHeaderButton,
                  {
                    marginTop: 18,
                    backgroundColor: colors.primary,
                    borderWidth: 0,
                    ...(Platform.OS === 'web'
                      ? ({
                          boxShadow: isDark
                            ? '-2px -2px 6px rgba(255, 255, 255, 0.02), 3px 4px 10px rgba(0, 0, 0, 0.45)'
                            : '-3px -3px 7px #FFFFFF, 3px 4px 10px rgba(21, 128, 61, 0.35)',
                        } as any)
                      : {
                          shadowColor: '#000000',
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.3,
                          shadowRadius: 6,
                          elevation: 3,
                        }),
                  },
                ]}
                onPress={() => {
                  setNewYear(new Date().getFullYear().toString());
                  setNewTitle(`Vacaciones ${new Date().getFullYear()}`);
                  setSelectedDirectoryContacts([]);
                  setIsModalOpen(true);
                }}
                activeOpacity={0.85}
              >
                <SculptedIcon name="plus" size={15} variant="plain" color={isDark ? '#0B0F19' : '#FFFFFF'} />
                <Text style={[styles.primaryHeaderButtonText, { color: isDark ? '#0B0F19' : '#FFFFFF', fontFamily: Fonts.bold }]}>
                  Crear Nuevo Evento
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.cardsGrid}
              showsVerticalScrollIndicator={false}
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
              {filteredEvents.map((event) => {
                const totals = calculateEventTotals(event);
                const isReembolsoSim = event.id.includes('reembolso');
                const isCuotasFijasSim = event.id.includes('cuotas_fijas');

                return (
                  <GlassCard
                    key={event.id}
                    style={[
                      styles.eventCard,
                      isTablet && styles.eventCardTablet,
                      isDesktop && styles.eventCardDesktop,
                    ]}
                    contentStyle={styles.eventCardContent}
                  >
                    {/* Header de la tarjeta con Relieve */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        {/* Insignia de Año en Cristal */}
                        <View
                          style={[
                            styles.yearBadge,
                            {
                              backgroundColor: colors.surfaceSubtle,
                              borderColor: colors.border,
                              ...(Platform.OS === 'web'
                                ? ({
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    boxShadow: isDark
                                      ? 'inset 0 1px 2px rgba(0, 0, 0, 0.4), inset 0 -1px 0 rgba(255, 255, 255, 0.04)'
                                      : 'inset 0 1px 2px rgba(31, 38, 135, 0.06), inset 0 -1px 0 rgba(255, 255, 255, 0.6)',
                                  } as any)
                                : {}),
                            },
                          ]}
                        >
                          <Text style={[styles.yearBadgeText, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
                            {event.year}
                          </Text>
                        </View>

                        {/* Estado Activo / Archivado */}
                        {event.isArchived ? (
                          <View
                            style={[
                              styles.archivedBadge,
                              {
                                backgroundColor: isDark ? 'rgba(107, 114, 128, 0.15)' : 'rgba(107, 114, 128, 0.10)',
                                borderColor: isDark ? 'rgba(107, 114, 128, 0.3)' : 'rgba(107, 114, 128, 0.25)',
                              },
                            ]}
                          >
                            <Text style={[styles.archivedBadgeText, { color: colors.textMuted, fontFamily: Fonts.semiBold }]}>
                              Archivado
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.activeBadge,
                              {
                                backgroundColor: isDark ? 'rgba(0, 230, 118, 0.12)' : 'rgba(22, 163, 74, 0.12)',
                                borderColor: isDark ? 'rgba(0, 230, 118, 0.35)' : 'rgba(22, 163, 74, 0.30)',
                              },
                            ]}
                          >
                            <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
                            <Text style={[styles.activeBadgeText, { color: colors.successText, fontFamily: Fonts.semiBold }]}>
                              Activo
                            </Text>
                          </View>
                        )}

                        {/* Badges de simulación */}
                        {isReembolsoSim && (
                          <View
                            style={[
                              styles.simBadgeReembolso,
                              {
                                backgroundColor: isDark ? 'rgba(255, 171, 0, 0.15)' : 'rgba(217, 119, 6, 0.12)',
                                borderColor: isDark ? colors.warning : 'rgba(217, 119, 6, 0.35)',
                              },
                            ]}
                          >
                            <Text style={[styles.simBadgeText, { color: isDark ? colors.neonAmber : '#92400E', fontFamily: Fonts.semiBold }]}>
                              Reembolsos
                            </Text>
                          </View>
                        )}
                        {isCuotasFijasSim && (
                          <View
                            style={[
                              styles.simBadgeCuotas,
                              {
                                backgroundColor: isDark ? 'rgba(0, 229, 255, 0.15)' : 'rgba(2, 132, 199, 0.12)',
                                borderColor: isDark ? colors.primary : 'rgba(2, 132, 199, 0.35)',
                              },
                            ]}
                          >
                            <Text style={[styles.simBadgeText, { color: isDark ? colors.primary : '#1E40AF', fontFamily: Fonts.semiBold }]}>
                              Cuotas Fijas
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Botones de acción esculpidos en la tarjeta */}
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          onPress={() => handleToggleArchive(event)}
                          accessibilityLabel={event.isArchived ? 'Desarchivar' : 'Archivar'}
                          activeOpacity={0.7}
                        >
                          <SculptedIcon
                            name={event.isArchived ? 'unarchive' : 'archive'}
                            size={14}
                            containerSize={32}
                            variant="sunken"
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(event)}
                          accessibilityLabel="Eliminar evento"
                          activeOpacity={0.7}
                        >
                          <SculptedIcon
                            name="trash"
                            size={14}
                            containerSize={32}
                            variant="sunken"
                            glow={isDark}
                            accentColor={colors.coral}
                            color={colors.coral}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Título Principal del Evento */}
                    <Text
                      style={[
                        styles.cardTitle,
                        { color: colors.textPrimary, fontFamily: Fonts.bold },
                      ]}
                      numberOfLines={1}
                    >
                      {event.title}
                    </Text>

                    {/* Bandeja de Métricas de Cristal */}
                    <View
                      style={[
                        styles.metricsTray,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.35)',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)',
                        },
                      ]}
                    >
                      <View style={styles.metricItem}>
                        <View style={styles.metricHeaderRow}>
                          <SculptedIcon name="money" size={11} variant="plain" color={colors.textMuted} />
                          <Text style={[styles.metricLabel, { color: colors.textMuted, fontFamily: Fonts.medium }]}>
                            Total Gastos
                          </Text>
                        </View>
                        <Text style={[styles.metricValue, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
                          {FormatCurrency(totals.totalExpenses)}
                        </Text>
                      </View>

                      <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

                      <View style={styles.metricItem}>
                        <View style={styles.metricHeaderRow}>
                          <SculptedIcon name="user" size={11} variant="plain" color={colors.textMuted} />
                          <Text style={[styles.metricLabel, { color: colors.textMuted, fontFamily: Fonts.medium }]}>
                            Asistentes
                          </Text>
                        </View>
                        <Text style={[styles.metricValue, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
                          {totals.totalAttendingCount}/{event.participants.length}
                        </Text>
                      </View>

                      <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

                      <View style={styles.metricItem}>
                        <View style={styles.metricHeaderRow}>
                          <SculptedIcon name="family" size={11} variant="plain" color={colors.textMuted} />
                          <Text style={[styles.metricLabel, { color: colors.textMuted, fontFamily: Fonts.medium }]}>
                            Familias
                          </Text>
                        </View>
                        <Text style={[styles.metricValue, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
                          {totals.subFamilies.length}
                        </Text>
                      </View>
                    </View>

                    {/* Botón de Entrada al Dashboard */}
                    <TouchableOpacity
                      style={[
                        styles.openButton,
                        {
                          backgroundColor: colors.primaryLight,
                          borderColor: colors.primaryBorder,
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => router.push(`/event/${event.id}`)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.openButtonText, { color: colors.primaryText, fontFamily: Fonts.bold }]}>
                        Abrir Dashboard
                      </Text>
                      <SculptedIcon name="chevron-right" size={14} variant="plain" color={colors.primaryText} />
                    </TouchableOpacity>
                  </GlassCard>
                );
              })}

              {/* Tarjeta Complementaria para Crear Nuevo Evento en el Grid en Cristal */}
              {filterTab !== 'archived' && (
                <GlassCard
                  variant="subtle"
                  style={[
                    styles.createEventCardCompanion,
                    isTablet && styles.eventCardTablet,
                    isDesktop && styles.eventCardDesktop,
                  ]}
                  contentStyle={styles.createEventCardInner}
                  onPress={() => {
                    setNewYear(new Date().getFullYear().toString());
                    setNewTitle(`Vacaciones ${new Date().getFullYear()}`);
                    setSelectedDirectoryContacts([]);
                    setIsModalOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <SculptedIcon
                    name="plus"
                    size={24}
                    containerSize={52}
                    variant="sunken"
                    glow={false}
                    accentColor={colors.primary}
                    color={colors.primary}
                  />
                  <Text style={[styles.createEventCardTitle, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
                    Crear Nuevo Evento
                  </Text>
                  <Text style={[styles.createEventCardSubtitle, { color: colors.textSecondary, fontFamily: Fonts.regular }]}>
                    Registrar finanzas para un nuevo año
                  </Text>
                </GlassCard>
              )}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Modal para Crear Evento */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[
            styles.modalBackdrop,
            {
              backgroundColor: isDark ? 'rgba(20, 18, 16, 0.75)' : 'rgba(20, 18, 16, 0.40)',
            },
          ]}
        >
          <TouchableOpacity
            style={styles.modalBackdropTouch}
            activeOpacity={1}
            onPress={() => setIsModalOpen(false)}
          />
          <GlassCard
            style={[styles.modalCard, isTablet && styles.modalCardTablet]}
            contentStyle={styles.modalCardContent}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <SculptedIcon
                  name="calendar"
                  size={16}
                  containerSize={36}
                  variant="sunken"
                  glow={isDark}
                  accentColor={colors.primary}
                  color={colors.primary}
                />
                <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
                  Crear Nuevo Evento Anual
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <SculptedIcon name="close" size={16} variant="plain" color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textPrimary, fontFamily: Fonts.semiBold }]}>
                Año del Evento
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    fontFamily: Fonts.regular,
                  },
                ]}
                keyboardType="numeric"
                value={newYear}
                onChangeText={(val) => {
                  setNewYear(val);
                  setNewTitle(`Vacaciones ${val}`);
                }}
                placeholder="2026"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textPrimary, fontFamily: Fonts.semiBold }]}>
                Título o Nombre del Evento
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    fontFamily: Fonts.regular,
                  },
                ]}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Ej. Vacaciones de Verano 2026"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textPrimary, fontFamily: Fonts.semiBold }]}>
                Número de Días del Evento
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    fontFamily: Fonts.regular,
                  },
                ]}
                keyboardType="numeric"
                value={newDaysCount}
                onChangeText={setNewDaysCount}
                placeholder="4"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Selector de Directorio Inicial */}
            <View
              style={[
                styles.directoryPickerSection,
                {
                  backgroundColor: colors.purpleLight,
                  borderColor: colors.purpleBorder,
                },
              ]}
            >
              <View style={styles.directoryPickerHeader}>
                <Text style={[styles.formLabel, { color: colors.textPrimary, marginBottom: 0, fontFamily: Fonts.semiBold }]}>
                  Participantes Iniciales
                </Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => setIsPickDirectoryForNewEventOpen(true)}
                >
                  <SculptedIcon name="users" size={13} variant="plain" color={colors.purple} />
                  <Text style={[styles.directoryPickerLink, { color: colors.purple, fontFamily: Fonts.semiBold }]}>
                    {selectedDirectoryContacts.length > 0
                      ? 'Cambiar selección'
                      : 'Seleccionar del Directorio'}
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedDirectoryContacts.length > 0 ? (
                <View style={styles.selectedDirectoryChips}>
                  {selectedDirectoryContacts.map((c) => (
                    <View
                      key={c.id}
                      style={[
                        styles.selectedChip,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.purpleBorder,
                        },
                      ]}
                    >
                      <SculptedIcon
                        name={c.category === 'nino' ? 'child' : 'user'}
                        size={12}
                        variant="plain"
                        color={colors.purple}
                      />
                      <Text style={[styles.selectedChipText, { color: colors.purple, fontFamily: Fonts.medium }]}>
                        {c.name} ({c.subFamily || c.familyGroup})
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.formHelp, { color: colors.textSecondary, fontFamily: Fonts.regular }]}>
                  Importa integrantes de subfamilias desde el Directorio Global en un solo paso.
                </Text>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setIsModalOpen(false)}
                disabled={creating}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.textSecondary, fontFamily: Fonts.medium }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryHeaderButton,
                  {
                    backgroundColor: colors.primary,
                    borderWidth: 0,
                  },
                ]}
                onPress={handleCreateEvent}
                disabled={creating}
              >
                <Text style={[styles.primaryHeaderButtonText, { color: isDark ? '#141210' : '#FFFFFF', fontFamily: Fonts.bold }]}>
                  {creating ? 'Creando...' : 'Crear y Abrir'}
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modales de Directorio */}
      <GlobalDirectoryModal
        visible={isDirectoryModalOpen}
        onClose={() => setIsDirectoryModalOpen(false)}
        mode="manage"
      />

      <GlobalDirectoryModal
        visible={isPickDirectoryForNewEventOpen}
        onClose={() => setIsPickDirectoryForNewEventOpen(false)}
        mode="import"
        onImportSelected={(contacts) => {
          setSelectedDirectoryContacts(contacts);
          setIsPickDirectoryForNewEventOpen(false);
        }}
      />

      {/* Modal de confirmación para eliminar evento */}
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
  header: {
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
  headerTablet: {
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
    gap: 14,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeIconButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  directoryHeaderButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  directoryHeaderButtonText: {
    fontSize: 13,
  },
  primaryHeaderButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryHeaderButtonText: {
    fontSize: 14,
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'column',
  },
  mainLayoutTablet: {
    flexDirection: 'row',
  },
  mobileFilterBar: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 4,
  },
  mobileFilterTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  mobileFilterTriggerText: {
    fontSize: 13,
  },
  mobileFilterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  mobileFilterBadgeText: {
    fontSize: 11,
  },
  sidebar: {
    padding: 24,
    borderBottomWidth: 1,
  },
  sidebarMobileExpanded: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: 16,
  },
  sidebarTablet: {
    width: 320,
    minWidth: 300,
    maxWidth: 360,
    flexShrink: 0,
    borderBottomWidth: 0,
    borderRightWidth: 1,
    padding: 24,
  },
  sidebarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  tabsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  tabButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radii.lg,
    borderWidth: 1,
    minHeight: 52,
    justifyContent: 'center',
  },
  tabButtonActive: {},
  tabButtonInactive: {},
  tabContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    gap: 10,
  },
  tabStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tabButtonText: {
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
  },
  tabBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    borderWidth: 1,
    flexShrink: 0,
  },
  tabBadgeText: {
    fontSize: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 50,
    borderWidth: 1,
    marginBottom: 24,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },
  directoryCardPromo: {
    marginTop: 'auto',
    width: '100%',
  },
  directoryCardPromoContent: {
    padding: 20,
    gap: 10,
    minHeight: 140,
    justifyContent: 'center',
  },
  directoryCardPromoTitle: {
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
  },
  directoryCardPromoText: {
    fontSize: 13,
    lineHeight: 19,
    flexShrink: 1,
  },
  directoryCardPromoLink: {
    fontSize: 13,
  },
  contentArea: {
    flex: 1,
    padding: 24,
  },
  executiveSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginBottom: 22,
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: 110,
  },
  summaryItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 15,
  },
  summaryDivider: {
    width: 1,
    height: 30,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 20,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    paddingBottom: 40,
  },
  eventCard: {
    width: '100%',
  },
  eventCardTablet: {
    flex: 1,
    minWidth: 300,
    maxWidth: '49%',
  },
  eventCardDesktop: {
    flex: 1,
    minWidth: 320,
    maxWidth: '32%',
  },
  eventCardContent: {
    padding: 22,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yearBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  yearBadgeText: {
    fontSize: 12,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeBadgeText: {
    fontSize: 11,
  },
  archivedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  archivedBadgeText: {
    fontSize: 11,
  },
  simBadgeReembolso: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  simBadgeCuotas: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  simBadgeText: {
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 19,
    marginBottom: 16,
    letterSpacing: -0.4,
  },
  metricsTray: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: 11,
  },
  metricValue: {
    fontSize: 14,
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radii.md,
    gap: 6,
    borderWidth: 1,
  },
  openButtonText: {
    fontSize: 13,
  },
  createEventCardCompanion: {
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 220,
    width: '100%',
    padding: 24,
  },
  createEventCardInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createEventCardTitle: {
    fontSize: 16,
    marginTop: 4,
  },
  createEventCardSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 25, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdropTouch: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
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
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  formHelp: {
    fontSize: 12,
    marginTop: 4,
  },
  directoryPickerSection: {
    padding: 14,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: 16,
  },
  directoryPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  directoryPickerLink: {
    fontSize: 12,
  },
  selectedDirectoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  selectedChipText: {
    fontSize: 11,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
  },
  centeredLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  loadingTitle: {
    fontSize: 22,
    marginTop: 8,
  },
  loadingSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
});


