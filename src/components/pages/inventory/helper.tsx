import { useState, useCallback, useEffect } from "react";
import { useLocale } from "next-intl";

interface Product {
  id: string;
  code: string;
  name_i18n: {
    th: string;
    en: string;
  };
  current_stock: string;
  min_stock_level: string;
  low_stock_threshold: string;
  track_stock: boolean;
  base_unit: {
    id: string;
    name_i18n: {
      th: string;
      en: string;
    };
    abbreviation_i18n: {
      th: string;
      en: string;
    };
  };
  product_type: {
    id: string;
    type: string;
    name_i18n: {
      th: string;
      en: string;
    };
  };
}

export function useInventoryManager() {
  const locale = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (searchQuery) {
        params.append("searchQuery", searchQuery);
      }

      if (typeFilter) {
        params.append("type", typeFilter);
      }

      if (statusFilter) {
        params.append("stockStatus", statusFilter);
      }

      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();

      setProducts(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, typeFilter, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter, statusFilter]);

  const getStockStatus = (product: Product) => {
    const currentStock = Number(product.current_stock);
    const threshold = Number(product.low_stock_threshold);

    if (currentStock <= 0) {
      return { label: "outOfStock", color: "red", bgColor: "bg-red-50", textColor: "text-red-700", borderColor: "border-red-500" };
    } else if (currentStock <= threshold) {
      return { label: "lowStock", color: "orange", bgColor: "bg-orange-50", textColor: "text-orange-700", borderColor: "border-orange-500" };
    }
    return { label: "normal", color: "green", bgColor: "bg-green-50", textColor: "text-green-700", borderColor: "border-green-500" };
  };

  return {
    products,
    loading,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    page,
    pageSize,
    totalPages,
    totalItems,
    setPage,
    setPageSize,
    locale,
    refetch: fetchProducts,
    getStockStatus,
  };
}
