import {
  api,
} from "./api";

import type {
  ForecastSnapshot,
} from "./floodApi";

import type {
  RiskSnapshot,
} from "./riskApi";

import type {
  FloodTwinMLResponse,
} from "./mlApi";


/* ====================================================== */
/* CAMP                                                   */
/* ====================================================== */

export type EvacuationCamp = {
  camp_id: string;

  camp_name: string;

  capacity: number;

  allocated: number;

  remaining_capacity: number;
};


/* ====================================================== */
/* LEGACY BACKEND RESPONSE                                */
/* ====================================================== */

/*
 * Kept for compatibility with the old
 * /evacuation/plan endpoint.
 *
 * Main live FloodTwin mode should use
 * Model 5 from /ml/run.
 */

export type EvacuationPlanResponse = {
  zone_id: string;

  evacuation_required: boolean;

  people_to_evacuate: number;

  total_capacity: number;

  allocated_people: number;

  unallocated_people: number;

  readiness_percent: number;

  camp_allocations:
    EvacuationCamp[];

  primary_camp: string;

  secondary_camp: string;

  route_strategy: string;

  status: string;

  data_mode: string;
};


/* ====================================================== */
/* FRONTEND CAMP SHAPE                                    */
/* ====================================================== */

export type CampAllocation = {
  campId: string;

  campName: string;

  capacity: number;

  allocated: number;

  remainingCapacity: number;
};


/* ====================================================== */
/* FRONTEND EVACUATION SHAPE                              */
/* ====================================================== */

export type EvacuationSnapshot = {
  zoneId: string;

  evacuationRequired: boolean;

  peopleToEvacuate: number;

  totalCapacity: number;

  allocatedPeople: number;

  unallocatedPeople: number;

  readinessPercent: number;

  campAllocations:
    CampAllocation[];

  primaryCamp: string;

  secondaryCamp: string;

  routeStrategy: string;

  status: string;

  /* ---------------------------------------------------- */
  /* MODEL 5 / LIVE CONTEXT                               */
  /* ---------------------------------------------------- */

  priority?: string;

  evacuationRatio?: number;

  evacuationRatioPercent?: number;

  population?: number;

  nearestShelterDistanceKm?: number | null;

  source?: "model5" | "legacy" | "demo";
};


/* ====================================================== */
/* LIVE SHELTER CONTEXT                                   */
/* ====================================================== */

export type LiveEvacuationContext = {
  primaryShelterName?:
    string | null;

  primaryShelterDistanceKm?:
    number | null;

  secondaryShelterName?:
    string | null;

  /*
   * Only supply capacities if you actually
   * have authoritative / configured values.
   */

  primaryShelterCapacity?:
    number | null;

  secondaryShelterCapacity?:
    number | null;
};


/* ====================================================== */
/* MODEL 5 -> FRONTEND                                    */
/* ====================================================== */

