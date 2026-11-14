import type {
  ReactNode,
} from "react";

import {
  AlertTriangle,
  CloudRain,
  Droplets,
  MapPin,
  Route,
  Users,
} from "lucide-react";

import FloodMapCanvas from "../components/map/FloodMapCanvas";

import {
  forecastData,
  type ForecastMinute,
} from "../data/demo/forecastData";

import type {
  ForecastSnapshot,
} from "../services/floodApi";

import type {
  FloodScanLocation,
} from "../services/mlApi";


/* ====================================================== */
/* PROPS                                                  */
/* ====================================================== */

type Props = {
  forecastMinutes:
    ForecastMinute;

  setForecastMinutes: (
    value:
      ForecastMinute,
  ) => void;

  forecastSnapshot:
    ForecastSnapshot;

  forecastSource:
    "demo" | "api";

  forecastLoading:
    boolean;

  affectedLocations?:
    FloodScanLocation[];

  selectedLocationId?:
    string | null;

  onOpenDrainage:
    () => void;

  onOpenRescue:
    () => void;
};


/* ====================================================== */
/* OPTIONS                                                */
/* ====================================================== */

const FORECAST_OPTIONS: {
  label:
    string;

  value:
    ForecastMinute;
}[] = [
  {
    label:
      "NOW",

    value:
      0,
  },

  {
    label:
      "+30",

    value:
      30,
  },

  {
    label:
      "+60",

    value:
      60,
  },

  {
    label:
      "+90",

    value:
      90,
  },

  {
    label:
      "+180",

    value:
      180,
  },
];


/* ====================================================== */
/* PAGE                                                   */
/* ====================================================== */

