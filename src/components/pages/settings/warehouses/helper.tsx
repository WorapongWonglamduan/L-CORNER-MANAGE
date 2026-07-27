import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityForm } from "@/hooks/useEntityForm";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";
import type { FilterValues } from "@/components/ui/dynamic-filter-bar";

export interface WarehouseFormData {
  code: string;
  name_th: string;
  name_en: string;
  address: string;
  latitude: string;
  longitude: string;
  // Form-local only (paste a Google Maps link/short link to auto-fill
  // latitude/longitude via `onValueChange` in form/config.ts) — never sent
  // to the API, stripped in transformToPayload.
  mapLink: string;
  is_active: boolean;
  is_default: boolean;
}

export interface Warehouse {
  id: string;
  code: string;
  name_i18n: {
    th: string;
    en: string;
  };
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

interface WarehousesFilterOptions extends FilterOptions {
  search?: string;
  isActive?: boolean;
}

export function useWarehousesManager() {
  const t = useTranslations("warehouses");
  const { confirm, ConfirmDialog } = useConfirm();

  const {
    items: warehouses,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    updateFilter,
    refetch,
  } = useEntityList<Warehouse, WarehousesFilterOptions>({
    endpoint: "/api/warehouses",
    initialFilters: {
      search: "",
      isActive: undefined,
    },
  });

  const applyFilters = (values: FilterValues) => {
    updateFilter({
      search: values.search as string,
      isActive: values.isActive === "" ? undefined : values.isActive === "true",
    } as Partial<WarehousesFilterOptions>);
  };

  const resetFilters = () => {
    updateFilter({ search: "", isActive: undefined } as Partial<WarehousesFilterOptions>);
  };

  const {
    control,
    handleSubmit,
    errors,
    setValue,
    watch,
    loading: formLoading,
    error: formError,
    editingEntity: editingWarehouse,
    dialogOpen,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDialogClose,
    handleFormSubmit,
  } = useEntityForm<WarehouseFormData, Warehouse>({
    formConfig: {
      defaultValues: {
        code: "",
        name_th: "",
        name_en: "",
        address: "",
        latitude: "",
        longitude: "",
        mapLink: "",
        is_active: true,
        is_default: false,
      },
    },
    endpoint: "/api/warehouses",
    transformToPayload: (data) => {
      return {
        code: data.code,
        name_i18n: {
          th: data.name_th,
          en: data.name_en,
        },
        address: data.address || null,
        latitude: data.latitude !== "" ? Number(data.latitude) : null,
        longitude: data.longitude !== "" ? Number(data.longitude) : null,
        is_active: data.is_active,
        is_default: data.is_default,
      };
    },
    transformToForm: (warehouse) => {
      return {
        code: warehouse.code,
        name_th: warehouse.name_i18n.th,
        name_en: warehouse.name_i18n.en,
        address: warehouse.address || "",
        latitude: warehouse.latitude !== null ? String(warehouse.latitude) : "",
        longitude: warehouse.longitude !== null ? String(warehouse.longitude) : "",
        mapLink: "",
        is_active: warehouse.is_active,
        is_default: warehouse.is_default,
      };
    },
    onSuccess: refetch,
    confirmDelete: confirm,
  });

  return {
    t,
    table: {
      items: warehouses,
      loading,
    },
    filters: {
      search: filterOptions.search || "",
      isActive:
        filterOptions.isActive === undefined ? "" : String(filterOptions.isActive),
      applyFilters,
      resetFilters,
    },
    pagination: {
      filterOptions,
      totalItems,
      totalPages,
      handlePageChange,
      handlePageSizeChange,
    },
    actions: {
      handleCreate,
      handleEdit,
      handleDelete: (id: string) => handleDelete(id, t("confirmDelete")),
    },
    dialog: {
      open: dialogOpen,
      editingItem: editingWarehouse,
      onClose: handleDialogClose,
      ConfirmDialog,
    },
    form: {
      control,
      handleSubmit,
      errors,
      setValue,
      watch,
      loading: formLoading,
      error: formError,
      onSubmit: handleFormSubmit,
    },
  };
}
