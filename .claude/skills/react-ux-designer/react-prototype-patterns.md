# React Prototype Patterns

Code patterns for building React mock screens using **ef-design-system components**. Copy and adapt these patterns when building components for the react-ux-designer skill.

All UI components are imported from the barrel export:

```tsx
import { Button, Badge, StatCard, Input, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ef-design-system'
```

---

## 1. Dev Tooling — Pre-built in Boilerplate

The boilerplate ships `DevToolbarProvider`, `PersonaSwitcher`, and `StateDebugBar` at `src/components/dev/`. Import and use them directly — **do not recreate these components**.

```tsx
import { DevToolbarProvider, useDevToolbar, PersonaSwitcher, StateDebugBar } from '@/components/dev'
```

- **DevToolbarProvider** — wrap the app, pass `personas` array. Provides `currentPersona`, `setPersona`, `currentState`, `setState` via `useDevToolbar()` hook.
- **PersonaSwitcher** — fixed top bar, persona tabs. Navigates to `/{personaId}` on switch.
- **StateDebugBar** — fixed second bar. Toggles: populated / empty / loading / error.

---

## 2. Root Layout — Wiring Dev Tooling (from boilerplate)

The root route wraps everything with dev tooling and layout.

```tsx
// src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { DevToolbarProvider, PersonaSwitcher, StateDebugBar } from '@/components/dev'
import { AppShell } from '@/components/layout/AppShell'
import type { ReactElement } from 'react'

// Populated from approved personas — example:
const PERSONAS = [
  { id: 'ic', name: 'Sarah Chen', role: 'IC' },
  { id: 'manager', name: 'David Park', role: 'Manager' },
  { id: 'admin', name: 'Lisa Wang', role: 'HR Admin' },
  // ... more from domain doc
]

function RootLayout(): ReactElement {
  return (
    <DevToolbarProvider personas={PERSONAS}>
      <PersonaSwitcher />
      <StateDebugBar />
      <div className="pt-[72px]"> {/* offset for both fixed bars: 40px + 32px */}
        <AppShell>
          <Outlet />
        </AppShell>
      </div>
    </DevToolbarProvider>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
```

---

## 3. AppShell — Top Navigation (Default)

**Use top navigation for all personas.** See `information-architecture.md` for the rule and the rare exceptions.

The canonical AppShell uses a single layout shell across personas. Nav items derive per-persona from the screen inventory; the shell shape stays the same.

```tsx
// src/components/layout/AppShell.tsx
import { useDevToolbar } from '@/components/dev'
import { Navbar } from '@/components/ef-design-system'
import { Link, useRouterState } from '@tanstack/react-router'
import { getPersonaConfig } from '@/lib/persona-config'
import type { ReactElement, ReactNode } from 'react'

export function AppShell({ children }: { children: ReactNode }): ReactElement {
  const { currentPersona } = useDevToolbar()
  const config = getPersonaConfig(currentPersona.id)
  const routerState = useRouterState()

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar
        tabs={config.navItems.map(item => ({
          id: item.path,
          label: item.label,
          path: item.path,
        }))}
        user={{
          name: currentPersona.name,
          avatarType: 'initials',
          avatarInitials: currentPersona.name.split(' ').map(n => n[0]).join(''),
        }}
        avatarMenuItems={[{ label: 'Profile', path: '/me' }]}
        activePath={routerState.location.pathname}
        LinkComponent={Link}
      />
      {/* pt-[128px] = PersonaSwitcher (40) + StateDebugBar (32) + Navbar (56) */}
      <main className="mx-auto max-w-7xl px-6 pt-[128px] pb-10">{children}</main>
    </div>
  )
}
```

Notes:
- Nav items come from `persona-config.ts` so each persona's nav set is co-located with its capabilities.
- `max-w-7xl` keeps the content readable on ultra-wide displays.
- Mobile responsiveness is handled by `Navbar` itself (collapses to hamburger). Don't add a separate mobile shell.

### Sidebar variant (rare exception only)

Only use this when the IA approval explicitly justified it (≥7 peer destinations + user requested). The sidebar must still pass mobile/tablet testing — collapse to a hamburger drawer below `lg`.

```tsx
// Use only when justified — see information-architecture.md
return (
  <div className="min-h-screen bg-muted/30">
    {/* Collapsible drawer on mobile, fixed sidebar on lg+ */}
    <Sidebar className="hidden lg:flex" />
    <main className="lg:ml-[240px] px-8 pt-[88px] pb-10">{children}</main>
  </div>
)
```

