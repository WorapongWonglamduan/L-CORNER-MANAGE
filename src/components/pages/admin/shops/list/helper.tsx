import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityForm } from "@/hooks/useEntityForm";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";
import type { FilterValues } from "@/components/ui/dynamic-filter-bar";

export interface ShopFormData {
  name_th: string;
  name_en: string;
  is_active: boolean;
  logo_path?: string | null;
  branch_code?: string;
  branch_name_th?: string;
  branch_name_en?: string;
  owner_username?: string;
  owner_email?: string;
  owner_password?: string;
  owner_full_name?: string;
}

export interface Shop {
  id: string;
  name_i18n: { th: string; en: string };
  logo_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: { users: number; warehouses: number; products?: number };
}

interface ShopsFilterOptions extends FilterOptions {
  search?: string;
}

export function useShopsManager() {
  const t = useTranslations("adminShops");
  const { confirm, ConfirmDialog } = useConfirm();

  const {
    items: shops,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    updateFilter,
    refetch,
  } = useEntityList<Shop, ShopsFilterOptions>({
    endpoint: "/api/admin/shops",
    initialFilters: { search: "" },
  });

  const applyFilters = (values: FilterValues) => {
    updateFilter({ search: values.search as string } as Partial<ShopsFilterOptions>);
  };

  const resetFilters = () => {
    updateFilter({ search: "" } as Partial<ShopsFilterOptions>);
  };

  const {
    control,
    handleSubmit,
    errors,
    loading: formLoading,
    error: formError,
    editingEntity: editingShop,
    dialogOpen,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDialogClose,
    handleFormSubmit,
  } = useEntityForm<ShopFormData, Shop>({
    formConfig: {
      defaultValues: {
        name_th: "",
        name_en: "",
        is_active: true,
        logo_path: null,
        branch_code: "",
        branch_name_th: "",
        branch_name_en: "",
        owner_username: "",
        owner_email: "",
        owner_password: "",
        owner_full_name: "",
      },
    },
    endpoint: "/api/admin/shops",
    transformToPayload: (data) => data,
    transformToForm: (shop) => ({
      name_th: shop.name_i18n.th,
      name_en: shop.name_i18n.en,
      is_active: shop.is_active,
      logo_path: shop.logo_path,
    }),
    onSuccess: refetch,
    confirmDelete: confirm,
  });

  return {
    t,
    table: { shops, loading, totalItems, totalPages },
    filters: {
      search: filterOptions.search || "",
      applyFilters,
      resetFilters,
      filterOptions,
    },
    pagination: { handlePageChange, handlePageSizeChange },
    actions: {
      handleCreate,
      handleEdit,
      handleDelete: (id: string) => handleDelete(id, t("confirmDelete")),
    },
    form: {
      dialogOpen,
      editingShop,
      control,
      handleSubmit,
      errors,
      loading: formLoading,
      error: formError,
      handleDialogClose,
      handleFormSubmit,
    },
    modal: { ConfirmDialog },
  };
}
