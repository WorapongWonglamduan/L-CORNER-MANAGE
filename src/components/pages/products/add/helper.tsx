"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";

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
  image_url?: string;
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
  base_unit_id: string;
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
  image_url?: string;
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

interface UseProductFormProps {
  product?: ProductData;
  isEdit?: boolean;
}

export function useProductForm({
  product,
  isEdit = false,
}: UseProductFormProps = {}) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
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
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: product
      ? {
          code: product.code,
          name_th: product.name_i18n.th,
          name_en: product.name_i18n.en,
          description_th: product.description_i18n?.th || "",
          description_en: product.description_i18n?.en || "",
          category_id: product.category_id || "",
          product_type_id: product.product_type_id,
          base_unit_id: product.base_unit_id,
          selling_price: product.selling_price || 0,
          cost_price: product.cost_price || 0,
          min_stock_level: product.min_stock_level || 0,
          low_stock_threshold: product.low_stock_threshold || 0,
          current_stock: product.current_stock || 0,
          image_url: product.image_url || "",
          track_stock: product.track_stock,
          has_serial: product.has_serial,
          has_expiry: product.has_expiry,
          is_active: product.is_active,
          recipe_ingredients:
            product.recipes?.[0]?.ingredients?.map((ri) => ({
              ingredient_id: ri.ingredient_id,
              quantity: ri.quantity,
              unit_id: ri.unit_id,
            })) || [],
        }
      : {
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
  console.log("productTypeId ->", productTypeId);
  const showRecipe =
    productTypeId ===
    optionsData.productTypes.find((pt) => pt.type === "semi_finished")?.id;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, productType, unitsRes, rawMaterialsRes] =
          await Promise.all([
            fetch("/api/categories?pageSize=100&isActive=true"),
            fetch("/api/product-types?pageSize=100&isActive=true"),
            fetch("/api/units?pageSize=100&isActive=true"),
            fetch("/api/raw-materials?pageSize=100&isActive=true"),
          ]);

        const categoriesData = await categoriesRes.json();
        const productTypeData = await productType.json();
        const unitsData = await unitsRes.json();
        const rawMaterialsData = await rawMaterialsRes.json();

        setOptionsData({
          categories: categoriesData.items || [],
          productTypes: productTypeData.items || [],
          units: unitsData.items || [],
          rawMaterials: rawMaterialsData.items || [],
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

  const onSubmit = async (data: ProductFormData) => {
    try {
      setLoading(true);

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
        image_url: data.image_url || null,
        is_active: data.is_active,
        has_serial: data.has_serial,
        has_expiry: data.has_expiry,
        min_stock_level: data.min_stock_level || 0,
        low_stock_threshold: data.low_stock_threshold || 0,
        current_stock: data.current_stock || 0,
        track_stock: data.track_stock,
        selling_price: data.selling_price || null,
        cost_price: data.cost_price || null,
        
        // Include recipes if semi-finished product
        recipes: showRecipe && data.recipe_ingredients.length > 0 ? [
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
        ] : undefined,
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

      alert(isEdit ? "แก้ไขสินค้าสำเร็จ!" : "เพิ่มสินค้าสำเร็จ!");
      router.push(`/${locale}/pos`);
    } catch (error) {
      console.error("Error saving product:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกสินค้า");
    } finally {
      setLoading(false);
    }
  };

  return {
    register,
    handleSubmit,
    control,
    watch,
    errors,
    loading,
    dataLoading,
    optionsData,
    fields,
    append,
    remove,
    showRecipe,
    onSubmit,
  };
}
