import {
  api,
} from "./api";

import type {
  ForecastSnapshot,
} from "./floodApi";

import type {
  EvacuationSnapshot,
} from "./evacuationApi";

import type {
  FloodTwinMLResponse,
} from "./mlApi";


/* ====================================================== */
/* GEOMETRY                                               */
/* ====================================================== */

export type RouteGeometry = {
  type:
    "LineString";

  coordinates:
    number[][];
};


/* ====================================================== */
/* ROUTE OPTION                                           */
/* ====================================================== */

export type RouteOption = {
  routeId:
    string;

  name:
    string;

  distanceKm:
    number;

  durationMin:
    number;

  status:
    string;

  floodExposure:
    string;

  intersectsFlood:
    boolean;

  intersectsR12:
    boolean;

  geometry:
    RouteGeometry;

  /*
   * Model 4 additions.
   */
  riskProbability?:
    number;

  riskClass?:
    string;

  routingRecommendation?:
    string;

  reasons?:
    string[];
};


/* ====================================================== */
/* ROUTES SNAPSHOT                                        */
/* ====================================================== */

export type RoutesSnapshot = {
  zoneId:
    string;

  fastestRoute:
    RouteOption;

  safeRoute:
    RouteOption;

  recommendedRouteId:
    string;

  extraDistanceKm:
    number;

  extraDurationMin:
    number;

  /*
   * Model 4 operational context.
   */
  roadRiskClass?:
    string;

  roadRiskProbability?:
    number;

  roadUnsafe?:
    boolean;

  routingRecommendation?:
    string;

  source?:
    "model4+route-engine"
    | "route-engine"
    | "demo";
};


/* ====================================================== */
/* DYNAMIC ROUTING CONTEXT                                */
/* ====================================================== */

export type SafeRouteContext = {
  zoneId?:
    string;

  originLat:
    number;

  originLon:
    number;

  destinationLat:
    number;

  destinationLon:
    number;

  avoidRoadId?:
    string | null;
};


/* ====================================================== */
/* ROUTE API                                              */
/* ====================================================== */

export async function getSafeRoutes(
  forecast:
    ForecastSnapshot,

  evacuation:
    EvacuationSnapshot,

  context?:
    SafeRouteContext,
) {
  /*
   * The old version silently forced:
   *
   * Z003
   * fixed Velachery origin
   * fixed destination
   * R12
   *
   * Those values are now accepted only as an explicit
   * compatibility fallback when an older caller has not
   * yet supplied dynamic map context.
   */

  const fallback =
    getDemoRouteContext();

  const activeContext =
    context ??
    fallback;

  const response =
    await api.post(
      "/routes/safe",
      {
        zone_id:
          activeContext
            .zoneId ??
          evacuation.zoneId,

        origin_lat:
          activeContext
            .originLat,

        origin_lon:
          activeContext
            .originLon,

        destination_lat:
          activeContext
            .destinationLat,

        destination_lon:
          activeContext
            .destinationLon,

        flood_depth_cm:
          forecast.depth,

        flood_probability:
          forecast.probability,

        evacuation_required:
          evacuation
            .evacuationRequired,

        avoid_road_id:
          activeContext
            .avoidRoadId ??
          null,
      },
    );

  return response.data;
}


/* ====================================================== */
/* BACKEND ROUTE RESPONSE -> UI                           */
/* ====================================================== */

