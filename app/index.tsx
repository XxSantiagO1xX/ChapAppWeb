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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { FormatCurrency, Radii } from '../constants/theme';
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

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { colors, isDark, toggleTheme, getNeonGlow } = useTheme();

  const [events, setEvents] = useState<EventConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<'active' | 'archived' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');

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
    Alert.alert(
      '🗑️ Eliminar Evento',
      `¿Estás seguro de que deseas eliminar permanentemente "${event.title}"?\n\nEsta acción borrará en cascada todos sus participantes y gastos asociados en la base de datos de forma irreversible.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Definitivamente',
          style: 'destructive',
          onPress: async () => {
            await deleteEvent(event.id);
            await loadEvents();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centeredLoading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingTitle, { color: colors.textPrimary }]}>ChapApp</Text>
        <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>
          Cargando entorno contable...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Sci-Fi HUD / Neumorphic Limpio */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <SculptedIcon
            name="money"
            size={22}
            containerSize={46}
            variant="sunken"
            glow={isDark}
            accentColor={colors.primary}
            color={colors.primary}
          />
          <View>
            <Text style={[styles.appTitle, { color: colors.textPrimary }]}>ChapApp</Text>
            <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>
              Control de Finanzas Grupales & Prorrateo
            </Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          {/* Botón de Cambio de Tema: EXCLUSIVAMENTE ICONO (☀️ o 🌙) con relieve esculpido */}
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

          {/* Botón Directorio */}
          <TouchableOpacity
            style={[
              styles.directoryHeaderButton,
              {
                backgroundColor: colors.purpleLight,
                borderColor: colors.purpleBorder,
                ...(isDark ? getNeonGlow(colors.neonPurple, 'low') : {}),
              },
            ]}
            onPress={() => setIsDirectoryModalOpen(true)}
            activeOpacity={0.8}
          >
            <SculptedIcon name="users" size={15} variant="plain" color={colors.purple} />
            <Text style={[styles.directoryHeaderButtonText, { color: colors.purple }]}>Directorio</Text>
          </TouchableOpacity>

          {/* Botón Nuevo Evento */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: colors.primary,
                ...(isDark ? getNeonGlow(colors.neonCyan, 'high') : {}),
              },
            ]}
            onPress={() => {
              setNewYear(new Date().getFullYear().toString());
              setNewTitle(`Vacaciones ${new Date().getFullYear()}`);
              setSelectedDirectoryContacts([]);
              setIsModalOpen(true);
            }}
            activeOpacity={0.8}
          >
            <SculptedIcon name="plus" size={14} variant="plain" color={isDark ? '#0B0F19' : '#FFFFFF'} />
            <Text style={[styles.primaryButtonText, { color: isDark ? '#0B0F19' : '#FFFFFF' }]}>
              Nuevo Evento
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Layout Master-Detail / Grid */}
      <View style={[styles.mainLayout, isTablet && styles.mainLayoutTablet]}>
        {/* Panel lateral / Filtros */}
        <View
          style={[
            styles.sidebar,
            isTablet && styles.sidebarTablet,
            {
              backgroundColor: colors.surface,
              borderRightColor: colors.border,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Vistas y Filtros</Text>

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                { backgroundColor: colors.surfaceSubtle },
                filterTab === 'active' && {
                  backgroundColor: colors.primaryLight,
                  borderWidth: 1,
                  borderColor: colors.primaryBorder,
                },
              ]}
              onPress={() => setFilterTab('active')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: colors.textSecondary },
                  filterTab === 'active' && { color: colors.primary, fontWeight: '600' },
                ]}
              >
                Activos ({activeCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                { backgroundColor: colors.surfaceSubtle },
                filterTab === 'archived' && {
                  backgroundColor: colors.primaryLight,
                  borderWidth: 1,
                  borderColor: colors.primaryBorder,
                },
              ]}
              onPress={() => setFilterTab('archived')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: colors.textSecondary },
                  filterTab === 'archived' && { color: colors.primary, fontWeight: '600' },
                ]}
              >
                Historial Archivado ({archivedCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                { backgroundColor: colors.surfaceSubtle },
                filterTab === 'all' && {
                  backgroundColor: colors.primaryLight,
                  borderWidth: 1,
                  borderColor: colors.primaryBorder,
                },
              ]}
              onPress={() => setFilterTab('all')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: colors.textSecondary },
                  filterTab === 'all' && { color: colors.primary, fontWeight: '600' },
                ]}
              >
                Todos los Años ({events.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Buscador Neumórfico */}
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: isDark ? '#16181D' : colors.surfaceSubtle,
                borderColor: isDark ? '#111317' : colors.border,
              },
            ]}
          >
            <SculptedIcon name="search" size={14} variant="plain" color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Buscar por año o título..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textMuted}
            />
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SculptedIcon name="users" size={14} variant="plain" color={colors.purple} />
                <Text style={[styles.directoryCardPromoTitle, { color: colors.purple }]}>
                  Directorio Frecuente
                </Text>
              </View>
              <Text style={[styles.directoryCardPromoText, { color: colors.textSecondary }]}>
                Reutiliza familias e invitados para creaciones rápidas de eventos anuales.
              </Text>
              <Text style={[styles.directoryCardPromoLink, { color: colors.purple }]}>
                Gestionar familias →
              </Text>
            </GlassCard>
          )}
        </View>

        {/* Lista de Eventos con GlassCard */}
        <View style={styles.contentArea}>
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
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 14 }]}>
                No hay eventos en esta sección
              </Text>
              <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                {searchQuery
                  ? 'No se encontraron eventos que coincidan con la búsqueda.'
                  : 'Crea tu primer evento anual para comenzar a gestionar gastos.'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    marginTop: 18,
                    backgroundColor: colors.primary,
                    ...(isDark ? getNeonGlow(colors.neonCyan, 'medium') : {}),
                  },
                ]}
                onPress={() => {
                  setNewYear(new Date().getFullYear().toString());
                  setNewTitle(`Vacaciones ${new Date().getFullYear()}`);
                  setIsModalOpen(true);
                }}
              >
                <SculptedIcon name="plus" size={14} variant="plain" color={isDark ? '#0B0F19' : '#FFFFFF'} />
                <Text style={[styles.primaryButtonText, { color: isDark ? '#0B0F19' : '#FFFFFF' }]}>
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
                    variant={event.isArchived ? 'subtle' : isDark ? 'cyan' : 'lime'}
                    glow={!event.isArchived && isDark}
                    style={[styles.eventCard, isTablet && styles.eventCardTablet]}
                    contentStyle={styles.eventCardContent}
                  >
                    {/* Header de la tarjeta */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <View style={[styles.yearBadge, { backgroundColor: colors.surfaceSubtle }]}>
                          <Text style={[styles.yearBadgeText, { color: colors.textPrimary }]}>{event.year}</Text>
                        </View>
                        {event.isArchived ? (
                          <View
                            style={[
                              styles.archivedBadge,
                              { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                            ]}
                          >
                            <Text style={[styles.archivedBadgeText, { color: colors.textMuted }]}>
                              Archivado
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.activeBadge,
                              { backgroundColor: colors.successLight, borderColor: colors.successBorder },
                            ]}
                          >
                            <Text style={[styles.activeBadgeText, { color: colors.successText }]}>
                              Activo
                            </Text>
                          </View>
                        )}
                        {isReembolsoSim && (
                          <View
                            style={[
                              styles.simBadgeReembolso,
                              {
                                backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : '#FEF3C7',
                                borderColor: isDark ? '#F59E0B' : '#FDE68A',
                              },
                            ]}
                          >
                            <Text style={[styles.simBadgeText, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                              Reembolsos
                            </Text>
                          </View>
                        )}
                        {isCuotasFijasSim && (
                          <View
                            style={[
                              styles.simBadgeCuotas,
                              {
                                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF',
                                borderColor: isDark ? '#38BDF8' : '#BFDBFE',
                              },
                            ]}
                          >
                            <Text style={[styles.simBadgeText, { color: isDark ? '#38BDF8' : '#1E40AF' }]}>
                              Cuotas Fijas
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Acciones de tarjeta con iconos esculpidos */}
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          onPress={() => handleToggleArchive(event)}
                          accessibilityLabel={event.isArchived ? 'Desarchivar' : 'Archivar'}
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

                    {/* Título */}
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {event.title}
                    </Text>

                    {/* Métricas clave */}
                    <View style={[styles.metricsRow, { backgroundColor: colors.surfaceSubtle }]}>
                      <View style={styles.metricItem}>
                        <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Total Gastos</Text>
                        <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                          {FormatCurrency(totals.totalExpenses)}
                        </Text>
                      </View>

                      <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

                      <View style={styles.metricItem}>
                        <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Asistentes</Text>
                        <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                          {totals.totalAttendingCount}/{event.participants.length}
                        </Text>
                      </View>

                      <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

                      <View style={styles.metricItem}>
                        <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Subfamilias</Text>
                        <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                          {totals.subFamilies.length}
                        </Text>
                      </View>
                    </View>

                    {/* Botón de acceso al Dashboard */}
                    <TouchableOpacity
                      style={[
                        styles.openButton,
                        {
                          backgroundColor: colors.primaryLight,
                          borderColor: colors.primaryBorder,
                          ...(isDark ? getNeonGlow(colors.neonCyan, 'low') : {}),
                        },
                      ]}
                      onPress={() => router.push(`/event/${event.id}`)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.openButtonText, { color: colors.primaryText }]}>Abrir Dashboard</Text>
                      <SculptedIcon name="chevron-right" size={14} variant="plain" color={colors.primaryText} />
                    </TouchableOpacity>
                  </GlassCard>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Modal para Crear Evento */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <GlassCard
            variant="cyan"
            glow={isDark}
            style={[styles.modalCard, isTablet && styles.modalCardTablet]}
            contentStyle={styles.modalCardContent}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Crear Nuevo Evento Anual</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <SculptedIcon name="close" size={16} variant="plain" color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Año del Evento</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDark ? '#16181D' : colors.surfaceSubtle,
                    borderColor: isDark ? '#111317' : colors.border,
                    color: colors.textPrimary,
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
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Título o Nombre del Evento</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDark ? '#16181D' : colors.surfaceSubtle,
                    borderColor: isDark ? '#111317' : colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Ej. Vacaciones de Verano 2026"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Número de Días del Evento</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDark ? '#16181D' : colors.surfaceSubtle,
                    borderColor: isDark ? '#111317' : colors.border,
                    color: colors.textPrimary,
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
                <Text style={[styles.formLabel, { color: colors.textPrimary, marginBottom: 0 }]}>
                  Participantes Iniciales
                </Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => setIsPickDirectoryForNewEventOpen(true)}
                >
                  <SculptedIcon name="users" size={13} variant="plain" color={colors.purple} />
                  <Text style={[styles.directoryPickerLink, { color: colors.purple }]}>
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
                      <Text style={[styles.selectedChipText, { color: colors.purple }]}>
                        {c.name} ({c.subFamily || c.familyGroup})
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.formHelp, { color: colors.textSecondary }]}>
                  Importa integrantes de subfamilias desde el Directorio Global en un solo paso.
                </Text>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => setIsModalOpen(false)}
                disabled={creating}
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
                onPress={handleCreateEvent}
                disabled={creating}
              >
                <Text style={[styles.primaryButtonText, { color: isDark ? '#0B0F19' : '#FFFFFF' }]}>
                  {creating ? 'Creando...' : 'Crear y Abrir'}
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
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
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 20,
    borderBottomWidth: 1,
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
  themeIconOnlyButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleIcon: {
    fontSize: 20,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 24,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  directoryHeaderButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  directoryHeaderButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  primaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'column',
  },
  mainLayoutTablet: {
    flexDirection: 'row',
  },
  sidebar: {
    padding: 20,
    borderBottomWidth: 1,
  },
  sidebarTablet: {
    width: '25%',
    minWidth: 240,
    maxWidth: 320,
    borderBottomWidth: 0,
    borderRightWidth: 1,
    padding: 24,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  tabsContainer: {
    gap: 8,
    marginBottom: 20,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginBottom: 20,
    ...Platform.select({
      web: {
        boxShadow: 'inset 2px 2px 5px rgba(0, 0, 0, 0.45)',
      } as any,
    }),
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  directoryCardPromo: {
    marginTop: 'auto',
  },
  directoryCardPromoContent: {
    padding: 16,
    gap: 6,
  },
  directoryCardPromoTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  directoryCardPromoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  directoryCardPromoLink: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  contentArea: {
    flex: 1,
    padding: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  },
  eventCard: {
    width: '100%',
  },
  eventCardTablet: {
    flex: 1,
    minWidth: 320,
    maxWidth: '49%',
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
  },
  yearBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  archivedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  archivedBadgeText: {
    fontSize: 11,
    fontWeight: '500',
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
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '400',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
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
    fontWeight: '500',
  },
  openButtonArrow: {
    fontSize: 14,
    fontWeight: '500',
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
    borderRadius: 10,
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
    borderRadius: 12,
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
    fontWeight: '500',
  },
  selectedDirectoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  selectedChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  selectedChipText: {
    fontSize: 11,
    fontWeight: '500',
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
    fontWeight: '600',
    marginTop: 8,
  },
  loadingSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
});

