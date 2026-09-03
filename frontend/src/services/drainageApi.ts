import {
  api,
} from "./api";

import type {
  ForecastMinute,
} from "../data/demo/forecastData";

import type {
  ForecastSnapshot,
} from "./floodApi";

/* ====================================================== */
/* BACKEND RESPONSE                                       */
/* ====================================================== */

export type DrainageAnalysisResponse = {
  drain_id: string;

  forecast_minutes: number;

  status: string;

  load_percent: number;

  anomaly_probability: number;

  priority: string;

  confidence: number;

  likely_cause: string;

  recommended_action: string;

  data_mode: string;
};

/* ====================================================== */
/* FRONTEND SHAPE                                         */
/* ====================================================== */

export type DrainageSnapshot = {
  drainId: string;

  status: string;

  loadPercent: number;

  anomalyProbability: number;

  priority: string;

  confidence: number;

  likelyCause: string;

  recommendedAction: string;
};

/* ====================================================== */
/* API CALL                                               */
/* ====================================================== */

export async function analyzeDrainage(
  forecastMinutes: ForecastMinute,

  observedLoadPercent: number,
): Promise<DrainageAnalysisResponse> {
  const response =
    await api.post<
      DrainageAnalysisResponse
    >(
      "/drainage/analyze",

      {
        drain_id:
          "D17",

        forecast_minutes:
          forecastMinutes,

        rainfall_intensity_mm_hr:
          getRainfallIntensity(
            forecastMinutes,
          ),

        observed_load_percent:
          observedLoadPercent,
      },
    );

  return response.data;
}

/* ====================================================== */
/* BACKEND → FRONTEND                                     */
/* ====================================================== */

export function mapDrainageAnalysis(
  response:
    DrainageAnalysisResponse,
): DrainageSnapshot {
  return {
    drainId:
      response.drain_id,

    status:
      response.status,

    loadPercent:
      response.load_percent,

    anomalyProbability:
      response.anomaly_probability,

    priority:
      response.priority,

    confidence:
      response.confidence,

    likelyCause:
      response.likely_cause,

    recommendedAction:
      response.recommended_action,
  };
}

/* ====================================================== */
/* DEMO FALLBACK                                          */
/* ====================================================== */

export function getDemoDrainage(
  forecast:
    ForecastSnapshot,
): DrainageSnapshot {
  return {
    drainId:
      "D17",

    status:
      forecast.drainStatus,

    loadPercent:
      forecast.drainLoadPercent,

    anomalyProbability:
      forecast
        .drainAnomalyProbability,

    priority:
      forecast.drainPriority,

    confidence:
      forecast.drainConfidence,

    likelyCause:
      forecast.drainStatus ===
      "PROBABLE_BLOCKAGE"
        ? "Probable local obstruction or reduced conveyance capacity near drainage segment D17."
        : forecast.drainStatus ===
            "OVERLOADED"
          ? "Drainage capacity remains constrained after peak rainfall conditions."
          : "Elevated runoff is creating hydraulic stress in drainage segment D17.",

    recommendedAction:
      forecast.drainPriority ===
      "P1"
        ? "Immediately inspect D17, verify the suspected obstruction and initiate clearance if confirmed."
        : "Continue monitoring D17 and verify field drainage conditions.",
  };
}

/* ====================================================== */
/* RAINFALL INPUT                                         */
/* ====================================================== */

function getRainfallIntensity(
  forecastMinutes:
    ForecastMinute,
) {
  switch (
    forecastMinutes
  ) {
    case 0:
      return 38;

    case 30:
      return 62;

    case 60:
      return 85;

    case 90:
      return 96;

    case 180:
      return 54;
  }
}