import { useState, useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { PRODUCTS_TYPES } from "@/constants/input-types";
import { toast } from "@/lib/toast";
import type { Locale } from "@/types/i18n";
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
  primary_image_url: string | null;
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

export interface Warehouse {
  id: string;
  code: string;
  name_i18n: {
    th: string;
    en: string;
  };
  is_default: boolean;
}

export interface SelectedTopping {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  lineId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  toppings: SelectedTopping[];
}

function makeLineId(productId: string, toppingIds: string[]) {
  return `${productId}::${[...toppingIds].sort().join(",")}`;
}

export function usePOSManager() {
  const t = useTranslations("pos");
  const locale = useLocale() as Locale;
  const { data: session } = useSession();
  const sessionWarehouseIds = session?.user?.warehouse_ids;
  const assignedWarehouseIds = useMemo(
    () => sessionWarehouseIds ?? [],
    [sessionWarehouseIds],
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [optionsData, setOptionsData] = useState<{
    productTypes: ProductType[];
    categories: Category[];
  }>({
    productTypes: [],
    categories: [],
  });
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const { control, watch, setValue, formState: { errors } } = useForm<{
    searchQuery: string;
    warehouseId: string;
  }>({
    defaultValues: { searchQuery: "", warehouseId: "" },
  });
  const searchQuery = watch("searchQuery");
  const setSearchQuery = useCallback(
    (value: string) => setValue("searchQuery", value),
    [setValue],
  );
  const warehouseId = watch("warehouseId") || null;
  const setWarehouseId = useCallback(
    (value: string | null) => setValue("warehouseId", value ?? ""),
    [setValue],
  );

  // Fetch products function
  const fetchProducts = useCallback(async () => {
    if (!warehouseId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        isActive: "true",
        type: `${PRODUCTS_TYPES.SEMI_FINISHED},${PRODUCTS_TYPES.FINISHED_GOOD}`,
        warehouseId,
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
      setTotalItems(data.total || 0);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, currentPage, pageSize, warehouseId]);

  // Fetch products on mount and when filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch product types, categories, and warehouses
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [productTypesRes, categoriesRes, warehousesRes] =
          await Promise.all([
            fetch(
              `/api/product-types?pageSize=100&isActive=true&type=${PRODUCTS_TYPES.FINISHED_GOOD},${PRODUCTS_TYPES.SEMI_FINISHED}`,
            ),
            fetch("/api/categories?pageSize=100&isActive=true"),
            fetch("/api/warehouses?pageSize=100&isActive=true").catch(() => null),
          ]);

        const newOptionsData = { productTypes: [], categories: [] } as {
          productTypes: ProductType[];
          categories: Category[];
        };

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

        setOptionsData(newOptionsData);

        // Parse warehouses — scoped to only the branches this user is assigned to.
        if (warehousesRes && warehousesRes.ok) {
          const warehousesData = await warehousesRes.json();
          const allItems: Warehouse[] = warehousesData.items || [];
          const items = allItems.filter((w) =>
            assignedWarehouseIds.includes(w.id),
          );
          setWarehouses(items);
          if (items.length > 0) {
            const defaultWarehouse = items.find((w) => w.is_default);
            const sortedByCode = [...items].sort((a, b) =>
              a.code.localeCompare(b.code),
            );
            setWarehouseId((defaultWarehouse ?? sortedByCode[0]).id);
          }
        } else {
          console.warn(
            "Warehouse API not available. Please create a warehouse first.",
          );
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    fetchInitialData();
  }, [setWarehouseId, assignedWarehouseIds]);

  // Adds one unit of a product with no toppings selected (the "base" cart
  // line). Used by the plain +/- controls on the product grid.
  const addToCart = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      const price = product.selling_price || 0;
      const lineId = makeLineId(productId, []);

      setCart((prev) => {
        const existing = prev.find((item) => item.lineId === lineId);
        if (existing) {
          return prev.map((item) =>
            item.lineId === lineId
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          );
        }
        return [
          ...prev,
          {
            lineId,
            productId,
            name: product.name_i18n.th,
            price: Number(price),
            quantity: 1,
            image: product.primary_image_url || undefined,
            toppings: [],
          },
        ];
      });
    },
    [products],
  );

  // Adds one unit of a product with a specific topping selection as its own
  // cart line (merged into a matching line if the same toppings were already
  // picked for this product). Used by the topping customization modal.
  const addToppedItemToCart = useCallback(
    (productId: string, toppings: SelectedTopping[]) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      const price = product.selling_price || 0;
      const lineId = makeLineId(
        productId,
        toppings.map((t) => t.id),
      );

      setCart((prev) => {
        const existing = prev.find((item) => item.lineId === lineId);
        if (existing) {
          return prev.map((item) =>
            item.lineId === lineId
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          );
        }
        return [
          ...prev,
          {
            lineId,
            productId,
            name: product.name_i18n.th,
            price: Number(price),
            quantity: 1,
            image: product.primary_image_url || undefined,
            toppings,
          },
        ];
      });
    },
    [products],
  );

  // Adjusts the quantity of a product's base (no-topping) line. This is what
  // the product grid's +/- buttons call; customized variants are managed
  // from the cart panel via updateLineQuantity/removeLineFromCart instead.
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const lineId = makeLineId(productId, []);
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.lineId !== lineId));
    } else {
      setCart((prev) => {
        const existing = prev.find((item) => item.lineId === lineId);
        if (existing) {
          return prev.map((item) =>
            item.lineId === lineId ? { ...item, quantity } : item,
          );
        }
        // No base line yet (e.g. the product was only added with toppings
        // so far) — create one so the grid's + control has something to act on.
        const product = products.find((p) => p.id === productId);
        if (!product) return prev;
        return [
          ...prev,
          {
            lineId,
            productId,
            name: product.name_i18n.th,
            price: Number(product.selling_price) || 0,
            quantity,
            image: product.primary_image_url || undefined,
            toppings: [],
          },
        ];
      });
    }
  }, [products]);

  // Adjusts (or removes, at 0) any specific cart line by its lineId —
  // used by the cart panel, which can target customized variants directly.
  const updateLineQuantity = useCallback((lineId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.lineId !== lineId));
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.lineId === lineId ? { ...item, quantity } : item,
        ),
      );
    }
  }, []);

  const removeFromCart = useCallback((lineId: string) => {
    setCart((prev) => prev.filter((item) => item.lineId !== lineId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Quantity of a product's base (no-topping) line — feeds the product
  // grid's +/- display, matching what those controls actually adjust.
  const getCartItemQuantity = useCallback(
    (productId: string) => {
      const lineId = makeLineId(productId, []);
      const item = cart.find((item) => item.lineId === lineId);
      return item?.quantity || 0;
    },
    [cart],
  );

  const lineTotal = useCallback((item: CartItem) => {
    const toppingsPricePerUnit = item.toppings.reduce(
      (sum, t) => sum + t.price,
      0,
    );
    return (item.price + toppingsPricePerUnit) * item.quantity;
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + lineTotal(item), 0);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const checkout = useCallback(
    async (paymentMethod: string, promotionCode?: string) => {
      try {
        if (!warehouseId) {
          throw new Error("ไม่พบข้อมูลคลังสินค้า กรุณาติดต่อผู้ดูแลระบบ");
        }

        const items = cart.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.price,
          toppings: item.toppings.map((topping) => ({
            topping_id: topping.id,
            quantity: 1,
          })),
        }));

        const response = await fetch("/api/sales", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            warehouse_id: warehouseId,
            items,
            payment_method: paymentMethod,
            discount_amount: 0,
            tax_rate: 0,
            promotion_code: promotionCode || undefined,
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
    [cart, warehouseId, cartItemCount, t, clearCart, fetchProducts],
  );

  return {
    t,
    locale,
    filterForm: { control, errors },
    catalog: {
      products,
      categories: optionsData.productTypes,
      loading,
      selectedCategory,
      setSelectedCategory,
      searchQuery,
      setSearchQuery,
    },
    warehouse: {
      warehouses,
      warehouseId,
      setWarehouseId,
    },
    cart: {
      items: cart,
      addToCart,
      addToppedItemToCart,
      updateQuantity,
      updateLineQuantity,
      removeFromCart,
      clearCart,
      getCartItemQuantity,
      lineTotal,
      total: cartTotal,
      itemCount: cartItemCount,
    },
    checkout,
    pagination: {
      currentPage,
      setCurrentPage,
      totalItems,
      pageSize,
      setPageSize,
    },
  };
}
