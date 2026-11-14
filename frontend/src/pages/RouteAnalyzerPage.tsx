import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  LngLatBounds,
  Map as MapLibreMap,
  NavigationControl,
  Popup,
} from "maplibre-gl";

import type {
  GeoJSONSource,
} from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  Route,
  ShieldCheck,
} from "lucide-react";

import type {
  ForecastMinute,
} from "../data/demo/forecastData";

import type {
  ForecastSnapshot,
} from "../services/floodApi";

import type {
  EvacuationSnapshot,
} from "../services/evacuationApi";

import type {
  FloodTwinMLResponse,
} from "../services/mlApi";

import type {
  RouteOption,
  RoutesSnapshot,
} from "../services/routesApi";


/* ====================================================== */
/* PROPS                                                  */
/* ====================================================== */

type Props = {
  forecastMinutes:
    ForecastMinute;

  forecastSnapshot:
    ForecastSnapshot;

  routesSnapshot:
    RoutesSnapshot;

  routesSource:
    "demo" | "api";

  routesLoading:
    boolean;

  evacuationSnapshot?:
    EvacuationSnapshot;

  mlResult?:
    FloodTwinMLResponse | null;

  onOpenFlood?:
    () => void;

  onOpenRescue?:
    () => void;

  onOpenResponse:
    () => void;
};


/* ====================================================== */
/* PAGE                                                   */
/* ====================================================== */

