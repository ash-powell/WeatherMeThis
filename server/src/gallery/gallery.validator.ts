import { measurementNames } from '../weather/measurement.models.js';
import type { GalleryQuery, GallerySort } from './gallery.models.js';

import type { Measurement } from '../weather/weather.models.js';

import { ObjectId } from 'mongodb';

const measurements = new Set<Measurement>(measurementNames);

const sorts = new Set<GallerySort>(['newest', 'oldest', 'popular']);

function readOptionalText(value: unknown, maximumLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.trim();

  return text.length > 0 && text.length <= maximumLength ? text : null;
}

function readPositiveInteger(value: unknown, fallback: number, maximum: number): number {
  if (typeof value !== 'string') {
    return fallback;
  }

  const number = Number(value);

  return Number.isInteger(number) && number > 0 && number <= maximum ? number : fallback;
}

export function validateGalleryQuery(value: Record<string, unknown>): GalleryQuery {
  const measurement =
    typeof value['measurement'] === 'string' &&
    measurements.has(value['measurement'] as Measurement)
      ? (value['measurement'] as Measurement)
      : null;

  const sort =
    typeof value['sort'] === 'string' && sorts.has(value['sort'] as GallerySort)
      ? (value['sort'] as GallerySort)
      : 'newest';

  return {
    city: readOptionalText(value['city'], 100),
    measurement,
    name: readOptionalText(value['name'], 100),
    sort,
    page: readPositiveInteger(value['page'], 1, 100_000),
    pageSize: readPositiveInteger(value['pageSize'], 12, 24),
  };
}

export function validateReportIds(value: unknown): ObjectId[] | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('reportIds' in value) ||
    !Array.isArray(value.reportIds) ||
    value.reportIds.length > 24
  ) {
    return null;
  }

  if (
    !value.reportIds.every((reportId) => typeof reportId === 'string' && ObjectId.isValid(reportId))
  ) {
    return null;
  }

  return value.reportIds.map((reportId) => new ObjectId(reportId as string));
}
