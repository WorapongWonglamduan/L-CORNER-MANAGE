import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityForm } from "@/hooks/useEntityForm";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";

export interface RawMaterialCategoryFormData {
  code: string;
  name_th: string;
  name_en: string;
  type: string;
  sort_order?: number;
  is_active: boolean;
}

interface RawMaterialCategory {
  id: string;
  code: string;
  name_i18n: {
    th: string;
    en: string;
  };
  type: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoriesFilterOptions extends FilterOptions {
  search?: string;
  isActive?: boolean;
}

export function useRawMaterialCategoriesManager() {
  const t = useTranslations("settings.rawMaterialCategories");
  const { confirm, ConfirmDialog } = useConfirm();

  const {
    items: categories,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    handleSearchChange,
    refetch,
  } = useEntityList<RawMaterialCategory, CategoriesFilterOptions>({
    endpoint: "/api/raw-material-categories",
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
    editingEntity: editingCategory,
    dialogOpen,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDialogClose,
    handleFormSubmit,
  } = useEntityForm<RawMaterialCategoryFormData, RawMaterialCategory>({
    formConfig: {
      defaultValues: {
        code: "",
        name_th: "",
        name_en: "",
        type: "raw_material",
        sort_order: 0,
        is_active: true,
      },
    },
    endpoint: "/api/raw-material-categories",
    transformToPayload: (data) => ({
      code: data.code,
      name_i18n: {
        th: data.name_th,
        en: data.name_en,
      },
      type: data.type,
      sort_order: data.sort_order,
      is_active: data.is_active,
    }),
    transformToForm: (category) => ({
      code: category.code,
      name_th: category.name_i18n.th,
      name_en: category.name_i18n.en,
      type: category.type || "raw_material",
      sort_order: category.sort_order,
      is_active: category.is_active,
    }),
    onSuccess: refetch,
    confirmDelete: confirm,
  });

  return {
    t,
    categories,
    allCategories: categories,
    loading,
    searchQuery: filterOptions.search || "",
    setSearchQuery: handleSearchChange,
    dialogOpen,
    editingCategory,
    filterOptions,
    totalItems,
    totalPages,
    handleCreate,
    handleEdit,
    handleDelete: (id: string) => handleDelete(id, t("confirmDelete")),
    handleDialogClose,
    handleFormSubmit,
    handlePageChange,
    handlePageSizeChange,
    formControl: control,
    formHandleSubmit: handleSubmit,
    formErrors: errors,
    formLoading,
    formError,
    ConfirmDialog,
  };
}
