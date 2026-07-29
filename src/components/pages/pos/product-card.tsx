"use client";

import { Plus, Minus } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  stock?: number;
  onAdd: (id: string) => void;
  quantity?: number;
  onQuantityChange?: (id: string, quantity: number) => void;
}

export function ProductCard({
  id,
  name,
  price,
  image,
  category,
  stock = 0,
  onAdd,
  quantity = 0,
  onQuantityChange,
}: ProductCardProps) {
  const t = useTranslations("pos");

  const handleIncrement = () => {
    if (quantity === 0) {
      onAdd(id);
    } else if (onQuantityChange) {
      onQuantityChange(id, quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (onQuantityChange && quantity > 0) {
      onQuantityChange(id, quantity - 1);
    }
  };

  const isOutOfStock = stock <= 0;
  // const isLowStock = stock > 0 && stock <= 10;

  return (
    <div
      className={`group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 ${
        isOutOfStock
          ? "opacity-60 cursor-not-allowed"
          : "hover:border-primary/30 cursor-pointer"
      }`}
    >
      {/* Image */}
      <div className="relative h-44 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain group-hover:scale-105 transition-transform duration-300 p-2"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-18 h-18 bg-gradient-to-br from-primary to-primary-light rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-white">
                {name.charAt(0)}
              </span>
            </div>
          </div>
        )}

        {/* Stock Badge */}
        {isOutOfStock && (
          <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg">
            {t("outOfStock")}
          </div>
        )}

        {/* Low Stock Badge */}
        {!isOutOfStock && (
          <div className="absolute top-3 right-3 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg">
            {t("remaining", { stock })}
          </div>
        )}

        {/* Quantity Badge */}
        {quantity > 0 && (
          <div className="absolute top-3 left-3 bg-green-500 text-white w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-white">
            {quantity}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {category && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
              {category}
            </p>
          </div>
        )}
        <h3 className="font-bold text-gray-900 dark:text-white text-base mb-3 line-clamp-2 min-h-10 leading-tight">
          {name}
        </h3>

        <div className="flex items-baseline justify-between mb-4">
          <div className="text-xl font-bold text-primary">
            ฿{price.toLocaleString()}
          </div>
          {stock && (
            <span className="text-xs text-green-600 dark:text-green-300 font-medium bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
              {t("inStock")}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        {!isOutOfStock && (
          <div className="flex gap-2">
            {quantity > 0 ? (
              <div className="flex items-center justify-between w-full bg-gradient-to-r from-primary to-primary-light rounded-lg p-1.5 shadow-md">
                <button
                  onClick={handleDecrement}
                  className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-md transition-all active:scale-95"
                >
                  <Minus className="w-4 h-4 text-white" />
                </button>
                <span className="text-lg font-bold text-white px-3">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-md transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleIncrement}
                className="w-full bg-gradient-to-r from-primary to-primary-light text-white py-2.5 rounded-lg font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                {t("addToCart")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
