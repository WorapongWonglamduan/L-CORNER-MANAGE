"use client";

import Image from "next/image";
import {
  Plus,
  Package,
  TrendingUp,
  DollarSign,
  Tag,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { ProductActionButtons } from "./product-action-buttons";
import { useProductsManager } from "./helper";

export default function ProductsManager() {
  const {
    t,
    table: { products, loading },
    filters: { searchQuery, setSearchQuery, filterOptions },
    pagination: { totalItems, totalPages, handlePageChange, handlePageSizeChange },
    actions: { handleCreate, handleView, handleEdit, handleDelete },
    modal: { ConfirmDialog },
  } = useProductsManager();

  const getCategoryLabel = (
    category:
      | { id: string; name_i18n: { th: string; en: string } }
      | null
      | undefined,
  ) => {
    if (!category) return "-";
    return category.name_i18n.th;
  };

  const getProductTypeLabel = (
    productType:
      | { id: string; name_i18n: { th: string; en: string } }
      | undefined,
  ) => {
    if (!productType) return "-";
    return productType.name_i18n.th;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("searchPlaceholder")}
          />
        </div>
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-light text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all px-6 py-2.5"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t("addProduct")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">{t("loading")}</p>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Package className="h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">{t("noData")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {products.map((product) => {
              const profit =
                product.selling_price && product.cost_price
                  ? Number(product.selling_price) - Number(product.cost_price)
                  : null;
              const profitMargin =
                profit && product.selling_price
                  ? ((profit / Number(product.selling_price)) * 100).toFixed(1)
                  : null;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-primary/30 overflow-hidden"
                >
                  {/* Product Image */}
                  <div className="relative h-48 bg-gray-100">
                    {product.primary_image_url ? (
                      <Image
                        src={product.primary_image_url}
                        alt={product.name_i18n.th}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Package className="h-16 w-16 text-gray-300" />
                      </div>
                    )}
                  </div>

                  <div className="relative bg-gradient-to-r from-primary to-primary-light p-4">
                    <div className="absolute top-3 right-3">
                      <ProductActionButtons
                        onView={() => handleView(product)}
                        onEdit={() => handleEdit(product)}
                        onDelete={() => handleDelete(product.id, true)}
                        editTitle={t("edit") || "แก้ไข"}
                        deleteTitle={t("delete") || "ลบ"}
                      />
                    </div>
                    <div className="flex items-center gap-3 pr-16">
                      <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-base mb-1 truncate">
                          {product.name_i18n.th}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/90 font-mono bg-white/15 px-2 py-0.5 rounded">
                            {product.code}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              product.is_active
                                ? "bg-green-400/90 text-green-900"
                                : "bg-gray-300 text-gray-700"
                            }`}
                          >
                            {product.is_active ? "ใช้งาน" : "ปิด"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-primary/60" />
                          <span className="text-xs text-gray-500">ประเภท</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {getProductTypeLabel(product.product_type)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-primary/60" />
                          <span className="text-xs text-gray-500">
                            หมวดหมู่
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {getCategoryLabel(product.category)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-3 space-y-2.5 mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary p-1 rounded">
                            <DollarSign className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-xs font-medium text-gray-600">
                            ราคาขาย
                          </span>
                        </div>
                        <span className="text-xl font-bold text-primary">
                          {product.selling_price
                            ? `฿${Number(product.selling_price).toLocaleString()}`
                            : "-"}
                        </span>
                      </div>

                      {product.cost_price && (
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-primary/10">
                          <span className="text-gray-600">ราคาทุน</span>
                          <span className="font-semibold text-gray-700">
                            ฿{Number(product.cost_price).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {profit !== null && profitMargin !== null && (
                        <div className="flex items-center justify-between pt-2 border-t border-primary/10">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-xs font-medium text-gray-600">
                              กำไร
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-green-600">
                              ฿{profit.toLocaleString()}
                            </span>
                            <span className="text-xs text-green-600/80 ml-1">
                              ({profitMargin}%)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <Pagination
              currentPage={filterOptions.page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              itemsPerPage={filterOptions.pageSize}
              totalItems={totalItems}
              onItemsPerPageChange={handlePageSizeChange}
            />
          </div>
        </>
      )}

      <ConfirmDialog />
    </div>
  );
}
