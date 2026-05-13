# EmailDeliveryFeedback

Eightfold core entity. Email Delivery Feedback description

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/email-delivery-feedbacks/{emailDeliveryFeedbackId}` | `email-delivery-feedback-get-by-id` |
| batchFetch | POST | `/email-delivery-feedbacks/batch-fetch` | `email-delivery-feedback-batch-fetch` |
| list | GET | `/email-delivery-feedbacks` | `email-delivery-feedbacks-list-search` |

## Hooks

- `useEmailDeliveryFeedback(id)` — fetch single (op: `getById`)
- `useEmailDeliveryFeedbacks(filters?)` — paginated list (op: `list`)
- `useBatchFetchEmailDeliveryFeedbacks(ids)` — batch read max 100 (op: `batchFetch`)

## Services (non-React contexts)

- `getEmailDeliveryFeedback` — op: `getById`
- `listEmailDeliveryFeedbacks` — op: `list`
- `batchFetchEmailDeliveryFeedbacks` — op: `batchFetch`

## Example

```ts
import { useEmailDeliveryFeedbacks } from "@/features/eightfold-api";

const { data, isLoading } = useEmailDeliveryFeedbacks();
```
