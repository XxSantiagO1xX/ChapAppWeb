/**
 * ChapApp - Utilidades de Analítica Financiera Histórica y Estadísticas Globales
 */

import { calculateEventTotals } from './calculations.js';

/**
 * Calcula las métricas financieras globales a partir del listado histórico de eventos
 * @param {Array} events - Lista de todos los eventos
 * @returns {Object} Métricas consolidadas
 */
export const calculateHistoricalAnalytics = (events = []) => {
  if (!events || events.length === 0) {
    return {
      totalEvents: 0,
      totalSpentHistorical: 0,
      totalCollectedHistorical: 0,
      averageSpentPerEvent: 0,
      totalParticipantsHistorical: 0,
      categoryDistribution: { Comida: 0, Bebidas: 0, Mantenimiento: 0, Salarios: 0, Varios: 0 },
      yearlyTrends: [],
      subFamilyHistoricalStats: {},
    };
  }

  let totalSpentHistorical = 0;
  let totalCollectedHistorical = 0;
  let totalParticipantsCount = 0;

  const categoryDistribution = {
    Comida: 0,
    Bebidas: 0,
    Mantenimiento: 0,
    Salarios: 0,
    Varios: 0,
  };

  const yearlyMap = {};
  const subFamilyMap = {};

  events.forEach((evt) => {
    const totals = calculateEventTotals(evt);
    totalSpentHistorical += totals.totalExpenses;
    totalCollectedHistorical += totals.totalCollected;
    totalParticipantsCount += totals.totalParticipantsCount;

    // Tendencia por Año
    const yr = evt.year || new Date(evt.createdAt || Date.now()).getFullYear();
    if (!yearlyMap[yr]) {
      yearlyMap[yr] = { year: yr, totalExpenses: 0, eventsCount: 0, attendees: 0 };
    }
    yearlyMap[yr].totalExpenses += totals.totalExpenses;
    yearlyMap[yr].eventsCount += 1;
    yearlyMap[yr].attendees += totals.totalAttendingCount;

    // Distribución por categoría
    (evt.expenses || []).forEach((exp) => {
      let cat = exp.category || 'Varios';
      if (cat === 'Transporte') cat = 'Mantenimiento';
      if (cat === 'Hospedaje') cat = 'Salarios';
      const amt = typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0;
      if (categoryDistribution[cat] !== undefined) {
        categoryDistribution[cat] += amt;
      } else {
        categoryDistribution.Varios += amt;
      }
    });

    // Estadísticas por subfamilia
    (totals.subFamilies || []).forEach((sf) => {
      const name = sf.subFamilyName;
      if (!subFamilyMap[name]) {
        subFamilyMap[name] = {
          subFamilyName: name,
          timesParticipated: 0,
          totalPaidPurchases: 0,
          totalAssignedQuota: 0,
          totalMembersCount: 0,
        };
      }
      subFamilyMap[name].timesParticipated += 1;
      subFamilyMap[name].totalPaidPurchases += sf.totalPaid || 0;
      subFamilyMap[name].totalAssignedQuota += sf.proportionalShare || 0;
      subFamilyMap[name].totalMembersCount += sf.membersCount || 0;
    });
  });

  const yearlyTrends = Object.values(yearlyMap).sort((a, b) => a.year - b.year);
  const subFamilyHistoricalStats = Object.values(subFamilyMap).sort(
    (a, b) => b.totalPaidPurchases - a.totalPaidPurchases
  );

  return {
    totalEvents: events.length,
    totalSpentHistorical,
    totalCollectedHistorical,
    averageSpentPerEvent: events.length > 0 ? totalSpentHistorical / events.length : 0,
    totalParticipantsHistorical: totalParticipantsCount,
    categoryDistribution,
    yearlyTrends,
    subFamilyHistoricalStats,
  };
};

/**
 * Compara dos eventos específicos
 * @param {Object} eventA 
 * @param {Object} eventB 
 * @returns {Object} Diferencias y porcentajes
 */
export const compareTwoEvents = (eventA, eventB) => {
  if (!eventA || !eventB) return null;

  const totalsA = calculateEventTotals(eventA);
  const totalsB = calculateEventTotals(eventB);

  const diffSpent = totalsB.totalExpenses - totalsA.totalExpenses;
  const percentChangeSpent = totalsA.totalExpenses > 0 ? (diffSpent / totalsA.totalExpenses) * 100 : 0;

  const diffAttendees = totalsB.totalAttendingCount - totalsA.totalAttendingCount;

  return {
    eventA: { title: eventA.title, year: eventA.year, totals: totalsA },
    eventB: { title: eventB.title, year: eventB.year, totals: totalsB },
    diffSpent,
    percentChangeSpent,
    diffAttendees,
  };
};
