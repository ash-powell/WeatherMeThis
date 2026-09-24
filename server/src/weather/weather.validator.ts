import { measurementNames } from './measurement.models.js';
import type {
  Aggregation,
  AnalysisLocation,
  AnalysisRequest,
  AnalysisSeries,
  AvgFrequency,
  Comparison,
  DateFilter,
  DateFilterUnit,
  GroupBy,
  Measurement,
} from './weather.models.js';

const measurements: readonly Measurement[] = measurementNames;

const dateFilterUnits: readonly DateFilterUnit[] = [
  'day',
  'monthDay',
  'month',
  'yearMonth',
  'year',
  'none',
];

const groupByOptions: readonly GroupBy[] = [
  'year',
  'month',
  'day',
  'yearMonth',
  'monthDay',
  'yearMonthDay',
  'all',
];

const aggregations: readonly Aggregation[] = [
  'count',
  'sum',
  'min',
  'max',
  'avgSum',
  'avgCnt',
  'avgMatchingDays',
  'rawValues',
];

const comparisons: readonly Comparison[] = ['>', '>=', '<', '<=', '=', 'none'];

const averageFrequencies: readonly AvgFrequency[] = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'none',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(
  value: unknown,
  permittedValues: readonly T[],
): value is T {
  return (
    typeof value === 'string' &&
    permittedValues.some((permittedValue) => permittedValue === value)
  );
}

function isMeasurement(value: unknown): value is Measurement {
  return isOneOf(value, measurements);
}

function isDateFilterUnit(value: unknown): value is DateFilterUnit {
  return isOneOf(value, dateFilterUnits);
}

export function isGroupBy(value: unknown): value is GroupBy {
  return isOneOf(value, groupByOptions);
}

export function hasValidMovingAverageOptions(
  movingAverageWindow: number | null,
  groupBy: GroupBy,
  dateFilterUnit: DateFilterUnit,
): boolean {
  if (movingAverageWindow === null) {
    return true;
  }

  if (!Number.isInteger(movingAverageWindow) || movingAverageWindow < 2) {
    return false;
  }

  const permittedDateFilters: Partial<
    Record<GroupBy, readonly DateFilterUnit[]>
  > = {
    year: ['none', 'month', 'monthDay', 'day'],
    yearMonth: ['none', 'day'],
    yearMonthDay: ['none'],
  };

  return permittedDateFilters[groupBy]?.includes(dateFilterUnit) === true;
}

function isAggregation(value: unknown): value is Aggregation {
  return isOneOf(value, aggregations);
}

function isComparison(value: unknown): value is Comparison {
  return isOneOf(value, comparisons);
}

function isAvgFrequency(value: unknown): value is AvgFrequency {
  return isOneOf(value, averageFrequencies);
}

function isLeapYear(year: number): boolean {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

function getDaysInMonth(year: number, month: number): number {
  const daysPerMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return daysPerMonth[month - 1] ?? 0;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearString, monthString, dayString] = value.split('-');

  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);

  return (
    month >= 1 && month <= 12 && day >= 1 && day <= getDaysInMonth(year, month)
  );
}

function isValidMonth(value: string): boolean {
  return /^(0[1-9]|1[0-2])$/.test(value);
}

function isValidDay(value: string): boolean {
  return /^(0[1-9]|[12]\d|3[01])$/.test(value);
}

function isValidYear(value: string): boolean {
  return /^\d{4}$/.test(value);
}

function isValidYearMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }

  return isValidMonth(value.substring(5, 7));
}

