import type {
  ReactNode,
} from "react";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Droplets,
  Gauge,
  ShieldAlert,
} from "lucide-react";

import {
  type ForecastMinute,
} from "../data/demo/forecastData";

import type {
  ForecastSnapshot,
} from "../services/floodApi";

import type {
  DrainageSnapshot,
} from "../services/drainageApi";

/* ====================================================== */
/* PROPS                                                  */
/* ====================================================== */

type Props = {
  forecastMinutes:
    ForecastMinute;

  forecastSnapshot:
    ForecastSnapshot;

  drainageSnapshot:
    DrainageSnapshot;

  drainageSource:
    "demo" | "api";

  drainageLoading:
    boolean;

  onBack:
    () => void;
};

/* ====================================================== */
/* PAGE                                                   */
/* ====================================================== */

function DrainageIntelligencePage({
  forecastMinutes,
  forecastSnapshot,
  drainageSnapshot,
  drainageSource,
  drainageLoading,
  onBack,
}: Props) {
  /* ==================================================== */
  /* DERIVED VALUES                                       */
  /* ==================================================== */

  const anomalyPercent =
    Math.round(
      drainageSnapshot
        .anomalyProbability *
        100,
    );

  const confidencePercent =
    Math.round(
      drainageSnapshot
        .confidence *
        100,
    );

  const status =
    formatStatus(
      drainageSnapshot
        .status,
    );

  const statusStyle =
    getDrainStatusStyle(
      drainageSnapshot
        .status,
    );

  const floodProbability =
    Math.round(
      forecastSnapshot
        .probability *
        100,
    );

  const designedCapacityExceeded =
    Math.max(
      drainageSnapshot
        .loadPercent -
        100,
      0,
    );

  /* ==================================================== */
  /* UI                                                   */
  /* ==================================================== */

  return (
    <div className="space-y-5">

      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <section
        className="
          glass-panel
          rounded-[28px]
          px-6
          py-5
        "
      >
        <div
          className="
            flex
            flex-col
            gap-4
            md:flex-row
            md:items-center
            md:justify-between
          "
        >
          <div
            className="
              flex
              items-center
              gap-4
            "
          >
            <button
              type="button"
              onClick={
                onBack
              }
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-2xl
                border
                border-[#007cf7]/20
                bg-[#007cf7]/10
                text-[#4da3ff]
                transition-all
                hover:border-[#007cf7]/35
                hover:bg-[#007cf7]/20
              "
            >
              <ArrowLeft
                size={20}
              />
            </button>

            <div>
              <p
                className="
                  text-xs
                  uppercase
                  tracking-[0.2em]
                  text-[#4da3ff]
                "
              >
                FloodTwin AI
              </p>

              <h2
                className="
                  mt-1
                  text-2xl
                  font-semibold
                "
              >
                Drainage Intelligence
              </h2>

              <p
                className="
                  mt-1
                  text-sm
                  text-slate-400
                "
              >
                Drain anomaly diagnosis
                and response prioritization
              </p>
            </div>
          </div>

          {/* DATA SOURCE */}

          <div
            className={`
              rounded-full
              border
              px-4
              py-2
              text-xs
              uppercase
              tracking-[0.14em]

              ${
                drainageSource ===
                "api"
                  ? `
                    border-emerald-400/20
                    bg-emerald-500/10
                    text-emerald-300
                  `
                  : `
                    border-amber-400/20
                    bg-amber-400/10
                    text-amber-300
                  `
              }
            `}
          >
            {drainageLoading
              ? "Analyzing D17..."
              : drainageSource ===
                  "api"
                ? "Backend API • Drainage Model"
                : "Demo Simulation Data"}
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* D17 SUMMARY                                       */}
      {/* ================================================= */}

      <section
        className="
          glass-panel
          rounded-[28px]
          p-6
        "
      >
        <div
          className="
            flex
            flex-col
            gap-5
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >
          <div>
            <p
              className="
                text-xs
                uppercase
                tracking-[0.2em]
                text-slate-500
              "
            >
              Selected Drain
            </p>

            <div
              className="
                mt-2
                flex
                items-center
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  bg-[#007cf7]/15
                  text-[#4da3ff]
                "
              >
                <Droplets
                  size={24}
                />
              </div>

              <div>
                <h3
                  className="
                    text-3xl
                    font-semibold
                  "
                >
                  {
                    drainageSnapshot
                      .drainId
                  }
                </h3>

                <p
                  className="
                    text-sm
                    text-slate-400
                  "
                >
                  Velachery •
                  Catchment C01
                </p>
              </div>
            </div>
          </div>

          {/* DIAGNOSIS BADGE */}

          <div
            className={`
              rounded-2xl
              border
              px-5
              py-4

              ${statusStyle.container}
            `}
          >
            <p
              className="
                text-xs
                uppercase
                tracking-[0.15em]
                text-slate-400
              "
            >
              Current Diagnosis
            </p>

            <p
              className={`
                mt-1
                text-lg
                font-semibold

                ${statusStyle.text}
              `}
            >
              {drainageLoading
                ? "Analyzing..."
                : status}
            </p>

            <p
              className="
                mt-1
                text-xs
                text-slate-400
              "
            >
              Forecast{" "}
              {forecastMinutes ===
              0
                ? "NOW"
                : `+${forecastMinutes} min`}
            </p>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* METRICS                                           */}
      {/* ================================================= */}

      <section
        className="
          grid
          gap-4
          md:grid-cols-2
          xl:grid-cols-4
        "
      >
        <DrainMetric
          icon={
            <Gauge
              size={21}
            />
          }
          title="Drain Load"
          value={`${drainageSnapshot.loadPercent}%`}
          subtitle="Relative to designed capacity"
          danger={
            drainageSnapshot
              .loadPercent >=
            100
          }
        />

        <DrainMetric
          icon={
            <AlertTriangle
              size={21}
            />
          }
          title="Anomaly Probability"
          value={`${anomalyPercent}%`}
          subtitle="Possible blockage / anomaly"
          danger={
            anomalyPercent >=
            70
          }
        />

        <DrainMetric
          icon={
            <ShieldAlert
              size={21}
            />
          }
          title="Response Priority"
          value={
            drainageSnapshot
              .priority
          }
          subtitle="Operational priority"
          danger={
            drainageSnapshot
              .priority ===
            "P1"
          }
        />

        <DrainMetric
          icon={
            <Activity
              size={21}
            />
          }
          title="Confidence"
          value={`${confidencePercent}%`}
          subtitle={
            drainageSource ===
            "api"
              ? "Backend analysis confidence"
              : "Demo confidence"
          }
        />
      </section>

      {/* ================================================= */}
      {/* MAIN DIAGNOSIS                                    */}
      {/* ================================================= */}

      <section
        className="
          grid
          gap-5
          xl:grid-cols-[1.25fr_0.75fr]
        "
      >
        {/* ================================================= */}
        {/* LEFT                                              */}
        {/* ================================================= */}

        <div
          className="
            glass-panel
            rounded-[28px]
            p-6
          "
        >
          <div>
            <p
              className="
                text-xs
                uppercase
                tracking-[0.2em]
                text-slate-500
              "
            >
              Hydraulic Diagnosis
            </p>

            <h3
              className="
                mt-2
                text-xl
                font-semibold
              "
            >
              D17 Condition Analysis
            </h3>

            <p
              className="
                mt-2
                text-sm
                text-slate-500
              "
            >
              Coupled view of
              forecast flooding and
              drainage condition.
            </p>
          </div>

          <div
            className="
              mt-6
              space-y-4
            "
          >
            <DiagnosisRow
              title="Drain Status"
              value={
                status
              }
            />

            <DiagnosisRow
              title="Load vs Capacity"
              value={`${drainageSnapshot.loadPercent}%`}
            />

            <DiagnosisRow
              title="Nearby Flood Depth"
              value={`${forecastSnapshot.depth} cm`}
            />

            <DiagnosisRow
              title="Flood Probability"
              value={`${floodProbability}%`}
            />

            <DiagnosisRow
              title="Anomaly Probability"
              value={`${anomalyPercent}%`}
            />

            <DiagnosisRow
              title="Response Priority"
              value={
                drainageSnapshot
                  .priority
              }
            />

            <DiagnosisRow
              title="Confidence"
              value={`${confidencePercent}%`}
            />
          </div>

          {/* ================================================= */}
          {/* CAPACITY BAR                                      */}
          {/* ================================================= */}

          <div
            className="
              mt-7
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
              "
            >
              <p
                className="
                  text-sm
                  text-slate-400
                "
              >
                Drain Load
              </p>

              <p
                className={
                  drainageSnapshot
                    .loadPercent >=
                  100
                    ? "font-semibold text-red-300"
                    : drainageSnapshot
                          .loadPercent >=
                        85
                      ? "font-semibold text-orange-300"
                      : "font-semibold text-[#8cc7ff]"
                }
              >
                {
                  drainageSnapshot
                    .loadPercent
                }
                %
              </p>
            </div>

            <div
              className="
                mt-3
                h-3
                overflow-hidden
                rounded-full
                bg-white/5
              "
            >
              <div
                className={`
                  h-full
                  rounded-full
                  transition-all
                  duration-500

                  ${
                    drainageSnapshot
                      .loadPercent >=
                    100
                      ? "bg-red-500"
                      : drainageSnapshot
                            .loadPercent >=
                          85
                        ? "bg-orange-400"
                        : "bg-[#007cf7]"
                  }
                `}
                style={{
                  width:
                    `${Math.min(
                      drainageSnapshot
                        .loadPercent,
                      100,
                    )}%`,
                }}
              />
            </div>

            {designedCapacityExceeded >
              0 && (
              <div
                className="
                  mt-3
                  rounded-xl
                  border
                  border-red-400/10
                  bg-red-500/[0.05]
                  px-3
                  py-2
                "
              >
                <p
                  className="
                    text-xs
                    text-red-300
                  "
                >
                  Designed capacity
                  exceeded by{" "}
                  {
                    designedCapacityExceeded
                  }
                  %.
                </p>
              </div>
            )}

            {drainageSnapshot
              .loadPercent <
              100 && (
              <p
                className="
                  mt-3
                  text-xs
                  text-slate-500
                "
              >
                Drain remains below
                nominal capacity but
                should continue to be
                monitored.
              </p>
            )}
          </div>
        </div>

        {/* ================================================= */}
        {/* RIGHT                                             */}
        {/* ================================================= */}

        <div
          className="
            space-y-5
          "
        >
          {/* =============================================== */}
          {/* LIKELY CAUSE                                    */}
          {/* =============================================== */}

          <div
            className="
              glass-panel
              rounded-[28px]
              p-6
            "
          >
            <p
              className="
                text-xs
                uppercase
                tracking-[0.2em]
                text-slate-500
              "
            >
              Likely Cause
            </p>

            <div
              className={`
                mt-4
                rounded-2xl
                border
                p-4

                ${
                  drainageSnapshot
                    .priority ===
                  "P1"
                    ? `
                      border-red-400/15
                      bg-red-500/[0.06]
                    `
                    : `
                      border-orange-400/15
                      bg-orange-500/[0.05]
                    `
                }
              `}
            >
              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >
                <AlertTriangle
                  className={
                    drainageSnapshot
                      .priority ===
                    "P1"
                      ? "mt-0.5 shrink-0 text-red-300"
                      : "mt-0.5 shrink-0 text-orange-300"
                  }
                  size={21}
                />

                <div>
                  <p
                    className={
                      drainageSnapshot
                        .priority ===
                      "P1"
                        ? "font-semibold text-red-200"
                        : "font-semibold text-orange-200"
                    }
                  >
                    {getDiagnosisTitle(
                      drainageSnapshot
                        .status,
                    )}
                  </p>

                  <p
                    className="
                      mt-2
                      text-sm
                      leading-6
                      text-slate-400
                    "
                  >
                    {
                      drainageSnapshot
                        .likelyCause
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* SUPPORTING EVIDENCE */}

            <div
              className="
                mt-4
                grid
                grid-cols-2
                gap-3
              "
            >
              <EvidenceCard
                title="Nearby Depth"
                value={`${forecastSnapshot.depth} cm`}
              />

              <EvidenceCard
                title="Flood Probability"
                value={`${floodProbability}%`}
              />

              <EvidenceCard
                title="Drain Load"
                value={`${drainageSnapshot.loadPercent}%`}
              />

              <EvidenceCard
                title="Anomaly"
                value={`${anomalyPercent}%`}
              />
            </div>
          </div>

          {/* =============================================== */}
          {/* RESPONSE                                        */}
          {/* =============================================== */}

          <div
            className="
              glass-panel
              rounded-[28px]
              p-6
            "
          >
            <p
              className="
                text-xs
                uppercase
                tracking-[0.2em]
                text-slate-500
              "
            >
              Recommended Response
            </p>

            <h3
              className="
                mt-2
                text-lg
                font-semibold
              "
            >
              D17 Field Action Plan
            </h3>

            <div
              className="
                mt-4
                rounded-2xl
                border
                border-[#007cf7]/15
                bg-[#007cf7]/[0.05]
                p-4
              "
            >
              <p
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.14em]
                  text-[#4da3ff]
                "
              >
                Primary Recommendation
              </p>

              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-slate-300
                "
              >
                {
                  drainageSnapshot
                    .recommendedAction
                }
              </p>
            </div>

            <div
              className="
                mt-4
                space-y-3
              "
            >
              <ResponseItem
                priority="1"
                text="Dispatch field team to inspect D17"
              />

              <ResponseItem
                priority="2"
                text={
                  drainageSnapshot
                    .status ===
                  "PROBABLE_BLOCKAGE"
                    ? "Clear suspected obstruction if field verification confirms blockage"
                    : "Verify inlet, outfall and local conveyance condition"
                }
              />

              <ResponseItem
                priority="3"
                text={
                  drainageSnapshot
                    .loadPercent >=
                  100
                    ? "Prepare Pump P2 near the affected drainage segment"
                    : "Keep Pump P2 on standby if drainage stress increases"
                }
              />

              <ResponseItem
                priority="4"
                text="Monitor Road R12 and restrict traffic if flood depth rises"
              />
            </div>

            <div
              className="
                mt-5
                rounded-2xl
                border
                border-amber-400/10
                bg-amber-400/[0.04]
                px-4
                py-3
              "
            >
              <p
                className="
                  text-xs
                  leading-5
                  text-amber-200/80
                "
              >
                Drainage diagnosis
                supports response
                prioritization only.
                Field verification is
                required before
                operational action.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ====================================================== */
/* DRAIN METRIC                                           */
/* ====================================================== */

function DrainMetric({
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
    <article
      className="
        glass-card
        rounded-[24px]
        p-5
      "
    >
      <div
        className="
          flex
          items-start
          justify-between
        "
      >
        <div>
          <p
            className="
              text-xs
              uppercase
              tracking-[0.14em]
              text-slate-500
            "
          >
            {title}
          </p>

          <p
            className={`
              mt-3
              text-3xl
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

          <p
            className="
              mt-1
              text-sm
              text-slate-400
            "
          >
            {subtitle}
          </p>
        </div>

        <div
          className={`
            rounded-2xl
            p-3

            ${
              danger
                ? `
                  bg-red-500/10
                  text-red-300
                `
                : `
                  bg-[#007cf7]/15
                  text-[#4da3ff]
                `
            }
          `}
        >
          {icon}
        </div>
      </div>
    </article>
  );
}

/* ====================================================== */
/* DIAGNOSIS ROW                                          */
/* ====================================================== */

function DiagnosisRow({
  title,
  value,
}: {
  title:
    string;

  value:
    string;
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-4
        border-b
        border-white/10
        pb-4
      "
    >
      <span
        className="
          text-sm
          text-slate-400
        "
      >
        {title}
      </span>

      <span
        className="
          text-right
          font-medium
          text-slate-100
        "
      >
        {value}
      </span>
    </div>
  );
}

/* ====================================================== */
/* RESPONSE ITEM                                          */
/* ====================================================== */

function ResponseItem({
  priority,
  text,
}: {
  priority:
    string;

  text:
    string;
}) {
  return (
    <div
      className="
        flex
        items-center
        gap-3
        rounded-2xl
        border
        border-white/5
        bg-white/[0.03]
        p-3
      "
    >
      <div
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-[#007cf7]/15
          text-xs
          font-semibold
          text-[#8cc7ff]
        "
      >
        {priority}
      </div>

      <p
        className="
          text-sm
          text-slate-300
        "
      >
        {text}
      </p>
    </div>
  );
}

/* ====================================================== */
/* EVIDENCE CARD                                          */
/* ====================================================== */

function EvidenceCard({
  title,
  value,
}: {
  title:
    string;

  value:
    string;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-white/5
        bg-white/[0.025]
        p-3
      "
    >
      <p
        className="
          text-[10px]
          uppercase
          tracking-[0.12em]
          text-slate-500
        "
      >
        {title}
      </p>

      <p
        className="
          mt-2
          text-lg
          font-semibold
          text-slate-200
        "
      >
        {value}
      </p>
    </div>
  );
}

/* ====================================================== */
/* HELPERS                                                */
/* ====================================================== */

function formatStatus(
  value: string,
) {
  return value
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
        character.toUpperCase(),
    );
}

/* ====================================================== */
/* DIAGNOSIS TITLE                                        */
/* ====================================================== */

function getDiagnosisTitle(
  status: string,
) {
  switch (
    status
  ) {
    case "PROBABLE_BLOCKAGE":
      return "Probable drainage obstruction";

    case "OVERLOADED":
      return "Hydraulic capacity overload";

    case "STRESSED":
      return "Elevated drainage stress";

    case "NORMAL":
      return "Drainage operating normally";

    default:
      return "Drainage condition requires review";
  }
}

/* ====================================================== */
/* STATUS STYLE                                           */
/* ====================================================== */

function getDrainStatusStyle(
  status: string,
) {
  switch (
    status
  ) {
    case "NORMAL":
      return {
        container:
          "border-emerald-400/20 bg-emerald-500/10",

        text:
          "text-emerald-300",
      };

    case "STRESSED":
      return {
        container:
          "border-yellow-400/20 bg-yellow-500/10",

        text:
          "text-yellow-300",
      };

    case "OVERLOADED":
      return {
        container:
          "border-orange-400/20 bg-orange-500/10",

        text:
          "text-orange-300",
      };

    case "PROBABLE_BLOCKAGE":
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

export default DrainageIntelligencePage;