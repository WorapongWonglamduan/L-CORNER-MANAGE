import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";

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
  base_unit?: {
    id: string;
    abbreviation_i18n: {
      th: string;
      en: string;
    };
  };
  min_stock_level: number;
  is_active: boolean;
  image_url: string | null;
  product_units?: Array<{
    selling_price: number | null;
    is_selling_unit: boolean;
  }>;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          pageSize: "100",
          isActive: "true",
        });
        
        if (selectedCategory) {
          params.append("categoryId", selectedCategory);
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
    };

    fetchProducts();
  }, [selectedCategory, searchQuery]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(
          "/api/raw-material-categories?pageSize=100&isActive=true&type=product"
        );
        const data = await response.json();
        setCategories(data.items || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  const addToCart = useCallback((productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const sellingUnit = product.product_units?.find((u) => u.is_selling_unit);
    const price = sellingUnit?.selling_price || 0;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === productId);
      if (existing) {
        return prev.map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
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
  }, [products]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== productId));
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.id === productId ? { ...item, quantity } : item
        )
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
    [cart]
  );

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return {
    t,
    products,
    categories,
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
  };
}
