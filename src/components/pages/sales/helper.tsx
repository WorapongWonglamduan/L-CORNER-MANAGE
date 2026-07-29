import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { FilterOptions } from "@/hooks/usePagination";
import { useConfirm } from "@/hooks/useConfirm";
import { toast } from "@/lib/toast";
import type { FilterValues } from "@/components/ui/dynamic-filter-bar";

interface SaleRefund {
  id: string;
  refund_number: string;
  total_amount: string;
  reason: string | null;
  created_at: string;
  items: { sale_item_id: string; quantity: string }[];
}

interface Sale {
  id: string;
  sale_number: string;
  sale_date: string;
  warehouse_id: string;
  subtotal: string;
  discount_amount: string;
  tax_rate: string;
  tax_amount: string;
  total_amount: string;
  payment_method: string | null;
  payment_status: string;
  status: string;
  created_by: string | null;
  note: string | null;
  created_at: string;
  warehouse: {
    id: string;
    name_i18n: {
      th: string;
      en: string;
    };
  };
  created_by_user: {
    id: string;
    full_name: string;
  } | null;
  items: SaleItem[];
  refunds: SaleRefund[];
}

interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  recipe_id: string | null;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  discount_amount: string;
  total_amount: string;
  cost_price: string | null;
  base_quantity: string | null;
  note: string | null;
  created_at: string;
  refund_items: { sale_item_id: string; quantity: string }[];
  product: {
    id: string;
    name_i18n: {
      th: string;
      en: string;
    };
    code: string;
    product_type: {
      id: string;
      name_i18n: {
        th: string;
        en: string;
      };
      type: string;
    };
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
  };
}

interface SalesFilterOptions extends FilterOptions {
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

export function useSalesManager() {
  const locale = useLocale();
  const t = useTranslations("sales");
  const { confirm, ConfirmDialog } = useConfirm();

  const {
    items: sales,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    updateFilter,
    refetch,
  } = useEntityList<Sale, SalesFilterOptions>({
    endpoint: "/api/sales",
    initialFilters: {
      searchQuery: "",
      startDate: "",
      endDate: "",
    },
  });

  // DynamicFilterBar's date-range field reports values as `${name}From`/
  // `${name}To` (field is named "date" below), not startDate/endDate.
  const applyFilters = useCallback(
    (values: FilterValues) => {
      updateFilter({
        searchQuery: values.searchQuery ?? "",
        startDate: values.dateFrom ?? "",
        endDate: values.dateTo ?? "",
      } as Partial<SalesFilterOptions>);
    },
    [updateFilter],
  );
  const resetFilters = useCallback(() => {
    updateFilter({
      searchQuery: "",
      startDate: "",
      endDate: "",
    } as Partial<SalesFilterOptions>);
  }, [updateFilter]);

  const handleVoid = async (sale: Sale) => {
    const confirmed = await confirm({
      title: t("voidConfirmTitle"),
      description: t("voidConfirmDesc", { saleNumber: sale.sale_number }),
      confirmText: t("voidSale"),
      cancelText: "ยกเลิก",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/sales/${sale.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to void sale");
      }
      toast.success(t("voidSuccess"));
      refetch();
    } catch (error) {
      console.error("Error voiding sale:", error);
      toast.error(t("voidError"));
    }
  };

  return {
    table: {
      sales,
      loading,
      locale,
    },
    filters: {
      searchQuery: filterOptions.searchQuery || "",
      startDate: filterOptions.startDate || "",
      endDate: filterOptions.endDate || "",
      applyFilters,
      resetFilters,
    },
    pagination: {
      page: filterOptions.page,
      pageSize: filterOptions.pageSize,
      totalPages,
      totalItems,
      setPage: handlePageChange,
      setPageSize: handlePageSizeChange,
    },
    actions: {
      refetch,
      handleVoid,
    },
    modal: {
      ConfirmDialog,
    },
  };
}
