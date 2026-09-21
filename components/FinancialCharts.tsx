import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, {
  G,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { FormatCurrency, Radii } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from './GlassCard';
import { SculptedIcon } from './SculptedIcon';
import type { EventConfig, CategoryBreakdown } from '../types';
import type { EventTotalsResult } from '../utils/calculations';

interface FinancialChartsProps {
  event: EventConfig;
  totals: EventTotalsResult;
}

interface GradientColorPair {
  start: string;
  end: string;
  glow: string;
}

const CATEGORY_GRADIENTS_DARK: Record<string, GradientColorPair> = {
  Comida: { start: '#00E676', end: '#059669', glow: '#00E676' },          // Verde Neón a Esmeralda
  Hospedaje: { start: '#00E5FF', end: '#0284C7', glow: '#00E5FF' },       // Cian Eléctrico a Azul Cielo
  Transporte: { start: '#FFAB00', end: '#D97706', glow: '#FFAB00' },      // Ámbar Neón a Dorado
  Varios: { start: '#D500F9', end: '#9333EA', glow: '#D500F9' },          // Púrpura Eléctrico a Violeta
  Entretenimiento: { start: '#FF1744', end: '#BE123C', glow: '#FF1744' }, // Coral / Magenta a Rubí
  Bebidas: { start: '#38BDF8', end: '#0369A1', glow: '#38BDF8' },         // Celeste a Azul Marino
};

const CATEGORY_GRADIENTS_LIGHT: Record<string, GradientColorPair> = {
  Comida: { start: '#16A34A', end: '#15803D', glow: '#16A34A' },
  Hospedaje: { start: '#0284C7', end: '#1D4ED8', glow: '#0284C7' },
  Transporte: { start: '#D97706', end: '#B45309', glow: '#D97706' },
  Varios: { start: '#9333EA', end: '#7E22CE', glow: '#9333EA' },
  Entretenimiento: { start: '#E11D48', end: '#BE123C', glow: '#E11D48' },
  Bebidas: { start: '#0EA5E9', end: '#0369A1', glow: '#0EA5E9' },
};

const FALLBACK_GRADIENTS_DARK: GradientColorPair[] = [
  { start: '#00E676', end: '#059669', glow: '#00E676' },
  { start: '#00E5FF', end: '#0284C7', glow: '#00E5FF' },
  { start: '#D500F9', end: '#9333EA', glow: '#D500F9' },
  { start: '#FFAB00', end: '#D97706', glow: '#FFAB00' },
  { start: '#FF1744', end: '#BE123C', glow: '#FF1744' },
  { start: '#38BDF8', end: '#0369A1', glow: '#38BDF8' },
];

const FALLBACK_GRADIENTS_LIGHT: GradientColorPair[] = [
  { start: '#16A34A', end: '#15803D', glow: '#16A34A' },
  { start: '#0284C7', end: '#1D4ED8', glow: '#0284C7' },
  { start: '#9333EA', end: '#7E22CE', glow: '#9333EA' },
  { start: '#D97706', end: '#B45309', glow: '#D97706' },
  { start: '#E11D48', end: '#BE123C', glow: '#E11D48' },
  { start: '#0EA5E9', end: '#0369A1', glow: '#0EA5E9' },
];

export const FinancialCharts: React.FC<FinancialChartsProps> = ({
  event,
  totals,
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { colors, isDark, getNeonGlow } = useTheme();

  const categoryGradients = isDark ? CATEGORY_GRADIENTS_DARK : CATEGORY_GRADIENTS_LIGHT;
  const fallbackGradients = isDark ? FALLBACK_GRADIENTS_DARK : FALLBACK_GRADIENTS_LIGHT;

  // 1. Agrupación por categoría
  const categoryBreakdown: (CategoryBreakdown & { gradient: GradientColorPair; gradientId: string })[] = useMemo(() => {
    if (!event.expenses || event.expenses.length === 0 || totals.totalExpenses === 0) {
      return [];
    }

    const map = new Map<string, { total: number; count: number }>();
    for (const exp of event.expenses) {
      const cat = exp.category?.trim() || 'Varios';
      const existing = map.get(cat) || { total: 0, count: 0 };
      map.set(cat, {
        total: existing.total + (exp.amount || 0),
        count: existing.count + 1,
      });
    }

    const items: (CategoryBreakdown & { gradient: GradientColorPair; gradientId: string })[] = [];
    let colorIdx = 0;

    map.forEach((value, key) => {
      const percentage = (value.total / totals.totalExpenses) * 100;
      const gradient =
        categoryGradients[key] || fallbackGradients[colorIdx % fallbackGradients.length];
      const gradientId = `cat_grad_${key.replace(/[^a-zA-Z0-9]/g, '_')}_${colorIdx}`;
      colorIdx++;

      items.push({
        category: key,
        total: Math.round((value.total + Number.EPSILON) * 100) / 100,
        percentage: Math.round((percentage + Number.EPSILON) * 10) / 10,
        count: value.count,
        color: gradient.start,
        gradient,
        gradientId,
      });
    });

    return items.sort((a, b) => b.total - a.total);
  }, [event.expenses, totals.totalExpenses, categoryGradients, fallbackGradients]);

  // 2. Parámetros geométricos del Anillo SVG
  const ringSize = 168;
  const ringStrokeWidth = 14;
  const ringCenter = ringSize / 2;
  const ringRadius = (ringSize - ringStrokeWidth) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;

  const donutSegments = useMemo(() => {
    if (categoryBreakdown.length === 0) return [];

    let accumulatedOffset = 0;
    return categoryBreakdown.map((item) => {
      const arcLength = (item.percentage / 100) * ringCircumference;
      const segment = {
        category: item.category,
        gradient: item.gradient,
        gradientId: item.gradientId,
        percentage: item.percentage,
        strokeDasharray: `${arcLength} ${ringCircumference}`,
        strokeDashoffset: -accumulatedOffset,
      };
      accumulatedOffset += arcLength;
      return segment;
    });
  }, [categoryBreakdown, ringCircumference]);

  // 3. Datos de Progreso de Meta y Recaudación
  const circleProgressData = useMemo(() => {
    const rawRatio = totals.totalExpenses > 0 ? totals.totalCollected / totals.totalExpenses : 0;
    const gaugePercent = Math.round(rawRatio * 100);
    const clampedRatio = Math.max(0, Math.min(1, rawRatio));
    const deficit = Math.max(0, totals.totalExpenses - totals.totalCollected);

    const size = ringSize;
    const strokeWidth = ringStrokeWidth;
    const center = ringCenter;
    const radius = ringRadius;
    const circumference = ringCircumference;
    const strokeDashoffset = circumference - clampedRatio * circumference;

    const isComplete = gaugePercent >= 100;
    const progressGradient: GradientColorPair = isDark
      ? isComplete
        ? { start: '#00E676', end: '#10B981', glow: '#00E676' }
        : { start: '#00E5FF', end: '#00E676', glow: '#00E5FF' }
      : isComplete
        ? { start: '#16A34A', end: '#15803D', glow: '#16A34A' }
        : { start: '#0284C7', end: '#16A34A', glow: '#0284C7' };

    return {
      size,
      center,
      radius,
      strokeWidth,
      circumference,
      strokeDashoffset,
      gaugePercent,
      deficit,
      isComplete,
      progressGradient,
    };
  }, [totals.totalExpenses, totals.totalCollected, ringSize, ringStrokeWidth, ringCenter, ringRadius, ringCircumference, isDark]);

  return (
    <View style={styles.container}>
      {/* 2 TARJETAS CON DISEÑO HÍBRIDO AVANZADO (Lado a lado en iPad / Laptop) */}
      <View style={[styles.chartsRow, isTablet && styles.chartsRowTablet]}>
        
        {/* ========================================================================= */}
        {/* TARJETA 1: META Y RECAUDACIÓN (HÍBRIDO: CONTENEDOR CÓNCAVO + GLOW CRISTAL) */}
        {/* ========================================================================= */}
        <GlassCard
          variant={circleProgressData.isComplete ? 'lime' : 'cyan'}
          glow={isDark}
          style={styles.cardFlex}
          contentStyle={styles.cardPadding}
        >
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SculptedIcon
                name="trending-up"
                size={16}
                containerSize={32}
                variant="sunken"
                glow={isDark}
                accentColor={circleProgressData.isComplete ? colors.neonGreen : colors.neonCyan}
                color={circleProgressData.isComplete ? colors.successText : colors.primaryText}
              />
              <View>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Meta y Recaudación
                </Text>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                  Balance de flujo y fondos en caja
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: circleProgressData.isComplete ? colors.successLight : colors.primaryLight,
                  borderColor: circleProgressData.isComplete ? colors.successBorder : colors.primaryBorder,
                  ...(isDark ? getNeonGlow(circleProgressData.isComplete ? colors.neonGreen : colors.neonCyan, 'low') : {}),
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: circleProgressData.isComplete ? colors.successText : colors.primaryText,
                  },
                ]}
              >
                {circleProgressData.isComplete ? '✓ 100% CUBIERTO' : `${circleProgressData.gaugePercent}% RECAUDADO`}
              </Text>
            </View>
          </View>

          {/* ÁREA CENTRAL: CONTENEDOR CÓNCAVO HUNDIDO (OPCIÓN 1) */}
          <View style={styles.gaugeContainer}>
            <View
              style={[
                styles.sunkenWell,
                {
                  backgroundColor: isDark ? '#16181D' : '#E8EBF2',
                  borderColor: isDark ? '#101216' : '#D0D4DC',
                },
              ]}
            >
              {/* Anillo de Trazos con Gradiente de Cristal Líquido (Opción 3) */}
              <Svg width={circleProgressData.size} height={circleProgressData.size}>
                <Defs>
                  {/* Gradiente activo para el trazado de progreso */}
                  <SvgLinearGradient
                    id="progressGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor={circleProgressData.progressGradient.start} stopOpacity="0.95" />
                    <Stop offset="100%" stopColor={circleProgressData.progressGradient.end} stopOpacity="0.80" />
                  </SvgLinearGradient>

                  {/* Gradiente sutil para el brillo de borde */}
                  <SvgLinearGradient
                    id="specularProgressGlow"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
                    <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
                  </SvgLinearGradient>
                </Defs>

                {/* 1. Carril de fondo cóncavo (Deep Recessed Canal) */}
                <Circle
                  cx={circleProgressData.center}
                  cy={circleProgressData.center}
                  r={circleProgressData.radius}
                  stroke={isDark ? '#111317' : '#D5D8E0'}
                  strokeWidth={circleProgressData.strokeWidth}
                  fill="none"
                />

                {/* 2. Capa Aura Glow ambiental suave (no saturante) */}
                <Circle
                  cx={circleProgressData.center}
                  cy={circleProgressData.center}
                  r={circleProgressData.radius}
                  stroke={circleProgressData.progressGradient.glow}
                  strokeWidth={circleProgressData.strokeWidth + 6}
                  strokeDasharray={`${circleProgressData.circumference}`}
                  strokeDashoffset={circleProgressData.strokeDashoffset}
                  strokeLinecap="round"
                  opacity={isDark ? 0.22 : 0.15}
                  fill="none"
                  transform={`rotate(-90 ${circleProgressData.center} ${circleProgressData.center})`}
                />

                {/* 3. Trazado Principal de Cristal Líquido con Gradiente */}
                <Circle
                  cx={circleProgressData.center}
                  cy={circleProgressData.center}
                  r={circleProgressData.radius}
                  stroke="url(#progressGradient)"
                  strokeWidth={circleProgressData.strokeWidth}
                  strokeDasharray={`${circleProgressData.circumference}`}
                  strokeDashoffset={circleProgressData.strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  transform={`rotate(-90 ${circleProgressData.center} ${circleProgressData.center})`}
                />

                {/* 4. Línea de Brillo Especular / Specular Glow Edge (Opción 3) */}
                <Circle
                  cx={circleProgressData.center}
                  cy={circleProgressData.center}
                  r={circleProgressData.radius}
                  stroke="url(#specularProgressGlow)"
                  strokeWidth={2}
                  strokeDasharray={`${circleProgressData.circumference}`}
                  strokeDashoffset={circleProgressData.strokeDashoffset}
                  strokeLinecap="round"
                  opacity={isDark ? 0.7 : 0.4}
                  fill="none"
                  transform={`rotate(-90 ${circleProgressData.center} ${circleProgressData.center})`}
                />
              </Svg>

              {/* PODIO CENTRAL FLOTANTE CON RELIEVE HACIA AFUERA (OPCIÓN 1) */}
              <View
                style={[
                  styles.floatingCore,
                  {
                    backgroundColor: isDark ? '#22242A' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
              >
                <Text style={[styles.floatingCoreLabel, { color: colors.textSecondary }]}>
                  META
                </Text>
                <Text style={[styles.floatingCoreValue, { color: colors.textPrimary }]}>
                  {`${circleProgressData.gaugePercent}%`}
                </Text>
                <Text
                  style={[
                    styles.floatingCoreStatus,
                    { color: circleProgressData.isComplete ? (isDark ? colors.neonGreen : colors.success) : colors.textMuted },
                  ]}
                >
                  {circleProgressData.isComplete ? 'COMPLETO' : 'RECAUDADO'}
                </Text>
              </View>
            </View>
          </View>

          {/* Píldora de Recaudado vs Meta con relieve sutil */}
          <View
            style={[
              styles.gaugePill,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.gaugePillText, { color: colors.textSecondary }]}>
              Cobrado <Text style={[styles.bold, { color: isDark ? colors.neonGreen : colors.primary }]}>{FormatCurrency(totals.totalCollected)}</Text> de <Text style={[styles.bold, { color: colors.textPrimary }]}>{FormatCurrency(totals.totalExpenses)}</Text>
            </Text>
          </View>
        </GlassCard>

        {/* ========================================================================= */}
        {/* TARJETA 2: DISTRIBUCIÓN DE GASTOS (HÍBRIDO: CANAL CÓNCAVO + GLOW CRISTAL) */}
        {/* ========================================================================= */}
        <GlassCard
          variant="purple"
          glow={isDark}
          style={styles.cardFlex}
          contentStyle={styles.cardPadding}
        >
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SculptedIcon
                name="cart"
                size={16}
                containerSize={32}
                variant="sunken"
                glow={isDark}
                accentColor={colors.neonPurple}
                color={colors.purple}
              />
              <View>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Distribución Presupuestaria
                </Text>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                  Desglose proporcional por categoría
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: colors.purpleLight,
                  borderColor: colors.purpleBorder,
                  ...(isDark ? getNeonGlow(colors.neonPurple, 'low') : {}),
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: colors.purple }]}>
                {event.expenses.length} compra{event.expenses.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {categoryBreakdown.length === 0 ? (
            <View style={styles.emptyState}>
              <SculptedIcon name="calendar" size={28} containerSize={56} variant="sunken" color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sin compras registradas aún</Text>
            </View>
          ) : (
            <View style={styles.donutRow}>
              {/* CONTENEDOR CÓNCAVO HUNDIDO DEL ANILLO (OPCIÓN 1) */}
              <View
                style={[
                  styles.sunkenWell,
                  {
                    backgroundColor: isDark ? '#16181D' : '#E8EBF2',
                    borderColor: isDark ? '#101216' : '#D0D4DC',
                  },
                ]}
              >
                <Svg width={ringSize} height={ringSize}>
                  <Defs>
                    {/* Gradientes dinámicos para cada categoría de gasto */}
                    {donutSegments.map((segment) => (
                      <SvgLinearGradient
                        key={segment.gradientId}
                        id={segment.gradientId}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <Stop offset="0%" stopColor={segment.gradient.start} stopOpacity="0.95" />
                        <Stop offset="100%" stopColor={segment.gradient.end} stopOpacity="0.75" />
                      </SvgLinearGradient>
                    ))}
                  </Defs>

                  {/* 1. Carril de fondo cóncavo (Deep Recessed Canal) */}
                  <Circle
                    cx={ringCenter}
                    cy={ringCenter}
                    r={ringRadius}
                    stroke={isDark ? '#111317' : '#D5D8E0'}
                    strokeWidth={ringStrokeWidth}
                    fill="none"
                  />

                  {/* 2. Capa Aura Glow de segmentos */}
                  <G transform={`rotate(-90 ${ringCenter} ${ringCenter})`}>
                    {donutSegments.map((segment, i) => (
                      <Circle
                        key={`glow_${i}`}
                        cx={ringCenter}
                        cy={ringCenter}
                        r={ringRadius}
                        stroke={segment.gradient.glow}
                        strokeWidth={ringStrokeWidth + 4}
                        strokeDasharray={segment.strokeDasharray}
                        strokeDashoffset={segment.strokeDashoffset}
                        opacity={isDark ? 0.20 : 0.12}
                        fill="none"
                      />
                    ))}
                  </G>

                  {/* 3. Segmentos Principales de Cristal Líquido con Gradientes */}
                  <G transform={`rotate(-90 ${ringCenter} ${ringCenter})`}>
                    {donutSegments.map((segment, i) => (
                      <Circle
                        key={`core_${i}`}
                        cx={ringCenter}
                        cy={ringCenter}
                        r={ringRadius}
                        stroke={`url(#${segment.gradientId})`}
                        strokeWidth={ringStrokeWidth}
                        strokeDasharray={segment.strokeDasharray}
                        strokeDashoffset={segment.strokeDashoffset}
                        fill="none"
                      />
                    ))}
                  </G>

                  {/* 4. Líneas de Brillo Especular en los Segmentos */}
                  <G transform={`rotate(-90 ${ringCenter} ${ringCenter})`}>
                    {donutSegments.map((segment, i) => (
                      <Circle
                        key={`highlight_${i}`}
                        cx={ringCenter}
                        cy={ringCenter}
                        r={ringRadius}
                        stroke="#FFFFFF"
                        strokeWidth={1.8}
                        strokeDasharray={segment.strokeDasharray}
                        strokeDashoffset={segment.strokeDashoffset}
                        opacity={isDark ? 0.35 : 0.25}
                        fill="none"
                      />
                    ))}
                  </G>
                </Svg>

                {/* PODIO CENTRAL FLOTANTE CON RELIEVE HACIA AFUERA (OPCIÓN 1) */}
                <View
                  style={[
                    styles.floatingCore,
                    {
                      backgroundColor: isDark ? '#22242A' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                    },
                  ]}
                >
                  <Text style={[styles.floatingCoreLabel, { color: colors.textSecondary }]}>
                    TOTAL
                  </Text>
                  <Text style={[styles.floatingCoreValueSmall, { color: colors.textPrimary }]}>
                    {FormatCurrency(totals.totalExpenses).split('.')[0]}
                  </Text>
                  <Text style={[styles.floatingCoreStatus, { color: colors.textMuted }]}>
                    GASTOS
                  </Text>
                </View>
              </View>

              {/* Lista limpia de categorías con chips esculpidos */}
              <View style={styles.categoryList}>
                {categoryBreakdown.slice(0, 4).map((item) => (
                  <View key={item.category} style={styles.catRow}>
                    <View
                      style={[
                        styles.catDot,
                        {
                          backgroundColor: item.gradient.start,
                          ...(isDark ? getNeonGlow(item.gradient.glow, 'low') : {}),
                        },
                      ]}
                    />
                    <Text style={[styles.catName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.category}
                    </Text>
                    <Text style={[styles.catPercent, { color: colors.textSecondary }]}>
                      {item.percentage}%
                    </Text>
                    <Text style={[styles.catAmount, { color: colors.textPrimary }]}>
                      {FormatCurrency(item.total)}
                    </Text>
                  </View>
                ))}
                {categoryBreakdown.length > 4 && (
                  <Text style={[styles.catMoreText, { color: colors.textMuted }]}>
                    +{categoryBreakdown.length - 4} categorías más
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Píldora de Promedio / Resumen con relieve sutil (Simetría con Tarjeta 1) */}
          <View
            style={[
              styles.gaugePill,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.gaugePillText, { color: colors.textSecondary }]}>
              {categoryBreakdown.length > 0 ? (
                <>
                  Promedio diario <Text style={[styles.bold, { color: isDark ? colors.neonPurple : colors.purple }]}>{FormatCurrency(totals.totalExpenses / Math.max(1, event.availableDays?.length || 1))}</Text> • <Text style={[styles.bold, { color: colors.textPrimary }]}>{categoryBreakdown.length} categorías</Text>
                </>
              ) : (
                <>
                  Registra compras con el botón <Text style={[styles.bold, { color: isDark ? colors.neonCyan : colors.primary }]}>+ Gasto</Text>
                </>
              )}
            </Text>
          </View>
        </GlassCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
    width: '100%',
    alignSelf: 'stretch',
  },
  chartsRow: {
    flexDirection: 'column',
    gap: 16,
    width: '100%',
    alignSelf: 'stretch',
  },
  chartsRowTablet: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
    width: '100%',
    alignSelf: 'stretch',
  },
  cardFlex: {
    flex: 1,
    minHeight: 330,
    alignSelf: 'stretch',
  },
  cardPadding: {
    padding: 20,
    gap: 16,
    flex: 1,
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    flex: 1,
    minHeight: 176,
    alignSelf: 'stretch',
  },
  // Contenedor Cóncavo Hundido (Opción 1)
  sunkenWell: {
    width: 176,
    height: 176,
    borderRadius: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow:
          'inset 4px 4px 10px rgba(0, 0, 0, 0.65), inset -3px -3px 8px rgba(255, 255, 255, 0.04)',
      } as any,
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
        elevation: 1,
      },
    }),
  },
  // Podio Central Flotante con Relieve hacia Afuera (Opción 1)
  floatingCore: {
    position: 'absolute',
    width: 98,
    height: 98,
    borderRadius: 49,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow:
          '-3px -3px 7px rgba(255, 255, 255, 0.045), 4px 4px 10px rgba(0, 0, 0, 0.60)',
      } as any,
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 2, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  floatingCoreLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 1,
  },
  floatingCoreValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  floatingCoreValueSmall: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  floatingCoreStatus: {
    fontSize: 8.5,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  gaugePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: 2,
    alignItems: 'center',
  },
  gaugePillText: {
    fontSize: 12,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flex: 1,
    minHeight: 176,
    paddingVertical: 4,
    alignSelf: 'stretch',
  },
  categoryList: {
    flex: 1,
    gap: 10,
    justifyContent: 'center',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catName: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  catPercent: {
    fontSize: 12,
    fontWeight: '500',
  },
  catAmount: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  catMoreText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    flex: 1,
    minHeight: 176,
    alignSelf: 'stretch',
  },
  emptyText: {
    fontSize: 13,
  },
  bold: {
    fontWeight: '600',
  },
});


