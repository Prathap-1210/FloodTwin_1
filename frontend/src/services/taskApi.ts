import {
  api,
} from "./api";


export type TaskStatus =
  | "ASSIGNED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED";


export type FieldTask = {
  task_id: string;

  title: string;
  description: string;

  category: string;
  priority: string;

  assigned_team: string;

  latitude: number;
  longitude: number;

  zone_id: string;

  status: TaskStatus;

  // ============================================
  // TASK LIFECYCLE TIMESTAMPS
  // ============================================

  created_at: string;

  updated_at: string;

  accepted_at:
    string | null;

  started_at:
    string | null;

  completed_at:
    string | null;
};


export type CreateTaskRequest = {
  title: string;

  description: string;

  category: string;

  priority: string;

  assigned_team: string;

  latitude: number;

  longitude: number;

  zone_id: string;
};


/* ====================================================== */
/* CREATE TASK                                            */
/* ====================================================== */

export async function createTask(
  request:
    CreateTaskRequest,
) {
  const response =
    await api.post<FieldTask>(
      "/tasks",
      request,
    );

  return response.data;
}


/* ====================================================== */
/* GET ALL TASKS                                          */
/* ====================================================== */

export async function getTasks() {
  const response =
    await api.get<
      FieldTask[]
    >(
      "/tasks",
    );

  return response.data;
}


/* ====================================================== */
/* GET TEAM TASKS                                         */
/* ====================================================== */

export async function getTeamTasks(
  team:
    string,
) {
  const response =
    await api.get<
      FieldTask[]
    >(
      `/tasks/team/${encodeURIComponent(
        team,
      )}`,
    );

  return response.data;
}


/* ====================================================== */
/* UPDATE STATUS                                          */
/* ====================================================== */

export async function updateTaskStatus(
  taskId:
    string,

  status:
    TaskStatus,
) {
  const response =
    await api.patch<FieldTask>(
      `/tasks/${taskId}`,
      {
        status,
      },
    );

  return response.data;
}


/* ====================================================== */
/* FORMAT TASK TIME — IST                                 */
/* ====================================================== */

export function formatTaskTime(
  timestamp:
    string | null |
    undefined,
) {
  if (
    !timestamp
  ) {
    return "—";
  }

  const date =
    new Date(
      timestamp,
    );

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit",

      hour12:
        true,

      timeZone:
        "Asia/Kolkata",
    },
  );
}


/* ====================================================== */
/* FORMAT TASK DATE + TIME — IST                          */
/* ====================================================== */

export function formatTaskDateTime(
  timestamp:
    string | null |
    undefined,
) {
  if (
    !timestamp
  ) {
    return "—";
  }

  const date =
    new Date(
      timestamp,
    );

  return date.toLocaleString(
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        true,

      timeZone:
        "Asia/Kolkata",
    },
  );
}