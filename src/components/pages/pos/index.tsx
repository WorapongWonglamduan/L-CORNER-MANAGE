"use client";

import { Navbar } from "@/components/navbar";
import { Search, ShoppingCart, X, Trash2, Grid3x3 } from "lucide-react";
import { ProductCard } from "./product-card";
import { usePOSManager } from "./helper";
import { Button } from "@/components/ui/button";

export default function POSContent() {
  const {
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
    locale,
  } = usePOSManager();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
        {/* Left Sidebar - Categories */}
        <div className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <Grid3x3 className="w-5 h-5 text-[#213559]" />
              หมวดหมู่สินค้า
            </h2>
          </div>

          <div className="p-2 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`whitespace-nowrap lg:w-full text-left px-4 py-3 rounded-lg transition-all ${
                selectedCategory === null
                  ? "bg-gradient-to-r from-[#213559] to-[#2c4a7a] text-white shadow-lg"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <span className="font-medium">ทั้งหมด</span>
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`whitespace-nowrap lg:w-full text-left px-4 py-3 rounded-lg transition-all ${
                  selectedCategory === category.id
                    ? "bg-gradient-to-r from-[#213559] to-[#2c4a7a] text-white shadow-lg"
                    : "hover:bg-gray-100 text-gray-700"
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
          <div className="p-4 lg:p-6 pb-24 lg:pb-6">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาสินค้า..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#213559] focus:border-transparent shadow-sm"
                />
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#213559] mx-auto mb-4"></div>
                  <p className="text-gray-600 text-lg">กำลังโหลดสินค้า...</p>
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <ShoppingCart className="h-12 w-12 text-gray-400" />
                </div>
                <p className="text-gray-600 text-lg">ไม่พบสินค้า</p>
              </div>
            ) : (
              <div className="grid  xl:grid-cols-4 2xl:grid-cols-4 gap-4">
                {products.map((product) => {
                  return (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name_i18n[locale]}
                      price={Number(product.selling_price) || 0}
                      image={product.image_url || undefined}
                      category={product.category?.name_i18n[locale]}
                      stock={product.available_quantity || 0}
                      onAdd={addToCart}
                      quantity={getCartItemQuantity(product.id)}
                      onQuantityChange={updateQuantity}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Cart (Desktop) */}
        <div className="hidden lg:flex lg:w-96 bg-white border-l border-gray-200 flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-[#213559]" />
                ตะกร้าสินค้า
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="ล้างตะกร้า"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
            <p className="text-gray-500 text-sm">{cartItemCount} รายการ</p>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingCart className="w-16 h-16 mb-4" />
                <p className="text-center">ตะกร้าว่างเปล่า</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 flex-1 pr-2">
                        {item.name}
                      </h3>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          ฿{item.price.toLocaleString()} x {item.quantity}
                        </p>
                        <p className="font-bold text-[#213559]">
                          ฿{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>ยอดรวม</span>
                  <span className="font-semibold">
                    ฿{cartTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>ภาษี (7%)</span>
                  <span className="font-semibold">
                    ฿{(cartTotal * 0.07).toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-gray-300 pt-3 flex justify-between text-xl font-bold text-gray-900">
                  <span>ยอดชำระ</span>
                  <span className="text-[#213559]">
                    ฿{(cartTotal * 1.07).toLocaleString()}
                  </span>
                </div>
              </div>

              <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-6 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all">
                ชำระเงิน
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Cart Bar (Bottom) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-2xl z-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="w-5 h-5 text-[#213559]" />
                <span className="font-bold text-gray-900">
                  {cartItemCount} รายการ
                </span>
              </div>
              <div className="text-xl font-bold text-[#213559]">
                ฿{(cartTotal * 1.07).toLocaleString()}
              </div>
            </div>
            <Button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-6 text-lg font-bold rounded-xl shadow-lg">
              ชำระเงิน
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
