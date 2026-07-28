import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { toast } from "@/lib/toast";
import type { FilterValues } from "@/components/ui/dynamic-filter-bar";

export interface WarehouseOption {
  id: string;
  code: string;
  name_i18n: { th: string; en: string };
}

interface Product {
  id: string;
  code: string;
  name_i18n: {
    th: string;
    en: string;
  };
  description_i18n?: {
    th: string;
    en: string;
  } | null;
  category_id: string | null;
  category?: {
    id: string;
    name_i18n: {
      th: string;
      en: string;
    };
  } | null;
  product_type_id: string;
  product_type?: {
    id: string;
    name_i18n: {
      th: string;
      en: string;
    };
  };
  base_unit_id: string;
  base_unit?: {
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
  selling_price: number | null;
  cost_price: number | null;
  min_stock_level: number;
  low_stock_threshold: number;
  primary_image_url: string | null;
  track_stock: boolean;
  has_serial: boolean;
  has_expiry: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Whether a hard delete would actually succeed right now — computed
  // server-side from the same dependency checks the DELETE route enforces
  // (sales history / used as a recipe or topping ingredient / has a
  // transfer record). Drives whether the delete button even renders.
  can_delete: boolean;
}

interface ProductsFilterOptions extends FilterOptions {
  search?: string;
  isActive?: boolean;
  category_id?: string;
  product_type_id?: string;
  type?: string;
  warehouseId?: string;
  unassigned?: string;
}

// Sentinel for the branch selector's "products not active at any branch"
// option (no ProductStock row at all, or every row inactive) — distinct
// from a real warehouse id.
export const UNASSIGNED_WAREHOUSE_VALUE = "__unassigned__";

export interface ProductFormData {
  code: string;
  product_type_id: string;
  name_th: string;
  name_en: string;
  category_id: string;
  base_unit_id: string;
  description_th?: string;
  description_en?: string;
  selling_price: number;
  cost_price?: number;
  min_stock_level?: number;
  low_stock_threshold?: number;
  track_stock?: boolean;
  has_serial?: boolean;
  has_expiry?: boolean;
  is_active?: boolean;
}

export function useProductsManager() {
  const t = useTranslations("settings.products");
  const tCommon = useTranslations("common");
  const { confirm, ConfirmDialog } = useConfirm();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const { data: session } = useSession();
  const sessionWarehouseIds = session?.user?.warehouse_ids;
  const assignedWarehouseIds = useMemo(
    () => sessionWarehouseIds ?? [],
    [sessionWarehouseIds],
  );
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await fetch("/api/warehouses?pageSize=100&isActive=true");
        const data = await response.json();
        const allItems: WarehouseOption[] = data.items || [];
        setWarehouses(allItems.filter((w) => assignedWarehouseIds.includes(w.id)));
      } catch (error) {
        console.error("Error fetching warehouses:", error);
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
  } = useEntityList<Product, ProductsFilterOptions>({
    endpoint: "/api/products",
    initialFilters: {
      search: "",
      isActive: undefined,
      type: `${PRODUCTS_TYPES.FINISHED_GOOD},${PRODUCTS_TYPES.SEMI_FINISHED}`,
    },
  });

  const applyFilters = (values: FilterValues) => {
    updateFilter({
      search: values.search as string,
      isActive: values.isActive === "" ? undefined : values.isActive === "true",
    } as Partial<ProductsFilterOptions>);
  };

  const resetFilters = () => {
    updateFilter({
      search: "",
      isActive: undefined,
    } as Partial<ProductsFilterOptions>);
  };

  // Branch context selector — applies immediately on change (like Inventory's),
  // not gated behind the filter bar's "search" button. The sentinel value is
  // a special audit mode (no ProductStock row anywhere), not a real branch.
  const setWarehouseId = (warehouseId: string) => {
    if (warehouseId === UNASSIGNED_WAREHOUSE_VALUE) {
      updateFilter({
        warehouseId: undefined,
        unassigned: "true",
      } as Partial<ProductsFilterOptions>);
    } else {
      updateFilter({
        warehouseId: warehouseId || undefined,
        unassigned: undefined,
      } as Partial<ProductsFilterOptions>);
    }
  };

  const handleCreate = () => {
    router.push(`/${locale}/products/add`);
  };

  const handleView = (product: Product) => {
    router.push(`/${locale}/products/${product.id}`);
  };

  const handleEdit = (product: Product) => {
    router.push(`/${locale}/products/edit/${product.id}`);
  };

  const handleDelete = async (id: string, hard: boolean) => {
    const confirmed = await confirm({
      title: tCommon("confirmDeleteTitle"),
      description: t("confirmDelete"),
      confirmText: tCommon("delete"),
      cancelText: tCommon("cancel"),
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/products/${id}?hard=${hard}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to delete product");
      }

      refetch();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error(
        error instanceof Error ? error.message : tCommon("deleteError"),
      );
    }
  };

  // Flipping is_active is the way to retire a product that hard-delete
  // rejects (real sales history / used as an ingredient elsewhere) without
  // losing that history — unlike DELETE?hard=false, it stays visible via the
  // isActive filter instead of disappearing from the list entirely. Sends
  // every current field back (not just is_active) since the PUT route
  // treats an omitted field as `undefined` for most but `|| null` for
  // category_id/description_i18n, which would silently null them out.
  const handleToggleActive = async (product: Product) => {
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: product.code,
          name_i18n: product.name_i18n,
          description_i18n: product.description_i18n,
          category_id: product.category_id,
          product_type_id: product.product_type_id,
          base_unit_id: product.base_unit_id,
          is_active: !product.is_active,
          has_serial: product.has_serial,
          has_expiry: product.has_expiry,
          track_stock: product.track_stock,
          selling_price: product.selling_price,
          cost_price: product.cost_price,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to update product");
      }

      toast.success(product.is_active ? t("deactivateSuccess") : t("activateSuccess"));
      refetch();
    } catch (error) {
      console.error("Error toggling product active state:", error);
      toast.error(
        error instanceof Error ? error.message : tCommon("updateError"),
      );
    }
  };

  return {
    t,
    table: {
      products,
      loading,
    },
    filters: {
      search: filterOptions.search || "",
      isActive:
        filterOptions.isActive === undefined ? "" : String(filterOptions.isActive),
      warehouseId: filterOptions.warehouseId || "",
      // What the branch <select>'s value should actually show — the real
      // warehouseId, the "unassigned" sentinel, or blank for "all branches".
      warehouseSelectValue: filterOptions.unassigned
        ? UNASSIGNED_WAREHOUSE_VALUE
        : filterOptions.warehouseId || "",
      applyFilters,
      resetFilters,
      setWarehouseId,
      filterOptions,
    },
    warehouses,
    pagination: {
      totalItems,
      totalPages,
      handlePageChange,
      handlePageSizeChange,
    },
    actions: {
      handleCreate,
      handleView,
      handleEdit,
      handleDelete,
      handleToggleActive,
    },
    modal: {
      ConfirmDialog,
    },
  };
}
