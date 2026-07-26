"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { toast } from "@/lib/toast";
import { ImageFile } from "@/components/ui/multi-image-upload";

interface RecipeIngredient {
  ingredient_id: string;
  quantity: number;
  unit_id: string;
}

export interface ProductFormData {
  code: string;
  name_th: string;
  name_en: string;
  description_th?: string;
  description_en?: string;
  category_id?: string;
  product_type_id: string;
  base_unit_id: string;
  selling_price: number;
  cost_price?: number;
  min_stock_level?: number;
  low_stock_threshold?: number;
  current_stock?: number;
  images?: ImageFile[];
  track_stock: boolean;
  has_serial: boolean;
  has_expiry: boolean;
  is_active: boolean;
  recipe_ingredients: RecipeIngredient[];
}

interface Category {
  id: string;
  name_i18n: { th: string; en: string };
}

interface Unit {
  id: string;
  name_i18n: { th: string; en: string };
  abbreviation_i18n: { th: string; en: string };
}

interface RawMaterial {
  id: string;
  code: string;
  name_i18n: { th: string; en: string };
  unit_id: string;
}

interface ProductType {
  id: string;
  code: string;
  name_i18n: { th: string; en: string };
  icon?: string;
  type: string;
  sort_order: number;
  is_active: boolean;
}

interface RecipeIngredientData {
  ingredient_id: string;
  quantity: number;
  unit_id: string;
}

interface ProductData {
  id?: string;
  code: string;
  name_i18n: { th: string; en: string };
  description_i18n?: { th: string; en: string };
  category_id?: string;
  product_type_id: string;
  base_unit_id: string;
  images?: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
    sortOrder: number;
  }>;
  track_stock: boolean;
  has_serial: boolean;
  has_expiry: boolean;
  is_active: boolean;
  min_stock_level?: number;
  low_stock_threshold?: number;
  current_stock?: number;
  selling_price?: number;
  cost_price?: number;
  recipes?: Array<{
    id?: string;
    name_i18n: { th: string; en: string };
    ingredients?: RecipeIngredientData[];
  }>;
}

