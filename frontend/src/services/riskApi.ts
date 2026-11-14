import {
  api,
} from "./api";

import type {
  ForecastSnapshot,
} from "./floodApi";

import type {
  DrainageSnapshot,
} from "./drainageApi";

import type {
  FloodTwinMLResponse,
} from "./mlApi";


/* ====================================================== */
/* LEGACY BACKEND RESPONSE                                */
/* ====================================================== */

/*
 * Kept only for compatibility with the old
 * /risk/classify endpoint.
 *
 * Live FloodTwin mode should use Model 3 from
 * /ml/run through mapFloodTwinMLRisk().
 */

export type RiskClassificationResponse = {
  zone_id: string;

  risk_level: string;

  priority: string;

  risk_score: number;

  evacuation_required: boolean;

  road_restriction_required: boolean;

  drainage_intervention_required: boolean;

  reason: string;

  data_mode: string;
};


/* ====================================================== */
/* FRONTEND RISK SHAPE                                    */
/* ====================================================== */

export type RiskSnapshot = {
  zoneId: string;

  riskLevel: string;

  priority: string;

  riskScore: number;

  evacuationRequired: boolean;

  roadRestrictionRequired: boolean;

  drainageInterventionRequired: boolean;

  reason: string;

  /*
   * Extra Model-3 / operational fields.
   * Optional so old UI remains compatible.
   */

  confidence?: number;

  confidencePercent?: number;

  rawMlRisk?: string;

  policyRisk?: string;

  operationalGuardrailApplied?: boolean;

  roadRisk?: string;

  roadRiskProbability?: number;

  hotspotReasons?: string[];
};


/* ====================================================== */
/* MODEL 3 + MODEL 4 + MODEL 5 -> RISK SNAPSHOT           */
/* ====================================================== */

export function mapFloodTwinMLRisk(
  result:
    FloodTwinMLResponse,
): RiskSnapshot {

  const hotspot =
    result.hotspot;

  const road =
    result.road;

  const drainage =
    result.drainage;

  const evacuation =
    result.evacuation;

  /* ---------------------------------------------------- */
  /* EVACUATION DECISION                                  */
  /* ---------------------------------------------------- */

  const evacuationRequired =
    evacuation
      .predicted_evacuation_count >
      0 &&
    (
      hotspot.risk ===
        "SEVERE" ||
      hotspot.risk ===
        "HIGH" ||
      evacuation.priority ===
        "CRITICAL" ||
      evacuation.priority ===
        "HIGH"
    );

  /* ---------------------------------------------------- */
  /* ROAD DECISION                                        */
  /* ---------------------------------------------------- */

  const roadRestrictionRequired =
    road.unsafe ||
    road.risk_class ===
      "UNSAFE";

  /* ---------------------------------------------------- */
  /* DRAINAGE DECISION                                    */
  /* ---------------------------------------------------- */

  const drainageInterventionRequired =
    drainage.status ===
      "OVERLOADED" ||
    drainage.status ===
      "PROBABLE_BLOCKAGE" ||
    drainage.severity ===
      "HIGH" ||
    drainage.severity ===
      "SEVERE";

  /* ---------------------------------------------------- */
  /* REASON                                               */
  /* ---------------------------------------------------- */

  const hotspotReasons =
    Array.isArray(
      hotspot.reasons,
    )
      ? hotspot.reasons
      : [];

  const reason =
    hotspotReasons.length >
    0
      ? hotspotReasons.join(
          " • ",
        )
      : (
          `Model 3 classified ${result.location.zone_id} ` +
          `as ${hotspot.risk} with ${hotspot.response_priority} response priority.`
        );

  return {
    zoneId:
      result.location
        .zone_id,

    riskLevel:
      hotspot.risk,

    priority:
      hotspot
        .response_priority,

    riskScore:
      Number(
        hotspot
          .priority_score
          .toFixed(1),
      ),

    evacuationRequired,

    roadRestrictionRequired,

    drainageInterventionRequired,

    reason,

    confidence:
      hotspot.confidence,

    confidencePercent:
      hotspot
        .confidence_percent,

    rawMlRisk:
      hotspot.raw_ml_risk,

    policyRisk:
      hotspot.policy_risk,

    operationalGuardrailApplied:
      hotspot
        .operational_guardrail_applied,

    roadRisk:
      road.risk_class,

    roadRiskProbability:
      road
        .road_risk_probability,

    hotspotReasons,
  };
}