---

## 4. Page Component — Data State Pattern

Every page component reads the dev state and renders accordingly. This pattern maps 1:1 to how ui-builder will later wire TanStack Query.

```tsx
// src/features/goals/pages/GoalsPage.tsx
import { useDevToolbar } from '@/components/dev'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { GoalsLoadingSkeleton } from '../components/GoalsLoadingSkeleton'
import { GoalsList } from '../components/GoalsList'
import { mockGoals } from '@/mocks/data'
import { Target } from 'lucide-react'
import { Button } from '@/components/ef-design-system'
import type { ReactElement } from 'react'

export function GoalsPage(): ReactElement {
  const { currentState } = useDevToolbar()

  if (currentState === 'loading') {
    return <GoalsLoadingSkeleton />
  }

  if (currentState === 'error') {
    return <ErrorBanner message="Failed to load goals" onRetry={() => {}} />
  }

  if (currentState === 'empty') {
    return (
      <EmptyState
        icon={<Target className="h-10 w-10" />}
        title="No goals yet"
        description="Create your first goal to get started."
        action={<Button variant="primary">Create Goal</Button>}
      />
    )
  }

  return <GoalsList goals={mockGoals.ic} />
}
```

**ui-builder later replaces this with:**

```tsx
export function GoalsPage(): ReactElement {
  const { data: goals, isLoading, isError, error, refetch } = useGoals()

  if (isLoading) return <GoalsLoadingSkeleton />
  if (isError) return <ErrorBanner message={error.message} onRetry={() => refetch()} />
  if (!goals?.length) return <EmptyState ... />
  return <GoalsList goals={goals} />
}
```

---

## 5. Using ef-design-system Components

### Badge — Status Labels

Use `Badge` from ef-design-system for status indicators instead of building custom StatusBadge components:

```tsx
import { Badge } from '@/components/ef-design-system'

// Status mapping — map domain statuses to Badge variants
const STATUS_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  not_started: { variant: 'ghost', label: 'Not Started' },
  in_progress: { variant: 'primary', label: 'In Progress' },
  completed: { variant: 'default', label: 'Completed' },
  overdue: { variant: 'destructive', label: 'Overdue' },
  at_risk: { variant: 'secondary', label: 'At Risk' },
  draft: { variant: 'outline', label: 'Draft' },
}

function StatusBadge({ status }: { status: string }): ReactElement {
  const config = STATUS_BADGE[status] ?? { variant: 'ghost' as const, label: status.replace(/_/g, ' ') }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
```

### StatCard — Dashboard Metrics

Use `StatCard` from ef-design-system:

```tsx
import { StatCard, StatCardGroup } from '@/components/ef-design-system'

function DashboardMetrics(): ReactElement {
  return (
    <StatCardGroup>
      <StatCard label="Total Goals" value={24} icon="flag" color="blue" variant="outlined" />
      <StatCard label="On Track" value={18} pct="75%" icon="check_circle" color="green" variant="outlined" />
      <StatCard label="At Risk" value={4} icon="warning" color="red" variant="outlined" iconBadge="alert" />
      <StatCard label="Completed" value={2} icon="task_alt" color="grey" variant="outlined" />
    </StatCardGroup>
  )
}
```

### DataTable — Data Tables

Use `DataTable` components from ef-design-system:

```tsx
import {
  DataTable, DataTableHeader, DataTableBody,
  DataTableRow, DataTableHead, DataTableCell,
} from '@/components/ef-design-system'

function EmployeeTable({ employees }: { employees: Array<Employee> }): ReactElement {
  return (
    <DataTable bordered>
      <DataTableHeader>
        <tr>
          <DataTableHead>Name</DataTableHead>
          <DataTableHead>Department</DataTableHead>
          <DataTableHead>Role</DataTableHead>
          <DataTableHead numeric>Goals</DataTableHead>
          <DataTableHead shrink>Status</DataTableHead>
        </tr>
      </DataTableHeader>
      <DataTableBody>
        {employees.map(emp => (
          <DataTableRow key={emp.id} onClick={() => navigate({ to: `/manager/team/${emp.id}` })}>
            <DataTableCell>{emp.name}</DataTableCell>
            <DataTableCell>{emp.department}</DataTableCell>
            <DataTableCell>{emp.role}</DataTableCell>
            <DataTableCell numeric>{emp.goalCount}</DataTableCell>
            <DataTableCell><Badge variant="primary">Active</Badge></DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  )
}
```

