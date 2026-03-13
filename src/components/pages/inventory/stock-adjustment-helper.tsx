import { useState, useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { ADJUSTMENT_TYPES } from "@/constants/inventory";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import {
  getStockAdjustmentFormConfig,
  StockAdjustmentFormData,
} from "./stock-adjustment-config";

interface Product {
  id: string;
  name: string;
  code: string;
  current_stock: number;
  unit: string;
  product_type: string;
}

interface UseStockAdjustmentProps {
  isOpen: boolean;
  product: Product;
  onSuccess?: () => void;
  onClose: () => void;
}

export const useStockAdjustment = ({
  isOpen,
  product,
  onSuccess,
  onClose,
}: UseStockAdjustmentProps) => {
  const [adjustmentType, setAdjustmentType] = useState<ADJUSTMENT_TYPES>(
    ADJUSTMENT_TYPES.IN,
  );
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  const t = useTranslations("inventory.adjustment");

  const {
    control,
    handleSubmit: handleFormSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<StockAdjustmentFormData>({
    defaultValues: {
      quantity: "",
      reason: "",
      note: "",
    },
  });

  const quantity = watch("quantity");
  const reason = watch("reason");
  const note = watch("note");

  // Fetch recipe for semi_finished products
  useEffect(() => {
    if (isOpen && product.product_type === PRODUCTS_TYPES.SEMI_FINISHED) {
      const fetchRecipe = async () => {
        try {
          setLoadingRecipe(true);
          const response = await fetch(
            `/api/recipes?product_id=${product.id}&include_ingredients=true`,
          );
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            setRecipe(data.items[0]);
          }
        } catch (error) {
          console.error("Error fetching recipe:", error);
        } finally {
          setLoadingRecipe(false);
        }
      };
      fetchRecipe();
    }
  }, [isOpen, product.id, product.product_type]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        quantity: "",
        reason: "",
        note: "",
      });
    }
  }, [isOpen, reset]);

  const getNewStock = useCallback(() => {
    const qty = parseFloat(quantity) || 0;
    if (adjustmentType === ADJUSTMENT_TYPES.IN) {
      return product.current_stock + qty;
    } else if (adjustmentType === ADJUSTMENT_TYPES.OUT) {
      return product.current_stock - qty;
    } else {
      return qty;
    }
  }, [quantity, adjustmentType, product.current_stock]);

  const handleProduction = async () => {
    const qty = parseFloat(quantity) || 0;

    if (!qty || qty <= 0) {
      toast.error("กรุณาระบุจำนวน");
      return;
    }

    if (!reason.trim()) {
      toast.error("กรุณาระบุเหตุผล");
      return;
    }

    const newStock = getNewStock();
    if (newStock < 0) {
      toast.error("สต็อกไม่สามารถติดลบได้");
      return;
    }

    setLoading(true);

    try {
      if (adjustmentType === ADJUSTMENT_TYPES.IN) {
        const response = await fetch("/api/production", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_id: product.id,
            quantity: qty,
            reason,
            note,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.insufficient) {
            const insufficientList = data.insufficient
              .map(
                (ing) =>
                  `${ing.name.th || ing.name.en}: ต้องการ ${ing.required} มีอยู่ ${ing.available}`,
              )
              .join("\n");
            toast.error(`วัตถุดิบไม่เพียงพอ:\n${insufficientList}`);
          } else {
            throw new Error(data.error || "Failed to complete production");
          }
          return;
        }

        toast.success("ผลิตสินค้าสำเร็จ");
      } else {
        const response = await fetch("/api/inventory/adjust", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_id: product.id,
            adjustment_type: adjustmentType,
            quantity: qty,
            reason,
            note,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to adjust stock");
        }

        toast.success("ปรับสต็อกสำเร็จ");
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error:", error);
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: StockAdjustmentFormData) => {
    const qty = parseFloat(data.quantity);

    if (!qty || qty <= 0) {
      toast.error("กรุณาระบุจำนวน");
      return;
    }

    if (!data.reason.trim()) {
      toast.error("กรุณาระบุเหตุผล");
      return;
    }

    const newStock = getNewStock();
    if (newStock < 0) {
      toast.error("สต็อกไม่สามารถติดลบได้");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          adjustment_type: adjustmentType,
          quantity: qty,
          reason: data.reason,
          note: data.note,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to adjust stock");
      }

      toast.success("ปรับสต็อกสำเร็จ");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast.error("เกิดข้อผิดพลาดในการปรับสต็อก");
    } finally {
      setLoading(false);
    }
  };

  const formConfig = getStockAdjustmentFormConfig(t, adjustmentType);

  const calculatedIngredients =
    recipe?.ingredients?.map((ing) => ({
      ...ing,
      required: Number(ing.quantity) * (parseFloat(quantity) || 0),
    })) || [];

  return {
    // State
    adjustmentType,
    loading,
    recipe,
    loadingRecipe,
    quantity,
    reason,
    note,
    
    // Form
    control,
    handleFormSubmit,
    errors,
    formConfig,
    Controller,
    
    // Computed
    newStock: getNewStock(),
    calculatedIngredients,
    
    // Handlers
    setAdjustmentType,
    handleProduction,
    handleSubmit,
    
    // Utils
    t,
  };
};
