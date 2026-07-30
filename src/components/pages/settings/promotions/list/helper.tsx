import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityForm } from "@/hooks/useEntityForm";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";
import type { FilterValues } from "@/components/ui/dynamic-filter-bar";

export interface PromotionFormData {
  code: string;
  name_th: string;
  name_en: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses?: number;
  expires_at?: string;
  is_active: boolean;
}

export interface Promotion {
  id: string;
  code: string;
  name_i18n: {
    th: string;
    en: string;
  };
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PromotionsFilterOptions extends FilterOptions {
  search?: string;
  isActive?: boolean;
}

export function usePromotionsManager() {
  const t = useTranslations("promotions");
  const { confirm, ConfirmDialog } = useConfirm();

  const {
    items: promotions,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    updateFilter,
    refetch,
  } = useEntityList<Promotion, PromotionsFilterOptions>({
    endpoint: "/api/promotions",
    initialFilters: {
      search: "",
      isActive: undefined,
    },
  });

  const applyFilters = (values: FilterValues) => {
    updateFilter({
      search: values.search as string,
      isActive: values.isActive === "" ? undefined : values.isActive === "true",
    } as Partial<PromotionsFilterOptions>);
  };

  const resetFilters = () => {
    updateFilter({ search: "", isActive: undefined } as Partial<PromotionsFilterOptions>);
  };

  const {
    control,
    handleSubmit,
    errors,
    loading: formLoading,
    error: formError,
    editingEntity: editingPromotion,
    dialogOpen,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDialogClose,
    handleFormSubmit,
  } = useEntityForm<PromotionFormData, Promotion>({
    formConfig: {
      defaultValues: {
        code: "",
        name_th: "",
        name_en: "",
        discount_type: "percentage",
        discount_value: 0,
        max_uses: undefined,
        expires_at: "",
        is_active: true,
      },
    },
    endpoint: "/api/promotions",
    transformToPayload: (data) => {
      return {
        code: data.code,
        name_i18n: {
          th: data.name_th,
          en: data.name_en,
        },
        discount_type: data.discount_type,
        discount_value: Number(data.discount_value),
        max_uses: data.max_uses || null,
        expires_at: data.expires_at || null,
        is_active: data.is_active,
      };
    },
    transformToForm: (promotion) => {
      return {
        code: promotion.code,
        name_th: promotion.name_i18n.th,
        name_en: promotion.name_i18n.en,
        discount_type: promotion.discount_type,
        discount_value: Number(promotion.discount_value),
        max_uses: promotion.max_uses ?? undefined,
        expires_at: promotion.expires_at
          ? promotion.expires_at.slice(0, 10)
          : "",
        is_active: promotion.is_active,
      };
    },
    onSuccess: refetch,
    confirmDelete: confirm,
  });

  return {
    t,
    table: {
      items: promotions,
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
      editingItem: editingPromotion,
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