function isValidMonthDay(value: string): boolean {
  if (!/^\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const month = Number(value.substring(0, 2));
  const day = Number(value.substring(3, 5));

  if (month < 1 || month > 12) {
    return false;
  }

  // Use a leap year so February 29 is permitted.
  return day >= 1 && day <= getDaysInMonth(2000, month);
}

function isValidDateFilterValue(value: string, unit: DateFilterUnit): boolean {
  switch (unit) {
    case 'day':
      return isValidDay(value);

    case 'month':
      return isValidMonth(value);

    case 'monthDay':
      return isValidMonthDay(value);

    case 'year':
      return isValidYear(value);

    case 'yearMonth':
      return isValidYearMonth(value);

    case 'none':
      return true;
  }
}

function validateDateFilter(value: unknown): DateFilter | null {
  if (!isRecord(value)) {
    return null;
  }

  const { unit, min, max } = value;

  if (
    !isDateFilterUnit(unit) ||
    typeof min !== 'string' ||
    typeof max !== 'string'
  ) {
    return null;
  }

  if (
    !isValidDateFilterValue(min, unit) ||
    !isValidDateFilterValue(max, unit)
  ) {
    return null;
  }

  return {
    unit,
    min,
    max,
  };
}

function validateLocation(value: unknown): AnalysisLocation | null {
  if (!isRecord(value)) {
    return null;
  }

  const { city, admin1, country, latitude, longitude } = value;

  if (
    typeof city !== 'string' ||
    city.trim() === '' ||
    (admin1 !== null && typeof admin1 !== 'string') ||
    typeof country !== 'string' ||
    country.trim() === '' ||
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    city,
    admin1,
    country,
    latitude,
    longitude,
  };
}

function hasValidOptionRelationships(
  aggregation: Aggregation,
  avgFrequency: AvgFrequency,
  groupBy: GroupBy,
  comparison: Comparison,
  threshold: number | null,
): boolean {
  const isAverage =
    aggregation === 'avgSum' ||
    aggregation === 'avgCnt' ||
    aggregation === 'avgMatchingDays';

  if (isAverage && avgFrequency === 'none') {
    return false;
  }

  if (!isAverage && avgFrequency !== 'none') {
    return false;
  }

  if (aggregation === 'avgMatchingDays' && avgFrequency !== 'daily')
    return false;

  if (aggregation === 'avgMatchingDays' && comparison === 'none') return false;

  if (
    (aggregation === 'rawValues' && groupBy !== 'yearMonthDay') ||
    (aggregation !== 'rawValues' && groupBy === 'yearMonthDay')
  ) {
    return false;
  }

  if (comparison === 'none' && threshold !== null) {
    return false;
  }

  if (comparison !== 'none' && threshold === null) {
    return false;
  }

  return true;
}

export function validateAnalysisSeries(
  value: unknown,
  groupBy: GroupBy,
): AnalysisSeries | null {
  if (!isRecord(value)) {
    return null;
  }

  const location = validateLocation(value.location);
  const dateFilter = validateDateFilter(value.dateFilter);

  const {
    startDate,
    endDate,
    measurement,
    comparison,
    threshold,
    aggregation,
    avgFrequency,
  } = value;

  if (
    !location ||
    !dateFilter ||
    !isIsoDate(startDate) ||
    !isIsoDate(endDate) ||
    startDate < '1940-01-01' ||
    startDate > endDate ||
    !isMeasurement(measurement) ||
    !isComparison(comparison) ||
    !isAggregation(aggregation) ||
    !isAvgFrequency(avgFrequency) ||
    (threshold !== null &&
      (typeof threshold !== 'number' || !Number.isFinite(threshold)))
  ) {
    return null;
  }

  if (
    !hasValidOptionRelationships(
      aggregation,
      avgFrequency,
      groupBy,
      comparison,
      threshold,
    )
  ) {
    return null;
  }

  return {
    location,
    startDate,
    endDate,
    dateFilter,
    measurement,
    comparison,
    threshold,
    aggregation,
    avgFrequency,
  };
}

export function validateAnalysisRequest(
  value: unknown,
): AnalysisRequest | null {
  if (!isRecord(value)) {
    return null;
  }

  const { groupBy } = value;

  if (!isGroupBy(groupBy)) {
    return null;
  }

  if (value.metricUnits !== undefined && typeof value.metricUnits !== 'boolean')
    return null;

  const series = validateAnalysisSeries(value, groupBy);

  if (!series) {
    return null;
  }

  const movingAverageWindow = value.movingAverageWindow ?? null;

  if (
    movingAverageWindow !== null &&
    (typeof movingAverageWindow !== 'number' ||
      !Number.isFinite(movingAverageWindow))
  ) {
    return null;
  }

  if (
    !hasValidMovingAverageOptions(
      movingAverageWindow,
      groupBy,
      series.dateFilter.unit,
    )
  ) {
    return null;
  }

  return {
    metricUnits: value.metricUnits === true,
    ...series,
    groupBy,
    movingAverageWindow,
  };
}

export function validateAnalysisPlan(value: unknown): AnalysisRequest[] | null {
  if (!isRecord(value) || !Array.isArray(value.analyses)) {
    return null;
  }

  if (value.analyses.length === 0 || value.analyses.length > 100) {
    return null;
  }

  const analyses: AnalysisRequest[] = [];

  for (const analysisValue of value.analyses) {
    const analysis = validateAnalysisRequest(analysisValue);

    if (!analysis) {
      return null;
    }

    analyses.push(analysis);
  }

  return analyses;
}
