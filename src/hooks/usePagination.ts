import { useState, useCallback, useMemo } from "react";

export interface FilterOptions {
  page: number;
  pageSize: number;
  [key: string]: unknown; // Allow additional filter properties
}

interface PaginationResult<T extends FilterOptions = FilterOptions> {
  filterOptions: T;
  totalItems: number;
  totalPages: number;
  setFilterOptions: React.Dispatch<React.SetStateAction<T>>;
  setTotalItems: (total: number) => void;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (pageSize: number) => void;
  updateFilter: (updates: Partial<T>) => void;
  resetFilters: () => void;
}

export function usePagination<T extends FilterOptions = FilterOptions>(
  initialFilters?: Partial<T>
): PaginationResult<T> {
  const defaultFilters = useMemo<T>(
    () =>
      ({
        page: 1,
        pageSize: 10,
        ...initialFilters,
      } as T),
    [initialFilters]
  );

  const [filterOptions, setFilterOptions] = useState<T>(
    defaultFilters as T
  );
  const [totalItems, setTotalItemsState] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const setTotalItems = useCallback(
    (total: number) => {
      setTotalItemsState(total);
      setTotalPages(Math.ceil(total / filterOptions.pageSize));
    },
    [filterOptions.pageSize]
  );

  const handlePageChange = useCallback((page: number) => {
    setFilterOptions((prev) => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setFilterOptions((prev) => ({
      ...prev,
      pageSize,
      page: 1, // Reset to first page when changing page size
    }));
  }, []);

  const updateFilter = useCallback((updates: Partial<T>) => {
    setFilterOptions((prev) => ({
      ...prev,
      ...updates,
      page: updates.page !== undefined ? updates.page : 1, // Reset to first page on filter change
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilterOptions(defaultFilters);
  }, [defaultFilters]);

  return {
    filterOptions,
    totalItems,
    totalPages,
    setFilterOptions,
    setTotalItems,
    handlePageChange,
    handlePageSizeChange,
    updateFilter,
    resetFilters,
  };
}
