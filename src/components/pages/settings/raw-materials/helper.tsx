import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityForm } from "@/hooks/useEntityForm";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";
import { useEffect, useState } from "react";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { ImageFile } from "@/components/ui/multi-image-upload";

export interface RawMaterialFormData {
  code: string;
  name_th: string;
  name_en: string;
  description_th?: string;
  description_en?: string;
  type_id?: string;
  unit_id?: string;
  cost_price?: number;
  min_stock?: number;
  current_stock?: number;
  images?: ImageFile[];
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

interface RawMaterialsFilterOptions extends FilterOptions {
  search?: string;
  isActive?: boolean;
  type_id?: string;
}

export function useRawMaterialsManager() {
  const t = useTranslations("settings.rawMaterials");
  const { confirm, ConfirmDialog } = useConfirm();
  const [optionsData, setOptionsData] = useState<{
    units: Unit[];
    productTypes: ProductType[];
  }>({ units: [], productTypes: [] });
  const [dataLoading, setDataLoading] = useState(true);

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
        type_id:
          optionsData.productTypes.find((type) => type.type === "raw_material")
            ?.id || "",
        unit_id: "",
        cost_price: 0,
        min_stock: 0,
        current_stock: 0,
        is_active: true,
      },
    },
    endpoint: "/api/raw-materials",
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
        min_stock: data.min_stock || 0,
        current_stock: data.current_stock || 0,
        is_active: data.is_active,
        media_data: mediaData,
      };

      return payload;
    },
    transformToForm: (rawMaterial) => {
      // Convert existing images from server to ImageFile format
      const existingImages: ImageFile[] =
        rawMaterial.images?.map((img: any) => ({
          id: img.id,
          preview: img.url, // Use server URL as preview
          isPrimary: img.isPrimary,
          existingUrl: img.url, // Mark as existing image
          mediaId: img.id, // Store media ID
          // file is undefined for existing images
        })) || [];

      return {
        code: rawMaterial.code,
        name_th: rawMaterial.name_i18n.th,
        name_en: rawMaterial.name_i18n.en,
        description_th: rawMaterial.description_i18n?.th || "",
        description_en: rawMaterial.description_i18n?.en || "",
        type_id: rawMaterial.type_id || "",
        unit_id: rawMaterial.unit_id,
        cost_price: rawMaterial.cost_price || 0,
        min_stock: Number(rawMaterial.min_stock) || 0,
        current_stock: Number(rawMaterial.current_stock) || 0,
        is_active: rawMaterial.is_active,
        images: existingImages,
      };
    },
    onSuccess: refetch,
    confirmDelete: confirm,
  });

  return {
    t,
    rawMaterials,
    units: optionsData.units,
    productTypes: optionsData.productTypes,
    dataLoading,
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
    formWatch: watch,
    formErrors: errors,
    formLoading,
    formError,
    ConfirmDialog,
  };
}
