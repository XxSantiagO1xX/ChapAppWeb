/**
 * ChapApp - Motor Financiero y Contable
 * Implementación 100% fiel de las 4 columnas contables, cuotas proporcionales,
 * soporte para invitados temporales prorrateados y cuadre de caja de doble partida.
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
export const calculateParticipantWeightedUnits = (participant, fallbackDays = 4) => {
  if (!participant || participant.isAttending === false) {
    return 0;
  }

  if (typeof participant.weight === 'number' && participant.weight <= 0) {
    return 0;
  }

  let activeDaysCount = 0;
  if (Array.isArray(participant.activeDays) && participant.activeDays.length > 0) {
    activeDaysCount = participant.activeDays.length;
  } else if (typeof participant.activeDaysCount === 'number' && participant.activeDaysCount > 0) {
    activeDaysCount = participant.activeDaysCount;
  } else {
    // Si asiste pero no tiene asignación explícita de días, asume los días activos completos del evento
    activeDaysCount = fallbackDays;
  }

  const weight =
    typeof participant.weight === 'number'
      ? participant.weight
      : DEFAULT_CATEGORY_WEIGHTS[participant.category] ?? 1.0;

  return roundToTwoDecimals(activeDaysCount * weight);
};

/**
 * Normaliza y extrae la lista de invitados para un evento dado.
 */
export const resolveEventGuests = (event, guestsInput = null) => {
  const guestsList = [];

  const addGuest = (g, defaultSf = 'Familia General') => {
    if (!g || !g.name) return;
    const category = g.category || 'adulto';
    const weight = typeof g.weight === 'number' ? g.weight : (category === 'nino' ? 0.5 : 1.0);
    const daysCount = Math.max(1, parseInt(g.daysCount, 10) || 1);
    const subFamily = g.subFamily || g.subfamily || defaultSf;
    const weightedUnits = roundToTwoDecimals(daysCount * weight);

    guestsList.push({
      id: g.id || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: String(g.name).trim(),
      category,
      weight,
      daysCount,
      weightedUnits,
      subFamily,
    });
  };

  if (Array.isArray(guestsInput)) {
    guestsInput.forEach((g) => addGuest(g));
    return guestsList;
  }

  if (guestsInput && typeof guestsInput === 'object') {
    if (event?.id && guestsInput[event.id]) {
      const eventMap = guestsInput[event.id];
      Object.entries(eventMap).forEach(([sf, arr]) => {
        if (Array.isArray(arr)) arr.forEach((g) => addGuest(g, sf));
      });
    } else {
      Object.entries(guestsInput).forEach(([sf, arr]) => {
        if (Array.isArray(arr)) arr.forEach((g) => addGuest(g, sf));
      });
    }
    if (guestsList.length > 0) return guestsList;
  }

  if (Array.isArray(event?.temporaryGuests)) {
    event.temporaryGuests.forEach((g) => addGuest(g));
    return guestsList;
  }

  if (Array.isArray(event?.guests)) {
    event.guests.forEach((g) => addGuest(g));
    return guestsList;
  }

  // Fallback a localStorage y store
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('chapapp_ticket_guests');
      if (saved) {
        const allGuests = JSON.parse(saved);
        if (event?.id && allGuests[event.id]) {
          const eventMap = allGuests[event.id];
          Object.entries(eventMap).forEach(([sf, arr]) => {
            if (Array.isArray(arr)) arr.forEach((g) => addGuest(g, sf));
          });
        } else {
          Object.entries(allGuests).forEach(([sf, arr]) => {
            if (Array.isArray(arr)) arr.forEach((g) => addGuest(g, sf));
          });
        }
      }
    }
  } catch (e) {}

  try {
    if (typeof store !== 'undefined' && store?.getState) {
      const st = store.getState();
      const allGuests = st?.ticketGuests || {};
      if (event?.id && allGuests[event.id]) {
        const eventMap = allGuests[event.id];
        Object.entries(eventMap).forEach(([sf, arr]) => {
          if (Array.isArray(arr)) arr.forEach((g) => addGuest(g, sf));
        });
      } else {
        Object.entries(allGuests).forEach(([sf, arr]) => {
          if (Array.isArray(arr)) arr.forEach((g) => addGuest(g, sf));
        });
      }
    }
  } catch (e) {}

  return guestsList;
};

/**
 * Resuelve la entidad o grupo de cobro aplicando la Regla de Oro del Modelo Híbrido:
 * - Si un sub-grupo tiene es_independiente = false, la suma de sus unidades ponderadas
 *   y su costo se acumula (roll-up) en el ticket del nodo_padre_id.
 * - Si el sub-grupo tiene es_independiente = true, genera su propio ticket individual.
 */
