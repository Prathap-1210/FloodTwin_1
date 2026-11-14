import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Navigation,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import DigitalClock from "../components/common/DigitalClock";

import {
  getApiErrorMessage,
} from "../services/api";

import {
  formatTaskDateTime,
  formatTaskTime,
  getTeamTasks,
  updateTaskStatus,
  type FieldTask,
  type TaskStatus,
} from "../services/taskApi";


const FIELD_TEAMS = [
  "Field Team 04",
  "Pump Team 02",
  "Rescue Team 01",
  "Traffic Team 03",
];


/* ====================================================== */
/* FIELD WORKER PAGE                                      */
/* ====================================================== */

function FieldWorkerPage() {
  const [
    selectedTeam,
    setSelectedTeam,
  ] = useState(
    FIELD_TEAMS[0],
  );

  const [
    tasks,
    setTasks,
  ] = useState<
    FieldTask[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(
    true,
  );

  const [
    updatingTask,
    setUpdatingTask,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);


  /* ==================================================== */
  /* LOAD JOBS                                            */
  /* ==================================================== */

  const loadTasks =
    useCallback(
      async (
        showLoader = false,
      ) => {
        if (
          showLoader
        ) {
          setLoading(
            true,
          );
        }

        try {
          const result =
            await getTeamTasks(
              selectedTeam,
            );

          setTasks(
            result,
          );

          setError(
            null,
          );
        } catch (
          err
        ) {
          console.error(
            err,
          );

          setError(
            getApiErrorMessage(
              err,
              "Unable to load assigned jobs",
            ),
          );
        } finally {
          if (
            showLoader
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [
        selectedTeam,
      ],
    );


  /* ==================================================== */
  /* AUTO SYNC                                            */
  /* ==================================================== */

  useEffect(() => {
    const initialLoad =
      window.setTimeout(
        () => {
          void loadTasks(
            true,
          );
        },
        0,
      );

    const timer =
      window.setInterval(
        () => {
          void loadTasks();
        },
        3000,
      );

    return () => {
      window.clearTimeout(
        initialLoad,
      );

      window.clearInterval(
        timer,
      );
    };
  }, [
    loadTasks,
  ]);


  /* ==================================================== */
  /* ACTIVE + HISTORY                                     */
  /* ==================================================== */

  const activeTasks =
    useMemo(
      () =>
        tasks.filter(
          (
            task,
          ) =>
            task.status !==
            "COMPLETED",
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


  /* ==================================================== */
  /* STATUS UPDATE                                        */
  /* ==================================================== */

  const changeStatus =
    async (
      task:
        FieldTask,

      status:
        TaskStatus,
    ) => {
      setUpdatingTask(
        task.task_id,
      );

      setError(
        null,
      );

      try {
        await updateTaskStatus(
          task.task_id,
          status,
        );

        await loadTasks();
      } catch (
        err
      ) {
        console.error(
          err,
        );

          setError(
            getApiErrorMessage(
              err,
              "Unable to update job status",
            ),
          );
      } finally {
        setUpdatingTask(
          null,
        );
      }
    };


  /* ==================================================== */
  /* NAVIGATION                                           */
  /* ==================================================== */

  const navigateToTask =
    (
      task:
        FieldTask,
    ) => {
      const url =
        `https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`;

      window.open(
        url,
        "_blank",
      );
    };


  return (
    <div
      className="
        min-h-screen
        bg-[#020915]
        px-4
        py-5
        text-white
      "
    >
      <div
        className="
          mx-auto
          max-w-md
          space-y-4
        "
      >
        {/* ================================================= */}
        {/* HEADER                                            */}
        {/* ================================================= */}

        <section
          className="
            glass-panel
            rounded-[28px]
            p-5
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-3
            "
          >
            <div>
              <p
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.18em]
                  text-[#4da3ff]
                "
              >
                FloodTwin Field Ops
              </p>

              <h1
                className="
                  mt-1
                  text-xl
                  font-semibold
                "
              >
                Assigned Jobs
              </h1>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Emergency Response Unit
              </p>
            </div>

            <div
              className="
                rounded-2xl
                bg-[#007cf7]/15
                p-3
                text-[#8cc7ff]
              "
            >
              <ShieldCheck
                size={22}
              />
            </div>
          </div>


          {/* LIVE CLOCK */}

          <div
            className="
              mt-5
            "
          >
            <DigitalClock />
          </div>


          {/* TEAM SELECT */}

          <div
            className="
              mt-5
            "
          >
            <label
              className="
                text-[10px]
                uppercase
                tracking-[0.14em]
                text-slate-500
              "
            >
              Field Team
            </label>

            <select
              value={
                selectedTeam
              }
              onChange={(
                event,
              ) =>
                setSelectedTeam(
                  event.target.value,
                )
              }
              className="
                mt-2
                w-full
                rounded-2xl
                border
                border-white/10
                bg-[#071a33]
                px-4
                py-3
                text-sm
                text-slate-200
                outline-none
              "
            >
              {FIELD_TEAMS.map(
                (
                  team,
                ) => (
                  <option
                    key={
                      team
                    }
                    value={
                      team
                    }
                  >
                    {team}
                  </option>
                ),
              )}
            </select>
          </div>
        </section>


        {/* ================================================= */}
        {/* SUMMARY                                           */}
        {/* ================================================= */}

        <section
          className="
            grid
            grid-cols-2
            gap-3
          "
        >
          <SummaryCard
            label="Active"
            value={
              activeTasks.length
            }
            accent="text-orange-300"
          />

          <SummaryCard
            label="Completed"
            value={
              completedTasks.length
            }
            accent="text-emerald-300"
          />
        </section>


        {/* ================================================= */}
        {/* ERROR                                             */}
        {/* ================================================= */}

        {error && (
          <div
            className="
              rounded-2xl
              border
              border-red-400/20
              bg-red-500/10
              px-4
              py-3
              text-sm
              text-red-300
            "
          >
            {error}
          </div>
        )}


        {/* ================================================= */}
        {/* ACTIVE JOB                                        */}
        {/* ================================================= */}

        <section
          className="
            glass-panel
            rounded-[28px]
            p-5
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
            "
          >
            <div>
              <p
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.16em]
                  text-slate-500
                "
              >
                Current Assignment
              </p>

              <h2
                className="
                  mt-1
                  text-lg
                  font-semibold
                "
              >
                Active Job
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadTasks(
                  true,
                )
              }
              className="
                rounded-xl
                border
                border-white/10
                bg-white/[0.04]
                p-2.5
                text-slate-400
              "
            >
              <RefreshCw
                size={16}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />
            </button>
          </div>


          <div
            className="
              mt-5
            "
          >
            {loading ? (
              <div
                className="
                  flex
                  items-center
                  justify-center
                  gap-2
                  py-10
                  text-sm
                  text-slate-500
                "
              >
                <LoaderCircle
                  size={17}
                  className="
                    animate-spin
                  "
                />

                Loading assignment...
              </div>
            ) : activeTasks.length ===
              0 ? (
              <div
                className="
                  rounded-2xl
                  border
                  border-dashed
                  border-white/10
                  bg-white/[0.02]
                  px-4
                  py-10
                  text-center
                "
              >
                <CheckCircle2
                  size={28}
                  className="
                    mx-auto
                    text-emerald-400
                  "
                />

                <p
                  className="
                    mt-3
                    text-sm
                    font-medium
                    text-slate-300
                  "
                >
                  No active assignment
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-600
                  "
                >
                  Waiting for Command
                  Center dispatch.
                </p>
              </div>
            ) : (
              <div
                className="
                  space-y-3
                "
              >
                {activeTasks.map(
                  (
                    task,
                  ) => (
                    <MobileJobCard
                      key={
                        task.task_id
                      }
                      task={
                        task
                      }
                      updating={
                        updatingTask ===
                        task.task_id
                      }
                      onNavigate={() =>
                        navigateToTask(
                          task,
                        )
                      }
                      onStatusChange={(
                        status,
                      ) =>
                        void changeStatus(
                          task,
                          status,
                        )
                      }
                    />
                  ),
                )}
              </div>
            )}
          </div>
        </section>


        {/* ================================================= */}
        {/* COMPLETED HISTORY                                  */}
        {/* ================================================= */}

        {completedTasks.length >
          0 && (
          <section
            className="
              glass-panel
              rounded-[28px]
              p-5
            "
          >
            <p
              className="
                text-[10px]
                uppercase
                tracking-[0.16em]
                text-slate-500
              "
            >
              Job History
            </p>

            <h2
              className="
                mt-1
                text-lg
                font-semibold
              "
            >
              Completed Jobs
            </h2>

            <div
              className="
                mt-4
                space-y-3
              "
            >
              {[...completedTasks]
                .reverse()
                .slice(
                  0,
                  5,
                )
                .map(
                  (
                    task,
                  ) => (
                    <CompletedJobCard
                      key={
                        task.task_id
                      }
                      task={
                        task
                      }
                    />
                  ),
                )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}


/* ====================================================== */
/* MOBILE JOB CARD                                        */
/* ====================================================== */

function MobileJobCard({
  task,
  updating,
  onNavigate,
  onStatusChange,
}: {
  task:
    FieldTask;

  updating:
    boolean;

  onNavigate:
    () => void;

  onStatusChange: (
    status:
      TaskStatus,
  ) => void;
}) {
  return (
    <article
      className="
        rounded-[24px]
        border
        border-[#007cf7]/15
        bg-[#071a33]/70
        p-5
      "
    >
      {/* JOB HEADER */}

      <div
        className="
          flex
          items-start
          justify-between
          gap-3
        "
      >
        <div
          className="
            min-w-0
          "
        >
          <span
            className="
              rounded-lg
              bg-red-500/10
              px-2
              py-1
              text-[10px]
              font-semibold
              text-red-300
            "
          >
            {task.priority}
          </span>

          <h3
            className="
              mt-3
              text-lg
              font-semibold
            "
          >
            {task.title}
          </h3>

          <p
            className="
              mt-2
              text-sm
              leading-6
              text-slate-400
            "
          >
            {task.description}
          </p>
        </div>

        <StatusBadge
          status={
            task.status
          }
        />
      </div>


      {/* LOCATION */}

      <div
        className="
          mt-5
          rounded-2xl
          border
          border-white/5
          bg-black/10
          p-4
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
            text-xs
            text-slate-400
          "
        >
          <MapPin
            size={15}
            className="
              text-[#4da3ff]
            "
          />

          Zone {task.zone_id}
        </div>

        <p
          className="
            mt-2
            text-[11px]
            text-slate-600
          "
        >
          {task.latitude},{" "}
          {task.longitude}
        </p>
      </div>


      {/* ================================================= */}
      {/* JOB TIMELINE                                      */}
      {/* ================================================= */}

      <JobTimeline
        task={
          task
        }
      />


      {/* NAVIGATION */}

      <button
        type="button"
        onClick={
          onNavigate
        }
        className="
          mt-4
          flex
          w-full
          items-center
          justify-center
          gap-2
          rounded-2xl
          border
          border-[#007cf7]/20
          bg-[#007cf7]/10
          px-4
          py-3
          text-sm
          font-medium
          text-[#8cc7ff]
          transition
          hover:bg-[#007cf7]/20
        "
      >
        <Navigation
          size={16}
        />

        Navigate to Job
      </button>


      {/* STATUS ACTION */}

      <div
        className="
          mt-3
        "
      >
        {updating ? (
          <button
            disabled
            className="
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-white/5
              px-4
              py-3
              text-sm
              text-slate-500
            "
          >
            <LoaderCircle
              size={16}
              className="
                animate-spin
              "
            />

            Updating...
          </button>
        ) : task.status ===
          "ASSIGNED" ? (
          <PrimaryAction
            icon={
              <CheckCircle2
                size={17}
              />
            }
            label="Accept Job"
            onClick={() =>
              onStatusChange(
                "ACCEPTED",
              )
            }
          />
        ) : task.status ===
          "ACCEPTED" ? (
          <PrimaryAction
            icon={
              <PlayCircle
                size={17}
              />
            }
            label="Start Work"
            onClick={() =>
              onStatusChange(
                "IN_PROGRESS",
              )
            }
          />
        ) : task.status ===
          "IN_PROGRESS" ? (
          <PrimaryAction
            icon={
              <CheckCircle2
                size={17}
              />
            }
            label="Complete Job"
            onClick={() =>
              onStatusChange(
                "COMPLETED",
              )
            }
          />
        ) : null}
      </div>


      <p
        className="
          mt-4
          text-center
          font-mono
          text-[10px]
          text-slate-600
        "
      >
        Job ID • {task.task_id}
      </p>
    </article>
  );
}


/* ====================================================== */
/* JOB TIMELINE                                           */
/* ====================================================== */

function JobTimeline({
  task,
}: {
  task:
    FieldTask;
}) {
  return (
    <div
      className="
        mt-4
        rounded-2xl
        border
        border-[#007cf7]/10
        bg-[#007cf7]/[0.035]
        p-4
      "
    >
      <div
        className="
          flex
          items-center
          gap-2
        "
      >
        <Clock3
          size={14}
          className="
            text-[#4da3ff]
          "
        />

        <p
          className="
            text-[9px]
            font-semibold
            uppercase
            tracking-[0.16em]
            text-slate-500
          "
        >
          Operational Timeline • IST
        </p>
      </div>

      <div
        className="
          mt-4
          grid
          grid-cols-2
          gap-2
        "
      >
        <TimelineItem
          label="Posted"
          timestamp={
            task.created_at
          }
          active
        />

        <TimelineItem
          label="Accepted"
          timestamp={
            task.accepted_at
          }
          active={
            Boolean(
              task.accepted_at,
            )
          }
        />

        <TimelineItem
          label="Started"
          timestamp={
            task.started_at
          }
          active={
            Boolean(
              task.started_at,
            )
          }
        />

        <TimelineItem
          label="Completed"
          timestamp={
            task.completed_at
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
  );
}


/* ====================================================== */
/* TIMELINE ITEM                                          */
/* ====================================================== */

function TimelineItem({
  label,
  timestamp,
  active = false,
  completed = false,
}: {
  label:
    string;

  timestamp:
    string | null |
    undefined;

  active?:
    boolean;

  completed?:
    boolean;
}) {
  return (
    <div
      title={
        formatTaskDateTime(
          timestamp,
        )
      }
      className={`
        rounded-xl
        border
        px-3
        py-2.5

        ${
          active
            ? completed
              ? `
                border-emerald-400/10
                bg-emerald-500/[0.05]
              `
              : `
                border-[#007cf7]/10
                bg-[#007cf7]/[0.04]
              `
            : `
              border-white/[0.04]
              bg-white/[0.015]
            `
        }
      `}
    >
      <p
        className="
          text-[8px]
          font-semibold
          uppercase
          tracking-[0.14em]
          text-slate-600
        "
      >
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
        {formatTaskTime(
          timestamp,
        )}
      </p>
    </div>
  );
}


/* ====================================================== */
/* COMPLETED JOB CARD                                     */
/* ====================================================== */

function CompletedJobCard({
  task,
}: {
  task:
    FieldTask;
}) {
  return (
    <article
      className="
        rounded-2xl
        border
        border-emerald-400/10
        bg-emerald-500/[0.04]
        p-4
      "
    >
      <div
        className="
          flex
          items-start
          justify-between
          gap-3
        "
      >
        <div
          className="
            min-w-0
          "
        >
          <p
            className="
              text-sm
              font-medium
              text-slate-300
            "
          >
            {task.title}
          </p>

          <p
            className="
              mt-1
              text-[10px]
              text-slate-600
            "
          >
            {task.category}
            {" • "}
            {task.zone_id}
          </p>
        </div>

        <span
          className="
            shrink-0
            text-[9px]
            font-semibold
            text-emerald-300
          "
        >
          COMPLETED
        </span>
      </div>

      <JobTimeline
        task={
          task
        }
      />

      <p
        className="
          mt-3
          text-right
          font-mono
          text-[9px]
          text-slate-700
        "
      >
        {task.task_id}
      </p>
    </article>
  );
}


/* ====================================================== */
/* PRIMARY ACTION                                         */
/* ====================================================== */

function PrimaryAction({
  icon,
  label,
  onClick,
}: {
  icon:
    ReactNode;

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
        flex
        w-full
        items-center
        justify-center
        gap-2
        rounded-2xl
        bg-[#007cf7]
        px-4
        py-3
        text-sm
        font-semibold
        text-white
        transition
        hover:bg-[#168cff]
      "
    >
      {icon}

      {label}
    </button>
  );
}


/* ====================================================== */
/* STATUS BADGE                                           */
/* ====================================================== */

function StatusBadge({
  status,
}: {
  status:
    TaskStatus;
}) {
  const config = {
    ASSIGNED: {
      label:
        "NEW",

      style:
        "border-[#007cf7]/20 bg-[#007cf7]/10 text-[#8cc7ff]",

      icon: (
        <Clock3
          size={10}
        />
      ),
    },

    ACCEPTED: {
      label:
        "ACCEPTED",

      style:
        "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",

      icon: (
        <CheckCircle2
          size={10}
        />
      ),
    },

    IN_PROGRESS: {
      label:
        "IN PROGRESS",

      style:
        "border-orange-400/20 bg-orange-500/10 text-orange-300",

      icon: (
        <Clock3
          size={10}
        />
      ),
    },

    COMPLETED: {
      label:
        "COMPLETED",

      style:
        "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",

      icon: (
        <CheckCircle2
          size={10}
        />
      ),
    },
  };

  const current =
    config[
      status
    ];

  return (
    <span
      className={`
        flex
        shrink-0
        items-center
        gap-1
        rounded-full
        border
        px-2.5
        py-1
        text-[9px]
        font-semibold

        ${current.style}
      `}
    >
      {current.icon}

      {current.label}
    </span>
  );
}


/* ====================================================== */
/* SUMMARY                                                */
/* ====================================================== */

function SummaryCard({
  label,
  value,
  accent,
}: {
  label:
    string;

  value:
    number;

  accent:
    string;
}) {
  return (
    <div
      className="
        glass-card
        rounded-[22px]
        p-4
        text-center
      "
    >
      <p
        className={`
          text-2xl
          font-semibold
          ${accent}
        `}
      >
        {value}
      </p>

      <p
        className="
          mt-1
          text-[10px]
          uppercase
          tracking-[0.12em]
          text-slate-600
        "
      >
        {label}
      </p>
    </div>
  );
}


export default FieldWorkerPage;