export function mapSafeRoutes(
  response:
    unknown,
): RoutesSnapshot {

  const root =
    asRecord(
      response,
    );

  const demo =
    getDemoRoutes();

  const routeArray =
    Array.isArray(
      root.routes,
    )
      ? root.routes
      : [];

  /* ==================================================== */
  /* FASTEST ROUTE                                        */
  /* ==================================================== */

  const fastestRaw =
    root.fastest_route ??
    root.fastestRoute ??
    routeArray.find(
      (
        item,
      ) => {
        const route =
          asRecord(
            item,
          );

        const id =
          stringValue(
            route.route_id,
            route.routeId,
            route.id,
          ).toUpperCase();

        const type =
          stringValue(
            route.route_type,
            route.name,
          ).toUpperCase();

        return (
          id.includes(
            "FAST",
          ) ||
          type.includes(
            "FAST",
          )
        );
      },
    );

  /* ==================================================== */
  /* SAFE ROUTE                                           */
  /* ==================================================== */

  const safeRaw =
    root.safe_route ??
    root.flood_safe_route ??
    root.safeRoute ??
    routeArray.find(
      (
        item,
      ) => {
        const route =
          asRecord(
            item,
          );

        const id =
          stringValue(
            route.route_id,
            route.routeId,
            route.id,
          ).toUpperCase();

        const type =
          stringValue(
            route.route_type,
            route.name,
          ).toUpperCase();

        return (
          id.includes(
            "SAFE",
          ) ||
          type.includes(
            "SAFE",
          )
        );
      },
    );

  const fastest =
    normalizeRoute(
      fastestRaw,
      demo.fastestRoute,
    );

  const safe =
    normalizeRoute(
      safeRaw,
      demo.safeRoute,
    );

  /* ==================================================== */
  /* RECOMMENDED ROUTE                                    */
  /* ==================================================== */

  const recommendedRouteId =
    stringValue(
      root.recommended_route_id,
      root.recommendedRouteId,
      root.recommended_route,
      safe.routeId,
    );

  /* ==================================================== */
  /* DELTAS                                               */
  /* ==================================================== */

  const extraDistanceKm =
    numberValue(
      root.extra_distance_km,
      root.additional_distance_km,
      root.extraDistanceKm,

      Number(
        Math.max(
          safe.distanceKm -
            fastest.distanceKm,
          0,
        ).toFixed(
          2,
        ),
      ),
    );

  const extraDurationMin =
    numberValue(
      root.extra_duration_min,
      root.additional_time_min,
      root.extra_time_min,
      root.extraDurationMin,

      Math.max(
        safe.durationMin -
          fastest.durationMin,
        0,
      ),
    );

  return {
    zoneId:
      stringValue(
        root.zone_id,
        root.zoneId,
        "DYNAMIC_ZONE",
      ),

    fastestRoute:
      fastest,

    safeRoute:
      safe,

    recommendedRouteId,

    extraDistanceKm,

    extraDurationMin,

    source:
      "route-engine",
  };
}


/* ====================================================== */
/* MODEL 4 -> ROUTE ANALYZER                              */
/* ====================================================== */

/*
 * This function combines actual route-engine geometry
 * with the trained Model 4 road-risk result.
 *
 * Geometry is NOT generated by Model 4.
 * Model 4 supplies the future flood-risk decision.
 */

