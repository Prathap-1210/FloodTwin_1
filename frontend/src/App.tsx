import {
  useEffect,
  useState,
} from "react";

import {
  Capacitor,
} from "@capacitor/core";

import AppShell, {
  type PageKey,
} from "./components/layout/AppShell";

import CommandCenterPage from "./pages/CommandCenterPage";
import FloodMapPage from "./pages/FloodMapPage";
import DrainageIntelligencePage from "./pages/DrainageIntelligencePage";
import RescueEvacuationPage from "./pages/RescueEvacuationPage";
import RouteAnalyzerPage from "./pages/RouteAnalyzerPage";
import ResponsePlannerPage from "./pages/ResponsePlannerPage";
import FieldWorkerPage from "./pages/FieldWorkerPage";
import LoginPage from "./pages/LoginPage";

import {
  useAuth,
} from "./auth/useAuth";

import type {
  ForecastMinute,
} from "./data/demo/forecastData";

import {
  api,
  DATA_MODE,
} from "./services/api";

import {
  getHealth,
} from "./services/healthApi";

import {
  getDemoForecast,
  type ForecastSnapshot,
} from "./services/floodApi";

import {
  getDemoDrainage,
  type DrainageSnapshot,
} from "./services/drainageApi";

import {
  getDemoRisk,
  mapFloodTwinMLRisk,
  type RiskSnapshot,
} from "./services/riskApi";

import {
  getDemoEvacuation,
  mapFloodTwinMLEvacuation,
  type EvacuationSnapshot,
} from "./services/evacuationApi";

import {
  getDemoRoutes,
  getSafeRoutes,
  mapFloodTwinMLRoutes,
  mapSafeRoutes,
  type RoutesSnapshot,
} from "./services/routesApi";

import {
  runFloodTwinML,
  scanFloodLocations,
  type FloodScanLocation,
  type FloodTwinMLResponse,
} from "./services/mlApi";


/* ====================================================== */
/* SMALL HELPERS                                          */
/* ====================================================== */

function clamp(
  value:
    number,

  minimum:
    number,

  maximum:
    number,
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}


