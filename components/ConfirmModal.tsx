import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from './GlassCard';
import { SculptedIcon, IconName } from './SculptedIcon';
import { Fonts, Radii } from '../constants/theme';

export type ConfirmVariant = 'danger' | 'warning' | 'success' | 'teal' | 'primary';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: IconName;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  icon,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();

  if (!visible) return null;

  const isMobile = width < 600;

  // Seleccionar ícono por defecto según la variante si no se especifica uno
  const resolvedIcon: IconName =
    icon ||
    (variant === 'danger'
      ? 'trash'
      : variant === 'warning'
      ? 'close'
      : variant === 'success' || variant === 'teal'
      ? 'check-circle'
      : 'check');

  // Colores temáticos para cada variante
  let accentColor = colors.danger;
  let accentBg = colors.dangerLight;
  let confirmBtnBg = colors.danger;
  let confirmBtnText = '#FFFFFF';
  let cardVariant: 'coral' | 'amber' | 'lime' | 'cyan' | 'default' = 'coral';

  if (variant === 'warning') {
    accentColor = colors.warning;
    accentBg = colors.warningLight;
    confirmBtnBg = colors.warning;
    confirmBtnText = isDark ? '#0D1117' : '#FFFFFF';
    cardVariant = 'amber';
  } else if (variant === 'success') {
    accentColor = colors.success;
    accentBg = colors.successLight;
    confirmBtnBg = colors.success;
    confirmBtnText = isDark ? '#0D1117' : '#FFFFFF';
    cardVariant = 'lime';
  } else if (variant === 'teal') {
    accentColor = colors.teal;
    accentBg = colors.tealLight;
    confirmBtnBg = colors.teal;
    confirmBtnText = isDark ? '#0D1117' : '#FFFFFF';
    cardVariant = 'cyan';
  } else if (variant === 'primary') {
    accentColor = colors.primary;
    accentBg = colors.primaryLight;
    confirmBtnBg = colors.primary;
    confirmBtnText = isDark ? '#0D1117' : '#FFFFFF';
    cardVariant = 'cyan';
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
    >
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: isDark ? 'rgba(20, 18, 16, 0.75)' : 'rgba(20, 18, 16, 0.40)',
            ...(Platform.OS === 'web'
              ? ({
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                } as any)
              : {}),
          },
        ]}
      >
        {/* Fondo táctil para cerrar */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={loading ? undefined : onCancel}
        />

        {/* Tarjeta del Diálogo Centrada */}
        <View
          style={[
            styles.modalContainer,
            {
              maxWidth: isMobile ? 380 : 460,
              width: isMobile ? '92%' : '88%',
            },
          ]}
        >
          <GlassCard
            borderRadius={Radii.xxl}
            variant={cardVariant}
            glow={isDark}
            style={styles.dialogCard}
          >
            <View style={styles.dialogContent}>
              {/* Badge de Ícono Superior */}
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: accentBg,
                    borderColor: isDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.60)',
                  },
                ]}
              >
                <SculptedIcon
                  name={resolvedIcon}
                  size={30}
                  containerSize={60}
                  variant="plain"
                  color={accentColor}
                />
              </View>

              {/* Título */}
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.textPrimary,
                    fontFamily: Fonts.bold,
                  },
                ]}
              >
                {title}
              </Text>

              {/* Mensaje descriptivo */}
              <Text
                style={[
                  styles.message,
                  {
                    color: colors.textSecondary,
                    fontFamily: Fonts.regular,
                  },
                ]}
              >
                {message}
              </Text>

              {/* Botones de Acción */}
              <View
                style={[
                  styles.buttonRow,
                  isMobile && styles.buttonRowMobile,
                ]}
              >
                {/* Botón Cancelar */}
                <TouchableOpacity
                  style={[
                    styles.btn,
                    styles.cancelBtn,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      borderWidth: 1,
                      ...(Platform.OS === 'web'
                        ? ({
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                          } as any)
                        : {}),
                    },
                  ]}
                  onPress={onCancel}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.cancelBtnText,
                      {
                        color: colors.textPrimary,
                        fontFamily: Fonts.semiBold,
                      },
                    ]}
                  >
                    {cancelText}
                  </Text>
                </TouchableOpacity>

                {/* Botón de Confirmación Principal */}
                <TouchableOpacity
                  style={[
                    styles.btn,
                    styles.confirmBtn,
                    {
                      backgroundColor: confirmBtnBg,
                      borderWidth: 0,
                      shadowColor: confirmBtnBg,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: isDark ? 0.35 : 0.25,
                      shadowRadius: 8,
                      elevation: 4,
                    },
                  ]}
                  onPress={onConfirm}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={confirmBtnText} />
                  ) : (
                    <Text
                      style={[
                        styles.confirmBtnText,
                        {
                          color: confirmBtnText,
                          fontFamily: Fonts.bold,
                        },
                      ]}
                    >
                      {confirmText}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    alignSelf: 'center',
    width: '100%',
    zIndex: 10,
  },
  dialogCard: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  dialogContent: {
    width: '100%',
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    justifyContent: 'center',
  },
  buttonRowMobile: {
    flexDirection: 'column-reverse',
    gap: 10,
  },
  btn: {
    flex: 1,
    minHeight: 46,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 15,
  },
  confirmBtn: {},
  confirmBtnText: {
    fontSize: 15,
    letterSpacing: 0.2,
  },
});