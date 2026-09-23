import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateAnalysisSeries } from "../src/weather/weather.validator.js";
import type {
  AvgFrequency,
  Comparison,
} from "../src/weather/weather.models.js";

function validAverageMatchingDaysSeries(
  avgFrequency: AvgFrequency = "daily",
  comparison: Comparison = ">",
) {
  return {
    location: {
      city: "Raleigh",
      admin1: "North Carolina",
      country: "United States",
      latitude: 35.7796,
      longitude: -78.6382,
    },
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    dateFilter: { unit: "none", min: "", max: "" },
    measurement: "rain_sum",
    comparison,
    threshold: comparison === "none" ? null : 0,
    aggregation: "avgMatchingDays",
    avgFrequency,
  };
}

describe("Average on Matching Days validation", () => {
  it("accepts daily frequency", () => {
    assert.notEqual(
      validateAnalysisSeries(validAverageMatchingDaysSeries(), "all"),
      null,
    );
  });

  it("rejects every nondaily frequency", () => {
    for (const frequency of ["weekly", "monthly", "yearly", "none"] as const) {
      assert.equal(
        validateAnalysisSeries(
          validAverageMatchingDaysSeries(frequency),
          "all",
        ),
        null,
        `${frequency} should be rejected`,
      );
    }
  });

  it("requires a value comparison", () => {
    assert.equal(
      validateAnalysisSeries(
        validAverageMatchingDaysSeries("daily", "none"),
        "all",
      ),
      null,
    );
  });

  it("accepts strict less-than and greater-than comparisons", () => {
    assert.notEqual(
      validateAnalysisSeries(
        validAverageMatchingDaysSeries("daily", "<"),
        "all",
      ),
      null,
    );
    assert.notEqual(
      validateAnalysisSeries(
        validAverageMatchingDaysSeries("daily", ">"),
        "all",
      ),
      null,
    );
  });

  it("rejects start dates before 1940 and accepts January 1, 1940", () => {
    assert.equal(
      validateAnalysisSeries(
        { ...validAverageMatchingDaysSeries(), startDate: "1939-12-31" },
        "all",
      ),
      null,
    );
    assert.notEqual(
      validateAnalysisSeries(
        { ...validAverageMatchingDaysSeries(), startDate: "1940-01-01" },
        "all",
      ),
      null,
    );
  });
});
