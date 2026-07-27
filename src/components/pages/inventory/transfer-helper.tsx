import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import type { Warehouse } from "./helper";

export interface TransferFormData {
  product_id: string;
  to_warehouse_id: string;
  quantity: string;
  note: string;
}

interface TransferProduct {
  id: string;
  code: string;
  name_i18n: { th: string; en: string };
  available_quantity: number;
  base_unit?: {
    abbreviation_i18n: { th: string; en: string };
  };
}

interface UseStockTransferProps {
  isOpen: boolean;
  fromWarehouseId: string;
  warehouses: Warehouse[];
  onSuccess?: () => void;
  onClose: () => void;
}

export function useStockTransfer({
  isOpen,
  fromWarehouseId,
  warehouses,
  onSuccess,
  onClose,
}: UseStockTransferProps) {
  const t = useTranslations("inventory.transfer");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<TransferProduct[]>([]);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransferFormData>({
    defaultValues: {
      product_id: "",
      to_warehouse_id: "",
      quantity: "",
      note: "",
    },
  });

  const productId = watch("product_id");
  const selectedProduct = products.find((p) => p.id === productId);

  // Fetch products stocked at the source warehouse whenever the modal opens
  useEffect(() => {
    if (!isOpen || !fromWarehouseId) return;
    const fetchProducts = async () => {
      try {
        const response = await fetch(
          `/api/products?pageSize=500&isActive=true&warehouseId=${fromWarehouseId}`,
        );
        const data = await response.json();
        setProducts(data.items || []);
      } catch (error) {
        console.error("Error fetching products for transfer:", error);
      }
    };
    fetchProducts();
  }, [isOpen, fromWarehouseId]);

  useEffect(() => {
    if (isOpen) {
      reset({ product_id: "", to_warehouse_id: "", quantity: "", note: "" });
    }
  }, [isOpen, reset]);

  const destinationWarehouses = warehouses.filter((w) => w.id !== fromWarehouseId);

  const onSubmit = useCallback(
    async (data: TransferFormData) => {
      const qty = parseFloat(data.quantity);

      if (!data.product_id) {
        toast.error(t("errorRequireProduct"));
        return;
      }
      if (!qty || qty <= 0) {
        toast.error(t("errorRequireQuantity"));
        return;
      }

      setLoading(true);
      try {
        const response = await fetch("/api/inventory/transfers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_warehouse_id: fromWarehouseId,
            to_warehouse_id: data.to_warehouse_id,
            product_id: data.product_id,
            quantity: qty,
            note: data.note,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || t("errorTransfer"));
        }

        toast.success(t("successTransfer"));
        onSuccess?.();
        onClose();
      } catch (error) {
        console.error("Error transferring stock:", error);
        toast.error(error instanceof Error ? error.message : t("errorTransfer"));
      } finally {
        setLoading(false);
      }
    },
    [fromWarehouseId, t, onSuccess, onClose],
  );

  return {
    t,
    loading,
    products,
    selectedProduct,
    destinationWarehouses,
    control,
    handleSubmit,
    errors,
    onSubmit,
  };
}
