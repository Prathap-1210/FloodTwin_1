from uuid import uuid4

from app.core.supabase_client import supabase

from app.schemas.tasks import (
    FieldTask,
    TaskCreate,
    TaskUpdate,
)


# ========================================================
# ACTIVE TASK STATUSES
# ========================================================

ACTIVE_STATUSES = [
    "ASSIGNED",
    "ACCEPTED",
    "IN_PROGRESS",
]


# ========================================================
# DATABASE ROW -> FIELD TASK
# ========================================================

def _row_to_task(
    row: dict,
) -> FieldTask:
    return FieldTask(
        task_id=row["task_id"],

        title=row["title"],
        description=row["description"],

        category=row["category"],
        priority=row["priority"],

        assigned_team=row["assigned_team"],

        latitude=row["latitude"],
        longitude=row["longitude"],

        zone_id=row["zone_id"],

        status=row["status"],

        created_at=row["created_at"],
        updated_at=row["updated_at"],

        accepted_at=row.get(
            "accepted_at"
        ),

        started_at=row.get(
            "started_at"
        ),

        completed_at=row.get(
            "completed_at"
        ),
    )

# ========================================================
# CHECK TEAM AVAILABILITY
# ========================================================

def is_team_busy(
    team: str,
) -> bool:
    response = (
        supabase
        .table("tasks")
        .select("task_id,status")
        .eq(
            "assigned_team",
            team,
        )
        .in_(
            "status",
            ACTIVE_STATUSES,
        )
        .limit(1)
        .execute()
    )

    return bool(
        response.data
    )


# ========================================================
# CREATE TASK
# ========================================================

def create_task(
    request: TaskCreate,
) -> FieldTask:

    # Prevent one team from having
    # multiple active jobs.
    if is_team_busy(
        request.assigned_team
    ):
        raise ValueError(
            f"{request.assigned_team} already has an active task."
        )

    task_id = (
        f"TASK_{uuid4().hex[:8].upper()}"
    )

    payload = {
        "task_id":
            task_id,

        "title":
            request.title,

        "description":
            request.description,

        "category":
            request.category,

        "priority":
            request.priority,

        "assigned_team":
            request.assigned_team,

        "latitude":
            request.latitude,

        "longitude":
            request.longitude,

        "zone_id":
            request.zone_id,

        "status":
            "ASSIGNED",
    }

    try:
        response = (
            supabase
            .table("tasks")
            .insert(
                payload
            )
            .execute()
        )

    except Exception as exc:
        message = str(
            exc
        )

        # Database-level duplicate protection.
        if (
            "23505" in message
            or
            "one_active_task_per_team"
            in message
            or
            "duplicate key" in message.lower()
        ):
            raise ValueError(
                f"{request.assigned_team} already has an active task."
            ) from exc

        raise

    if not response.data:
        raise RuntimeError(
            "Task was not created in Supabase."
        )

    return _row_to_task(
        response.data[0]
    )


# ========================================================
# GET ALL TASKS
# ========================================================

def get_tasks() -> list[FieldTask]:

    response = (
        supabase
        .table("tasks")
        .select("*")
        .order(
            "created_at",
            desc=False,
        )
        .execute()
    )

    return [
        _row_to_task(
            row
        )
        for row in (
            response.data
            or []
        )
    ]


# ========================================================
# GET TASKS FOR TEAM
# ========================================================

def get_team_tasks(
    team: str,
) -> list[FieldTask]:

    response = (
        supabase
        .table("tasks")
        .select("*")
        .eq(
            "assigned_team",
            team,
        )
        .order(
            "created_at",
            desc=True,
        )
        .execute()
    )

    return [
        _row_to_task(
            row
        )
        for row in (
            response.data
            or []
        )
    ]


# ========================================================
# GET ONE TASK
# ========================================================

def get_task(
    task_id: str,
) -> FieldTask | None:

    response = (
        supabase
        .table("tasks")
        .select("*")
        .eq(
            "task_id",
            task_id,
        )
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return _row_to_task(
        response.data[0]
    )


# ========================================================
# UPDATE TASK STATUS
# ========================================================

def update_task(
    task_id: str,
    request: TaskUpdate,
) -> FieldTask | None:

    existing = get_task(
        task_id
    )

    if existing is None:
        return None

    response = (
        supabase
        .table("tasks")
        .update(
            {
                "status":
                    request.status,
            }
        )
        .eq(
            "task_id",
            task_id,
        )
        .execute()
    )

    if not response.data:
        return None

    return _row_to_task(
        response.data[0]
    )