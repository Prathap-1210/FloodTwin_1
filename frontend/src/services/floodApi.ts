import {
  api,
} from "./api";

import {
  forecastData,
  type ForecastMinute,
} from "../data/demo/forecastData";

/* ====================================================== */
/* BACKEND RESPONSE                                       */
/* ====================================================== */

export type FloodPredictionResponse = {
  zone_id: string;

  forecast_minutes: number;

  depth_cm: number;

  probability: number;

  risk: string;

  people_at_risk: number;

  drain_status: string;

  drain_load_percent: number;

  anomaly_probability: number;

  drain_priority: string;

  confidence: number;

  polygon: number[][][];

  data_mode: string;
};

/* ====================================================== */
/* FRONTEND FORECAST SHAPE                                */
/* ====================================================== */

export type ForecastSnapshot = {
  depth: number;

  probability: number;

  risk: string;

  peopleAtRisk: number;

  drainStatus: string;

  drainLoadPercent: number;

  drainAnomalyProbability: number;

  drainPriority: string;

  drainConfidence: number;

  polygon: number[][][];
};

/* ====================================================== */
/* API CALL                                               */
/* ====================================================== */

export async function predictFlood(
  forecastMinutes: ForecastMinute,
): Promise<FloodPredictionResponse> {
  const response =
    await api.post<FloodPredictionResponse>(
      "/flood/predict",
      {
        zone_id: "Z003",

        forecast_minutes:
          forecastMinutes,

        rainfall_intensity_mm_hr:
          getRainfallIntensity(
            forecastMinutes,
          ),

        drain_load_percent:
          getDrainLoad(
            forecastMinutes,
          ),
      },
    );

  return response.data;
}

/* ====================================================== */
/* BACKEND → FRONTEND ADAPTER                             */
/* ====================================================== */

export function mapFloodPrediction(
  response: FloodPredictionResponse,
): ForecastSnapshot {
  return {
    depth:
      response.depth_cm,

    probability:
      response.probability,

    risk:
      response.risk,

    peopleAtRisk:
      response.people_at_risk,

    drainStatus:
      response.drain_status,

    drainLoadPercent:
      response.drain_load_percent,

    drainAnomalyProbability:
      response.anomaly_probability,

    drainPriority:
      response.drain_priority,

    drainConfidence:
      response.confidence,

    polygon:
      response.polygon,
  };
}

/* ====================================================== */
/* LOCAL DEMO FALLBACK                                    */
/* ====================================================== */

export function getDemoForecast(
  forecastMinutes: ForecastMinute,
): ForecastSnapshot {
  const forecast =
    forecastData[
      forecastMinutes
    ];

  return {
    depth:
      forecast.depth,

    probability:
      forecast.probability,

    risk:
      forecast.risk,

    peopleAtRisk:
      forecast.peopleAtRisk,

    drainStatus:
      forecast.drainStatus,

    drainLoadPercent:
      forecast.drainLoadPercent,

    drainAnomalyProbability:
      forecast.drainAnomalyProbability,

    drainPriority:
      forecast.drainPriority,

    drainConfidence:
      forecast.drainConfidence,

    polygon:
      forecast.polygon.map(
        (ring) =>
          ring.map(
            (coordinate) => [
              coordinate[0],
              coordinate[1],
            ],
          ),
      ),
  };
}

/* ====================================================== */
/* DEMO INPUTS                                            */
/* ====================================================== */

function getRainfallIntensity(
  forecastMinutes: ForecastMinute,
) {
  switch (forecastMinutes) {
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

function getDrainLoad(
  forecastMinutes: ForecastMinute,
) {
  switch (forecastMinutes) {
    case 0:
      return 68;

    case 30:
      return 84;

    case 60:
      return 106;

    case 90:
      return 121;

    case 180:
      return 94;
  }
}