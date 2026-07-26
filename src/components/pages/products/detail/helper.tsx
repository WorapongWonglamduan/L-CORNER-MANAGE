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
}

export function useProductDetail() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as Locale;
  const productId = params.id as string;
  const t = useTranslations("settings.products");
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
      const response = await fetch(`/api/products/${productId}?hard=true`, {
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

  return {
    t,
    locale,
    product,
    loading,
    actions: { handleBack, handleEdit, handleDelete },
    modal: { ConfirmDialog },
  };
}