### Tabs — Tab Navigation

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ef-design-system'

function ReviewTabs(): ReactElement {
  return (
    <Tabs defaultValue="pending">
      <TabsList variant="line">
        <TabsTrigger value="pending" badge={5}>Pending</TabsTrigger>
        <TabsTrigger value="completed">Completed</TabsTrigger>
        <TabsTrigger value="draft">Drafts</TabsTrigger>
      </TabsList>
      <TabsContent value="pending"><PendingReviews /></TabsContent>
      <TabsContent value="completed"><CompletedReviews /></TabsContent>
      <TabsContent value="draft"><DraftReviews /></TabsContent>
    </Tabs>
  )
}
```

### Dialog — Modals & Multi-Step Flows

```tsx
import {
  Dialog, DialogTrigger, DialogContent,
  DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@/components/ef-design-system'

// Simple dialog
function ConfirmDialog(): ReactElement {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Goal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Goal?</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-muted-foreground">This action cannot be undone.</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// IMPORTANT: Never use window.alert / confirm / prompt — see component-selection.md
// "Dialogs Replace Native Browser Alerts". Use Dialog for any confirmation flow.

// Multi-step dialog
function CreateReviewDialog(): ReactElement {
  const [step, setStep] = useState(0)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary">Start Review</Button>
      </DialogTrigger>
      <DialogContent
        steps={[{ label: 'Select Reviewers' }, { label: 'Set Timeline' }, { label: 'Confirm' }]}
        currentStep={step}
      >
        <DialogHeader>
          <DialogTitle>Create Review Cycle</DialogTitle>
        </DialogHeader>
        <DialogBody>{/* Step content */}</DialogBody>
        <DialogFooter>
          {step > 0 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>}
          <Button variant="primary" onClick={() => setStep(s => s + 1)}>
            {step < 2 ? 'Next' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Sheet — Slide-Over Panels

Use the shadcn `Sheet` for table drill-down and detail panels. `SheetContent` already renders a close button in the top-right — **do not add your own**. See `component-selection.md` "Slide-Over and Dialog Close Buttons" for details.

```tsx
import { Sheet, SheetContent } from '@/components/ui/sheet'

// ✅ CORRECT — single close button (provided by SheetContent)
function DetailPanel({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="w-[380px] p-0">
        <div className="border-b p-4">
          <h2 className="text-sm font-semibold">Document Details</h2>
        </div>
        <div className="space-y-4 p-4">
          {/* body */}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ❌ WRONG — duplicate close (one from SheetContent, one custom)
<SheetContent className="w-[380px] p-0">
  <div className="flex items-center justify-between border-b p-4">
    <h2>Document Details</h2>
    <button onClick={onClose}><X /></button>  {/* duplicate close */}
  </div>
</SheetContent>
```

### Input — Form Fields

```tsx
import { Input } from '@/components/ef-design-system'

function SearchBar(): ReactElement {
  const [query, setQuery] = useState('')
  return (
    <Input
      placeholder="Search employees..."
      size="medium"
      shape="pill"
      leadingIcon="search"
      value={query}
      onChange={e => setQuery(e.target.value)}
      onClear={() => setQuery('')}
    />
  )
}

function FormField(): ReactElement {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">Goal Title</label>
      <Input placeholder="Enter goal title" state="default" />
      <p className="text-xs text-muted-foreground">Be specific and measurable.</p>
    </div>
  )
}
```

### Select — Dropdown Selects

```tsx
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from '@/components/ef-design-system'

function DepartmentFilter(): ReactElement {
  return (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Department" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="engineering">Engineering</SelectItem>
        <SelectItem value="design">Design</SelectItem>
        <SelectItem value="product">Product</SelectItem>
      </SelectContent>
    </Select>
  )
}
```

### Progress — Progress Bars

```tsx
import { Progress } from '@/components/ef-design-system'

// Simple progress
<Progress value={65} />

// With scale labels
<Progress value={65} labelVariant="scale" scaleStartLabel="0" scaleEndLabel="100" />

// With completion label
<Progress value={65} labelVariant="complete-left" />
```

### Stepper — Multi-Step Flows

```tsx
import {
  Stepper, StepperList, StepperItem,
  StepperIndicator, StepperTitle, StepperDescription, StepperSeparator,
} from '@/components/ef-design-system'

function ReviewStepper({ currentStep }: { currentStep: number }): ReactElement {
  return (
    <Stepper value={currentStep}>
      <StepperList>
        <StepperItem>
          <StepperIndicator />
          <StepperTitle>Self Review</StepperTitle>
          <StepperDescription>Complete your self-assessment</StepperDescription>
        </StepperItem>
        <StepperSeparator />
        <StepperItem>
          <StepperIndicator />
          <StepperTitle>Manager Review</StepperTitle>
        </StepperItem>
        <StepperSeparator />
        <StepperItem>
          <StepperIndicator />
          <StepperTitle>Calibration</StepperTitle>
        </StepperItem>
      </StepperList>
    </Stepper>
  )
}
```

### Tag — Filters & Selections

```tsx
import { Tag, TagGroup } from '@/components/ef-design-system'

function SkillTags({ skills }: { skills: Array<string> }): ReactElement {
  return (
    <TagGroup>
      {skills.map(skill => (
        <Tag key={skill} size="24" variant="default" onRemove={() => {}}>
          {skill}
        </Tag>
      ))}
    </TagGroup>
  )
}
```

---

## 6. Shared Components — Custom (Non-ef-design-system)

For components not in ef-design-system, use Tailwind semantic classes:

### EmptyState

```tsx
// src/components/shared/EmptyState.tsx
import type { ReactElement, ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactElement
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-1 max-w-[400px] text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
```

### ErrorBanner

```tsx
// src/components/shared/ErrorBanner.tsx
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ef-design-system'
import type { ReactElement } from 'react'

interface ErrorBannerProps {
  message: string
  onRetry: () => void
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps): ReactElement {
  return (
    <div className="flex items-center gap-3 rounded-sm border-l-4 border-destructive bg-destructive/10 px-4 py-3">
      <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
      <p className="flex-1 text-sm text-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}
```

### LoadingSkeleton

```tsx
// src/components/shared/LoadingSkeleton.tsx
import { Skeleton } from '@/components/ui/skeleton'
import type { ReactElement } from 'react'

export function CardSkeleton(): ReactElement {
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <Skeleton className="mb-4 h-5 w-1/3" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-2 h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }): ReactElement {
  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-2">
        <Skeleton className="h-4 w-full" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-border px-4 py-3 last:border-0">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
        </div>
      ))}
    </div>
  )
}
```

---

## 7. Mock Data File Structure

```tsx
// src/mocks/types.ts
export interface Employee {
  id: string
  name: string
  email: string
  role: string
  department: string
  managerId?: string
  avatarUrl?: string
}

export interface Goal {
  id: string
  title: string
  description: string
  ownerId: string
  status: 'not_started' | 'in_progress' | 'completed' | 'at_risk' | 'overdue'
  progress: number
  dueDate: string
  keyResults?: Array<KeyResult>
}

export interface KeyResult {
  id: string
  title: string
  target: number
  current: number
  unit: string
}

// ... more types per domain (Review, Feedback, PIP, Cycle, etc.)
```

```tsx
// src/mocks/data.ts
import type { Employee, Goal } from './types'

export const employees: Array<Employee> = [
  { id: '1', name: 'Sarah Chen', email: 'sarah.chen@acme.com', role: 'Software Engineer', department: 'Engineering', managerId: '2' },
  { id: '2', name: 'David Park', email: 'david.park@acme.com', role: 'Engineering Manager', department: 'Engineering' },
  // ... consistent across all persona views
]

export const mockGoals: Record<string, Array<Goal>> = {
  ic: [
    { id: 'g1', title: 'Improve API response time by 30%', description: '...', ownerId: '1', status: 'in_progress', progress: 65, dueDate: '2026-06-30' },
    // ...
  ],
  manager: [
    // Team goals visible to manager
  ],
}

// ... more mock data per feature
```

---

## 8. Route Guard Pattern (Mock)

Mock route guards read from DevToolbarProvider instead of real auth:

```tsx
// src/lib/auth-mock.ts
import { useDevToolbar } from '@/components/dev'

const PERSONA_ROUTES: Record<string, Array<string>> = {
  ic: ['/ic'],
  manager: ['/manager', '/ic'],  // managers can see IC views
  admin: ['/admin', '/manager', '/ic'],  // admins can see everything
  executive: ['/executive'],
}

export function useCanAccess(routePrefix: string): boolean {
  const { currentPersona } = useDevToolbar()
  const allowed = PERSONA_ROUTES[currentPersona.id] ?? []
  return allowed.some(prefix => routePrefix.startsWith(prefix))
}
```

ui-builder later replaces this with real JWT-based role checks.
