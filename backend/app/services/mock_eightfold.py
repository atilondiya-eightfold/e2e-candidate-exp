"""Mock-fallback hook for upstream-unreachable Eightfold v2 paths.

`ef_proxy.py` consults this only when ENVIRONMENT=local AND the upstream
request errors or the OAuth token mint fails. Returning `None` lets the
proxy propagate the original 502 — which is what we want now that the
BFF is wired against the real tenant; canned responses mask real
failures and make misconfiguration silent.

If you need to dev offline against a known shape, add a targeted stub
here and ship it behind a separate env flag. See the file's git history
(commit pre-`d27b426`) for an example mock_eightfold that covered the
full candidate_prep surface.
"""

from __future__ import annotations

from typing import Any


def mock_for(path: str, params: dict[str, Any]) -> dict[str, Any] | None:  # noqa: ARG001
    return None
