"""Default mock-fallback for upstream-unreachable Eightfold v2 paths.

When `ef_proxy.py` cannot reach upstream (`httpx.RequestError`),
it falls back to `mock_for(path, params)`. Add per-route stubs
here as your product needs them.
"""

from __future__ import annotations

from typing import Any


def mock_for(path: str, params: dict[str, Any]) -> dict[str, Any] | None:  # noqa: ARG001
    """Return a canned response shaped like upstream EF, or None.

    Returning None lets `ef_proxy` propagate the original upstream error.
    """
    # Example — uncomment + adapt for your project:
    #
    # if path == "/employees" and "filterQuery" in params:
    #     return {
    #         "data": [{
    #             "id": "demo-encoded-id",
    #             "email": params["filterQuery"].split(":", 1)[-1],
    #         }],
    #     }
    return None
