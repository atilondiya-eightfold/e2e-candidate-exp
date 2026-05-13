# Offer

Eightfold ats entity. API endpoints for Offer Entity

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| list | GET | `/offers` | `offers-list-search` |

## Hooks

- `useOffers(filters?)` — paginated list (op: `list`)

## Services (non-React contexts)

- `listOffers` — op: `list`

## Example

```ts
import { useOffers } from "@/features/eightfold-api";

const { data, isLoading } = useOffers();
```