export function useProductForm() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const productId = params.id as string | undefined;
  const isEdit = !!productId;
  const t = useTranslations("settings.products");

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [optionsData, setOptionsData] = useState<{
    categories: Category[];
    productTypes: ProductType[];
    units: Unit[];
    rawMaterials: RawMaterial[];
  }>({
    categories: [],
    productTypes: [],
    units: [],
    rawMaterials: [],
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: {
      product_type_id: "",
      track_stock: true,
      has_serial: false,
      has_expiry: false,
      is_active: true,
      recipe_ingredients: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "recipe_ingredients",
  });

  const productTypeId = watch("product_type_id");

  const isSemiFinished =
    productTypeId ===
    optionsData.productTypes.find((pt) => pt.type === "semi_finished")?.id;

  const isFinishedGood =
    productTypeId ===
    optionsData.productTypes.find((pt) => pt.type === "finished_good")?.id;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const promises = [
          fetch("/api/categories?pageSize=100&isActive=true"),
          fetch(
            `/api/product-types?pageSize=100&isActive=true&type=${PRODUCTS_TYPES.SEMI_FINISHED},${PRODUCTS_TYPES.FINISHED_GOOD}`,
          ),
          fetch("/api/units?pageSize=100&isActive=true"),
          fetch("/api/raw-materials?pageSize=100&isActive=true"),
        ];

        if (isEdit && productId) {
          promises.push(fetch(`/api/products/${productId}`));
        }

        const responses = await Promise.all(promises);
        const [
          categoriesData,
          productTypeData,
          unitsData,
          rawMaterialsData,
          productData,
        ] = await Promise.all(responses.map((r) => r.json()));

        setOptionsData({
          categories: categoriesData.items || [],
          productTypes: productTypeData.items || [],
          units: unitsData.items || [],
          rawMaterials: rawMaterialsData.items || [],
        });

        // Set default product_type_id for new product (create mode)
        if (!isEdit) {
          const semiFinishedType = productTypeData.items?.find(
            (pt: ProductType) => pt.type === PRODUCTS_TYPES.SEMI_FINISHED,
          );
          if (semiFinishedType) {
            setValue("product_type_id", semiFinishedType.id);
          }
        }

        if (isEdit && productData && !productData.error) {
          setProduct(productData);

          // Convert existing images from server to ImageFile format
          const existingImages: ImageFile[] =
            productData.images?.map((img: { id: string; url: string; isPrimary: boolean }) => ({
              id: img.id,
              preview: img.url,
              isPrimary: img.isPrimary,
              existingUrl: img.url,
              mediaId: img.id,
            })) || [];

          reset({
            code: productData.code || "",
            name_th: productData.name_i18n?.th || "",
            name_en: productData.name_i18n?.en || "",
            description_th: productData.description_i18n?.th || "",
            description_en: productData.description_i18n?.en || "",
            category_id: productData.category_id || "",
            product_type_id: productData.product_type_id || "",
            base_unit_id: productData.base_unit_id || "",
            selling_price: productData.selling_price || 0,
            cost_price: productData.cost_price || 0,
            min_stock_level: productData.min_stock_level || 0,
            low_stock_threshold: productData.low_stock_threshold || 0,
            current_stock: productData.current_stock || 0,
            images: existingImages,
            track_stock: productData.track_stock ?? true,
            has_serial: productData.has_serial ?? false,
            has_expiry: productData.has_expiry ?? false,
            is_active: productData.is_active ?? true,
            recipe_ingredients:
              productData.recipes?.[0]?.ingredients?.map(
                (ri: RecipeIngredientData) => ({
                  ingredient_id: ri.ingredient_id,
                  quantity: ri.quantity,
                  unit_id: ri.unit_id,
                }),
              ) || [],
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [isEdit, productId, reset, setValue]);

  const handleProductTypeChange = (newProductTypeId: string) => {
    // Clear recipe ingredients when changing product type
    reset({
      ...watch(),
      code: "",
      name_en: "",
      name_th: "",
      product_type_id: newProductTypeId,
      recipe_ingredients: [],
    });
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      setLoading(true);

      // Validate recipe ingredients for semi-finished products
      if (
        isSemiFinished &&
        (!data.recipe_ingredients || data.recipe_ingredients.length === 0)
      ) {
        toast.error(t("recipeIngredientsRequired"));
        setLoading(false);
        return;
      }

      // Handle image uploads
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
        category_id: data.category_id || null,
        product_type_id: data.product_type_id,
        base_unit_id: data.base_unit_id,
        is_active: data.is_active,
        has_serial: data.has_serial,
        has_expiry: data.has_expiry,
        min_stock_level: data.min_stock_level || 0,
        low_stock_threshold: data.low_stock_threshold || 0,
        current_stock: data.current_stock || 0,
        track_stock: data.track_stock,
        selling_price: data.selling_price || null,
        cost_price: data.cost_price || null,
        media_data: mediaData,

        // Include recipes if semi-finished product
        recipes:
          isSemiFinished && data.recipe_ingredients.length > 0
            ? [
                {
                  name_i18n: {
                    th: `สูตร${data.name_th}`,
                    en: `Recipe for ${data.name_en}`,
                  },
                  is_default: true,
                  serving_qty: 1,
                  serving_unit_id: data.base_unit_id,
                  ingredients: data.recipe_ingredients.map((ing) => ({
                    ingredient_id: ing.ingredient_id,
                    quantity: ing.quantity,
                    unit_id: ing.unit_id,
                  })),
                },
              ]
            : undefined,
      };

      // Single API call with all data
      if (isEdit && product?.id) {
        const response = await fetch(`/api/products/${product.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update product");
        }
      } else {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create product");
        }
      }

      toast.success(isEdit ? t("updateSuccess") : t("createSuccess"));
      router.push(`/${locale}/products/list`);
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error(t("saveError"));
    } finally {
      setLoading(false);
    }
  };

  return {
    form: {
      handleSubmit,
      control,
      watch,
      setValue,
      errors,
      onSubmit,
    },
    loading: {
      loading,
      dataLoading,
    },
    optionsData,
    recipeFields: {
      fields,
      append,
      remove,
    },
    flags: {
      isSemiFinished,
      isFinishedGood,
      isEdit,
    },
    handleProductTypeChange,
  };
}
