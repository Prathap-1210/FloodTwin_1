import os
from typing import Annotated

from fastapi import (
    Depends,
    HTTPException,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from app.core.supabase_client import supabase


bearer_scheme = HTTPBearer(
    auto_error=False,
)


def _authorized_emails() -> set[str]:
    return {
        email.strip().lower()
        for email in os.getenv(
            "AUTHORIZED_EMAILS",
            "",
        ).split(",")
        if email.strip()
    }


def require_operator(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
):
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    try:
        response = supabase.auth.get_user(
            credentials.credentials,
        )
        user = response.user
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is invalid or expired.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        ) from exc

    if user is None or not user.email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user has no email address.",
        )

    authorized_emails = _authorized_emails()

    if not authorized_emails:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Operator access is not configured.",
        )

    if user.email.lower() not in authorized_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is not authorized for FloodTwin.",
        )

    return user
