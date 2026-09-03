import {
  useCallback,
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
  CheckCircle2,
  Clock3,
  CloudRain,
  Hospital,
  LoaderCircle,
  Play,
  RefreshCw,
  Route,
  Send,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  FloodTwinMLResponse,
} from "../services/mlApi";

import {
  getApiErrorMessage,
} from "../services/api";

import {
  createTask,
  formatTaskDateTime,
  formatTaskTime,
  getTasks,
  type FieldTask,
} from "../services/taskApi";


/* ====================================================== */
/* PROPS                                                  */
/* ====================================================== */

type Props = {
  forecastMinutes:
    ForecastMinute;

  setForecastMinutes: (
    value: ForecastMinute,
  ) => void;

  forecastSnapshot:
    ForecastSnapshot;

  forecastSource:
    "demo" | "api";

  forecastLoading:
    boolean;

  rainfallMmHr:
    number;

  setRainfallMmHr: (
    value: number,
  ) => void;

  recentRainfallMm:
    number;

  setRecentRainfallMm: (
    value: number,
  ) => void;

  antecedentRainfallMm:
    number;

  setAntecedentRainfallMm: (
    value: number,
  ) => void;

  onRunFloodTwin:
    () => void;

  demoRunning:
    boolean;

  onStartDemo:
    () => void;

  onOpenFlood:
    () => void;

  onOpenDrainage:
    () => void;

  onOpenRescue:
    () => void;

  onOpenResponse:
    () => void;

  affectedLocations?:
    FloodScanLocation[];

  /*
   * Optional for backward compatibility.
   *
   * When App.tsx supplies this, the command center
   * can display the dynamic CHN_LOC_xxxx, mapped drain,
   * Model 4 road-risk and Model 5/6 context directly.
   */
  mlResult?:
    FloodTwinMLResponse | null;
};


/* ====================================================== */
/* FIELD TEAMS                                            */
/* ====================================================== */

const FIELD_TEAMS = [
  "Field Team 04",
  "Pump Team 02",
  "Rescue Team 01",
  "Traffic Team 03",
];


/* ====================================================== */
/* JOB PRESET                                             */
/* ====================================================== */

type JobPreset = {
  key:
    string;

  title:
    string;

  description:
    string;

  category:
    string;

  priority:
    string;

  defaultTeam:
    string;

  icon:
    ReactNode;
};


/* ====================================================== */
/* COMMAND CENTER                                         */
/* ====================================================== */

