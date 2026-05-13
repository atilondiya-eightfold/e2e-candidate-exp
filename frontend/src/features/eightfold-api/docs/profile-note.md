# ProfileNote

Eightfold core entity. Profile note description

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/profile-notes/{profileNoteId}` | `profile-note-get-by-id` |
| batchFetch | POST | `/profile-notes/batch-fetch` | `profile-note-batch-fetch` |
| list | GET | `/profile-notes` | `profile-notes-list-search` |
| create | POST | `/profile-notes` | `profile-note-create` |

## Hooks

- `useProfileNote(id)` — fetch single (op: `getById`)
- `useProfileNotes(filters?)` — paginated list (op: `list`)
- `useBatchFetchProfileNotes(ids)` — batch read max 100 (op: `batchFetch`)
- `useCreateProfileNote()` — mutation (op: `create`)

## Services (non-React contexts)

- `getProfileNote` — op: `getById`
- `listProfileNotes` — op: `list`
- `batchFetchProfileNotes` — op: `batchFetch`
- `createProfileNote` — op: `create`

## Example

```ts
import { useProfileNotes } from "@/features/eightfold-api";

const { data, isLoading } = useProfileNotes();
```
