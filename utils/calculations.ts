import type { EventConfig, Participant, SubFamilyCalculation } from '../types';

/**
 * Resultado del cálculo financiero individual para un participante.
 */
export interface ParticipantCalculation {
  /** ID del participante */
  participantId: string;
  /** Nombre del participante */
  participantName: string;
  /** Subfamilia a la que pertenece */
  subFamily: string;
  /** Categoría del participante ('adulto' | 'nino') */
  category: string;
  /** Factor de ponderación (ej. adulto = 1.0, nino = 0.5) */
  weight: number;
  /** Indica si asistió al evento */
  isAttending: boolean;
  /** Días asistidos registrados */
  activeDaysCount: number;
  /** Unidades ponderadas de asistencia (0 si no asistió) */
  weightedUnits: number;

  // --- LAS 4 COLUMNAS CONTABLES INALTERABLES ---
  /** 1. Cuota Proporcional: Lo que le corresponde pagar según sus días y categoría */
  proportionalShare: number;
  /** 2. Aporte de su Bolsillo: Monto total de compras/gastos pagados de su cartera */
  totalPaid: number;
  /** 
   * 3. Saldo Neto: (Cuota Proporcional - Aporte de su Bolsillo).
   * Positivo (> 0): Lo que debe entregar en efectivo a la caja común.
   * Negativo (< 0): Reembolso exacto a devolverle de la caja para quedar en tablas.
   * Cero (0): En tablas / Al corriente.
   */
  finalBalance: number;
  /** 4. Estatus de Liquidación: true si ya entregó su pago o ya cobró su reembolso */
  isSettled: boolean;
}

/**
 * Resumen financiero global, cuadre de caja común y balance de reembolsos del evento.
 */
export interface EventTotalsResult {
  /** Monto total gastado en el evento (suma de todas las compras) */
  totalExpenses: number;
  /** Suma total de unidades ponderadas de los participantes que asisten */
  totalWeightedUnits: number;
  /** Total de personas registradas en la lista */
  totalParticipantsCount: number;
  /** Total de personas que asistieron */
  totalAttendingCount: number;
  /** Costo monetario por cada unidad ponderada de asistencia (1 día de adulto = 1.0) */
  costPerUnit: number;

  // --- CUADRE Y FLUJO DE CAJA COMÚN ---
  /** Total a recaudar (suma de todos los saldos positivos por cobrar a deudores) */
  totalToCollect: number;
  /** Efectivo efectivamente recaudado e ingresado a la caja común */
  totalCollected: number;
  /** Saldo pendiente por cobrar en efectivo */
  totalPendingToCollect: number;

  /** Total a reembolsar (suma de los saldos negativos a favor de compradores) */
  totalToRefund: number;
  /** Total de reembolsos ya pagados/entregados a compradores */
  totalRefunded: number;
  /** Total de reembolsos pendientes por entregar */
  totalPendingToRefund: number;

  /** 
   * Efectivo disponible en caja (Fondo en Mano = Total Recaudado - Total Reembolsado).
   * Representa el dinero físico presente en la caja común en este instante.
   */
  cashInHand: number;

  /** Indica si la contabilidad del evento cuadra matemáticamente a cero */
  isCashBalanced: boolean;
  /** Indica si todos los cobros y reembolsos han sido 100% liquidados */
  isFullySettled: boolean;

  /** Lista ordenada de resultados por cada participante */
  participants: ParticipantCalculation[];
  /** Mapa indexado por ID de participante para acceso rápido O(1) */
  byParticipantId: Record<string, ParticipantCalculation>;
  /** Lista consolidada de saldos agrupados por Subfamilia */
  subFamilies: SubFamilyCalculation[];
  /** Mapa indexado por nombre de Subfamilia */
  bySubFamily: Record<string, SubFamilyCalculation>;
}

/**
 * Redondea un número a 2 decimales evitando errores de precisión de punto flotante.
 */
export const roundToTwoDecimals = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

/**
 * Ponderación predeterminada por categoría.
 */
export const DEFAULT_CATEGORY_WEIGHTS: Record<string, number> = {
  adulto: 1.0,
  nino: 0.5,
};

/**
 * Calcula las unidades ponderadas de un participante.
 * Si el participante NO asiste (isAttending === false), retorna estrictamente 0 unidades.
 */
export const calculateParticipantWeightedUnits = (participant: Participant): number => {
  if (participant.isAttending === false) {
    return 0;
  }

  if (typeof participant.weight === 'number' && participant.weight <= 0) {
    return 0;
  }

  const activeDaysCount = Array.isArray(participant.activeDays) ? participant.activeDays.length : 0;
  const weight =
    typeof participant.weight === 'number'
      ? participant.weight
      : DEFAULT_CATEGORY_WEIGHTS[participant.category] ?? 1.0;

  return roundToTwoDecimals(activeDaysCount * weight);
};