function CommandCenterPage({
  forecastMinutes,
  setForecastMinutes,
  forecastSnapshot,
  forecastSource,
  forecastLoading,
  rainfallMmHr,
  setRainfallMmHr,
  recentRainfallMm,
  setRecentRainfallMm,
  antecedentRainfallMm,
  setAntecedentRainfallMm,
  onRunFloodTwin,
  demoRunning,
  onStartDemo,
  onOpenFlood,
  onOpenDrainage,
  onOpenRescue,
  onOpenResponse,
  affectedLocations = [],
  mlResult = null,
}: Props) {

  const forecast =
    forecastSnapshot;

  const riskStyle =
    getRiskStyle(
      forecast.risk,
    );

  /* ==================================================== */
  /* DYNAMIC MODEL CONTEXT                                */
  /* ==================================================== */

  const zoneId =
    mlResult
      ?.location
      .zone_id ||
    (
      forecastSource ===
      "api"
        ? "Detected Hotspot"
        : "Demo Zone"
    );

  const locationName =
    mlResult
      ?.location
      .location_name ||
    zoneId;

  const drainId =
    mlResult
      ?.drainage
      .drain_id ||
    "Mapped Drain";

  const roadRisk =
    mlResult
      ?.road
      .risk_class ||
    (
      forecast.risk ===
        "SEVERE"
        ? "UNSAFE"
        : forecast.risk ===
            "HIGH"
          ? "CAUTION"
          : "SAFE"
    );

  const roadRiskProbability =
    mlResult
      ?.road
      .road_risk_probability;

  const evacuationCount =
    mlResult
      ?.evacuation
      .predicted_evacuation_count ??
    forecast
      .peopleAtRisk;

  const evacuationPriority =
    mlResult
      ?.evacuation
      .priority ??
    forecast
      .drainPriority;

  const responseImpact =
    mlResult
      ?.response_effectiveness
      .impact_reduction_percent;

  const latitude =
    mlResult
      ?.location
      .latitude;

  const longitude =
    mlResult
      ?.location
      .longitude;

  const hasOperationalLocation =
    latitude !=
      null &&
    longitude !=
      null &&
    Number.isFinite(
      latitude,
    ) &&
    Number.isFinite(
      longitude,
    );

  const dispatchLatitude =
    hasOperationalLocation
      ? latitude
      : 0;

  const dispatchLongitude =
    hasOperationalLocation
      ? longitude
      : 0;

  /* ==================================================== */
  /* FIELD JOB PRESETS                                    */
  /* ==================================================== */

  const jobPresets =
    useMemo<JobPreset[]>(
      () => [
        {
          key:
            "drainage",

          title:
            `Inspect ${drainId}`,

          description:
            `Inspect the mapped drainage segment ${drainId} and clear obstruction only after field verification.`,

          category:
            "DRAINAGE",

          priority:
            forecast
              .drainPriority,

          defaultTeam:
            "Field Team 04",

          icon: (
            <Wrench
              size={18}
            />
          ),
        },

        {
          key:
            "pump",

          title:
            "Deploy Emergency Pump",

          description:
            "Deploy temporary pumping support near the affected drainage corridor.",

          category:
            "PUMPING",

          priority:
            forecast
              .drainLoadPercent >=
              100
              ? "P1"
              : "P2",

          defaultTeam:
            "Pump Team 02",

          icon: (
            <Activity
              size={18}
            />
          ),
        },

        {
          key:
            "evacuation",

          title:
            `Evacuate ${zoneId}`,

          description:
            `Prepare approximately ${Math.max(
              0,
              Math.round(
                evacuationCount,
              ),
            )} people for evacuation from ${zoneId}.`,

          category:
            "EVACUATION",

          priority:
            evacuationPriority,

          defaultTeam:
            "Rescue Team 01",

          icon: (
            <Users
              size={18}
            />
          ),
        },

        {
          key:
            "road",

          title:
            "Restrict Unsafe Road Segments",

          description:
            `Apply road control to corridors identified as ${roadRisk} by the future-flood-aware road model.`,

          category:
            "ROAD_CONTROL",

          priority:
            roadRisk ===
              "UNSAFE"
              ? "P1"
              : "P2",

          defaultTeam:
            "Traffic Team 03",

          icon: (
            <Route
              size={18}
            />
          ),
        },
      ],
      [
        drainId,
        evacuationCount,
        evacuationPriority,
        forecast
          .drainLoadPercent,
        forecast
          .drainPriority,
        roadRisk,
        zoneId,
      ],
    );

  /* ==================================================== */
  /* TASK STATE                                           */
  /* ==================================================== */

  const [
    tasks,
    setTasks,
  ] =
    useState<FieldTask[]>(
      [],
    );

  const [
    tasksLoading,
    setTasksLoading,
  ] =
    useState(
      true,
    );

  const [
    assigningTaskKey,
    setAssigningTaskKey,
  ] =
    useState<
      string | null
    >(null);

  const [
    taskError,
    setTaskError,
  ] =
    useState<
      string | null
    >(null);

  const [
    taskNotice,
    setTaskNotice,
  ] =
    useState<
      string | null
    >(null);

  const [
    teamSelections,
    setTeamSelections,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({
      drainage:
        "Field Team 04",

      pump:
        "Pump Team 02",

      evacuation:
        "Rescue Team 01",

      road:
        "Traffic Team 03",
    });

  /* ==================================================== */
  /* REFRESH TASKS                                        */
  /* ==================================================== */

  const refreshTasks =
    useCallback(
      async (
        showLoading =
          false,
      ) => {

        if (
          showLoading
        ) {
          setTasksLoading(
            true,
          );
        }

        try {
          const result =
            await getTasks();

          setTasks(
            result,
          );

          setTaskError(
            null,
          );
        } catch (
          error
        ) {
          console.error(
            "Unable to load field tasks:",
            error,
          );

          setTaskError(
            getApiErrorMessage(
              error,
              "Unable to synchronize field operations",
            ),
          );
        } finally {
          setTasksLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    void refreshTasks();

    const timer =
      window.setInterval(
        () => {
          void refreshTasks();
        },
        3000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    refreshTasks,
  ]);

  /* ==================================================== */
  /* TASK DERIVED STATE                                   */
  /* ==================================================== */

  const activeTasks =
    useMemo(
      () =>
        tasks.filter(
          (
            task,
          ) =>
            task.status ===
              "ASSIGNED" ||
            task.status ===
              "ACCEPTED" ||
            task.status ===
              "IN_PROGRESS",
        ),
      [
        tasks,
      ],
    );

  const completedTasks =
    useMemo(
      () =>
        tasks.filter(
          (
            task,
          ) =>
            task.status ===
            "COMPLETED",
        ),
      [
        tasks,
      ],
    );

  const busyTeams =
    useMemo(
      () =>
        new Set(
          activeTasks.map(
            (
              task,
            ) =>
              task
                .assigned_team,
          ),
        ),
      [
        activeTasks,
      ],
    );

  const activeTeamCount =
    busyTeams.size;

  const availableTeams =
    Math.max(
      FIELD_TEAMS.length -
        activeTeamCount,
      0,
    );

  const hasActiveTask =
    (
      preset:
        JobPreset,
    ) =>
      activeTasks.some(
        (
          task,
        ) =>
          task.title ===
          preset.title,
      );

  /* ==================================================== */
  /* ASSIGN TASK                                          */
  /* ==================================================== */

  const handleAssignTask =
    async (
      preset:
        JobPreset,
    ) => {

      if (
        forecastSource ===
          "api" &&
        !hasOperationalLocation
      ) {
        setTaskError(
          "Dynamic affected-location coordinates are not available yet. Wait for the ML scan to finish before dispatching.",
        );

        return;
      }

      const preferredTeam =
        teamSelections[
          preset.key
        ];

      const assignedTeam =
        preferredTeam &&
        !busyTeams.has(
          preferredTeam,
        )
          ? preferredTeam
          : FIELD_TEAMS.find(
              (
                team,
              ) =>
                !busyTeams.has(
                  team,
                ),
            );

      if (
        !assignedTeam
      ) {
        setTaskError(
          "No field team is currently available.",
        );

        return;
      }

      if (
        hasActiveTask(
          preset,
        )
      ) {
        setTaskError(
          `${preset.title} is already active.`,
        );

        return;
      }

      setAssigningTaskKey(
        preset.key,
      );

      setTaskError(
        null,
      );

      setTaskNotice(
        null,
      );

      try {
        const task =
          await createTask({
            title:
              preset.title,

            description:
              preset.description,

            category:
              preset.category,

            priority:
              preset.priority,

            assigned_team:
              assignedTeam,

            /*
             * In live mode these come from Model 1 scan.
             * Demo mode is allowed to use the legacy demo
             * map center only for demonstration.
             */
            latitude:
              forecastSource ===
                "api"
                ? dispatchLatitude
                : 12.9823,

            longitude:
              forecastSource ===
                "api"
                ? dispatchLongitude
                : 80.2224,

            zone_id:
              zoneId,
          });

        setTasks(
          (
            previous,
          ) => [
            ...previous,
            task,
          ],
        );

        setTaskNotice(
          `${preset.title} assigned to ${assignedTeam}.`,
        );

        await refreshTasks();
      } catch (
        error: unknown
      ) {
        console.error(
          "Task assignment failed:",
          error,
        );

        const apiError =
          error as {
            response?: {
              status?: number;

              data?: {
                detail?: string;
              };
            };
          };

        const backendMessage =
          apiError
            .response
            ?.data
            ?.detail;

        if (
          apiError
            .response
            ?.status ===
          409
        ) {
          setTaskError(
            backendMessage ??
              `${assignedTeam} already has an active task.`,
          );

          await refreshTasks();

          return;
        }

        setTaskError(
          backendMessage ??
            getApiErrorMessage(
              error,
              `Unable to assign ${preset.title}`,
            ),
        );
      } finally {
        setAssigningTaskKey(
          null,
        );
      }
    };

  /* ==================================================== */
  /* FORECAST CHART                                       */
  /* ==================================================== */

  const forecastChartData =
    FORECAST_OPTIONS.map(
      (
        item,
      ) => {

        const demo =
          forecastData[
            item.value
          ];

        const selected =
          forecastMinutes ===
          item.value;

        return {
          time:
            item.label,

          depth:
            selected &&
            forecastSource ===
              "api"
              ? forecast.depth
              : demo.depth,

          live:
            selected &&
            forecastSource ===
              "api",
        };
      },
    );

  /* ==================================================== */
  /* KPI VALUES                                           */
  /* ==================================================== */

  const floodProbabilityPercent =
    Math.round(
      clamp01(
        forecast
          .probability,
      ) *
        100,
    );

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

  const rainfallInputValid =
    Number.isFinite(
      rainfallMmHr,
    ) &&
    rainfallMmHr >=
      0 &&
    Number.isFinite(
      recentRainfallMm,
    ) &&
    recentRainfallMm >=
      0 &&
    Number.isFinite(
      antecedentRainfallMm,
    ) &&
    antecedentRainfallMm >=
      0;

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
              FloodTwin Command Center
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Urban Flood Situation Overview
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Predict → Diagnose → Decide → Re-simulate
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
                ${riskStyle.container}
                ${riskStyle.text}
              `}
            >
              {zoneId}
              {" • "}
              {forecast.risk}
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
                  forecastSource ===
                  "api"
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-400/15 bg-amber-400/5 text-amber-300"
                }
              `}
            >
              {forecastLoading
                ? "Running ML Pipeline..."
                : forecastSource ===
                    "api"
                  ? "Live ML • Models 1-6"
                  : "Demo Scenario"}
            </div>


            <button
              type="button"
              onClick={
                onStartDemo
              }
              disabled={
                demoRunning
              }
              className="
                flex
                items-center
                gap-2
                rounded-full
                border
                border-[#007cf7]/30
                bg-[#007cf7]/20
                px-5
                py-2
                text-xs
                font-semibold
                uppercase
                tracking-[0.1em]
                text-[#8cc7ff]
                transition-all
                hover:bg-[#007cf7]/30
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {demoRunning ? (
                <>
                  <LoaderCircle
                    size={14}
                    className="animate-spin"
                  />

                  Simulation Running
                </>
              ) : (
                <>
                  <Play
                    size={14}
                  />

                  Run Demo Simulation
                </>
              )}
            </button>

          </div>

        </div>


        {demoRunning && (
          <div className="mt-5 rounded-2xl border border-[#007cf7]/15 bg-[#007cf7]/5 px-4 py-3">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Simulation Playback
                </p>

                <p className="mt-1 text-sm font-medium text-[#8cc7ff]">
                  {forecastMinutes ===
                  0
                    ? "NOW"
                    : `+${forecastMinutes} MIN`}
                </p>

              </div>

            </div>


            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">

              <div
                className="h-full rounded-full bg-[#007cf7] transition-all duration-500"
                style={{
                  width:
                    `${getSimulationProgress(
                      forecastMinutes,
                    )}%`,
                }}
              />

            </div>

          </div>
        )}

      </section>


      {/* ================================================= */}
      {/* OPERATOR RAINFALL INPUT                            */}
      {/* ================================================= */}

      <section className="glass-panel rounded-[28px] p-5">

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

          <div>

            <p className="text-xs uppercase tracking-[0.18em] text-[#4da3ff]">
              Operator Scenario Input
            </p>

            <h3 className="mt-1 text-lg font-semibold">
              Rainfall & Forecast Controls
            </h3>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
              Enter the rainfall scenario that should be sent to the Chennai flood scan and the complete six-model FloodTwin pipeline.
            </p>

          </div>

          <div
            className={`
              rounded-full
              border
              px-3
              py-2
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.12em]
              ${
                forecastLoading
                  ? "border-[#007cf7]/20 bg-[#007cf7]/10 text-[#8cc7ff]"
                  : "border-emerald-400/15 bg-emerald-500/[0.06] text-emerald-300"
              }
            `}
          >
            {forecastLoading
              ? "Models Running..."
              : "Ready for Custom Input"}
          </div>

        </div>


        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">

          <RainfallInput
            label="Rainfall Intensity"
            value={
              rainfallMmHr
            }
            unit="mm/hr"
            disabled={
              forecastLoading ||
              demoRunning
            }
            onChange={
              setRainfallMmHr
            }
          />

          <RainfallInput
            label="Recent Rainfall"
            value={
              recentRainfallMm
            }
            unit="mm"
            disabled={
              forecastLoading ||
              demoRunning
            }
            onChange={
              setRecentRainfallMm
            }
          />

          <RainfallInput
            label="Antecedent Rainfall"
            value={
              antecedentRainfallMm
            }
            unit="mm"
            disabled={
              forecastLoading ||
              demoRunning
            }
            onChange={
              setAntecedentRainfallMm
            }
          />

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">

            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
              Forecast Horizon
            </p>

            <div className="mt-3 grid grid-cols-4 gap-1.5">

              {FORECAST_OPTIONS
                .filter(
                  (
                    item,
                  ) =>
                    item.value !==
                    0,
                )
                .map(
                  (
                    item,
                  ) => (
                    <button
                      key={
                        item.value
                      }
                      type="button"
                      disabled={
                        forecastLoading ||
                        demoRunning
                      }
                      onClick={() =>
                        setForecastMinutes(
                          item.value,
                        )
                      }
                      className={`
                        rounded-lg
                        border
                        px-2
                        py-2
                        text-[10px]
                        font-semibold
                        transition
                        disabled:cursor-wait
                        disabled:opacity-50
                        ${
                          forecastMinutes ===
                          item.value
                            ? "border-[#007cf7]/40 bg-[#007cf7]/25 text-[#8cc7ff]"
                            : "border-white/[0.07] bg-white/[0.025] text-slate-500 hover:bg-white/[0.05]"
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

        </div>


        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-[10px] leading-5 text-slate-600">
            Rainfall values are operator/scenario inputs. FloodTwin uses them with Chennai GIS and mapped infrastructure context; unavailable real-time hydraulic/demographic telemetry remains clearly identified as prototype-derived operational input.
          </p>

          <button
            type="button"
            onClick={
              onRunFloodTwin
            }
            disabled={
              !rainfallInputValid ||
              forecastLoading ||
              demoRunning
            }
            className="
              flex
              shrink-0
              items-center
              justify-center
              gap-2
              rounded-2xl
              border
              border-[#007cf7]/35
              bg-[#007cf7]/25
              px-5
              py-3
              text-xs
              font-semibold
              uppercase
              tracking-[0.1em]
              text-[#8cc7ff]
              transition
              hover:border-[#007cf7]/55
              hover:bg-[#007cf7]/35
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {forecastLoading ? (
              <>
                <LoaderCircle
                  size={15}
                  className="animate-spin"
                />

                Running Models 1-6
              </>
            ) : (
              <>
                <Play
                  size={15}
                />

                Run FloodTwin
              </>
            )}
          </button>

        </div>

      </section>


      {/* ================================================= */}
      {/* KPI                                               */}
      {/* ================================================= */}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">

        <MetricCard
          icon={
            <CloudRain
              size={21}
            />
          }
          title="Flood Risk"
          value={
            forecast.risk
          }
          subtitle={`${floodProbabilityPercent}% probability`}
          danger={
            forecast.risk ===
            "SEVERE"
          }
        />


        <MetricCard
          icon={
            <CloudRain
              size={21}
            />
          }
          title="Predicted Depth"
          value={`${formatNumber(
            forecast.depth,
            2,
          )} cm`}
          subtitle={
            forecastMinutes ===
            0
              ? "Current estimate"
              : `+${forecastMinutes} min`
          }
          danger={
            forecast.depth >=
            40
          }
        />


        <MetricCard
          icon={
            <ShieldAlert
              size={21}
            />
          }
          title="Drainage"
          value={
            forecast
              .drainPriority
          }
          subtitle={`${drainId} • ${formatStatus(
            forecast
              .drainStatus,
          )}`}
          danger={
            forecast
              .drainPriority ===
            "P1"
          }
        />


        <MetricCard
          icon={
            <Route
              size={21}
            />
          }
          title="Road Risk"
          value={
            roadRisk
          }
          subtitle={
            roadRiskPercent !=
            null
              ? `${roadRiskPercent}% Model 4 probability`
              : "Future-flood-aware assessment"
          }
          danger={
            roadRisk ===
            "UNSAFE"
          }
        />


        <MetricCard
          icon={
            <Users
              size={21}
            />
          }
          title="Evacuation Demand"
          value={String(
            Math.max(
              0,
              Math.round(
                evacuationCount,
              ),
            ),
          )}
          subtitle={`Model 5 • ${evacuationPriority}`}
          danger={
            evacuationCount >
            0
          }
        />


        <MetricCard
          icon={
            <ShieldCheck
              size={21}
            />
          }
          title="Response Impact"
          value={
            responseImpact !=
            null
              ? `${formatNumber(
                  responseImpact,
                  1,
                )}%`
              : "Pending"
          }
          subtitle="Model 6 expected reduction"
        />

      </section>


      {/* ================================================= */}
      {/* MAP + INCIDENTS                                   */}
      {/* ================================================= */}

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">

        <div className="glass-panel rounded-[28px] p-5">

          <div className="mb-4 flex items-center justify-between gap-4">

            <div>

              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Situation Overview
              </p>

              <h3 className="mt-1 text-lg font-semibold">
                Dynamic Flood Intelligence Map
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {locationName}
              </p>

            </div>


            <button
              type="button"
              onClick={
                onOpenFlood
              }
              className="
                rounded-xl
                border
                border-[#007cf7]/20
                bg-[#007cf7]/10
                px-4
                py-2
                text-xs
                text-[#8cc7ff]
                hover:bg-[#007cf7]/20
              "
            >
              Open Full Flood Map
            </button>

          </div>


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
              mlResult
                ?.location
                .zone_id ??
              null
            }
            onOpenDrainage={
              onOpenDrainage
            }
            variant="overview"
          />

        </div>


        <div className="glass-panel rounded-[28px] p-5">

          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Active Intelligence
          </p>

          <h3 className="mt-1 text-lg font-semibold">
            Priority Situation Feed
          </h3>


          <div className="mt-5 space-y-3">

            <IncidentCard
              icon={
                <CloudRain
                  size={18}
                />
              }
              status={
                forecast.risk
              }
              title={zoneId}
              description={`${formatNumber(
                forecast.depth,
                2,
              )} cm predicted • ${floodProbabilityPercent}% probability`}
              color={
                forecast.risk ===
                  "SEVERE"
                  ? "red"
                  : forecast.risk ===
                      "HIGH"
                    ? "orange"
                    : "blue"
              }
              onClick={
                onOpenFlood
              }
            />


            <IncidentCard
              icon={
                <ShieldAlert
                  size={18}
                />
              }
              status={
                forecast
                  .drainPriority
              }
              title={drainId}
              description={
                formatStatus(
                  forecast
                    .drainStatus,
                )
              }
              color={
                forecast
                  .drainPriority ===
                  "P1"
                  ? "red"
                  : "orange"
              }
              onClick={
                onOpenDrainage
              }
            />


            <IncidentCard
              icon={
                <Route
                  size={18}
                />
              }
              status={
                roadRisk
              }
              title="Road Network"
              description={
                mlResult
                  ?.road
                  .routing_recommendation ||
                "Future-flood-aware road assessment"
              }
              color={
                roadRisk ===
                  "UNSAFE"
                  ? "red"
                  : roadRisk ===
                      "CAUTION"
                    ? "orange"
                    : "blue"
              }
            />


            <IncidentCard
              icon={
                <Hospital
                  size={18}
                />
              }
              status={
                forecast.risk ===
                  "SEVERE"
                  ? "THREATENED"
                  : "MONITOR"
              }
              title="Healthcare Access"
              description="Nearby mapped healthcare context monitored"
              color="blue"
            />

          </div>

        </div>

      </section>


      {/* ================================================= */}
      {/* FORECAST + RESPONSE                               */}
      {/* ================================================= */}

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">

        <div className="glass-panel rounded-[28px] p-5">

          <div className="flex items-center justify-between gap-4">

            <div>

              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Forecast Trend
              </p>

              <h3 className="mt-1 text-lg font-semibold">
                Predicted Flood Depth
              </h3>

            </div>


            <p
              className={`
                text-lg
                font-semibold
                ${
                  forecast.depth >=
                  40
                    ? "text-red-300"
                    : "text-[#8cc7ff]"
                }
              `}
            >
              {formatNumber(
                forecast.depth,
                2,
              )}
              {" cm • "}
              {forecastMinutes ===
              0
                ? "NOW"
                : `+${forecastMinutes} min`}
            </p>

          </div>


          <div className="mt-5 h-[220px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <LineChart
                data={
                  forecastChartData
                }
              >

                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill:
                      "#64748b",

                    fontSize:
                      12,
                  }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={35}
                  tick={{
                    fill:
                      "#64748b",

                    fontSize:
                      11,
                  }}
                />

                <Tooltip
                  contentStyle={{
                    background:
                      "#071a33",

                    border:
                      "1px solid rgba(0,124,247,0.25)",

                    borderRadius:
                      "14px",

                    color:
                      "#ffffff",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="depth"
                  stroke="#007cf7"
                  strokeWidth={3}
                  dot={{
                    fill:
                      "#8cc7ff",

                    strokeWidth:
                      0,

                    r:
                      5,
                  }}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>


          <div className="mt-4 flex flex-wrap gap-2">

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
                    forecastLoading ||
                    demoRunning
                  }
                  onClick={() =>
                    setForecastMinutes(
                      item.value,
                    )
                  }
                  className={`
                    rounded-xl
                    border
                    px-3
                    py-2
                    text-xs
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


          <p className="mt-3 text-[10px] uppercase tracking-[0.1em] text-slate-600">
            Selected point uses the active ML prediction •
            remaining points are prototype scenario previews
          </p>

        </div>


        {/* ================================================= */}
        {/* RESPONSE                                          */}
        {/* ================================================= */}

        <div className="glass-panel rounded-[28px] p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Response Intelligence
              </p>

              <h3 className="mt-1 text-lg font-semibold">
                Recommended Actions
              </h3>

            </div>


            <AlertTriangle
              size={22}
              className={
                forecast.risk ===
                  "SEVERE"
                  ? "text-red-300"
                  : "text-orange-300"
              }
            />

          </div>


          <div className="mt-5 space-y-3">

            <ActionCard
              priority={
                forecast
                  .drainPriority
              }
              icon={
                <Wrench
                  size={17}
                />
              }
              title={`Inspect ${drainId}`}
              subtitle={
                mlResult
                  ?.drainage
                  .recommended_action ||
                "Verify drainage condition in the field"
              }
              onClick={
                onOpenDrainage
              }
            />


            <ActionCard
              priority={
                forecast
                  .drainLoadPercent >=
                  100
                  ? "P1"
                  : "P2"
              }
              icon={
                <Activity
                  size={17}
                />
              }
              title="Prepare Emergency Pump"
              subtitle="Position temporary pumping support near the affected drainage corridor"
            />


            <ActionCard
              priority={
                evacuationPriority
              }
              icon={
                <Users
                  size={17}
                />
              }
              title={`Prepare Evacuation • ${zoneId}`}
              subtitle={`${Math.max(
                0,
                Math.round(
                  evacuationCount,
                ),
              )} people predicted for evacuation`}
              onClick={
                onOpenRescue
              }
            />


            <ActionCard
              priority={
                roadRisk ===
                  "UNSAFE"
                  ? "P1"
                  : "P2"
              }
              icon={
                <Route
                  size={17}
                />
              }
              title="Restrict Unsafe Road Segments"
              subtitle={
                mlResult
                  ?.road
                  .routing_recommendation ||
                "Use the lowest-risk available corridor"
              }
            />

          </div>


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
            Open Model 6 Response Planner
          </button>

        </div>

      </section>


      {/* ================================================= */}
      {/* FIELD OPERATIONS                                  */}
      {/* ================================================= */}

      <section className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">

        <div className="glass-panel rounded-[28px] p-5">

          <div className="flex items-center justify-between gap-4">

            <div>

              <p className="text-xs uppercase tracking-[0.18em] text-[#4da3ff]">
                Field Operations
              </p>

              <h3 className="mt-1 text-xl font-semibold">
                Dispatch Response Jobs
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Tasks use the active detected hotspot coordinates in live mode.
              </p>

            </div>


            <div className="rounded-2xl border border-[#007cf7]/15 bg-[#007cf7]/10 px-4 py-3 text-right">

              <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                Available Teams
              </p>

              <p className="mt-1 text-xl font-semibold text-[#8cc7ff]">
                {availableTeams}
              </p>

            </div>

          </div>


          {taskNotice && (
            <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.07] px-4 py-3 text-sm text-emerald-300">
              {taskNotice}
            </div>
          )}


          {taskError && (
            <div className="mt-4 rounded-2xl border border-red-400/15 bg-red-500/[0.07] px-4 py-3 text-sm text-red-300">
              {taskError}
            </div>
          )}


          <div className="mt-5 grid gap-3 lg:grid-cols-2">

            {jobPresets.map(
              (
                preset,
              ) => {

                const active =
                  hasActiveTask(
                    preset,
                  );

                const assigning =
                  assigningTaskKey ===
                  preset.key;

                const storedTeam =
                  teamSelections[
                    preset.key
                  ] ??
                  preset
                    .defaultTeam;

                const selectedTeam =
                  active
                    ? storedTeam
                    : storedTeam &&
                        !busyTeams.has(
                          storedTeam,
                        )
                      ? storedTeam
                      : FIELD_TEAMS.find(
                          (
                            team,
                          ) =>
                            !busyTeams.has(
                              team,
                            ),
                        );

                const selectedTeamBusy =
                  selectedTeam
                    ? busyTeams.has(
                        selectedTeam,
                      )
                    : true;

                const noTeamsAvailable =
                  availableTeams ===
                  0;

                const waitingForLocation =
                  forecastSource ===
                    "api" &&
                  !hasOperationalLocation;

                return (
                  <article
                    key={
                      preset.key
                    }
                    className="rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-4"
                  >

                    <div className="flex items-start gap-3">

                      <div className="rounded-xl bg-red-500/10 p-2.5 text-red-300">
                        {
                          preset.icon
                        }
                      </div>


                      <div className="min-w-0 flex-1">

                        <div className="flex items-start justify-between gap-3">

                          <div>

                            <p className="text-sm font-semibold text-slate-100">
                              {
                                preset.title
                              }
                            </p>

                            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-red-300">
                              {
                                preset.priority
                              }
                              {" • "}
                              {
                                preset.category
                              }
                            </p>

                          </div>


                          {active && (
                            <span className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2 py-1 text-[9px] font-semibold uppercase text-emerald-300">
                              Active
                            </span>
                          )}

                        </div>


                        <p className="mt-3 text-xs leading-5 text-slate-500">
                          {
                            preset.description
                          }
                        </p>

                      </div>

                    </div>


                    <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">

                      <select
                        value={
                          selectedTeam ??
                          ""
                        }
                        disabled={
                          active ||
                          assigning ||
                          noTeamsAvailable ||
                          waitingForLocation
                        }
                        onChange={(
                          event,
                        ) =>
                          setTeamSelections(
                            (
                              previous,
                            ) => ({
                              ...previous,

                              [preset.key]:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        className="
                          min-w-0
                          rounded-xl
                          border
                          border-white/10
                          bg-[#071a33]
                          px-3
                          py-2.5
                          text-xs
                          text-slate-300
                          outline-none
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                      >

                        {FIELD_TEAMS.map(
                          (
                            team,
                          ) => {

                            const busy =
                              busyTeams.has(
                                team,
                              );

                            return (
                              <option
                                key={
                                  team
                                }
                                value={
                                  team
                                }
                                disabled={
                                  busy
                                }
                              >
                                {team}
                                {busy
                                  ? " • BUSY"
                                  : " • AVAILABLE"}
                              </option>
                            );
                          },
                        )}

                      </select>


                      <button
                        type="button"
                        disabled={
                          active ||
                          assigning ||
                          selectedTeamBusy ||
                          noTeamsAvailable ||
                          waitingForLocation
                        }
                        onClick={() =>
                          void handleAssignTask(
                            preset,
                          )
                        }
                        className="
                          flex
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          border
                          border-[#007cf7]/30
                          bg-[#007cf7]/20
                          px-4
                          py-2.5
                          text-xs
                          font-semibold
                          text-[#8cc7ff]
                          transition
                          hover:bg-[#007cf7]/30
                          disabled:cursor-not-allowed
                          disabled:opacity-40
                        "
                      >
                        {assigning ? (
                          <>
                            <LoaderCircle
                              size={14}
                              className="animate-spin"
                            />

                            Assigning
                          </>
                        ) : active ? (
                          <>
                            <CheckCircle2
                              size={14}
                            />

                            Assigned
                          </>
                        ) : waitingForLocation ? (
                          <>
                            <Clock3
                              size={14}
                            />

                            Waiting for ML
                          </>
                        ) : noTeamsAvailable ? (
                          <>
                            <Clock3
                              size={14}
                            />

                            No Teams
                          </>
                        ) : (
                          <>
                            <Send
                              size={14}
                            />

                            Dispatch
                          </>
                        )}
                      </button>

                    </div>

                  </article>
                );
              },
            )}

          </div>

        </div>


        {/* ================================================= */}
        {/* LIVE QUEUE                                        */}
        {/* ================================================= */}

        <div className="glass-panel rounded-[28px] p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Live Operations
              </p>

              <h3 className="mt-1 text-lg font-semibold">
                Field Job Queue
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Backend synchronization every 3 seconds.
              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                void refreshTasks(
                  true,
                )
              }
              className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-slate-400"
            >
              <RefreshCw
                size={16}
                className={
                  tasksLoading
                    ? "animate-spin"
                    : ""
                }
              />
            </button>

          </div>


          <div className="mt-5 grid grid-cols-3 gap-2">

            <OperationCount
              label="Active"
              value={
                activeTasks.length
              }
              color="blue"
            />

            <OperationCount
              label="Busy"
              value={
                activeTeamCount
              }
              color="orange"
            />

            <OperationCount
              label="Done"
              value={
                completedTasks.length
              }
              color="green"
            />

          </div>


          <div className="mt-5 space-y-3">

            {tasks.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                No field jobs assigned.
              </div>
            ) : (
              [...tasks]
                .reverse()
                .slice(
                  0,
                  8,
                )
                .map(
                  (
                    task,
                  ) => (
                    <FieldJobCard
                      key={
                        task
                          .task_id
                      }
                      task={
                        task
                      }
                    />
                  ),
                )
            )}

          </div>

        </div>

      </section>

    </div>
  );
}


/* ====================================================== */
/* RAINFALL INPUT                                         */
/* ====================================================== */

function RainfallInput({
  label,
  value,
  unit,
  disabled,
  onChange,
}: {
  label:
    string;

  value:
    number;

  unit:
    string;

  disabled:
    boolean;

  onChange: (
    value: number,
  ) => void;
}) {

  return (
    <label className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">

      <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-[#071a33] px-3">

        <input
          type="number"
          min="0"
          step="1"
          value={
            value
          }
          disabled={
            disabled
          }
          onChange={(
            event,
          ) => {
            const next =
              Number(
                event
                  .target
                  .value,
              );

            onChange(
              Number.isFinite(
                next,
              )
                ? Math.max(
                    0,
                    next,
                  )
                : 0,
            );
          }}
          className="
            min-w-0
            flex-1
            bg-transparent
            py-3
            text-lg
            font-semibold
            text-slate-100
            outline-none
            disabled:cursor-wait
            disabled:opacity-50
          "
        />

        <span className="shrink-0 text-xs font-medium text-[#8cc7ff]">
          {unit}
        </span>

      </div>

    </label>
  );
}


/* ====================================================== */
/* FIELD JOB CARD                                         */
/* ====================================================== */

function FieldJobCard({
  task,
}: {
  task:
    FieldTask;
}) {

  const style =
    getTaskStatusStyle(
      task.status,
    );

  return (
    <article className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <div className="flex items-center gap-2">

            <span className="rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-300">
              {task.priority}
            </span>

            <p className="truncate text-sm font-semibold text-slate-200">
              {task.title}
            </p>

          </div>


          <p className="mt-2 text-xs font-medium text-[#8cc7ff]">
            {task.assigned_team}
          </p>

          <p className="mt-1 text-[11px] text-slate-600">
            {task.category}
            {" • "}
            {task.zone_id}
          </p>

        </div>


        <div
          className={`
            flex
            shrink-0
            items-center
            gap-1.5
            rounded-full
            border
            px-2.5
            py-1
            text-[9px]
            font-semibold
            uppercase
            ${style.container}
            ${style.text}
          `}
        >
          {style.icon}

          {formatStatus(
            task.status,
          )}
        </div>

      </div>


      <div className="mt-4 border-t border-white/[0.05] pt-3">

        <div className="mb-3 flex items-center gap-2">

          <Clock3
            size={12}
            className="text-[#4da3ff]"
          />

          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">
            Job Timeline • IST
          </p>

        </div>


        <div className="grid gap-2 sm:grid-cols-2">

          <TaskTimeItem
            label="Posted"
            time={
              formatTaskTime(
                task.created_at,
              )
            }
            fullTime={
              formatTaskDateTime(
                task.created_at,
              )
            }
            active
          />

          <TaskTimeItem
            label="Accepted"
            time={
              formatTaskTime(
                task.accepted_at,
              )
            }
            fullTime={
              formatTaskDateTime(
                task.accepted_at,
              )
            }
            active={
              Boolean(
                task.accepted_at,
              )
            }
          />

          <TaskTimeItem
            label="Started"
            time={
              formatTaskTime(
                task.started_at,
              )
            }
            fullTime={
              formatTaskDateTime(
                task.started_at,
              )
            }
            active={
              Boolean(
                task.started_at,
              )
            }
          />

          <TaskTimeItem
            label="Completed"
            time={
              formatTaskTime(
                task.completed_at,
              )
            }
            fullTime={
              formatTaskDateTime(
                task.completed_at,
              )
            }
            active={
              Boolean(
                task.completed_at,
              )
            }
            completed={
              Boolean(
                task.completed_at,
              )
            }
          />

        </div>

      </div>


      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.04] pt-3">

        <span className="text-[9px] uppercase tracking-[0.12em] text-slate-700">
          Task ID
        </span>

        <span className="font-mono text-[10px] text-slate-600">
          {task.task_id}
        </span>

      </div>

    </article>
  );
}


/* ====================================================== */
/* TASK TIME ITEM                                         */
/* ====================================================== */

function TaskTimeItem({
  label,
  time,
  fullTime,
  active = false,
  completed = false,
}: {
  label:
    string;

  time:
    string;

  fullTime:
    string;

  active?:
    boolean;

  completed?:
    boolean;
}) {

  return (
    <div
      title={
        fullTime
      }
      className={`
        rounded-xl
        border
        px-3
        py-2.5

        ${
          active
            ? completed
              ? "border-emerald-400/10 bg-emerald-500/[0.04]"
              : "border-[#007cf7]/10 bg-[#007cf7]/[0.035]"
            : "border-white/[0.04] bg-white/[0.015]"
        }
      `}
    >

      <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-600">
        {label}
      </p>

      <p
        className={`
          mt-1
          font-mono
          text-[11px]
          font-medium

          ${
            active
              ? completed
                ? "text-emerald-300"
                : "text-[#8cc7ff]"
              : "text-slate-700"
          }
        `}
      >
        {time}
      </p>

    </div>
  );
}


/* ====================================================== */
/* TASK STATUS                                            */
/* ====================================================== */

function getTaskStatusStyle(
  status:
    FieldTask["status"],
) {

  switch (
    status
  ) {

    case "ASSIGNED":
      return {
        container:
          "border-[#007cf7]/20 bg-[#007cf7]/10",

        text:
          "text-[#8cc7ff]",

        icon: (
          <Send
            size={10}
          />
        ),
      };

    case "ACCEPTED":
      return {
        container:
          "border-cyan-400/20 bg-cyan-500/10",

        text:
          "text-cyan-300",

        icon: (
          <CheckCircle2
            size={10}
          />
        ),
      };

    case "IN_PROGRESS":
      return {
        container:
          "border-orange-400/20 bg-orange-500/10",

        text:
          "text-orange-300",

        icon: (
          <Clock3
            size={10}
          />
        ),
      };

    case "COMPLETED":
      return {
        container:
          "border-emerald-400/20 bg-emerald-500/10",

        text:
          "text-emerald-300",

        icon: (
          <CheckCircle2
            size={10}
          />
        ),
      };

    default:
      return {
        container:
          "border-white/10 bg-white/[0.04]",

        text:
          "text-slate-400",

        icon: (
          <Clock3
            size={10}
          />
        ),
      };
  }
}


/* ====================================================== */
/* OPERATION COUNT                                        */
/* ====================================================== */

function OperationCount({
  label,
  value,
  color,
}: {
  label:
    string;

  value:
    number;

  color:
    "blue"
    | "orange"
    | "green";
}) {

  const colors = {
    blue:
      "text-[#8cc7ff]",

    orange:
      "text-orange-300",

    green:
      "text-emerald-300",
  };

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.025] px-3 py-3 text-center">

      <p
        className={`
          text-xl
          font-semibold
          ${colors[color]}
        `}
      >
        {value}
      </p>

      <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-slate-600">
        {label}
      </p>

    </div>
  );
}


/* ====================================================== */
/* FORECAST OPTIONS                                       */
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
/* SIMULATION                                             */
/* ====================================================== */

function getSimulationProgress(
  forecastMinutes:
    ForecastMinute,
) {

  switch (
    forecastMinutes
  ) {

    case 0:
      return 10;

    case 30:
      return 30;

    case 60:
      return 55;

    case 90:
      return 78;

    case 180:
      return 100;

    default:
      return 0;
  }
}


/* ====================================================== */
/* METRIC                                                 */
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

        <div className="min-w-0">

          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
            {title}
          </p>

          <p
            className={`
              mt-3
              truncate
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


/* ====================================================== */
/* INCIDENT                                               */
/* ====================================================== */

function IncidentCard({
  icon,
  status,
  title,
  description,
  color,
  onClick,
}: {
  icon:
    ReactNode;

  status:
    string;

  title:
    string;

  description:
    string;

  color:
    "red"
    | "orange"
    | "blue";

  onClick?:
    () => void;
}) {

  const colors = {
    red:
      "border-red-400/15 bg-red-500/[0.06] text-red-300",

    orange:
      "border-orange-400/15 bg-orange-500/[0.06] text-orange-300",

    blue:
      "border-[#007cf7]/15 bg-[#007cf7]/[0.06] text-[#8cc7ff]",
  };

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`
        flex
        w-full
        items-start
        gap-3
        rounded-2xl
        border
        p-4
        text-left
        ${colors[color]}
      `}
    >

      {icon}


      <div className="min-w-0 flex-1">

        <div className="flex justify-between gap-3">

          <p className="truncate font-medium text-slate-200">
            {title}
          </p>

          <span className="shrink-0 text-[10px] font-semibold uppercase">
            {status}
          </span>

        </div>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>

      </div>

    </button>
  );
}


/* ====================================================== */
/* ACTION                                                 */
/* ====================================================== */

function ActionCard({
  priority,
  icon,
  title,
  subtitle,
  onClick,
}: {
  priority:
    string;

  icon:
    ReactNode;

  title:
    string;

  subtitle:
    string;

  onClick?:
    () => void;
}) {

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="
        flex
        w-full
        items-center
        gap-3
        rounded-2xl
        border
        border-white/5
        bg-white/[0.025]
        p-3
        text-left
      "
    >

      <div className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-red-500/10 text-xs font-semibold text-red-300">
        {priority}
      </div>

      <div className="text-red-300">
        {icon}
      </div>

      <div className="min-w-0">

        <p className="truncate text-sm font-medium text-slate-200">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {subtitle}
        </p>

      </div>

    </button>
  );
}


/* ====================================================== */
/* HELPERS                                                */
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


function formatNumber(
  value:
    number,

  digits =
    1,
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


/* ====================================================== */
/* RISK STYLE                                             */
/* ====================================================== */

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


export default CommandCenterPage;
