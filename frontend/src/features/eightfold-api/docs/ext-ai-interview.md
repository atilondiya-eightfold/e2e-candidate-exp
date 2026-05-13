# ExtAiInterview

Eightfold agent_kit entity. API endpoints for External AI Interviews

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| list | GET | `/ext-systems/{systemId}/ext-ai-interview/guides` | `ext-ai-interview-guides-list` |
| create | POST | `/ext-systems/{systemId}/ext-ai-interview/schedule-interview` | `ext-ai-interview-schedule-interview` |
| listLink | GET | `/ext-systems/{systemId}/ext-ai-interview/interview-feedback-link` | `ext-ai-interview-feedback-link` |

## Hooks

- `useExtAiInterviews(filters?)` — paginated list (op: `list`)
- `useCreateExtAiInterview()` — mutation (op: `create`)
- `useListLinkExtAiInterview(args?: { path?, query? }, options?)` — GET `/ext-systems/{systemId}/ext-ai-interview/interview-feedback-link` (op: `listLink`)

## Services (non-React contexts)

- `listExtAiInterviews` — op: `list`
- `createExtAiInterview` — op: `create`
- `listLinkExtAiInterview(args?: { path?, query?, body? })` — op: `listLink` (GET `/ext-systems/{systemId}/ext-ai-interview/interview-feedback-link`)

## Example

```ts
import { useExtAiInterviews } from "@/features/eightfold-api";

const { data, isLoading } = useExtAiInterviews();
```
