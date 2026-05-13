# Frontend Best Practices: Anti-Flakiness Rules

These rules exist because Claude generates inconsistent code when conventions are not stated explicitly upfront. Every rule here addresses a specific failure mode observed in real sessions.

---

## Rule 1: Always Give the File Structure First

Before any component, establish the intended project structure. Without this, Claude invents its own structure every time and they conflict across files.

Paste the structure from Section 2 of SKILL.md at the start of every session. Say: "Follow this structure. Do not deviate."

---

## Rule 2: Axios Instance Before Everything

Create src/lib/axios.ts once, explicitly, before any feature code.

Without this instruction, Claude creates ad-hoc fetch calls in some files and axios in others. This is the number one source of HTTP inconsistency.

Tell Claude: "Always import api from @/lib/axios. Never use native fetch. Never create a new axios instance."

---

## Rule 3: Types Before Components

Define the TypeScript types for a feature before building any component that uses that feature's data. Types go in src/types/ for shared types or src/features/{name}/types.ts for feature-specific types.

Without this, Claude invents types inline in each component file. They will be inconsistent with each other.

Tell Claude: "Import types from @/types/ or the feature's types.ts. Do not inline type definitions in component files."

---

## Rule 4: Give a Query Hook Template Once

Show Claude the exact TanStack Query pattern from references/api-integration.md one time. Then say: "Every feature gets its own api.ts file. All query hooks follow this exact pattern. queryKey must use the factory, never hardcoded arrays."

Without this, Claude varies the queryKey naming across features and cache invalidation breaks silently.

---

## Rule 5: Never One-Shot the Whole App

Claude degrades significantly on large single prompts. Break every build into the 9-step sequence from Section 3 of SKILL.md:

Scaffold -> Types -> Axios -> Layout -> Shared components -> Feature API hooks -> Feature components -> Pages + routes -> Polish

Each step is independently verifiable before moving to the next.

---

## Rule 6: Name shadcn Components Explicitly

Do not say "add a form". Say: "use shadcn Form, FormField, FormItem, FormLabel, FormControl, Input, and Button from @/components/ui/"

Claude knows shadcn's API well but sometimes substitutes raw HTML if you don't name the component explicitly.

---

## Rule 7: State Errors Happen at the Boundary

Tell Claude: "Loading: shadcn Skeleton. Error: shadcn Alert variant destructive. Empty: EmptyState component. Data: the actual UI."

Without this standing rule, some components handle errors, some show spinners, some show nothing. Consistency comes from stating the contract once and enforcing it everywhere.

---

## Rule 8: Use a Master System Prompt

When starting a new session, begin with a block like this:

```
Stack: React + Vite + TypeScript + TanStack Query v5 + shadcn/ui + Tailwind + axios
Structure: [paste your file structure]
Rules:
1. Always import api from @/lib/axios, never use fetch, never new axios instances
2. All query/mutation hooks go in features/{name}/api.ts
3. queryKey format: use the factory pattern, never hardcode arrays
4. Always use shadcn components, never raw HTML form elements
5. TypeScript strict, no any
6. Loading: Skeleton, Error: Alert destructive, Empty: EmptyState
7. After mutations, always invalidate the relevant queryKey
```

This single block eliminates roughly 80% of Claude's inconsistencies.

---

## Rule 9: One Feature at a Time

Build features in this order per feature:
1. types.ts (the data shapes)
2. api.ts (the TanStack Query hooks)
3. components/ (the UI that consumes the hooks)
4. Wire into a page

Never jump to step 3 before step 2 is done. The component must have real hooks to import, not imagined ones.

---

## Rule 10: Verify Between Steps

After each build step, mentally lint the output:
- Are return types explicit?
- Are imports using import type where needed?
- Is Array<T> used, not T[]?
- Are shadcn components used, not raw HTML?
- Is cn() used for class merging?
- Are boolean props explicit?

Catching issues at each step prevents them from compounding.

---

## What Breaks Without These Rules

| Skipped Rule | Failure Mode |
|-------------|--------------|
| No file structure | Components in random folders across sessions |
| No shared axios | Mixed fetch/axios, missing auth headers in some calls |
| No query hook template | Inconsistent queryKey naming, broken cache invalidation |
| One-shot build | Claude loses context, invents new patterns mid-generation |
| No TypeScript types upfront | any everywhere, type mismatches across components |
| No loading/error contract | Some components handle errors, others crash silently |
| No explicit shadcn naming | Raw HTML inputs mixed with shadcn components |
