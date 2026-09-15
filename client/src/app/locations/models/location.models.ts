export interface QueryLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

export interface LocationResponse {
  results?: QueryLocation[];
}
