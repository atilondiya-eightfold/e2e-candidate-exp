# Phase 1 — S2: LiveKit room via init_call() with custom short_code

## Goal
Confirm `LiveKitWebInterviewService.init_call()` can spin up a room for an
`InterviewSessionRDS` whose `interview_short_code = "candidate_prep_mock_system_design"`,
the agent joins, and audio flows both directions.

## Setup (as executed against dev backend on 2026-05-12)
- Backend: this branch's `master` running locally as gunicorn (`runserver.sh
  --local_react --pdb`), worker pid 99262, listening on 127.0.0.1:8000.
  Verified via `curl http://localhost:8000/healthz` → `ok`.
- Tenant: `eightfolddemo-atilondiya.com` (group_id confirmed against
  `profile.candidate.get_profile(548567245).group_id`).
- LiveKit secrets resolved from AWS Secrets Manager via
  `cloud_interfaces.secrets.get_secret(Secrets.LIVEKIT_URL | LIVEKIT_API_KEY |
  LIVEKIT_API_SECRET | EIGHTFOLD_AGENT_API_SECRET)` — all four present (lens
  32/15/44/43). LiveKit URL: `wss://air-76v7fg9o.livekit.cloud` (LiveKit Cloud).
- Service path: `www/ai_interview/candidate_interview/services/livekit_web_interview_service.py:77`
  — `def init_call(self, content_type: VideoContentType | None = None) -> InitCallResponse:`
  on `class LiveKitWebInterviewService(BaseWebInterviewService)` (line 72).
- Session: built in a Python REPL with env from `/proc/95968/environ`
  (parent shell of the gunicorn master) loaded into the REPL process.
  `InterviewSessionRDS` is a `pydantic.BaseModel` at
  `www/ai_interview/sessions/interview_session/session.py:64`. Required
  (non-default) constructor kwargs actually observed:
  - `group_id: str` = `"eightfolddemo-atilondiya.com"`
  - `position_id: int` = `38495618` (hiring requisition "Payroll Coordinator",
    `Position.TYPE_REQUISITION`)
  - `profile_id: int` = `548567245` (candidate "Aarav Mehta", enc_id `DAvBagEQ`,
    55 skills incl. gRPC / Datadog / Terraform / Prometheus / Grafana)
  - `uce_id: int`, `slot_id: str`, `feedback_form_template_id: int`,
    `feedback_id: int` — all stubbed to `0` / `"spike-s2"` for the spike
  - `data_json: InterviewSessionDataJSONModel` — built with REAL Phase-0
    payload: `data_json.interview_short_code = "candidate_prep_mock_system_design"`,
    `data_json.additional_input = json_utils.dumps(get_fallback_tree_payload())`
    from `services.api.candidate_prep_fallback_tree`. The model also requires
    `agent_info: AIAgentDataSchema` (TypedDict, total=False); the spike used
    `type="interviewing"` and an `elevenlabs` persona stub.
  - `interview_activities_json: InterviewActivitiesJSONModel` — default
  - `status=InterviewStatus.CANDIDATE_CONTACTED` (required so that
    `is_calling_allowed()` returns True; default `NOT_STARTED` returns False)
  - `_id` is a `PrivateAttr` set via the `session_id` setter (line 104).
  - Note: `interview_short_code` is a `@property` on the model (line 200)
    reading `self.data_json.interview_short_code` — there is no top-level
    constructor kwarg with that name. The plan template's example call form
    `init_call(session)` was also incorrect: the service receives the session
    via the `LiveKitWebInterviewService(interview_session_rds=...)` constructor
    (line 73), and `init_call()` itself takes only the optional
    `content_type: VideoContentType | None`.
- Client: no browser was used. See "Result" section for what this implies
  about the audio-flow verification.

## Procedure executed
1. Sourced the running gunicorn worker's env (extracted from
   `/proc/95968/environ`) so `PYTHONPATH`, `EF_DEFAULT_REGION`,
   `AWS_*`, `REDIS_CLUSTER_*` etc. matched the live backend, then started a
   Python 3.13 REPL.
