import type {
  ReactNode,
} from "react";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  MapPin,
  Route,
  ShieldCheck,
  TentTree,
  Users,
} from "lucide-react";

import type {
  ForecastMinute,
} from "../data/demo/forecastData";

import type {
  ForecastSnapshot,
} from "../services/floodApi";

import type {
  RiskSnapshot,
} from "../services/riskApi";

import type {
  CampAllocation,
  EvacuationSnapshot,
} from "../services/evacuationApi";


/* ====================================================== */
/* PROPS                                                  */
/* ====================================================== */

type Props = {
  forecastMinutes:
    ForecastMinute;

  forecastSnapshot:
    ForecastSnapshot;

  riskSnapshot:
    RiskSnapshot;

  evacuationSnapshot:
    EvacuationSnapshot;

  evacuationSource:
    "demo" | "api";

  evacuationLoading:
    boolean;

  onOpenRoutes:
    () => void;

  onOpenFlood:
    () => void;
};


/* ====================================================== */
/* PAGE                                                   */
/* ====================================================== */

function RescueEvacuationPage({
  forecastMinutes,
  forecastSnapshot,
  riskSnapshot,
  evacuationSnapshot,
  evacuationSource,
  evacuationLoading,
  onOpenRoutes,
  onOpenFlood,
}: Props) {

  /* ==================================================== */
  /* DYNAMIC LOCATION                                     */
  /* ==================================================== */

  const zoneId =
    evacuationSnapshot.zoneId ||
    riskSnapshot.zoneId ||
    "Affected Location";

  /* ==================================================== */
  /* RISK                                                 */
  /* ==================================================== */

  const severe =
    riskSnapshot.riskLevel ===
    "SEVERE";

  const highRisk =
    riskSnapshot.riskLevel ===
      "HIGH" ||
    severe;

  const roadUnsafe =
    riskSnapshot
      .roadRestrictionRequired;

  const roadRisk =
    riskSnapshot
      .roadRisk ??
    (
      roadUnsafe
        ? "UNSAFE"
        : highRisk
          ? "CAUTION"
          : "SAFE"
    );

  const roadRiskProbability =
    riskSnapshot
      .roadRiskProbability;

  /* ==================================================== */
  /* EVACUATION MODEL 5                                   */
  /* ==================================================== */

  const evacuationRequired =
    evacuationSnapshot
      .evacuationRequired;

  const peopleToEvacuate =
    Math.max(
      evacuationSnapshot
        .peopleToEvacuate,
      0,
    );

  const population =
    evacuationSnapshot
      .population ??
    forecastSnapshot
      .peopleAtRisk;

  const evacuationRatioPercent =
    evacuationSnapshot
      .evacuationRatioPercent ??
    (
      population >
      0
        ? (
            peopleToEvacuate /
            population
          ) *
          100
        : 0
    );

  const priority =
    evacuationSnapshot
      .priority ??
    riskSnapshot.priority;

  /* ==================================================== */
  /* SHELTER                                              */
  /* ==================================================== */

  const primaryShelter =
    evacuationSnapshot
      .primaryCamp ||
    evacuationSnapshot
      .campAllocations[
        0
      ]?.campName ||
    "Nearest mapped candidate shelter";

  const secondaryShelter =
    evacuationSnapshot
      .secondaryCamp ||
    "";

  const shelterDistance =
    evacuationSnapshot
      .nearestShelterDistanceKm;

  /* ==================================================== */
  /* CAPACITY                                             */
  /* ==================================================== */

  const totalCapacity =
    Math.max(
      evacuationSnapshot
        .totalCapacity,
      0,
    );

  const allocated =
    Math.max(
      evacuationSnapshot
        .allocatedPeople,
      0,
    );

  const unallocated =
    Math.max(
      evacuationSnapshot
        .unallocatedPeople,
      0,
    );

  const capacityRemaining =
    Math.max(
      totalCapacity -
        allocated,
      0,
    );

  const hasCapacityData =
    totalCapacity >
      0 &&
    evacuationSnapshot
      .campAllocations
      .length >
      0;

  const readiness =
    hasCapacityData
      ? Math.max(
          0,
          Math.min(
            100,
            evacuationSnapshot
              .readinessPercent,
          ),
        )
      : 0;

  /* ==================================================== */
  /* OPERATIONAL STATUS                                   */
  /* ==================================================== */

  const hospitalStatus =
    severe
      ? "ACCESS THREATENED"
      : highRisk
        ? "MONITORED"
        : "ACCESSIBLE";

  const evacuationStatus =
    formatStatus(
      evacuationSnapshot.status,
    );

  const riskScore =
    Number.isFinite(
      riskSnapshot
        .riskScore,
    )
      ? Number(
          riskSnapshot
            .riskScore,
        ).toFixed(
          1,
        )
      : "0.0";

  /* ==================================================== */
  /* UI                                                   */
  /* ==================================================== */

  return (
    <div className="space-y-5">

      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <section className="glass-panel rounded-[28px] px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#4da3ff]">
              Model 3 + Model 5
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Rescue & Evacuation
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Hotspot priority, evacuation demand,
              shelter context and route readiness.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <div
              className={`
                rounded-full
                border
                px-4
                py-2
                text-xs
                font-medium
                ${
                  severe
                    ? "border-red-400/20 bg-red-500/10 text-red-300"
                    : highRisk
                      ? "border-orange-400/20 bg-orange-500/10 text-orange-300"
                      : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                }
              `}
            >
              {zoneId}
              {" • "}
              {riskSnapshot.riskLevel}
              {" • "}
              {priority}
            </div>

            <div
              className={`
                rounded-full
                border
                px-4
                py-2
                text-xs
                uppercase
                tracking-[0.12em]
                ${
                  evacuationSource ===
                  "api"
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-400/15 bg-amber-400/5 text-amber-300"
                }
              `}
            >
              {evacuationLoading
                ? "Running Model 5..."
                : evacuationSource ===
                    "api"
                  ? "Live ML • Evacuation Demand"
                  : "Demo Scenario"}
            </div>

          </div>
        </div>
      </section>


      {/* ================================================= */}
      {/* EVACUATION DECISION                               */}
      {/* ================================================= */}

      <section
        className={`
          rounded-[28px]
          border
          p-5
          ${
            evacuationRequired
              ? "border-red-400/15 bg-red-500/[0.045]"
              : "border-emerald-400/15 bg-emerald-500/[0.04]"
          }
        `}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div className="flex items-start gap-4">

            <div
              className={`
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-2xl
                ${
                  evacuationRequired
                    ? "bg-red-500/10 text-red-300"
                    : "bg-emerald-500/10 text-emerald-300"
                }
              `}
            >
              {evacuationRequired ? (
                <AlertTriangle
                  size={23}
                />
              ) : (
                <ShieldCheck
                  size={23}
                />
              )}
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                Evacuation Decision
              </p>

              <h3
                className={`
                  mt-1
                  text-xl
                  font-semibold
                  ${
                    evacuationRequired
                      ? "text-red-200"
                      : "text-emerald-200"
                  }
                `}
              >
                {evacuationRequired
                  ? `${peopleToEvacuate} people recommended for evacuation`
                  : "Evacuation not currently required"}
              </h3>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                {riskSnapshot.reason}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 px-5 py-3">

            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
              Hotspot Priority Score
            </p>

            <p className="mt-1 text-2xl font-semibold text-[#8cc7ff]">
              {riskScore}
            </p>

            {riskSnapshot
              .confidencePercent !=
              null && (
              <p className="mt-1 text-xs text-slate-500">
                Model confidence{" "}
                {Math.round(
                  riskSnapshot
                    .confidencePercent,
                )}
                %
              </p>
            )}

          </div>

        </div>
      </section>


      {/* ================================================= */}
      {/* SITUATION STRIP                                   */}
      {/* ================================================= */}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">

        <SituationCard
          icon={
            <MapPin
              size={18}
            />
          }
          title="Affected Location"
          value={zoneId}
          subtitle={
            forecastMinutes ===
            0
              ? "Current assessment"
              : `Forecast +${forecastMinutes} min`
          }
        />

        <SituationCard
          icon={
            <Building2
              size={18}
            />
          }
          title="Nearby Healthcare"
          value={hospitalStatus}
          subtitle="OSM healthcare context"
          danger={severe}
        />

        <SituationCard
          icon={
            <Route
              size={18}
            />
          }
          title="Road Risk"
          value={formatStatus(
            roadRisk,
          )}
          subtitle={
            roadRiskProbability !=
            null
              ? `${Math.round(
                  roadRiskProbability *
                    100,
                )}% Model 4 risk probability`
              : "Model 4 road assessment"
          }
          danger={roadUnsafe}
        />

        <SituationCard
          icon={
            <TentTree
              size={18}
            />
          }
          title="Nearest Shelter"
          value={primaryShelter}
          subtitle={
            shelterDistance !=
            null
              ? `${shelterDistance.toFixed(
                  2,
                )} km away`
              : "Mapped candidate shelter"
          }
        />

      </section>


      {/* ================================================= */}
      {/* EVACUATION KPI                                    */}
      {/* ================================================= */}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        <MetricCard
          icon={
            <Users
              size={20}
            />
          }
          title="Evacuation Demand"
          value={String(
            peopleToEvacuate,
          )}
          subtitle={`Model 5 • ${priority}`}
          danger={
            evacuationRequired
          }
        />

        <MetricCard
          icon={
            <Users
              size={20}
            />
          }
          title="Population Context"
          value={String(
            population,
          )}
          subtitle="Population input to Model 5"
        />

        <MetricCard
          icon={
            <AlertTriangle
              size={20}
            />
          }
          title="Evacuation Ratio"
          value={`${evacuationRatioPercent.toFixed(
            1,
          )}%`}
          subtitle="Predicted demand ratio"
          danger={
            evacuationRatioPercent >=
            70
          }
        />

        <MetricCard
          icon={
            <TentTree
              size={20}
            />
          }
          title="Shelter Capacity"
          value={
            hasCapacityData
              ? String(
                  totalCapacity,
                )
              : "Not validated"
          }
          subtitle={
            hasCapacityData
              ? `${capacityRemaining} remaining`
              : "Candidate shelter mapped; capacity unavailable"
          }
        />

      </section>


      {/* ================================================= */}
      {/* SHELTER + READINESS                               */}
      {/* ================================================= */}

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">

        <div className="glass-panel rounded-[28px] p-5">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Shelter Context
              </p>

              <h3 className="mt-1 text-lg font-semibold">
                Evacuation Destination
              </h3>
            </div>

            <span className="rounded-full border border-[#007cf7]/15 bg-[#007cf7]/10 px-3 py-2 text-xs text-[#8cc7ff]">
              {evacuationSnapshot.source ===
              "model5"
                ? "Model 5 + OSM Context"
                : evacuationSource ===
                    "api"
                  ? "Backend Context"
                  : "Demo Context"}
            </span>

          </div>


          {/* ============================================= */}
          {/* CAPACITY AVAILABLE                            */}
          {/* ============================================= */}

          {evacuationSnapshot
            .campAllocations
            .length >
          0 ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">

              {evacuationSnapshot
                .campAllocations
                .map(
                  (
                    camp,
                  ) => (
                    <CampCard
                      key={
                        camp.campId
                      }
                      camp={
                        camp
                      }
                      recommended={
                        camp.campName ===
                        primaryShelter
                      }
                    />
                  ),
                )}

            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-[#007cf7]/15 bg-[#007cf7]/[0.04] p-5">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                  <TentTree
                    size={21}
                  />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    Candidate Shelter
                  </p>

                  <h4 className="mt-2 text-lg font-semibold text-slate-100">
                    {primaryShelter}
                  </h4>

                  <p className="mt-2 text-sm text-slate-400">
                    {shelterDistance !=
                    null
                      ? `${shelterDistance.toFixed(
                          3,
                        )} km from the selected affected location.`
                      : "Nearest mapped candidate shelter from the available infrastructure context."}
                  </p>

                  <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-4 py-3 text-xs leading-5 text-amber-200">
                    Shelter capacity has not been validated in the current data source,
                    so FloodTwin does not fabricate an allocation capacity.
                  </div>
                </div>

              </div>
            </div>
          )}


          {/* ============================================= */}
          {/* CAPACITY STATUS                               */}
          {/* ============================================= */}

          {hasCapacityData &&
            unallocated >
              0 && (
              <div className="mt-5 flex gap-3 rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-4">

                <AlertTriangle
                  size={20}
                  className="mt-0.5 shrink-0 text-red-300"
                />

                <div>
                  <p className="text-sm font-semibold text-red-200">
                    Shelter capacity shortfall
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {unallocated} people remain
                    unallocated to the currently
                    configured shelter capacity.
                  </p>
                </div>

              </div>
            )}

          {hasCapacityData &&
            evacuationRequired &&
            unallocated ===
              0 && (
              <div className="mt-5 flex gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4">

                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-emerald-300"
                />

                <div>
                  <p className="text-sm font-semibold text-emerald-200">
                    Configured capacity covers demand
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {allocated} evacuees can be
                    assigned using the currently
                    configured shelter capacities.
                  </p>
                </div>

              </div>
            )}

        </div>


        {/* ================================================= */}
        {/* READINESS                                         */}
        {/* ================================================= */}

        <aside className="glass-panel rounded-[28px] p-5">

          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Operational Readiness
          </p>

          <div className="mt-5">

            {hasCapacityData ? (
              <>
                <p
                  className={`
                    text-5xl
                    font-semibold
                    ${
                      readiness >=
                      100
                        ? "text-emerald-300"
                        : readiness >=
                            70
                          ? "text-orange-300"
                          : "text-red-300"
                    }
                  `}
                >
                  {Math.round(
                    readiness,
                  )}
                  %
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  Evacuation demand assigned to
                  configured shelter capacity
                </p>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/5">

                  <div
                    className={`
                      h-full
                      rounded-full
                      transition-all
                      duration-700
                      ${
                        readiness >=
                        100
                          ? "bg-emerald-400"
                          : readiness >=
                              70
                            ? "bg-orange-400"
                            : "bg-red-500"
                      }
                    `}
                    style={{
                      width:
                        `${readiness}%`,
                    }}
                  />

                </div>
              </>
            ) : (
              <>
                <p className="text-3xl font-semibold text-amber-300">
                  Capacity Pending
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Model 5 has produced evacuation
                  demand, but validated emergency
                  shelter capacity is not available
                  in the current infrastructure data.
                </p>
              </>
            )}

          </div>


          <div className="mt-5 space-y-3">

            <StatusRow
              title="Plan Status"
              value={
                evacuationStatus
              }
              warning={
                hasCapacityData &&
                unallocated >
                  0
              }
            />

            <StatusRow
              title="Affected Location"
              value={
                zoneId
              }
            />

            <StatusRow
              title="Model 5 Priority"
              value={
                priority
              }
              warning={
                priority ===
                  "CRITICAL" ||
                priority ===
                  "HIGH"
              }
            />

            <StatusRow
              title="Primary Shelter"
              value={
                primaryShelter
              }
            />

            {secondaryShelter && (
              <StatusRow
                title="Secondary Shelter"
                value={
                  secondaryShelter
                }
              />
            )}

            <StatusRow
              title="Road Assessment"
              value={
                roadUnsafe
                  ? "Avoid unsafe segments"
                  : "Lowest-risk corridor"
              }
              warning={
                roadUnsafe
              }
            />

          </div>


          {/* ============================================= */}
          {/* ROUTE STRATEGY                                */}
          {/* ============================================= */}

          <div className="mt-5 rounded-2xl border border-[#007cf7]/15 bg-[#007cf7]/[0.05] p-4">

            <p className="text-[10px] uppercase tracking-[0.14em] text-[#4da3ff]">
              Route Strategy
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              {evacuationSnapshot
                .routeStrategy}
            </p>

          </div>


          <button
            type="button"
            onClick={
              onOpenRoutes
            }
            disabled={
              evacuationLoading
            }
            className="
              mt-6
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
              transition-all
              hover:border-[#007cf7]/50
              hover:bg-[#007cf7]/30
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {evacuationLoading
              ? "Preparing..."
              : "Analyze Flood-Safe Route"}
          </button>

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
              bg-white/5
              px-5
              py-3
              text-sm
              text-slate-300
              transition
              hover:bg-white/10
            "
          >
            Review Flood Map
          </button>

        </aside>

      </section>


      {/* ================================================= */}
      {/* OPERATIONAL PLAN                                  */}
      {/* ================================================= */}

      <section className="glass-panel rounded-[28px] p-5">

        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Evacuation Intelligence
          </p>

          <h3 className="mt-1 text-lg font-semibold">
            Recommended Operational Sequence
          </h3>
        </div>


        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">

          <PlanStep
            number="01"
            title={`Alert ${zoneId}`}
            text={
              evacuationRequired
                ? `Prepare approximately ${peopleToEvacuate} people for evacuation.`
                : "Maintain monitoring and evacuation readiness."
            }
          />

          <PlanStep
            number="02"
            title={
              roadUnsafe
                ? "Avoid Unsafe Roads"
                : "Monitor Road Risk"
            }
            text={
              roadUnsafe
                ? "Model 4 identifies unsafe road exposure. Exclude threatened segments from evacuation routing."
                : "Continue monitoring road-risk probability as the forecast changes."
            }
          />

          <PlanStep
            number="03"
            title="Use Mapped Shelter"
            text={
              shelterDistance !=
              null
                ? `Prioritize ${primaryShelter}, approximately ${shelterDistance.toFixed(
                    2,
                  )} km from the affected location.`
                : `Prioritize ${primaryShelter}.`
            }
          />

          <PlanStep
            number="04"
            title="Generate Safe Route"
            text="Compare the fastest path with the future-flood-aware route and select the lower-exposure corridor."
          />

        </div>


        {/* =============================================== */}
        {/* SUMMARY                                         */}
        {/* =============================================== */}

        <div className="mt-5 grid gap-3 md:grid-cols-4">

          <SummaryItem
            title="Flood"
            value={`${forecastSnapshot.depth} cm • ${Math.round(
              forecastSnapshot
                .probability *
                100,
            )}%`}
          />

          <SummaryItem
            title="Hotspot"
            value={`${riskSnapshot.riskLevel} • ${riskSnapshot.priority}`}
          />

          <SummaryItem
            title="Road"
            value={formatStatus(
              roadRisk,
            )}
          />

          <SummaryItem
            title="Evacuation"
            value={`${peopleToEvacuate} people • ${priority}`}
          />

        </div>


        <p className="mt-5 text-[10px] uppercase tracking-[0.12em] text-slate-600">
          Model-derived prototype decision support •
          Field verification required before operational deployment
        </p>

      </section>

    </div>
  );
}


/* ====================================================== */
/* METRIC CARD                                            */
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

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
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

          <p className="mt-1 text-sm text-slate-400">
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


/* ====================================================== */
/* SITUATION CARD                                         */
/* ====================================================== */

function SituationCard({
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
    <div
      className={`
        rounded-[22px]
        border
        p-4
        ${
          danger
            ? "border-red-400/15 bg-red-500/[0.06]"
            : "border-[#007cf7]/10 bg-[#071a33]/60"
        }
      `}
    >

      <div className="flex items-center gap-3">

        <div
          className={`
            rounded-xl
            p-2
            ${
              danger
                ? "bg-red-500/10 text-red-300"
                : "bg-[#007cf7]/10 text-[#4da3ff]"
            }
          `}
        >
          {icon}
        </div>

        <div className="min-w-0">

          <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>

          <p
            className={`
              mt-1
              truncate
              text-sm
              font-semibold
              ${
                danger
                  ? "text-red-200"
                  : "text-slate-200"
              }
            `}
          >
            {value}
          </p>

        </div>

      </div>

      <p className="mt-3 text-xs text-slate-500">
        {subtitle}
      </p>

    </div>
  );
}


/* ====================================================== */
/* CAMP CARD                                              */
/* ====================================================== */

function CampCard({
  camp,
  recommended,
}: {
  camp:
    CampAllocation;

  recommended:
    boolean;
}) {

  const percentage =
    camp.capacity >
    0
      ? Math.min(
          100,
          Math.round(
            (
              camp.allocated /
              camp.capacity
            ) *
            100,
          ),
        )
      : 0;

  return (
    <article className="rounded-[24px] border border-[#007cf7]/12 bg-[#071a33]/55 p-5">

      <div className="flex items-start justify-between gap-4">

        <div>

          <div className="flex items-center gap-2">

            <TentTree
              size={19}
              className="text-emerald-300"
            />

            <h4 className="text-lg font-semibold">
              {camp.campName}
            </h4>

          </div>

          <p className="mt-1 text-xs text-slate-500">
            Configured evacuation shelter
          </p>

        </div>

        {recommended && (
          <span className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.1em] text-emerald-300">
            Primary
          </span>
        )}

      </div>


      <div className="mt-6 flex items-end justify-between">

        <div>

          <p className="text-3xl font-semibold">
            {camp.allocated}

            <span className="ml-1 text-base font-normal text-slate-500">
              / {camp.capacity}
            </span>
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Evacuees allocated
          </p>

        </div>

        <span className="text-sm font-semibold text-emerald-300">
          {percentage}%
        </span>

      </div>


      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">

        <div
          className="h-full rounded-full bg-emerald-400"
          style={{
            width:
              `${percentage}%`,
          }}
        />

      </div>


      <div className="mt-4 flex items-center justify-between text-xs">

        <span className="text-slate-500">
          Remaining
        </span>

        <span className="font-medium text-slate-300">
          {
            camp
              .remainingCapacity
          }
        </span>

      </div>

    </article>
  );
}


/* ====================================================== */
/* STATUS ROW                                             */
/* ====================================================== */

function StatusRow({
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
    <div className="flex items-center justify-between gap-3 border-b border-white/10 py-3">

      <span className="text-sm text-slate-500">
        {title}
      </span>

      <span
        className={`
          max-w-[190px]
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


/* ====================================================== */
/* PLAN STEP                                              */
/* ====================================================== */

function PlanStep({
  number,
  title,
  text,
}: {
  number:
    string;

  title:
    string;

  text:
    string;
}) {

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">

      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#007cf7]/15 text-xs font-semibold text-[#8cc7ff]">
        {number}
      </div>

      <h4 className="mt-4 text-sm font-semibold text-slate-200">
        {title}
      </h4>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {text}
      </p>

    </div>
  );
}


/* ====================================================== */
/* SUMMARY                                                */
/* ====================================================== */

function SummaryItem({
  title,
  value,
}: {
  title:
    string;

  value:
    string;
}) {

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3">

      <p className="text-[10px] uppercase tracking-[0.13em] text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-sm font-medium text-slate-200">
        {value}
      </p>

    </div>
  );
}


/* ====================================================== */
/* FORMAT STATUS                                          */
/* ====================================================== */

function formatStatus(
  value:
    string,
) {

  if (!value) {
    return "Unknown";
  }

  return value
    .replaceAll(
      "_",
      " ",
    )
    .replaceAll(
      "/",
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


export default RescueEvacuationPage;