export function mapFloodTwinMLRoutes(
  result:
    FloodTwinMLResponse,

  routes:
    RoutesSnapshot,
): RoutesSnapshot {

  const road =
    result.road;

  const riskClass =
    road.risk_class;

  const riskProbability =
    clamp01(
      road
        .road_risk_probability,
    );

  const unsafe =
    road.unsafe ||
    riskClass ===
      "UNSAFE";

  const caution =
    riskClass ===
      "CAUTION";

  /* ==================================================== */
  /* FASTEST ROUTE                                        */
  /* ==================================================== */

  const fastestStatus =
    unsafe
      ? "UNSAFE"
      : caution
        ? "CAUTION"
        : routes
            .fastestRoute
            .status;

  const fastestRoute:
    RouteOption = {
      ...routes
        .fastestRoute,

      status:
        fastestStatus,

      /*
       * Model 4 is evaluating road exposure at the
       * selected affected location.
       *
       * When Model 4 says UNSAFE, that unsafe condition
       * is injected into route decision-making.
       */

      intersectsFlood:
        unsafe ||
        routes
          .fastestRoute
          .intersectsFlood,

      floodExposure:
        unsafe
          ? "HIGH"
          : caution
            ? "MEDIUM"
            : routes
                .fastestRoute
                .floodExposure,

      riskProbability,

      riskClass,

      routingRecommendation:
        road
          .routing_recommendation,

      reasons:
        road.reasons,
    };

  /* ==================================================== */
  /* FLOOD-SAFE ROUTE                                     */
  /* ==================================================== */

  const safeRoute:
    RouteOption = {
      ...routes
        .safeRoute,

      riskProbability,

      riskClass:

        /*
         * Model 4 class represents the threatened road
         * context, not necessarily the alternative route.
         */

        routes
          .safeRoute
          .intersectsFlood
          ? riskClass
          : "LOWER_EXPOSURE",

      routingRecommendation:
        road
          .routing_recommendation,

      reasons:
        road.reasons,
    };

  /* ==================================================== */
  /* ROUTE SELECTION                                      */
  /* ==================================================== */

  const recommendedRouteId =
    unsafe ||
    caution
      ? safeRoute.routeId
      : routes
          .recommendedRouteId;

  return {
    ...routes,

    zoneId:
      result.location
        .zone_id,

    fastestRoute,

    safeRoute,

    recommendedRouteId,

    roadRiskClass:
      riskClass,

    roadRiskProbability:
      riskProbability,

    roadUnsafe:
      unsafe,

    routingRecommendation:
      road
        .routing_recommendation,

    source:
      "model4+route-engine",
  };
}


/* ====================================================== */
/* NORMALIZE ROUTE                                        */
/* ====================================================== */

function normalizeRoute(
  value:
    unknown,

  fallback:
    RouteOption,
): RouteOption {

  const route =
    asRecord(
      value,
    );

  const geometry =
    asRecord(
      route.geometry,
    );

  const coordinates =
    normalizeCoordinates(
      geometry.coordinates ??
      route.coordinates ??
      route.route_coordinates ??
      route.path,
    );

  return {
    routeId:
      stringValue(
        route.route_id,
        route.routeId,
        route.id,
        fallback.routeId,
      ),

    name:
      stringValue(
        route.name,
        route.route_name,
        route.route_type,
        fallback.name,
      ),

    distanceKm:
      numberValue(
        route.distance_km,
        route.distanceKm,
        fallback.distanceKm,
      ),

    durationMin:
      numberValue(
        route.duration_min,
        route.eta_minutes,
        route.travel_time_min,
        route.durationMin,
        fallback.durationMin,
      ),

    status:
      stringValue(
        route.status,
        route.risk_status,
        route.safety_status,
        fallback.status,
      ),

    floodExposure:
      stringValue(
        route.flood_exposure,
        route.exposure,
        fallback.floodExposure,
      ),

    intersectsFlood:
      booleanValue(
        route.intersects_flood,
        route.intersects_flood_zone,
        route.intersectsFlood,
        fallback.intersectsFlood,
      ),

    /*
     * This field is retained for compatibility with the
     * existing RouteAnalyzerPage.
     *
     * It can represent whatever road id the backend marks
     * as the avoided/threatened corridor.
     */

    intersectsR12:
      booleanValue(
        route.intersects_r12,
        route.intersectsR12,
        route.intersects_avoid_road,
        route.intersectsAvoidRoad,
        fallback.intersectsR12,
      ),

    geometry: {
      type:
        "LineString",

      coordinates:
        coordinates.length >
        1
          ? coordinates
          : fallback
              .geometry
              .coordinates,
    },
  };
}


/* ====================================================== */
/* DEMO ROUTE CONTEXT                                     */
/* ====================================================== */

/*
 * Isolated compatibility fallback.
 *
 * These coordinates are not used as a claim of dynamic
 * live routing. App.tsx should pass SafeRouteContext in
 * live mode.
 */

function getDemoRouteContext():
  SafeRouteContext {

  return {
    zoneId:
      "DEMO_ZONE",

    originLat:
      12.9823,

    originLon:
      80.2224,

    destinationLat:
      12.99,

    destinationLon:
      80.214,

    avoidRoadId:
      "R12",
  };
}


