# PerformanceFeedback

Eightfold careerhub entity. Auto-generated docs for `performance_feedback`.

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| list | GET | `/performance-feedback` | `performance-feedback-list` |
| createRequest | POST | `/performance-feedback/request` | `performance-feedback-request` |
| create | POST | `/performance-feedback/provide` | `performance-feedback-provide` |
| getById | GET | `/performance-feedback/{reviewId}` | `performance-feedback-get-by-id` |

## Hooks

- `usePerformanceFeedback(id)` — fetch single (op: `getById`)
- `usePerformanceFeedbacks(filters?)` — paginated list (op: `list`)
- `useCreatePerformanceFeedback()` — mutation (op: `create`)
- `useCreateRequestPerformanceFeedback(options?)` — POST `/performance-feedback/request` (op: `createRequest`)

## Services (non-React contexts)

- `getPerformanceFeedback` — op: `getById`
- `listPerformanceFeedbacks` — op: `list`
- `createPerformanceFeedback` — op: `create`
- `createRequestPerformanceFeedback(args?: { path?, query?, body? })` — op: `createRequest` (POST `/performance-feedback/request`)

## Example

```ts
import { usePerformanceFeedbacks } from "@/features/eightfold-api";

const { data, isLoading } = usePerformanceFeedbacks();
```
