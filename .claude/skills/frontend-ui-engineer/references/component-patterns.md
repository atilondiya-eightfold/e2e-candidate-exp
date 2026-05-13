# Reusable Component Patterns

Production patterns for the most common SaaS UI components. Copy and adapt to your domain.

---

## Table of Contents

1. Data Table (server-side)
2. Bento Dashboard
3. Multi-Step Wizard
4. Auto-Save Form
5. Approval Workflow
6. Notification Center
7. Timeline / Activity Log
8. Role-Based Navigation
9. EmptyState
10. StatusBadge

---

## 1. Data Table (Server-Side Paginated)

Use for any list view with more than a few columns. Built on TanStack Table + shadcn Table.

### Column Definition

Define columns as a typed array outside the component. Each column specifies accessor, header, cell renderer, and optional filter.

```tsx
// features/{name}/components/columns.tsx
import type { ColumnDef } from "@tanstack/react-table";
import type { Item } from "../types";

export const columns: Array<ColumnDef<Item>> = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }): ReactElement => (
      <span className="font-medium">{row.getValue("name")}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }): ReactElement => (
      <StatusBadge status={row.getValue("status")} />
    ),
    filterFn: "equals",
  },
  {
    id: "actions",
    cell: ({ row }): ReactElement => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild={true}>
          <Button size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>View</DropdownMenuItem>
          <DropdownMenuItem>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
```

### Table Component

Use `useServerTable` from api-integration.md for state. Pass `manualPagination: true`, `manualSorting: true`, `manualFiltering: true` to useReactTable.

Render a filter bar above, shadcn Table in the middle, pagination below.

### Features checklist for every table:
- Server-side pagination (HRIS/SaaS tables can have thousands of rows)
- At least 2 sortable columns (name and date)
- At least 1 filter (status is the most common)
- Row actions via DropdownMenu
- Skeleton loading state (5 rows matching column widths)
- EmptyState when no results

---

## 2. Bento Dashboard

Grid layout with cards of varying sizes. Used for overview/home screens.

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  <Card className="col-span-1 lg:col-span-2">
    {/* Wide card: main metric or chart */}
  </Card>
  <Card>
    {/* Standard card: secondary metric */}
  </Card>
  <Card>
    {/* Standard card: action items */}
  </Card>
  <Card className="col-span-1 md:col-span-2 lg:col-span-3">
    {/* Full-width card: table or detailed view */}
  </Card>
