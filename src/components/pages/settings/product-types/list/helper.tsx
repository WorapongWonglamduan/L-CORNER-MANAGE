import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { FilterOptions } from "@/hooks/usePagination";
import type { FilterValues } from "@/components/ui/dynamic-filter-bar";

interface ProductType {
  id: string;
  code: string;
  name_i18n: {
    th: string;
    en: string;
  };
  icon?: string;
  type: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TypesFilterOptions extends FilterOptions {
  search?: string;
  isActive?: boolean;
}

// Read-only list — see product-types-manager.tsx for why there's no
// create/edit/delete here.
export function useProductTypesManager() {
  const t = useTranslations("settings.productTypes");

  const {
    items: types,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    updateFilter,
  } = useEntityList<ProductType, TypesFilterOptions>({
    endpoint: "/api/product-types",
    initialFilters: {
      search: "",
      isActive: undefined,
    },
  });

  const applyFilters = (values: FilterValues) => {
    updateFilter({
      search: values.search as string,
      isActive: values.isActive === "" ? undefined : values.isActive === "true",
    } as Partial<TypesFilterOptions>);
  };

  const resetFilters = () => {
    updateFilter({ search: "", isActive: undefined } as Partial<TypesFilterOptions>);
  };

  return {
    t,
    table: {
      types,
      loading,
      totalItems,
      totalPages,
    },
    filters: {
      search: filterOptions.search || "",
      isActive:
        filterOptions.isActive === undefined ? "" : String(filterOptions.isActive),
      applyFilters,
      resetFilters,
      filterOptions,
    },
    pagination: {
      handlePageChange,
      handlePageSizeChange,
    },
  };
}
