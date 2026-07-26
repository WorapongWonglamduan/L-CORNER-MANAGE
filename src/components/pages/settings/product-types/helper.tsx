import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityForm } from "@/hooks/useEntityForm";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";
import { useLocale } from "next-intl";
import type { Locale } from "@/types/i18n";

export interface ProductTypeFormData {
  code: string;
  name_th: string;
  name_en: string;
  icon?: string;
  type: string;
  sort_order?: number;
  is_active: boolean;
}

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

export function useProductTypesManager() {
  const t = useTranslations("settings.productTypes");
  const { confirm, ConfirmDialog } = useConfirm();
  const locale = useLocale() as Locale;

  const {
    items: types,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    handleSearchChange,
    refetch,
  } = useEntityList<ProductType, TypesFilterOptions>({
    endpoint: "/api/product-types",
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
    editingEntity,
    dialogOpen,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDialogClose,
    handleFormSubmit,
  } = useEntityForm<ProductTypeFormData, ProductType>({
    formConfig: {
      defaultValues: {
        code: "",
        name_th: "",
        name_en: "",
        icon: "",
        type: "",
        sort_order: 0,
        is_active: true,
      },
    },
    endpoint: "/api/product-types",
    transformToPayload: (data) => ({
      code: data.code,
      name_i18n: {
        th: data.name_th,
        en: data.name_en,
      },
      icon: data.icon,
      type: data.type,
      sort_order: data.sort_order,
      is_active: data.is_active,
    }),
    transformToForm: (productType) => ({
      code: productType.code,
      name_th: productType.name_i18n.th,
      name_en: productType.name_i18n.en,
      icon: productType.icon || "",
      type: productType.type || "product",
      sort_order: productType.sort_order,
      is_active: productType.is_active,
    }),
    onSuccess: refetch,
    confirmDelete: confirm,
  });

  return {
    t,
    locale,
    table: {
      types,
      allTypes: types,
      loading,
      totalItems,
      totalPages,
    },
    filters: {
      searchQuery: filterOptions.search || "",
      setSearchQuery: handleSearchChange,
      filterOptions,
    },
    pagination: {
      handlePageChange,
      handlePageSizeChange,
    },
    actions: {
      handleCreate,
      handleEdit,
      handleDelete: (id: string) => handleDelete(id, t("confirmDelete")),
    },
    form: {
      dialogOpen,
      editingType: editingEntity,
      control,
      handleSubmit,
      errors,
      loading: formLoading,
      error: formError,
      handleDialogClose,
      handleFormSubmit,
    },
    modal: {
      ConfirmDialog,
    },
  };
}
