import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Droplets,
  Gauge,
  Hospital,
  Play,
  RotateCcw,
  Route,
  Users,
  Wrench,
} from "lucide-react";

import type {
  ForecastMinute,
} from "../data/demo/forecastData";

import {
  DATA_MODE,
} from "../services/api";

import type {
  ForecastSnapshot,
} from "../services/floodApi";

import type {
  DrainageSnapshot,
} from "../services/drainageApi";

import type {
  RiskSnapshot,
} from "../services/riskApi";

import type {
  EvacuationSnapshot,
} from "../services/evacuationApi";

import type {
  FloodTwinMLResponse,
} from "../services/mlApi";

import {
  mapResponseSimulation,
  simulateResponse,
  type ResponseAction,
  type ResponseRecommendationSnapshot,
  type SimulationSnapshot,
} from "../services/responseApi";


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

  riskSnapshot:
    RiskSnapshot;

  evacuationSnapshot:
    EvacuationSnapshot;

  /*
   * Optional so the page remains backward-compatible.
   *
   * When supplied, the page directly displays
   * Model 6 response-effectiveness output.
   */
  mlResult?:
    FloodTwinMLResponse | null;

  onOpenFlood?:
    () => void;

  onOpenDrainage?:
    () => void;

  onOpenRescue?:
    () => void;

  onOpenRoutes?:
    () => void;
};


/* ====================================================== */
/* ACTION TYPES                                           */
/* ====================================================== */

type ActionKey =
  | "clearDrain"
  | "deployPump"
  | "closeRoad"
  | "evacuate";

type SelectedActions =
  Record<
    ActionKey,
    boolean
  >;


/* ====================================================== */
/* DEFAULT PLAN                                           */
/* ====================================================== */

const DEFAULT_ACTIONS:
  SelectedActions = {
    clearDrain:
      true,

    deployPump:
      true,

    closeRoad:
      true,

    evacuate:
      true,
  };


/* ====================================================== */
/* PAGE                                                   */
/* ====================================================== */

