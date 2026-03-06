import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { toast } from "@/lib/toast";
interface Product {
  id: string;
  code: string;
  name_i18n: {
    th: string;
    en: string;
  };
  category_id: string | null;
  category?: {
    id: string;
    name_i18n: {
      th: string;
      en: string;
    };
  } | null;
  product_type?: {
    id: string;
    name_i18n: {
      th: string;
      en: string;
    };
    type: string;
  };
  base_unit?: {
    id: string;
    abbreviation_i18n: {
      th: string;
      en: string;
    };
  };
  min_stock_level: number;
  current_stock: number;
  selling_price: number | null;
  cost_price: number | null;
  available_quantity: number; // คำนวณจาก server-side
  is_active: boolean;
  image_url: string | null;
}

interface ProductType {
  id: string;
  name_i18n: {
    th: string;
    en: string;
  };
  type: string;
}
interface Category {
  id: string;
  name_i18n: {
    th: string;
    en: string;
  };
  code: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export function usePOSManager() {
  const t = useTranslations("pos");
  const locale = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [optionsData, setOptionsData] = useState<{
    productTypes: ProductType[];
    categories: Category[];
    warehouseId: string | null;
  }>({
    productTypes: [],
    categories: [],
    warehouseId: null,
  });

  // Fetch products function
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        pageSize: "100",
        isActive: "true",
        type: `${PRODUCTS_TYPES.SEMI_FINISHED},${PRODUCTS_TYPES.FINISHED_GOOD}`,
      });

      if (selectedCategory) {
        params.append("productType", selectedCategory);
      }

      if (searchQuery) {
        params.append("search", searchQuery);
      }
      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();
      setProducts(data.items || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  // Fetch products on mount and when filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch product types, categories, and warehouse
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [productTypesRes, categoriesRes, warehouseRes] =
          await Promise.all([
            fetch(
              `/api/product-types?pageSize=100&isActive=true&type=${PRODUCTS_TYPES.FINISHED_GOOD},${PRODUCTS_TYPES.SEMI_FINISHED}`,
            ),
            fetch("/api/categories?pageSize=100&isActive=true"),
            fetch("/api/warehouses?pageSize=1").catch(() => null),
          ]);

        const newOptionsData = { ...optionsData };

        // Parse product types
        if (productTypesRes.ok) {
          const productTypesData = await productTypesRes.json();
          newOptionsData.productTypes = productTypesData.items || [];
        }

        // Parse categories
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          newOptionsData.categories = categoriesData.items || [];
        }

        // Parse warehouse (optional)
        if (warehouseRes && warehouseRes.ok) {
          const warehouseData = await warehouseRes.json();
          if (warehouseData.items && warehouseData.items.length > 0) {
            newOptionsData.warehouseId = warehouseData.items[0].id;
          }
        } else {
          console.warn(
            "Warehouse API not available. Please create a warehouse first.",
          );
        }

        setOptionsData(newOptionsData);
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToCart = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      const price = product.selling_price || 0;

      setCart((prev) => {
        const existing = prev.find((item) => item.id === productId);
        if (existing) {
          return prev.map((item) =>
            item.id === productId
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          );
        }
        return [
          ...prev,
          {
            id: productId,
            name: product.name_i18n.th,
            price: Number(price),
            quantity: 1,
            image: product.image_url || undefined,
          },
        ];
      });
    },
    [products],
  );

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== productId));
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.id === productId ? { ...item, quantity } : item,
        ),
      );
    }
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const getCartItemQuantity = useCallback(
    (productId: string) => {
      const item = cart.find((item) => item.id === productId);
      return item?.quantity || 0;
    },
    [cart],
  );

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const checkout = useCallback(
    async (paymentMethod: string) => {
      try {
        if (!optionsData.warehouseId) {
          throw new Error("ไม่พบข้อมูลคลังสินค้า กรุณาติดต่อผู้ดูแลระบบ");
        }

        const items = cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
        }));

        const response = await fetch("/api/sales", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            warehouse_id: optionsData.warehouseId,
            items,
            payment_method: paymentMethod,
            discount_amount: 0,
            tax_rate: 0,
            note: "",
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create sale");
        }

        const result = await response.json();
        toast.success(
          t("paymentSuccess", {
            count: cartItemCount,
            saleNumber: result.sale_number || "N/A",
          }),
        );
        clearCart();
        
        // Refetch products to update stock
        await fetchProducts();
        
        return result;
      } catch (error) {
        console.error("Checkout error:", error);
        throw error;
      }
    },
    [cart, optionsData.warehouseId, cartItemCount, t, clearCart, fetchProducts],
  );

  return {
    t,
    products,
    categories: optionsData.productTypes,
    loading,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartItemQuantity,
    cartTotal,
    cartItemCount,
    checkout,
    locale,
  };
}
