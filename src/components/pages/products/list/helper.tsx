import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useConfirm } from "@/hooks/useConfirm";
import { FilterOptions } from "@/hooks/usePagination";
import { useRouter, useParams } from "next/navigation";
import { PRODUCTS_TYPES } from "@/constants/input-types";

interface Product {
  id: string;
  code: string;
  name_i18n: {
    th: string;
    en: string;
  };
  description_i18n?: {
    th: string;
    en: string;
  } | null;
  category_id: string | null;
  category?: {
    id: string;
    name_i18n: {
      th: string;
      en: string;
    };
  } | null;
  product_type_id: string;
  product_type?: {
    id: string;
    name_i18n: {
      th: string;
      en: string;
    };
  };
  base_unit_id: string;
  base_unit?: {
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
  selling_price: number | null;
  cost_price: number | null;
  min_stock_level: number;
  low_stock_threshold: number;
  image_url: string | null;
  track_stock: boolean;
  has_serial: boolean;
  has_expiry: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductsFilterOptions extends FilterOptions {
  search?: string;
  isActive?: boolean;
  category_id?: string;
  product_type_id?: string;
  type?: string;
}

export interface ProductFormData {
  code: string;
  product_type_id: string;
  name_th: string;
  name_en: string;
  category_id: string;
  base_unit_id: string;
  description_th?: string;
  description_en?: string;
  selling_price: number;
  cost_price?: number;
  min_stock_level?: number;
  low_stock_threshold?: number;
  image_url?: string;
  track_stock?: boolean;
  has_serial?: boolean;
  has_expiry?: boolean;
  is_active?: boolean;
}

export function useProductsManager() {
  const t = useTranslations("settings.products");
  const { confirm, ConfirmDialog } = useConfirm();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const {
    items: products,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    handleSearchChange,
    refetch,
  } = useEntityList<Product, ProductsFilterOptions>({
    endpoint: "/api/products",
    initialFilters: {
      search: "",
      type: `${PRODUCTS_TYPES.FINISHED_GOOD},${PRODUCTS_TYPES.SEMI_FINISHED}`,
    },
  });

  const handleCreate = () => {
    router.push(`/${locale}/products/add`);
  };

  const handleEdit = (product: Product) => {
    router.push(`/${locale}/products/edit/${product.id}`);
  };

  const handleDelete = async (id: string, hard: boolean) => {
    const confirmed = await confirm({
      title: "ยืนยันการลบ",
      description: t("confirmDelete"),
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/products/${id}?hard=${hard}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      refetch();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("เกิดข้อผิดพลาดในการลบสินค้า");
    }
  };

  return {
    t,
    products,
    loading,
    searchQuery: filterOptions.search || "",
    setSearchQuery: handleSearchChange,
    filterOptions,
    totalItems,
    totalPages,
    handleCreate,
    handleEdit,
    handleDelete,
    handlePageChange,
    handlePageSizeChange,
    ConfirmDialog,
  };
}