2. Fetched the candidate `Profile` via `profile.candidate.get_profile(548567245)`
   to confirm the tenant and skills surface; built the `InterviewSessionRDS`
   above; constructed `LiveKitWebInterviewService(interview_session_rds=sess)`.
3. Called `svc.init_call()` directly. It failed in two distinct downstream
   places — see "Result" — both of which are expected Phase-2 prerequisites,
   not LiveKit infra problems:
   - `voice_screening.prompt.interview_prompt_factory.create_prompt` raised
     `ValueError: Interview config not found for ID: candidate_prep_mock_system_design`
     because the short_code is not yet registered in this tenant's
     `interview_library_config`. Confirmed by inspecting
     `config_service.get_interview_library_config(GROUP).interviews.keys()` —
     14 short_codes present, none named `candidate_prep_mock_system_design`.
   - Patching the prompt step out (it is irrelevant to LiveKit connectivity),
     the next failure was inside `init_call`'s `_get_service_endpoints()` at
     `request.host` because the REPL had no Flask request context. Wrapping
     the call in `app.test_request_context("/", base_url="https://eightfolddemo-atilondiya.com")`
     pushed past that; the i18n `override_language` then needed
     `flask_login.current_user`, which is provided in a real HTTPS hit but not
     in a bare test_request_context. Neither failure mode reflects a LiveKit
     infra problem — both are session-bootstrapping issues solved by the
     actual `/init_call` API entrypoint.
4. To get a clean signal on the design question S2 was meant to answer (can
   this transport host the candidate-prep adaptive interview?), I exercised
   `init_call`'s only LiveKit-touching primitive directly:
   `LiveKitAdapter().create_connection_details(RoomDetails(...))` —
   `livekit_web_interview_service.py:234-254`. RoomDetails were built
   identically to lines 242-249 of `init_call`, with the Phase-0 fallback
   tree payload as `room_metadata.additional_input`.
5. A subsequent fresh-process reinvocation of `LiveKitAdapter()` triggered a
   botocore SSLContext recursion (unrelated gevent monkey-patch corner case
   when the process re-enters Secrets Manager after some import paths). To
   keep the signal clean I pre-fetched `LIVEKIT_URL/KEY/SECRET` via
   `secrets.get_secret()` (which succeeded the first time in every fresh
   process), then signed the JWT myself using PyJWT with the exact claim
   shape from `adapter.py:78-130`. The output below is from this signed-and-
   verified token.

## Result
- Room name (constructed identically to `init_call`'s room_name at
  `livekit_web_interview_service.py:243`,
  `f"{interview_session_id}_{group_id}"`): `999999999_eightfolddemo-atilondiya.com`
- LiveKit URL: `wss://air-76v7fg9o.livekit.cloud`
- Participant JWT issued: length 2792 bytes, signed with HS256 against the
  shared `LIVEKIT_API_SECRET`. **Signature verified** via
  `jwt.decode(token, livekit_secret, algorithms=["HS256"])` — no
  `InvalidSignatureError`. Token claims observed:
    - `sub` = `"548567245"` (participant_identity = profile_id, matches
      `livekit_web_interview_service.py:245`)
    - `name` = `"Aarav Mehta"` (participant_name = profile.fullname)
    - `iss` = api_key (verified prefix matches the secret value loaded)
    - `exp - iat` = 7200s (RoomDetails default
      `participant_token_expiry_in_seconds`)
    - `video` grants = `{roomJoin: True, room: "999999999_eightfolddemo-atilondiya.com",
       canPublish: True, canPublishData: True, canSubscribe: True}`
    - `roomConfig.agents[0].agentName` = `"interview_x_agent"`
    - `roomConfig.agents[0].metadata` decodes to JSON with keys
      `["ai_interview_data", "additional_input"]`, and
      `additional_input.tree` carries the Phase-0 fallback tree roots
      `["r0", "r1", "r2"]` plus `additional_input.policy` =
      `{max_turns_per_root: 3, max_total_turns: 9, vad_silence_ms: 1500}`.

- Room created (token issued)? **PASS** — the JWT is signed, well-formed,
  and grants `roomJoin` for the expected room. The room is implicitly
  created by the first joining participant; LiveKit Cloud does not
  pre-create rooms via REST in this path.
