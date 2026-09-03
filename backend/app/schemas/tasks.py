from datetime import datetime
from typing import Literal

from pydantic import BaseModel


TaskStatus = Literal[
    "ASSIGNED",
    "ACCEPTED",
    "IN_PROGRESS",
    "COMPLETED",
]


class TaskCreate(BaseModel):
    title: str
    description: str

    category: str
    priority: str = "P1"

    assigned_team: str

    latitude: float
    longitude: float

    zone_id: str = "Z003"


class TaskUpdate(BaseModel):
    status: TaskStatus


class FieldTask(BaseModel):
    task_id: str

    title: str
    description: str

    category: str
    priority: str

    assigned_team: str

    latitude: float
    longitude: float

    zone_id: str

    status: TaskStatus

    # ============================================
    # SUPABASE TIMESTAMPS
    # ============================================

    created_at: datetime

    updated_at: datetime

    accepted_at: datetime | None = None

    started_at: datetime | None = None

    completed_at: datetime | None = None    