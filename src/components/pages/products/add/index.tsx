"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { ProductForm } from "./product-form";

interface Category {
  id: string;
  name_i18n: { th: string; en: string };
}

interface Unit {
  id: string;
  name_i18n: { th: string; en: string };
  abbreviation_i18n: { th: string; en: string };
}

export default function AddProductContent() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, unitsRes] = await Promise.all([
          fetch("/api/raw-material-categories?pageSize=100&isActive=true&type=product"),
          fetch("/api/units?pageSize=100&isActive=true"),
        ]);

        const categoriesData = await categoriesRes.json();
        const unitsData = await unitsRes.json();

        setCategories(categoriesData.items || []);
        setUnits(unitsData.items || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/${locale}/pos`)}
            className="flex items-center gap-2 text-gray-600 hover:text-[#213559] mb-4 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">กลับไปหน้า POS</span>
          </button>

          <div className="flex items-center gap-4 mb-3">
            <div className="w-16 h-16 bg-gradient-to-br from-[#213559] to-[#2c4a7a] rounded-2xl shadow-xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#213559] to-[#2c4a7a] bg-clip-text text-transparent">
                เพิ่มสินค้าใหม่
              </h1>
              <p className="text-gray-600 mt-1">
                กรอกข้อมูลสินค้าเพื่อเพิ่มเข้าสู่ระบบ
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#213559] mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : (
          <ProductForm categories={categories} units={units} />
        )}
      </div>
    </div>
  );
}
