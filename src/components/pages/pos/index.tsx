"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Search, ShoppingCart, X, Trash2, Grid3x3 } from "lucide-react";
import { ProductCard } from "./product-card";
import { usePOSManager } from "./helper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { CheckoutModal } from "./checkout-modal";
import { ToppingModal } from "./topping-modal";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import { Pagination } from "@/components/ui/pagination";
import { PRODUCTS_TYPES, INPUT_TYPES } from "@/constants/input-types";
import { DynamicFormFields } from "@/components/dynamic-form/dynamic-form-fields";

interface POSFilterValues {
  searchQuery: string;
  warehouseId: string;
}

export default function POSContent() {
  const { catalog, cart, checkout, display, locale, pagination, warehouse, filterForm } =
    usePOSManager();

  const currentWarehouse = warehouse.warehouses.find(
    (w) => w.id === warehouse.warehouseId,
  );

  const t = useTranslations("pos");
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [customizeProduct, setCustomizeProduct] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Reset to page 1 when category, search, or pageSize changes
  useEffect(() => {
    pagination.setCurrentPage(1);
  }, [
    catalog.selectedCategory,
    catalog.searchQuery,
    pagination.pageSize,
    pagination.setCurrentPage,
  ]);

  const handleCheckout = async (
    paymentMethod: string,
    promotionCode?: string,
  ) => {
    try {
      await checkout(paymentMethod, promotionCode);
      setIsCheckoutModalOpen(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("cannotSave");
      toast.error(t("paymentError", { message: errorMessage }));
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        {/* Left Sidebar - Categories */}
        <div className="xl:w-56 bg-white dark:bg-gray-800 border-b xl:border-b-0 xl:border-r border-gray-200 dark:border-gray-600 overflow-y-auto">
          <div className="p-4 pt-16 md:pt-4 border-b border-gray-200 dark:border-gray-600">
            <h2 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <Grid3x3 className="w-5 h-5 text-primary" />
              {t("categories")}
            </h2>
          </div>

          <div className="p-2 flex xl:flex-col gap-2 overflow-x-auto xl:overflow-x-visible">
            <button
              onClick={() => catalog.setSelectedCategory(null)}
              className={`shrink-0 whitespace-nowrap xl:w-full text-left px-4 py-3 rounded-lg transition-all ${
                catalog.selectedCategory === null
                  ? "bg-gradient-to-r from-primary to-primary-light text-white shadow-lg"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              <span className="font-medium">{t("allCategories")}</span>
            </button>

            {catalog.categories.map((category) => (
              <button
                key={category.id}
                onClick={() => catalog.setSelectedCategory(category.id)}
                className={`shrink-0 whitespace-nowrap xl:w-full text-left px-4 py-3 rounded-lg transition-all ${
                  catalog.selectedCategory === category.id
                    ? "bg-gradient-to-r from-primary to-primary-light text-white shadow-lg"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                }`}
              >
                <span className="font-medium">
                  {category.name_i18n[locale]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content - Products */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 pb-28 xl:pb-6">
            {/* Search Bar + Warehouse Selector */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 max-w-2xl">
                <DynamicFormFields<POSFilterValues>
                  fields={[
                    {
                      name: "searchQuery",
                      type: INPUT_TYPES.TEXT,
                      icon: Search,
                      placeholder: t("searchPlaceholder"),
                    },
                  ]}
                  control={filterForm.control}
                  errors={filterForm.errors}
                />
              </div>

              {warehouse.warehouses.length > 0 && (
                <Input
                  inputType={INPUT_TYPES.SELECT}
                  value={warehouse.warehouseId ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    warehouse.setWarehouseId(e.target.value)
                  }
                  hideEmptyOption
                  options={warehouse.warehouses.map((w) => ({
                    value: w.id,
                    label: `${w.code} - ${w.name_i18n[locale]}`,
                  }))}
                />
              )}
            </div>

            {/* Products Grid */}
            {warehouse.warehouses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <ShoppingCart className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-lg text-center">
                  {t("noWarehouseAssigned")}
                </p>
              </div>
            ) : catalog.loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300 text-lg">{t("loading")}</p>
                </div>
              </div>
            ) : catalog.products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <ShoppingCart className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-lg">{t("noProducts")}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
                  {catalog.products.map((product) => {
                    const isCustomizable =
                      product.product_type?.type === PRODUCTS_TYPES.SEMI_FINISHED;
                    return (
                      <ProductCard
                        key={product.id}
                        id={product.id}
                        name={product.name_i18n[locale]}
                        price={Number(product.selling_price) || 0}
                        image={product.primary_image_url || undefined}
                        category={product.category?.name_i18n[locale]}
                        stock={product.available_quantity || 0}
                        onAdd={(id) => {
                          if (isCustomizable) {
                            setCustomizeProduct({
                              id,
                              name: product.name_i18n[locale],
                            });
                          } else {
                            cart.addToCart(id);
                          }
                        }}
                        quantity={cart.getCartItemQuantity(product.id)}
                        onQuantityChange={cart.updateQuantity}
                      />
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="mt-6">
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={Math.ceil(
                      pagination.totalItems / pagination.pageSize,
                    )}
                    onPageChange={pagination.setCurrentPage}
                    itemsPerPage={pagination.pageSize}
                    totalItems={pagination.totalItems}
                    onItemsPerPageChange={pagination.setPageSize}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar - Cart (Desktop) */}
        <div className="hidden xl:flex xl:w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-600 flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-xl text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-primary" />
                {t("cart")}
              </h2>
              {cart.items.length > 0 && (
                <button
                  onClick={cart.clearCart}
                  className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title={t("clearCart")}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {cart.itemCount} {t("items")}
            </p>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <ShoppingCart className="w-16 h-16 mb-4" />
                <p className="text-center">{t("emptyCart")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div
                    key={item.lineId}
                    className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 pr-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {item.name}
                        </h3>
                        {item.toppings.length > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {t("toppingsSummary", {
                              names: item.toppings.map((tp) => tp.name).join(", "),
                            })}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => cart.removeFromCart(item.lineId)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            cart.updateLineQuantity(item.lineId, item.quantity - 1)
                          }
                          className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            cart.updateLineQuantity(item.lineId, item.quantity + 1)
                          }
                          className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ฿
                          {(
                            item.price +
                            item.toppings.reduce((sum, tp) => sum + tp.price, 0)
                          ).toLocaleString()}{" "}
                          x {item.quantity}
                        </p>
                        <p className="font-bold text-primary">
                          ฿{cart.lineTotal(item).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary */}
          {cart.items.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-600 p-6 bg-gray-50 dark:bg-gray-900">
              <div className="space-y-3 mb-4">
                <div className="border-t border-gray-300 dark:border-gray-600 pt-3 flex justify-between text-xl font-bold text-gray-900 dark:text-white">
                  <span>{t("total")}</span>
                  <span className="text-primary">
                    ฿{cart.total.toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => setIsCheckoutModalOpen(true)}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-6 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                {t("checkout")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Cart Bar (Bottom) */}
      {cart.items.length > 0 && (
        <div className="xl:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 p-4 shadow-2xl z-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <span className="font-bold text-gray-900 dark:text-white">
                  {cart.itemCount} {t("items")}
                </span>
              </div>
              <div className="text-xl font-bold text-primary">
                ฿{cart.total.toLocaleString()}
              </div>
            </div>
            <Button
              onClick={() => setIsCheckoutModalOpen(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-6 text-lg font-bold rounded-xl shadow-lg"
            >
              {t("checkout")}
            </Button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        cartTotal={cart.total}
        cartItemCount={cart.itemCount}
        promptpayId={currentWarehouse?.promptpay_id}
        onDisplayStateChange={display.setPaymentState}
        onConfirm={handleCheckout}
      />

      {/* Topping Customization Modal */}
      <ToppingModal
        isOpen={customizeProduct !== null}
        onClose={() => setCustomizeProduct(null)}
        productId={customizeProduct?.id ?? null}
        productName={customizeProduct?.name ?? ""}
        locale={locale}
        onConfirm={(toppings) => {
          if (customizeProduct) {
            cart.addToppedItemToCart(customizeProduct.id, toppings);
          }
        }}
      />
    </div>
  );
}
