from typing import Any, Dict, Optional

import os

import requests

from .settings import get_settings


class SupabaseConfigError(RuntimeError):
    pass


def _get_base_headers(service_role: bool = False) -> Dict[str, str]:
    settings = get_settings()

    url = os.getenv("SUPABASE_URL")
    anon_key = os.getenv("SUPABASE_ANON_KEY")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    api_key: Optional[str]
    if service_role:
        api_key = service_role_key or anon_key
    else:
        api_key = anon_key

    if not url or not api_key:
        raise SupabaseConfigError("Supabase URL or API key is not configured.")

    return {
        "Authorization": f"Bearer {api_key}",
        "apikey": api_key,
        "Content-Type": "application/json",
    }


def _get_supabase_rest_url(table: str) -> str:
    url = os.getenv("SUPABASE_URL")
    if not url:
        raise SupabaseConfigError("SUPABASE_URL is not configured.")
    return f"{url.rstrip('/')}/rest/v1/{table}"


def insert_row(
    table: str,
    data: Dict[str, Any],
    *,
    service_role: bool = True,
    timeout: float = 5.0,
) -> Dict[str, Any]:
    """Insert a single row into a Supabase table via REST."""
    endpoint = _get_supabase_rest_url(table)
    headers = _get_base_headers(service_role=service_role)

    response = requests.post(
        endpoint,
        headers={**headers, "Prefer": "return=representation"},
        json=data,
        timeout=timeout,
    )
    response.raise_for_status()
    parsed = response.json()
    if isinstance(parsed, list) and parsed:
        return parsed[0]
    return parsed


def log_risk_analysis(
    *,
    table: str = "risk_analyses",
    session_id: Optional[str] = None,
    query: Optional[str] = None,
    risk_summary: Optional[str] = None,
    risk_score: Optional[float] = None,
    metadata: Optional[Dict[str, Any]] = None,
    timeout: float = 5.0,
) -> None:
    """Convenience helper to log a risk analysis event to Supabase."""
    payload: Dict[str, Any] = {}
    if session_id is not None:
        payload["session_id"] = session_id
    if query is not None:
        payload["query"] = query
    if risk_summary is not None:
        payload["risk_summary"] = risk_summary
    if risk_score is not None:
        payload["risk_score"] = risk_score
    if metadata:
        payload["metadata"] = metadata

    # If Supabase is not configured, fail gracefully to keep core flow working.
    try:
        if payload:
            insert_row(table, payload, service_role=True, timeout=timeout)
    except SupabaseConfigError:
        # Supabase not configured; ignore in local/dev setups.
        return
    except requests.RequestException:
        # Network or API error; for now we silently ignore to avoid breaking main flow.
        return

