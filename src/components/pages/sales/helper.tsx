import { useState, useCallback, useEffect } from "react";
import { useLocale } from "next-intl";

interface Sale {
  id: string;
  sale_number: string;
  sale_date: string;
  customer_id: string | null;
  warehouse_id: string;
  subtotal: string;
  discount_amount: string;
  tax_rate: string;
  tax_amount: string;
  total_amount: string;
  payment_method: string | null;
  payment_status: string;
  status: string;
  created_by: string | null;
  note: string | null;
  created_at: string;
  warehouse: {
    id: string;
    name_i18n: {
      th: string;
      en: string;
    };
  };
  created_by_user: {
    id: string;
    full_name: string;
  } | null;
  items: SaleItem[];
}

interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  recipe_id: string | null;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  discount_amount: string;
  total_amount: string;
  cost_price: string | null;
  base_quantity: string | null;
  note: string | null;
  created_at: string;
  product: {
    id: string;
    name_i18n: {
      th: string;
      en: string;
    };
    code: string;
    product_type: {
      id: string;
      name_i18n: {
        th: string;
        en: string;
      };
      type: string;
    };
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
  };
}

export function useSalesManager() {
  const locale = useLocale();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch sales
  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (searchQuery) {
        params.append("searchQuery", searchQuery);
      }

      if (startDate) {
        params.append("startDate", startDate);
      }

      if (endDate) {
        params.append("endDate", endDate);
      }

      const response = await fetch(`/api/sales?${params}`);
      const data = await response.json();
      
      setSales(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
    } catch (error) {
      console.error("Error fetching sales:", error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, startDate, endDate]);

  // Fetch sales on mount and when filters change
  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, startDate, endDate]);

  return {
    sales,
    loading,
    searchQuery,
    setSearchQuery,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    page,
    pageSize,
    totalPages,
    totalItems,
    setPage,
    setPageSize,
    locale,
    refetch: fetchSales,
  };
}
