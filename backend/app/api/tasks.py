from fastapi import (
    APIRouter,
    HTTPException,
    status,
)

from app.schemas.tasks import (
    FieldTask,
    TaskCreate,
    TaskUpdate,
)

from app.services.task_service import (
    create_task,
    get_tasks,
    get_team_tasks,
    update_task,
)


router = APIRouter(
    prefix="/tasks",
    tags=["Field Operations"],
)


# ========================================================
# CREATE TASK
# ========================================================

@router.post(
    "",
    response_model=FieldTask,
    status_code=status.HTTP_201_CREATED,
)
def assign_task(
    request: TaskCreate,
):
    try:
        return create_task(
            request
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create field task.",
        ) from exc


# ========================================================
# GET ALL TASKS
# ========================================================

@router.get(
    "",
    response_model=list[FieldTask],
)
def list_tasks():
    try:
        return get_tasks()

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load field tasks.",
        ) from exc


# ========================================================
# GET TASKS FOR TEAM
# ========================================================

@router.get(
    "/team/{team}",
    response_model=list[FieldTask],
)
def list_team_tasks(
    team: str,
):
    try:
        return get_team_tasks(
            team
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load team tasks.",
        ) from exc


# ========================================================
# UPDATE TASK STATUS
# ========================================================

@router.patch(
    "/{task_id}",
    response_model=FieldTask,
)
def change_task_status(
    task_id: str,
    request: TaskUpdate,
):
    try:
        task = update_task(
            task_id,
            request,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update task.",
        ) from exc

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found.",
        )

    return task 