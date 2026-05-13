# Careerhub

Eightfold careerhub entity. Auto-generated docs for `careerhub`.

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/profiles/suggest-skills/{profileSection}` | `careerhub-suggest-skills-get-by-id` |
| getByIdCareerPlannerRoles | GET | `/career-planner/{userEmail}/roles/{roleSection}` | `careerhub-career-planner-roles-get-by-id` |
| patch | PATCH | `/career-planner/{userEmail}/roles/` | `careerhub-career-planner-role-patch` |
| getByIdCareerPlannerSkills | GET | `/career-planner/{userEmail}/skills/skill-gap-analysis` | `careerhub-career-planner-skills-get-by-id` |
| getByIdCareerPlannerCourses | GET | `/career-planner/{userEmail}/courses/recommended-courses` | `careerhub-career-planner-courses-get-by-id` |

## Hooks

- `useCareerhub(id)` — fetch single (op: `getById`)
- `usePatchCareerhub()` — mutation (op: `patch`)
- `useGetByIdCareerPlannerRolesCareerhub(args?: { path?, query? }, options?)` — GET `/career-planner/{userEmail}/roles/{roleSection}` (op: `getByIdCareerPlannerRoles`)
- `useGetByIdCareerPlannerSkillsCareerhub(args?: { path?, query? }, options?)` — GET `/career-planner/{userEmail}/skills/skill-gap-analysis` (op: `getByIdCareerPlannerSkills`)
- `useGetByIdCareerPlannerCoursesCareerhub(args?: { path?, query? }, options?)` — GET `/career-planner/{userEmail}/courses/recommended-courses` (op: `getByIdCareerPlannerCourses`)

## Services (non-React contexts)

- `getCareerhub` — op: `getById`
- `patchCareerhub` — op: `patch`
- `getByIdCareerPlannerRolesCareerhub(args?: { path?, query?, body? })` — op: `getByIdCareerPlannerRoles` (GET `/career-planner/{userEmail}/roles/{roleSection}`)
- `getByIdCareerPlannerSkillsCareerhub(args?: { path?, query?, body? })` — op: `getByIdCareerPlannerSkills` (GET `/career-planner/{userEmail}/skills/skill-gap-analysis`)
- `getByIdCareerPlannerCoursesCareerhub(args?: { path?, query?, body? })` — op: `getByIdCareerPlannerCourses` (GET `/career-planner/{userEmail}/courses/recommended-courses`)

## Example

```ts
import { useCareerhub } from "@/features/eightfold-api";

const { data, isLoading } = useCareerhub(id);
```
