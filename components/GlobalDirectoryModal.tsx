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
} from 'react-native';
import { Radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from './GlassCard';
import { SculptedIcon } from './SculptedIcon';
import type { DirectoryParticipant, CategoryType } from '../types';
import {
  getGlobalDirectory,
  addDirectoryParticipant,
  deleteDirectoryParticipant,
  subscribeToDirectoryRealtime,
} from '../services/database';

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
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { colors, isDark, getNeonGlow } = useTheme();

  const [directory, setDirectory] = useState<DirectoryParticipant[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  // Form para agregar nuevo contacto al directorio
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<CategoryType>('adulto');
  const [newWeight, setNewWeight] = useState('1.0');
  const [newSubFamily, setNewSubFamily] = useState('Familia Santiago Bustamante');

  const loadDirectory = async () => {
    const data = await getGlobalDirectory();
    setDirectory(data);
  };

  useEffect(() => {
    if (visible) {
      loadDirectory();
      setSelectedIds(new Set());
      setShowAddForm(false);
      const unsubscribe = subscribeToDirectoryRealtime(() => {
        loadDirectory();
      });
      return () => {
        unsubscribe();
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
    Alert.alert('Eliminar del Directorio', `¿Eliminar a "${name}" del directorio global?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteDirectoryParticipant(id);
          await loadDirectory();
        },
      },
    ]);
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
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View
          style={[
            styles.container,
            isTablet && styles.containerTablet,
            { backgroundColor: colors.surface },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
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
              <SculptedIcon name="close" size={16} variant="plain" color={colors.textSecondary} />
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
                  gap: 4,
                },
              ]}
              onPress={() => setShowAddForm(!showAddForm)}
            >
              <SculptedIcon
                name={showAddForm ? 'close' : 'plus'}
                size={12}
                variant="plain"
                color={colors.purple}
              />
              <Text style={[styles.addBtnText, { color: colors.purple }]}>
                {showAddForm ? 'Cancelar' : 'Nuevo Integrante'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Formulario desplegable para agregar nuevo contacto */}
          {showAddForm && (
            <View
              style={[
                styles.formContainer,
                {
                  backgroundColor: colors.purpleLight,
                  borderBottomColor: colors.purpleBorder,
                },
              ]}
            >
              <Text style={[styles.formHeading, { color: colors.purple }]}>
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
                          gap: 4,
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
                        size={12}
                        variant="plain"
                        color={newCategory === cat.key ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.catOptionText,
                          { color: colors.textSecondary },
                          newCategory === cat.key && {
                            color: colors.primary,
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
                  <Text style={styles.saveContactBtnText}>Guardar en Directorio</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Contenedor explícito con flex: 1 y minHeight: 400 para prevenir colapso en iOS/iPadOS */}
          <View style={styles.scrollWrapper}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, { flexGrow: 1, paddingBottom: 20 }]}
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <SculptedIcon name="home" size={14} variant="plain" color={colors.textPrimary} />
                          <Text style={[styles.groupTitle, { color: colors.textPrimary }]}>{groupName}</Text>
                        </View>
                        {mode === 'import' && (
                          <TouchableOpacity onPress={() => toggleSelectGroup(members)}>
                            <Text style={[styles.selectGroupText, { color: colors.primary }]}>
                              {allGroupSelected ? 'Desmarcar Subfamilia' : 'Seleccionar Subfamilia'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.membersList}>
                        {members.map((member) => {
                          const isSelected = selectedIds.has(member.id);

                          return (
                            <TouchableOpacity
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
                                      backgroundColor: colors.surface,
                                      borderColor: colors.textMuted,
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
                                <Text style={[styles.memberName, { color: colors.textPrimary }]}>{member.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                  <SculptedIcon
                                    name={member.category === 'nino' ? 'child' : 'user'}
                                    size={11}
                                    variant="plain"
                                    color={colors.textSecondary}
                                  />
                                  <Text style={[styles.memberSub, { color: colors.textSecondary }]}>
                                    {member.category === 'nino' ? 'Niño' : 'Adulto'} • Peso:{' '}
                                    {member.weight}
                                  </Text>
                                </View>
                              </View>

                              <TouchableOpacity
                                style={styles.deleteMemberBtn}
                                onPress={() => handleDeleteContact(member.id, member.name)}
                              >
                                <SculptedIcon name="trash" size={13} variant="plain" color={colors.coral} />
                              </TouchableOpacity>
                            </TouchableOpacity>
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
                <Text style={[styles.selectAllBtnText, { color: colors.primary }]}>
                  {selectedIds.size === directory.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cerrar</Text>
              </TouchableOpacity>

              {mode === 'import' && (
                <TouchableOpacity
                  style={[
                    styles.importBtn,
                    { backgroundColor: colors.primary },
                    isDark && selectedIds.size > 0 ? getNeonGlow(colors.neonGreen, 'medium') : {},
                    selectedIds.size === 0 && {
                      backgroundColor: colors.surfaceHighlight,
                      opacity: 0.6,
                    },
                  ]}
                  onPress={handleImport}
                  disabled={selectedIds.size === 0}
                >
                  <Text style={[styles.importBtnText, { color: isDark ? '#121212' : '#FFFFFF' }]}>
                    Importar Seleccionados ({selectedIds.size})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
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
  },
  container: {
    width: '100%',
    height: '85%',
    maxHeight: '92%',
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
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
    maxWidth: 680,
    height: '80%',
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
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
  formContainer: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 10,
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
    minHeight: 400,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 20,
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
    padding: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderTopWidth: 1,
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
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  importBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
