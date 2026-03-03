"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";

interface RecipeIngredient {
  raw_material_id: string;
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
  product_type: string;
  base_unit_id: string;
  selling_price: number;
  cost_price?: number;
  min_stock_level?: number;
  low_stock_threshold?: number;
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

interface RecipeIngredientData {
  raw_material_id: string;
  quantity: number;
  unit_id: string;
}

interface ProductData {
  id?: string;
  code: string;
  name_i18n: { th: string; en: string };
  description_i18n?: { th: string; en: string };
  category_id?: string;
  product_type: string;
  base_unit_id: string;
  image_url?: string;
  track_stock: boolean;
  has_serial: boolean;
  has_expiry: boolean;
  is_active: boolean;
  min_stock_level?: number;
  low_stock_threshold?: number;
  product_units?: Array<{
    selling_price?: number;
    cost_price?: number;
  }>;
  recipe?: {
    id?: string;
    recipe_ingredients?: RecipeIngredientData[];
  };
}

interface UseProductFormProps {
  product?: ProductData;
  isEdit?: boolean;
}

export function useProductForm({ product, isEdit = false }: UseProductFormProps = {}) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [optionsData, setOptionsData] = useState<{
    categories: Category[];
    units: Unit[];
    rawMaterials: RawMaterial[];
  }>({
    categories: [],
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
          product_type: product.product_type,
          base_unit_id: product.base_unit_id,
          selling_price: product.product_units?.[0]?.selling_price || 0,
          cost_price: product.product_units?.[0]?.cost_price || 0,
          min_stock_level: product.min_stock_level || 0,
          low_stock_threshold: product.low_stock_threshold || 0,
          image_url: product.image_url || "",
          track_stock: product.track_stock,
          has_serial: product.has_serial,
          has_expiry: product.has_expiry,
          is_active: product.is_active,
          recipe_ingredients:
            product.recipe?.recipe_ingredients?.map((ri) => ({
              raw_material_id: ri.raw_material_id,
              quantity: ri.quantity,
              unit_id: ri.unit_id,
            })) || [],
        }
      : {
          product_type: "semi_finished",
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

  const productType = watch("product_type");
  const showRecipe = productType === "semi_finished";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, unitsRes, rawMaterialsRes] = await Promise.all([
          fetch("/api/raw-material-categories?pageSize=100&isActive=true&type=product"),
          fetch("/api/units?pageSize=100&isActive=true"),
          fetch("/api/raw-materials?pageSize=100&isActive=true"),
        ]);

        const categoriesData = await categoriesRes.json();
        const unitsData = await unitsRes.json();
        const rawMaterialsData = await rawMaterialsRes.json();

        setOptionsData({
          categories: categoriesData.items || [],
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
        product_type: data.product_type,
        base_unit_id: data.base_unit_id,
        image_url: data.image_url || null,
        is_active: data.is_active,
        has_serial: data.has_serial,
        has_expiry: data.has_expiry,
        min_stock_level: data.min_stock_level || 0,
        low_stock_threshold: data.low_stock_threshold || 0,
        track_stock: data.track_stock,
      };

      let productId = product?.id;

      if (isEdit && productId) {
        const response = await fetch(`/api/products/${productId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to update product");
      } else {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to create product");
        const newProduct = await response.json();
        productId = newProduct.id;
      }

      if (data.selling_price && productId) {
        await fetch("/api/product-units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            unit_id: data.base_unit_id,
            is_base_unit: true,
            is_selling_unit: true,
            selling_price: data.selling_price,
            cost_price: data.cost_price || null,
            conversion_to_base: 1,
          }),
        });
      }

      if (showRecipe && data.recipe_ingredients.length > 0 && productId) {
        if (isEdit && product?.recipe?.id) {
          await fetch(`/api/recipes/${product.recipe.id}`, {
            method: "DELETE",
          });
        }

        const recipeResponse = await fetch("/api/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            name_i18n: {
              th: `สูตร${data.name_th}`,
              en: `Recipe for ${data.name_en}`,
            },
            yield_quantity: 1,
            yield_unit_id: data.base_unit_id,
            is_active: true,
          }),
        });

        if (recipeResponse.ok) {
          const recipe = await recipeResponse.json();

          for (const ingredient of data.recipe_ingredients) {
            if (ingredient.raw_material_id && ingredient.quantity > 0) {
              await fetch("/api/recipe-ingredients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  recipe_id: recipe.id,
                  raw_material_id: ingredient.raw_material_id,
                  quantity: ingredient.quantity,
                  unit_id: ingredient.unit_id,
                }),
              });
            }
          }
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
