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
  Path,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Stop,
} from 'react-native-svg';
import { FormatCurrency, Radii, Fonts } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from './GlassCard';
import { SculptedIcon } from './SculptedIcon';
import type { EventConfig, CategoryBreakdown } from '../types';
import type { EventTotalsResult } from '../utils/calculations';

interface FinancialChartsProps {
  event: EventConfig;
  totals: EventTotalsResult;
}

// Paleta coordinada de tonos pasteles ejecutivos para categorías
const PASTEL_CATEGORY_COLORS: Record<string, string> = {
  Comida: '#F59E0B',           // Ámbar cálido pastel
  'Gastos Generales': '#38BDF8', // Azul acero pastel
  Varios: '#C084FC',           // Lavanda suave pastel
  Rentas: '#FB7185',           // Terracota / Coral pastel
  Mejoras: '#10B981',          // Menta esmeralda
  Hospedaje: '#FB923C',        // Terracota naranja suave
  Transporte: '#60A5FA',       // Azul pastel
  Entretenimiento: '#F472B6',  // Rosa pastel
  Bebidas: '#818CF8',          // Índigo lavanda
};

const PASTEL_FALLBACK_COLORS = [
  '#F59E0B',
  '#38BDF8',
  '#C084FC',
  '#FB7185',
  '#10B981',
  '#FB923C',
  '#818CF8',
];

/**
 * Generador de trayectorias SVG ondulantes (Fluid Wave Ribbons)
 * Genera una onda fluida orgánica continua que simula líquido o refracción dentro del cristal.
 */
function createFluidWavePath(
  cx: number,
  cy: number,
  baseRadius: number,
  amplitude: number,
  waves: number,
  phase: number = 0
): string {
  const steps = waves * 16;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const r = baseRadius + amplitude * Math.sin(waves * angle + phase);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) {
      d += `M ${x.toFixed(2)} ${y.toFixed(2)}`;
    } else {
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  }
  d += ' Z';
  return d;
}

