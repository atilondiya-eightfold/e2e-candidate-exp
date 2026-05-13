# API Integration Patterns

Full TanStack Query and axios patterns. Every feature in the app follows these exact templates.

---

## The Axios Instance

```ts
// src/lib/axios.ts
import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from "axios";

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

// Auth: attach token to every request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
);

// Global error: redirect on 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export { api };
```

---

## Query Key Factory

Every feature defines a key factory. This ensures cache invalidation works correctly across the app.

```ts
// Pattern: one factory per feature
export const itemKeys = {
  all: ["items"] as const,
  lists: () => [...itemKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...itemKeys.lists(), filters] as const,
  details: () => [...itemKeys.all, "detail"] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
};
```

Why a factory instead of inline arrays:
- Mutations can invalidate itemKeys.lists() to clear ALL list queries regardless of filters
- Detail queries are keyed by id so they cache independently
- Adding a new query variant (e.g., itemKeys.search) extends the factory without breaking existing keys
- Typos in string literals are eliminated

---

## Query Hook Template

```ts
// src/features/{name}/api.ts
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { Item, CreateItemPayload, PaginatedResponse } from "./types";

// Key factory
export const itemKeys = {
  all: ["items"] as const,
  lists: () => [...itemKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...itemKeys.lists(), filters] as const,
  details: () => [...itemKeys.all, "detail"] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
};

// List query (with optional filters)
export function useItems(
  filters?: Record<string, unknown>,
): UseQueryResult<PaginatedResponse<Item>> {
  return useQuery({
    queryKey: itemKeys.list(filters ?? {}),
    queryFn: async (): Promise<PaginatedResponse<Item>> => {
      const { data } = await api.get("/api/v1/items", { params: filters });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for lists
  });
}

// Detail query
export function useItem(id: string): UseQueryResult<Item> {
  return useQuery({
    queryKey: itemKeys.detail(id),
    queryFn: async (): Promise<Item> => {
      const { data } = await api.get(`/api/v1/items/${id}`);
      return data;
    },
    enabled: Boolean(id), // don't fetch until we have an id
  });
}

// Create mutation
export function useCreateItem(): UseMutationResult<
  Item,
  Error,
  CreateItemPayload
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateItemPayload): Promise<Item> => {
      const { data } = await api.post("/api/v1/items", payload);
      return data;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

// Update mutation
export function useUpdateItem(): UseMutationResult<
  Item,
  Error,
  { id: string; data: Partial<Item> }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data: payload,
    }: {
      id: string;
      data: Partial<Item>;
    }): Promise<Item> => {
      const { data } = await api.patch(`/api/v1/items/${id}`, payload);
      return data;
    },
    onSuccess: (_data, variables): void => {
      void queryClient.invalidateQueries({
        queryKey: itemKeys.detail(variables.id),
      });
      void queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

// Delete mutation
export function useDeleteItem(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/api/v1/items/${id}`);
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}
```

---

## Pagination Response Type

```ts
// src/types/pagination.ts
export interface PaginatedResponse<T> {
  data: Array<T>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

---

## Server-Side Table Hook

Manages pagination, sorting, and filter state for data tables. Converts them to API params.

```ts
// src/hooks/useServerTable.ts
import { useState } from "react";
import type {
  PaginationState,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";

interface UseServerTableReturn {
  pagination: PaginationState;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  setSorting: React.Dispatch<React.SetStateAction<SortingState>>;
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
  apiParams: Record<string, unknown>;
}

export function useServerTable(
  defaultPageSize: number = 20,
): UseServerTableReturn {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const sortEntry = sorting[0];
  const apiParams: Record<string, unknown> = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    ...(sortEntry && {
      sortBy: sortEntry.id,
      sortOrder: sortEntry.desc ? "desc" : "asc",
    }),
    ...Object.fromEntries(
      columnFilters.map((filter) => [filter.id, filter.value]),
    ),
  };

  return {
    pagination,
    sorting,
    columnFilters,
    setPagination,
    setSorting,
    setColumnFilters,
    apiParams,
  };
}
```

---

## Error Handling

```ts
// src/lib/apiError.ts
import { AxiosError } from "axios";

export interface ApiErrorBody {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    return body?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}
```

Use this in error Alert components:

```tsx
if (error) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        {getErrorMessage(error)}
        <Button variant="link" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

---

## QueryClient Configuration

```ts
// src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60, // 1 minute default
      gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

Wire into App.tsx:

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

function App(): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```
