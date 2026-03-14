import { useState, useCallback, useEffect, useMemo } from "react";
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

  const handleProduction = useCallback(async () => {
    const qty = parseFloat(quantity) || 0;

    if (!qty || qty <= 0) {
      toast.error(t("errorRequireQuantity"));
      return;
    }

    if (!reason.trim()) {
      toast.error(t("errorRequireReason"));
      return;
    }

    const newStock = getNewStock();
    if (newStock < 0) {
      toast.error(t("errorNegativeStock"));
      return;
    }

    setLoading(true);

    try {
      const formData = watch();
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
            note: formData.note,
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
            toast.error(`${t("errorInsufficientIngredients")}:\n${insufficientList}`);
          } else {
            throw new Error(data.error || "Failed to complete production");
          }
          return;
        }

        toast.success(t("successProduce"));
      } else {
        const formData = watch();
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
            note: formData.note,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to adjust stock");
        }

        toast.success(t("successAdjust"));
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("errorGeneral"));
    } finally {
      setLoading(false);
    }
  }, [quantity, reason, adjustmentType, getNewStock, product.id, watch, t, onSuccess, onClose]);

  const handleSubmit = useCallback(async (data: StockAdjustmentFormData) => {
    const qty = parseFloat(data.quantity);

    if (!qty || qty <= 0) {
      toast.error(t("errorRequireQuantity"));
      return;
    }

    if (!data.reason.trim()) {
      toast.error(t("errorRequireReason"));
      return;
    }

    const newStock = getNewStock();
    if (newStock < 0) {
      toast.error(t("errorNegativeStock"));
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

      toast.success(t("successAdjust"));
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast.error(t("errorAdjustStock"));
    } finally {
      setLoading(false);
    }
  }, [adjustmentType, getNewStock, product.id, t, onSuccess, onClose]);

  const formConfig = useMemo(
    () => getStockAdjustmentFormConfig(t, adjustmentType),
    [t, adjustmentType]
  );

  const calculatedIngredients = useMemo(
    () =>
      recipe?.ingredients?.map((ing) => ({
        ...ing,
        required: Number(ing.quantity) * (parseFloat(quantity) || 0),
      })) || [],
    [recipe?.ingredients, quantity]
  );

  const newStock = useMemo(() => getNewStock(), [getNewStock]);

  return {
    // State
    adjustmentType,
    loading,
    recipe,
    loadingRecipe,
    quantity,
    reason,
    
    // Form
    control,
    handleFormSubmit,
    errors,
    formConfig,
    Controller,
    
    // Computed
    newStock,
    calculatedIngredients,
    
    // Handlers
    setAdjustmentType,
    handleProduction,
    handleSubmit,
    
    // Utils
    t,
  };
};
