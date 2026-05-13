"""Default mock-fallback for upstream-unreachable Eightfold v2 paths.

When `ef_proxy.py` cannot reach upstream (`httpx.RequestError` or token
mint failure), it falls back to `mock_for(path, params)`. Returns shapes
that match `apiv2.<tenant>.ai/api/v2/candidate_prep/*` per
`docs/api-contract.md`.

Local dev only — the proxy only consults `mock_for` when
`settings.ENVIRONMENT == "local"`.
"""

from __future__ import annotations

import re
from typing import Any

# Stable demo data — keep IDs/strings constant so screenshot diffs are stable.
_DEMO_PREP_SESSION_ID = "djF8NDJ8OTl8YWJjZGVm"
_DEMO_APP_ID = 7
_DEMO_POSITION_ID = 99
_DEMO_TCREATE = 1715000000

_DEMO_APPLICATIONS = [
    {
        "application_id": _DEMO_APP_ID,
        "position_id": _DEMO_POSITION_ID,
        "position_title": "Staff Software Engineer · Distributed Systems",
        "current_stage": {"name": "Tech Screen", "status": "scheduled"},
        "status": "active",
        "t_create": _DEMO_TCREATE,
        "prep_session_id": _DEMO_PREP_SESSION_ID,
    }
]

_DEMO_APPLICATION_DETAIL = {
    "application_id": _DEMO_APP_ID,
    "position_id": _DEMO_POSITION_ID,
    "stages": [
        {
            "stage_id": "s1",
            "name": "Application",
            "status": "completed",
            "stage_type": None,
            "scheduled_at": None,
            "content_available": False,
        },
        {
            "stage_id": "s2",
            "name": "Recruiter conversation",
            "status": "completed",
            "stage_type": "phone_screen",
            "scheduled_at": None,
            "content_available": True,
        },
        {
            "stage_id": "s3",
            "name": "Technical screen",
            "status": "scheduled",
            "stage_type": "tech_screen",
            "scheduled_at": 1744569000,
            "content_available": True,
        },
        {
            "stage_id": "s4",
            "name": "Full loop interview",
            "status": "pending",
            "stage_type": "onsite",
            "scheduled_at": None,
            "content_available": True,
        },
        {
            "stage_id": "s5",
            "name": "Team matching",
            "status": "pending",
            "stage_type": None,
            "scheduled_at": None,
            "content_available": False,
        },
        {
            "stage_id": "s6",
            "name": "Decision",
            "status": "pending",
            "stage_type": None,
            "scheduled_at": None,
            "content_available": False,
        },
    ],
    "active_stage_id": "s3",
    "prep_session_id": _DEMO_PREP_SESSION_ID,
}

_DEMO_GAP_ANALYSIS = {
    "prep_session_id": _DEMO_PREP_SESSION_ID,
    "gaps": [
        {"skill_name": "Distributed consensus", "gap_level": 1.0, "source": "role_feed"},
        {"skill_name": "CAP / consistency models", "gap_level": 0.92, "source": "role_feed"},
        {"skill_name": "Multi-region failover", "gap_level": 0.65, "source": "role_feed"},
        {"skill_name": "Hot-key sharding strategies", "gap_level": 0.6, "source": "role_feed"},
        {"skill_name": "Streaming / event sourcing", "gap_level": 0.55, "source": "role_feed"},
    ],
    "source": "role_feed",
    "computed_at": _DEMO_TCREATE,
    "cache_hit": False,
}

_DEMO_READINESS = {
    "prep_session_id": _DEMO_PREP_SESSION_ID,
    "score": 62,
    "label": "moderate",
    "top_gaps": [
        "Distributed consensus",
        "CAP / consistency models",
        "Multi-region failover",
    ],
    "components": {"gap_severity": 0.72, "mock": None},
}

