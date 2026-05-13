# Profile

Eightfold core entity. candidate description.

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getByIdAttachment | GET | `/profiles/{profileId}/attachments/{attachmentId}` | `profile-attachment-get-by-id` |
| listSearch | GET | `/positions/{positionId}/matched-candidates` | `position-matched-candidates-list-search` |
| listSearch2 | GET | `/position/{positionId}/applicants` | `position-list-applicants-search` |
| getById | GET | `/profiles/{profileId}` | `profile-get-by-id` |
| update | PUT | `/profiles/{profileId}` | `profile-update` |
| delete | DELETE | `/profiles/{profileId}` | `profile-delete` |
| patch | PATCH | `/profiles/{profileId}` | `profile-patch` |
| list | GET | `/profiles` | `profiles-list-search` |
| create | POST | `/profiles` | `profile-create` |
| createStage | POST | `/profiles/{profileId}/application/stages` | `create-or-advance-application-stage` |
| batchFetch | POST | `/profiles/batch-fetch` | `profile-batch-fetch` |

## Hooks

- `useProfile(id)` — fetch single (op: `getById`)
- `useProfiles(filters?)` — paginated list (op: `list`)
- `useBatchFetchProfiles(ids)` — batch read max 100 (op: `batchFetch`)
- `useCreateProfile()` — mutation (op: `create`)
- `useUpdateProfile()` — mutation (op: `update`)
- `usePatchProfile()` — mutation (op: `patch`)
- `useDeleteProfile()` — mutation (op: `delete`)
- `useGetByIdAttachmentProfile(args?: { path?, query? }, options?)` — GET `/profiles/{profileId}/attachments/{attachmentId}` (op: `getByIdAttachment`)
- `useListSearchProfile(args?: { path?, query? }, options?)` — GET `/positions/{positionId}/matched-candidates` (op: `listSearch`)
- `useListSearch2Profile(args?: { path?, query? }, options?)` — GET `/position/{positionId}/applicants` (op: `listSearch2`)
- `useCreateStageProfile(options?)` — POST `/profiles/{profileId}/application/stages` (op: `createStage`)

## Services (non-React contexts)

- `getProfile` — op: `getById`
- `listProfiles` — op: `list`
- `batchFetchProfiles` — op: `batchFetch`
- `createProfile` — op: `create`
- `updateProfile` — op: `update`
- `patchProfile` — op: `patch`
- `deleteProfile` — op: `delete`
- `getByIdAttachmentProfile(args?: { path?, query?, body? })` — op: `getByIdAttachment` (GET `/profiles/{profileId}/attachments/{attachmentId}`)
- `listSearchProfile(args?: { path?, query?, body? })` — op: `listSearch` (GET `/positions/{positionId}/matched-candidates`)
- `listSearch2Profile(args?: { path?, query?, body? })` — op: `listSearch2` (GET `/position/{positionId}/applicants`)
- `createStageProfile(args?: { path?, query?, body? })` — op: `createStage` (POST `/profiles/{profileId}/application/stages`)

## Example

```ts
import { useProfiles } from "@/features/eightfold-api";

const { data, isLoading } = useProfiles();
```