/* ====================================================== */
/* DEMO ROUTES                                            */
/* ====================================================== */

export function getDemoRoutes():
  RoutesSnapshot {

  return {
    zoneId:
      "DEMO_ZONE",

    fastestRoute: {
      routeId:
        "FASTEST",

      name:
        "Fastest Route",

      distanceKm:
        2.8,

      durationMin:
        8,

      status:
        "UNSAFE",

      floodExposure:
        "HIGH",

      intersectsFlood:
        true,

      intersectsR12:
        true,

      geometry: {
        type:
          "LineString",

        coordinates: [
          [
            80.2224,
            12.9823,
          ],
          [
            80.2212,
            12.9831,
          ],
          [
            80.2202,
            12.984,
          ],
          [
            80.2188,
            12.9852,
          ],
          [
            80.2171,
            12.9872,
          ],
          [
            80.2155,
            12.9887,
          ],
          [
            80.214,
            12.99,
          ],
        ],
      },
    },

    safeRoute: {
      routeId:
        "FLOOD_SAFE",

      name:
        "Flood-Safe Route",

      distanceKm:
        3.4,

      durationMin:
        11,

      status:
        "RECOMMENDED",

      floodExposure:
        "LOW",

      intersectsFlood:
        false,

      intersectsR12:
        false,

      geometry: {
        type:
          "LineString",

        coordinates: [
          [
            80.2224,
            12.9823,
          ],
          [
            80.2258,
            12.9834,
          ],
          [
            80.227,
            12.9865,
          ],
          [
            80.2245,
            12.9895,
          ],
          [
            80.2201,
            12.9912,
          ],
          [
            80.2167,
            12.991,
          ],
          [
            80.214,
            12.99,
          ],
        ],
      },
    },

    recommendedRouteId:
      "FLOOD_SAFE",

    extraDistanceKm:
      0.6,

    extraDurationMin:
      3,

    roadRiskClass:
      "UNSAFE",

    roadRiskProbability:
      1,

    roadUnsafe:
      true,

    routingRecommendation:
      "Use flood-safe route.",

    source:
      "demo",
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


/* ====================================================== */
/* COORDINATES                                            */
/* ====================================================== */

function normalizeCoordinates(
  value:
    unknown,
): number[][] {

  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .filter(
      (
        item,
      ) =>
        Array.isArray(
          item,
        ) &&
        item.length >=
          2 &&
        Number.isFinite(
          Number(
            item[0],
          ),
        ) &&
        Number.isFinite(
          Number(
            item[1],
          ),
        ),
    )
    .map(
      (
        item,
      ) => [
        Number(
          item[0],
        ),

        Number(
          item[1],
        ),
      ],
    );
}


/* ====================================================== */
/* NUMBER                                                 */
/* ====================================================== */

function numberValue(
  ...values:
    unknown[]
): number {

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


/* ====================================================== */
/* STRING                                                 */
/* ====================================================== */

function stringValue(
  ...values:
    unknown[]
): string {

  for (
    const value
    of values
  ) {
    if (
      typeof value ===
        "string" &&
      value
        .trim()
        .length >
        0
    ) {
      return value;
    }
  }

  return "";
}


/* ====================================================== */
/* BOOLEAN                                                */
/* ====================================================== */

function booleanValue(
  ...values:
    unknown[]
): boolean {

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

    if (
      value ===
      1 ||
      value ===
      "1" ||
      value ===
      "true"
    ) {
      return true;
    }

    if (
      value ===
      0 ||
      value ===
      "0" ||
      value ===
      "false"
    ) {
      return false;
    }
  }

  return false;
}


/* ====================================================== */
/* CLAMP                                                  */
/* ====================================================== */

function clamp01(
  value:
    number,
): number {

  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(
      0,
      value,
    ),
  );
}