export const resolveBillingFamily = (participantOrSubfamily, familyGroups = []) => {
  const fgMap = new Map();
  let groups = familyGroups;
  if (!Array.isArray(groups) || groups.length === 0) {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('chapapp_cached_family_groups');
        if (saved) groups = JSON.parse(saved);
      }
    } catch (e) {}
  }

  if (Array.isArray(groups)) {
    groups.forEach((g) => {
      if (g.id) fgMap.set(g.id, g);
      if (g.nombre) fgMap.set(g.nombre.toLowerCase().trim(), g);
    });
  }

  let group = null;
  const groupId = participantOrSubfamily?.grupo_familiar_id || participantOrSubfamily?.grupoFamiliarId;
  const groupName = participantOrSubfamily?.subFamily || participantOrSubfamily?.subfamily || (typeof participantOrSubfamily === 'string' ? participantOrSubfamily : '');

  if (groupId && fgMap.has(groupId)) {
    group = fgMap.get(groupId);
  } else if (groupName && fgMap.has(groupName.toLowerCase().trim())) {
    group = fgMap.get(groupName.toLowerCase().trim());
  }

  if (!group) {
    const fallbackName = groupName || 'Familia General';
    return {
      id: fallbackName,
      nombre: fallbackName,
      nodo_padre_id: null,
      es_independiente: true,
      originalGroupName: fallbackName,
      isRolledUp: false,
    };
  }

  // Traversal para roll-up si es dependiente (es_independiente === false y tiene nodo_padre_id)
  const visited = new Set();
  let current = group;
  while (current) {
    if (visited.has(current.id)) break;
    visited.add(current.id);

    // Si es independiente o es Rama Principal (nodo_padre_id null), esta es la entidad de cobro
    if (current.es_independiente || !current.nodo_padre_id) {
      return {
        ...current,
        originalGroupName: group.nombre,
        isRolledUp: current.id !== group.id,
      };
    }

    const parent = fgMap.get(current.nodo_padre_id);
    if (!parent) {
      return {
        ...current,
        originalGroupName: group.nombre,
        isRolledUp: false,
      };
    }
    current = parent;
  }

  return {
    ...current,
    originalGroupName: group.nombre,
    isRolledUp: current.id !== group.id,
  };
};

/**
 * Calcula los totales financieros, distribución proporcional, cuadre de caja
 * y estado de corte/liquidación de un evento incluyendo invitados temporales
 * y el modelo híbrido de jerarquía familiar con roll-up.
 */
