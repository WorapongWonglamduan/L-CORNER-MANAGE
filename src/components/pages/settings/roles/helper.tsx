import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityForm } from "@/hooks/useEntityForm";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";
import { I18nText } from "@/types/i18n";
import type { FilterValues } from "@/components/ui/dynamic-filter-bar";

export interface RoleFormData {
  name: string;
  display_name_th: string;
  display_name_en: string;
  description_th: string;
  description_en: string;
  permissions: string[];
  is_active: boolean;
}

export interface AppRole {
  id: string;
  name: string;
  display_name_i18n: I18nText;
  description_i18n: I18nText | null;
  permissions: string[];
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RolesFilterOptions extends FilterOptions {
  search?: string;
  isActive?: boolean;
}

export function useRolesManager() {
  const t = useTranslations("roles");
  const { confirm, ConfirmDialog } = useConfirm();

  const {
    items: roles,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    updateFilter,
    refetch,
  } = useEntityList<AppRole, RolesFilterOptions>({
    endpoint: "/api/roles",
    initialFilters: {
      search: "",
      isActive: undefined,
    },
  });

  const applyFilters = (values: FilterValues) => {
    updateFilter({
      search: values.search as string,
      isActive: values.isActive === "" ? undefined : values.isActive === "true",
    } as Partial<RolesFilterOptions>);
  };

  const resetFilters = () => {
    updateFilter({ search: "", isActive: undefined } as Partial<RolesFilterOptions>);
  };

  const {
    control,
    handleSubmit,
    errors,
    loading: formLoading,
    error: formError,
    editingEntity: editingRole,
    dialogOpen,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDialogClose,
    handleFormSubmit,
  } = useEntityForm<RoleFormData, AppRole>({
    formConfig: {
      defaultValues: {
        name: "",
        display_name_th: "",
        display_name_en: "",
        description_th: "",
        description_en: "",
        permissions: [],
        is_active: true,
      },
    },
    endpoint: "/api/roles",
    transformToPayload: async (data) => ({
      name: data.name,
      display_name_i18n: {
        th: data.display_name_th,
        en: data.display_name_en,
      },
      description_i18n:
        data.description_th || data.description_en
          ? { th: data.description_th, en: data.description_en }
          : null,
      permissions: data.permissions,
      is_active: data.is_active,
    }),
    transformToForm: (role) => ({
      name: role.name,
      display_name_th: role.display_name_i18n.th,
      display_name_en: role.display_name_i18n.en,
      description_th: role.description_i18n?.th || "",
      description_en: role.description_i18n?.en || "",
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
      is_active: role.is_active,
    }),
    onSuccess: refetch,
    confirmDelete: confirm,
  });

  return {
    t,
    table: {
      items: roles,
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
      editingItem: editingRole,
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
    refetch,
  };
}
