import { useState, useEffect, useCallback } from "react";
import { usePagination, FilterOptions } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";

interface BaseEntity {
  id: string;
}

interface EntityFilterOptions extends FilterOptions {
  search?: string;
  [key: string]: unknown;
}

interface UseEntityListOptions<T extends BaseEntity> {
  endpoint: string;
  initialFilters?: Partial<EntityFilterOptions>;
  transform?: (data: unknown) => { items: T[]; total: number };
  debounceDelay?: number;
}

interface UseEntityListResult<
  T extends BaseEntity,
  F extends EntityFilterOptions,
> {
  items: T[];
  loading: boolean;
  error: string | null;
  totalItems: number;
  totalPages: number;
  filterOptions: F;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (pageSize: number) => void;
  handleSearchChange: (search: string) => void;
  updateFilter: (updates: Partial<F>) => void;
  refetch: () => void;
}

export function useEntityList<
  T extends BaseEntity,
  F extends EntityFilterOptions = EntityFilterOptions,
>(options: UseEntityListOptions<T>): UseEntityListResult<T, F> {
  const {
    endpoint,
    initialFilters = {},
    transform,
    debounceDelay = 500,
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    filterOptions,
    totalItems,
    totalPages,
    setTotalItems,
    handlePageChange,
    handlePageSizeChange,
    updateFilter,
  } = usePagination<F>({
    search: "",
    ...initialFilters,
  } as F);
  // Debounce search to avoid fetching on every keystroke
  const debouncedSearch = useDebounce(filterOptions.search, debounceDelay);
  const filterOptionsKey = JSON.stringify(filterOptions);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      // Add pagination params
      params.append("page", filterOptions.page.toString());
      params.append("pageSize", filterOptions.pageSize.toString());

      // Add debounced search
      if (debouncedSearch) {
        params.append("search", String(debouncedSearch));
      }

      // Add other filter params (excluding search as it's handled above)
      Object.entries(filterOptions).forEach(([key, value]) => {
        if (
          key !== "page" &&
          key !== "pageSize" &&
          key !== "search" &&
          value !== undefined &&
          value !== ""
        ) {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`${endpoint}?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();

      // Use transform function if provided, otherwise use default structure
      const result = transform
        ? transform(data)
        : { items: data.items || data, total: data.total || data.length };

      setItems(result.items);
      setTotalItems(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    endpoint,
    filterOptions.page,
    filterOptions.pageSize,
    debouncedSearch,
    setTotalItems,
    transform,
    filterOptionsKey,
  ]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearchChange = useCallback(
    (search: string) => {
      updateFilter({ search } as Partial<F>);
    },
    [updateFilter],
  );

  return {
    items,
    loading,
    error,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    handleSearchChange,
    updateFilter,
    refetch: fetchItems,
  };
}
