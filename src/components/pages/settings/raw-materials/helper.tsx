import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityForm } from "@/hooks/useEntityForm";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";
import { useEffect, useState } from "react";

export interface RawMaterialFormData {
  code: string;
  name_th: string;
  name_en: string;
  description_th?: string;
  description_en?: string;
  category_id?: string;
  unit_id: string;
  cost_price?: number;
  min_stock?: number;
  current_stock?: number;
  is_active: boolean;
}

interface RawMaterial {
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
  unit_id: string;
  unit?: {
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
  cost_price: number | null;
  min_stock: number;
  current_stock: number;
  is_active: boolean;
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
  code: string;
  name_i18n: {
    th: string;
    en: string;
  };
}

interface RawMaterialsFilterOptions extends FilterOptions {
  search?: string;
  isActive?: boolean;
  category?: string;
}

export function useRawMaterialsManager() {
  const t = useTranslations("settings.rawMaterials");
  const { confirm, ConfirmDialog } = useConfirm();
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const {
    items: rawMaterials,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    handleSearchChange,
    refetch,
  } = useEntityList<RawMaterial, RawMaterialsFilterOptions>({
    endpoint: "/api/raw-materials",
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
        const response = await fetch("/api/raw-material-categories?pageSize=100&isActive=true");
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
    editingEntity: editingRawMaterial,
    dialogOpen,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDialogClose,
    handleFormSubmit,
  } = useEntityForm<RawMaterialFormData, RawMaterial>({
    formConfig: {
      defaultValues: {
        code: "",
        name_th: "",
        name_en: "",
        description_th: "",
        description_en: "",
        category_id: "",
        unit_id: "",
        cost_price: 0,
        min_stock: 0,
        current_stock: 0,
        is_active: true,
      },
    },
    endpoint: "/api/raw-materials",
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
      unit_id: data.unit_id,
      cost_price: data.cost_price || null,
      min_stock: data.min_stock || 0,
      current_stock: data.current_stock || 0,
      is_active: data.is_active,
    }),
    transformToForm: (rawMaterial) => ({
      code: rawMaterial.code,
      name_th: rawMaterial.name_i18n.th,
      name_en: rawMaterial.name_i18n.en,
      description_th: rawMaterial.description_i18n?.th || "",
      description_en: rawMaterial.description_i18n?.en || "",
      category_id: rawMaterial.category_id || "",
      unit_id: rawMaterial.unit_id,
      cost_price: rawMaterial.cost_price || 0,
      min_stock: Number(rawMaterial.min_stock) || 0,
      current_stock: Number(rawMaterial.current_stock) || 0,
      is_active: rawMaterial.is_active,
    }),
    onSuccess: refetch,
    confirmDelete: confirm,
  });

  return {
    t,
    rawMaterials,
    units,
    unitsLoading,
    categories,
    categoriesLoading,
    loading,
    searchQuery: filterOptions.search || "",
    setSearchQuery: handleSearchChange,
    dialogOpen,
    editingRawMaterial,
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
