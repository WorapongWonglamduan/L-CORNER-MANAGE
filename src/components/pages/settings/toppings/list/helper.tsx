import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityForm } from "@/hooks/useEntityForm";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";
import { useEffect, useState, useCallback } from "react";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { I18nText } from "@/types/i18n";
import type { FilterValues } from "@/components/ui/dynamic-filter-bar";

export interface ToppingFormData {
  name_th: string;
  name_en: string;
  price?: number;
  ingredient_id: string;
  quantity_per_serving?: number;
  is_active: boolean;
}

export interface ToppingIngredient {
  id: string;
  code: string;
  name_i18n: I18nText;
  current_stock?: number;
}

export interface ToppingAvailableProduct {
  id: string;
  code: string;
  name_i18n: I18nText;
}

export interface ProductTopping {
  id: string;
  product_id: string;
  topping_id: string;
  product: ToppingAvailableProduct;
}

export interface Topping {
  id: string;
  name_i18n: I18nText;
  price: number;
  ingredient_id: string;
  ingredient?: ToppingIngredient | null;
  quantity_per_serving: number;
  is_active: boolean;
  available_on: ProductTopping[];
  created_at: string;
  updated_at: string;
}

interface IngredientOption {
  id: string;
  code: string;
  name_i18n: I18nText;
  current_stock: number;
}

interface AvailableProductOption {
  id: string;
  code: string;
  name_i18n: I18nText;
}

interface ToppingsFilterOptions extends FilterOptions {
  search?: string;
  isActive?: boolean;
}

export function useToppingsManager() {
  const t = useTranslations("toppings");
  const { confirm, ConfirmDialog } = useConfirm();
  const [optionsData, setOptionsData] = useState<{
    ingredients: IngredientOption[];
    availableProducts: AvailableProductOption[];
  }>({ ingredients: [], availableProducts: [] });
  const [dataLoading, setDataLoading] = useState(true);

  const {
    items: toppings,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    updateFilter,
    refetch,
  } = useEntityList<Topping, ToppingsFilterOptions>({
    endpoint: "/api/toppings",
    initialFilters: {
      search: "",
      isActive: undefined,
    },
  });

  const applyFilters = (values: FilterValues) => {
    updateFilter({
      search: values.search as string,
      isActive: values.isActive === "" ? undefined : values.isActive === "true",
    } as Partial<ToppingsFilterOptions>);
  };

  const resetFilters = () => {
    updateFilter({ search: "", isActive: undefined } as Partial<ToppingsFilterOptions>);
  };

  const fetchOptions = useCallback(async () => {
    try {
      setDataLoading(true);
      const [ingredientsRes, availableProductsRes] = await Promise.all([
        fetch(
          `/api/products?pageSize=100&isActive=true&type=${PRODUCTS_TYPES.INGREDIENT},${PRODUCTS_TYPES.CONTAINER},${PRODUCTS_TYPES.FINISHED_GOOD}`,
        ),
        fetch(
          `/api/products?pageSize=100&isActive=true&type=${PRODUCTS_TYPES.SEMI_FINISHED}`,
        ),
      ]);

      const ingredientsData = await ingredientsRes.json();
      const availableProductsData = await availableProductsRes.json();

      setOptionsData({
        ingredients: ingredientsData.items || [],
        availableProducts: availableProductsData.items || [],
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const {
    control,
    handleSubmit,
    errors,
    loading: formLoading,
    error: formError,
    editingEntity: editingTopping,
    dialogOpen,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDialogClose,
    handleFormSubmit,
  } = useEntityForm<ToppingFormData, Topping>({
    formConfig: {
      defaultValues: {
        name_th: "",
        name_en: "",
        price: 0,
        ingredient_id: "",
        quantity_per_serving: 0,
        is_active: true,
      },
    },
    endpoint: "/api/toppings",
    transformToPayload: async (data) => {
      return {
        name_i18n: {
          th: data.name_th,
          en: data.name_en,
        },
        price: data.price || 0,
        ingredient_id: data.ingredient_id,
        quantity_per_serving: data.quantity_per_serving || 0,
        is_active: data.is_active,
      };
    },
    transformToForm: (topping) => {
      return {
        name_th: topping.name_i18n.th,
        name_en: topping.name_i18n.en,
        price: Number(topping.price) || 0,
        ingredient_id: topping.ingredient_id,
        quantity_per_serving: Number(topping.quantity_per_serving) || 0,
        is_active: topping.is_active,
      };
    },
    onSuccess: refetch,
    confirmDelete: confirm,
  });

  return {
    t,
    table: {
      items: toppings,
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
      editingItem: editingTopping,
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
      ingredients: optionsData.ingredients,
    },
    availableProducts: optionsData.availableProducts,
    refetch,
  };
}
