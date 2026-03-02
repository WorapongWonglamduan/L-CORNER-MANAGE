"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import { 
  Package, 
  Tag, 
  DollarSign, 
  Image as ImageIcon,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductFormData {
  code: string;
  name_th: string;
  name_en: string;
  description_th?: string;
  description_en?: string;
  category_id?: string;
  product_type: string;
  base_unit_id: string;
  selling_price: number;
  cost_price?: number;
  min_stock_level?: number;
  low_stock_threshold?: number;
  image_url?: string;
  track_stock: boolean;
  has_serial: boolean;
  has_expiry: boolean;
  is_active: boolean;
}

interface Category {
  id: string;
  name_i18n: { th: string; en: string };
}

interface Unit {
  id: string;
  name_i18n: { th: string; en: string };
  abbreviation_i18n: { th: string; en: string };
}

interface ProductFormProps {
  categories: Category[];
  units: Unit[];
}

export function ProductForm({ categories, units }: ProductFormProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: {
      product_type: "finished_good",
      track_stock: true,
      has_serial: false,
      has_expiry: false,
      is_active: true,
    },
  });

  const productTypes = [
    { value: "finished_good", label: "สินค้าสำเร็จรูป", icon: "🍱" },
    { value: "raw_material", label: "วัตถุดิบ", icon: "🥬" },
    { value: "semi_finished", label: "สินค้ากึ่งสำเร็จรูป", icon: "🍜" },
    { value: "service", label: "บริการ", icon: "✨" },
  ];

  const onSubmit = async (data: ProductFormData) => {
    try {
      setLoading(true);

      const payload = {
        code: data.code,
        name_i18n: {
          th: data.name_th,
          en: data.name_en,
        },
        description_i18n: data.description_th || data.description_en ? {
          th: data.description_th || "",
          en: data.description_en || "",
        } : null,
        category_id: data.category_id || null,
        product_type: data.product_type,
        base_unit_id: data.base_unit_id,
        image_url: data.image_url || null,
        is_active: data.is_active,
        has_serial: data.has_serial,
        has_expiry: data.has_expiry,
        min_stock_level: data.min_stock_level || 0,
        low_stock_threshold: data.low_stock_threshold || 0,
        track_stock: data.track_stock,
      };

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to create product");

      const product = await response.json();

      // Create selling unit with price
      if (data.selling_price) {
        await fetch("/api/product-units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: product.id,
            unit_id: data.base_unit_id,
            is_base_unit: true,
            is_selling_unit: true,
            selling_price: data.selling_price,
            cost_price: data.cost_price || null,
            conversion_to_base: 1,
          }),
        });
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/pos`);
      }, 2000);
    } catch (error) {
      console.error("Error creating product:", error);
      alert("เกิดข้อผิดพลาดในการเพิ่มสินค้า");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 3));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            เพิ่มสินค้าสำเร็จ!
          </h2>
          <p className="text-gray-600">กำลังนำคุณไปหน้า POS...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                  step >= s
                    ? "bg-gradient-to-r from-[#213559] to-[#2c4a7a] text-white shadow-lg"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-2 mx-4 rounded-full transition-all ${
                    step > s ? "bg-[#213559]" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-sm font-medium text-gray-700">ข้อมูลพื้นฐาน</span>
          <span className="text-sm font-medium text-gray-700">รายละเอียด</span>
          <span className="text-sm font-medium text-gray-700">ราคาและสต็อก</span>
        </div>
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">ข้อมูลพื้นฐาน</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  รหัสสินค้า <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("code", { required: "กรุณากรอกรหัสสินค้า" })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#213559] focus:border-transparent"
                  placeholder="เช่น P001"
                />
                {errors.code && (
                  <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ประเภทสินค้า <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("product_type", { required: true })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#213559] focus:border-transparent"
                >
                  {productTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ชื่อสินค้า (ไทย) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("name_th", { required: "กรุณากรอกชื่อสินค้า" })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#213559] focus:border-transparent"
                  placeholder="ชื่อสินค้าภาษาไทย"
                />
                {errors.name_th && (
                  <p className="mt-1 text-sm text-red-600">{errors.name_th.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ชื่อสินค้า (English) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("name_en", { required: "กรุณากรอกชื่อสินค้า" })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#213559] focus:border-transparent"
                  placeholder="Product name in English"
                />
                {errors.name_en && (
                  <p className="mt-1 text-sm text-red-600">{errors.name_en.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Tag className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">รายละเอียดสินค้า</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  หมวดหมู่
                </label>
                <select
                  {...register("category_id")}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#213559] focus:border-transparent"
                >
                  <option value="">-- เลือกหมวดหมู่ --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name_i18n.th}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  หน่วยพื้นฐาน <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("base_unit_id", { required: "กรุณาเลือกหน่วย" })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#213559] focus:border-transparent"
                >
                  <option value="">-- เลือกหน่วย --</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name_i18n.th} ({unit.abbreviation_i18n.th})
                    </option>
                  ))}
                </select>
                {errors.base_unit_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.base_unit_id.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  คำอธิบาย (ไทย)
                </label>
                <textarea
                  {...register("description_th")}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#213559] focus:border-transparent"
                  placeholder="คำอธิบายสินค้า..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  URL รูปภาพ
                </label>
                <div className="flex gap-2">
                  <ImageIcon className="w-10 h-10 text-gray-400" />
                  <input
                    {...register("image_url")}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#213559] focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Price & Stock */}
      {step === 3 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">ราคาและสต็อก</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ราคาขาย <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("selling_price", { 
                    required: "กรุณากรอกราคาขาย",
                    min: { value: 0, message: "ราคาต้องมากกว่า 0" }
                  })}
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#213559] focus:border-transparent"
                  placeholder="0.00"
                />
                {errors.selling_price && (
                  <p className="mt-1 text-sm text-red-600">{errors.selling_price.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ราคาทุน
                </label>
                <input
                  {...register("cost_price")}
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#213559] focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  สต็อกขั้นต่ำ
                </label>
                <input
                  {...register("min_stock_level")}
                  type="number"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#213559] focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  เกณฑ์แจ้งเตือนสต็อกต่ำ
                </label>
                <input
                  {...register("low_stock_threshold")}
                  type="number"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#213559] focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    {...register("track_stock")}
                    type="checkbox"
                    className="w-5 h-5 text-[#213559] border-gray-300 rounded focus:ring-[#213559]"
                  />
                  <span className="text-gray-700 font-medium">ติดตามสต็อก</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    {...register("has_serial")}
                    type="checkbox"
                    className="w-5 h-5 text-[#213559] border-gray-300 rounded focus:ring-[#213559]"
                  />
                  <span className="text-gray-700 font-medium">มีหมายเลขซีเรียล</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    {...register("has_expiry")}
                    type="checkbox"
                    className="w-5 h-5 text-[#213559] border-gray-300 rounded focus:ring-[#213559]"
                  />
                  <span className="text-gray-700 font-medium">มีวันหมดอายุ</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    {...register("is_active")}
                    type="checkbox"
                    className="w-5 h-5 text-[#213559] border-gray-300 rounded focus:ring-[#213559]"
                  />
                  <span className="text-gray-700 font-medium">เปิดใช้งาน</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        {step > 1 ? (
          <Button
            type="button"
            onClick={prevStep}
            variant="outline"
            className="px-8 py-6 text-lg"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            ย้อนกลับ
          </Button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <Button
            type="button"
            onClick={nextStep}
            className="px-8 py-6 text-lg bg-gradient-to-r from-[#213559] to-[#2c4a7a] text-white"
          >
            ถัดไป
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={loading}
            className="px-8 py-6 text-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                บันทึกสินค้า
              </>
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