export const FinancialCharts: React.FC<FinancialChartsProps> = ({
  event,
  totals,
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { colors, isDark } = useTheme();

  // 1. Agrupación por categoría (Todas las 5 categorías estándar o registradas)
  const categoryBreakdown: (CategoryBreakdown & { color: string })[] = useMemo(() => {
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

    const items: (CategoryBreakdown & { color: string })[] = [];
    let colorIdx = 0;

    map.forEach((value, key) => {
      const percentage = (value.total / totals.totalExpenses) * 100;
      const color =
        PASTEL_CATEGORY_COLORS[key] || PASTEL_FALLBACK_COLORS[colorIdx % PASTEL_FALLBACK_COLORS.length];
      colorIdx++;

      items.push({
        category: key,
        total: Math.round((value.total + Number.EPSILON) * 100) / 100,
        percentage: Math.round((percentage + Number.EPSILON) * 10) / 10,
        count: value.count,
        color,
      });
    });

    return items.sort((a, b) => b.total - a.total);
  }, [event.expenses, totals.totalExpenses]);

  // Dimensiones del Anillo Principal de Meta (Gráfica 1)
  const size = 220;
  const center = size / 2; // 110
  const trackRadius = 74;
  const trackStrokeWidth = 14;
  const trackCircumference = 2 * Math.PI * trackRadius; // ~464.95
  const outerOrbitRadius = 96;
  const innerRingRadius = 54;

  // Curvas de ondas fluidas (Fluid Liquid Ribbons)
  const waveRibbon1 = useMemo(() => createFluidWavePath(center, center, 74, 8, 4, 0), [center]);
  const waveRibbon2 = useMemo(() => createFluidWavePath(center, center, 74, 6, 5, Math.PI / 3), [center]);

  // 2. Gráfica 1: ANILLO FLUIDO DE META Y RECAUDACIÓN
  const circleProgressData = useMemo(() => {
    const rawRatio = totals.totalExpenses > 0 ? totals.totalCollected / totals.totalExpenses : 0;
    const gaugePercent = Math.round(rawRatio * 100);
    const clampedRatio = Math.max(0, Math.min(1, rawRatio));
    const isComplete = gaugePercent >= 100;
    const strokeDashoffset = trackCircumference - clampedRatio * trackCircumference;

    // Satélite en la órbita exterior indicando el progreso actual (El Rayito / Satélite)
    const orbitAngle = -Math.PI / 2 + clampedRatio * 2 * Math.PI;
    const satelliteX = center + outerOrbitRadius * Math.cos(orbitAngle);
    const satelliteY = center + outerOrbitRadius * Math.sin(orbitAngle);

    // Color del satélite y de acento
    const activeAccentColor = isComplete
      ? (isDark ? '#00E599' : '#10B981')
      : clampedRatio > 0.5
      ? '#C084FC'
      : '#38BDF8';

    return {
      gaugePercent,
      clampedRatio,
      isComplete,
      strokeDashoffset,
      hasProgress: clampedRatio > 0.005,
      satelliteX,
      satelliteY,
      activeAccentColor,
    };
  }, [totals.totalExpenses, totals.totalCollected, trackCircumference, center, outerOrbitRadius, isDark]);

  // Dimensiones de las Barras Verticales en Cápsula
  const barSvgWidth = 28;
  const barSvgHeight = 132;
  const barMaxFillHeight = 122;

  const dominantCategoryColor = categoryBreakdown[0]?.color || '#F59E0B';

  return (
    <View style={styles.container}>
      {/* 2 TARJETAS EJECUTIVAS: ANILLO FLUIDO + BARRAS VERTICALES EN CÁPSULA */}
      <View style={[styles.chartsRow, isTablet && styles.chartsRowTablet]}>
        
        {/* ========================================================================= */}
        {/* GRÁFICA 1: ANILLO FLUIDO DE META Y RECAUDACIÓN */}
        {/* ========================================================================= */}
        <GlassCard
          style={styles.cardFlex}
          contentStyle={styles.cardPadding}
        >
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <SculptedIcon
                name="trending-up"
                size={16}
                containerSize={34}
                variant="sunken"
                glow={isDark}
                accentColor={circleProgressData.activeAccentColor}
                color={circleProgressData.activeAccentColor}
              />
              <View>
                <Text style={[styles.cardTitle, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
                  Meta y Recaudación
                </Text>
                <Text style={[styles.cardSub, { color: colors.textSecondary, fontFamily: Fonts.regular }]}>
                  Flujo de fondos recaudados
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: circleProgressData.isComplete
                    ? colors.successLight
                    : colors.primaryLight,
                  borderColor: circleProgressData.isComplete
                    ? colors.successBorder
                    : colors.primaryBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: circleProgressData.isComplete ? colors.successText : colors.primaryText,
                    fontFamily: Fonts.bold,
                  },
                ]}
              >
                {circleProgressData.isComplete ? '✓ 100% CUBIERTO' : `${circleProgressData.gaugePercent}% RECAUDADO`}
              </Text>
            </View>
          </View>

          {/* ANILLO FLUIDO CON DEGRADADO DINÁMICO Y RESPLANDOR INTERIOR */}
          <View style={styles.gaugeContainer}>
            <View style={styles.gaugeRelativeWrapper}>
              <Svg width={size} height={size}>
                <Defs>
                  {/* Degradado dinámico: Azul acero pastel -> Lavanda -> Verde menta */}
                  <SvgLinearGradient id="fluidCollectionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#38BDF8" stopOpacity="1" />
                    <Stop offset="50%" stopColor="#C084FC" stopOpacity="1" />
                    <Stop offset="100%" stopColor={circleProgressData.isComplete ? '#00E599' : '#34D399'} stopOpacity="1" />
                  </SvgLinearGradient>

                  {/* Degradado para ondas líquidas interiores */}
                  <SvgLinearGradient id="fluidWaveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.45" />
                    <Stop offset="50%" stopColor="#C084FC" stopOpacity="0.30" />
                    <Stop offset="100%" stopColor="#00E599" stopOpacity="0.40" />
                  </SvgLinearGradient>

                  <SvgLinearGradient id="fluidWaveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#A855F7" stopOpacity="0.35" />
                    <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0.25" />
                  </SvgLinearGradient>

                  {/* Resplandor radial suave de fondo */}
                  <SvgRadialGradient id="innerGlowRadial" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={circleProgressData.activeAccentColor} stopOpacity="0.18" />
                    <Stop offset="70%" stopColor={circleProgressData.activeAccentColor} stopOpacity="0.04" />
                    <Stop offset="100%" stopColor={circleProgressData.activeAccentColor} stopOpacity="0" />
                  </SvgRadialGradient>
                </Defs>

                {/* 1. Halo interior suave */}
                <Circle cx={center} cy={center} r={outerOrbitRadius} fill="url(#innerGlowRadial)" />

                {/* 2. Órbita circular exterior fina */}
                <Circle
                  cx={center}
                  cy={center}
                  r={outerOrbitRadius}
                  stroke={isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.10)'}
                  strokeWidth={1}
                  fill="none"
                />

                {/* 3. Ondas líquidas fluidas (Liquid ribbons) */}
                <Path
                  d={waveRibbon1}
                  stroke="url(#fluidWaveGrad1)"
                  strokeWidth={1.8}
                  fill="none"
                  opacity={isDark ? 0.75 : 0.60}
                />
                <Path
                  d={waveRibbon2}
                  stroke="url(#fluidWaveGrad2)"
                  strokeWidth={1.2}
                  fill="none"
                  opacity={isDark ? 0.60 : 0.45}
                />

                {/* 4. Carril base del anillo en cristal translúcido */}
                <Circle
                  cx={center}
                  cy={center}
                  r={trackRadius}
                  stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)'}
                  strokeWidth={trackStrokeWidth}
                  strokeLinecap="round"
                  fill="none"
                />

                {/* 5. Resplandor difuso del progreso activo */}
                {circleProgressData.hasProgress && (
                  <Circle
                    cx={center}
                    cy={center}
                    r={trackRadius}
                    stroke="url(#fluidCollectionGrad)"
                    strokeWidth={trackStrokeWidth + 6}
                    strokeDasharray={`${trackCircumference}`}
                    strokeDashoffset={circleProgressData.strokeDashoffset}
                    strokeLinecap="round"
                    opacity={isDark ? 0.35 : 0.22}
                    fill="none"
                    transform={`rotate(-90 ${center} ${center})`}
                  />
                )}

                {/* 6. Barra fluida principal de progreso con extremos redondeados */}
                {circleProgressData.hasProgress && (
                  <Circle
                    cx={center}
                    cy={center}
                    r={trackRadius}
                    stroke="url(#fluidCollectionGrad)"
                    strokeWidth={trackStrokeWidth}
                    strokeDasharray={`${trackCircumference}`}
                    strokeDashoffset={circleProgressData.strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                    transform={`rotate(-90 ${center} ${center})`}
                  />
                )}

                {/* 7. Guía concéntrica interior */}
                <Circle
                  cx={center}
                  cy={center}
                  r={innerRingRadius}
                  stroke={isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.08)'}
                  strokeWidth={1}
                  fill="none"
                />

                {/* 8. Satélite indicador brillante en la órbita exterior (El Rayito) */}
                {circleProgressData.hasProgress && (
                  <G>
                    {/* Halo del satélite */}
                    <Circle
                      cx={circleProgressData.satelliteX}
                      cy={circleProgressData.satelliteY}
                      r={7}
                      fill={circleProgressData.activeAccentColor}
                      opacity={0.35}
                    />
                    {/* Núcleo del satélite */}
                    <Circle
                      cx={circleProgressData.satelliteX}
                      cy={circleProgressData.satelliteY}
                      r={3.8}
                      fill={circleProgressData.activeAccentColor}
                      stroke={isDark ? '#FFFFFF' : '#FFFFFF'}
                      strokeWidth={1.2}
                    />
                  </G>
                )}
              </Svg>

              {/* CENTRO CON TIPOGRAFÍA NUMÉRICA NÍTIDA Y DESTACADA */}
              <View style={styles.hubCenterOverlay}>
                <Text
                  style={[
                    styles.hubPercentageText,
                    {
                      color: colors.textPrimary,
                      fontFamily: Fonts.extraBold,
                    },
                  ]}
                >
                  {`${circleProgressData.gaugePercent}%`}
                </Text>
                <Text style={[styles.hubRatioSub, { color: colors.textSecondary, fontFamily: Fonts.medium }]}>
                  {FormatCurrency(totals.totalCollected).split('.')[0]} / {FormatCurrency(totals.totalExpenses).split('.')[0]}
                </Text>
              </View>
            </View>
          </View>

          {/* Leyenda y balance monetario inferior */}
          <View
            style={[
              styles.gaugePill,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.gaugePillText, { color: colors.textSecondary, fontFamily: Fonts.medium }]}>
              Cobrado <Text style={[styles.bold, { color: circleProgressData.isComplete ? colors.successText : colors.primary }]}>{FormatCurrency(totals.totalCollected)}</Text> de <Text style={[styles.bold, { color: colors.textPrimary }]}>{FormatCurrency(totals.totalExpenses)}</Text>
            </Text>
          </View>
        </GlassCard>

        {/* ========================================================================= */}
        {/* GRÁFICA 2: 5 BARRAS VERTICALES EN CÁPSULA CON RAYITO & SATÉLITE LUMINOSO */}
        {/* ========================================================================= */}
        <GlassCard
          style={styles.cardFlex}
          contentStyle={styles.cardPadding}
        >
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <SculptedIcon
                name="cart"
                size={16}
                containerSize={34}
                variant="sunken"
                glow={isDark}
                accentColor={dominantCategoryColor}
                color={dominantCategoryColor}
              />
              <View>
                <Text style={[styles.cardTitle, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
                  Distribución Presupuestaria
                </Text>
                <Text style={[styles.cardSub, { color: colors.textSecondary, fontFamily: Fonts.regular }]}>
                  Desglose por rubro y categoría
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: colors.textPrimary, fontFamily: Fonts.bold }]}>
                {event.expenses.length} compra{event.expenses.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {categoryBreakdown.length === 0 ? (
            <View style={styles.emptyState}>
              <SculptedIcon name="calendar" size={26} containerSize={50} variant="sunken" color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: Fonts.medium }]}>
                Sin compras registradas aún
              </Text>
            </View>
          ) : (
            <View style={styles.verticalBarsContainer}>
              {/* FILA DE LAS 5 BARRAS VERTICALES EN CÁPSULA CON RAYITO / SATÉLITE */}
              <View style={styles.verticalBarsRow}>
                {categoryBreakdown.slice(0, 5).map((item) => {
                  const fraction = Math.max(0.06, Math.min(1, item.percentage / 100));
                  const fillH = Math.max(16, fraction * barMaxFillHeight);
                  const topY = barSvgHeight - fillH + 8;

                  return (
                    <View key={item.category} style={styles.verticalBarColumn}>
                      {/* Etiqueta Superior Flotante: Porcentaje y Monto */}
                      <View style={styles.verticalTopInfo}>
                        <Text
                          style={[
                            styles.verticalPercentageText,
                            { color: item.color, fontFamily: Fonts.bold },
                          ]}
                        >
                          {item.percentage}%
                        </Text>
                        <Text
                          style={[
                            styles.verticalAmountText,
                            { color: colors.textSecondary, fontFamily: Fonts.medium },
                          ]}
                          numberOfLines={1}
                        >
                          {FormatCurrency(item.total).split('.')[0]}
                        </Text>
                      </View>

                      {/* Cápsula Vertical SVG con Rayito, Onda Líquida y Satélite Orbital */}
                      <View style={styles.verticalBarSvgWrapper}>
                        <Svg width={barSvgWidth} height={barSvgHeight}>
                          <Defs>
                            {/* Degradado vertical de la barra fluida */}
                            <SvgLinearGradient id={`vBarGrad_${item.category}`} x1="0%" y1="100%" x2="0%" y2="0%">
                              <Stop offset="0%" stopColor={item.color} stopOpacity="0.75" />
                              <Stop offset="100%" stopColor={item.color} stopOpacity="1" />
                            </SvgLinearGradient>
                          </Defs>

                          {/* 1. Carril base translúcido en cápsula (Track) */}
                          <Rect
                            x={3}
                            y={3}
                            width={22}
                            height={126}
                            rx={11}
                            stroke={isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.08)'}
                            strokeWidth={1}
                            fill={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.04)'}
                          />

                          {/* 2. Rayito / Onda líquida fluida interior vertical */}
                          <Path
                            d="M 14 122 Q 9 95 14 68 Q 19 41 14 14"
                            stroke={item.color}
                            strokeWidth={1.4}
                            opacity={isDark ? 0.40 : 0.30}
                            fill="none"
                          />

                          {/* 3. Resplandor difuso de la barra activa */}
                          <Rect
                            x={2}
                            y={barSvgHeight - fillH - 2}
                            width={24}
                            height={fillH}
                            rx={12}
                            fill={item.color}
                            opacity={isDark ? 0.28 : 0.16}
                          />

                          {/* 4. Barra fluida principal en cápsula */}
                          <Rect
                            x={4}
                            y={barSvgHeight - fillH}
                            width={20}
                            height={fillH - 4}
                            rx={10}
                            fill={`url(#vBarGrad_${item.category})`}
                          />

                          {/* 5. El "Rayito" / Satélite Luminoso en la punta superior */}
                          <G>
                            {/* Halo difuso del rayito satélite */}
                            <Circle
                              cx={14}
                              cy={topY}
                              r={6.5}
                              fill={item.color}
                              opacity={0.45}
                            />
                            {/* Núcleo blanco brillante del satélite */}
                            <Circle
                              cx={14}
                              cy={topY}
                              r={3.2}
                              fill="#FFFFFF"
                              stroke={item.color}
                              strokeWidth={1}
                            />
                          </G>
                        </Svg>
                      </View>

                      {/* Nombre y Punto de la Categoría en la Base */}
                      <View style={styles.verticalCategoryBottom}>
                        <View
                          style={[
                            styles.catDotFluid,
                            {
                              backgroundColor: item.color,
                              ...(Platform.OS === 'web'
                                ? ({ boxShadow: `0 0 5px ${item.color}80` } as any)
                                : {}),
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.verticalCategoryName,
                            { color: colors.textPrimary, fontFamily: Fonts.semiBold },
                          ]}
                          numberOfLines={1}
                        >
                          {item.category}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Píldora de Promedio y Total Global */}
          <View
            style={[
              styles.gaugePill,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.gaugePillText, { color: colors.textSecondary, fontFamily: Fonts.medium }]}>
              {categoryBreakdown.length > 0 ? (
                <>
                  Total <Text style={[styles.bold, { color: colors.textPrimary }]}>{FormatCurrency(totals.totalExpenses)}</Text> • Promedio <Text style={[styles.bold, { color: dominantCategoryColor }]}>{FormatCurrency(totals.totalExpenses / Math.max(1, event.availableDays?.length || 1))}/día</Text>
                </>
              ) : (
                <>
                  Registra compras con el botón <Text style={[styles.bold, { color: colors.primary }]}>+ Gasto</Text>
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
    gap: 18,
    width: '100%',
    alignSelf: 'stretch',
  },
  cardFlex: {
    flex: 1,
    minHeight: 370,
    alignSelf: 'stretch',
    position: 'relative',
    overflow: 'hidden',
  },
  cardPadding: {
    padding: 22,
    gap: 16,
    flex: 1,
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  cardTitle: {
    fontSize: 16,
    letterSpacing: -0.2,
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
    letterSpacing: 0.3,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    flex: 1,
    minHeight: 220,
    alignSelf: 'stretch',
    zIndex: 1,
  },
  gaugeRelativeWrapper: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  hubCenterOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 110,
    height: 110,
    gap: 2,
  },
  hubSmallLabel: {
    fontSize: 9.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  hubPercentageText: {
    fontSize: 34,
    letterSpacing: -0.8,
    lineHeight: 38,
    textAlign: 'center',
  },
  hubRatioSub: {
    fontSize: 11,
    letterSpacing: -0.1,
    textAlign: 'center',
    marginTop: 2,
  },
  gaugePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: 2,
    alignItems: 'center',
    zIndex: 1,
  },
  gaugePillText: {
    fontSize: 12,
  },
  verticalBarsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    paddingVertical: 4,
    alignSelf: 'stretch',
    zIndex: 1,
  },
  verticalBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '100%',
    flex: 1,
    gap: 6,
  },
  verticalBarColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    gap: 6,
    maxWidth: 78,
  },
  verticalTopInfo: {
    alignItems: 'center',
    gap: 1,
  },
  verticalPercentageText: {
    fontSize: 13,
    textAlign: 'center',
  },
  verticalAmountText: {
    fontSize: 10.5,
    textAlign: 'center',
  },
  verticalBarSvgWrapper: {
    width: 28,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalCategoryBottom: {
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    width: '100%',
  },
  verticalCategoryName: {
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 70,
  },
  catDotFluid: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    flex: 1,
    minHeight: 220,
    alignSelf: 'stretch',
    zIndex: 1,
  },
  emptyText: {
    fontSize: 13,
  },
  bold: {
    fontFamily: Fonts.bold,
  },
});
