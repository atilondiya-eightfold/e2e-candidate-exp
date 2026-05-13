# AtsPosition

Eightfold core entity. position description.

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/ats-systems/{systemId}/ats-positions/{atsPositionId}` | `ats-position-get-by-id` |
| update | PUT | `/ats-systems/{systemId}/ats-positions/{atsPositionId}` | `ats-position-update` |
| patch | PATCH | `/ats-systems/{systemId}/ats-positions/{atsPositionId}` | `ats-position-patch` |
| list | GET | `/ats-systems/{systemId}/ats-positions` | `ats-positions-list-search` |
| create | POST | `/ats-systems/{systemId}/ats-positions` | `ats-position-create` |
| createAttachments | POST | `/ats-systems/{systemId}/ats-positions/{atsPositionId}/attachments` | `ats-position-upload-attachments` |

## Hooks

- `useAtsPosition(id)` — fetch single (op: `getById`)
- `useAtsPositions(filters?)` — paginated list (op: `list`)
- `useCreateAtsPosition()` — mutation (op: `create`)
- `useUpdateAtsPosition()` — mutation (op: `update`)
- `usePatchAtsPosition()` — mutation (op: `patch`)
- `useCreateAttachmentsAtsPosition(options?)` — POST `/ats-systems/{systemId}/ats-positions/{atsPositionId}/attachments` (op: `createAttachments`)

## Services (non-React contexts)

- `getAtsPosition` — op: `getById`
- `listAtsPositions` — op: `list`
- `createAtsPosition` — op: `create`
- `updateAtsPosition` — op: `update`
- `patchAtsPosition` — op: `patch`
- `createAttachmentsAtsPosition(args?: { path?, query?, body? })` — op: `createAttachments` (POST `/ats-systems/{systemId}/ats-positions/{atsPositionId}/attachments`)

## Example

```ts
import { useAtsPositions } from "@/features/eightfold-api";

const { data, isLoading } = useAtsPositions();
```
