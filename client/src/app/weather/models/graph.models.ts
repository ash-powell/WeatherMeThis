export interface GraphPoint {
  date: string;
  value: number | null;
}

export interface GraphSeries {
  seriesId: number;
  label: string;
  points: GraphPoint[];
  yAxisId: string;
  yAxisLabel: string;
  requestKey?: string;
}
