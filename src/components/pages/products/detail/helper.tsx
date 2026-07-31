"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useConfirm } from "@/hooks/useConfirm";
import { toast } from "@/lib/toast";
import type { I18nText, Locale } from "@/types/i18n";

interface RecipeIngredientDetail {
  id: string;
  quantity: number;
  ingredient: {
    id: string;
    code: string;
    name_i18n: I18nText;
  };
  unit: {
    id: string;
    abbreviation_i18n: I18nText;
  };
}

interface RecipeDetail {
  id: string;
  name_i18n: I18nText;
  is_default: boolean;
  ingredients: RecipeIngredientDetail[];
}

export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductDetail {
  id: string;
  code: string;
  name_i18n: I18nText;
  description_i18n?: I18nText | null;
  category?: { id: string; name_i18n: I18nText } | null;
  product_type: { id: string; name_i18n: I18nText; type: string };
  base_unit: { id: string; name_i18n: I18nText; abbreviation_i18n: I18nText };
  selling_price: number | null;
  cost_price: number | null;
  current_stock: number;
  min_stock_level: number;
  low_stock_threshold: number;
  track_stock: boolean;
  has_serial: boolean;
  has_expiry: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  recipes?: RecipeDetail[];
  images: ProductImage[];
  // False when the product still has sale history, is used in a recipe/
  // topping, or has a stock transfer against it — hard-deleting it would
  // either destroy that history or just fail; the UI should offer
  // deactivating instead of a delete button in that case.
  can_delete: boolean;
}

export function useProductDetail() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as Locale;
  const productId = params.id as string;
  const t = useTranslations("settings.products");
  const tCommon = useTranslations("common");
  const { confirm, ConfirmDialog } = useConfirm();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch product");
      }
      const data = await response.json();
      setProduct(data);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error(t("detail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [productId, t]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleBack = () => {
    router.push(`/${locale}/products/list`);
  };

  const handleEdit = () => {
    router.push(`/${locale}/products/edit/${productId}`);
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "ยืนยันการลบ",
      description: t("confirmDelete"),
      confirmText: t("delete"),
      cancelText: t("cancel"),
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/products/${productId}?hard=false`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete product");
      }
      toast.success(t("detail.deleteSuccess"));
      router.push(`/${locale}/products/list`);
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error(t("detail.deleteError"));
    }
  };

  // Same PUT-with-all-fields pattern as the list page's toggle — this is a
  // real update, not a partial patch endpoint, so every field the API
  // expects has to come along even though only is_active is changing.
  const handleToggleActive = async () => {
    if (!product) return;
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: product.code,
          name_i18n: product.name_i18n,
          description_i18n: product.description_i18n,
          category_id: product.category?.id ?? null,
          product_type_id: product.product_type.id,
          base_unit_id: product.base_unit.id,
          is_active: !product.is_active,
          has_serial: product.has_serial,
          has_expiry: product.has_expiry,
          track_stock: product.track_stock,
          selling_price: product.selling_price,
          cost_price: product.cost_price,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to update product");
      }
      toast.success(product.is_active ? t("deactivateSuccess") : t("activateSuccess"));
      await fetchProduct();
    } catch (error) {
      console.error("Error toggling product active state:", error);
      toast.error(error instanceof Error ? error.message : tCommon("updateError"));
    }
  };

  return {
    t,
    locale,
    product,
    loading,
    actions: { handleBack, handleEdit, handleDelete, handleToggleActive },
    modal: { ConfirmDialog },
  };
}