function ResponsePlannerPage({
  forecastMinutes,
  forecastSnapshot,
  drainageSnapshot,
  riskSnapshot,
  evacuationSnapshot,
  mlResult = null,
  onOpenFlood,
  onOpenDrainage,
  onOpenRescue,
  onOpenRoutes,
}: Props) {

  /* ==================================================== */
  /* DYNAMIC CONTEXT                                      */
  /* ==================================================== */

  const zoneId =
    riskSnapshot.zoneId ||
    evacuationSnapshot.zoneId ||
    mlResult
      ?.location
      .zone_id ||
    "Affected Location";

  const drainId =
    drainageSnapshot.drainId ||
    mlResult
      ?.drainage
      .drain_id ||
    "Mapped Drain";

  const primaryShelter =
    evacuationSnapshot
      .primaryCamp ||
    "Nearest mapped shelter";

  const peopleExposed =
    evacuationSnapshot
      .population ??
    forecastSnapshot
      .peopleAtRisk;

  const roadRisk =
    riskSnapshot
      .roadRisk ??
    mlResult
      ?.road
      .risk_class ??
    (
      riskSnapshot
        .roadRestrictionRequired
        ? "UNSAFE"
        : "MONITORED"
    );

  const roadRiskProbability =
    riskSnapshot
      .roadRiskProbability ??
    mlResult
      ?.road
      .road_risk_probability;

  const severe =
    riskSnapshot
      .riskLevel ===
    "SEVERE";

  /* ==================================================== */
  /* ACTION STATE                                         */
  /* ==================================================== */

  const [
    selectedActions,
    setSelectedActions,
  ] =
    useState<SelectedActions>(
      DEFAULT_ACTIONS,
    );

  const selectedCount =
    Object.values(
      selectedActions,
    ).filter(
      Boolean,
    ).length;

  const allDefaultActionsSelected =
    selectedCount ===
    4;

  /* ==================================================== */
  /* DYNAMIC RECOMMENDATION                               */
  /* ==================================================== */

  const recommendation =
    useMemo(
      () =>
        buildRecommendation(
          riskSnapshot,
          drainageSnapshot,
          evacuationSnapshot,
          zoneId,
          drainId,
        ),
      [
        riskSnapshot,
        drainageSnapshot,
        evacuationSnapshot,
        zoneId,
        drainId,
      ],
    );

  /* ==================================================== */
  /* SIMULATION                                           */
  /* ==================================================== */

  const [
    simulation,
    setSimulation,
  ] =
    useState<
      SimulationSnapshot | null
    >(null);

  const [
    simulationLoading,
    setSimulationLoading,
  ] =
    useState(false);

  const [
    simulationError,
    setSimulationError,
  ] =
    useState<
      string | null
    >(null);

  /* ==================================================== */
  /* LOAD MODEL 6 RESULT                                  */
  /* ==================================================== */

  useEffect(() => {
    setSimulationError(
      null,
    );

    /*
     * In live mode the initial intervention plan in
     * App.tsx already ran Model 6 with the four
     * recommended actions.
     *
     * Show that trained-model result immediately.
     */

    if (
      DATA_MODE ===
        "live" &&
      mlResult
    ) {
      setSimulation(
        buildModel6Simulation(
          mlResult,
          forecastSnapshot,
          drainageSnapshot,
          riskSnapshot,
        ),
      );

      return;
    }

    setSimulation(
      null,
    );
  }, [
    mlResult,
    forecastSnapshot,
    drainageSnapshot,
    riskSnapshot,
  ]);

  /* ==================================================== */
  /* ACTION LOOKUP                                        */
  /* ==================================================== */

  const clearDrainAction =
    findActionByCategory(
      recommendation.actions,
      "DRAINAGE",
    );

  const pumpAction =
    findActionByCategory(
      recommendation.actions,
      "PUMPING",
    );

  const roadAction =
    findActionByCategory(
      recommendation.actions,
      "ROAD_CONTROL",
    );

  const evacuationAction =
    findActionByCategory(
      recommendation.actions,
      "EVACUATION",
    );

  /* ==================================================== */
  /* TOGGLE ACTION                                        */
  /* ==================================================== */

  const toggleAction = (
    key:
      ActionKey,
  ) => {
    setSelectedActions(
      (
        previous,
      ) => ({
        ...previous,

        [key]:
          !previous[
            key
          ],
      }),
    );

    setSimulation(
      null,
    );

    setSimulationError(
      null,
    );
  };

  /* ==================================================== */
  /* RUN SIMULATION                                       */
  /* ==================================================== */

  const runSimulation =
    async () => {
      if (
        selectedCount ===
        0
      ) {
        return;
      }

      setSimulationLoading(
        true,
      );

      setSimulationError(
        null,
      );

      try {
        /* =============================================== */
        /* MODEL 6 RESULT                                  */
        /* =============================================== */

        if (
          DATA_MODE ===
            "live" &&
          mlResult &&
          allDefaultActionsSelected
        ) {
          setSimulation(
            buildModel6Simulation(
              mlResult,
              forecastSnapshot,
              drainageSnapshot,
              riskSnapshot,
            ),
          );

          return;
        }

        /* =============================================== */
        /* DEMO                                            */
        /* =============================================== */

        if (
          DATA_MODE !==
          "live"
        ) {
          setSimulation(
            buildDemoSimulation(
              forecastSnapshot,
              drainageSnapshot,
              riskSnapshot,
              selectedActions,
              zoneId,
            ),
          );

          return;
        }

        /* =============================================== */
        /* CUSTOM INTERVENTION COMBINATION                 */
        /* =============================================== */

        /*
         * responseApi currently uses these historical
         * transport-field names.
         *
         * They are API compatibility keys only.
         * The UI no longer presents them as real asset IDs.
         */

        const response =
          await simulateResponse(
            forecastSnapshot,
            drainageSnapshot,
            {
              clear_drain_d17:
                selectedActions
                  .clearDrain,

              deploy_pump_p2:
                selectedActions
                  .deployPump,

              close_road_r12:
                selectedActions
                  .closeRoad,

              evacuate_z003:
                selectedActions
                  .evacuate,
            },
          );

        setSimulation(
          mapResponseSimulation(
            response,
          ),
        );
      } catch (
        error
      ) {
        console.error(
          "FloodTwin response simulation failed:",
          error,
        );

        setSimulationError(
          "Unable to run the intervention simulation.",
        );
      } finally {
        setSimulationLoading(
          false,
        );
      }
    };

  /* ==================================================== */
  /* RESET                                                */
  /* ==================================================== */

  const resetPlan =
    () => {
      setSelectedActions({
        ...DEFAULT_ACTIONS,
      });

      setSimulationError(
        null,
      );

      if (
        DATA_MODE ===
          "live" &&
        mlResult
      ) {
        setSimulation(
          buildModel6Simulation(
            mlResult,
            forecastSnapshot,
            drainageSnapshot,
            riskSnapshot,
          ),
        );
      } else {
        setSimulation(
          null,
        );
      }
    };

  /* ==================================================== */
  /* BEFORE STATES                                        */
  /* ==================================================== */

  const roadBefore =
    simulation?.before
      .roadR12Status ??
    (
      riskSnapshot
        .roadRestrictionRequired
        ? "UNSAFE"
        : roadRisk
    );

  const healthcareBefore =
    simulation?.before
      .hospitalH1Status ??
    (
      severe
        ? "ACCESS THREATENED"
        : "MONITORED"
    );

  const model6 =
    mlResult
      ?.response_effectiveness;

  /* ==================================================== */
  /* UI                                                   */
  /* ==================================================== */

  return (
    <div className="space-y-5">

      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <section className="glass-panel rounded-[28px] px-6 py-5">

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

          <div>

            <p className="text-xs uppercase tracking-[0.2em] text-[#4da3ff]">
              Model 6 • Response Intelligence
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Response Planner
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Select interventions and compare
              predicted conditions before and after
              response actions.
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
                    : "border-orange-400/20 bg-orange-500/10 text-orange-300"
                }
              `}
            >
              {zoneId}
              {" • "}
              {riskSnapshot.riskLevel}
              {" • "}
              {riskSnapshot.priority}
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
                  DATA_MODE ===
                    "live" &&
                  mlResult
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-400/15 bg-amber-400/5 text-amber-300"
                }
              `}
            >
              {simulationLoading
                ? "Re-Simulating..."
                : DATA_MODE ===
                      "live" &&
                    mlResult
                  ? "Live ML • Model 6"
                  : "Prototype Simulation"}
            </div>

          </div>

        </div>

      </section>


      {/* ================================================= */}
      {/* CURRENT SITUATION                                 */}
      {/* ================================================= */}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        <SituationMetric
          icon={
            <Droplets
              size={20}
            />
          }
          title="Flood Depth"
          value={`${forecastSnapshot.depth} cm`}
          subtitle={
            forecastMinutes ===
            0
              ? "Current estimate"
              : `Forecast +${forecastMinutes} min`
          }
          danger={
            forecastSnapshot
              .depth >=
            40
          }
        />

        <SituationMetric
          icon={
            <Users
              size={20}
            />
          }
          title="Population Context"
          value={String(
            peopleExposed,
          )}
          subtitle={zoneId}
          danger={
            peopleExposed >=
            500
          }
        />

        <SituationMetric
          icon={
            <Gauge
              size={20}
            />
          }
          title="Drain Load"
          value={`${drainageSnapshot.loadPercent}%`}
          subtitle={`${drainId} • ${formatStatus(
            drainageSnapshot.status,
          )}`}
          danger={
            drainageSnapshot
              .loadPercent >=
            100
          }
        />

        <SituationMetric
          icon={
            <Route
              size={20}
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
                )}% Model 4 probability`
              : "Future-flood-aware assessment"
          }
          danger={
            riskSnapshot
              .roadRestrictionRequired
          }
        />

      </section>


      {/* ================================================= */}
      {/* INTERVENTIONS                                     */}
      {/* ================================================= */}

      <section className="grid gap-5 xl:grid-cols-[1fr_330px]">

        <div className="glass-panel rounded-[28px] p-5">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Intervention Plan
              </p>

              <h3 className="mt-1 text-lg font-semibold">
                Recommended Response Actions
              </h3>

            </div>

            <div className="flex flex-wrap gap-2">

              <span className="rounded-full border border-red-400/15 bg-red-500/[0.07] px-3 py-2 text-xs text-red-300">
                {
                  recommendation
                    .p1Actions
                }{" "}
                P1
              </span>

              <span className="rounded-full border border-[#007cf7]/15 bg-[#007cf7]/10 px-3 py-2 text-xs text-[#8cc7ff]">
                {selectedCount}/4 selected
              </span>

            </div>

          </div>


          <div className="mt-5 grid gap-4 lg:grid-cols-2">

            <InterventionCard
              selected={
                selectedActions
                  .clearDrain
              }
              priority={
                clearDrainAction
                  ?.priority ??
                "P1"
              }
              icon={
                <Wrench
                  size={21}
                />
              }
              title={
                clearDrainAction
                  ?.title ??
                `Inspect ${drainId}`
              }
              description={
                clearDrainAction
                  ?.description ??
                "Inspect the priority drainage segment and clear obstruction only after field verification."
              }
              impact="Improve local drainage conveyance"
              onClick={() =>
                toggleAction(
                  "clearDrain",
                )
              }
            />

            <InterventionCard
              selected={
                selectedActions
                  .deployPump
              }
              priority={
                pumpAction
                  ?.priority ??
                "P1"
              }
              icon={
                <Activity
                  size={21}
                />
              }
              title={
                pumpAction
                  ?.title ??
                "Deploy Emergency Pump"
              }
              description={
                pumpAction
                  ?.description ??
                "Position temporary pumping capacity near the affected drainage corridor."
              }
              impact="Accelerate local dewatering"
              onClick={() =>
                toggleAction(
                  "deployPump",
                )
              }
            />

            <InterventionCard
              selected={
                selectedActions
                  .closeRoad
              }
              priority={
                roadAction
                  ?.priority ??
                "P1"
              }
              icon={
                <Route
                  size={21}
                />
              }
              title={
                roadAction
                  ?.title ??
                "Restrict Unsafe Road Segments"
              }
              description={
                roadAction
                  ?.description ??
                "Restrict traffic through road segments classified as unsafe by the road-risk model."
              }
              impact="Reduce mobility exposure"
              onClick={() =>
                toggleAction(
                  "closeRoad",
                )
              }
            />

            <InterventionCard
              selected={
                selectedActions
                  .evacuate
              }
              priority={
                evacuationAction
                  ?.priority ??
                "P1"
              }
              icon={
                <Users
                  size={21}
                />
              }
              title={
                evacuationAction
                  ?.title ??
                `Evacuate ${zoneId}`
              }
              description={
                evacuationAction
                  ?.description ??
                `Move predicted evacuation demand toward ${primaryShelter} using the lowest-risk available route.`
              }
              impact="Reduce population exposure"
              onClick={() =>
                toggleAction(
                  "evacuate",
                )
              }
            />

          </div>

        </div>


        {/* ================================================= */}
        {/* EXECUTION                                        */}
        {/* ================================================= */}

        <aside className="glass-panel rounded-[28px] p-5">

          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Response Execution
          </p>

          <h3 className="mt-1 text-lg font-semibold">
            Intervention Simulation
          </h3>


          <div className="mt-5 space-y-1">

            <PlannerRow
              title="Affected Location"
              value={zoneId}
            />

            <PlannerRow
              title="Selected Actions"
              value={`${selectedCount}/4`}
            />

            <PlannerRow
              title="Priority Drain"
              value={drainId}
            />

            <PlannerRow
              title="Road Control"
              value={
                selectedActions
                  .closeRoad
                  ? "Restrict unsafe segments"
                  : "Not selected"
              }
            />

            <PlannerRow
              title="Evacuation Demand"
              value={
                selectedActions
                  .evacuate
                  ? `${evacuationSnapshot.peopleToEvacuate} people`
                  : "Not selected"
              }
            />

            <PlannerRow
              title="Destination"
              value={
                selectedActions
                  .evacuate
                  ? primaryShelter
                  : "Not selected"
              }
            />

          </div>


          {recommendation
            .immediateActionRequired && (
            <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3">

              <p className="text-xs font-medium text-red-200">
                Immediate operational response recommended
              </p>

            </div>
          )}


          <button
            type="button"
            disabled={
              selectedCount ===
                0 ||
              simulationLoading
            }
            onClick={
              runSimulation
            }
            className="
              mt-6
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              border
              border-[#007cf7]/35
              bg-[#007cf7]/25
              px-5
              py-3
              text-sm
              font-semibold
              text-[#8cc7ff]
              transition-all
              hover:border-[#007cf7]/55
              hover:bg-[#007cf7]/35
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            <Play
              size={16}
            />

            {simulationLoading
              ? "Re-Simulating..."
              : (
                  DATA_MODE ===
                    "live" &&
                  mlResult &&
                  allDefaultActionsSelected
                )
                ? "Run Model 6 Response"
                : "Run Intervention Simulation"}
          </button>


          <button
            type="button"
            onClick={
              resetPlan
            }
            className="
              mt-3
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              border
              border-white/10
              bg-white/[0.04]
              px-5
              py-3
              text-sm
              text-slate-400
              transition
              hover:bg-white/[0.08]
            "
          >
            <RotateCcw
              size={15}
            />

            Reset Recommended Plan
          </button>


          {simulationError && (
            <p className="mt-4 text-xs leading-5 text-red-300">
              {simulationError}
            </p>
          )}

        </aside>

      </section>


      {/* ================================================= */}
      {/* BEFORE VS AFTER                                   */}
      {/* ================================================= */}

      <section className="glass-panel rounded-[30px] p-5">

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              FloodTwin Re-Simulation
            </p>

            <h3 className="mt-1 text-xl font-semibold">
              Before vs After Intervention
            </h3>

          </div>


          {simulation ? (
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-300">

              <CheckCircle2
                size={15}
              />

              {DATA_MODE ===
                  "live" &&
                mlResult &&
                allDefaultActionsSelected
                ? "MODEL 6 COMPLETED"
                : formatStatus(
                    simulation
                      .simulationStatus,
                  )}

            </div>
          ) : (
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-500">
              Run simulation to compare outcomes
            </div>
          )}

        </div>


        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_auto_1fr] xl:items-stretch">

          {/* ============================================= */}
          {/* BEFORE                                        */}
          {/* ============================================= */}

          <ScenarioPanel
            mode="before"
            title="Before Intervention"
            badge="BASELINE"
          >

            <ComparisonMetric
              icon={
                <Droplets
                  size={18}
                />
              }
              title="Flood Depth"
              value={`${simulation?.before.depthCm ??
                forecastSnapshot.depth} cm`}
              status="Flood condition"
              danger
            />

            <ComparisonMetric
              icon={
                <Users
                  size={18}
                />
              }
              title="People Exposed"
              value={String(
                simulation?.before
                  .peopleAtRisk ??
                peopleExposed,
              )}
              status="Population exposure"
              danger
            />

            <ComparisonMetric
              icon={
                <Gauge
                  size={18}
                />
              }
              title={drainId}
              value={`${simulation?.before
                .drainLoadPercent ??
                drainageSnapshot
                  .loadPercent}%`}
              status={formatStatus(
                drainageSnapshot.status,
              )}
              danger
            />

            <ComparisonMetric
              icon={
                <Route
                  size={18}
                />
              }
              title="Road Network"
              value={formatStatus(
                roadBefore,
              )}
              status="Model 4 assessment"
              danger={
                riskSnapshot
                  .roadRestrictionRequired
              }
            />

            <ComparisonMetric
              icon={
                <Hospital
                  size={18}
                />
              }
              title="Healthcare Access"
              value={formatStatus(
                healthcareBefore,
              )}
              status="Infrastructure exposure"
              danger={severe}
            />

          </ScenarioPanel>


          <div className="hidden items-center justify-center xl:flex">

            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#007cf7]/20 bg-[#007cf7]/10 text-[#4da3ff]">

              <ArrowRight
                size={21}
              />

            </div>

          </div>


          {/* ============================================= */}
          {/* AFTER                                         */}
          {/* ============================================= */}

          <ScenarioPanel
            mode={
              simulation
                ? "after"
                : "pending"
            }
            title="After Intervention"
            badge={
              simulation
                ? (
                    mlResult &&
                    DATA_MODE ===
                      "live"
                      ? "MODEL 6"
                      : "SIMULATED"
                  )
                : "PENDING"
            }
          >

            {simulation ? (
              <>

                <ComparisonMetric
                  icon={
                    <Droplets
                      size={18}
                    />
                  }
                  title="Flood Depth"
                  value={`${simulation.after.depthCm} cm`}
                  status={`↓ ${simulation.depthReductionCm.toFixed(
                    2,
                  )} cm`}
                />

                <ComparisonMetric
                  icon={
                    <Users
                      size={18}
                    />
                  }
                  title="People Exposed"
                  value={String(
                    simulation
                      .after
                      .peopleAtRisk,
                  )}
                  status={`↓ ${simulation.peopleRiskReduction} people`}
                />

                <ComparisonMetric
                  icon={
                    <Gauge
                      size={18}
                    />
                  }
                  title={drainId}
                  value={`${simulation.after.drainLoadPercent}%`}
                  status={`↓ ${simulation.drainLoadReductionPercent.toFixed(
                    2,
                  )} points`}
                />

                <ComparisonMetric
                  icon={
                    <Route
                      size={18}
                    />
                  }
                  title="Road Control"
                  value={formatStatus(
                    simulation
                      .after
                      .roadR12Status,
                  )}
                  status="Traffic exposure managed"
                />

                <ComparisonMetric
                  icon={
                    <Hospital
                      size={18}
                    />
                  }
                  title="Emergency Access"
                  value={formatStatus(
                    simulation
                      .after
                      .hospitalH1Status,
                  )}
                  status="Response priority"
                />

              </>
            ) : (
              <div className="flex min-h-[360px] items-center justify-center">

                <div className="max-w-xs text-center">

                  <Activity
                    size={34}
                    className="mx-auto text-slate-600"
                  />

                  <p className="mt-4 font-medium text-slate-400">
                    No intervention result yet
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Select response actions and run
                    the intervention simulation.
                  </p>

                </div>

              </div>
            )}

          </ScenarioPanel>

        </div>


        {/* ================================================= */}
        {/* IMPACT SUMMARY                                    */}
        {/* ================================================= */}

        {simulation && (
          <div
            className={`
              mt-5
              grid
              gap-3
              ${
                model6
                  ? "md:grid-cols-4"
                  : "md:grid-cols-3"
              }
            `}
          >

            <ImpactSummary
              title="Depth Reduction"
              value={`${simulation.depthReductionCm.toFixed(
                2,
              )} cm`}
              subtitle="Predicted local improvement"
            />

            <ImpactSummary
              title="Reduced Exposure"
              value={String(
                simulation
                  .peopleRiskReduction,
              )}
              subtitle="People removed from exposure"
            />

            <ImpactSummary
              title="Drain Relief"
              value={`${simulation.drainLoadReductionPercent.toFixed(
                2,
              )}`}
              subtitle="Drain-load percentage points"
            />

            {model6 && (
              <ImpactSummary
                title="Overall Impact"
                value={`${model6.impact_reduction_percent.toFixed(
                  1,
                )}%`}
                subtitle={`Model 6 confidence ${Math.round(
                  model6
                    .confidence_percent,
                )}%`}
              />
            )}

          </div>
        )}

      </section>


      {/* ================================================= */}
      {/* WORKFLOW                                          */}
      {/* ================================================= */}

      <section className="glass-panel rounded-[28px] p-5">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              FloodTwin Workflow
            </p>

            <p className="mt-2 text-sm text-slate-300">
              Predict → Diagnose → Decide → Re-simulate
            </p>

          </div>

          <div className="flex flex-wrap gap-2">

            {onOpenFlood && (
              <WorkflowButton
                label="Flood Map"
                onClick={
                  onOpenFlood
                }
              />
            )}

            {onOpenDrainage && (
              <WorkflowButton
                label="Drainage"
                onClick={
                  onOpenDrainage
                }
              />
            )}

            {onOpenRescue && (
              <WorkflowButton
                label="Evacuation"
                onClick={
                  onOpenRescue
                }
              />
            )}

            {onOpenRoutes && (
              <WorkflowButton
                label="Routes"
                onClick={
                  onOpenRoutes
                }
              />
            )}

          </div>

        </div>

      </section>


      {/* ================================================= */}
      {/* DISCLAIMER                                        */}
      {/* ================================================= */}

      <section className="glass-panel rounded-[24px] px-5 py-4">

        <div className="flex gap-3">

          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0 text-amber-300"
          />

          <div>

            <p className="text-sm font-medium text-slate-200">
              Prototype response-effectiveness modelling
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Model 6 predicts expected response
              effectiveness from the supplied flood,
              drainage, exposure and intervention
              context. Operational deployment requires
              validated hydraulic telemetry and field
              verification.
            </p>

          </div>

        </div>

      </section>

    </div>
  );
}


/* ====================================================== */
/* BUILD LIVE RECOMMENDATION                              */
/* ====================================================== */

function buildRecommendation(
  risk:
    RiskSnapshot,

  drainage:
    DrainageSnapshot,

  evacuation:
    EvacuationSnapshot,

  zoneId:
    string,

  drainId:
    string,
): ResponseRecommendationSnapshot {

  const drainagePriority =
    (
      drainage.status ===
        "OVERLOADED" ||
      drainage.status ===
        "PROBABLE_BLOCKAGE"
    )
      ? "P1"
      : "P2";

  const roadPriority =
    risk
      .roadRestrictionRequired
      ? "P1"
      : "P2";

  const evacuationPriority =
    evacuation
      .evacuationRequired
      ? "P1"
      : "P3";

  const pumpPriority =
    drainage
      .loadPercent >=
      100
      ? "P1"
      : "P2";

  const actions:
    ResponseAction[] = [
      {
        action_id:
          "ACT_DRAIN_CLEAR",

        category:
          "DRAINAGE",

        title:
          `Inspect and Clear ${drainId}`,

        priority:
          drainagePriority,

        description:
          "Inspect the mapped drainage segment and clear obstruction if field verification confirms reduced conveyance.",
      },

      {
        action_id:
          "ACT_PUMP",

        category:
          "PUMPING",

        title:
          "Deploy Emergency Pump",

        priority:
          pumpPriority,

        description:
          "Deploy temporary pumping support near the overloaded drainage corridor.",
      },

      {
        action_id:
          "ACT_ROAD_CONTROL",

        category:
          "ROAD_CONTROL",

        title:
          "Restrict Unsafe Road Segments",

        priority:
          roadPriority,

        description:
          "Restrict traffic through road segments predicted unsafe by Model 4.",
      },

      {
        action_id:
          "ACT_EVACUATE",

        category:
          "EVACUATION",

        title:
          `Evacuate ${zoneId}`,

        priority:
          evacuationPriority,

        description:
          `Move predicted evacuation demand toward ${evacuation.primaryCamp ||
            "the nearest mapped candidate shelter"}.`,
      },
    ];

  const p1Actions =
    actions.filter(
      (
        action,
      ) =>
        action.priority ===
        "P1",
    ).length;

  return {
    zoneId,

    riskLevel:
      risk.riskLevel,

    actions,

    totalActions:
      actions.length,

    p1Actions,

    immediateActionRequired:
      risk.riskLevel ===
        "SEVERE" ||
      p1Actions >=
        2,
  };
}


/* ====================================================== */
/* MODEL 6 -> UI SIMULATION                               */
/* ====================================================== */

function buildModel6Simulation(
  result:
    FloodTwinMLResponse,

  forecast:
    ForecastSnapshot,

  drainage:
    DrainageSnapshot,

  risk:
    RiskSnapshot,
): SimulationSnapshot {

  const model6 =
    result
      .response_effectiveness;

  return {
    zoneId:
      result.location
        .zone_id,

    before: {
      depthCm:
        forecast.depth,

      peopleAtRisk:
        result.evacuation
          .population,

      drainLoadPercent:
        drainage
          .loadPercent,

      anomalyProbability:
        drainage
          .anomalyProbability,

      roadR12Status:
        risk
          .roadRestrictionRequired
          ? "UNSAFE"
          : "MONITORED",

      hospitalH1Status:
        risk.riskLevel ===
          "SEVERE"
          ? "ACCESS_THREATENED"
          : "MONITORED",
    },

    after: {
      depthCm:
        model6
          .post_flood_depth_cm,

      peopleAtRisk:
        model6
          .post_people_at_risk,

      drainLoadPercent:
        model6
          .post_drain_load_percent,

      anomalyProbability:
        drainage
          .anomalyProbability,

      roadR12Status:
        "CONTROLLED",

      hospitalH1Status:
        "PRIORITY_ACCESS",
    },

    depthReductionCm:
      model6
        .depth_reduction_cm,

    peopleRiskReduction:
      model6
        .people_risk_reduction,

    drainLoadReductionPercent:
      model6
        .drain_load_reduction_points,

    selectedActions:
      4,

    simulationStatus:
      "MODEL_6_COMPLETED",
  };
}


/* ====================================================== */
/* DEMO SIMULATION                                        */
/* ====================================================== */

function buildDemoSimulation(
  forecast:
    ForecastSnapshot,

  drainage:
    DrainageSnapshot,

  risk:
    RiskSnapshot,

  actions:
    SelectedActions,

  zoneId:
    string,
): SimulationSnapshot {

  let depth =
    forecast.depth;

  let people =
    forecast
      .peopleAtRisk;

  let load =
    drainage
      .loadPercent;

  let anomaly =
    drainage
      .anomalyProbability;

  if (
    actions.clearDrain
  ) {
    depth -=
      7;

    load -=
      17;

    anomaly -=
      0.38;
  }

  if (
    actions.deployPump
  ) {
    depth -=
      11;

    load -=
      7;

    people -=
      70;
  }

  if (
    actions.evacuate
  ) {
    people -=
      Math.min(
        310,
        forecast
          .peopleAtRisk,
      );
  }

  const afterDepth =
    Math.max(
      depth,
      0,
    );

  const afterPeople =
    Math.max(
      people,
      0,
    );

  const afterLoad =
    Math.max(
      load,
      0,
    );

  const afterAnomaly =
    Math.max(
      Number(
        anomaly.toFixed(
          2,
        ),
      ),
      0,
    );

  return {
    zoneId,

    before: {
      depthCm:
        forecast.depth,

      peopleAtRisk:
        forecast
          .peopleAtRisk,

      drainLoadPercent:
        drainage
          .loadPercent,

      anomalyProbability:
        drainage
          .anomalyProbability,

      roadR12Status:
        risk
          .roadRestrictionRequired
          ? "UNSAFE"
          : "MONITORED",

      hospitalH1Status:
        risk.riskLevel ===
          "SEVERE"
          ? "ACCESS_THREATENED"
          : "MONITORED",
    },

    after: {
      depthCm:
        afterDepth,

      peopleAtRisk:
        afterPeople,

      drainLoadPercent:
        afterLoad,

      anomalyProbability:
        afterAnomaly,

      roadR12Status:
        actions.closeRoad
          ? "CONTROLLED"
          : risk
                .roadRestrictionRequired
            ? "UNSAFE"
            : "MONITORED",

      hospitalH1Status:
        actions.evacuate
          ? "PRIORITY_ACCESS"
          : risk.riskLevel ===
              "SEVERE"
            ? "ACCESS_THREATENED"
            : "MONITORED",
    },

    depthReductionCm:
      Math.max(
        forecast.depth -
          afterDepth,
        0,
      ),

    peopleRiskReduction:
      Math.max(
        forecast
          .peopleAtRisk -
          afterPeople,
        0,
      ),

    drainLoadReductionPercent:
      Math.max(
        drainage
          .loadPercent -
          afterLoad,
        0,
      ),

    selectedActions:
      Object.values(
        actions,
      ).filter(
        Boolean,
      ).length,

    simulationStatus:
      "COMPLETED",
  };
}


/* ====================================================== */
/* FIND ACTION                                            */
/* ====================================================== */

function findActionByCategory(
  actions:
    ResponseAction[],

  category:
    string,
) {

  return actions.find(
    (
      action,
    ) =>
      action.category ===
      category,
  );
}


/* ====================================================== */
/* INTERVENTION CARD                                      */
/* ====================================================== */

function InterventionCard({
  selected,
  priority,
  icon,
  title,
  description,
  impact,
  onClick,
}: {
  selected:
    boolean;

  priority:
    string;

  icon:
    ReactNode;

  title:
    string;

  description:
    string;

  impact:
    string;

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
        rounded-[24px]
        border
        p-5
        text-left
        transition-all
        ${
          selected
            ? "border-[#007cf7]/30 bg-[#007cf7]/10"
            : "border-white/5 bg-white/[0.02] opacity-60"
        }
      `}
    >

      <div className="flex items-start justify-between gap-4">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#007cf7]/12 text-[#4da3ff]">
            {icon}
          </div>

          <div>

            <p className="text-[10px] uppercase tracking-[0.12em] text-red-300">
              {priority}
            </p>

            <h4 className="mt-1 font-semibold text-slate-200">
              {title}
            </h4>

          </div>

        </div>

        <div
          className={`
            flex
            h-6
            w-6
            items-center
            justify-center
            rounded-full
            border
            ${
              selected
                ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
                : "border-white/15 text-transparent"
            }
          `}
        >
          <CheckCircle2
            size={15}
          />
        </div>

      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        {description}
      </p>

      <div className="mt-4 rounded-xl border border-white/5 bg-black/10 px-3 py-2 text-xs text-slate-400">
        {impact}
      </div>

    </button>
  );
}