_DEMO_STAGE_CONTENT: dict[str, dict[str, Any]] = {
    "s3": {
        "stage_type": "tech_screen",
        "title": "Tech screen",
        "description": (
            "A 30–60 min conversation with a Google engineer. System design focus, "
            "may include a coding warmup. Adaptive — they go deeper on areas you "
            "sound strong in."
        ),
        "what_to_expect": [
            "30-60 min voice call with one engineer, no panel.",
            "System-design style prompt; you drive the discussion.",
            "Coding warmup possible; nothing tricky — just shows you can write code.",
        ],
        "checklist": [
            "Headphones + a quiet room — voice quality matters.",
            "Plan for the full hour uninterrupted.",
            "Think out loud — the interviewer only scores what they hear.",
        ],
        "resources": [
            {
                "title": "Jepsen — Consistency Models",
                "url": "https://jepsen.io/consistency",
                "minutes": 20,
                "type": "read",
            },
            {
                "title": "Kleppmann — please stop calling DBs CP or AP",
                "url": "https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html",
                "minutes": 15,
                "type": "read",
            },
            {
                "title": "DDIA — Chapter 9 (Consistency & Consensus)",
                "url": "https://dataintensive.net/",
                "minutes": 90,
                "type": "book",
            },
        ],
    },
}
_DEMO_DEFAULT_STAGE_CONTENT = {
    "stage_type": "__default__",
    "title": "Prep for this stage",
    "description": (
        "Specific prep content for this stage type isn't curated yet. "
        "The fundamentals on your study plan still apply."
    ),
    "what_to_expect": [
        "Confirm logistics with your recruiter via PCS.",
        "Block uninterrupted time for the conversation.",
    ],
    "checklist": [
        "Re-read the role description.",
        "Have a few stories ready about recent projects.",
    ],
    "resources": [],
}


def _stage_calendar(stage_id: str) -> dict[str, Any]:
    return {
        "stage_id": stage_id,
        "filename": f"stage-{stage_id}.ics",
        "ics": (
            "BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"
            "PRODID:-//Eightfold//candidate-prep-mock//EN\r\n"
            "BEGIN:VEVENT\r\n"
            f"UID:stage-{stage_id}@candidate-prep-mock\r\n"
            "DTSTAMP:20260513T053500Z\r\n"
            "DTSTART:20260413T133000Z\r\n"
            "DTEND:20260413T143000Z\r\n"
            "SUMMARY:Staff Software Engineer - Technical screen\r\n"
            "END:VEVENT\r\nEND:VCALENDAR\r\n"
        ),
    }


def _envelope(data: Any, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    body: dict[str, Any] = {"data": data, "errors": []}
    if metadata is not None:
        body["metadata"] = metadata
    return body


_GAP = re.compile(r"^candidate_prep/prep-session/([^/]+)/gap-analysis$")
_READY = re.compile(r"^candidate_prep/prep-session/([^/]+)/readiness$")
_STAGE_CONTENT = re.compile(r"^candidate_prep/stage/([^/]+)/content$")
_STAGE_CAL = re.compile(r"^candidate_prep/stage/([^/]+)/calendar$")
_APP_DETAIL = re.compile(r"^candidate_prep/applications/(\d+)$")


def mock_for(path: str, params: dict[str, Any]) -> dict[str, Any] | None:  # noqa: ARG001
    """Return a canned response shaped like upstream EF, or None."""
    if path == "candidate_prep/applications":
        return _envelope(
            _DEMO_APPLICATIONS,
            metadata={"total_found": len(_DEMO_APPLICATIONS), "start_index": 0},
        )
    if _APP_DETAIL.match(path):
        return _envelope(_DEMO_APPLICATION_DETAIL)
    if _GAP.match(path):
        return _envelope(_DEMO_GAP_ANALYSIS)
    if _READY.match(path):
        return _envelope(_DEMO_READINESS)
    if m := _STAGE_CONTENT.match(path):
        stage_id = m.group(1)
        content = _DEMO_STAGE_CONTENT.get(stage_id, _DEMO_DEFAULT_STAGE_CONTENT)
        return _envelope(content)
    if m := _STAGE_CAL.match(path):
        return _envelope(_stage_calendar(m.group(1)))
    return None
