# HiringCompanyHiringCompany

Eightfold etx entity. API endpoints for Exchange Hiring Companies

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/hiring_company/{hiringCompanyGroupId}` | `hiring-company-get-by-id` |
| patch | PATCH | `/hiring_company/{hiringCompanyGroupId}` | `hiring-company-patch` |

## Hooks

- `useHiringCompanyHiringCompany(id)` — fetch single (op: `getById`)
- `usePatchHiringCompanyHiringCompany()` — mutation (op: `patch`)

## Services (non-React contexts)

- `getHiringCompanyHiringCompany` — op: `getById`
- `patchHiringCompanyHiringCompany` — op: `patch`

## Example

```ts
import { useHiringCompanyHiringCompany } from "@/features/eightfold-api";

const { data, isLoading } = useHiringCompanyHiringCompany(id);
```
