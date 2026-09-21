/**
 * Tipos de categoría estándar para los participantes (simplificado: sólo adulto y niño).
 */
export type StandardCategoryType = 'adulto' | 'nino';

/**
 * Tipo de categoría que admite valores estándar y personalizaciones manteniendo el autocompletado en el IDE.
 */
export type CategoryType = StandardCategoryType | (string & {});

/**
 * Representa a un participante dentro del evento con agrupación familiar y asistencia.
 */
export interface Participant {
  /** Identificador único del participante */
  id: string;
  /** Nombre o alias del participante */
  name: string;
  /** Categoría a la que pertenece ('adulto' | 'nino') */
  category: CategoryType;
  /** Factor de ponderación para el cálculo de costos (ej. adulto = 1.0, niño = 0.5 o ajustable) */
  weight: number;
  /** Fechas o identificadores de los días asistidos/activos */
  activeDays: string[];
  /** Subfamilia a la que pertenece (ej. "Familia Santiago Bustamante", "Familia Santiago Velázquez") */
  subFamily: string;
  /** Control de asistencia: true si asiste/asistió al evento de este año, false si faltó */
  isAttending: boolean;
  /** Indica si el participante ya liquidó / pagó su saldo pendiente o recibió su reembolso */
  isSettled?: boolean;
}

/**
 * Contacto frecuente en el Directorio Global para importación recurrente anual.
 */
export interface DirectoryParticipant {
  /** Identificador único en el directorio */
  id: string;
  /** Nombre o alias */
  name: string;
  /** Categoría predeterminada ('adulto' | 'nino') */
  category: CategoryType;
  /** Factor de ponderación predeterminado */
  weight: number;
  /** Subfamilia o grupo familiar */
  subFamily: string;
  /** Alias para compatibilidad */
  familyGroup?: string;
}

/**
 * Representa un gasto registrado en el evento.
 */
export interface Expense {
  /** Identificador único del gasto */
  id: string;
  /** Descripción o título del gasto (ej. "Supermercado", "Cena día 1") */
  title: string;
  /** Monto total del gasto */
  amount: number;
  /** Categoría del gasto (ej. "Comida", "Hospedaje", "Transporte", "Varios") */
  category: string;
  /** ID del participante que realizó el pago inicial */
  paidBy: string;
  /** IDs de los participantes a quienes se prorratea el gasto (arreglo vacío si aplica a todos) */
  splitBetween: string[];
}

/**
 * Configuración y datos consolidados de un evento anual.
 */
export interface EventConfig {
  /** Identificador único del evento (UUID o string) */
  id: string;
  /** Identificador de texto libre / slug amigable (ej. event_chapantongo_2026_cuotas_fijas) */
  slug?: string;
  /** Año correspondiente al evento (ej. 2026) */
  year: number;
  /** Título descriptivo del evento (ej. "Vacaciones 2026") */
  title: string;
  /** Arreglo con todos los días cobrables o disponibles del evento */
  availableDays: string[];
  /** Lista de participantes registrados en el evento */
  participants: Participant[];
  /** Lista de gastos asociados al evento */
  expenses: Expense[];
  /** Indica si el evento está archivado o finalizado */
  isArchived: boolean;
  /** Fecha de creación en formato ISO 8601 string */
  createdAt: string;
  /** Notas u observaciones adicionales sobre el corte o evento */
  settlementNotes?: string;
}

/**
 * Distribución de gastos por categoría para gráficas y métricas.
 */
export interface CategoryBreakdown {
  category: string;
  total: number;
  percentage: number;
  count: number;
  color: string;
}

/**
 * Resumen financiero consolidado por Subfamilia.
 */
export interface SubFamilyCalculation {
  subFamilyName: string;
  membersCount: number;
  attendingCount: number;
  totalWeightedUnits: number;
  totalPaid: number;
  proportionalShare: number;
  finalBalance: number;
  isFullySettled: boolean;
  participantIds: string[];
}
