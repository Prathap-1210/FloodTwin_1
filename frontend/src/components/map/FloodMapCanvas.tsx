import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
} from "maplibre-gl";

import type {
  GeoJSONSource,
} from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import type {
  ForecastMinute,
} from "../../data/demo/forecastData";

import {
  getDemoForecast,
  type ForecastSnapshot,
} from "../../services/floodApi";

import type {
  FloodScanLocation,
} from "../../services/mlApi";

import {
  getMapContext,
} from "../../services/mapContextApi";


/* ====================================================== */
/* PROPS                                                  */
/* ====================================================== */

type FloodMapCanvasProps = {
  forecastMinutes:
    ForecastMinute;

  forecastSnapshot?:
    ForecastSnapshot;

  affectedLocations?:
    FloodScanLocation[];

  selectedLocationId?:
    string | null;

  onOpenDrainage?:
    () => void;

  variant?:
    "overview" | "analysis";
};


/* ====================================================== */
/* MAP / LAYER TYPES                                      */
/* ====================================================== */

type LayerKey =
  | "flood"
  | "drainage"
  | "road"
  | "hospitals"
  | "camps";

type LayerVisibility =
  Record<
    LayerKey,
    boolean
  >;

type MarkerKind =
  | "flood"
  | "hospital"
  | "camp";

type ManagedMarker = {
  marker:
    Marker;

  kind:
    MarkerKind;
};

type FeatureCollectionLike = {
  type:
    "FeatureCollection";

  features:
    any[];
};


/* ====================================================== */
/* CONSTANTS                                              */
/* ====================================================== */

const CHENNAI_CENTER:
  [number, number] = [
    80.2707,
    13.0827,
  ];

const EMPTY_FEATURE_COLLECTION:
  FeatureCollectionLike = {
    type:
      "FeatureCollection",

    features:
      [],
  };


/* ====================================================== */
/* NUMBER / FIELD HELPERS                                 */
/* ====================================================== */

function finiteNumber(
  value:
    unknown,
): number | null {

  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return null;
  }

  const parsed =
    Number(
      value,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}


function readField(
  value:
    unknown,

  ...keys:
    string[]
): unknown {

  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return undefined;
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
    if (
      record[
        key
      ] !==
        undefined &&
      record[
        key
      ] !==
        null
    ) {
      return record[
        key
      ];
    }
  }

  return undefined;
}


function readLocationCoordinates(
  location:
    FloodScanLocation,
): {
  latitude:
    number;

  longitude:
    number;
} | null {

  /*
   * The backend scanner currently returns latitude /
   * longitude. The aliases below make the visualization
   * safe against older lat/lon payloads and numeric
   * strings without changing the ML result itself.
   */

  const raw =
    location as unknown as
      Record<
        string,
        unknown
      >;

  const latitude =
    finiteNumber(
      raw.latitude ??
      raw.lat,
    );

  const longitude =
    finiteNumber(
      raw.longitude ??
      raw.lon ??
      raw.lng,
    );

  if (
    latitude ==
      null ||
    longitude ==
      null
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}


/* ====================================================== */
/* GEOJSON NORMALIZATION                                  */
/* ====================================================== */

function normalizeFeatureCollection(
  value:
    unknown,
): FeatureCollectionLike {

  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return EMPTY_FEATURE_COLLECTION;
  }

  const root =
    value as Record<
      string,
      unknown
    >;

  if (
    root.type ===
      "FeatureCollection" &&
    Array.isArray(
      root.features,
    )
  ) {
    return {
      type:
        "FeatureCollection",

      features:
        root.features,
    };
  }

  if (
    root.type ===
    "Feature"
  ) {
    return {
      type:
        "FeatureCollection",

      features: [
        value,
      ],
    };
  }

  if (
    typeof root.type ===
      "string"
  ) {
    return {
      type:
        "FeatureCollection",

      features: [
        {
          type:
            "Feature",

          properties:
            {},

          geometry:
            value,
        },
      ],
    };
  }

  return EMPTY_FEATURE_COLLECTION;
}


function getContextCollection(
  context:
    unknown,

  key:
    string,
): FeatureCollectionLike {

  if (
    !context ||
    typeof context !==
      "object"
  ) {
    return EMPTY_FEATURE_COLLECTION;
  }

  const record =
    context as Record<
      string,
      unknown
    >;

  return normalizeFeatureCollection(
    record[
      key
    ],
  );
}


/* ====================================================== */
/* HOTSPOT GEOJSON                                        */
/* ====================================================== */

function buildHotspotData(
  locations:
    FloodScanLocation[],
): FeatureCollectionLike {

  return {
    type:
      "FeatureCollection",

    features:
      locations
        .map(
          (
            location,
          ) => {

            const coordinates =
              readLocationCoordinates(
                location,
              );

            if (
              !coordinates
            ) {
              return null;
            }

            const probability =
              finiteNumber(
                (
                  location as any
                )
                  .flood_probability,
              ) ??
              0;

            const depth =
              finiteNumber(
                (
                  location as any
                )
                  .predicted_depth_cm,
              ) ??
              0;

            return {
              type:
                "Feature",

              properties: {
                location_id:
                  String(
                    (
                      location as any
                    )
                      .location_id ??
                    "Affected location",
                  ),

                risk:
                  String(
                    (
                      location as any
                    )
                      .risk ??
                    "UNKNOWN",
                  )
                    .toUpperCase(),

                predicted_depth_cm:
                  depth,

                flood_probability:
                  probability,
              },

              geometry: {
                type:
                  "Point",

                coordinates: [
                  coordinates
                    .longitude,

                  coordinates
                    .latitude,
                ],
              },
            };
          },
        )
        .filter(
          Boolean,
        ) as any[],
  };
}


/* ====================================================== */
/* FLOOD ENVELOPE                                         */
/* ====================================================== */

function buildAffectedEnvelope(
  forecast:
    ForecastSnapshot,
): FeatureCollectionLike {

  if (
    !Array.isArray(
      forecast
        .polygon,
    ) ||
    forecast
      .polygon
      .length ===
      0
  ) {
    return EMPTY_FEATURE_COLLECTION;
  }

  return {
    type:
      "FeatureCollection",

    features: [
      {
        type:
          "Feature",

        properties: {
          risk:
            forecast
              .risk,

          depth_cm:
            forecast
              .depth,

          probability:
            forecast
              .probability,
        },

        geometry: {
          type:
            "Polygon",

          coordinates:
            forecast
              .polygon,
        },
      },
    ],
  };
}



/* ====================================================== */
/* FLOOD ZONE POLYGONS                                    */
/* ====================================================== */

