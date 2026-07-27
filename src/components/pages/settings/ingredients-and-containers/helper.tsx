import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityForm } from "@/hooks/useEntityForm";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";
import { useEffect, useState } from "react";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { ImageFile } from "@/components/ui/multi-image-upload";
import type { FilterValues } from "@/components/ui/dynamic-filter-bar";

export interface IngredientContainerFormData {
  code: string;
  name_th: string;
  name_en: string;
  description_th?: string;
  description_en?: string;
  type_id?: string;
  unit_id?: string;
  cost_price?: number;
  images?: ImageFile[];
  is_active: boolean;
}

interface IngredientContainer {
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
  type_id: string | null;
  type?: {
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
  primary_image_url?: string | null;
  images?: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
    sortOrder: number;
  }>;
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

interface ProductType {
  id: string;
  code: string;
  name_i18n: {
    th: string;
    en: string;
  };
  type: string;
}

interface IngredientsAndContainersFilterOptions extends FilterOptions {
  search?: string;
  isActive?: boolean;
  type_id?: string;
}

export function useIngredientsAndContainersManager() {
  const t = useTranslations("settings.ingredientsAndContainers");
  const { confirm, ConfirmDialog } = useConfirm();
  const [optionsData, setOptionsData] = useState<{
    units: Unit[];
    productTypes: ProductType[];
  }>({ units: [], productTypes: [] });
  const [dataLoading, setDataLoading] = useState(true);

  const {
    items: ingredientsAndContainers,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    updateFilter,
    refetch,
  } = useEntityList<IngredientContainer, IngredientsAndContainersFilterOptions>({
    endpoint: "/api/ingredients-and-containers",
    initialFilters: {
      search: "",
      isActive: undefined,
    },
  });

  const applyFilters = (values: FilterValues) => {
    updateFilter({
      search: values.search as string,
      isActive: values.isActive === "" ? undefined : values.isActive === "true",
    } as Partial<IngredientsAndContainersFilterOptions>);
  };

  const resetFilters = () => {
    updateFilter({ search: "", isActive: undefined } as Partial<IngredientsAndContainersFilterOptions>);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [unitsRes, productTypesRes] = await Promise.all([
          fetch("/api/units?pageSize=100&isActive=true"),
          fetch(
            `/api/product-types?pageSize=100&isActive=true&type=${PRODUCTS_TYPES.INGREDIENT},${PRODUCTS_TYPES.CONTAINER}`,
          ),
        ]);

        const unitsData = await unitsRes.json();
        const productTypesData = await productTypesRes.json();

        setOptionsData({
          units: unitsData.items || [],
          productTypes: productTypesData.items || [],
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

  const {
    control,
    handleSubmit,
    errors,
    watch,
    loading: formLoading,
    error: formError,
    editingEntity: editingIngredientContainer,
    dialogOpen,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDialogClose,
    handleFormSubmit,
  } = useEntityForm<IngredientContainerFormData, IngredientContainer>({
    formConfig: {
      defaultValues: {
        code: "",
        name_th: "",
        name_en: "",
        description_th: "",
        description_en: "",
        type_id:
          optionsData.productTypes.find((type) => type.type === "raw_material")
            ?.id || "",
        unit_id: "",
        cost_price: 0,
        is_active: true,
      },
    },
    endpoint: "/api/ingredients-and-containers",
    transformToPayload: async (data) => {
      // Separate existing images from new uploads
      const mediaData: Array<{
        id: string;
        isPrimary: boolean;
        sortOrder: number;
      }> = [];

      if (data.images && data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          const imageFile = data.images[i];

          // Check if this is an existing image (has mediaId but no file)
          if (imageFile.existingUrl && imageFile.mediaId && !imageFile.file) {
            // Keep existing image - just add its metadata
            mediaData.push({
              id: imageFile.mediaId,
              isPrimary: imageFile.isPrimary || false,
              sortOrder: i,
            });
          } else if (imageFile.file) {
            // New image - upload it
            const formData = new FormData();
            formData.append("file", imageFile.file);
            formData.append("folder", "products");

            const response = await fetch("/api/media/upload", {
              method: "POST",
              body: formData,
            });

            if (response.ok) {
              const result = await response.json();
              mediaData.push({
                id: result.id,
                isPrimary: imageFile.isPrimary || false,
                sortOrder: i,
              });
            }
          }
        }
      }

      const payload = {
        code: data.code,
        name_i18n: {
          th: data.name_th,
          en: data.name_en,
        },
        description_i18n:
          data.description_th || data.description_en
            ? {
                th: data.description_th || "",
                en: data.description_en || "",
              }
            : null,
        type_id: data.type_id,
        unit_id: data.unit_id,
        cost_price: data.cost_price || null,
        is_active: data.is_active,
        media_data: mediaData,
      };

      return payload;
    },
    transformToForm: (ingredientContainer) => {
      // Convert existing images from server to ImageFile format
      const existingImages: ImageFile[] =
        ingredientContainer.images?.map((img: { id: string; url: string; isPrimary: boolean }) => ({
          id: img.id,
          preview: img.url, // Use server URL as preview
          isPrimary: img.isPrimary,
          existingUrl: img.url, // Mark as existing image
          mediaId: img.id, // Store media ID
          // file is undefined for existing images
        })) || [];

      return {
        code: ingredientContainer.code,
        name_th: ingredientContainer.name_i18n.th,
        name_en: ingredientContainer.name_i18n.en,
        description_th: ingredientContainer.description_i18n?.th || "",
        description_en: ingredientContainer.description_i18n?.en || "",
        type_id: ingredientContainer.type_id || "",
        unit_id: ingredientContainer.unit_id,
        cost_price: ingredientContainer.cost_price || 0,
        is_active: ingredientContainer.is_active,
        images: existingImages,
      };
    },
    onSuccess: refetch,
    confirmDelete: confirm,
  });

  return {
    t,
    table: {
      items: ingredientsAndContainers,
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
      editingItem: editingIngredientContainer,
      onClose: handleDialogClose,
      ConfirmDialog,
    },
    form: {
      control,
      handleSubmit,
      watch,
      errors,
      loading: formLoading,
      error: formError,
      onSubmit: handleFormSubmit,
      dataLoading,
      units: optionsData.units,
      productTypes: optionsData.productTypes,
    },
  };
}
