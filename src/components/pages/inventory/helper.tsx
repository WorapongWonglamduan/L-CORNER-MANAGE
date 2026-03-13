import { useLocale } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { FilterOptions } from "@/hooks/usePagination";

interface Product {
  id: string;
  code: string;
  name_i18n: {
    th: string;
    en: string;
  };
  current_stock: string;
  min_stock_level: string;
  low_stock_threshold: string;
  track_stock: boolean;
  base_unit: {
    id: string;
    name_i18n: {
      th: string;
      en: string;
    };
    abbreviation_i18n: {
      th: string;
      en: string;
    };
  };
  product_type: {
    id: string;
    type: string;
    name_i18n: {
      th: string;
      en: string;
    };
  };
}

interface InventoryFilterOptions extends FilterOptions {
  search?: string;
  type?: string;
  stockStatus?: string;
}

export function useInventoryManager() {
  const locale = useLocale();

  const {
    items: products,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    handleSearchChange,
    updateFilter,
    refetch,
  } = useEntityList<Product, InventoryFilterOptions>({
    endpoint: "/api/products",
    initialFilters: {
      search: "",
      type: "",
      stockStatus: "",
    },
  });

  const getStockStatus = (product: Product) => {
    const currentStock = Number(product.current_stock);
    const threshold = Number(product.low_stock_threshold);

    if (currentStock <= 0) {
      return {
        label: "outOfStock",
        color: "red",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-500",
      };
    } else if (currentStock <= threshold) {
      return {
        label: "lowStock",
        color: "orange",
        bgColor: "bg-orange-50",
        textColor: "text-orange-700",
        borderColor: "border-orange-500",
      };
    }
    return {
      label: "normal",
      color: "green",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-500",
    };
  };

  const setTypeFilter = (type: string) => {
    updateFilter({ type } as Partial<InventoryFilterOptions>);
  };

  const setStatusFilter = (stockStatus: string) => {
    updateFilter({ stockStatus } as Partial<InventoryFilterOptions>);
  };

  return {
    products,
    loading,
    searchQuery: filterOptions.search || "",
    setSearchQuery: handleSearchChange,
    typeFilter: filterOptions.type || "",
    setTypeFilter,
    statusFilter: filterOptions.stockStatus || "",
    setStatusFilter,
    page: filterOptions.page,
    pageSize: filterOptions.pageSize,
    totalPages,
    totalItems,
    setPage: handlePageChange,
    setPageSize: handlePageSizeChange,
    locale,
    refetch,
    getStockStatus,
  };
}
