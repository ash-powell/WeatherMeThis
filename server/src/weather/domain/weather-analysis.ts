import type {
  Aggregation,
  AnalysisOptions,
  Comparison,
  GraphPoint,
  GroupBy,
  Month,
  WeatherData,
} from '../weather.models.js';

type AggregateFunction = (value: number, group: string) => void;

type GroupFunction = (date: string) => string;

const groupFunctions: Record<GroupBy, GroupFunction> = {
  year: (date) => date.substring(0, 4),
  month: (date) => date.substring(5, 7),
  day: (date) => date.substring(8, 10),
  yearMonth: (date) => date.substring(0, 7),
  monthDay: (date) => date.substring(5, 10),
  yearMonthDay: (date) => date.substring(0, 10),
  all: () => 'all',
};

class WeatherAnalysis {
  private readonly coordinates = new Map<string, number | null>();

  private readonly frequencyUnits = new Map<string, number>();

  private readonly aggregateValue: AggregateFunction;

  constructor(
    private readonly data: WeatherData,
    private readonly options: AnalysisOptions,
  ) {
    const count: AggregateFunction = (_value, group) => {
      this.coordinates.set(group, this.coordinates.get(group)! + 1);
    };

    const sum: AggregateFunction = (value, group) => {
      this.coordinates.set(group, this.coordinates.get(group)! + value);
    };

    const aggregateFunctions: Record<Aggregation, AggregateFunction> = {
      count,
      sum,

      max: (value, group) => {
        const currentMaximum = this.coordinates.get(group);

        if (currentMaximum === undefined || currentMaximum === null || value > currentMaximum) {
          this.coordinates.set(group, value);
        }
      },

      min: (value, group) => {
        const currentMinimum = this.coordinates.get(group);

        if (currentMinimum === undefined || currentMinimum === null || value < currentMinimum) {
          this.coordinates.set(group, value);
        }
      },

      avgSum: sum,
      avgCnt: count,

      rawValues: (value, group) => {
        this.coordinates.set(group, value);
      },
    };

    this.aggregateValue = aggregateFunctions[options.aggregation];
  }

  aggregate(): Map<string, number | null> {
    this.data.values.forEach((value, index) => {
      const date = this.data.dates[index];

      if (!this.datePassesFilter(date)) {
        return;
      }

      const group = groupFunctions[this.options.groupBy](date);

      if (!this.coordinates.has(group)) this.coordinates.set(group, null);
      if (value === null) return;
      if (this.coordinates.get(group) === null) this.initializeGroup(group);

      if (this.isAverageAggregation()) {
        this.updateFrequencyUnits(index, group);
      }

      if (this.meetsConstraint(value)) {
        this.aggregateValue(value, group);
      }
    });

    if (this.isAverageAggregation()) {
      this.finalizeAverages();
    }

    return this.coordinates;
  }

  private datePassesFilter(date: string): boolean {
    const { unit, min, max } = this.options.dateFilter;

    if (unit === 'none') {
      return true;
    }

    const currentDateUnit = groupFunctions[unit](date);

    if (min <= max) {
      return currentDateUnit >= min && currentDateUnit <= max;
    }

    // Wraparound range, such as November through February.
    return currentDateUnit >= min || currentDateUnit <= max;
  }

  private initializeGroup(group: string): void {
    const initialValue =
      this.options.aggregation === 'max' || this.options.aggregation === 'min' ? null : 0;

    this.coordinates.set(group, initialValue);
  }

  private isAverageAggregation(): boolean {
    return this.options.aggregation === 'avgCnt' || this.options.aggregation === 'avgSum';
  }

  private finalizeAverages(): void {
    for (const group of this.coordinates.keys()) {
      if (this.coordinates.get(group) === null) continue;
      this.coordinates.set(
        group,
        this.coordinates.get(group)! / (this.frequencyUnits.get(group) || 1),
      );
    }
  }

  private meetsConstraint(value: number): boolean {
    const { comparison, threshold } = this.options;

    if (comparison === 'none') {
      return true;
    }

    if (threshold === null) {
      return false;
    }

    const comparisons: Record<
      Exclude<Comparison, 'none'>,
      (first: number, second: number) => boolean
    > = {
      '>=': (first, second) => first >= second,
      '<=': (first, second) => first <= second,
      '=': (first, second) => first === second,
    };

    return comparisons[comparison](value, threshold);
  }

  private updateFrequencyUnits(index: number, group: string): void {
    const date = this.data.dates[index];
    const frequency = this.options.avgFrequency;
    const year = Number(date.substring(0, 4));
    const month = date.substring(5, 7) as Month;

    const daysPerMonth: Record<Month, number> = {
      '01': 31,
      '02': this.isLeapYear(year) ? 29 : 28,
      '03': 31,
      '04': 30,
      '05': 31,
      '06': 30,
      '07': 31,
      '08': 31,
      '09': 30,
      '10': 31,
      '11': 30,
      '12': 31,
    };

    const daysPerFrequencyUnit = {
      daily: 1,
      weekly: 7,
      monthly: daysPerMonth[month],
      yearly: this.isLeapYear(year) ? 366 : 365,
    };

    if (frequency === 'none') {
      throw new Error('Average aggregation requires an average frequency');
    }

    const currentUnits = this.frequencyUnits.get(group) ?? 0;

    this.frequencyUnits.set(group, currentUnits + 1 / daysPerFrequencyUnit[frequency]);
  }

  private isLeapYear(year: number): boolean {
    return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
  }
}

export function analyzeWeather(data: WeatherData, options: AnalysisOptions): GraphPoint[] {
  const analysis = new WeatherAnalysis(data, options);

  return Array.from(analysis.aggregate(), ([date, value]) => ({
    date,
    value,
  }));
}
