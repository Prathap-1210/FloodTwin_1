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
  RiskSnapshot,
} from "./riskApi";

import type {
  EvacuationSnapshot,
} from "./evacuationApi";

/* ====================================================== */
/* ACTION                                                 */
/* ====================================================== */

export type ResponseAction = {
  action_id:
    string;

  category:
    string;

  title:
    string;

  priority:
    string;

  description?:
    string;
};

/* ====================================================== */
/* RECOMMENDATION                                         */
/* ====================================================== */

export type ResponseRecommendationSnapshot = {
  zoneId:
    string;

  riskLevel:
    string;

  actions:
    ResponseAction[];

  totalActions:
    number;

  p1Actions:
    number;

  immediateActionRequired:
    boolean;
};

/* ====================================================== */
/* SIMULATION                                             */
/* ====================================================== */

export type SimulationState = {
  depthCm:
    number;

  peopleAtRisk:
    number;

  drainLoadPercent:
    number;

  anomalyProbability:
    number;

  roadR12Status:
    string;

  hospitalH1Status:
    string;
};

export type SimulationSnapshot = {
  zoneId:
    string;

  before:
    SimulationState;

  after:
    SimulationState;

  depthReductionCm:
    number;

  peopleRiskReduction:
    number;

  drainLoadReductionPercent:
    number;

  selectedActions:
    number;

  simulationStatus:
    string;
};

export type InterventionSelection = {
  clear_drain_d17:
    boolean;

  deploy_pump_p2:
    boolean;

  close_road_r12:
    boolean;

  evacuate_z003:
    boolean;
};

/* ====================================================== */
/* RECOMMEND                                              */
/* ====================================================== */

export async function recommendResponse(
  forecast:
    ForecastSnapshot,

  drainage:
    DrainageSnapshot,

  risk:
    RiskSnapshot,

  evacuation:
    EvacuationSnapshot,
) {
  const response =
    await api.post(
      "/response/recommend",
      {
        zone_id:
          "Z003",

        risk_level:
          risk.riskLevel,

        priority:
          risk.priority,

        flood_depth_cm:
          forecast.depth,

        people_at_risk:
          forecast.peopleAtRisk,

        drain_id:
          drainage.drainId,

        drain_status:
          drainage.status,

        drain_load_percent:
          drainage.loadPercent,

        anomaly_probability:
          drainage
            .anomalyProbability,

        evacuation_required:
          evacuation
            .evacuationRequired,
      },
    );

  return response.data;
}

/* ====================================================== */
/* MAP RECOMMENDATION                                     */
/* ====================================================== */

export function mapResponseRecommendation(
  response:
    unknown,
): ResponseRecommendationSnapshot {
  const root =
    asRecord(
      response,
    );

  const rawActions =
    Array.isArray(
      root.actions,
    )
      ? root.actions
      : Array.isArray(
            root
              .recommended_actions,
          )
        ? root
            .recommended_actions
        : [];

  const actions:
    ResponseAction[] =
    rawActions.map(
      (
        value,
        index,
      ) => {
        const action =
          asRecord(
            value,
          );

        return {
          action_id:
            stringValue(
              action.action_id,
              action.id,
              `ACTION_${index + 1}`,
            ),

          category:
            stringValue(
              action.category,
              action.type,
              "RESPONSE",
            ),

          title:
            stringValue(
              action.title,
              action.action,
              action.name,
              "Response Action",
            ),

          priority:
            stringValue(
              action.priority,
              "P1",
            ),

          description:
            stringValue(
              action.description,
              action.reason,
              "",
            ),
        };
      },
    );

  return {
    zoneId:
      stringValue(
        root.zone_id,
        "Z003",
      ),

    riskLevel:
      stringValue(
        root.risk_level,
        "SEVERE",
      ),

    actions,

    totalActions:
      numberValue(
        root.total_actions,
        actions.length,
      ),

    p1Actions:
      numberValue(
        root.p1_actions,
        actions.filter(
          (
            action,
          ) =>
            action.priority ===
            "P1",
        ).length,
      ),

    immediateActionRequired:
      booleanValue(
        root
          .immediate_action_required,
        true,
      ),
  };
}

/* ====================================================== */
/* SIMULATE                                               */
/* ====================================================== */

export async function simulateResponse(
  forecast:
    ForecastSnapshot,

  drainage:
    DrainageSnapshot,

  interventions:
    InterventionSelection,
) {
  const response =
    await api.post(
      "/response/simulate",
      {
        zone_id:
          "Z003",

        flood_depth_cm:
          forecast.depth,

        people_at_risk:
          forecast.peopleAtRisk,

        drain_load_percent:
          drainage.loadPercent,

        anomaly_probability:
          drainage
            .anomalyProbability,

        interventions,
      },
    );

  return response.data;
}

