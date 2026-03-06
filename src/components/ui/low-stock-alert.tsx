"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, X, Package, TrendingDown } from "lucide-react";
import { useRouter } from "next/navigation";

interface LowStockItem {
  id: string;
  code: string;
  name: string;
  current_stock: number;
  low_stock_threshold: number;
  unit: string;
  product_type: string;
}

export function LowStockAlert() {
  const router = useRouter();
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const fetchLowStockItems = useCallback(async () => {
    try {
      const response = await fetch("/api/inventory/low-stock");
      if (!response.ok) return;
      
      const data = await response.json();
      setLowStockItems(data.items || []);
      
      // Show alert if there are low stock items and not dismissed
      if (data.items && data.items.length > 0 && !isDismissed) {
        setIsVisible(true);
      }
    } catch (error) {
      console.error("Error fetching low stock items:", error);
    }
  }, [isDismissed]);

  useEffect(() => {
    // Initial fetch
    const initialFetch = async () => {
      await fetchLowStockItems();
    };
    initialFetch();
    
    // Check every 5 minutes
    const interval = setInterval(fetchLowStockItems, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    
    // Auto re-enable after 1 hour
    setTimeout(() => {
      setIsDismissed(false);
    }, 60 * 60 * 1000);
  };

  const handleViewInventory = () => {
    router.push("/inventory");
    setIsVisible(false);
  };

  if (!isVisible || lowStockItems.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in slide-in-from-bottom-5">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-orange-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">แจ้งเตือนสต็อกต่ำ</h3>
              <p className="text-xs text-orange-100">
                มีสินค้า {lowStockItems.length} รายการที่ต้องเติม
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-80 overflow-y-auto">
          <div className="space-y-2">
            {lowStockItems.slice(0, 5).map((item) => {
              const percentage = (item.current_stock / item.low_stock_threshold) * 100;
              const isVeryLow = percentage < 50;
              
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                    isVeryLow
                      ? "border-red-200 bg-red-50"
                      : "border-orange-200 bg-orange-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Package className={`w-4 h-4 flex-shrink-0 ${
                          isVeryLow ? "text-red-600" : "text-orange-600"
                        }`} />
                        <p className="font-semibold text-sm text-gray-900 truncate">
                          {item.name}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        รหัส: {item.code}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <TrendingDown className={`w-3 h-3 ${
                          isVeryLow ? "text-red-500" : "text-orange-500"
                        }`} />
                        <p className={`text-xs font-medium ${
                          isVeryLow ? "text-red-700" : "text-orange-700"
                        }`}>
                          เหลือ {item.current_stock} {item.unit}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                        isVeryLow
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                      }`}>
                        {percentage.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-2 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isVeryLow
                          ? "bg-gradient-to-r from-red-500 to-red-600"
                          : "bg-gradient-to-r from-orange-500 to-orange-600"
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {lowStockItems.length > 5 && (
            <p className="text-xs text-gray-500 text-center mt-3">
              และอีก {lowStockItems.length - 5} รายการ...
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <button
            onClick={handleViewInventory}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-all hover:shadow-lg active:scale-95"
          >
            ดูรายการสต็อกทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
}