export function mapFloodTwinMLEvacuation(
  result:
    FloodTwinMLResponse,

  context:
    LiveEvacuationContext = {},
): EvacuationSnapshot {

  const model =
    result.evacuation;

  const peopleToEvacuate =
    Math.max(
      0,
      Math.round(
        model
          .predicted_evacuation_count,
      ),
    );

  const evacuationRequired =
    peopleToEvacuate >
    0;

  const primaryCamp =
    context
      .primaryShelterName ??
    "Nearest mapped candidate shelter";

  const secondaryCamp =
    context
      .secondaryShelterName ??
    "";

  const primaryCapacity =
    normalizeCapacity(
      context
        .primaryShelterCapacity,
    );

  const secondaryCapacity =
    normalizeCapacity(
      context
        .secondaryShelterCapacity,
    );

  /* ==================================================== */
  /* CAPACITY-AWARE ALLOCATION                            */
  /* ==================================================== */

  /*
   * We allocate people only when capacity is actually
   * supplied.
   *
   * This prevents FloodTwin from pretending that OSM
   * candidate shelters have validated emergency capacity.
   */

  const campAllocations:
    CampAllocation[] = [];

  let remainingPeople =
    peopleToEvacuate;

  if (
    primaryCapacity >
    0
  ) {
    const allocated =
      Math.min(
        remainingPeople,
        primaryCapacity,
      );

    campAllocations.push({
      campId:
        "PRIMARY_SHELTER",

      campName:
        primaryCamp,

      capacity:
        primaryCapacity,

      allocated,

      remainingCapacity:
        Math.max(
          primaryCapacity -
            allocated,
          0,
        ),
    });

    remainingPeople =
      Math.max(
        remainingPeople -
          allocated,
        0,
      );
  }

  if (
    secondaryCapacity >
      0 &&
    secondaryCamp
  ) {
    const allocated =
      Math.min(
        remainingPeople,
        secondaryCapacity,
      );

    campAllocations.push({
      campId:
        "SECONDARY_SHELTER",

      campName:
        secondaryCamp,

      capacity:
        secondaryCapacity,

      allocated,

      remainingCapacity:
        Math.max(
          secondaryCapacity -
            allocated,
          0,
        ),
    });

    remainingPeople =
      Math.max(
        remainingPeople -
          allocated,
        0,
      );
  }

  const totalCapacity =
    campAllocations.reduce(
      (
        total,
        camp,
      ) =>
        total +
        camp.capacity,
      0,
    );

  const allocatedPeople =
    campAllocations.reduce(
      (
        total,
        camp,
      ) =>
        total +
        camp.allocated,
      0,
    );

  const unallocatedPeople =
    Math.max(
      peopleToEvacuate -
        allocatedPeople,
      0,
    );

  /* ==================================================== */
  /* READINESS                                            */
  /* ==================================================== */

  const readinessPercent =
    !evacuationRequired
      ? 100
      : peopleToEvacuate >
            0 &&
          totalCapacity >
            0
        ? Number(
            (
              (
                allocatedPeople /
                peopleToEvacuate
              ) *
              100
            ).toFixed(
              1,
            ),
          )
        : 0;

  /* ==================================================== */
  /* STATUS                                               */
  /* ==================================================== */

  let status:
    string;

  if (
    !evacuationRequired
  ) {
    status =
      "NO_EVACUATION_REQUIRED";
  } else if (
    totalCapacity ===
    0
  ) {
    status =
      "DEMAND_ESTIMATE_ONLY";
  } else if (
    unallocatedPeople >
    0
  ) {
    status =
      "CAPACITY_SHORTFALL";
  } else {
    status =
      "FULLY_ALLOCATED";
  }

  /* ==================================================== */
  /* ROUTE STRATEGY                                       */
  /* ==================================================== */

  const roadUnsafe =
    result.road.unsafe ||
    result.road
      .risk_class ===
      "UNSAFE";

  const routeStrategy =
    roadUnsafe
      ? (
          `Avoid predicted unsafe road segments and route evacuees toward ${primaryCamp}.`
        )
      : (
          `Route evacuees toward ${primaryCamp} using the lowest-risk available corridor.`
        );

  return {
    zoneId:
      result.location
        .zone_id,

    evacuationRequired,

    peopleToEvacuate,

    totalCapacity,

    allocatedPeople,

    unallocatedPeople,

    readinessPercent,

    campAllocations,

    primaryCamp,

    secondaryCamp,

    routeStrategy,

    status,

    priority:
      model.priority,

    evacuationRatio:
      model
        .evacuation_ratio,

    evacuationRatioPercent:
      model
        .evacuation_ratio_percent,

    population:
      model.population,

    nearestShelterDistanceKm:
      context
        .primaryShelterDistanceKm ??
      null,

    source:
      "model5",
  };
}


/* ====================================================== */
/* LEGACY API CALL                                        */
/* ====================================================== */

export async function planEvacuation(
  forecast:
    ForecastSnapshot,

  risk:
    RiskSnapshot,

  options?: {
    zoneId?: string;

    latitude?: number;

    longitude?: number;
  },
): Promise<EvacuationPlanResponse> {

  const response =
    await api.post<
      EvacuationPlanResponse
    >(
      "/evacuation/plan",
      {
        zone_id:
          options
            ?.zoneId ??
          risk.zoneId ??
          "DYNAMIC_ZONE",

        people_at_risk:
          forecast
            .peopleAtRisk,

        risk_level:
          risk.riskLevel,

        evacuation_required:
          risk
            .evacuationRequired,

        /*
         * Only send location when supplied.
         * This removes the old fixed Velachery
         * coordinates from the service.
         */

        origin_lat:
          options
            ?.latitude,

        origin_lon:
          options
            ?.longitude,
      },
    );

  return response.data;
}


/* ====================================================== */
/* LEGACY BACKEND -> FRONTEND                             */
/* ====================================================== */