/**
 * Calcula los totales financieros, distribución proporcional, cuadre de caja
 * y estado de corte/liquidación de un evento.
 */
export const calculateEventTotals = (event: EventConfig): EventTotalsResult => {
  const participants = event?.participants ?? [];
  const expenses = event?.expenses ?? [];

  // 1. Total general gastado en el evento
  const totalExpenses = roundToTwoDecimals(
    expenses.reduce((sum, expense) => sum + (typeof expense.amount === 'number' ? expense.amount : 0), 0)
  );

  // 2. Cálculo de compras pagadas de su propio bolsillo por cada participante
  const paidMap = new Map<string, number>();
  for (const expense of expenses) {
    if (expense.paidBy) {
      const currentPaid = paidMap.get(expense.paidBy) ?? 0;
      const amount = typeof expense.amount === 'number' ? expense.amount : 0;
      paidMap.set(expense.paidBy, currentPaid + amount);
    }
  }

  // 3. Unidades ponderadas por participante (filtrando estrictamente sólo a los asistentes)
  const unitsMap = new Map<string, number>();
  let totalWeightedUnitsRaw = 0;
  let totalAttendingCount = 0;

  for (const participant of participants) {
    const isAttending = participant.isAttending !== false;
    if (isAttending) {
      totalAttendingCount++;
    }

    const units = calculateParticipantWeightedUnits(participant);
    unitsMap.set(participant.id, units);
    totalWeightedUnitsRaw += units;
  }

  const totalWeightedUnits = roundToTwoDecimals(totalWeightedUnitsRaw);

  // 4. Costo por unidad de asistencia (manejo seguro de división entre cero)
  const costPerUnit =
    totalWeightedUnits > 0 ? roundToTwoDecimals(totalExpenses / totalWeightedUnits) : 0;

  // 5. Desglose detallado por participante (Las 4 columnas contables)
  const participantCalculations: ParticipantCalculation[] = [];
  const byParticipantId: Record<string, ParticipantCalculation> = {};

  let allSettled = participants.length > 0;

  for (const participant of participants) {
    const isAttending = participant.isAttending !== false;
    const units = unitsMap.get(participant.id) ?? 0;
    const totalPaid = roundToTwoDecimals(paidMap.get(participant.id) ?? 0);
    const isSettled = Boolean(participant.isSettled);

    // 1. Cuota Proporcional
    let proportionalShare = 0;
    if (isAttending && totalWeightedUnits > 0 && totalExpenses > 0) {
      proportionalShare = roundToTwoDecimals((units / totalWeightedUnits) * totalExpenses);
    }

    // 3. Saldo Neto = (Cuota Proporcional - Aporte de su Bolsillo)
    const finalBalance = roundToTwoDecimals(proportionalShare - totalPaid);

    if (!isSettled) {
      allSettled = false;
    }

    const calculation: ParticipantCalculation = {
      participantId: participant.id,
      participantName: participant.name,
      subFamily: participant.subFamily || 'Familia General',
      category: participant.category,
      weight: typeof participant.weight === 'number' ? participant.weight : 1.0,
      isAttending,
      activeDaysCount: Array.isArray(participant.activeDays) ? participant.activeDays.length : 0,
      weightedUnits: units,
      proportionalShare,
      totalPaid,
      finalBalance,
      isSettled,
    };

    participantCalculations.push(calculation);
    byParticipantId[participant.id] = calculation;
  }

  // 6. Agrupación y Consolidación por Subfamilia
  const subFamilyMap = new Map<string, {
    membersCount: number;
    attendingCount: number;
    totalWeightedUnits: number;
    totalPaid: number;
    proportionalShare: number;
    finalBalance: number;
    isFullySettled: boolean;
    participantIds: string[];
  }>();

  for (const calc of participantCalculations) {
    const sfName = calc.subFamily || 'Familia General';
    const existing = subFamilyMap.get(sfName) || {
      membersCount: 0,
      attendingCount: 0,
      totalWeightedUnits: 0,
      totalPaid: 0,
      proportionalShare: 0,
      finalBalance: 0,
      isFullySettled: true,
      participantIds: [],
    };

    existing.membersCount += 1;
    if (calc.isAttending) {
      existing.attendingCount += 1;
    }
    existing.totalWeightedUnits += calc.weightedUnits;
    existing.totalPaid += calc.totalPaid;
    existing.proportionalShare += calc.proportionalShare;
    existing.finalBalance += calc.finalBalance;
    existing.participantIds.push(calc.participantId);

    if (!calc.isSettled) {
      existing.isFullySettled = false;
    }

    subFamilyMap.set(sfName, existing);
  }

  const subFamilies: SubFamilyCalculation[] = [];
  const bySubFamily: Record<string, SubFamilyCalculation> = {};

  subFamilyMap.forEach((val, key) => {
    const subFamilyCalc: SubFamilyCalculation = {
      subFamilyName: key,
      membersCount: val.membersCount,
      attendingCount: val.attendingCount,
      totalWeightedUnits: roundToTwoDecimals(val.totalWeightedUnits),
      totalPaid: roundToTwoDecimals(val.totalPaid),
      proportionalShare: roundToTwoDecimals(val.proportionalShare),
      finalBalance: roundToTwoDecimals(val.finalBalance),
      isFullySettled: val.isFullySettled,
      participantIds: val.participantIds,
    };

    subFamilies.push(subFamilyCalc);
    bySubFamily[key] = subFamilyCalc;
  });

  subFamilies.sort((a, b) => a.subFamilyName.localeCompare(b.subFamilyName));

  // 7. Cálculo Consolidado de Recaudación y Cuadre de Caja
  // El monto recaudado/cubierto para la Meta del evento suma las cuotas de las subfamilias Liquidadas
  // más los aportes de bolsillo o liquidaciones individuales de subfamilias pendientes.
  let totalCollectedRaw = 0;
  let totalToCollectRaw = 0;
  let totalToRefundRaw = 0;
  let totalRefundedRaw = 0;
  let cashInflowRaw = 0;
  let cashOutflowRaw = 0;

  for (const sf of subFamilies) {
    if (sf.finalBalance > 0) {
      totalToCollectRaw += sf.finalBalance;
    } else if (sf.finalBalance < 0) {
      totalToRefundRaw += Math.abs(sf.finalBalance);
    }

    if (sf.isFullySettled) {
      // Subfamilia 100% Liquidada: Su cuota entera está cubierta
      totalCollectedRaw += sf.proportionalShare;
      if (sf.finalBalance > 0) {
        cashInflowRaw += sf.finalBalance;
      } else if (sf.finalBalance < 0) {
        totalRefundedRaw += Math.abs(sf.finalBalance);
        cashOutflowRaw += Math.abs(sf.finalBalance);
      }
    } else {
      // Subfamilia pendiente: calcular lo que ya aportó en compras más lo liquidado individualmente
      let sfCovered = sf.totalPaid;
      for (const pId of sf.participantIds) {
        const pCalc = byParticipantId[pId];
        if (pCalc && pCalc.isSettled) {
          if (pCalc.finalBalance > 0) {
            sfCovered += pCalc.finalBalance;
            cashInflowRaw += pCalc.finalBalance;
          } else if (pCalc.finalBalance < 0) {
            totalRefundedRaw += Math.abs(pCalc.finalBalance);
            cashOutflowRaw += Math.abs(pCalc.finalBalance);
          }
        }
      }
      totalCollectedRaw += Math.min(sf.proportionalShare, sfCovered);
    }
  }

  // Si todas las subfamilias están liquidadas, el monto recaudado coincide con totalExpenses
  if (subFamilies.length > 0 && subFamilies.every((sf) => sf.isFullySettled)) {
    totalCollectedRaw = totalExpenses;
  }

  const totalCollected = roundToTwoDecimals(totalCollectedRaw);
  const totalToCollect = roundToTwoDecimals(totalToCollectRaw > 0 ? totalToCollectRaw : totalExpenses);
  const totalPendingToCollect = roundToTwoDecimals(Math.max(0, totalExpenses - totalCollected));

  const totalToRefund = roundToTwoDecimals(totalToRefundRaw);
  const totalRefunded = roundToTwoDecimals(totalRefundedRaw);
  const totalPendingToRefund = roundToTwoDecimals(Math.max(0, totalToRefund - totalRefunded));

  // Efectivo en caja disponible = (Entradas de efectivo cobrado - Salidas de reembolsos entregados)
  const cashInHand = roundToTwoDecimals(cashInflowRaw - cashOutflowRaw);

  const isCashBalanced =
    Math.abs(totalToCollectRaw - totalToRefundRaw) < 0.05 ||
    (totalToRefundRaw === 0 && Math.abs(totalCollected - totalExpenses) < 0.05);

  return {
    totalExpenses,
    totalWeightedUnits,
    totalParticipantsCount: participants.length,
    totalAttendingCount,
    costPerUnit,
    totalToCollect,
    totalCollected,
    totalPendingToCollect,
    totalToRefund,
    totalRefunded,
    totalPendingToRefund,
    cashInHand,
    isCashBalanced,
    isFullySettled: participants.length > 0 && subFamilies.every((sf) => sf.isFullySettled),
    participants: participantCalculations,
    byParticipantId,
    subFamilies,
    bySubFamily,
  };
};