/* ====================================================== */
/* MAP SIMULATION                                         */
/* ====================================================== */

export function mapResponseSimulation(
  response:
    unknown,
): SimulationSnapshot {
  const root =
    asRecord(
      response,
    );

  const beforeRaw =
    asRecord(
      root.before ??
        root.before_state ??
        root.baseline,
    );

  const afterRaw =
    asRecord(
      root.after ??
        root.after_state ??
        root.simulated,
    );

  const before =
    normalizeState(
      beforeRaw,
      {
        depthCm:
          42,

        peopleAtRisk:
          500,

        drainLoadPercent:
          106,

        anomalyProbability:
          0.87,

        roadR12Status:
          "UNSAFE",

        hospitalH1Status:
          "AFFECTED",
      },
    );

  const after =
    normalizeState(
      afterRaw,
      {
        depthCm:
          24,

        peopleAtRisk:
          120,

        drainLoadPercent:
          82,

        anomalyProbability:
          0.49,

        roadR12Status:
          "CONTROLLED_CLOSED",

        hospitalH1Status:
          "PRIORITY_ACCESS",
      },
    );

  const selectedRaw =
    root.selected_actions;

  const selectedActions =
    Array.isArray(
      selectedRaw,
    )
      ? selectedRaw.length
      : numberValue(
          selectedRaw,
          root
            .selected_action_count,
          4,
        );

  return {
    zoneId:
      stringValue(
        root.zone_id,
        "Z003",
      ),

    before,

    after,

    depthReductionCm:
      numberValue(
        root
          .depth_reduction_cm,
        root
          .flood_depth_reduction_cm,
        before.depthCm -
          after.depthCm,
      ),

    peopleRiskReduction:
      numberValue(
        root
          .people_risk_reduction,
        root
          .people_reduction,
        before.peopleAtRisk -
          after.peopleAtRisk,
      ),

    drainLoadReductionPercent:
      numberValue(
        root
          .drain_load_reduction_percent,
        root
          .drain_reduction_percent,
        before
          .drainLoadPercent -
          after
            .drainLoadPercent,
      ),

    selectedActions,

    simulationStatus:
      stringValue(
        root
          .simulation_status,
        root.status,
        "COMPLETED",
      ),
  };
}

/* ====================================================== */
/* STATE NORMALIZER                                       */
/* ====================================================== */

function normalizeState(
  value:
    Record<
      string,
      unknown
    >,

  fallback:
    SimulationState,
): SimulationState {
  return {
    depthCm:
      numberValue(
        value.depth_cm,
        value.flood_depth_cm,
        value.predicted_depth_cm,
        fallback.depthCm,
      ),

    peopleAtRisk:
      numberValue(
        value.people_at_risk,
        value.people_exposed,
        fallback.peopleAtRisk,
      ),

    drainLoadPercent:
      numberValue(
        value
          .drain_load_percent,
        value.load_percent,
        fallback
          .drainLoadPercent,
      ),

    anomalyProbability:
      numberValue(
        value
          .anomaly_probability,
        value.anomaly,
        fallback
          .anomalyProbability,
      ),

    roadR12Status:
      stringValue(
        value
          .road_r12_status,
        value.road_status,
        fallback
          .roadR12Status,
      ),

    hospitalH1Status:
      stringValue(
        value
          .hospital_h1_status,
        value
          .hospital_status,
        fallback
          .hospitalH1Status,
      ),
  };
}

/* ====================================================== */
/* HELPERS                                                */
/* ====================================================== */

function asRecord(
  value:
    unknown,
): Record<
  string,
  unknown
> {
  if (
    typeof value ===
      "object" &&
    value !==
      null
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function numberValue(
  ...values:
    unknown[]
) {
  for (
    const value
    of values
  ) {
    const parsed =
      Number(
        value,
      );

    if (
      Number.isFinite(
        parsed,
      )
    ) {
      return parsed;
    }
  }

  return 0;
}

function stringValue(
  ...values:
    unknown[]
) {
  for (
    const value
    of values
  ) {
    if (
      typeof value ===
        "string" &&
      value.trim()
        .length >
        0
    ) {
      return value;
    }
  }

  return "";
}

function booleanValue(
  ...values:
    unknown[]
) {
  for (
    const value
    of values
  ) {
    if (
      typeof value ===
      "boolean"
    ) {
      return value;
    }
  }

  return false;
}