export const calculateEventTotals = (event, guestsInput = null, familyGroups = []) => {
  const participants = event?.participants ?? [];
  const expenses = event?.expenses ?? [];
  const guestsList = resolveEventGuests(event, guestsInput);

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
  let totalParticipantsUnitsRaw = 0;
  let totalAttendingParticipantsCount = 0;

  const defaultDaysCount = Array.isArray(event?.availableDays) && event.availableDays.length > 0
    ? event.availableDays.length
    : 4;

  for (const participant of participants) {
    const isAttending = participant.isAttending !== false;
    if (isAttending) {
      totalAttendingParticipantsCount++;
    }

    const units = calculateParticipantWeightedUnits(participant, defaultDaysCount);
    unitsMap.set(participant.id, units);
    totalParticipantsUnitsRaw += units;
  }

  // 4. Unidades de Invitados Temporales
  let totalGuestsUnitsRaw = 0;
  for (const guest of guestsList) {
    totalGuestsUnitsRaw += guest.weightedUnits;
  }

  const totalWeightedUnitsRaw = totalParticipantsUnitsRaw + totalGuestsUnitsRaw;
  const totalWeightedUnits = roundToTwoDecimals(totalWeightedUnitsRaw);
  const totalAttendingCount = totalAttendingParticipantsCount + guestsList.length;

  // 5. Costo por unidad de asistencia
  const costPerUnit =
    totalWeightedUnits > 0 ? roundToTwoDecimals(totalExpenses / totalWeightedUnits) : 0;

  // 6. Desglose detallado por participante (Las 4 columnas contables)
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
      nombre: participant.nombre,
      apellido_paterno: participant.apellido_paterno,
      apellido_materno: participant.apellido_materno,
      telefono: participant.telefono,
      subFamily: participant.subFamily || 'Familia General',
      grupo_familiar_id: participant.grupo_familiar_id,
      category: participant.category,
      weight: typeof participant.weight === 'number' ? participant.weight : 1.0,
      isAttending,
      activeDays: Array.isArray(participant.activeDays) && participant.activeDays.length > 0
        ? participant.activeDays
        : (isAttending ? (event?.availableDays || ['Día 1', 'Día 2', 'Día 3', 'Día 4']) : []),
      activeDaysCount: Array.isArray(participant.activeDays) && participant.activeDays.length > 0
        ? participant.activeDays.length
        : (isAttending ? defaultDaysCount : 0),
      weightedUnits: units,
      proportionalShare,
      totalPaid,
      finalBalance,
      isSettled,
    };

    participantCalculations.push(calculation);
    byParticipantId[participant.id] = calculation;
  }

  // 7. Desglose de Invitados calculados
  const calculatedGuests = guestsList.map((g) => {
    let cost = 0;
    if (totalWeightedUnits > 0 && totalExpenses > 0) {
      cost = roundToTwoDecimals((g.weightedUnits / totalWeightedUnits) * totalExpenses);
    }
    return {
      ...g,
      cost,
    };
  });

  // 8. Agrupación y Consolidación por Subfamilia con Roll-Up de Jerarquía Híbrida
  const subFamilyMap = new Map();

  // 8.1 Agregar integrantes fijos resolviendo su entidad de cobro
  for (const calc of participantCalculations) {
    const billingGroup = resolveBillingFamily(calc, familyGroups);
    const sfName = billingGroup.nombre;
    const sfId = billingGroup.id;

    calc.billingFamilyName = sfName;
    calc.originalGroupName = billingGroup.originalGroupName;
    calc.isRolledUp = billingGroup.isRolledUp;

    const existing = subFamilyMap.get(sfName) || {
      subFamilyId: sfId,
      subFamilyName: sfName,
      nodo_padre_id: billingGroup.nodo_padre_id,
      es_independiente: billingGroup.es_independiente,
      isRoot: !billingGroup.nodo_padre_id,
      subGroups: new Set(),
      membersCount: 0,
      attendingCount: 0,
      totalWeightedUnits: 0,
      totalPaid: 0,
      membersProportionalShare: 0,
      guestsTotalCost: 0,
      proportionalShare: 0,
      finalBalance: 0,
      isFullySettled: true,
      participantIds: [],
      guests: [],
    };

    existing.subGroups.add(billingGroup.originalGroupName);
    existing.membersCount += 1;
    if (calc.isAttending) {
      existing.attendingCount += 1;
    }
    existing.totalWeightedUnits += calc.weightedUnits;
    existing.totalPaid += calc.totalPaid;
    existing.membersProportionalShare += calc.proportionalShare;
    existing.participantIds.push(calc.participantId);

    if (!calc.isSettled) {
      existing.isFullySettled = false;
    }

    subFamilyMap.set(sfName, existing);
  }

  // 8.2 Sumar invitados a sus respectivas subfamilias
  for (const guest of calculatedGuests) {
    const billingGroup = resolveBillingFamily(guest, familyGroups);
    const sfName = billingGroup.nombre;
    const existing = subFamilyMap.get(sfName) || {
      subFamilyId: billingGroup.id,
      subFamilyName: sfName,
      nodo_padre_id: billingGroup.nodo_padre_id,
      es_independiente: billingGroup.es_independiente,
      isRoot: !billingGroup.nodo_padre_id,
      subGroups: new Set([billingGroup.originalGroupName]),
      membersCount: 0,
      attendingCount: 0,
      totalWeightedUnits: 0,
      totalPaid: 0,
      membersProportionalShare: 0,
      guestsTotalCost: 0,
      proportionalShare: 0,
      finalBalance: 0,
      isFullySettled: true,
      participantIds: [],
      guests: [],
    };

    existing.subGroups.add(billingGroup.originalGroupName);
    existing.attendingCount += 1;
    existing.totalWeightedUnits += guest.weightedUnits;
    existing.guestsTotalCost += guest.cost;
    existing.guests.push(guest);

    subFamilyMap.set(sfName, existing);
  }

  const subFamilies = [];
  const bySubFamily = {};

  subFamilyMap.forEach((val, key) => {
    const grossTotalQuota = roundToTwoDecimals(val.membersProportionalShare + val.guestsTotalCost);
    const finalBalance = roundToTwoDecimals(grossTotalQuota - val.totalPaid);

    const subFamilyCalc = {
      subFamilyId: val.subFamilyId,
      subFamilyName: key,
      nodo_padre_id: val.nodo_padre_id,
      es_independiente: val.es_independiente,
      isRoot: val.isRoot,
      subGroups: Array.from(val.subGroups || []),
      hasMultipleNuclei: val.subGroups && val.subGroups.size > 1,
      membersCount: val.membersCount,
      attendingCount: val.attendingCount,
      totalWeightedUnits: roundToTwoDecimals(val.totalWeightedUnits),
      totalPaid: roundToTwoDecimals(val.totalPaid),
      membersProportionalShare: roundToTwoDecimals(val.membersProportionalShare),
      guestsTotalCost: roundToTwoDecimals(val.guestsTotalCost),
      proportionalShare: grossTotalQuota,
      finalBalance,
      isFullySettled: val.isFullySettled,
      participantIds: val.participantIds,
      guests: val.guests,
    };

    subFamilies.push(subFamilyCalc);
    bySubFamily[key] = subFamilyCalc;
  });

  subFamilies.sort((a, b) => a.subFamilyName.localeCompare(b.subFamilyName));

  // 9. Cálculo Consolidado de Recaudación y Cuadre de Caja
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
    Math.abs(totalToCollectRaw - totalToRefundRaw) < 0.10 ||
    (totalToRefundRaw === 0 && Math.abs(totalCollected - totalExpenses) < 0.10);

  return {
    totalExpenses,
    totalWeightedUnits,
    totalParticipantsCount: participants.length,
    totalAttendingCount,
    totalGuestsCount: guestsList.length,
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
    guests: calculatedGuests,
    subFamilies,
    bySubFamily,
  };
};
