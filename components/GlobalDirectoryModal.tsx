import React, { useState, useEffect, useMemo } from 'react';
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
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { GlassCard } from './GlassCard';
import { SculptedIcon } from './SculptedIcon';
import type { DirectoryParticipant, CategoryType } from '../types';
import {
  getGlobalDirectory,
  addDirectoryParticipant,
  deleteDirectoryParticipant,
  subscribeToDirectoryRealtime,
  globalDirectorySyncFromRemote,
} from '../services/database';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface GlobalDirectoryModalProps {
  visible: boolean;
  onClose: () => void;
  onImportSelected?: (selectedContacts: DirectoryParticipant[]) => void;
  mode?: 'import' | 'manage';
}

export const GlobalDirectoryModal: React.FC<GlobalDirectoryModalProps> = ({
  visible,
  onClose,
  onImportSelected,
  mode = 'import',
}) => {
  const { isMobile, isTablet, isDesktop, isTabletOrDesktop, insets } = useResponsiveLayout();
  const { colors, isDark, getNeonGlow, getLiquidGlass } = useTheme();

  const [directory, setDirectory] = useState<DirectoryParticipant[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  // Form para agregar nuevo contacto al directorio
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<CategoryType>('adulto');
  const [newWeight, setNewWeight] = useState('1.0');
  const [newSubFamily, setNewSubFamily] = useState('Familia Santiago Bustamante');

  // Estado del modal de confirmación de eliminación
  const [confirmDelete, setConfirmDelete] = useState<{
    visible: boolean;
    id: string;
    name: string;
  }>({
    visible: false,
    id: '',
    name: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDirectory = async () => {
    try {
      const data = await getGlobalDirectory();
      setDirectory([...data]);
    } catch (e) {
      console.error('[GlobalDirectoryModal] Error cargando directorio:', e);
    }
  };

  useEffect(() => {
    if (visible) {
      loadDirectory();
      setSelectedIds(new Set());
      setShowAddForm(false);

      const unsubscribe = subscribeToDirectoryRealtime(async (payload) => {
        if (payload?.data && Array.isArray(payload.data)) {
          await globalDirectorySyncFromRemote(payload.data);
        }
        await loadDirectory();
      });

      let dirChannel: any = null;
      if (isSupabaseConfigured) {
        dirChannel = supabase
          .channel('chapapp_directory_realtime')
          .on('broadcast', { event: 'db_sync' }, async (res: any) => {
            if (res.payload?.entityType === 'directory' || res.payload?.entityType === 'participant') {
              console.log('[Directorio Realtime] ⚡ Actualización recibida vía broadcast:', res.payload);
              if (res.payload?.data && Array.isArray(res.payload.data)) {
                await globalDirectorySyncFromRemote(res.payload.data);
              }
              await loadDirectory();
            }
          })
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'participants' },
            async () => {
              console.log('[Directorio Realtime] 📢 Cambio en tabla participants detectado');
              await loadDirectory();
            }
          )
          .subscribe((status: string) => {
            console.log(`[Directorio Realtime] 📡 Estado canal: "${status}"`);
          });
      }

      return () => {
        unsubscribe();
        if (dirChannel) {
          supabase.removeChannel(dirChannel);
        }
      };
    }
  }, [visible]);

  // Filtrar y agrupar por subfamilia
  const groupedDirectory = useMemo(() => {
    const filtered = directory.filter((item) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const sfName = item.subFamily || item.familyGroup || '';
      return (
        item.name.toLowerCase().includes(q) ||
        sfName.toLowerCase().includes(q)
      );
    });

    const groups = new Map<string, DirectoryParticipant[]>();
    for (const item of filtered) {
      const g = item.subFamily || item.familyGroup || 'Familia General';
      const list = groups.get(g) || [];
      list.push(item);
      groups.set(g, list);
    }

    return Array.from(groups.entries());
  }, [directory, search]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectGroup = (members: DirectoryParticipant[]) => {
    const allSelected = members.every((m) => selectedIds.has(m.id));
    const next = new Set(selectedIds);
    if (allSelected) {
      members.forEach((m) => next.delete(m.id));
    } else {
      members.forEach((m) => next.add(m.id));
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === directory.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(directory.map((d) => d.id)));
    }
  };

  const handleAddNewContact = async () => {
    if (!newName.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el nombre del participante.');
      return;
    }

    const weightNum = parseFloat(newWeight) || (newCategory === 'nino' ? 0.5 : 1.0);
    await addDirectoryParticipant({
      name: newName.trim(),
      category: newCategory,
      weight: weightNum,
      subFamily: newSubFamily.trim() || 'Familia General',
      familyGroup: newSubFamily.trim() || 'Familia General',
    });

    setNewName('');
    setShowAddForm(false);
    await loadDirectory();
  };

  const handleDeleteContact = (id: string, name: string) => {
    setConfirmDelete({
      visible: true,
      id,
      name,
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete.id) return;
    const targetId = confirmDelete.id;
    try {
      setIsDeleting(true);
      // Actualización optimista inmediata en la UI
      setDirectory((prev) => prev.filter((d) => String(d.id) !== String(targetId)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      await deleteDirectoryParticipant(targetId);
      setConfirmDelete({ visible: false, id: '', name: '' });
      await loadDirectory();
    } catch (err) {
      console.error('Error al eliminar participante del directorio:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImport = () => {
    if (selectedIds.size === 0) {
      Alert.alert('Selección requerida', 'Selecciona al menos un participante para importar.');
      return;
    }

    const selected = directory.filter((d) => selectedIds.has(d.id));
    if (onImportSelected) {
      onImportSelected(selected);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType={isTablet ? 'fade' : 'slide'}>
      <View
        style={[
          styles.backdrop,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.55)',
            ...(Platform.OS === 'web'
              ? ({
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                } as any)
              : {}),
          },
        ]}
      >
        <View
          style={[
            styles.container,
            isTablet && styles.containerTablet,
            getLiquidGlass('modal'),
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIcon, { backgroundColor: colors.purpleLight }]}>
                <SculptedIcon name="users" size={20} variant="plain" color={colors.purple} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Directorio Global de Subfamilias</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Familias e invitados recurrentes para importación en un solo toque
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
              onPress={onClose}
            >
              <SculptedIcon name="close" size={16} variant="plain" color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Barra de Búsqueda y Botón de Nuevo Contacto */}
          <View
            style={[
              styles.toolbar,
              { backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <SculptedIcon name="search" size={14} variant="plain" color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Buscar por nombre o subfamilia..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.addBtn,
                {
                  backgroundColor: colors.purpleLight,
                  borderColor: colors.purpleBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                },
              ]}
              onPress={() => setShowAddForm(!showAddForm)}
            >
              <SculptedIcon
                name={showAddForm ? 'close' : 'plus'}
                size={13}
                variant="plain"
                color={colors.purple}
              />
              <Text style={[styles.addBtnText, { color: colors.purple, fontWeight: '700' }]}>
                {showAddForm ? 'Cancelar' : 'Nuevo Integrante'}
              </Text>
            </TouchableOpacity>

            {mode === 'import' && selectedIds.size > 0 && (
              <TouchableOpacity
                style={[
                  styles.quickImportBtn,
                  {
                    backgroundColor: colors.primary,
                  },
                  isDark ? getNeonGlow(colors.neonGreen, 'low') : {},
                ]}
                onPress={handleImport}
                activeOpacity={0.8}
              >
                <SculptedIcon name="plus" size={13} variant="plain" color="#FFFFFF" />
                <Text style={styles.quickImportBtnText}>
                  Agregar ({selectedIds.size})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Formulario desplegable para agregar nuevo contacto */}
          {showAddForm && (
            <View
              style={[
                styles.formContainer,
                {
                  backgroundColor: isDark ? 'rgba(192, 132, 252, 0.10)' : 'rgba(124, 58, 237, 0.08)',
                  borderBottomColor: colors.purpleBorder,
                },
              ]}
            >
              <Text style={[styles.formHeading, { color: colors.purple, fontWeight: '700' }]}>
                Agregar Integrante Frecuente
              </Text>
              <View style={styles.formGrid}>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="Nombre y Apellido"
                  placeholderTextColor={colors.textMuted}
                  value={newName}
                  onChangeText={setNewName}
                />
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="Subfamilia (ej. Familia Santiago Bustamante)"
                  placeholderTextColor={colors.textMuted}
                  value={newSubFamily}
                  onChangeText={setNewSubFamily}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.categorySelectors}>
                  {[
                    { key: 'adulto', label: 'Adulto (1.0)', weight: '1.0', icon: 'user' as const },
                    { key: 'nino', label: 'Niño (0.5)', weight: '0.5', icon: 'child' as const },
                  ].map((cat) => (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.catOption,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        },
                        newCategory === cat.key && {
                          backgroundColor: colors.primaryLight,
                          borderColor: colors.primaryBorder,
                        },
                      ]}
                      onPress={() => {
                        setNewCategory(cat.key as CategoryType);
                        setNewWeight(cat.weight);
                      }}
                    >
                      <SculptedIcon
                        name={cat.icon}
                        size={13}
                        variant="plain"
                        color={newCategory === cat.key ? colors.primaryText : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.catOptionText,
                          { color: colors.textSecondary },
                          newCategory === cat.key && {
                            color: colors.primaryText,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveContactBtn,
                    { backgroundColor: colors.purple },
                    isDark ? getNeonGlow(colors.neonPurple, 'low') : {},
                  ]}
                  onPress={handleAddNewContact}
                >
                  <Text style={[styles.saveContactBtnText, { color: '#FFFFFF', fontWeight: '700' }]}>
                    Guardar en Directorio
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Contenedor con flex: 1 */}
          <View style={styles.scrollWrapper}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, { flexGrow: 1, paddingBottom: 24 }]}
              showsVerticalScrollIndicator={true}
            >
              {groupedDirectory.length === 0 ? (
                <View style={styles.emptyView}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No se encontraron contactos en el directorio.
                  </Text>
                </View>
              ) : (
                groupedDirectory.map(([groupName, members]) => {
                  const allGroupSelected = members.every((m) => selectedIds.has(m.id));

                  return (
                    <GlassCard
                      key={groupName}
                      variant="purple"
                      glow={isDark && allGroupSelected}
                      borderRadius={14}
                      contentStyle={styles.groupCardInner}
                    >
                      <View style={[styles.groupHeader, { borderBottomColor: colors.borderLight }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <SculptedIcon name="home" size={15} variant="plain" color={colors.textPrimary} />
                          <Text style={[styles.groupTitle, { color: colors.textPrimary, fontWeight: '700' }]}>{groupName}</Text>
                        </View>
                        {mode === 'import' && (
                          <TouchableOpacity onPress={() => toggleSelectGroup(members)}>
                            <Text style={[styles.selectGroupText, { color: colors.primaryText, fontWeight: '700' }]}>
                              {allGroupSelected ? 'Desmarcar Subfamilia' : 'Seleccionar Subfamilia'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.membersList}>
                        {members.map((member) => {
                          const isSelected = selectedIds.has(member.id);

                          return (
                            <View
                              key={member.id}
                              style={[
                                styles.memberRow,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: colors.border,
                                },
                                isSelected && {
                                  borderColor: colors.primary,
                                  backgroundColor: colors.primaryLight,
                                },
                              ]}
                            >
                              <TouchableOpacity
                                style={styles.memberInfoArea}
                                onPress={() => {
                                  if (mode === 'import') toggleSelect(member.id);
                                }}
                                activeOpacity={0.7}
                              >
                                {mode === 'import' && (
                                  <View
                                    style={[
                                      styles.checkbox,
                                      {
                                        backgroundColor: colors.surfaceSubtle,
                                        borderColor: colors.border,
                                      },
                                      isSelected && {
                                        backgroundColor: colors.primary,
                                        borderColor: colors.primary,
                                      },
                                    ]}
                                  >
                                    {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
                                  </View>
                                )}

                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.memberName, { color: colors.textPrimary, fontWeight: '700' }]}>{member.name}</Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                    <SculptedIcon
                                      name={member.category === 'nino' ? 'child' : 'user'}
                                      size={12}
                                      variant="plain"
                                      color={colors.textSecondary}
                                    />
                                    <Text style={[styles.memberSub, { color: colors.textSecondary }]}>
                                      {member.category === 'nino' ? 'Niño' : 'Adulto'} • Peso:{' '}
                                      {member.weight}
                                    </Text>
                                  </View>
                                </View>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.deleteMemberBtn,
                                  {
                                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                                  },
                                ]}
                                onPress={() => handleDeleteContact(member.id, member.name)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                activeOpacity={0.6}
                              >
                                <SculptedIcon name="trash" size={15} variant="plain" color={colors.dangerText} />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    </GlassCard>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* Footer de Acciones */}
          <View
            style={[
              styles.footer,
              { borderTopColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            {mode === 'import' && (
              <TouchableOpacity style={styles.selectAllBtn} onPress={handleSelectAll}>
                <Text style={[styles.selectAllBtnText, { color: colors.primaryText, fontWeight: '700' }]}>
                  {selectedIds.size === directory.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, borderWidth: 1 }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>Cerrar</Text>
              </TouchableOpacity>

              {mode === 'import' && (
                <TouchableOpacity
                  style={[
                    styles.importBtn,
                    { backgroundColor: colors.primary },
                    isDark && selectedIds.size > 0 ? getNeonGlow(colors.neonGreen, 'medium') : {},
                    selectedIds.size === 0 && {
                      backgroundColor: colors.surfaceHighlight,
                      opacity: 0.5,
                    },
                  ]}
                  onPress={handleImport}
                  disabled={selectedIds.size === 0}
                  activeOpacity={0.8}
                >
                  <SculptedIcon
                    name="plus"
                    size={14}
                    variant="plain"
                    color={selectedIds.size === 0 ? colors.textMuted : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.importBtnText,
                      { color: selectedIds.size === 0 ? colors.textMuted : '#FFFFFF', fontWeight: '700' },
                    ]}
                  >
                    Agregar al Evento ({selectedIds.size})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Modal de Confirmación para Eliminar Integrante (In-Modal Overlay) */}
          {confirmDelete.visible && (
            <View style={styles.confirmOverlay}>
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={isDeleting ? undefined : () => setConfirmDelete({ visible: false, id: '', name: '' })}
              />
              <View style={[styles.confirmDialog, { maxWidth: isTablet ? 420 : 340 }]}>
                <GlassCard
                  borderRadius={Radii.xxl}
                  variant="coral"
                  glow={isDark}
                  style={{ width: '100%' }}
                >
                  <View style={{ padding: 22, alignItems: 'center', gap: 14 }}>
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: colors.dangerLight,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SculptedIcon name="trash" size={24} variant="plain" color={colors.danger} />
                    </View>
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' }}>
                        Eliminar del Directorio
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 }}>
                        ¿Estás seguro de que deseas eliminar a "{confirmDelete.name}" del directorio global de subfamilias?
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 6 }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.surfaceSubtle,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onPress={() => setConfirmDelete({ visible: false, id: '', name: '' })}
                        disabled={isDeleting}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>Cancelar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 10,
                          backgroundColor: colors.danger,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 6,
                        }}
                        onPress={handleConfirmDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Eliminar</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </GlassCard>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
    maxHeight: 750,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
      } as any,
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  containerTablet: {
    maxWidth: 720,
    height: '85%',
    maxHeight: 750,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    flexShrink: 0,
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
    flexShrink: 0,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickImportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickImportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  formContainer: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 10,
    flexShrink: 0,
  },
  formHeading: {
    fontSize: 13,
    fontWeight: '500',
  },
  formGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  formInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  categorySelectors: {
    flexDirection: 'row',
    gap: 8,
  },
  catOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  catOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  saveContactBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveContactBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  scrollWrapper: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 24,
    gap: 16,
  },
  emptyView: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  groupCardInner: {
    padding: 14,
    gap: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectGroupText: {
    fontSize: 12,
    fontWeight: '500',
  },
  membersList: {
    gap: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  memberInfoArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCheck: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberSub: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteMemberBtn: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    flexShrink: 0,
    gap: 12,
  },
  selectAllBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  selectAllBtnText: {
    fontSize: 13,
    fontWeight: '500',
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
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  importBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
    elevation: 20,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      } as any,
    }),
  },
  confirmDialog: {
    width: '100%',
    zIndex: 10000,
    elevation: 21,
  },
});