/* ====================================================== */
/* SITUATION METRIC                                       */
/* ====================================================== */

function SituationMetric({
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
/* PLANNER ROW                                            */
/* ====================================================== */

function PlannerRow({
  title,
  value,
}: {
  title:
    string;

  value:
    string;
}) {

  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-3">

      <span className="text-sm text-slate-500">
        {title}
      </span>

      <span className="max-w-[180px] text-right text-sm font-medium text-slate-200">
        {value}
      </span>

    </div>
  );
}


/* ====================================================== */
/* SCENARIO PANEL                                         */
/* ====================================================== */

function ScenarioPanel({
  title,
  badge,
  mode,
  children,
}: {
  title:
    string;

  badge:
    string;

  mode:
    | "before"
    | "after"
    | "pending";

  children:
    ReactNode;
}) {

  return (
    <div
      className={`
        rounded-[26px]
        border
        p-5
        ${
          mode ===
          "before"
            ? "border-red-400/15 bg-red-500/[0.035]"
            : mode ===
                "after"
              ? "border-emerald-400/15 bg-emerald-500/[0.04]"
              : "border-white/5 bg-white/[0.02]"
        }
      `}
    >

      <div className="flex items-center justify-between gap-4">

        <h4 className="text-lg font-semibold text-slate-200">
          {title}
        </h4>

        <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">
          {badge}
        </span>

      </div>

      <div className="mt-5 space-y-3">
        {children}
      </div>

    </div>
  );
}


/* ====================================================== */
/* COMPARISON METRIC                                      */
/* ====================================================== */

function ComparisonMetric({
  icon,
  title,
  value,
  status,
  danger = false,
}: {
  icon:
    ReactNode;

  title:
    string;

  value:
    string;

  status:
    string;

  danger?:
    boolean;
}) {

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/10 p-4">

      <div
        className={`
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          ${
            danger
              ? "bg-red-500/10 text-red-300"
              : "bg-emerald-500/10 text-emerald-300"
          }
        `}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">

        <p className="text-xs text-slate-500">
          {title}
        </p>

        <p
          className={`
            mt-1
            font-semibold
            ${
              danger
                ? "text-red-200"
                : "text-emerald-200"
            }
          `}
        >
          {value}
        </p>

      </div>

      <span className="text-right text-xs text-slate-500">
        {status}
      </span>

    </div>
  );
}


/* ====================================================== */
/* IMPACT SUMMARY                                         */
/* ====================================================== */

function ImpactSummary({
  title,
  value,
  subtitle,
}: {
  title:
    string;

  value:
    string;

  subtitle:
    string;
}) {

  return (
    <div className="rounded-2xl border border-emerald-400/10 bg-emerald-500/[0.035] p-4">

      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-semibold text-emerald-300">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {subtitle}
      </p>

    </div>
  );
}


/* ====================================================== */
/* WORKFLOW BUTTON                                        */
/* ====================================================== */

function WorkflowButton({
  label,
  onClick,
}: {
  label:
    string;

  onClick:
    () => void;
}) {

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="
        rounded-xl
        border
        border-white/10
        bg-white/[0.04]
        px-4
        py-2
        text-xs
        text-slate-400
        transition
        hover:border-[#007cf7]/20
        hover:bg-[#007cf7]/10
        hover:text-[#8cc7ff]
      "
    >
      {label}
    </button>
  );
}


/* ====================================================== */
/* FORMAT                                                 */
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


export default ResponsePlannerPage;