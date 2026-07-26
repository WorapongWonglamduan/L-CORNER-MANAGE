import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityForm } from "@/hooks/useEntityForm";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";
import { useEffect, useState, useCallback } from "react";
import { I18nText } from "@/types/i18n";

export interface UserFormData {
  username: string;
  email: string;
  password: string;
  full_name: string;
  is_active: boolean;
}

export interface RoleOption {
  id: string;
  name: string;
  display_name_i18n: I18nText;
}

export interface UserRoleAssignment {
  id: string;
  role_id: string;
  role: RoleOption;
}

export interface AppUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  user_roles: UserRoleAssignment[];
  created_at: string;
  updated_at: string;
}

interface UsersFilterOptions extends FilterOptions {
  search?: string;
  isActive?: boolean;
}

export function useUsersManager() {
  const t = useTranslations("users");
  const { confirm, ConfirmDialog } = useConfirm();
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const {
    items: users,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    handleSearchChange,
    refetch,
  } = useEntityList<AppUser, UsersFilterOptions>({
    endpoint: "/api/users",
    initialFilters: {
      search: "",
    },
  });

  const fetchRoles = useCallback(async () => {
    try {
      setDataLoading(true);
      const response = await fetch("/api/roles?pageSize=100&isActive=true");
      const data = await response.json();
      setRoles(data.items || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const {
    control,
    handleSubmit,
    errors,
    loading: formLoading,
    error: formError,
    editingEntity: editingUser,
    dialogOpen,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDialogClose,
    handleFormSubmit,
  } = useEntityForm<UserFormData, AppUser>({
    formConfig: {
      defaultValues: {
        username: "",
        email: "",
        password: "",
        full_name: "",
        is_active: true,
      },
    },
    endpoint: "/api/users",
    transformToPayload: async (data) => {
      const payload: Record<string, unknown> = {
        username: data.username,
        email: data.email,
        full_name: data.full_name,
        is_active: data.is_active,
      };
      if (data.password) {
        payload.password = data.password;
      }
      return payload;
    },
    transformToForm: (user) => ({
      username: user.username,
      email: user.email,
      password: "",
      full_name: user.full_name,
      is_active: user.is_active,
    }),
    onSuccess: refetch,
    confirmDelete: confirm,
  });

  return {
    t,
    table: {
      items: users,
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
      editingItem: editingUser,
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
      dataLoading,
    },
    roles,
    refetch,
  };
}