</div>
```

Every card handles four states independently (loading, error, empty, data). Use shadcn Card with CardHeader, CardTitle, CardContent.

---

## 3. Multi-Step Wizard

For complex creation flows with more than 4 fields. Each step validates independently.

### Structure

```tsx
function CreateWizard(): ReactElement {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: "Basic Info", component: BasicInfoStep, schema: basicInfoSchema },
    { label: "Configuration", component: ConfigStep, schema: configSchema },
    { label: "Review", component: ReviewStep, schema: z.object({}) },
  ];

  const step = steps[currentStep];

  return (
    <div>
      {/* Step indicator */}
      <StepIndicator steps={steps} currentStep={currentStep} />

      {/* Current step form */}
      <step.component
        onNext={(data) => {
          saveDraft(data); // auto-save
          setCurrentStep((s) => s + 1);
        }}
        onBack={() => setCurrentStep((s) => s - 1)}
      />
    </div>
  );
}
```

### Step Indicator

```tsx
function StepIndicator({ steps, currentStep }): ReactElement {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
              index < currentStep && "bg-primary text-primary-foreground",
              index === currentStep && "border-2 border-primary text-primary",
              index > currentStep && "border border-muted text-muted-foreground",
            )}
          >
            {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
          </div>
          <span className="text-sm">{step.label}</span>
          {index < steps.length - 1 && (
            <div className="h-px w-8 bg-border" />
          )}
        </div>
      ))}
    </div>
  );
}
```

### Rules:
- Each step has its own Zod schema
- Validation runs on "Next", not on every keystroke
- "Back" preserves data (form state managed by parent)
- Draft auto-save on every step transition
- Final step is "Review" showing all data read-only with "Submit" button

---

## 4. Auto-Save Form

For long forms where users spend more than 30 seconds (reviews, feedback, notes).

```tsx
function AutoSaveForm(): ReactElement {
  const form = useForm({ resolver: zodResolver(schema), defaultValues: draft });
  const saveDraft = useSaveDraft();

  // Watch all fields, debounce, save
  useEffect(() => {
    const subscription = form.watch(
      debounce((values: FormValues): void => {
        saveDraft.mutate(values);
      }, 2000),
    );
    return (): void => subscription.unsubscribe();
  }, [form, saveDraft]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* form fields */}

        {/* Save indicator */}
        <div className="text-xs text-muted-foreground">
          {saveDraft.isPending && "Saving..."}
          {saveDraft.isSuccess && "Draft saved"}
          {saveDraft.isError && "Failed to save draft"}
        </div>

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Rules:
- Debounce at 2 seconds (fast enough to feel real-time, slow enough to not spam API)
- Show save indicator (Saving / Saved / Failed)
- Load draft on mount via defaultValues
- On submit, lock the form (set all fields to read-only)

---

## 5. Approval Workflow

Pattern for any submit-then-approve flow.

### Status flow:
```
Requester submits -> Pending Approval
Approver approves -> Approved (advance workflow)
Approver rejects  -> Rejected (notify requester with reason)
```

### UI components:
- Requester sees: StatusBadge showing current state
- Approver sees: ApprovalQueue (table of pending items) with Approve/Reject buttons
- Reject action opens a Dialog with a required reason textarea
- Both sides see: timeline of status changes with timestamps and actors

```tsx
function ApprovalActions({ itemId }): ReactElement {
  const approve = useApproveItem();
  const [rejectOpen, setRejectOpen] = useState(false);

  return (
    <div className="flex gap-2">
      <Button
        variant="default"
        disabled={approve.isPending}
        onClick={() => approve.mutate(itemId)}
      >
        Approve
      </Button>
      <Button variant="outline" onClick={() => setRejectOpen(true)}>
        Reject
      </Button>
      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        itemId={itemId}
      />
    </div>
  );
}
```

---

## 6. Notification Center

Bell icon in TopNav with dropdown panel.

### Structure:
- Bell icon with unread count badge (red dot or number)
- Dropdown shows notifications grouped by category
- Each notification: urgency icon + title + description + timestamp + action link
- Mark individual as read on click
- "Mark all read" button at top
- Click navigates to the relevant screen

### Urgency colors:
| Level | Tailwind class | When |
|-------|---------------|------|
| Critical | text-destructive, bg-destructive/10 | Overdue, failed, blocked |
| Warning | text-amber-600, bg-amber-50 | Due soon (48 hours) |
| Info | text-blue-600, bg-blue-50 | New assignment, update |
| Success | text-green-600, bg-green-50 | Completed, approved |

---

## 7. Timeline / Activity Log

Vertical line with milestone nodes. Used for audit trails, check-in history, status changes.

```tsx
function Timeline({ entries }): ReactElement {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
      <div className="space-y-6">
        {entries.map((entry) => (
          <div key={entry.id} className="flex gap-4 relative">
            <div className="z-10 flex-shrink-0">
              <TimelineIcon status={entry.status} />
            </div>
            <div className="flex-1 pb-4">
              <p className="text-sm font-medium">{entry.title}</p>
              <p className="text-xs text-muted-foreground">
                {entry.actor} - {formatDate(entry.timestamp)}
              </p>
              {entry.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {entry.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 8. Role-Based Navigation

Sidebar that adapts to the user's role.

```tsx
const NAV_ITEMS: Array<NavItem> = [
  { label: "Dashboard", href: "/dashboard", icon: Home, roles: ["employee", "manager", "hr_admin"] },
  { label: "My Reviews", href: "/reviews", icon: ClipboardCheck, roles: ["employee"] },
  { label: "Team", href: "/team", icon: Users, roles: ["manager"] },
  { label: "Admin", href: "/admin", icon: Settings, roles: ["hr_admin"] },
];

function Sidebar(): ReactElement {
  const { role } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav>
      {visibleItems.map((item) => (
        <SidebarLink key={item.href} item={item} />
      ))}
    </nav>
  );
}
```

Pair with a RoleGuard route wrapper that redirects unauthorized users.

---

## 9. EmptyState

Used in every list/table view when there is no data.

```tsx
interface EmptyStateProps {
  icon: ReactElement;
  title: string;
  description: string;
  action?: ReactElement;
}

function EmptyState(props: EmptyStateProps): ReactElement {
  const { icon, title, description, action } = props;
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-muted-foreground">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

---

## 10. StatusBadge

Colored pill showing entity status. Used everywhere in SaaS products.

```tsx
const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  submitted: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
};

function StatusBadge({ status }: { status: string }): ReactElement {
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
```
