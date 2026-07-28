import { useState, useEffect, useMemo } from "react";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { useEntityList } from "@/hooks/useEntityList";
import { FilterOptions } from "@/hooks/usePagination";
import type { FilterValues } from "@/components/ui/dynamic-filter-bar";
import type { I18nText, Locale } from "@/types/i18n";

export interface Warehouse {
  id: string;
  code: string;
  name_i18n: I18nText;
  is_default: boolean;
}

export interface Product {
  id: string;
  code: string;
  name_i18n: I18nText;
  current_stock: string;
  min_stock_level: string;
  low_stock_threshold: string;
  track_stock: boolean;
  primary_image_url: string | null;
  base_unit: {
    id: string;
    name_i18n: I18nText;
    abbreviation_i18n: I18nText;
  };
  product_type: {
    id: string;
    type: string;
    name_i18n: I18nText;
  };
}

interface InventoryFilterOptions extends FilterOptions {
  search?: string;
  type?: string;
  stockStatus?: string;
  warehouseId?: string;
}

export function useInventoryManager() {
  const locale = useLocale() as Locale;
  const { data: session } = useSession();
  const sessionWarehouseIds = session?.user?.warehouse_ids;
  const assignedWarehouseIds = useMemo(
    () => sessionWarehouseIds ?? [],
    [sessionWarehouseIds],
  );

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await fetch("/api/warehouses?pageSize=100&isActive=true");
        const data = await response.json();
        const allItems: Warehouse[] = data.items || [];
        setWarehouses(
          allItems.filter((w) => assignedWarehouseIds.includes(w.id)),
        );
      } catch (error) {
        console.error("Error fetching warehouses:", error);
      } finally {
        setWarehousesLoading(false);
      }
    };
    fetchWarehouses();
  }, [assignedWarehouseIds]);

  const {
    items: products,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    updateFilter,
    refetch,
  } = useEntityList<Product, InventoryFilterOptions>({
    endpoint: "/api/products",
    initialFilters: {
      search: "",
      type: "",
      stockStatus: "",
      warehouseId: "",
    },
  });

  // Default to the is_default-flagged warehouse (falling back to the
  // lowest `code` if none is flagged, or it isn't one this user is
  // assigned to) once loaded, if none selected yet.
  useEffect(() => {
    if (!filterOptions.warehouseId && warehouses.length > 0) {
      const defaultWarehouse = warehouses.find((w) => w.is_default);
      const sortedByCode = [...warehouses].sort((a, b) =>
        a.code.localeCompare(b.code),
      );
      updateFilter({
        warehouseId: (defaultWarehouse ?? sortedByCode[0]).id,
      } as Partial<InventoryFilterOptions>);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouses]);

  const setWarehouseId = (warehouseId: string) => {
    updateFilter({ warehouseId } as Partial<InventoryFilterOptions>);
  };

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

  const applyFilters = (values: FilterValues) => {
    updateFilter({
      search: values.search,
      type: values.type,
      stockStatus: values.stockStatus,
    } as Partial<InventoryFilterOptions>);
  };

  const resetFilters = () => {
    updateFilter({
      search: "",
      type: "",
      stockStatus: "",
    } as Partial<InventoryFilterOptions>);
  };

  return {
    products,
    loading,
    warehouses,
    warehousesLoading,
    filters: {
      search: filterOptions.search || "",
      type: filterOptions.type || "",
      status: filterOptions.stockStatus || "",
      applyFilters,
      resetFilters,
      warehouseId: filterOptions.warehouseId || "",
      setWarehouseId,
    },
    pagination: {
      page: filterOptions.page,
      pageSize: filterOptions.pageSize,
      totalPages,
      totalItems,
      setPage: handlePageChange,
      setPageSize: handlePageSizeChange,
    },
    locale,
    refetch,
    getStockStatus,
  };
}