function FloodMapPage({
  forecastMinutes,
  setForecastMinutes,
  forecastSnapshot,
  forecastSource,
  forecastLoading,
  affectedLocations = [],
  selectedLocationId = null,
  onOpenDrainage,
  onOpenRescue,
}: Props) {

  const forecast =
    forecastSnapshot;

  const probability =
    Math.round(
      clamp01(
        forecast
          .probability,
      ) *
      100,
    );

  const severeCount =
    affectedLocations
      .filter(
        (
          location,
        ) =>
          location.risk ===
          "SEVERE",
      )
      .length;

  const highCount =
    affectedLocations
      .filter(
        (
          location,
        ) =>
          location.risk ===
          "HIGH",
      )
      .length;

  const selectedLocation =
    affectedLocations.find(
      (
        location,
      ) =>
        location
          .location_id ===
        selectedLocationId,
    ) ??
    affectedLocations[
      0
    ];

  const locationLabel =
    selectedLocation
      ?.zone ??
    selectedLocation
      ?.ward ??
    selectedLocation
      ?.location_id ??
    (
      forecastSource ===
        "api"
        ? "Detected Chennai Hotspot"
        : "Demo Flood Zone"
    );

  const riskStyle =
    getRiskStyle(
      forecast.risk,
    );


  return (
    <div className="space-y-5">

      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <section className="glass-panel rounded-[28px] px-6 py-5">

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

          <div>

            <p className="text-xs uppercase tracking-[0.2em] text-[#4da3ff]">
              Model 1 • Chennai Flood Scan
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Urban Flood Nowcasting Map
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Chennai-wide affected-location scan with
              risk-colored flood hotspots.
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
                ${riskStyle.container}
                ${riskStyle.text}
              `}
            >
              {locationLabel}
              {" • "}
              {forecast.risk}
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
                  forecastSource ===
                  "api"
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-400/20 bg-amber-500/10 text-amber-300"
                }
              `}
            >
              {forecastLoading
                ? "Scanning Chennai..."
                : forecastSource ===
                    "api"
                  ? "Live ML Scan"
                  : "Demo Data"}
            </span>

          </div>

        </div>

      </section>


      {/* ================================================= */}
      {/* KPI                                               */}
      {/* ================================================= */}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

        <MetricCard
          icon={
            <MapPin
              size={20}
            />
          }
          title="Affected Locations"
          value={String(
            affectedLocations
              .length,
          )}
          subtitle="Locations above scan threshold"
          danger={
            affectedLocations
              .length >
            0
          }
        />

        <MetricCard
          icon={
            <AlertTriangle
              size={20}
            />
          }
          title="Severe Hotspots"
          value={String(
            severeCount,
          )}
          subtitle={`${highCount} additional HIGH`}
          danger={
            severeCount >
            0
          }
        />

        <MetricCard
          icon={
            <Droplets
              size={20}
            />
          }
          title="Selected Depth"
          value={`${formatNumber(
            forecast.depth,
            2,
          )} cm`}
          subtitle={
            forecastMinutes ===
            0
              ? "Current estimate"
              : `Forecast +${forecastMinutes} min`
          }
          danger={
            forecast.depth >=
            40
          }
        />

        <MetricCard
          icon={
            <CloudRain
              size={20}
            />
          }
          title="Flood Probability"
          value={`${probability}%`}
          subtitle="Model 1 selected hotspot"
          danger={
            probability >=
            80
          }
        />

        <MetricCard
          icon={
            <Users
              size={20}
            />
          }
          title="People At Risk"
          value={String(
            Math.max(
              0,
              Math.round(
                forecast
                  .peopleAtRisk,
              ),
            ),
          )}
          subtitle="Operational exposure input"
        />

      </section>


      {/* ================================================= */}
      {/* MAP                                               */}
      {/* ================================================= */}

      <section className="glass-panel rounded-[30px] p-4">

        <FloodMapCanvas
          forecastMinutes={
            forecastMinutes
          }
          forecastSnapshot={
            forecastSnapshot
          }
          affectedLocations={
            affectedLocations
          }
          selectedLocationId={
            selectedLocationId
          }
          onOpenDrainage={
            onOpenDrainage
          }
          variant="analysis"
        />

      </section>


      {/* ================================================= */}
      {/* SELECTED HOTSPOT                                  */}
      {/* ================================================= */}

      <section className="grid gap-5 lg:grid-cols-[1fr_330px]">

        <div className="glass-panel rounded-[28px] p-5">

          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Selected Operational Hotspot
          </p>

          <h3 className="mt-2 text-xl font-semibold">
            {locationLabel}
          </h3>

          <div className="mt-5 grid gap-3 md:grid-cols-2">

            <InfoRow
              title="Location ID"
              value={
                selectedLocation
                  ?.location_id ??
                "Demo"
              }
            />

            <InfoRow
              title="Risk"
              value={
                forecast.risk
              }
            />

            <InfoRow
              title="Predicted Depth"
              value={`${formatNumber(
                forecast.depth,
                2,
              )} cm`}
            />

            <InfoRow
              title="Flood Probability"
              value={`${probability}%`}
            />

            <InfoRow
              title="Drain Status"
              value={
                formatStatus(
                  forecast
                    .drainStatus,
                )
              }
            />

            <InfoRow
              title="Drain Priority"
              value={
                forecast
                  .drainPriority
              }
            />

          </div>


          <div className="mt-5 rounded-2xl border border-[#007cf7]/15 bg-[#007cf7]/[0.05] p-4">

            <p className="text-xs font-medium text-[#8cc7ff]">
              Chennai-wide visualization
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Each colored point is a Model 1 scan location.
              Heat intensity shows the concentration of
              predicted flood risk. The visualization is not
              presented as an exact hydraulic inundation
              boundary.
            </p>

          </div>

        </div>


        <aside className="glass-panel rounded-[28px] p-5">

          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Operational Navigation
          </p>

          <button
            type="button"
            onClick={
              onOpenDrainage
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
              font-medium
              text-[#8cc7ff]
              hover:bg-[#007cf7]/30
            "
          >
            Open Drainage Intelligence
          </button>

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
              hover:bg-white/[0.08]
            "
          >
            Open Rescue & Evacuation
          </button>


          <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">

            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
              Drainage Diagnosis
            </p>

            <p className="mt-2 text-lg font-semibold">
              {forecast
                .drainPriority}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {formatStatus(
                forecast
                  .drainStatus,
              )}
              {" • "}
              {formatNumber(
                forecast
                  .drainLoadPercent,
                1,
              )}
              % load
            </p>

          </div>

        </aside>

      </section>


      {/* ================================================= */}
      {/* FORECAST                                         */}
      {/* ================================================= */}

      <section className="glass-panel rounded-[28px] px-6 py-5">

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

          <div>

            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Forecast Horizon
            </p>

            <p className="mt-1 text-sm text-slate-300">
              Changing the horizon re-runs the active custom
              scenario after the first FloodTwin run.
            </p>

          </div>


          <div className="flex flex-wrap gap-2">

            {FORECAST_OPTIONS.map(
              (
                item,
              ) => (
                <button
                  key={
                    item.value
                  }
                  type="button"
                  disabled={
                    forecastLoading
                  }
                  onClick={() =>
                    setForecastMinutes(
                      item.value,
                    )
                  }
                  className={`
                    rounded-xl
                    border
                    px-4
                    py-2
                    text-sm
                    ${
                      forecastMinutes ===
                      item.value
                        ? "border-[#007cf7]/40 bg-[#007cf7]/25 text-[#8cc7ff]"
                        : "border-white/10 bg-white/[0.03] text-slate-500"
                    }
                  `}
                >
                  {
                    item.label
                  }
                </button>
              ),
            )}

          </div>

        </div>


        <div className="mt-5 grid gap-3 md:grid-cols-5">

          {FORECAST_OPTIONS.map(
            (
              item,
            ) => {

              const selected =
                item.value ===
                forecastMinutes;

              const data =
                selected &&
                forecastSource ===
                  "api"
                  ? {
                      depth:
                        forecast
                          .depth,

                      risk:
                        forecast
                          .risk,
                    }
                  : forecastData[
                      item.value
                    ];

              const style =
                getRiskStyle(
                  data.risk,
                );

              return (
                <div
                  key={
                    item.value
                  }
                  className={`
                    rounded-2xl
                    border
                    p-4
                    ${
                      selected
                        ? "border-[#007cf7]/25 bg-[#007cf7]/10"
                        : "border-white/[0.05] bg-white/[0.02]"
                    }
                  `}
                >

                  <p className="text-xs text-slate-500">
                    {
                      item.label
                    }
                  </p>

                  <p className="mt-2 text-xl font-semibold">
                    {formatNumber(
                      data.depth,
                      2,
                    )} cm
                  </p>

                  <p
                    className={`
                      mt-1
                      text-xs
                      ${style.text}
                    `}
                  >
                    {
                      data.risk
                    }
                  </p>

                </div>
              );
            },
          )}

        </div>

      </section>


      {/* ================================================= */}
      {/* LEGEND                                            */}
      {/* ================================================= */}

      <section className="glass-panel rounded-[24px] px-5 py-4">

        <div className="flex flex-wrap items-center gap-5">

          <Legend
            color="#22c55e"
            label="Safe"
          />

          <Legend
            color="#facc15"
            label="Caution"
          />

          <Legend
            color="#ff9f1c"
            label="High"
          />

          <Legend
            color="#ff3b5c"
            label="Severe"
          />

          <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <Route
              size={14}
            />
            Model-derived prototype decision support
          </span>

        </div>

      </section>

    </div>
  );
}


/* ====================================================== */
/* COMPONENTS                                             */
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


function InfoRow({
  title,
  value,
}: {
  title:
    string;

  value:
    string;
}) {

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">

      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-200">
        {value}
      </p>

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
    <div className="flex items-center gap-2 text-xs text-slate-400">

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


function getRiskStyle(
  risk:
    string,
) {

  switch (
    risk
  ) {

    case "SAFE":
      return {
        container:
          "border-emerald-400/20 bg-emerald-500/10",

        text:
          "text-emerald-300",
      };

    case "CAUTION":
      return {
        container:
          "border-yellow-400/20 bg-yellow-500/10",

        text:
          "text-yellow-300",
      };

    case "HIGH":
      return {
        container:
          "border-orange-400/20 bg-orange-500/10",

        text:
          "text-orange-300",
      };

    case "SEVERE":
      return {
        container:
          "border-red-400/20 bg-red-500/10",

        text:
          "text-red-300",
      };

    default:
      return {
        container:
          "border-[#007cf7]/20 bg-[#007cf7]/10",

        text:
          "text-[#4da3ff]",
      };
  }
}


export default FloodMapPage;