function readOptionalNumber(
  value:
    unknown,

  ...keys:
    string[]
): number | null {

  if (
    typeof value !==
      "object" ||
    value ===
      null
  ) {
    return null;
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  for (
    const key
    of keys
  ) {
    const raw =
      record[key];

    if (
      raw ===
        null ||
      raw ===
        undefined ||
      raw ===
        ""
    ) {
      continue;
    }

    const numeric =
      Number(
        raw,
      );

    if (
      Number.isFinite(
        numeric,
      )
    ) {
      return numeric;
    }
  }

  return null;
}


/* ====================================================== */
/* MAP CONTEXT HELPERS                                    */
/* ====================================================== */

type ResolvedShelter = {
  name:
    string;

  latitude:
    number;

  longitude:
    number;

  distanceKm:
    number;

  capacity:
    number | null;
};


function haversineDistanceKm(
  latitudeA:
    number,

  longitudeA:
    number,

  latitudeB:
    number,

  longitudeB:
    number,
) {

  const toRadians =
    (
      value:
        number,
    ) =>
      (
        value *
        Math.PI
      ) /
      180;

  const earthRadiusKm =
    6371.0088;

  const deltaLatitude =
    toRadians(
      latitudeB -
      latitudeA,
    );

  const deltaLongitude =
    toRadians(
      longitudeB -
      longitudeA,
    );

  const latitudeARad =
    toRadians(
      latitudeA,
    );

  const latitudeBRad =
    toRadians(
      latitudeB,
    );

  const a =
    Math.sin(
      deltaLatitude /
      2,
    ) ** 2 +
    Math.cos(
      latitudeARad,
    ) *
    Math.cos(
      latitudeBRad,
    ) *
    Math.sin(
      deltaLongitude /
      2,
    ) ** 2;

  return (
    2 *
    earthRadiusKm *
    Math.atan2(
      Math.sqrt(
        a,
      ),
      Math.sqrt(
        1 -
        a,
      ),
    )
  );
}


async function resolveNearestShelterFromMapContext(
  originLatitude:
    number,

  originLongitude:
    number,
): Promise<
  ResolvedShelter | null
> {

  try {
    const response =
      await api.get<unknown>(
        "/map/context",
      );

    if (
      typeof response.data !==
        "object" ||
      response.data ===
        null
    ) {
      return null;
    }

    const root =
      response.data as Record<
        string,
        unknown
      >;

    const candidateSource =
      root[
        "candidate_shelters"
      ] ??
      root[
        "shelters"
      ];

    if (
      typeof candidateSource !==
        "object" ||
      candidateSource ===
        null
    ) {
      return null;
    }

    const collection =
      candidateSource as Record<
        string,
        unknown
      >;

    if (
      !Array.isArray(
        collection.features,
      )
    ) {
      return null;
    }

    let nearest:
      ResolvedShelter | null =
      null;

    for (
      const rawFeature
      of collection.features
    ) {
      if (
        typeof rawFeature !==
          "object" ||
        rawFeature ===
          null
      ) {
        continue;
      }

      const feature =
        rawFeature as Record<
          string,
          unknown
        >;

      const geometry =
        feature.geometry;

      if (
        typeof geometry !==
          "object" ||
        geometry ===
          null
      ) {
        continue;
      }

      const geometryRecord =
        geometry as Record<
          string,
          unknown
        >;

      if (
        geometryRecord.type !==
          "Point" ||
        !Array.isArray(
          geometryRecord.coordinates,
        ) ||
        geometryRecord
          .coordinates
          .length <
          2
      ) {
        continue;
      }

      const longitude =
        Number(
          geometryRecord
            .coordinates[
              0
            ],
        );

      const latitude =
        Number(
          geometryRecord
            .coordinates[
              1
            ],
        );

      if (
        !Number.isFinite(
          longitude,
        ) ||
        !Number.isFinite(
          latitude,
        )
      ) {
        continue;
      }

      const distanceKm =
        haversineDistanceKm(
          originLatitude,
          originLongitude,
          latitude,
          longitude,
        );

      if (
        nearest &&
        distanceKm >=
          nearest.distanceKm
      ) {
        continue;
      }

      const properties =
        typeof feature.properties ===
          "object" &&
        feature.properties !==
          null
          ? feature.properties as Record<
              string,
              unknown
            >
          : {};

      const capacityValue =
        Number(
          properties.capacity,
        );

      nearest = {
        name:
          String(
            properties.name ??
            properties.id ??
            properties.osmid ??
            "Nearest mapped candidate shelter",
          ),

        latitude,

        longitude,

        distanceKm,

        capacity:
          Number.isFinite(
            capacityValue,
          )
            ? capacityValue
            : null,
      };
    }

    return nearest;
  } catch (
    error
  ) {
    console.error(
      "Unable to resolve shelter coordinates from map context:",
      error,
    );

    return null;
  }
}


/* ====================================================== */
/* APP WORKSPACE                                          */
/* ====================================================== */

function FloodTwinWorkspace() {

  const {
    user,
    signOut,
  } = useAuth();


  /* ==================================================== */
  /* FIELD WORKER                                         */
  /* ==================================================== */

  const isNativeApp =
    Capacitor
      .isNativePlatform();

  const isFieldWorkerView =
    new URLSearchParams(
      window.location.search,
    ).get(
      "view",
    ) ===
    "field";


  /* ==================================================== */
  /* PAGE                                                 */
  /* ==================================================== */

  const [
    activePage,
    setActivePage,
  ] =
    useState<PageKey>(
      "command",
    );


  /* ==================================================== */
  /* FORECAST                                             */
  /* ==================================================== */

  const [
    forecastMinutes,
    setForecastMinutes,
  ] =
    useState<ForecastMinute>(
      60,
    );


  /* ==================================================== */
  /* CUSTOM OPERATOR RAINFALL INPUT                       */
  /* ==================================================== */

  const [
    rainfallMmHr,
    setRainfallMmHr,
  ] =
    useState(
      0,
    );

  const [
    recentRainfallMm,
    setRecentRainfallMm,
  ] =
    useState(
      0,
    );

  const [
    antecedentRainfallMm,
    setAntecedentRainfallMm,
  ] =
    useState(
      0,
    );

  const [
    activeScenario,
    setActiveScenario,
  ] =
    useState<{
      rainfallMmHr:
        number;

      recentRainfallMm:
        number;

      antecedentRainfallMm:
        number;

      revision:
        number;
    } | null>(
      null,
    );


  /* ==================================================== */
  /* CHENNAI SCAN LOCATIONS                               */
  /* ==================================================== */

  const [
    affectedLocations,
    setAffectedLocations,
  ] =
    useState<
      FloodScanLocation[]
    >(
      [],
    );


  /* ==================================================== */
  /* INITIAL FALLBACK DATA                                */
  /* ==================================================== */

  const initialForecast =
    getDemoForecast(
      60,
    );

  const initialDrainage =
    getDemoDrainage(
      initialForecast,
    );

  const initialRisk =
    getDemoRisk(
      initialForecast,
      initialDrainage,
    );

  const initialEvacuation =
    getDemoEvacuation(
      initialForecast,
      initialRisk,
    );

  const initialRoutes =
    getDemoRoutes();


  /* ==================================================== */
  /* FLOOD                                                */
  /* ==================================================== */

  const [
    forecastSnapshot,
    setForecastSnapshot,
  ] =
    useState<ForecastSnapshot>(
      initialForecast,
    );

  const [
    forecastSource,
    setForecastSource,
  ] =
    useState<
      "demo" | "api"
    >(
      "demo",
    );

  const [
    forecastLoading,
    setForecastLoading,
  ] =
    useState(
      false,
    );


  /* ==================================================== */
  /* DRAINAGE                                             */
  /* ==================================================== */

  const [
    drainageSnapshot,
    setDrainageSnapshot,
  ] =
    useState<DrainageSnapshot>(
      initialDrainage,
    );

  const [
    drainageSource,
    setDrainageSource,
  ] =
    useState<
      "demo" | "api"
    >(
      "demo",
    );

  const [
    drainageLoading,
    setDrainageLoading,
  ] =
    useState(
      false,
    );


  /* ==================================================== */
  /* RISK / HOTSPOT                                       */
  /* ==================================================== */

  const [
    riskSnapshot,
    setRiskSnapshot,
  ] =
    useState<RiskSnapshot>(
      initialRisk,
    );


  /* ==================================================== */
  /* EVACUATION                                           */
  /* ==================================================== */

  const [
    evacuationSnapshot,
    setEvacuationSnapshot,
  ] =
    useState<EvacuationSnapshot>(
      initialEvacuation,
    );

  const [
    evacuationSource,
    setEvacuationSource,
  ] =
    useState<
      "demo" | "api"
    >(
      "demo",
    );

  const [
    evacuationLoading,
    setEvacuationLoading,
  ] =
    useState(
      false,
    );


  /* ==================================================== */
  /* ROUTES                                               */
  /* ==================================================== */

  const [
    routesSnapshot,
    setRoutesSnapshot,
  ] =
    useState<RoutesSnapshot>(
      initialRoutes,
    );

  const [
    routesSource,
    setRoutesSource,
  ] =
    useState<
      "demo" | "api"
    >(
      "demo",
    );

  const [
    routesLoading,
    setRoutesLoading,
  ] =
    useState(
      false,
    );


  /* ==================================================== */
  /* COMPLETE SIX-MODEL RESULT                            */
  /* ==================================================== */

  const [
    mlResult,
    setMlResult,
  ] =
    useState<
      FloodTwinMLResponse | null
    >(
      null,
    );


  /* ==================================================== */
  /* DEMO PLAYBACK                                        */
  /* ==================================================== */

  const [
    demoRunning,
    setDemoRunning,
  ] =
    useState(
      false,
    );


  /* ==================================================== */
  /* BACKEND                                              */
  /* ==================================================== */

  const [
    backendOnline,
    setBackendOnline,
  ] =
    useState(
      false,
    );

  const [
    checkingBackend,
    setCheckingBackend,
  ] =
    useState(
      true,
    );


  /* ==================================================== */
  /* RUN CUSTOM FLOODTWIN SCENARIO                        */
  /* ==================================================== */

  const runCustomFloodTwin =
    () => {

      const nextRainfall =
        Math.max(
          0,
          Number.isFinite(
            rainfallMmHr,
          )
            ? rainfallMmHr
            : 0,
        );

      const nextRecent =
        Math.max(
          0,
          Number.isFinite(
            recentRainfallMm,
          )
            ? recentRainfallMm
            : 0,
        );

      const nextAntecedent =
        Math.max(
          0,
          Number.isFinite(
            antecedentRainfallMm,
          )
            ? antecedentRainfallMm
            : 0,
        );

      setActiveScenario({
        rainfallMmHr:
          nextRainfall,

        recentRainfallMm:
          nextRecent,

        antecedentRainfallMm:
          nextAntecedent,

        revision:
          Date.now(),
      });
    };


  /* ==================================================== */
  /* LIVE ML PIPELINE                                     */
  /* ==================================================== */

  useEffect(() => {

    if (
      DATA_MODE !==
      "live" ||
      !activeScenario
    ) {
      return;
    }

    let cancelled =
      false;

    const loadML =
      async () => {

        setForecastLoading(
          true,
        );

        setDrainageLoading(
          true,
        );

        setEvacuationLoading(
          true,
        );

        setRoutesLoading(
          true,
        );

        try {

          /* ============================================ */
          /* FORECAST HORIZON                            */
          /* ============================================ */

          const mlForecastMinutes:
            30 | 60 | 90 | 180 =
            forecastMinutes ===
            0
              ? 30
              : forecastMinutes;


          /* ============================================ */
          /* RAINFALL INPUT                              */
          /* ============================================ */

          const {
            rainfallMmHr:
              activeRainfallMmHr,

            recentRainfallMm:
              activeRecentRainfallMm,

            antecedentRainfallMm:
              activeAntecedentRainfallMm,
          } =
            activeScenario;


          /* ============================================ */
          /* 1. DYNAMIC CHENNAI SCAN                     */
          /* ============================================ */

          const scan =
            await scanFloodLocations(
              mlForecastMinutes,
              activeRainfallMmHr,
              activeRecentRainfallMm,
              activeAntecedentRainfallMm,
            );

          if (
            cancelled
          ) {
            return;
          }

          setAffectedLocations(
            scan
              .affected_locations,
          );

          const topLocation =
            scan
              .affected_locations[
                0
              ];

          if (
            !topLocation
          ) {
            throw new Error(
              "No affected Chennai location was detected for the selected rainfall scenario.",
            );
          }


          /* ============================================ */
          /* MAPPED INFRASTRUCTURE CONTEXT               */
          /* ============================================ */

          const nearestShelter =
            topLocation
              .context
              .nearest_shelter;

          const shelterDistanceKm =
            nearestShelter
              .distance_km;

          if (
            shelterDistanceKm ==
            null
          ) {
            throw new Error(
              "No mapped candidate shelter was found near the selected affected location.",
            );
          }

          /*
           * Some scanner/context-resolver versions include
           * shelter coordinates/capacity while older ones
           * include only name + distance. Read them safely
           * without making them required.
           */

          let shelterLatitude =
            readOptionalNumber(
              nearestShelter,
              "latitude",
              "lat",
            );

          let shelterLongitude =
            readOptionalNumber(
              nearestShelter,
              "longitude",
              "lon",
              "lng",
            );

          let shelterCapacity =
            readOptionalNumber(
              nearestShelter,
              "capacity",
              "shelter_capacity",
            );

          let resolvedShelterName =
            nearestShelter
              .name ??
            "Nearest mapped candidate shelter";

          let resolvedShelterDistanceKm =
            shelterDistanceKm;

          /*
           * The ML scanner already gives shelter distance,
           * but older context payloads may not expose the
           * destination coordinates required by routing.
           *
           * In that case use the existing /api/map/context
           * GeoJSON to resolve the nearest mapped shelter.
           */
          if (
            shelterLatitude ==
              null ||
            shelterLongitude ==
              null
          ) {
            const resolvedShelter =
              await resolveNearestShelterFromMapContext(
                topLocation
                  .latitude,
                topLocation
                  .longitude,
              );

            if (
              resolvedShelter
            ) {
              shelterLatitude =
                resolvedShelter
                  .latitude;

              shelterLongitude =
                resolvedShelter
                  .longitude;

              resolvedShelterName =
                resolvedShelter
                  .name;

              resolvedShelterDistanceKm =
                resolvedShelter
                  .distanceKm;

              shelterCapacity =
                resolvedShelter
                  .capacity;
            }
          }


          /* ============================================ */
          /* 2. DYNAMIC PROTOTYPE OPERATIONAL INPUTS     */
          /* ============================================ */

          /*
           * These are explicitly scenario-derived proxy
           * inputs where authoritative real-time hydraulic
           * or demographic telemetry is not yet available.
           */

          const derivedPopulation =
            Math.max(
              100,
              Math.round(
                120 +
                (
                  topLocation
                    .built_up_percent *
                  5
                ),
              ),
            );

          const vulnerabilityIndex =
            clamp(
              0.3 +
              (
                topLocation
                  .built_up_percent /
                100
              ) *
              0.35 +
              Math.max(
                0,
                8 -
                topLocation
                  .elevation_m,
              ) *
              0.025,
              0.2,
              0.9,
            );

          const capacityPercent =
            clamp(
              42 +
              activeRainfallMmHr *
              0.48 +
              activeRecentRainfallMm *
              0.14 +
              activeAntecedentRainfallMm *
              0.06 +
              Math.min(
                topLocation
                  .distance_to_nearest_drain_m /
                100,
                5,
              ) *
              2,
              25,
              155,
            );

          const normalCapacityPercent =
            clamp(
              52 +
              Math.min(
                topLocation
                  .drain_density_m_per_km2 /
                1000,
                20,
              ),
              45,
              85,
            );

          const upstreamLoadPercent =
            clamp(
              capacityPercent +
              4,
              0,
              160,
            );

          const downstreamLoadPercent =
            clamp(
              capacityPercent -
              13,
              0,
              160,
            );

          const waterRiseRateCmHr =
            Math.max(
              0,
              Number(
                (
                  activeRainfallMmHr *
                  0.18 +
                  activeRecentRainfallMm *
                  0.035
                ).toFixed(
                  2,
                ),
              ),
            );

          const vulnerableCount =
            Math.min(
              derivedPopulation,
              Math.round(
                derivedPopulation *
                vulnerabilityIndex *
                0.3,
              ),
            );

          const majorRoadAffected =
            topLocation
              .risk ===
              "SEVERE" ||
            topLocation
              .risk ===
              "HIGH";


          /* ============================================ */
          /* 3. RUN MODELS 1 -> 6                       */
          /* ============================================ */

          const result =
            await runFloodTwinML({
              /* ---------------------------------------- */
              /* LOCATION                                 */
              /* ---------------------------------------- */

              zone_id:
                topLocation
                  .location_id,

              location_name:
                topLocation
                  .zone ??
                topLocation
                  .ward ??
                topLocation
                  .location_id,

              latitude:
                topLocation
                  .latitude,

              longitude:
                topLocation
                  .longitude,

              forecast_minutes:
                mlForecastMinutes,


              /* ---------------------------------------- */
              /* RAINFALL                                 */
              /* ---------------------------------------- */

              rainfall_mm_hr:
                activeRainfallMmHr,

              recent_rainfall_mm:
                activeRecentRainfallMm,

              antecedent_rainfall_mm:
                activeAntecedentRainfallMm,


              /* ---------------------------------------- */
              /* MODEL 1 — GIS                            */
              /* ---------------------------------------- */

              elevation_m:
                topLocation
                  .elevation_m,

              slope_deg:
                topLocation
                  .slope_deg,

              built_up_percent:
                topLocation
                  .built_up_percent,

              distance_to_nearest_drain_m:
                topLocation
                  .distance_to_nearest_drain_m,

              drain_density_m_per_km2:
                topLocation
                  .drain_density_m_per_km2,

              previous_depth_cm:
                topLocation
                  .previous_depth_cm,


              /* ---------------------------------------- */
              /* MODEL 2 — DRAINAGE                       */
              /* ---------------------------------------- */

              drain_id:
                topLocation
                  .context
                  .nearest_drain
                  .drain_id ||
                "UNKNOWN_DRAIN",

              /*
               * Prototype hydraulic fallback.
               * Replace when an authoritative hydraulic
               * geometry/telemetry source is connected.
               */
              c2_diameter_m:
                0.75,

              capacity_percent:
                Number(
                  capacityPercent
                    .toFixed(
                      2,
                    ),
                ),

              upstream_load_percent:
                Number(
                  upstreamLoadPercent
                    .toFixed(
                      2,
                    ),
                ),

              downstream_load_percent:
                Number(
                  downstreamLoadPercent
                    .toFixed(
                      2,
                    ),
                ),

              normal_capacity_percent:
                Number(
                  normalCapacityPercent
                    .toFixed(
                      2,
                    ),
                ),


              /* ---------------------------------------- */
              /* MODEL 3 — HOTSPOT                        */
              /* ---------------------------------------- */

              people_at_risk:
                derivedPopulation,

              hospital_nearby:
                topLocation
                  .context
                  .nearest_hospital
                  .nearby,

              major_road_affected:
                majorRoadAffected,

              water_level_trend:
                activeRainfallMmHr >=
                20
                  ? "RISING"
                  : "STABLE",

              vulnerable_count:
                vulnerableCount,


              /* ---------------------------------------- */
              /* MODEL 4 — ROAD RISK                      */
              /* ---------------------------------------- */

              /*
               * The selected top scan location is itself
               * treated as the hotspot origin.
               */
              distance_to_hotspot_m:
                0,

              road_elevation_m:
                topLocation
                  .elevation_m,

              /*
               * Prototype road-type fallback until the
               * selected road edge is returned to App.tsx.
               */
              road_type:
                "residential",


              /* ---------------------------------------- */
              /* MODEL 5 — EVACUATION                     */
              /* ---------------------------------------- */

              population:
                derivedPopulation,

              water_rise_rate_cm_hr:
                waterRiseRateCmHr,

              distance_to_shelter_km:
                resolvedShelterDistanceKm,

              vulnerability_index:
                Number(
                  vulnerabilityIndex
                    .toFixed(
                      3,
                    ),
                ),


              /* ---------------------------------------- */
              /* MODEL 6 — DEFAULT RESPONSE PLAN          */
              /* ---------------------------------------- */

              clear_drain:
                1,

              deploy_pump:
                1,

              close_road:
                1,

              evacuate:
                1,

              pump_capacity_index:
                0.8,

              response_delay_min:
                20,
            });

          if (
            cancelled
          ) {
            return;
          }


          /* ============================================ */
          /* MODEL 1 RESULT                              */
          /* ============================================ */

          const floodPrediction =
            result
              .flood
              .predictions
              .find(
                (
                  prediction,
                ) =>
                  prediction
                    .forecast_minutes ===
                  mlForecastMinutes,
              );

          if (
            !floodPrediction
          ) {
            throw new Error(
              "Model 1 returned no prediction for the selected forecast horizon.",
            );
          }


          /* ============================================ */
          /* MODEL 2 -> DRAINAGE SNAPSHOT               */
          /* ============================================ */

          const nextDrainage:
            DrainageSnapshot = {
              drainId:
                result
                  .drainage
                  .drain_id,

              status:
                result
                  .drainage
                  .status,

              loadPercent:
                result
                  .drainage
                  .hydraulic_context
                  .capacity_percent,

              anomalyProbability:
                result
                  .drainage
                  .class_probabilities[
                    "PROBABLE_BLOCKAGE"
                  ] ??
                0,

              priority:
                result
                  .hotspot
                  .response_priority,

              confidence:
                result
                  .drainage
                  .confidence ??
                0,

              likelyCause:
                result
                  .drainage
                  .explanation,

              recommendedAction:
                result
                  .drainage
                  .recommended_action,
            };


          /* ============================================ */
          /* MODEL 1 + MODEL 2 -> FORECAST SNAPSHOT      */
          /* ============================================ */

          const fallbackForecast =
            getDemoForecast(
              forecastMinutes,
            );

          const nextForecast:
            ForecastSnapshot = {
              ...fallbackForecast,

              depth:
                floodPrediction
                  .predicted_depth_cm,

              probability:
                floodPrediction
                  .flood_probability,

              risk:
                floodPrediction
                  .risk,

              peopleAtRisk:
                result
                  .evacuation
                  .population,

              drainStatus:
                result
                  .summary
                  .drain_status,

              drainLoadPercent:
                result
                  .drainage
                  .hydraulic_context
                  .capacity_percent,

              drainAnomalyProbability:
                result
                  .drainage
                  .class_probabilities[
                    "PROBABLE_BLOCKAGE"
                  ] ??
                0,

              drainPriority:
                result
                  .summary
                  .response_priority,

              drainConfidence:
                result
                  .drainage
                  .confidence ??
                0,

              /*
               * This polygon is a predicted affected-area
               * envelope derived from scan bounds.
               * It is not claimed as an exact inundation
               * boundary.
               */
              polygon:
                scan.bounds
                  ? [
                      [
                        [
                          scan.bounds
                            .west,
                          scan.bounds
                            .south,
                        ],
                        [
                          scan.bounds
                            .east,
                          scan.bounds
                            .south,
                        ],
                        [
                          scan.bounds
                            .east,
                          scan.bounds
                            .north,
                        ],
                        [
                          scan.bounds
                            .west,
                          scan.bounds
                            .north,
                        ],
                        [
                          scan.bounds
                            .west,
                          scan.bounds
                            .south,
                        ],
                      ],
                    ]
                  : fallbackForecast
                      .polygon,
            };


          /* ============================================ */
          /* MODEL 3 + MODEL 4 + MODEL 5 -> RISK         */
          /* ============================================ */

          const nextRisk =
            mapFloodTwinMLRisk(
              result,
            );


          /* ============================================ */
          /* MODEL 5 + MAPPED SHELTER -> EVACUATION      */
          /* ============================================ */

          const nextEvacuation =
            mapFloodTwinMLEvacuation(
              result,
              {
                primaryShelterName:
                  resolvedShelterName,

                primaryShelterDistanceKm:
                  resolvedShelterDistanceKm,

                /*
                 * Used only when returned by the current
                 * infrastructure resolver.
                 */
                primaryShelterCapacity:
                  shelterCapacity,
              },
            );


          /* ============================================ */
          /* OSM ROUTING + MODEL 4                       */
          /* ============================================ */

          let nextRoutes =
            getDemoRoutes();

          let nextRoutesSource:
            "demo" | "api" =
            "demo";

          /*
           * Do not silently route using the old fixed
           * Velachery coordinates. The live route engine
           * is called only when the mapped shelter gives
           * an actual coordinate pair.
           */
          if (
            shelterLatitude !=
              null &&
            shelterLongitude !=
              null
          ) {
            try {
              const routeResponse =
                await getSafeRoutes(
                  nextForecast,
                  nextEvacuation,
                  {
                    zoneId:
                      result
                        .location
                        .zone_id,

                    originLat:
                      topLocation
                        .latitude,

                    originLon:
                      topLocation
                        .longitude,

                    destinationLat:
                      shelterLatitude,

                    destinationLon:
                      shelterLongitude,

                    avoidRoadId:
                      null,
                  },
                );

              if (
                cancelled
              ) {
                return;
              }

              const routeEngineSnapshot =
                mapSafeRoutes(
                  routeResponse,
                );

              nextRoutes =
                mapFloodTwinMLRoutes(
                  result,
                  routeEngineSnapshot,
                );

              nextRoutesSource =
                "api";
            } catch (
              routeError
            ) {
              console.error(
                "Dynamic route engine failed; keeping clearly marked demo route fallback:",
                routeError,
              );
            }
          } else {
            console.warn(
              "Nearest shelter coordinates are unavailable in the current scan response. Live routing was not called with fabricated coordinates.",
            );
          }


          if (
            cancelled
          ) {
            return;
          }


          /* ============================================ */
          /* COMMIT COMPLETE PIPELINE                    */
          /* ============================================ */

          setMlResult(
            result,
          );

          setForecastSnapshot(
            nextForecast,
          );

          setForecastSource(
            "api",
          );

          setDrainageSnapshot(
            nextDrainage,
          );

          setDrainageSource(
            "api",
          );

          setRiskSnapshot(
            nextRisk,
          );

          setEvacuationSnapshot(
            nextEvacuation,
          );

          setEvacuationSource(
            "api",
          );

          setRoutesSnapshot(
            nextRoutes,
          );

          setRoutesSource(
            nextRoutesSource,
          );

          console.log(
            "FloodTwin dynamic scan:",
            scan,
          );

          console.log(
            "FloodTwin Models 1-6:",
            result,
          );

          console.log(
            "FloodTwin active location:",
            topLocation,
          );

        } catch (
          error
        ) {

          if (
            cancelled
          ) {
            return;
          }

          console.error(
            "FloodTwin ML pipeline failed. Reverting UI to safe demo fallback:",
            error,
          );

          setMlResult(
            null,
          );

          setAffectedLocations(
            [],
          );

          const demoForecast =
            getDemoForecast(
              forecastMinutes,
            );

          const demoDrainage =
            getDemoDrainage(
              demoForecast,
            );

          const demoRisk =
            getDemoRisk(
              demoForecast,
              demoDrainage,
            );

          const demoEvacuation =
            getDemoEvacuation(
              demoForecast,
              demoRisk,
            );

          setForecastSnapshot(
            demoForecast,
          );

          setForecastSource(
            "demo",
          );

          setDrainageSnapshot(
            demoDrainage,
          );

          setDrainageSource(
            "demo",
          );

          setRiskSnapshot(
            demoRisk,
          );

          setEvacuationSnapshot(
            demoEvacuation,
          );

          setEvacuationSource(
            "demo",
          );

          setRoutesSnapshot(
            getDemoRoutes(),
          );

          setRoutesSource(
            "demo",
          );

        } finally {

          if (
            !cancelled
          ) {
            setForecastLoading(
              false,
            );

            setDrainageLoading(
              false,
            );

            setEvacuationLoading(
              false,
            );

            setRoutesLoading(
              false,
            );
          }
        }
      };

    void loadML();

    return () => {
      cancelled =
        true;
    };

  }, [
    activeScenario,
    forecastMinutes,
  ]);


  /* ==================================================== */
  /* DEMO / FALLBACK MODE                                 */
  /* ==================================================== */

  useEffect(() => {

    if (
      DATA_MODE ===
      "live"
    ) {
      return;
    }

    const demoForecast =
      getDemoForecast(
        forecastMinutes,
      );

    const demoDrainage =
      getDemoDrainage(
        demoForecast,
      );

    const demoRisk =
      getDemoRisk(
        demoForecast,
        demoDrainage,
      );

    const demoEvacuation =
      getDemoEvacuation(
        demoForecast,
        demoRisk,
      );

    setMlResult(
      null,
    );

    setAffectedLocations(
      [],
    );

    setForecastSnapshot(
      demoForecast,
    );

    setForecastSource(
      "demo",
    );

    setForecastLoading(
      false,
    );

    setDrainageSnapshot(
      demoDrainage,
    );

    setDrainageSource(
      "demo",
    );

    setDrainageLoading(
      false,
    );

    setRiskSnapshot(
      demoRisk,
    );

    setEvacuationSnapshot(
      demoEvacuation,
    );

    setEvacuationSource(
      "demo",
    );

    setEvacuationLoading(
      false,
    );

    setRoutesSnapshot(
      getDemoRoutes(),
    );

    setRoutesSource(
      "demo",
    );

    setRoutesLoading(
      false,
    );

  }, [
    forecastMinutes,
  ]);


  /* ==================================================== */
  /* DEMO AUTOPLAY                                        */
  /* ==================================================== */

  useEffect(() => {

    if (
      !demoRunning
    ) {
      return;
    }

    const sequence:
      ForecastMinute[] = [
        0,
        30,
        60,
        90,
        180,
      ];

    let index =
      0;

    const timer =
      window.setInterval(
        () => {

          index +=
            1;

          if (
            index >=
            sequence.length
          ) {
            window.clearInterval(
              timer,
            );

            setDemoRunning(
              false,
            );

            return;
          }

          setForecastMinutes(
            sequence[
              index
            ],
          );

        },
        1800,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };

  }, [
    demoRunning,
  ]);


  /* ==================================================== */
  /* START DEMO                                           */
  /* ==================================================== */

  const startDemo =
    () => {

      if (
        demoRunning
      ) {
        return;
      }

      setActivePage(
        "command",
      );

      setForecastMinutes(
        0,
      );

      setDemoRunning(
        true,
      );
    };


  /* ==================================================== */
  /* HEALTH                                               */
  /* ==================================================== */

  useEffect(() => {

    let cancelled =
      false;

    getHealth()
      .then(
        () => {
          if (
            !cancelled
          ) {
            setBackendOnline(
              true,
            );
          }
        },
      )
      .catch(
        () => {
          if (
            !cancelled
          ) {
            setBackendOnline(
              false,
            );
          }
        },
      )
      .finally(
        () => {
          if (
            !cancelled
          ) {
            setCheckingBackend(
              false,
            );
          }
        },
      );

    return () => {
      cancelled =
        true;
    };

  }, []);


  /* ==================================================== */
  /* NATIVE / FIELD WORKER                                */
  /* ==================================================== */

  if (
    isNativeApp ||
    isFieldWorkerView
  ) {
    return (
      <FieldWorkerPage />
    );
  }


  /* ==================================================== */
  /* APPLICATION                                          */
  /* ==================================================== */

  return (
    <AppShell
      activePage={
        activePage
      }
      onNavigate={
        setActivePage
      }
      backendOnline={
        backendOnline
      }
      checkingBackend={
        checkingBackend
      }
      userEmail={
        user
          ?.email ??
        "Operator"
      }
      onSignOut={() => {
        void signOut();
      }}
    >

      {/* ================================================= */}
      {/* COMMAND CENTER                                    */}
      {/* ================================================= */}

      {activePage ===
        "command" && (
        <CommandCenterPage
          forecastMinutes={
            forecastMinutes
          }
          setForecastMinutes={
            setForecastMinutes
          }
          forecastSnapshot={
            forecastSnapshot
          }
          forecastSource={
            forecastSource
          }
          forecastLoading={
            forecastLoading
          }
          rainfallMmHr={
            rainfallMmHr
          }
          setRainfallMmHr={
            setRainfallMmHr
          }
          recentRainfallMm={
            recentRainfallMm
          }
          setRecentRainfallMm={
            setRecentRainfallMm
          }
          antecedentRainfallMm={
            antecedentRainfallMm
          }
          setAntecedentRainfallMm={
            setAntecedentRainfallMm
          }
          onRunFloodTwin={
            runCustomFloodTwin
          }
          affectedLocations={
            affectedLocations
          }
          demoRunning={
            demoRunning
          }
          onStartDemo={
            startDemo
          }
          mlResult={
            mlResult
          }
          onOpenFlood={() => {
            setActivePage(
              "flood",
            );
          }}
          onOpenDrainage={() => {
            setActivePage(
              "drainage",
            );
          }}
          onOpenRescue={() => {
            setActivePage(
              "rescue",
            );
          }}
          onOpenResponse={() => {
            setActivePage(
              "response",
            );
          }}
        />
      )}


      {/* ================================================= */}
      {/* FLOOD MAP                                         */}
      {/* ================================================= */}

      {activePage ===
        "flood" && (
        <FloodMapPage
          forecastMinutes={
            forecastMinutes
          }
          setForecastMinutes={
            setForecastMinutes
          }
          forecastSnapshot={
            forecastSnapshot
          }
          forecastSource={
            forecastSource
          }
          forecastLoading={
            forecastLoading
          }
          affectedLocations={
            affectedLocations
          }
          selectedLocationId={
            mlResult
              ?.location
              .zone_id ??
            null
          }
          onOpenDrainage={() => {
            setActivePage(
              "drainage",
            );
          }}
          onOpenRescue={() => {
            setActivePage(
              "rescue",
            );
          }}
        />
      )}


      {/* ================================================= */}
      {/* DRAINAGE                                          */}
      {/* ================================================= */}

      {activePage ===
        "drainage" && (
        <DrainageIntelligencePage
          forecastMinutes={
            forecastMinutes
          }
          forecastSnapshot={
            forecastSnapshot
          }
          drainageSnapshot={
            drainageSnapshot
          }
          drainageSource={
            drainageSource
          }
          drainageLoading={
            drainageLoading
          }
          onBack={() => {
            setActivePage(
              "command",
            );
          }}
        />
      )}


      {/* ================================================= */}
      {/* RESCUE                                            */}
      {/* ================================================= */}

      {activePage ===
        "rescue" && (
        <RescueEvacuationPage
          forecastMinutes={
            forecastMinutes
          }
          forecastSnapshot={
            forecastSnapshot
          }
          riskSnapshot={
            riskSnapshot
          }
          evacuationSnapshot={
            evacuationSnapshot
          }
          evacuationSource={
            evacuationSource
          }
          evacuationLoading={
            evacuationLoading
          }
          onOpenRoutes={() => {
            setActivePage(
              "routes",
            );
          }}
          onOpenFlood={() => {
            setActivePage(
              "flood",
            );
          }}
        />
      )}


      {/* ================================================= */}
      {/* ROUTES                                            */}
      {/* ================================================= */}

      {activePage ===
        "routes" && (
        <RouteAnalyzerPage
          forecastMinutes={
            forecastMinutes
          }
          forecastSnapshot={
            forecastSnapshot
          }
          routesSnapshot={
            routesSnapshot
          }
          routesSource={
            routesSource
          }
          routesLoading={
            routesLoading
          }
          evacuationSnapshot={
            evacuationSnapshot
          }
          mlResult={
            mlResult
          }
          onOpenFlood={() => {
            setActivePage(
              "flood",
            );
          }}
          onOpenRescue={() => {
            setActivePage(
              "rescue",
            );
          }}
          onOpenResponse={() => {
            setActivePage(
              "response",
            );
          }}
        />
      )}


      {/* ================================================= */}
      {/* RESPONSE                                          */}
      {/* ================================================= */}

      {activePage ===
        "response" && (
        <ResponsePlannerPage
          mlResult={
            mlResult
          }
          forecastMinutes={
            forecastMinutes
          }
          forecastSnapshot={
            forecastSnapshot
          }
          drainageSnapshot={
            drainageSnapshot
          }
          riskSnapshot={
            riskSnapshot
          }
          evacuationSnapshot={
            evacuationSnapshot
          }
          onOpenFlood={() => {
            setActivePage(
              "flood",
            );
          }}
          onOpenDrainage={() => {
            setActivePage(
              "drainage",
            );
          }}
          onOpenRescue={() => {
            setActivePage(
              "rescue",
            );
          }}
          onOpenRoutes={() => {
            setActivePage(
              "routes",
            );
          }}
        />
      )}

    </AppShell>
  );
}


/* ====================================================== */
/* AUTH                                                   */
/* ====================================================== */

function App() {

  const {
    loading,
    session,
  } =
    useAuth();

  if (
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020915] text-sm text-slate-400">
        Restoring secure session...
      </main>
    );
  }

  if (
    !session
  ) {
    return (
      <LoginPage />
    );
  }

  return (
    <FloodTwinWorkspace />
  );
}


export default App;
