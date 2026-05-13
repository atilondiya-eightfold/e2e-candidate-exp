"""Default mock-fallback for upstream-unreachable Eightfold v2 paths.

Returns shapes that match the v1 candidate-prep contract in
`docs/api-contract.md` §3 + §8. Used in local dev when the upstream call
fails or the OAuth token mint errors out — never in non-local environments.
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
    "position_title": "Staff Software Engineer · Distributed Systems",
    "stages": [
        {
            "stage_id": "s1",
            "name": "Application",
            "status": "completed",
            "stage_type": None,
            "scheduled_at": None,
            "content_available": False,
            "interviewer_name": None,
            "duration_min": 0,
            "estimated_duration_label": "",
            "focus_summary": "",
        },
        {
            "stage_id": "s2",
            "name": "Recruiter conversation",
            "status": "completed",
            "stage_type": "phone_screen",
            "scheduled_at": None,
            "content_available": True,
            "interviewer_name": "Priya",
            "duration_min": 30,
            "estimated_duration_label": "20-30 min",
            "focus_summary": "logistics + motivation",
        },
        {
            "stage_id": "s3",
            "name": "Technical screen",
            "status": "scheduled",
            "stage_type": "tech_screen",
            "scheduled_at": 1744569000,
            "content_available": True,
            "interviewer_name": "Aditi",
            "duration_min": 60,
            "estimated_duration_label": "45-60 min",
            "focus_summary": "system design focus",
        },
        {
            "stage_id": "s4",
            "name": "Full loop interview",
            "status": "pending",
            "stage_type": "onsite",
            "scheduled_at": None,
            "content_available": True,
            "interviewer_name": None,
            "duration_min": 240,
            "estimated_duration_label": "half / full day",
            "focus_summary": "4-5 panel rounds",
        },
        {
            "stage_id": "s5",
            "name": "Team matching",
            "status": "pending",
            "stage_type": None,
            "scheduled_at": None,
            "content_available": False,
            "interviewer_name": None,
            "duration_min": 0,
            "estimated_duration_label": "",
            "focus_summary": "",
        },
        {
            "stage_id": "s6",
            "name": "Decision",
            "status": "pending",
            "stage_type": None,
            "scheduled_at": None,
            "content_available": False,
            "interviewer_name": None,
            "duration_min": 0,
            "estimated_duration_label": "",
            "focus_summary": "",
        },
    ],
    "active_stage_id": "s3",
    "prep_session_id": _DEMO_PREP_SESSION_ID,
}


def _chips(prefix: str) -> list[dict[str, str]]:
    return [
        {"id": f"{prefix}-fundamentals", "label": f"{prefix.title()} fundamentals"},
        {"id": f"{prefix}-practice", "label": f"{prefix.title()} in practice"},
        {"id": f"{prefix}-pitfalls", "label": f"Common {prefix.title()} pitfalls"},
    ]


_DEMO_DIMENSIONS = [
    {
        "dimension_id": "consistency",
        "name": "Consistency",
        "severity": "high",
        "rationale": "Recent projects don't show depth in Consistency. This is one of the highest-impact gaps for this role.",
        "study_topics": _chips("consistency"),
        "candidate_level": 0.0,
        "role_expected_level": 1.0,
    },
    {
        "dimension_id": "failure-modes",
        "name": "Failure modes",
        "severity": "medium",
        "rationale": "Standard hash partitioning visible in your work; multi-region failover patterns less common.",
        "study_topics": _chips("failure-modes"),
        "candidate_level": 0.35,
        "role_expected_level": 1.0,
    },
    {
        "dimension_id": "scaling",
        "name": "Scaling tradeoffs",
        "severity": "medium",
        "rationale": "Single-region services in your history; Google's scale assumes multi-region by default.",
        "study_topics": _chips("scaling"),
        "candidate_level": 0.4,
        "role_expected_level": 1.0,
    },
    {
        "dimension_id": "data-model",
        "name": "Data modeling",
        "severity": "covered",
        "rationale": "Clean entity boundaries and indexing visible across your last three projects.",
        "study_topics": [],
        "candidate_level": 0.85,
        "role_expected_level": 1.0,
    },
]

_DEMO_GAP_ANALYSIS = {
    "prep_session_id": _DEMO_PREP_SESSION_ID,
    "gaps": [
        {"skill_name": "Consistency", "gap_level": 1.0, "source": "role_feed"},
        {"skill_name": "Failure modes", "gap_level": 0.65, "source": "role_feed"},
        {"skill_name": "Scaling tradeoffs", "gap_level": 0.6, "source": "role_feed"},
        {"skill_name": "Data modeling", "gap_level": 0.15, "source": "role_feed"},
    ],
    "dimensions": _DEMO_DIMENSIONS,
    "source": "role_feed",
    "computed_at": _DEMO_TCREATE,
    "cache_hit": False,
}

_DEMO_READINESS = {
    "prep_session_id": _DEMO_PREP_SESSION_ID,
    "score": 62,
    "label": "moderate",
    "top_gaps": ["Consistency", "Failure modes", "Scaling tradeoffs"],
    "components": {"gap_severity": 0.72, "mock": None},
}

_TECH_SCREEN_CONTENT = {
    "stage_type": "tech_screen",
    "title": "Tech screen",
    "description": (
        "A 30–60 min conversation with a Google engineer. System design focus, "
        "may include a coding warmup."
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
    "how_evaluated": [
        "Four dimensions: scaling tradeoffs, data modeling, consistency/CAP, and how structured your answers are.",
        "Each rated weak / partial / solid / strong.",
    ],
    "recruiter_contact_hint": (
        "Your recruiter is the right person if anything changes. Reach out via PCS messages — they usually reply same day."
    ),
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
    ],
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
    "how_evaluated": [
        "Whether your background matches the role's seniority and scope.",
        "Clarity on motivation: 'why now, why this team'.",
    ],
    "recruiter_contact_hint": (
        "Your recruiter runs this one. If you need to reschedule, ping them on the same thread they sent the invite from."
    ),
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


# Study plan keyed off dimension_ids. Per-section resource ids match what the
# spec promises for the chip vocabulary.
_DEMO_STUDY_PLAN = {
    "prep_session_id": _DEMO_PREP_SESSION_ID,
    "total_remaining_min": 240,
    "completed_count": 3,
    "total_count": 7,
    "up_next": {
        "section_id": "consistency",
        "resource_id": "res-jepsen-consistency",
    },
    "sections": [
        {
            "dimension_id": "consistency",
            "name": "Consistency",
            "severity": "high",
            "total_min": 125,
            "completed_count": 0,
            "total_count": 3,
            "completed": False,
            "study_topics": _chips("consistency"),
            "resources": [
                {
                    "id": "res-jepsen-consistency",
                    "title": "Jepsen — Consistency Models",
                    "type": "read",
                    "duration_min": 20,
                    "url": "https://jepsen.io/consistency",
                    "publisher": "jepsen.io",
                    "done": False,
                },
                {
                    "id": "res-kleppmann-cp-ap",
                    "title": "Kleppmann — please stop calling DBs CP or AP",
                    "type": "read",
                    "duration_min": 15,
                    "url": "https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html",
                    "publisher": "martin.kleppmann.com",
                    "done": False,
                },
                {
                    "id": "res-ddia-ch9",
                    "title": "DDIA — Chapter 9 (Consistency & Consensus)",
                    "type": "book",
                    "duration_min": 90,
                    "url": "https://dataintensive.net/",
                    "publisher": "Designing Data-Intensive Applications",
                    "done": False,
                },
            ],
        },
        {
            "dimension_id": "failure-modes",
            "name": "Failure modes",
            "severity": "medium",
            "total_min": 35,
            "completed_count": 0,
            "total_count": 2,
            "completed": False,
            "study_topics": _chips("failure-modes"),
            "resources": [
                {
                    "id": "res-techdummies-sd",
                    "title": "Tech Dummies — How to tackle SD interviews",
                    "type": "video",
                    "duration_min": 20,
                    "url": "https://www.youtube.com/results?search_query=tech+dummies+system+design",
                    "publisher": "YouTube",
                    "done": False,
                },
                {
                    "id": "res-sdp-approach",
                    "title": "System Design Primer — How to approach SD",
                    "type": "read",
                    "duration_min": 15,
                    "url": "https://github.com/donnemartin/system-design-primer",
                    "publisher": "GitHub",
                    "done": False,
                },
            ],
        },
        {
            "dimension_id": "scaling",
            "name": "Scaling tradeoffs & Data model",
            "severity": "covered",
            "total_min": 102,
            "completed_count": 3,
            "total_count": 3,
            "completed": True,
            "study_topics": _chips("scaling"),
            "resources": [
                {
                    "id": "res-sdp-scalability",
                    "title": "System Design Primer — Scalability",
                    "type": "read",
                    "duration_min": 25,
                    "url": "https://github.com/donnemartin/system-design-primer#scalability",
                    "publisher": "GitHub",
                    "done": True,
                },
                {
                    "id": "res-cs50-scalability",
                    "title": "Scalability — Harvard CS50 lecture",
                    "type": "video",
                    "duration_min": 47,
                    "url": "https://www.youtube.com/watch?v=-W9F__D3oY4",
                    "publisher": "YouTube",
                    "done": True,
                },
                {
                    "id": "res-sdp-database",
                    "title": "SDP — Database section",
                    "type": "read",
                    "duration_min": 30,
                    "url": "https://github.com/donnemartin/system-design-primer#database",
                    "publisher": "GitHub",
                    "done": True,
                },
            ],
        },
    ],
}


def _mock_summary(mock_id: str, status: str = "in_progress") -> dict[str, Any]:
    return {
        "mock_id": mock_id,
        "mock_number": 2,
        "title": "Mock #2 — Consistency & Failure modes",
        "duration_sec": 1500,
        "status": status,
        "meeting": {
            "provider": "livekit",
            "url": f"https://meet.livekit.io/?room={mock_id}&token=stub",
            "meeting_id": "91752070224",
            "passcode": "657517",
            "opens_in_new_tab": True,
        },
        "focus": [
            {"dimension_id": "consistency", "label": "Consistency"},
            {"dimension_id": "failure-modes", "label": "Failure modes"},
        ],
        "review": [
            {"dimension_id": "scaling", "label": "Scaling tradeoffs"},
        ],
        "expires_at": _DEMO_TCREATE + 1800,
        "completed_at": _DEMO_TCREATE + 1440 if status == "completed" else None,
        "score": 76 if status == "completed" else None,
    }


_DEMO_MOCK_LIST = [
    {
        "mock_id": "mock_1",
        "mock_number": 1,
        "title": "Scaling tradeoffs",
        "duration_sec": 1320,
        "status": "completed",
        "meeting": None,
        "focus": [{"dimension_id": "scaling", "label": "Scaling"}],
        "review": [],
        "expires_at": None,
        "completed_at": _DEMO_TCREATE - 600_000,
        "score": 48,
    },
    {
        "mock_id": "mock_2",
        "mock_number": 2,
        "title": "Consistency & failure modes",
        "duration_sec": 1440,
        "status": "completed",
        "meeting": None,
        "focus": [
            {"dimension_id": "consistency", "label": "Consistency"},
            {"dimension_id": "failure-modes", "label": "Failure modes"},
        ],
        "review": [],
        "expires_at": None,
        "completed_at": _DEMO_TCREATE - 100_000,
        "score": 62,
    },
]


def _mock_status(mock_id: str) -> dict[str, Any]:
    return {
        "mock_id": mock_id,
        "status": "in_progress",
        "started_at": _DEMO_TCREATE,
        "elapsed_sec": 720,
        "min_viable_duration_sec": 480,
    }


def _mock_feedback(mock_id: str) -> dict[str, Any]:
    return {
        "mock_id": mock_id,
        "mock_number": 2,
        "title": "Consistency & failure modes",
        "completed_at": _DEMO_TCREATE,
        "duration_sec": 1440,
        "score": 76,
        "delta_vs_previous": 14,
        "mira_summary": (
            "Good session. Your data modeling and scaling reasoning are sharp — you "
            "called out partition-by-hash without prompting. Where you lost points "
            "was consistency: you said \"eventual is fine\" without naming the "
            "failure mode someone would actually experience. Tighten that and "
            "you're at 85+."
        ),
        "dimensions": [
            {
                "dimension_id": "scaling",
                "name": "Scaling tradeoffs",
                "level": "solid",
                "comment": "You partitioned writes by hash and accepted regional ownership. Worth practicing hot-key scenarios next.",
                "study_topics": [],
            },
            {
                "dimension_id": "consistency",
                "name": "CAP / consistency",
                "level": "partial",
                "comment": "You picked eventual consistency but didn't tie it to a user-visible failure. Try naming \"two regions create the same short code\" next time.",
                "study_topics": _chips("consistency"),
            },
            {
                "dimension_id": "data-model",
                "name": "Data model",
                "level": "strong",
                "comment": "Clean entity boundaries, indexes called out without prompting.",
                "study_topics": [],
            },
            {
                "dimension_id": "delivery",
                "name": "Structured delivery",
                "level": "solid",
                "comment": "Clear sections, walked through requirements before diving in.",
                "study_topics": [],
            },
        ],
        "moments": [
            {
                "id": f"mom-{mock_id}-strong-1",
                "timestamp": "04:12",
                "level": "strong",
                "quote": "...so for writes I'd partition by hash of the short code and accept regional ownership — that gives us no coordination on the write path...",
                "annotation": None,
            },
            {
                "id": f"mom-{mock_id}-weak-1",
                "timestamp": "11:34",
                "level": "weak",
                "quote": "...for consistency I think eventual works because…",
                "annotation": "(no concrete failure mode named)",
            },
            {
                "id": f"mom-{mock_id}-strong-2",
                "timestamp": "18:02",
                "level": "strong",
                "quote": "...the read path can be served from any region's replica, and we accept a few seconds of staleness on the click count...",
                "annotation": None,
            },
        ],
    }


def _mock_transcript(mock_id: str) -> dict[str, Any]:
    return {
        "mock_id": mock_id,
        "turns": [
            {
                "id": "t1",
                "speaker": "agent",
                "timestamp": "00:00",
                "text": "Hey Aarav, today I'd like to walk through designing a URL shortener at Google scale. Take it from the top — how would you frame it?",
                "highlight": None,
            },
            {
                "id": "t2",
                "speaker": "candidate",
                "timestamp": "00:08",
                "text": "Sure. I'd start by clarifying read-heavy vs write-heavy. For a shortener, reads dominate by 100:1 or more.",
                "highlight": None,
            },
            {
                "id": "t3",
                "speaker": "agent",
                "timestamp": "00:32",
                "text": "Good. Now how would you partition the data?",
                "highlight": None,
            },
            {
                "id": "t4",
                "speaker": "candidate",
                "timestamp": "04:12",
                "text": "...so for writes I'd partition by hash of the short code and accept regional ownership — that gives us no coordination on the write path...",
                "highlight": "strong",
            },
            {
                "id": "t5",
                "speaker": "agent",
                "timestamp": "10:54",
                "text": "And consistency? What happens if two regions generate the same short code?",
                "highlight": None,
            },
            {
                "id": "t6",
                "speaker": "candidate",
                "timestamp": "11:34",
                "text": "...for consistency I think eventual works because…",
                "highlight": "weak",
            },
        ],
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
_MOCK_STATUS = re.compile(r"^candidate_prep/mocks/([^/]+)/status$")
_MOCK_FEEDBACK = re.compile(r"^candidate_prep/mocks/([^/]+)/feedback$")
_MOCK_TRANSCRIPT = re.compile(r"^candidate_prep/mocks/([^/]+)/transcript$")
_MOCK_DETAIL = re.compile(r"^candidate_prep/mocks/([^/]+)$")


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
        content = (
            _TECH_SCREEN_CONTENT
            if stage_id == "s3"
            else _DEMO_DEFAULT_STAGE_CONTENT
        )
        return _envelope(content)
    if m := _STAGE_CAL.match(path):
        return _envelope(_stage_calendar(m.group(1)))
    if path == "candidate_prep/study-plan":
        return _envelope(_DEMO_STUDY_PLAN)
    if path == "candidate_prep/mocks":
        return _envelope(
            _DEMO_MOCK_LIST,
            metadata={"total_found": len(_DEMO_MOCK_LIST), "start_index": 0},
        )
    if m := _MOCK_STATUS.match(path):
        return _envelope(_mock_status(m.group(1)))
    if m := _MOCK_FEEDBACK.match(path):
        return _envelope(_mock_feedback(m.group(1)))
    if m := _MOCK_TRANSCRIPT.match(path):
        return _envelope(_mock_transcript(m.group(1)))
    if m := _MOCK_DETAIL.match(path):
        return _envelope(_mock_summary(m.group(1)))
    return None
