import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityForm } from "@/hooks/useEntityForm";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";
import type { FilterValues } from "@/components/ui/dynamic-filter-bar";

export interface CategoryFormData {
  name_th: string;
  name_en: string;
  parent_id?: string;
  sort_order?: number;
  is_active: boolean;
}

interface Category {
  id: string;
  name_i18n: {
    th: string;
    en: string;
  };
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface CategoriesFilterOptions extends FilterOptions {
  search?: string;
  isActive?: boolean;
}

export function useCategoriesManager() {
  const t = useTranslations("settings.categories");
  const { confirm, ConfirmDialog } = useConfirm();

  const {
    items: categories,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    updateFilter,
    refetch,
  } = useEntityList<Category, CategoriesFilterOptions>({
    endpoint: "/api/categories",
    initialFilters: {
      search: "",
      isActive: undefined,
    },
  });

  const applyFilters = (values: FilterValues) => {
    updateFilter({
      search: values.search as string,
      isActive: values.isActive === "" ? undefined : values.isActive === "true",
    } as Partial<CategoriesFilterOptions>);
  };

  const resetFilters = () => {
    updateFilter({ search: "", isActive: undefined } as Partial<CategoriesFilterOptions>);
  };

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
  } = useEntityForm<CategoryFormData, Category>({
    formConfig: {
      defaultValues: {
        name_th: "",
        name_en: "",
        parent_id: "",
        sort_order: 0,
        is_active: true,
      },
    },
    endpoint: "/api/categories",
    transformToPayload: (data) => ({
      name_i18n: {
        th: data.name_th,
        en: data.name_en,
      },
      parent_id: data.parent_id || null,
      sort_order: data.sort_order,
      is_active: data.is_active,
    }),
    transformToForm: (category) => ({
      name_th: category.name_i18n.th,
      name_en: category.name_i18n.en,
      parent_id: category.parent_id || "",
      sort_order: category.sort_order,
      is_active: category.is_active,
    }),
    onSuccess: refetch,
    confirmDelete: confirm,
  });

  return {
    t,
    table: {
      categories,
      allCategories: categories || [],
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
      page: filterOptions.page,
      pageSize: filterOptions.pageSize,
      totalItems,
      totalPages,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    },
    actions: {
      handleCreate,
      handleEdit,
      handleDelete: (id: string) => handleDelete(id, t("confirmDelete")),
    },
    modal: {
      isOpen: dialogOpen,
      editingCategory: editingEntity,
      onClose: handleDialogClose,
    },
    form: {
      control,
      handleSubmit,
      onSubmit: handleFormSubmit,
      errors,
      loading: formLoading,
      error: formError,
    },
    ConfirmDialog,
  };
}