function RouteAnalyzerPage({
  forecastMinutes,
  forecastSnapshot,
  routesSnapshot,
  routesSource,
  routesLoading,
  evacuationSnapshot,
  mlResult = null,
  onOpenFlood,
  onOpenRescue,
  onOpenResponse,
}: Props) {

  const fastest =
    routesSnapshot
      .fastestRoute;

  const safe =
    routesSnapshot
      .safeRoute;

  const roadRiskClass =
    mlResult
      ?.road
      .risk_class ??
    routesSnapshot
      .roadRiskClass ??
    "UNKNOWN";

  const roadRiskProbability =
    mlResult
      ?.road
      .road_risk_probability ??
    routesSnapshot
      .roadRiskProbability;

  const roadRiskPercent =
    roadRiskProbability !=
    null
      ? Math.round(
          clamp01(
            roadRiskProbability,
          ) *
          100,
        )
      : null;

  const roadUnsafe =
    mlResult
      ?.road
      .unsafe ??
    routesSnapshot
      .roadUnsafe ??
    roadRiskClass ===
      "UNSAFE";

  const safeRecommended =
    routesSnapshot
      .recommendedRouteId ===
    safe.routeId;

  const selectedRoute =
    safeRecommended
      ? safe
      : fastest;

  const originLabel =
    mlResult
      ?.location
      .zone_id ??
    routesSnapshot
      .zoneId ??
    "Affected Location";

  const destinationLabel =
    evacuationSnapshot
      ?.primaryCamp ||
    "Mapped Candidate Shelter";

  const routeRecommendation =
    mlResult
      ?.road
      .routing_recommendation ??
    routesSnapshot
      .routingRecommendation ??
    (
      roadUnsafe
        ? "Avoid high-risk road exposure and use the lower-exposure route."
        : "Use the lowest-risk viable route."
    );

  const fastestDanger =
    fastest
      .status ===
      "UNSAFE" ||
    fastest
      .intersectsFlood ||
    roadUnsafe;


  return (
    <div className="space-y-5">

      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <section className="glass-panel rounded-[28px] px-6 py-5">

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

          <div>

            <p className="text-xs uppercase tracking-[0.2em] text-[#4da3ff]">
              Model 4 • Mobility Intelligence
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Route Analyzer
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Compare road-network geometry with
              future-flood-aware Model 4 risk.
            </p>

          </div>


          <div className="flex flex-wrap gap-3">

            <span
              className={`
                rounded-full
                border
                px-4
                py-2
                text-xs
                font-semibold
                ${
                  roadRiskClass ===
                  "UNSAFE"
                    ? "border-red-400/20 bg-red-500/10 text-red-300"
                    : roadRiskClass ===
                        "CAUTION"
                      ? "border-orange-400/20 bg-orange-500/10 text-orange-300"
                      : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                }
              `}
            >
              Model 4 • {roadRiskClass}
              {roadRiskPercent !=
              null
                ? ` • ${roadRiskPercent}%`
                : ""}
            </span>


            <span
              className={`
                rounded-full
                border
                px-4
                py-2
                text-xs
                uppercase
                tracking-[0.1em]
                ${
                  routesSource ===
                  "api"
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-400/20 bg-amber-500/10 text-amber-300"
                }
              `}
            >
              {routesLoading
                ? "Generating Routes..."
                : routesSource ===
                    "api"
                  ? "Live Route Engine"
                  : mlResult
                    ? "Model 4 Live • Geometry Fallback"
                    : "Demo Route Geometry"}
            </span>

          </div>

        </div>

      </section>


      {/* ================================================= */}
      {/* MODEL 4 STATUS                                    */}
      {/* ================================================= */}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        <MetricCard
          icon={
            <Navigation
              size={20}
            />
          }
          title="Road Risk Class"
          value={
            roadRiskClass
          }
          subtitle="Model 4 future road assessment"
          danger={
            roadUnsafe
          }
        />

        <MetricCard
          icon={
            <AlertTriangle
              size={20}
            />
          }
          title="Risk Probability"
          value={
            roadRiskPercent !=
            null
              ? `${roadRiskPercent}%`
              : "Pending"
          }
          subtitle={`Forecast ${
            forecastMinutes ===
            0
              ? "NOW"
              : `+${forecastMinutes} min`
          }`}
          danger={
            roadRiskPercent !=
              null &&
            roadRiskPercent >=
              70
          }
        />

        <MetricCard
          icon={
            <Clock3
              size={20}
            />
          }
          title="Safe Route Time"
          value={`${formatNumber(
            safe.durationMin,
            1,
          )} min`}
          subtitle={`+${formatNumber(
            routesSnapshot
              .extraDurationMin,
            1,
          )} min vs fastest`}
        />

        <MetricCard
          icon={
            <Route
              size={20}
            />
          }
          title="Selected Route"
          value={
            selectedRoute
              .name
          }
          subtitle={
            safeRecommended
              ? "Lower-exposure route recommended"
              : "Fastest route currently viable"
          }
        />

      </section>


      {/* ================================================= */}
      {/* MISSION                                           */}
      {/* ================================================= */}

      <section className="glass-panel rounded-[28px] p-5">

        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">

          <MissionPoint
            icon={
              <MapPin
                size={20}
              />
            }
            label="Evacuation Origin"
            title={
              originLabel
            }
            subtitle={`${forecastSnapshot.peopleAtRisk} people in exposure context`}
            danger
          />


          <div className="hidden justify-center lg:flex">

            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#007cf7]/15 bg-[#007cf7]/10 text-[#4da3ff]">
              <ArrowRight
                size={20}
              />
            </div>

          </div>


          <MissionPoint
            icon={
              <ShieldCheck
                size={20}
              />
            }
            label="Evacuation Destination"
            title={
              destinationLabel
            }
            subtitle="Nearest mapped candidate shelter used for routing"
          />

        </div>

      </section>


      {/* ================================================= */}
      {/* ROUTE COMPARISON                                  */}
      {/* ================================================= */}

      <section className="grid gap-4 xl:grid-cols-2">

        <RouteCard
          route={
            fastest
          }
          title="Fastest Route"
          danger={
            fastestDanger
          }
          recommended={
            routesSnapshot
              .recommendedRouteId ===
            fastest.routeId
          }
        />

        <RouteCard
          route={
            safe
          }
          title="Flood-Aware Route"
          recommended={
            safeRecommended
          }
        />

      </section>


      {/* ================================================= */}
      {/* MAP + ANALYSIS                                    */}
      {/* ================================================= */}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">

        <div className="glass-panel min-w-0 rounded-[28px] p-4">

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Dynamic Route Map
              </p>

              <h3 className="mt-1 text-lg font-semibold">
                {originLabel}
                {" → "}
                {destinationLabel}
              </h3>

            </div>


            <div className="flex gap-4 text-xs">

              <Legend
                color="#ff3b5c"
                label="Fastest"
              />

              <Legend
                color="#22c55e"
                label="Flood-Aware"
              />

            </div>

          </div>


          <RouteMap
            forecastSnapshot={
              forecastSnapshot
            }
            routesSnapshot={
              routesSnapshot
            }
          />

        </div>


        <aside className="glass-panel rounded-[28px] p-5">

          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Model 4 Decision
          </p>

          <h3 className="mt-1 text-lg font-semibold">
            Safety Analysis
          </h3>


          <div
            className={`
              mt-5
              rounded-2xl
              border
              p-4
              ${
                roadUnsafe
                  ? "border-red-400/15 bg-red-500/[0.06]"
                  : "border-emerald-400/15 bg-emerald-500/[0.06]"
              }
            `}
          >

            <div className="flex items-start gap-3">

              {roadUnsafe ? (
                <AlertTriangle
                  size={21}
                  className="mt-0.5 text-red-300"
                />
              ) : (
                <CheckCircle2
                  size={21}
                  className="mt-0.5 text-emerald-300"
                />
              )}

              <div>

                <p
                  className={`
                    text-sm
                    font-semibold
                    ${
                      roadUnsafe
                        ? "text-red-200"
                        : "text-emerald-200"
                    }
                  `}
                >
                  {roadUnsafe
                    ? "Unsafe road exposure predicted"
                    : "Road context currently viable"}
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {routeRecommendation}
                </p>

              </div>

            </div>

          </div>


          <div className="mt-5 space-y-1">

            <AnalysisRow
              title="Forecast"
              value={
                forecastMinutes ===
                0
                  ? "NOW"
                  : `+${forecastMinutes} min`
              }
            />

            <AnalysisRow
              title="Flood Risk"
              value={
                forecastSnapshot
                  .risk
              }
              warning={
                forecastSnapshot
                  .risk ===
                  "HIGH" ||
                forecastSnapshot
                  .risk ===
                  "SEVERE"
              }
            />

            <AnalysisRow
              title="Flood Depth"
              value={`${formatNumber(
                forecastSnapshot
                  .depth,
                2,
              )} cm`}
              warning={
                forecastSnapshot
                  .depth >=
                40
              }
            />

            <AnalysisRow
              title="Model 4"
              value={
                roadRiskClass
              }
              warning={
                roadUnsafe
              }
            />

            <AnalysisRow
              title="Fastest Route"
              value={
                formatStatus(
                  fastest.status,
                )
              }
              warning={
                fastestDanger
              }
            />

            <AnalysisRow
              title="Safe Route"
              value={
                formatStatus(
                  safe.status,
                )
              }
            />

            <AnalysisRow
              title="Route Source"
              value={
                routesSource ===
                "api"
                  ? "Live road engine"
                  : "Fallback geometry"
              }
              warning={
                routesSource !==
                "api"
              }
            />

          </div>


          {routesSource !==
            "api" &&
            mlResult && (
            <div className="mt-5 rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] p-4">

              <p className="text-xs font-medium text-amber-200">
                Model 4 is live, but route geometry is using fallback data.
              </p>

              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                This means ML road-risk inference succeeded,
                while the road-routing backend could not
                generate a dynamic path for the current
                origin/destination.
              </p>

            </div>
          )}


          <button
            type="button"
            onClick={
              onOpenResponse
            }
            className="
              mt-5
              w-full
              rounded-2xl
              border
              border-[#007cf7]/30
              bg-[#007cf7]/20
              px-5
              py-3
              text-sm
              text-[#8cc7ff]
              hover:bg-[#007cf7]/30
            "
          >
            Open Response Planner
          </button>


          {onOpenFlood && (
            <button
              type="button"
              onClick={
                onOpenFlood
              }
              className="
                mt-3
                w-full
                rounded-2xl
                border
                border-white/10
                bg-white/[0.04]
                px-5
                py-3
                text-sm
                text-slate-300
              "
            >
              Review Flood Map
            </button>
          )}


          {onOpenRescue && (
            <button
              type="button"
              onClick={
                onOpenRescue
              }
              className="
                mt-3
                w-full
                rounded-2xl
                border
                border-white/10
                bg-white/[0.04]
                px-5
                py-3
                text-sm
                text-slate-300
              "
            >
              Rescue & Evacuation
            </button>
          )}

        </aside>

      </section>

    </div>
  );
}


/* ====================================================== */
/* ROUTE MAP                                              */
/* ====================================================== */

function RouteMap({
  forecastSnapshot,
  routesSnapshot,
}: {
  forecastSnapshot:
    ForecastSnapshot;

  routesSnapshot:
    RoutesSnapshot;
}) {

  const containerRef =
    useRef<
      HTMLDivElement | null
    >(
      null,
    );

  const mapRef =
    useRef<
      MapLibreMap | null
    >(
      null,
    );

  const routesRef =
    useRef(
      routesSnapshot,
    );

  const forecastRef =
    useRef(
      forecastSnapshot,
    );

  const [
    mapError,
    setMapError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  routesRef.current =
    routesSnapshot;

  forecastRef.current =
    forecastSnapshot;


  useEffect(() => {

    const container =
      containerRef.current;

    if (
      !container ||
      mapRef.current
    ) {
      return;
    }

    try {

      const map =
        new MapLibreMap({
          container,

          style: {
            version:
              8,

            sources: {
              osm: {
                type:
                  "raster",

                tiles: [
                  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                ],

                tileSize:
                  256,

                attribution:
                  "© OpenStreetMap contributors",
              },
            },

            layers: [
              {
                id:
                  "osm",

                type:
                  "raster",

                source:
                  "osm",

                paint: {
                  "raster-opacity":
                    0.82,

                  "raster-brightness-min":
                    0.08,

                  "raster-brightness-max":
                    0.82,

                  "raster-saturation":
                    -0.3,
                },
              },
            ],
          },

          center: [
            80.2707,
            13.0827,
          ],

          zoom:
            10.5,
        });

      mapRef.current =
        map;

      map.addControl(
        new NavigationControl({
          showZoom:
            true,

          showCompass:
            false,
        }),

        "top-right",
      );


      map.on(
        "load",
        () => {

          map.addSource(
            "route-flood",
            {
              type:
                "geojson",

              data:
                buildFloodGeoJson(
                  forecastRef
                    .current,
                ) as any,
            },
          );

          map.addLayer({
            id:
              "route-flood-outline",

            type:
              "line",

            source:
              "route-flood",

            paint: {
              "line-color":
                "#4da3ff",

              "line-width":
                2,

              "line-opacity":
                0.45,

              "line-dasharray": [
                3,
                2,
              ],
            },
          });


          map.addSource(
            "fastest-route",
            {
              type:
                "geojson",

              data:
                buildRouteGeoJson(
                  routesRef
                    .current
                    .fastestRoute,
                ) as any,
            },
          );

          map.addLayer({
            id:
              "fastest-route-glow",

            type:
              "line",

            source:
              "fastest-route",

            paint: {
              "line-color":
                "#ff3b5c",

              "line-width":
                14,

              "line-opacity":
                0.2,

              "line-blur":
                4,
            },
          });

          map.addLayer({
            id:
              "fastest-route-line",

            type:
              "line",

            source:
              "fastest-route",

            paint: {
              "line-color":
                "#ff3b5c",

              "line-width":
                6,

              "line-opacity":
                1,

              "line-dasharray": [
                2,
                1.2,
              ],
            },
          });


          map.addSource(
            "safe-route",
            {
              type:
                "geojson",

              data:
                buildRouteGeoJson(
                  routesRef
                    .current
                    .safeRoute,
                ) as any,
            },
          );

          map.addLayer({
            id:
              "safe-route-glow",

            type:
              "line",

            source:
              "safe-route",

            paint: {
              "line-color":
                "#22c55e",

              "line-width":
                16,

              "line-opacity":
                0.22,

              "line-blur":
                4,
            },
          });

          map.addLayer({
            id:
              "safe-route-line",

            type:
              "line",

            source:
              "safe-route",

            paint: {
              "line-color":
                "#22c55e",

              "line-width":
                7,

              "line-opacity":
                1,
            },
          });


          map.addSource(
            "route-endpoints",
            {
              type:
                "geojson",

              data:
                buildRoutePoints(
                  routesRef
                    .current,
                ) as any,
            },
          );

          map.addLayer({
            id:
              "route-endpoint-layer",

            type:
              "circle",

            source:
              "route-endpoints",

            paint: {
              "circle-radius":
                9,

              "circle-color": [
                "match",
                [
                  "get",
                  "type",
                ],
                "origin",
                "#ff9f1c",
                "destination",
                "#22c55e",
                "#007cf7",
              ],

              "circle-stroke-color":
                "#ffffff",

              "circle-stroke-width":
                2,
            },
          });


          map.on(
            "click",
            "fastest-route-line",
            (
              event,
            ) => {

              const route =
                routesRef
                  .current
                  .fastestRoute;

              new Popup()
                .setLngLat(
                  event.lngLat,
                )
                .setHTML(
                  routePopupHtml(
                    "Fastest Route",
                    route,
                  ),
                )
                .addTo(
                  map,
                );
            },
          );


          map.on(
            "click",
            "safe-route-line",
            (
              event,
            ) => {

              const route =
                routesRef
                  .current
                  .safeRoute;

              new Popup()
                .setLngLat(
                  event.lngLat,
                )
                .setHTML(
                  routePopupHtml(
                    "Flood-Aware Route",
                    route,
                  ),
                )
                .addTo(
                  map,
                );
            },
          );


          fitMapToRoutes(
            map,
            routesRef
              .current,
          );
        },
      );

    } catch (
      error
    ) {

      console.error(
        "Route map initialization failed:",
        error,
      );

      setMapError(
        error instanceof
          Error
          ? error.message
          : "Unable to initialize route map.",
      );
    }


    return () => {

      if (
        mapRef.current
      ) {
        mapRef
          .current
          .remove();

        mapRef.current =
          null;
      }
    };

  }, []);


  useEffect(() => {

    const map =
      mapRef.current;

    if (
      !map
    ) {
      return;
    }

    const update =
      () => {

        const fastestSource =
          map.getSource(
            "fastest-route",
          ) as
            | GeoJSONSource
            | undefined;

        fastestSource?.setData(
          buildRouteGeoJson(
            routesSnapshot
              .fastestRoute,
          ) as any,
        );


        const safeSource =
          map.getSource(
            "safe-route",
          ) as
            | GeoJSONSource
            | undefined;

        safeSource?.setData(
          buildRouteGeoJson(
            routesSnapshot
              .safeRoute,
          ) as any,
        );


        const floodSource =
          map.getSource(
            "route-flood",
          ) as
            | GeoJSONSource
            | undefined;

        floodSource?.setData(
          buildFloodGeoJson(
            forecastSnapshot,
          ) as any,
        );


        const endpointSource =
          map.getSource(
            "route-endpoints",
          ) as
            | GeoJSONSource
            | undefined;

        endpointSource?.setData(
          buildRoutePoints(
            routesSnapshot,
          ) as any,
        );


        fitMapToRoutes(
          map,
          routesSnapshot,
        );
      };


    if (
      map.isStyleLoaded()
    ) {
      update();
    } else {
      map.once(
        "load",
        update,
      );
    }

  }, [
    forecastSnapshot,
    routesSnapshot,
  ]);


  return (
    <div className="relative h-[560px] overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#020915]">

      {mapError ? (
        <div className="flex h-full items-center justify-center p-6 text-center">

          <div>

            <AlertTriangle
              size={28}
              className="mx-auto text-red-300"
            />

            <p className="mt-3 text-sm font-medium text-red-200">
              Route map unavailable
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {mapError}
            </p>

          </div>

        </div>
      ) : (
        <div
          ref={
            containerRef
          }
          className="absolute inset-0"
        />
      )}

    </div>
  );
}


/* ====================================================== */
/* GEOJSON                                                */
/* ====================================================== */

function buildRouteGeoJson(
  route:
    RouteOption,
) {

  return {
    type:
      "FeatureCollection",

    features: [
      {
        type:
          "Feature",

        properties: {
          route_id:
            route.routeId,

          name:
            route.name,

          status:
            route.status,
        },

        geometry: {
          type:
            "LineString",

          coordinates:
            route
              .geometry
              .coordinates,
        },
      },
    ],
  };
}


function buildFloodGeoJson(
  forecast:
    ForecastSnapshot,
) {

  return {
    type:
      "FeatureCollection",

    features: [
      {
        type:
          "Feature",

        properties: {
          risk:
            forecast.risk,
        },

        geometry: {
          type:
            "Polygon",

          coordinates:
            forecast.polygon,
        },
      },
    ],
  };
}


function buildRoutePoints(
  routes:
    RoutesSnapshot,
) {

  const preferred =
    routes
      .safeRoute
      .geometry
      .coordinates
      .length >=
      2
      ? routes
          .safeRoute
          .geometry
          .coordinates
      : routes
          .fastestRoute
          .geometry
          .coordinates;

  const first =
    preferred[
      0
    ];

  const last =
    preferred[
      preferred.length -
      1
    ];

  const features:
    unknown[] = [];

  if (
    first &&
    first.length >=
      2
  ) {
    features.push({
      type:
        "Feature",

      properties: {
        type:
          "origin",
      },

      geometry: {
        type:
          "Point",

        coordinates: [
          first[
            0
          ],
          first[
            1
          ],
        ],
      },
    });
  }

  if (
    last &&
    last.length >=
      2
  ) {
    features.push({
      type:
        "Feature",

      properties: {
        type:
          "destination",
      },

      geometry: {
        type:
          "Point",

        coordinates: [
          last[
            0
          ],
          last[
            1
          ],
        ],
      },
    });
  }

  return {
    type:
      "FeatureCollection",

    features,
  };
}


/* ====================================================== */
/* FIT                                                    */
/* ====================================================== */

function fitMapToRoutes(
  map:
    MapLibreMap,

  routes:
    RoutesSnapshot,
) {

  const coordinates = [
    ...routes
      .fastestRoute
      .geometry
      .coordinates,

    ...routes
      .safeRoute
      .geometry
      .coordinates,
  ].filter(
    (
      coordinate,
    ) =>
      Array.isArray(
        coordinate,
      ) &&
      coordinate.length >=
        2 &&
      Number.isFinite(
        coordinate[
          0
        ],
      ) &&
      Number.isFinite(
        coordinate[
          1
        ],
      ),
  );

  if (
    coordinates.length ===
    0
  ) {
    return;
  }

  const first =
    coordinates[
      0
    ];

  const bounds =
    new LngLatBounds(
      [
        first[
          0
        ],
        first[
          1
        ],
      ],
      [
        first[
          0
        ],
        first[
          1
        ],
      ],
    );

  coordinates.forEach(
    (
      coordinate,
    ) => {
      bounds.extend([
        coordinate[
          0
        ],
        coordinate[
          1
        ],
      ]);
    },
  );

  map.fitBounds(
    bounds,
    {
      padding:
        70,

      duration:
        450,

      maxZoom:
        15,
    },
  );
}


/* ====================================================== */
/* CARDS                                                  */
/* ====================================================== */

function MetricCard({
  icon,
  title,
  value,
  subtitle,
  danger = false,
}: {
  icon:
    ReactNode;

  title:
    string;

  value:
    string;

  subtitle:
    string;

  danger?:
    boolean;
}) {

  return (
    <article className="glass-card rounded-[24px] p-5">

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>

          <p
            className={`
              mt-3
              text-2xl
              font-semibold
              ${
                danger
                  ? "text-red-300"
                  : "text-slate-100"
              }
            `}
          >
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            {subtitle}
          </p>

        </div>

        <div
          className={`
            rounded-2xl
            p-3
            ${
              danger
                ? "bg-red-500/10 text-red-300"
                : "bg-[#007cf7]/15 text-[#4da3ff]"
            }
          `}
        >
          {icon}
        </div>

      </div>

    </article>
  );
}


function MissionPoint({
  icon,
  label,
  title,
  subtitle,
  danger = false,
}: {
  icon:
    ReactNode;

  label:
    string;

  title:
    string;

  subtitle:
    string;

  danger?:
    boolean;
}) {

  return (
    <div className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">

      <div
        className={`
          rounded-xl
          p-3
          ${
            danger
              ? "bg-red-500/10 text-red-300"
              : "bg-emerald-500/10 text-emerald-300"
          }
        `}
      >
        {icon}
      </div>

      <div>

        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>

        <p className="mt-1 font-semibold text-slate-100">
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {subtitle}
        </p>

      </div>

    </div>
  );
}


function RouteCard({
  route,
  title,
  danger = false,
  recommended = false,
}: {
  route:
    RouteOption;

  title:
    string;

  danger?:
    boolean;

  recommended?:
    boolean;
}) {

  return (
    <article
      className={`
        rounded-[26px]
        border
        p-5
        ${
          danger
            ? "border-red-400/15 bg-red-500/[0.04]"
            : recommended
              ? "border-emerald-400/15 bg-emerald-500/[0.04]"
              : "border-white/[0.06] bg-white/[0.025]"
        }
      `}
    >

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>

          <h3 className="mt-2 text-lg font-semibold">
            {route.name}
          </h3>

        </div>

        {recommended && (
          <span className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-[9px] font-semibold uppercase text-emerald-300">
            Recommended
          </span>
        )}

      </div>


      <div className="mt-5 grid grid-cols-3 gap-2">

        <RouteStat
          label="Distance"
          value={`${formatNumber(
            route.distanceKm,
            2,
          )} km`}
        />

        <RouteStat
          label="Duration"
          value={`${formatNumber(
            route.durationMin,
            1,
          )} min`}
        />

        <RouteStat
          label="Status"
          value={
            formatStatus(
              route.status,
            )
          }
        />

      </div>


      <p className="mt-4 text-xs leading-5 text-slate-500">
        {route
          .intersectsFlood
          ? "Route intersects the predicted flood-risk area."
          : "Route avoids the currently identified flood-risk area where possible."}
      </p>

    </article>
  );
}


function RouteStat({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {

  return (
    <div className="rounded-xl border border-white/[0.05] bg-black/10 p-3">

      <p className="text-[9px] uppercase tracking-[0.1em] text-slate-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-200">
        {value}
      </p>

    </div>
  );
}


function AnalysisRow({
  title,
  value,
  warning = false,
}: {
  title:
    string;

  value:
    string;

  warning?:
    boolean;
}) {

  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] py-3">

      <span className="text-sm text-slate-500">
        {title}
      </span>

      <span
        className={`
          text-right
          text-sm
          font-medium
          ${
            warning
              ? "text-red-300"
              : "text-slate-200"
          }
        `}
      >
        {value}
      </span>

    </div>
  );
}


function Legend({
  color,
  label,
}: {
  color:
    string;

  label:
    string;
}) {

  return (
    <div className="flex items-center gap-2 text-slate-400">

      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{
          backgroundColor:
            color,
        }}
      />

      {label}

    </div>
  );
}


/* ====================================================== */
/* HELPERS                                                */
/* ====================================================== */

function routePopupHtml(
  title:
    string,

  route:
    RouteOption,
) {

  return `
    <div style="
      background:#071a33;
      color:white;
      padding:14px;
      border-radius:12px;
      font-family:Inter,Arial,sans-serif;
    ">
      <div style="
        color:#8cc7ff;
        font-size:10px;
        text-transform:uppercase;
        letter-spacing:.12em;
      ">
        ${title}
      </div>

      <div style="
        margin-top:8px;
        font-size:14px;
        font-weight:700;
      ">
        ${route.distanceKm.toFixed(
          2,
        )} km • ${route.durationMin.toFixed(
          1,
        )} min
      </div>

      <div style="
        margin-top:6px;
        color:#94a3b8;
        font-size:12px;
      ">
        ${route.status}
      </div>
    </div>
  `;
}


function clamp01(
  value:
    number,
) {

  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      1,
      value,
    ),
  );
}


function formatStatus(
  value:
    string,
) {

  return String(
    value ??
    "UNKNOWN",
  )
    .replaceAll(
      "_",
      " ",
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        character,
      ) =>
        character
          .toUpperCase(),
    );
}


function formatNumber(
  value:
    number,

  digits:
    number,
) {

  if (
    !Number.isFinite(
      value,
    )
  ) {
    return "0";
  }

  return Number(
    value.toFixed(
      digits,
    ),
  ).toString();
}


export default RouteAnalyzerPage;
