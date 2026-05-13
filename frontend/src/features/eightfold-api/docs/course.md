# Course

Eightfold core entity. course description

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/courses/{courseId}` | `course-get-by-id` |
| delete | DELETE | `/courses/{courseId}` | `course-delete` |
| patch | PATCH | `/courses/{courseId}` | `course-patch` |
| list | GET | `/courses` | `courses-list-search` |
| create | POST | `/courses` | `course-create` |

## Hooks

- `useCourse(id)` — fetch single (op: `getById`)
- `useCourses(filters?)` — paginated list (op: `list`)
- `useCreateCourse()` — mutation (op: `create`)
- `usePatchCourse()` — mutation (op: `patch`)
- `useDeleteCourse()` — mutation (op: `delete`)

## Services (non-React contexts)

- `getCourse` — op: `getById`
- `listCourses` — op: `list`
- `createCourse` — op: `create`
- `patchCourse` — op: `patch`
- `deleteCourse` — op: `delete`

## Example

```ts
import { useCourses } from "@/features/eightfold-api";

const { data, isLoading } = useCourses();
```