function clampNumber(
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


function buildCircleRing(
  longitude:
    number,

  latitude:
    number,

  radiusMeters:
    number,

  steps =
    30,
) {

  const latitudeRadians =
    latitude *
    Math.PI /
    180;

  const metersPerDegreeLatitude =
    111_320;

  const metersPerDegreeLongitude =
    Math.max(
      10_000,
      111_320 *
      Math.cos(
        latitudeRadians,
      ),
    );

  const ring:
    number[][] =
    [];

  for (
    let index =
      0;
    index <=
      steps;
    index +=
      1
  ) {

    const angle =
      (
        index /
        steps
      ) *
      Math.PI *
      2;

    const eastMeters =
      Math.cos(
        angle,
      ) *
      radiusMeters;

    const northMeters =
      Math.sin(
        angle,
      ) *
      radiusMeters;

    ring.push([
      longitude +
      eastMeters /
      metersPerDegreeLongitude,

      latitude +
      northMeters /
      metersPerDegreeLatitude,
    ]);
  }

  return ring;
}


function buildFloodZoneData(
  locations:
    FloodScanLocation[],
): FeatureCollectionLike {

  return {
    type:
      "FeatureCollection",

    features:
      locations
        .map(
          (
            location,
          ) => {

            const coordinates =
              readLocationCoordinates(
                location,
              );

            if (
              !coordinates
            ) {
              return null;
            }

            const depth =
              finiteNumber(
                (
                  location as any
                )
                  .predicted_depth_cm,
              ) ??
              0;

            const probability =
              clampNumber(
                finiteNumber(
                  (
                    location as any
                  )
                    .flood_probability,
                ) ??
                0,
                0,
                1,
              );

            const risk =
              String(
                (
                  location as any
                )
                  .risk ??
                "UNKNOWN",
              )
                .toUpperCase();

            /*
             * Visualization-only operational influence
             * radius. It is intentionally labelled as an
             * affected-zone visualization, not an exact
             * hydraulic inundation boundary.
             */
            const radiusMeters =
              clampNumber(
                240 +
                depth *
                9 +
                probability *
                260,
                260,
                1_050,
              );

            return {
              type:
                "Feature",

              properties: {
                location_id:
                  String(
                    (
                      location as any
                    )
                      .location_id ??
                    "Affected location",
                  ),

                risk,

                predicted_depth_cm:
                  depth,

                flood_probability:
                  probability,

                visualization_radius_m:
                  Math.round(
                    radiusMeters,
                  ),
              },

              geometry: {
                type:
                  "Polygon",

                coordinates: [
                  buildCircleRing(
                    coordinates
                      .longitude,

                    coordinates
                      .latitude,

                    radiusMeters,
                  ),
                ],
              },
            };
          },
        )
        .filter(
          Boolean,
        ) as any[],
  };
}


/* ====================================================== */
/* COLOR HELPERS                                          */
/* ====================================================== */

function getFloodColor(
  risk:
    string,
) {

  switch (
    risk
      .toUpperCase()
  ) {

    case "SAFE":
      return "#22c55e";

    case "CAUTION":
      return "#facc15";

    case "HIGH":
      return "#ff9f1c";

    case "SEVERE":
      return "#ff3b5c";

    default:
      return "#007cf7";
  }
}



/* ====================================================== */
/* HTML                                                   */
/* ====================================================== */

function escapeHtml(
  value:
    unknown,
) {

  return String(
    value ??
    "",
  )
    .replaceAll(
      "&",
      "&amp;",
    )
    .replaceAll(
      "<",
      "&lt;",
    )
    .replaceAll(
      ">",
      "&gt;",
    )
    .replaceAll(
      '"',
      "&quot;",
    )
    .replaceAll(
      "'",
      "&#039;",
    );
}


function popupHtml(
  heading:
    string,

  title:
    string,

  lines:
    string[],
) {

  return `
    <div style="
      min-width:200px;
      background:#071a33;
      color:white;
      padding:14px;
      border-radius:14px;
      border:1px solid rgba(77,163,255,.35);
      font-family:Inter,Arial,sans-serif;
      box-shadow:0 14px 35px rgba(0,0,0,.35);
    ">
      <div style="
        color:#8cc7ff;
        font-size:9px;
        font-weight:700;
        text-transform:uppercase;
        letter-spacing:.14em;
      ">
        ${escapeHtml(
          heading,
        )}
      </div>

      <div style="
        margin-top:7px;
        font-size:15px;
        font-weight:700;
        line-height:1.35;
      ">
        ${escapeHtml(
          title,
        )}
      </div>

      <div style="
        margin-top:9px;
        color:#cbd5e1;
        font-size:11px;
        line-height:1.7;
      ">
        ${lines
          .map(
            (
              line,
            ) =>
              escapeHtml(
                line,
              ),
          )
          .join(
            "<br/>",
          )}
      </div>
    </div>
  `;
}


/* ====================================================== */
/* DOM MARKER CREATION                                    */
/* ====================================================== */

function createMarkerElement(
  color:
    string,

  size:
    number,

  ring:
    boolean,

  label?:
    string,
) {

  const wrapper =
    document.createElement(
      "div",
    );

  wrapper.style
    .display =
    "flex";

  wrapper.style
    .alignItems =
    "center";

  wrapper.style
    .gap =
    "5px";

  wrapper.style
    .cursor =
    "pointer";

  wrapper.style
    .transform =
    "translateZ(0)";


  const dot =
    document.createElement(
      "div",
    );

  dot.style
    .width =
    `${size}px`;

  dot.style
    .height =
    `${size}px`;

  dot.style
    .borderRadius =
    "9999px";

  dot.style
    .background =
    color;

  dot.style
    .border =
    ring
      ? "3px solid #ffffff"
      : "2px solid rgba(255,255,255,.92)";

  dot.style
    .boxShadow =
    ring
      ? `0 0 0 4px ${color}55, 0 0 22px ${color}`
      : `0 0 14px ${color}`;

  dot.style
    .flexShrink =
    "0";

  wrapper.appendChild(
    dot,
  );


  if (
    label
  ) {

    const text =
      document.createElement(
        "span",
      );

    text.textContent =
      label;

    text.style
      .display =
      "none";

    text.style
      .padding =
      "3px 6px";

    text.style
      .borderRadius =
      "7px";

    text.style
      .background =
      "rgba(2,9,21,.88)";

    text.style
      .border =
      "1px solid rgba(255,255,255,.12)";

    text.style
      .color =
      "#f8fafc";

    text.style
      .fontSize =
      "9px";

    text.style
      .fontWeight =
      "700";

    text.style
      .whiteSpace =
      "nowrap";

    wrapper.appendChild(
      text,
    );


    wrapper.addEventListener(
      "mouseenter",
      () => {

        text.style
          .display =
          "inline-block";
      },
    );


    wrapper.addEventListener(
      "mouseleave",
      () => {

        text.style
          .display =
          "none";
      },
    );
  }


  return wrapper;
}


/* ====================================================== */
/* POINT FEATURE EXTRACTION                               */
/* ====================================================== */

function getPointFeatures(
  collection:
    FeatureCollectionLike,
) {

  return collection
    .features
    .map(
      (
        feature,
        index,
      ) => {

        const coordinates =
          feature
            ?.geometry
            ?.coordinates;

        if (
          feature
            ?.geometry
            ?.type !==
            "Point" ||
          !Array.isArray(
            coordinates,
          ) ||
          coordinates
            .length <
            2
        ) {
          return null;
        }

        const longitude =
          finiteNumber(
            coordinates[
              0
            ],
          );

        const latitude =
          finiteNumber(
            coordinates[
              1
            ],
          );

        if (
          longitude ==
            null ||
          latitude ==
            null
        ) {
          return null;
        }

        return {
          index,

          longitude,

          latitude,

          properties:
            feature
              .properties ??
            {},
        };
      },
    )
    .filter(
      Boolean,
    ) as {
      index:
        number;

      longitude:
        number;

      latitude:
        number;

      properties:
        Record<
          string,
          unknown
        >;
    }[];
}


/* ====================================================== */
/* COMPONENT                                              */
/* ====================================================== */

function FloodMapCanvas({
  forecastMinutes,
  forecastSnapshot,
  affectedLocations = [],
  selectedLocationId = null,
  onOpenDrainage,
  variant = "analysis",
}: FloodMapCanvasProps) {

  const isOverview =
    variant ===
    "overview";

  const forecast =
    forecastSnapshot ??
    getDemoForecast(
      forecastMinutes,
    );

  const floodColor =
    getFloodColor(
      forecast
        .risk,
    );

  /*
   * Drainage always uses cyan so it never shares a flood
   * risk color. Flood colors remain risk-dependent.
   */
  const drainageColor =
    "#06b6d4";


  /* ==================================================== */
  /* REFS                                                 */
  /* ==================================================== */

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

  const resizeObserverRef =
    useRef<
      ResizeObserver | null
    >(
      null,
    );

  const initializationFrameRef =
    useRef<
      number | null
    >(
      null,
    );

  const resizeFrameRef =
    useRef<
      number | null
    >(
      null,
    );

  const managedMarkersRef =
    useRef<
      ManagedMarker[]
    >(
      [],
    );

  const affectedLocationsRef =
    useRef<
      FloodScanLocation[]
    >(
      affectedLocations,
    );

  const forecastRef =
    useRef<
      ForecastSnapshot
    >(
      forecast,
    );

  const onOpenDrainageRef =
    useRef(
      onOpenDrainage,
    );


  affectedLocationsRef.current =
    affectedLocations;

  forecastRef.current =
    forecast;

  onOpenDrainageRef.current =
    onOpenDrainage;


  /* ==================================================== */
  /* STATE                                                */
  /* ==================================================== */

  const [
    mapReady,
    setMapReady,
  ] =
    useState(
      false,
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

  const [
    mapContext,
    setMapContext,
  ] =
    useState<
      unknown
    >(
      null,
    );

  const [
    contextLoading,
    setContextLoading,
  ] =
    useState(
      true,
    );

  const [
    contextError,
    setContextError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    layerVisibility,
    setLayerVisibility,
  ] =
    useState<LayerVisibility>({
      flood:
        true,

      drainage:
        true,

      road:
        true,

      hospitals:
        true,

      camps:
        true,
    });


  /* ==================================================== */
  /* LOAD INFRASTRUCTURE                                  */
  /* ==================================================== */

  useEffect(() => {

    let cancelled =
      false;

    setContextLoading(
      true,
    );


    getMapContext()
      .then(
        (
          result,
        ) => {

          if (
            cancelled
          ) {
            return;
          }

          setMapContext(
            result,
          );

          setContextError(
            null,
          );
        },
      )
      .catch(
        (
          error,
        ) => {

          if (
            cancelled
          ) {
            return;
          }

          console.error(
            "FloodTwin map context failed:",
            error,
          );

          setContextError(
            "Infrastructure context unavailable",
          );

          setMapContext(
            null,
          );
        },
      )
      .finally(
        () => {

          if (
            !cancelled
          ) {
            setContextLoading(
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
  /* CONTEXT DATA                                         */
  /* ==================================================== */

  const healthcareData =
    getContextCollection(
      mapContext,
      "healthcare",
    );

  const shelterData =
    getContextCollection(
      mapContext,
      "candidate_shelters",
    );

  const drainageData =
    getContextCollection(
      mapContext,
      "drainage",
    );

  const roadData =
    getContextCollection(
      mapContext,
      "critical_road",
    );


  /* ==================================================== */
  /* RESIZE                                               */
  /* ==================================================== */

  const scheduleResize =
    (
      map:
        MapLibreMap,
    ) => {

      if (
        resizeFrameRef
          .current !=
        null
      ) {
        window.cancelAnimationFrame(
          resizeFrameRef
            .current,
        );
      }


      resizeFrameRef.current =
        window.requestAnimationFrame(
          () => {

            resizeFrameRef.current =
              null;

            try {

              map.resize();

            } catch (
              error
            ) {

              console.warn(
                "Map resize skipped:",
                error,
              );
            }
          },
        );
    };


  /* ==================================================== */
  /* INITIALIZE MAP                                       */
  /* ==================================================== */

  useEffect(() => {

    const container =
      containerRef
        .current;

    if (
      !container ||
      mapRef.current
    ) {
      return;
    }


    let disposed =
      false;


    const initialize =
      () => {

        if (
          disposed ||
          mapRef.current
        ) {
          return;
        }


        const rect =
          container
            .getBoundingClientRect();

        if (
          rect.width <
            40 ||
          rect.height <
            40
        ) {

          initializationFrameRef.current =
            window.requestAnimationFrame(
              initialize,
            );

          return;
        }


        try {

          setMapError(
            null,
          );


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

                    maxzoom:
                      19,

                    attribution:
                      "© OpenStreetMap contributors",
                  },
                },

                layers: [
                  {
                    id:
                      "background",

                    type:
                      "background",

                    paint: {
                      "background-color":
                        "#07111f",
                    },
                  },

                  {
                    id:
                      "osm-basemap",

                    type:
                      "raster",

                    source:
                      "osm",

                    paint: {
                      "raster-opacity":
                        0.94,

                      "raster-brightness-min":
                        0.20,

                      "raster-brightness-max":
                        0.93,

                      "raster-saturation":
                        -0.12,

                      "raster-contrast":
                        0.06,
                    },
                  },
                ],
              },

              center:
                CHENNAI_CENTER,

              zoom:
                isOverview
                  ? 10.2
                  : 10.5,

              minZoom:
                8,

              maxZoom:
                18,

              attributionControl:
                {},
            });


          mapRef.current =
            map;


          if (
            typeof ResizeObserver !==
            "undefined"
          ) {

            resizeObserverRef.current =
              new ResizeObserver(
                () => {

                  scheduleResize(
                    map,
                  );
                },
              );


            resizeObserverRef
              .current
              .observe(
                container,
              );
          }


          const handleWindowResize =
            () => {

              scheduleResize(
                map,
              );
            };


          window.addEventListener(
            "resize",
            handleWindowResize,
          );


          (
            map as MapLibreMap & {
              __resizeHandler?:
                () => void;
            }
          ).__resizeHandler =
            handleWindowResize;


          map.addControl(
            new NavigationControl({
              showZoom:
                true,

              showCompass:
                !isOverview,
            }),

            "top-right",
          );


          map.on(
            "load",
            () => {

              if (
                disposed
              ) {
                return;
              }


              map.resize();


              /* ---------------------------------------- */
              /* FLOOD ENVELOPE                           */
              /* ---------------------------------------- */

              map.addSource(
                "flood-envelope",
                {
                  type:
                    "geojson",

                  data:
                    buildAffectedEnvelope(
                      forecastRef
                        .current,
                    ) as any,
                },
              );


              map.addLayer({
                id:
                  "flood-envelope-fill",

                type:
                  "fill",

                source:
                  "flood-envelope",

                paint: {
                  "fill-color":
                    getFloodColor(
                      forecastRef
                        .current
                        .risk,
                    ),

                  "fill-opacity":
                    isOverview
                      ? 0.14
                      : 0.20,
                },
              });


              map.addLayer({
                id:
                  "flood-envelope-line",

                type:
                  "line",

                source:
                  "flood-envelope",

                paint: {
                  "line-color":
                    getFloodColor(
                      forecastRef
                        .current
                        .risk,
                    ),

                  "line-width":
                    2.5,

                  "line-opacity":
                    0.80,

                  "line-dasharray": [
                    3,
                    2,
                  ],
                },
              });


              /* ---------------------------------------- */
              /* FLOOD AFFECTED ZONES                     */
              /* ---------------------------------------- */

              map.addSource(
                "flood-zones",
                {
                  type:
                    "geojson",

                  data:
                    buildFloodZoneData(
                      affectedLocationsRef
                        .current,
                    ) as any,
                },
              );


              map.addLayer({
                id:
                  "flood-zone-fill",

                type:
                  "fill",

                source:
                  "flood-zones",

                paint: {
                  "fill-color": [
                    "match",
                    [
                      "get",
                      "risk",
                    ],
                    "SAFE",
                    "#22c55e",
                    "CAUTION",
                    "#facc15",
                    "HIGH",
                    "#ff9f1c",
                    "SEVERE",
                    "#ff3b5c",
                    "#7c3aed",
                  ],

                  "fill-opacity":
                    isOverview
                      ? 0.24
                      : 0.30,
                },
              });


              map.addLayer({
                id:
                  "flood-zone-outline",

                type:
                  "line",

                source:
                  "flood-zones",

                paint: {
                  "line-color": [
                    "match",
                    [
                      "get",
                      "risk",
                    ],
                    "SAFE",
                    "#22c55e",
                    "CAUTION",
                    "#facc15",
                    "HIGH",
                    "#ff9f1c",
                    "SEVERE",
                    "#ff3b5c",
                    "#7c3aed",
                  ],

                  "line-width":
                    isOverview
                      ? 1.8
                      : 2.4,

                  "line-opacity":
                    0.92,
                },
              });


              map.on(
                "click",
                "flood-zone-fill",
                (
                  event,
                ) => {

                  const feature =
                    event
                      .features?.[
                        0
                      ];

                  if (
                    !feature
                  ) {
                    return;
                  }

                  const props =
                    feature
                      .properties ??
                    {};

                  const probability =
                    Math.round(
                      Number(
                        props
                          .flood_probability ??
                        0,
                      ) *
                      100,
                    );

                  new Popup({
                    maxWidth:
                      "330px",
                  })
                    .setLngLat(
                      event
                        .lngLat,
                    )
                    .setHTML(
                      popupHtml(
                        "Predicted Affected Zone",
                        String(
                          props
                            .location_id ??
                          "Affected location",
                        ),
                        [
                          `Risk: ${String(
                            props
                              .risk ??
                            "UNKNOWN",
                          )}`,
                          `Depth: ${Number(
                            props
                              .predicted_depth_cm ??
                            0,
                          ).toFixed(
                            2,
                          )} cm`,
                          `Probability: ${probability}%`,
                          "Zone is an operational visualization, not an exact inundation boundary",
                        ],
                      ),
                    )
                    .addTo(
                      map,
                    );
                },
              );


              map.on(
                "mouseenter",
                "flood-zone-fill",
                () => {

                  map
                    .getCanvas()
                    .style
                    .cursor =
                    "pointer";
                },
              );


              map.on(
                "mouseleave",
                "flood-zone-fill",
                () => {

                  map
                    .getCanvas()
                    .style
                    .cursor =
                    "";
                },
              );


              /* ---------------------------------------- */
              /* HEATMAP                                  */
              /* ---------------------------------------- */

              map.addSource(
                "flood-hotspots",
                {
                  type:
                    "geojson",

                  data:
                    buildHotspotData(
                      affectedLocationsRef
                        .current,
                    ) as any,
                },
              );


              map.addLayer({
                id:
                  "flood-hotspot-heat",

                type:
                  "heatmap",

                source:
                  "flood-hotspots",

                maxzoom:
                  14,

                paint: {
                  "heatmap-weight": [
                    "interpolate",
                    [
                      "linear",
                    ],
                    [
                      "to-number",
                      [
                        "get",
                        "flood_probability",
                      ],
                      0,
                    ],
                    0,
                    0,
                    1,
                    1,
                  ],

                  "heatmap-intensity":
                    isOverview
                      ? 1.3
                      : 1.6,

                  "heatmap-radius":
                    isOverview
                      ? 24
                      : 32,

                  "heatmap-opacity":
                    isOverview
                      ? 0.50
                      : 0.62,

                  "heatmap-color": [
                    "interpolate",
                    [
                      "linear",
                    ],
                    [
                      "heatmap-density",
                    ],
                    0,
                    "rgba(0,124,247,0)",
                    0.20,
                    "rgba(0,124,247,.50)",
                    0.40,
                    "rgba(250,204,21,.60)",
                    0.62,
                    "rgba(255,159,28,.72)",
                    0.82,
                    "rgba(255,59,92,.82)",
                    1,
                    "rgba(255,59,92,.95)",
                  ],
                },
              });


              /* ---------------------------------------- */
              /* DRAINAGE                                 */
              /* ---------------------------------------- */

              map.addSource(
                "map-drainage",
                {
                  type:
                    "geojson",

                  data:
                    EMPTY_FEATURE_COLLECTION as any,
                },
              );


              map.addLayer({
                id:
                  "map-drainage-glow",

                type:
                  "line",

                source:
                  "map-drainage",

                layout: {
                  "line-cap":
                    "round",

                  "line-join":
                    "round",
                },

                paint: {
                  "line-color":
                    "#06b6d4",

                  "line-width":
                    10,

                  "line-opacity":
                    0.22,

                  "line-blur":
                    3,
                },
              });


              map.addLayer({
                id:
                  "map-drainage-line",

                type:
                  "line",

                source:
                  "map-drainage",

                layout: {
                  "line-cap":
                    "round",

                  "line-join":
                    "round",
                },

                paint: {
                  "line-color":
                    "#06b6d4",

                  "line-width":
                    isOverview
                      ? 2.5
                      : 4,

                  "line-opacity":
                    0.96,
                },
              });


              /* ---------------------------------------- */
              /* ROAD                                     */
              /* ---------------------------------------- */

              map.addSource(
                "map-road",
                {
                  type:
                    "geojson",

                  data:
                    EMPTY_FEATURE_COLLECTION as any,
                },
              );


              map.addLayer({
                id:
                  "map-road-glow",

                type:
                  "line",

                source:
                  "map-road",

                paint: {
                  "line-color":
                    "#ff9f1c",

                  "line-width":
                    11,

                  "line-opacity":
                    0.18,

                  "line-blur":
                    3,
                },
              });


              map.addLayer({
                id:
                  "map-road-line",

                type:
                  "line",

                source:
                  "map-road",

                paint: {
                  "line-color":
                    "#ff9f1c",

                  "line-width":
                    isOverview
                      ? 2.5
                      : 4,

                  "line-opacity":
                    0.92,

                  "line-dasharray": [
                    3,
                    2,
                  ],
                },
              });


              /* ---------------------------------------- */
              /* LINE POPUPS                              */
              /* ---------------------------------------- */

              map.on(
                "click",
                "map-drainage-line",
                (
                  event,
                ) => {

                  const feature =
                    event
                      .features?.[
                        0
                      ];

                  if (
                    !feature
                  ) {
                    return;
                  }


                  const props =
                    feature
                      .properties ??
                    {};


                  new Popup({
                    maxWidth:
                      "320px",
                  })
                    .setLngLat(
                      event
                        .lngLat,
                    )
                    .setHTML(
                      popupHtml(
                        "Mapped Drainage",
                        String(
                          props.name ??
                          props.waterway ??
                          "Drainage segment",
                        ),
                        [
                          `Model 2: ${forecastRef.current.drainStatus}`,
                          `Drain load: ${Number(
                            forecastRef.current.drainLoadPercent ??
                            0,
                          ).toFixed(
                            1,
                          )}%`,
                          "Field verification required",
                        ],
                      ),
                    )
                    .addTo(
                      map,
                    );
                },
              );


              map.on(
                "click",
                "map-road-line",
                (
                  event,
                ) => {

                  const feature =
                    event
                      .features?.[
                        0
                      ];

                  const props =
                    feature
                      ?.properties ??
                    {};


                  new Popup({
                    maxWidth:
                      "320px",
                  })
                    .setLngLat(
                      event
                        .lngLat,
                    )
                    .setHTML(
                      popupHtml(
                        "Mapped Road Context",
                        String(
                          props.name ??
                          "Road corridor",
                        ),
                        [
                          "Road geometry: mapped context",
                          "Future road risk: Model 4",
                        ],
                      ),
                    )
                    .addTo(
                      map,
                    );
                },
              );


              [
                "map-drainage-line",
                "map-road-line",
              ].forEach(
                (
                  layer,
                ) => {

                  map.on(
                    "mouseenter",
                    layer,
                    () => {

                      map
                        .getCanvas()
                        .style
                        .cursor =
                        "pointer";
                    },
                  );


                  map.on(
                    "mouseleave",
                    layer,
                    () => {

                      map
                        .getCanvas()
                        .style
                        .cursor =
                        "";
                    },
                  );
                },
              );


              setMapReady(
                true,
              );


              fitToLocations(
                map,
                affectedLocationsRef
                  .current,
              );


              window.requestAnimationFrame(
                () => {

                  map.resize();
                },
              );
            },
          );


          map.on(
            "error",
            (
              event,
            ) => {

              console.warn(
                "FloodTwin map resource warning:",
                event.error,
              );
            },
          );


          window.setTimeout(
            () => {

              if (
                !disposed
              ) {
                scheduleResize(
                  map,
                );
              }
            },
            100,
          );


          window.setTimeout(
            () => {

              if (
                !disposed
              ) {

                scheduleResize(
                  map,
                );

                fitToLocations(
                  map,
                  affectedLocationsRef
                    .current,
                );
              }
            },
            350,
          );

        } catch (
          error
        ) {

          console.error(
            "FloodTwin map initialization failed:",
            error,
          );

          setMapError(
            error instanceof
              Error
              ? error
                  .message
              : "Unable to initialize map.",
          );
        }
      };


    initializationFrameRef.current =
      window.requestAnimationFrame(
        () => {

          initializationFrameRef.current =
            window.requestAnimationFrame(
              initialize,
            );
        },
      );


    return () => {

      disposed =
        true;


      managedMarkersRef
        .current
        .forEach(
          (
            item,
          ) =>
            item
              .marker
              .remove(),
        );

      managedMarkersRef.current =
        [];


      if (
        initializationFrameRef
          .current !=
        null
      ) {

        window.cancelAnimationFrame(
          initializationFrameRef
            .current,
        );

        initializationFrameRef.current =
          null;
      }


      if (
        resizeFrameRef
          .current !=
        null
      ) {

        window.cancelAnimationFrame(
          resizeFrameRef
            .current,
        );

        resizeFrameRef.current =
          null;
      }


      resizeObserverRef
        .current
        ?.disconnect();

      resizeObserverRef.current =
        null;


      const map =
        mapRef
          .current;

      if (
        map
      ) {

        const extended =
          map as MapLibreMap & {
            __resizeHandler?:
              () => void;
          };


        if (
          extended
            .__resizeHandler
        ) {

          window.removeEventListener(
            "resize",
            extended
              .__resizeHandler,
          );
        }


        map.remove();

        mapRef.current =
          null;
      }
    };

  }, [
    isOverview,
  ]);


  /* ==================================================== */
  /* UPDATE GEOJSON SOURCES                               */
  /* ==================================================== */

  useEffect(() => {

    const map =
      mapRef
        .current;

    if (
      !map ||
      !mapReady
    ) {
      return;
    }


    const hotspotSource =
      map.getSource(
        "flood-hotspots",
      ) as
        | GeoJSONSource
        | undefined;


    hotspotSource?.setData(
      buildHotspotData(
        affectedLocations,
      ) as any,
    );


    const floodZoneSource =
      map.getSource(
        "flood-zones",
      ) as
        | GeoJSONSource
        | undefined;


    floodZoneSource?.setData(
      buildFloodZoneData(
        affectedLocations,
      ) as any,
    );


    const envelopeSource =
      map.getSource(
        "flood-envelope",
      ) as
        | GeoJSONSource
        | undefined;


    envelopeSource?.setData(
      buildAffectedEnvelope(
        forecast,
      ) as any,
    );


    if (
      map.getLayer(
        "flood-envelope-fill",
      )
    ) {

      map.setPaintProperty(
        "flood-envelope-fill",
        "fill-color",
        getFloodColor(
          forecast
            .risk,
        ),
      );
    }


    if (
      map.getLayer(
        "flood-envelope-line",
      )
    ) {

      map.setPaintProperty(
        "flood-envelope-line",
        "line-color",
        getFloodColor(
          forecast
            .risk,
        ),
      );
    }


    fitToLocations(
      map,
      affectedLocations,
    );

  }, [
    affectedLocations,
    forecast,
    mapReady,
  ]);


  /* ==================================================== */
  /* UPDATE DRAINAGE / ROAD                               */
  /* ==================================================== */

  useEffect(() => {

    const map =
      mapRef
        .current;

    if (
      !map ||
      !mapReady
    ) {
      return;
    }


    const drainageSource =
      map.getSource(
        "map-drainage",
      ) as
        | GeoJSONSource
        | undefined;


    drainageSource?.setData(
      drainageData as any,
    );


    const roadSource =
      map.getSource(
        "map-road",
      ) as
        | GeoJSONSource
        | undefined;


    roadSource?.setData(
      roadData as any,
    );

  }, [
    drainageData,
    mapReady,
    roadData,
  ]);


  /* ==================================================== */
  /* REBUILD DOM MARKERS                                  */
  /* ==================================================== */

  useEffect(() => {

    const map =
      mapRef
        .current;

    if (
      !map ||
      !mapReady
    ) {
      return;
    }


    /*
     * Remove old DOM markers first. DOM markers are used
     * deliberately for flood hotspots / hospitals / camps
     * because they remain visible above raster + WebGL
     * layers and are not dependent on MapLibre expression
     * coercion.
     */

    managedMarkersRef
      .current
      .forEach(
        (
          item,
        ) =>
          item
            .marker
            .remove(),
      );


    const markers:
      ManagedMarker[] =
      [];


    /* -------------------------------------------------- */
    /* FLOOD HOTSPOTS                                     */
    /* -------------------------------------------------- */

    affectedLocations
      .forEach(
        (
          location,
        ) => {

          const coordinates =
            readLocationCoordinates(
              location,
            );


          if (
            !coordinates
          ) {
            return;
          }


          const risk =
            String(
              (
                location as any
              )
                .risk ??
              "UNKNOWN",
            )
              .toUpperCase();


          const locationId =
            String(
              (
                location as any
              )
                .location_id ??
              "Affected location",
            );


          const selected =
            selectedLocationId !=
              null &&
            locationId ===
              selectedLocationId;


          const depth =
            finiteNumber(
              (
                location as any
              )
                .predicted_depth_cm,
            ) ??
            0;


          const probability =
            finiteNumber(
              (
                location as any
              )
                .flood_probability,
            ) ??
            0;


          const color =
            getFloodColor(
              risk,
            );


          const element =
            createMarkerElement(
              color,
              selected
                ? 18
                : 13,
              selected,
              selected
                ? locationId
                : undefined,
            );


          const marker =
            new Marker({
              element,

              anchor:
                "center",
            })
              .setLngLat([
                coordinates
                  .longitude,

                coordinates
                  .latitude,
              ])
              .setPopup(
                new Popup({
                  offset:
                    16,

                  maxWidth:
                    "320px",
                })
                  .setHTML(
                    popupHtml(
                      "Model 1 Flood Hotspot",
                      locationId,
                      [
                        `Risk: ${risk}`,
                        `Depth: ${depth.toFixed(
                          2,
                        )} cm`,
                        `Probability: ${Math.round(
                          probability *
                          100,
                        )}%`,
                      ],
                    ),
                  ),
              )
              .addTo(
                map,
              );


          markers.push({
            marker,

            kind:
              "flood",
          });
        },
      );


    /* -------------------------------------------------- */
    /* HOSPITALS                                          */
    /* -------------------------------------------------- */

    getPointFeatures(
      healthcareData,
    )
      .forEach(
        (
          point,
        ) => {

          const name =
            String(
              readField(
                point
                  .properties,
                "name",
                "facility_name",
                "hospital_name",
              ) ??
              `Healthcare ${
                point.index +
                1
              }`,
            );


          const element =
            createMarkerElement(
              "#d946ef",
              12,
              false,
            );


          const marker =
            new Marker({
              element,

              anchor:
                "center",
            })
              .setLngLat([
                point
                  .longitude,

                point
                  .latitude,
              ])
              .setPopup(
                new Popup({
                  offset:
                    14,

                  maxWidth:
                    "320px",
                })
                  .setHTML(
                    popupHtml(
                      "Mapped Healthcare",
                      name,
                      [
                        "OSM mapped healthcare context",
                        "Used for nearby infrastructure awareness",
                      ],
                    ),
                  ),
              )
              .addTo(
                map,
              );


          markers.push({
            marker,

            kind:
              "hospital",
          });
        },
      );


    /* -------------------------------------------------- */
    /* CAMPS / SHELTERS                                   */
    /* -------------------------------------------------- */

    getPointFeatures(
      shelterData,
    )
      .forEach(
        (
          point,
        ) => {

          const name =
            String(
              readField(
                point
                  .properties,
                "name",
                "name_of_the_relief_centre",
                "facility_name",
              ) ??
              `Candidate Shelter ${
                point.index +
                1
              }`,
            );


          const capacity =
            finiteNumber(
              readField(
                point
                  .properties,
                "capacity",
              ),
            );


          const element =
            createMarkerElement(
              "#14b8a6",
              12,
              false,
            );


          const marker =
            new Marker({
              element,

              anchor:
                "center",
            })
              .setLngLat([
                point
                  .longitude,

                point
                  .latitude,
              ])
              .setPopup(
                new Popup({
                  offset:
                    14,

                  maxWidth:
                    "320px",
                })
                  .setHTML(
                    popupHtml(
                      "Candidate Shelter",
                      name,
                      [
                        capacity !=
                          null
                          ? `Capacity: ${Math.round(
                              capacity,
                            )}`
                          : "Capacity: not validated",
                        "Mapped shelter context",
                      ],
                    ),
                  ),
              )
              .addTo(
                map,
              );


          markers.push({
            marker,

            kind:
              "camp",
          });
        },
      );


    managedMarkersRef.current =
      markers;


    applyMarkerVisibility(
      markers,
      layerVisibility,
    );

  }, [
    affectedLocations,
    healthcareData,
    mapReady,
    selectedLocationId,
    shelterData,
  ]);


  /* ==================================================== */
  /* LAYER VISIBILITY                                     */
  /* ==================================================== */

  useEffect(() => {

    const map =
      mapRef
        .current;

    if (
      !map ||
      !mapReady
    ) {
      return;
    }


    setMapLayerVisibility(
      map,
      [
        "flood-envelope-fill",
        "flood-envelope-line",
        "flood-zone-fill",
        "flood-zone-outline",
        "flood-hotspot-heat",
      ],
      layerVisibility
        .flood,
    );


    setMapLayerVisibility(
      map,
      [
        "map-drainage-glow",
        "map-drainage-line",
      ],
      layerVisibility
        .drainage,
    );


    setMapLayerVisibility(
      map,
      [
        "map-road-glow",
        "map-road-line",
      ],
      layerVisibility
        .road,
    );


    applyMarkerVisibility(
      managedMarkersRef
        .current,
      layerVisibility,
    );

  }, [
    layerVisibility,
    mapReady,
  ]);


  /* ==================================================== */
  /* PAGE / TAB VISIBILITY                                */
  /* ==================================================== */

  useEffect(() => {

    const handleVisibility =
      () => {

        if (
          document
            .visibilityState !==
          "visible"
        ) {
          return;
        }


        const map =
          mapRef
            .current;

        if (
          !map
        ) {
          return;
        }


        scheduleResize(
          map,
        );
      };


    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );


    return () => {

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };

  }, []);


  /* ==================================================== */
  /* TOGGLE                                               */
  /* ==================================================== */

  const toggleLayer =
    (
      key:
        LayerKey,
    ) => {

      setLayerVisibility(
        (
          current,
        ) => ({
          ...current,

          [key]:
            !current[
              key
            ],
        }),
      );
    };


  /* ==================================================== */
  /* VALID POINT COUNT                                    */
  /* ==================================================== */

  const validFloodPointCount =
    affectedLocations
      .filter(
        (
          location,
        ) =>
          readLocationCoordinates(
            location,
          ) !==
          null,
      )
      .length;


  /* ==================================================== */
  /* UI                                                   */
  /* ==================================================== */

  return (
    <div
      className={`
        relative
        min-w-0
        w-full
        overflow-hidden
        rounded-[24px]
        border
        border-white/[0.06]
        bg-[#07111f]
        ${
          isOverview
            ? "h-[430px]"
            : "h-[620px]"
        }
      `}
    >

      {/* ================================================= */}
      {/* MAP                                               */}
      {/* ================================================= */}

      {mapError ? (
        <div className="flex h-full items-center justify-center p-6 text-center">

          <div>

            <p className="text-sm font-semibold text-red-300">
              Map unavailable
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
          className="absolute inset-0 h-full w-full"
        />
      )}


      {!mapError &&
        !mapReady && (
        <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-[#07111f]">

          <div className="text-center">

            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#007cf7]/20 border-t-[#4da3ff]" />

            <p className="mt-3 text-xs text-slate-300">
              Loading Chennai map...
            </p>

          </div>

        </div>
      )}


      {/* ================================================= */}
      {/* FLOOD STATUS                                      */}
      {/* ================================================= */}

      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-2xl border border-white/10 bg-[#020915]/90 px-4 py-3 backdrop-blur">

        <p className="text-[9px] uppercase tracking-[0.16em] text-[#4da3ff]">
          Chennai Flood Scan
        </p>

        <p className="mt-1 text-sm font-semibold text-slate-100">
          {
            affectedLocations
              .length
          } affected
        </p>

        <p className="mt-1 text-[10px] text-slate-400">
          {
            validFloodPointCount
          } markers + zones plotted
        </p>

        <p className="mt-1 text-[10px] text-slate-600">
          {forecastMinutes ===
          0
            ? "Current view"
            : `Forecast +${forecastMinutes} min`}
        </p>

      </div>


      {/* ================================================= */}
      {/* CONTEXT COUNT                                     */}
      {/* ================================================= */}

      <div className="pointer-events-none absolute left-4 top-[122px] z-10 rounded-xl border border-white/[0.08] bg-[#020915]/88 px-3 py-2 text-[9px] backdrop-blur">

        {contextLoading ? (
          <span className="text-slate-400">
            Loading infrastructure...
          </span>
        ) : contextError ? (
          <span className="text-amber-300">
            {contextError}
          </span>
        ) : (
          <span className="text-slate-400">
            {
              getPointFeatures(
                healthcareData,
              ).length
            } hospitals
            {" • "}
            {
              getPointFeatures(
                shelterData,
              ).length
            } camps
            {" • "}
            {
              drainageData
                .features
                .length
            } drainage
          </span>
        )}

      </div>


      {/* ================================================= */}
      {/* LAYER CONTROLS                                    */}
      {/* ================================================= */}

      <div
        className={`
          absolute
          bottom-4
          right-4
          z-20
          rounded-2xl
          border
          border-white/10
          bg-[#020915]/92
          p-3
          shadow-2xl
          backdrop-blur-xl

          ${
            isOverview
              ? "w-[188px]"
              : "w-[220px]"
          }
        `}
      >

        <div className="mb-2 flex items-center justify-between">

          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Map Layers
          </p>

          <span className="text-[8px] uppercase text-emerald-300">
            Interactive
          </span>

        </div>


        <div
          className={
            isOverview
              ? "grid grid-cols-2 gap-1.5"
              : "space-y-1.5"
          }
        >

          <LayerToggle
            label="Flood"
            color={
              floodColor
            }
            enabled={
              layerVisibility
                .flood
            }
            onClick={() =>
              toggleLayer(
                "flood",
              )
            }
          />

          <LayerToggle
            label="Drainage"
            color={
              drainageColor
            }
            enabled={
              layerVisibility
                .drainage
            }
            onClick={() =>
              toggleLayer(
                "drainage",
              )
            }
          />

          <LayerToggle
            label="Road"
            color="#ff9f1c"
            enabled={
              layerVisibility
                .road
            }
            onClick={() =>
              toggleLayer(
                "road",
              )
            }
          />

          <LayerToggle
            label="Hospitals"
            color="#d946ef"
            enabled={
              layerVisibility
                .hospitals
            }
            onClick={() =>
              toggleLayer(
                "hospitals",
              )
            }
          />

          <LayerToggle
            label="Camps"
            color="#14b8a6"
            enabled={
              layerVisibility
                .camps
            }
            onClick={() =>
              toggleLayer(
                "camps",
              )
            }
          />

        </div>

      </div>


      {/* ================================================= */}
      {/* LEGEND                                            */}
      {/* ================================================= */}

      {!isOverview && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#020915]/88 px-3 py-2 text-[9px] backdrop-blur">

          <LegendDot
            color="#ff3b5c"
            label="Severe Flood"
          />

          <LegendDot
            color="#ff9f1c"
            label="High Flood / Road"
          />

          <LegendDot
            color="#facc15"
            label="Caution Flood"
          />

          <LegendDot
            color="#22c55e"
            label="Safe Flood"
          />

          <LegendDot
            color="#06b6d4"
            label="Drainage"
          />

          <LegendDot
            color="#d946ef"
            label="Hospital"
          />

          <LegendDot
            color="#14b8a6"
            label="Camp"
          />

        </div>
      )}


      {/* ================================================= */}
      {/* DRAINAGE ACTION                                   */}
      {/* ================================================= */}

      {!isOverview &&
        onOpenDrainage &&
        layerVisibility
          .drainage && (
        <button
          type="button"
          onClick={() =>
            onOpenDrainageRef
              .current?.()
          }
          className="
            absolute
            bottom-16
            left-4
            z-20
            rounded-xl
            border
            border-cyan-400/25
            bg-[#071a33]/94
            px-4
            py-2
            text-xs
            font-semibold
            text-cyan-300
            backdrop-blur
          "
        >
          Open Drainage Intelligence
        </button>
      )}

    </div>
  );
}


/* ====================================================== */
/* MARKER VISIBILITY                                      */
/* ====================================================== */

function applyMarkerVisibility(
  markers:
    ManagedMarker[],

  visibility:
    LayerVisibility,
) {

  markers.forEach(
    (
      item,
    ) => {

      let visible =
        true;


      if (
        item.kind ===
        "flood"
      ) {
        visible =
          visibility
            .flood;
      }

      if (
        item.kind ===
        "hospital"
      ) {
        visible =
          visibility
            .hospitals;
      }

      if (
        item.kind ===
        "camp"
      ) {
        visible =
          visibility
            .camps;
      }


      item
        .marker
        .getElement()
        .style
        .display =
        visible
          ? "flex"
          : "none";
    },
  );
}


/* ====================================================== */
/* WEBGL LAYER VISIBILITY                                 */
/* ====================================================== */

function setMapLayerVisibility(
  map:
    MapLibreMap,

  layerIds:
    string[],

  visible:
    boolean,
) {

  layerIds.forEach(
    (
      layerId,
    ) => {

      if (
        !map.getLayer(
          layerId,
        )
      ) {
        return;
      }


      map.setLayoutProperty(
        layerId,
        "visibility",
        visible
          ? "visible"
          : "none",
      );
    },
  );
}


/* ====================================================== */
/* FIT                                                    */
/* ====================================================== */

function fitToLocations(
  map:
    MapLibreMap,

  locations:
    FloodScanLocation[],
) {

  const coordinates =
    locations
      .map(
        readLocationCoordinates,
      )
      .filter(
        Boolean,
      ) as {
        latitude:
          number;

        longitude:
          number;
      }[];


  if (
    coordinates.length ===
    0
  ) {

    map.easeTo({
      center:
        CHENNAI_CENTER,

      zoom:
        10.25,

      duration:
        350,
    });

    return;
  }


  if (
    coordinates.length ===
    1
  ) {

    map.easeTo({
      center: [
        coordinates[
          0
        ].longitude,

        coordinates[
          0
        ].latitude,
      ],

      zoom:
        12.8,

      duration:
        400,
    });

    return;
  }


  const first =
    coordinates[
      0
    ];


  const bounds =
    new LngLatBounds(
      [
        first
          .longitude,

        first
          .latitude,
      ],
      [
        first
          .longitude,

        first
          .latitude,
      ],
    );


  coordinates.forEach(
    (
      coordinate,
    ) => {

      bounds.extend([
        coordinate
          .longitude,

        coordinate
          .latitude,
      ]);
    },
  );


  map.fitBounds(
    bounds,
    {
      padding: {
        top:
          70,

        right:
          70,

        bottom:
          70,

        left:
          70,
      },

      duration:
        450,

      maxZoom:
        12.6,
    },
  );
}


/* ====================================================== */
/* LAYER TOGGLE                                           */
/* ====================================================== */

function LayerToggle({
  label,
  color,
  enabled,
  onClick,
}: {
  label:
    string;

  color:
    string;

  enabled:
    boolean;

  onClick:
    () => void;
}) {

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`
        flex
        min-w-0
        items-center
        justify-between
        gap-2
        rounded-xl
        border
        px-2.5
        py-2
        text-left
        transition

        ${
          enabled
            ? "border-white/10 bg-white/[0.055] text-slate-200"
            : "border-white/[0.04] bg-black/10 text-slate-600"
        }
      `}
    >

      <span className="flex min-w-0 items-center gap-2">

        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{
            backgroundColor:
              color,

            opacity:
              enabled
                ? 1
                : 0.22,

            boxShadow:
              enabled
                ? `0 0 7px ${color}`
                : "none",
          }}
        />

        <span className="truncate text-[10px] font-medium">
          {label}
        </span>

      </span>

      <span
        className={`
          text-[8px]
          font-semibold
          uppercase
          ${
            enabled
              ? "text-emerald-300"
              : "text-slate-700"
          }
        `}
      >
        {enabled
          ? "ON"
          : "OFF"}
      </span>

    </button>
  );
}


/* ====================================================== */
/* LEGEND                                                 */
/* ====================================================== */

function LegendDot({
  color,
  label,
}: {
  color:
    string;

  label:
    string;
}) {

  return (
    <span className="flex items-center gap-1.5 text-slate-400">

      <span
        className="h-2 w-2 rounded-full"
        style={{
          backgroundColor:
            color,

          boxShadow:
            `0 0 7px ${color}`,
        }}
      />

      {label}

    </span>
  );
}


export default FloodMapCanvas;
