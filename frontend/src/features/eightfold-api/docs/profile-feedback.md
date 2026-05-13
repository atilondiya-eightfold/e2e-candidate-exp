# ProfileFeedback

Eightfold core entity. Profile feedback description

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/profile-feedbacks/{profileFeedbackId}` | `profile-feedback-get-by-id` |
| batchFetch | POST | `/profile-feedbacks/batch-fetch` | `profile-feedback-batch-fetch` |
| list | GET | `/profile-feedbacks` | `profile-feedbacks-list-search` |

## Hooks

- `useProfileFeedback(id)` — fetch single (op: `getById`)
- `useProfileFeedbacks(filters?)` — paginated list (op: `list`)
- `useBatchFetchProfileFeedbacks(ids)` — batch read max 100 (op: `batchFetch`)

## Services (non-React contexts)

- `getProfileFeedback` — op: `getById`
- `listProfileFeedbacks` — op: `list`
- `batchFetchProfileFeedbacks` — op: `batchFetch`

## Example

```ts
import { useProfileFeedbacks } from "@/features/eightfold-api";

const { data, isLoading } = useProfileFeedbacks();
```
