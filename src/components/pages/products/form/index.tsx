"use client";

import { Navbar } from "@/components/navbar";
import {
  ArrowLeft,
  Package,
  Save,
  Loader2,
  Plus,
  Trash2,
  ChefHat,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { useProductForm, type ProductFormData } from "./helper";
import {
  getProductFormConfig,
  getPriceStockConfig,
  getSettingsConfig,
} from "./config";
import { FieldError } from "react-hook-form";

export default function AddProductContent() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("settings.products");

  const {
    register,
    handleSubmit,
    errors,
    loading,
    dataLoading,
    optionsData,
    fields,
    append,
    remove,
    showRecipe,
    isFinishedGood,
    onSubmit,
    isEdit,
  } = useProductForm();

  const formFields = getProductFormConfig(
    optionsData.categories,
    optionsData.units,
    optionsData.productTypes,
    t,
    locale,
  );
  const priceStockConfig = getPriceStockConfig(t);
  // const settingsConfig = getSettingsConfig(t);

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#213559] mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">{t("loadingUnits")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <button
          onClick={() => router.push(`/${locale}/products/list`)}
          className="flex items-center gap-2 text-gray-600 hover:text-[#213559] mb-6 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">กลับไปรายการสินค้า</span>
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-[#213559] rounded-xl flex items-center justify-center">
            <Package className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#213559]">
              {isEdit ? t("editProduct") : t("addNewProduct")}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEdit ? "แก้ไขข้อมูลสินค้า" : t("fillProductInfo")}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#213559]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {t("basicInfo")}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formFields.map((field) => (
                  <Input
                    key={field.name}
                    {...register(
                      field.name as keyof ProductFormData,
                      field.rules,
                    )}
                    inputType={field.type}
                    label={field.label}
                    placeholder={field.placeholder}
                    options={field.options}
                    rows={field.rows}
                    error={
                      errors[field.name as keyof typeof errors] as
                        | FieldError
                        | undefined
                    }
                    containerClassName={field.gridCols || ""}
                    required={!!field.rules?.required}
                  />
                ))}
              </div>
            </div>

            {/* Recipe Section */}
            {showRecipe && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <ChefHat className="w-5 h-5 text-[#213559]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {t("recipeTitle")}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {t("recipeDescription")}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() =>
                      append({ ingredient_id: "", quantity: 0, unit_id: "" })
                    }
                    className="bg-[#213559] hover:bg-[#1a2a47] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("addIngredient")}
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <ChefHat className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>{t("noIngredients")}</p>
                    </div>
                  ) : (
                    fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex gap-3 items-start bg-gray-50 p-4 rounded-lg"
                      >
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input
                            {...register(
                              `recipe_ingredients.${index}.ingredient_id` as const,
                              {
                                required: "กรุณาเลือกวัตถุดิบ",
                              },
                            )}
                            inputType="select"
                            label={t("ingredient")}
                            options={[
                              ...optionsData.rawMaterials.map((rm) => ({
                                value: rm.id,
                                label: `${rm.name_i18n.th} (${rm.code})`,
                              })),
                            ]}
                            error={
                              errors.recipe_ingredients?.[index]
                                ?.ingredient_id
                            }
                            required
                          />

                          <Input
                            {...register(
                              `recipe_ingredients.${index}.quantity` as const,
                              {
                                required: "กรุณาระบุจำนวน",
                                valueAsNumber: true,
                                min: {
                                  value: 0.01,
                                  message: "จำนวนต้องมากกว่า 0",
                                },
                              },
                            )}
                            inputType="number"
                            label={t("quantity")}
                            placeholder="0.00"
                            step="0.01"
                            error={errors.recipe_ingredients?.[index]?.quantity}
                            required
                          />

                          <Input
                            {...register(
                              `recipe_ingredients.${index}.unit_id` as const,
                              {
                                required: "กรุณาเลือกหน่วย",
                              },
                            )}
                            inputType="select"
                            label={t("unit")}
                            options={[
                              ...optionsData.units.map((unit) => ({
                                value: unit.id,
                                label: unit.abbreviation_i18n.th,
                              })),
                            ]}
                            error={errors.recipe_ingredients?.[index]?.unit_id}
                            required
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Price */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("price")}
              </h3>
              <div className="space-y-4">
                {priceStockConfig.slice(0, 2).map((field) => (
                  <Input
                    key={field.name}
                    {...register(
                      field.name as keyof ProductFormData,
                      field.rules,
                    )}
                    inputType="number"
                    label={field.label}
                    placeholder={field.placeholder}
                    step="0.01"
                    error={
                      errors[field.name as keyof typeof errors] as
                        | FieldError
                        | undefined
                    }
                    required={!!field.rules?.required}
                  />
                ))}
              </div>
            </div>

            {/* Stock */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("stock")}
                {isFinishedGood && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </h3>
              <div className="space-y-4">
                {priceStockConfig.slice(2).map((field) => {
                  const isRequired = isFinishedGood && 
                    (field.name === "min_stock_level" || field.name === "current_stock");
                  
                  const validationRules = isRequired
                    ? {
                        required:
                          field.name === "min_stock_level"
                            ? "กรุณาระบุสต็อกขั้นต่ำ"
                            : field.name === "current_stock"
                            ? "กรุณาระบุสต็อกปัจจุบัน"
                            : field.rules?.required,
                      }
                    : field.rules;

                  return (
                    <Input
                      key={field.name}
                      {...register(
                        field.name as keyof ProductFormData,
                        validationRules,
                      )}
                      inputType="number"
                      label={field.label}
                      placeholder={field.placeholder}
                      error={
                        errors[field.name as keyof typeof errors] as
                          | FieldError
                          | undefined
                      }
                      required={isRequired || !!field.rules?.required}
                    />
                  );
                })}
              </div>
            </div>

            {/* Settings */}
            {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("settings")}
              </h3>
              <div className="space-y-3">
                {settingsConfig.map((field) => (
                  <div key={field.name} className="flex items-center gap-3">
                    <Input
                      {...register(field.name as keyof ProductFormData)}
                      inputType="checkbox"
                      id={field.name}
                    />
                    <label
                      htmlFor={field.name}
                      className="text-gray-700 font-medium cursor-pointer"
                    >
                      {field.label}
                    </label>
                  </div>
                ))}
              </div>
            </div> */}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 text-lg bg-[#213559] hover:bg-[#1a2a47] text-white shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  {t("saveProduct")}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
