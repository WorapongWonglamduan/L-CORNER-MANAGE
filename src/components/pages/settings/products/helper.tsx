import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityForm } from "@/hooks/useEntityForm";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";
import { useEffect, useState } from "react";

export interface ProductFormData {
  code: string;
  name_th: string;
  name_en: string;
  description_th?: string;
  description_en?: string;
  category_id?: string;
  product_type: string;
  base_unit_id: string;
  image_url?: string;
  is_active: boolean;
  has_serial: boolean;
  has_expiry: boolean;
  min_stock_level?: number;
  low_stock_threshold?: number;
  track_stock: boolean;
}

interface Product {
  id: string;
  code: string;
  name_i18n: {
    th: string;
    en: string;
  };
  description_i18n?: {
    th: string;
    en: string;
  } | null;
  category_id: string | null;
  category?: {
    id: string;
    name_i18n: {
      th: string;
      en: string;
    };
  } | null;
  product_type: string;
  base_unit_id: string;
  base_unit?: {
    id: string;
    name_i18n: {
      th: string;
      en: string;
    };
    abbreviation_i18n: {
      th: string;
      en: string;
    };
  };
  image_url: string | null;
  is_active: boolean;
  has_serial: boolean;
  has_expiry: boolean;
  min_stock_level: number;
  low_stock_threshold: number;
  track_stock: boolean;
  created_at: string;
  updated_at: string;
}

interface Unit {
  id: string;
  name_i18n: {
    th: string;
    en: string;
  };
  abbreviation_i18n: {
    th: string;
    en: string;
  };
}

interface Category {
  id: string;
  name_i18n: {
    th: string;
    en: string;
  };
}

interface ProductsFilterOptions extends FilterOptions {
  search?: string;
  isActive?: boolean;
  categoryId?: string;
  productType?: string;
}

export function useProductsManager() {
  const t = useTranslations("settings.products");
  const { confirm, ConfirmDialog } = useConfirm();
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const {
    items: products,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    handleSearchChange,
    refetch,
  } = useEntityList<Product, ProductsFilterOptions>({
    endpoint: "/api/products",
    initialFilters: {
      search: "",
    },
  });

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const response = await fetch("/api/units?pageSize=100&isActive=true");
        const data = await response.json();
        setUnits(data.items || []);
      } catch (error) {
        console.error("Error fetching units:", error);
      } finally {
        setUnitsLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/raw-material-categories?pageSize=100&isActive=true&type=product");
        const data = await response.json();
        setCategories(data.items || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchUnits();
    fetchCategories();
  }, []);

  const {
    control,
    handleSubmit,
    errors,
    loading: formLoading,
    error: formError,
    editingEntity: editingProduct,
    dialogOpen,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDialogClose,
    handleFormSubmit,
  } = useEntityForm<ProductFormData, Product>({
    formConfig: {
      defaultValues: {
        code: "",
        name_th: "",
        name_en: "",
        description_th: "",
        description_en: "",
        category_id: "",
        product_type: "finished_good",
        base_unit_id: "",
        image_url: "",
        is_active: true,
        has_serial: false,
        has_expiry: false,
        min_stock_level: 0,
        low_stock_threshold: 0,
        track_stock: true,
      },
    },
    endpoint: "/api/products",
    transformToPayload: (data) => ({
      code: data.code,
      name_i18n: {
        th: data.name_th,
        en: data.name_en,
      },
      description_i18n: data.description_th || data.description_en ? {
        th: data.description_th || "",
        en: data.description_en || "",
      } : null,
      category_id: data.category_id || null,
      product_type: data.product_type,
      base_unit_id: data.base_unit_id,
      image_url: data.image_url || null,
      is_active: data.is_active,
      has_serial: data.has_serial,
      has_expiry: data.has_expiry,
      min_stock_level: data.min_stock_level || 0,
      low_stock_threshold: data.low_stock_threshold || 0,
      track_stock: data.track_stock,
    }),
    transformToForm: (product) => ({
      code: product.code,
      name_th: product.name_i18n.th,
      name_en: product.name_i18n.en,
      description_th: product.description_i18n?.th || "",
      description_en: product.description_i18n?.en || "",
      category_id: product.category_id || "",
      product_type: product.product_type,
      base_unit_id: product.base_unit_id,
      image_url: product.image_url || "",
      is_active: product.is_active,
      has_serial: product.has_serial,
      has_expiry: product.has_expiry,
      min_stock_level: Number(product.min_stock_level) || 0,
      low_stock_threshold: Number(product.low_stock_threshold) || 0,
      track_stock: product.track_stock,
    }),
    onSuccess: refetch,
    confirmDelete: confirm,
  });

  return {
    t,
    products,
    units,
    unitsLoading,
    categories,
    categoriesLoading,
    loading,
    searchQuery: filterOptions.search || "",
    setSearchQuery: handleSearchChange,
    dialogOpen,
    editingProduct,
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
