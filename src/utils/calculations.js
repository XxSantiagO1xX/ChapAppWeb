/**
 * ChapApp - Motor Financiero y Contable
 * Implementación 100% fiel de las 4 columnas contables, cuotas proporcionales y cuadre de caja.
 */

/**
 * Redondea un número a 2 decimales evitando errores de coma flotante.
 */
export const roundToTwoDecimals = (value) => {
  if (value === null || value === undefined || isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

/**
 * Ponderación predeterminada por categoría.
 */
export const DEFAULT_CATEGORY_WEIGHTS = {
  adulto: 1.0,
  nino: 0.5,
};

/**
 * Formatea un número como moneda en Pesos Mexicanos (MXN).
 */
export const formatCurrency = (amount) => {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Calcula las unidades ponderadas de un participante.
 * Si no asiste (isAttending === false), retorna 0 unidades.
 */
export const calculateParticipantWeightedUnits = (participant) => {
  if (!participant || participant.isAttending === false) {
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
export const calculateEventTotals = (event) => {
  const participants = event?.participants ?? [];
  const expenses = event?.expenses ?? [];

  // 1. Total general gastado en el evento
  const totalExpenses = roundToTwoDecimals(
    expenses.reduce((sum, exp) => sum + (typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0), 0)
  );

  // 2. Compras pagadas de su propio bolsillo por cada participante
  const paidMap = new Map();
  for (const expense of expenses) {
    if (expense.paidBy) {
      const currentPaid = paidMap.get(expense.paidBy) ?? 0;
      const amount = typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount) || 0;
      paidMap.set(expense.paidBy, currentPaid + amount);
    }
  }

  // 3. Unidades ponderadas por participante (sólo asistentes)
  const unitsMap = new Map();
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

  // 4. Costo por unidad de asistencia
  const costPerUnit =
    totalWeightedUnits > 0 ? roundToTwoDecimals(totalExpenses / totalWeightedUnits) : 0;

  // 5. Desglose detallado por participante (Las 4 columnas contables)
  const participantCalculations = [];
  const byParticipantId = {};

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

    const calculation = {
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
  const subFamilyMap = new Map();

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

  const subFamilies = [];
  const bySubFamily = {};

  subFamilyMap.forEach((val, key) => {
    const subFamilyCalc = {
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
      totalCollectedRaw += sf.proportionalShare;
      if (sf.finalBalance > 0) {
        cashInflowRaw += sf.finalBalance;
      } else if (sf.finalBalance < 0) {
        totalRefundedRaw += Math.abs(sf.finalBalance);
        cashOutflowRaw += Math.abs(sf.finalBalance);
      }
    } else {
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

  if (subFamilies.length > 0 && subFamilies.every((sf) => sf.isFullySettled)) {
    totalCollectedRaw = totalExpenses;
  }

  const totalCollected = roundToTwoDecimals(totalCollectedRaw);
  const totalToCollect = roundToTwoDecimals(totalToCollectRaw > 0 ? totalToCollectRaw : totalExpenses);
  const totalPendingToCollect = roundToTwoDecimals(Math.max(0, totalExpenses - totalCollected));

  const totalToRefund = roundToTwoDecimals(totalToRefundRaw);
  const totalRefunded = roundToTwoDecimals(totalRefundedRaw);
  const totalPendingToRefund = roundToTwoDecimals(Math.max(0, totalToRefund - totalRefunded));

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