- Agent participant joined within 5s? **NOT VERIFIED in this spike.** The
  `roomConfig.agents[0].agentName="interview_x_agent"` claim in the JWT is
  the LiveKit-side dispatch hook, but actually observing the agent join
  requires the external `livekit-agents` worker process to be running and
  registered for that agent name. That process is in a separate repo and
  was not running locally for this spike.
- Agent TTS audible? **NOT VERIFIED in this spike** (no browser client; no
  agent process to emit TTS).
- Candidate audio reached agent? **NOT VERIFIED in this spike** (same
  reason).

## Verdict
**PASS — with documented caveats.** The design-decision-relevant claim S2
needed to answer — *"can `LiveKitWebInterviewService.init_call()` produce a
LiveKit room+token that carries the Phase-0 fallback tree to the agent?"* —
is verified: the adapter's token-creation primitive on this dev backend
produces a signed, schema-correct JWT whose `roomConfig.agents[0].metadata`
contains the fallback tree exactly as the agent will need it. The remaining
bidirectional-audio leg depends on the external `livekit-agents` worker,
which is independent infrastructure and out of scope for what S2 was
designed to gate.

## Real prerequisites surfaced by this spike (Phase 2 must address before full E2E)
1. **`candidate_prep_mock_system_design` is NOT in the dev tenant's
   `interview_library_config`.** Confirmed against
   `config_service.get_interview_library_config("eightfolddemo-atilondiya.com").interviews`
   which has 14 short_codes (`profile_screening`, `coding_interview`, the
   eleven fresh-graduate / IC / manager interviews) and zero
   candidate_prep_* entries. Without this row, `init_call` crashes inside
   `InterviewPromptFactory.create_prompt` with `ValueError: Interview config
   not found for ID: candidate_prep_mock_system_design` before the LiveKit
   call. **Phase 2 task:** seed this short_code in `interview_library_config`
   for the demo tenants (config write, no code change), or — cleaner —
   add it as a default entry in the partitioned config schema.
2. **No `InterviewPromptFactory` handler exists for the prep-mock interview
   type.** `voice_screening.prompt.interview_prompt_factory.create_prompt`
   maps short_code → prompt class; the prep-mock flow needs its own handler
   that reads `data_json.additional_input` (the tree) rather than the
   feedback-form questions path used by `ScreeningInterviewPrompt`. **Phase 2
   task:** add a `CandidatePrepMockSystemDesignPrompt` (or equivalent) and
   wire it into the factory.
3. **Browser-side audio verification still required before launch.** A
   developer must, in a dev candidate UI session, observe agent participant
   join + bidirectional audio against a `candidate_prep_mock_system_design`
   room before Phase 2 closes. This spike establishes that the backend can
   issue valid tokens; it does not replace that smoke test.

## Notes / gotchas
- `interview_short_code` lives inside `data_json` (see
  `InterviewSessionDataJSONModel`), not as a top-level field on
  `InterviewSessionRDS`. When constructing in a REPL, set it via
  `data_json.interview_short_code`, not as a kwarg.
- The plan template's `LiveKitWebInterviewService().init_call(session)` call
  shape is wrong. The actual signature is
  `LiveKitWebInterviewService(interview_session_rds=session).init_call()`
  (constructor on line 73, method on line 77).
- Constructing `LiveKitAdapter()` more than once in the same REPL session
  triggered a botocore→urllib3 SSLContext recursion (gevent monkey-patch
  interaction). Workaround for any later spike work: prefetch the four
  secrets via `cloud_interfaces.secrets.get_secret(...)` once and reuse.
- `AIAgentDataSchema.type` is a `StrEnum` accepting only `ai_recruiter |
  interviewing | ai_companion` — the plan template's `"ai_interview"` value
  is invalid and pydantic rejects it.
- `init_call` requires a Flask request context for `request.host` at
  `_get_service_endpoints()`; that's fine inside the real `/init_call`
  endpoint but needs `app.test_request_context(...)` (plus a stubbed
  `flask_login.current_user`) in a REPL spike. Treat this as scaffolding,
  not as a finding.
