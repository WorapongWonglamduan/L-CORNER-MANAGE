import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityForm } from "@/hooks/useEntityForm";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";

export interface WarehouseFormData {
  code: string;
  name_th: string;
  name_en: string;
  address: string;
  is_active: boolean;
}

export interface Warehouse {
  id: string;
  code: string;
  name_i18n: {
    th: string;
    en: string;
  };
  address: string | null;
  is_active: boolean;
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
    handleSearchChange,
    refetch,
  } = useEntityList<Warehouse, WarehousesFilterOptions>({
    endpoint: "/api/warehouses",
    initialFilters: {
      search: "",
    },
  });

  const {
    control,
    handleSubmit,
    errors,
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
        is_active: true,
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
        is_active: data.is_active,
      };
    },
    transformToForm: (warehouse) => {
      return {
        code: warehouse.code,
        name_th: warehouse.name_i18n.th,
        name_en: warehouse.name_i18n.en,
        address: warehouse.address || "",
        is_active: warehouse.is_active,
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
      searchQuery: filterOptions.search || "",
      setSearchQuery: handleSearchChange,
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
      loading: formLoading,
      error: formError,
      onSubmit: handleFormSubmit,
    },
  };
}