export function mapEvacuationPlan(
  response:
    EvacuationPlanResponse,
): EvacuationSnapshot {

  return {
    zoneId:
      response.zone_id,

    evacuationRequired:
      response
        .evacuation_required,

    peopleToEvacuate:
      response
        .people_to_evacuate,

    totalCapacity:
      response
        .total_capacity,

    allocatedPeople:
      response
        .allocated_people,

    unallocatedPeople:
      response
        .unallocated_people,

    readinessPercent:
      response
        .readiness_percent,

    campAllocations:
      response
        .camp_allocations
        .map(
          (
            camp,
          ) => ({
            campId:
              camp.camp_id,

            campName:
              camp.camp_name,

            capacity:
              camp.capacity,

            allocated:
              camp.allocated,

            remainingCapacity:
              camp
                .remaining_capacity,
          }),
        ),

    primaryCamp:
      response
        .primary_camp,

    secondaryCamp:
      response
        .secondary_camp,

    routeStrategy:
      response
        .route_strategy,

    status:
      response.status,

    source:
      "legacy",
  };
}


/* ====================================================== */
/* DEMO FALLBACK                                          */
/* ====================================================== */

export function getDemoEvacuation(
  forecast:
    ForecastSnapshot,

  risk:
    RiskSnapshot,
): EvacuationSnapshot {

  const required =
    risk
      .evacuationRequired;

  const people =
    required
      ? forecast
          .peopleAtRisk
      : 0;

  /*
   * Demo capacities remain intentionally
   * isolated inside demo mode.
   */

  const campACapacity =
    300;

  const campBCapacity =
    200;

  const totalCapacity =
    campACapacity +
    campBCapacity;

  const campAAllocated =
    Math.min(
      people,
      campACapacity,
    );

  const remainingAfterA =
    Math.max(
      people -
        campAAllocated,
      0,
    );

  const campBAllocated =
    Math.min(
      remainingAfterA,
      campBCapacity,
    );

  const allocatedPeople =
    campAAllocated +
    campBAllocated;

  const unallocatedPeople =
    Math.max(
      people -
        allocatedPeople,
      0,
    );

  const readinessPercent =
    people >
    0
      ? Number(
          (
            (
              allocatedPeople /
              people
            ) *
            100
          ).toFixed(
            1,
          ),
        )
      : 100;

  return {
    zoneId:
      "DEMO_ZONE",

    evacuationRequired:
      required,

    peopleToEvacuate:
      people,

    totalCapacity,

    allocatedPeople,

    unallocatedPeople,

    readinessPercent,

    campAllocations: [
      {
        campId:
          "CAMP_A",

        campName:
          "Camp A",

        capacity:
          campACapacity,

        allocated:
          campAAllocated,

        remainingCapacity:
          campACapacity -
          campAAllocated,
      },

      {
        campId:
          "CAMP_B",

        campName:
          "Camp B",

        capacity:
          campBCapacity,

        allocated:
          campBAllocated,

        remainingCapacity:
          campBCapacity -
          campBAllocated,
      },
    ],

    primaryCamp:
      "Camp A",

    secondaryCamp:
      "Camp B",

    routeStrategy:
      risk
        .roadRestrictionRequired
        ? (
            "Avoid threatened road segments and use the flood-safe route."
          )
        : (
            "Use the lowest-risk evacuation route to the assigned shelter."
          ),

    status:
      unallocatedPeople >
      0
        ? "CAPACITY_SHORTFALL"
        : required
          ? "FULLY_ALLOCATED"
          : "NO_EVACUATION_REQUIRED",

    priority:
      risk.priority,

    evacuationRatio:
      forecast
        .peopleAtRisk >
        0
        ? (
            people /
            forecast
              .peopleAtRisk
          )
        : 0,

    evacuationRatioPercent:
      forecast
        .peopleAtRisk >
        0
        ? Number(
            (
              (
                people /
                forecast
                  .peopleAtRisk
              ) *
              100
            ).toFixed(
              2,
            ),
          )
        : 0,

    population:
      forecast
        .peopleAtRisk,

    source:
      "demo",
  };
}


/* ====================================================== */
/* HELPER                                                 */
/* ====================================================== */

function normalizeCapacity(
  value:
    number | null | undefined,
): number {

  if (
    value == null ||
    !Number.isFinite(
      value,
    ) ||
    value <=
      0
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      value,
    ),
  );
}