/* ====================================================== */
/* LEGACY API CALL                                        */
/* ====================================================== */

/*
 * This endpoint is retained only so older components
 * do not break.
 *
 * Main live mode should NOT depend on this function.
 */

export async function classifyRisk(
  forecast:
    ForecastSnapshot,

  drainage:
    DrainageSnapshot,

  zoneId =
    "DYNAMIC_ZONE",
): Promise<RiskClassificationResponse> {

  const response =
    await api.post<
      RiskClassificationResponse
    >(
      "/risk/classify",
      {
        zone_id:
          zoneId,

        flood_depth_cm:
          forecast.depth,

        flood_probability:
          forecast.probability,

        people_at_risk:
          forecast.peopleAtRisk,

        drain_load_percent:
          drainage.loadPercent,

        anomaly_probability:
          drainage
            .anomalyProbability,
      },
    );

  return response.data;
}


/* ====================================================== */
/* LEGACY RESPONSE -> FRONTEND                            */
/* ====================================================== */

export function mapRiskClassification(
  response:
    RiskClassificationResponse,
): RiskSnapshot {

  return {
    zoneId:
      response.zone_id,

    riskLevel:
      response.risk_level,

    priority:
      response.priority,

    riskScore:
      response.risk_score,

    evacuationRequired:
      response
        .evacuation_required,

    roadRestrictionRequired:
      response
        .road_restriction_required,

    drainageInterventionRequired:
      response
        .drainage_intervention_required,

    reason:
      response.reason,
  };
}


/* ====================================================== */
/* DEMO FALLBACK                                          */
/* ====================================================== */

export function getDemoRisk(
  forecast:
    ForecastSnapshot,

  drainage:
    DrainageSnapshot,

  zoneId =
    "DEMO_ZONE",
): RiskSnapshot {

  const score =
    calculateDemoRiskScore(
      forecast,
      drainage,
    );

  let riskLevel =
    "SAFE";

  let priority =
    "P4";

  if (
    score >=
    75
  ) {
    riskLevel =
      "SEVERE";

    priority =
      "P1";
  } else if (
    score >=
    55
  ) {
    riskLevel =
      "HIGH";

    priority =
      "P2";
  } else if (
    score >=
    30
  ) {
    riskLevel =
      "CAUTION";

    priority =
      "P3";
  }

  const evacuationRequired =
    riskLevel ===
      "SEVERE" ||
    forecast
      .peopleAtRisk >=
      500;

  const roadRestrictionRequired =
    forecast.depth >=
      35 ||
    riskLevel ===
      "SEVERE";

  const drainageInterventionRequired =
    drainage
      .loadPercent >=
      100 ||
    drainage
      .anomalyProbability >=
      0.75;

  return {
    zoneId,

    riskLevel,

    priority,

    riskScore:
      score,

    evacuationRequired,

    roadRestrictionRequired,

    drainageInterventionRequired,

    reason:
      (
        `${zoneId} classified as ${riskLevel} using ` +
        "flood depth, flood probability, population exposure " +
        "and drainage condition."
      ),

    confidence:
      0,

    confidencePercent:
      0,

    rawMlRisk:
      riskLevel,

    policyRisk:
      riskLevel,

    operationalGuardrailApplied:
      false,

    roadRisk:
      roadRestrictionRequired
        ? "UNSAFE"
        : "SAFE",

    roadRiskProbability:
      roadRestrictionRequired
        ? 1
        : 0,

    hotspotReasons: [],
  };
}


/* ====================================================== */
/* DEMO SCORE                                             */
/* ====================================================== */

function calculateDemoRiskScore(
  forecast:
    ForecastSnapshot,

  drainage:
    DrainageSnapshot,
): number {

  let score =
    0;

  score +=
    Math.min(
      forecast.depth /
        60,
      1,
    ) *
    35;

  score +=
    forecast.probability *
    25;

  score +=
    Math.min(
      forecast.peopleAtRisk /
        700,
      1,
    ) *
    20;

  score +=
    Math.min(
      drainage.loadPercent /
        120,
      1,
    ) *
    10;

  score +=
    drainage
      .anomalyProbability *
    10;

  return Number(
    Math.min(
      score,
      100,
    ).toFixed(
      1,
    ),
  );
}