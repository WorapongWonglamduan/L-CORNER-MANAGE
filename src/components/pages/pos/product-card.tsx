"use client";

import { Plus, Minus } from "lucide-react";
import Image from "next/image";

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

  return (
    <div
      className={`group relative bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden ${
        isOutOfStock ? "opacity-60" : "hover:scale-105"
      }`}
    >
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#213559] to-[#2c4a7a] rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {name.charAt(0)}
              </span>
            </div>
          </div>
        )}
        
        {/* Stock Badge */}
        {isOutOfStock && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
            หมด
          </div>
        )}
        
        {/* Quantity Badge */}
        {quantity > 0 && (
          <div className="absolute top-2 left-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
            {quantity}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {category && (
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
            {category}
          </p>
        )}
        <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 min-h-[3.5rem]">
          {name}
        </h3>
        
        <div className="flex items-center justify-between mb-3">
          <div className="text-2xl font-bold bg-gradient-to-r from-[#213559] to-[#2c4a7a] bg-clip-text text-transparent">
            ฿{price.toLocaleString()}
          </div>
          {stock > 0 && stock <= 10 && (
            <span className="text-xs text-orange-600 font-medium">
              เหลือ {stock}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        {!isOutOfStock && (
          <div className="flex gap-2">
            {quantity > 0 ? (
              <div className="flex items-center justify-between w-full bg-gradient-to-r from-[#213559] to-[#2c4a7a] rounded-xl p-2">
                <button
                  onClick={handleDecrement}
                  className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <Minus className="w-5 h-5 text-white" />
                </button>
                <span className="text-xl font-bold text-white px-4">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleIncrement}
                className="w-full bg-gradient-to-r from-[#213559] to-[#2c4a7a] text-white py-3 rounded-xl font-semibold hover:shadow-xl hover:shadow-[#213559]/40 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                เพิ่มลงตะกร้า
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
