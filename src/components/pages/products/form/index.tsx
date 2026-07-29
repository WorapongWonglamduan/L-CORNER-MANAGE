"use client";

import { Sidebar } from "@/components/sidebar";
import {
  ArrowLeft,
  Package,
  Save,
  Loader2,
  Plus,
  Trash2,
  ChefHat,
  Warehouse,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { DynamicFormFields } from "@/components/dynamic-form/dynamic-form-fields";
import type { FieldConfig } from "@/components/dynamic-form/types";
import { useProductForm, type ProductFormData } from "./helper";
import { getProductFormConfig, getPriceStockConfig } from "./config";
import { FieldError, Controller, RegisterOptions } from "react-hook-form";
import { INPUT_TYPES } from "@/constants/input-types";
import type { Locale } from "@/types/i18n";

export default function AddProductContent() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as Locale;
  const t = useTranslations("settings.products");

  const {
    form: { handleSubmit, control, watch, setValue, errors, onSubmit },
    loading: { loading, dataLoading },
    optionsData,
    recipeFields: { fields, append, remove },
    flags: { isSemiFinished, isEdit },
    handleProductTypeChange,
    toggleWarehouseId,
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300 text-lg">{t("loadingUnits")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar />

      <div className="flex-1 p-6 pt-20 md:pt-6 lg:p-8 overflow-auto">
        <button
          onClick={() => router.push(`/${locale}/products/list`)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary mb-6 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">กลับไปรายการสินค้า</span>
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center">
            <Package className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">
              {isEdit ? t("editProduct") : t("addNewProduct")}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t("basicInfo")}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formFields.map((field) => {
                  // Use Controller for MULTI_IMAGE_UPLOAD
                  if (field.type === INPUT_TYPES.MULTI_IMAGE_UPLOAD) {
                    return (
                      <Controller
                        key={field.name}
                        name="images"
                        control={control}
                        render={({ field: controllerField }) => (
                          <Input
                            inputType={INPUT_TYPES.MULTI_IMAGE_UPLOAD}
                            label={field.label}
                            // Input's public prop type is a union of native HTML input attrs and
                            // doesn't model MULTI_IMAGE_UPLOAD's real ImageFile[] shape (Input.tsx
                            // re-casts it internally too) — cast through unknown at this one boundary.
                            value={controllerField.value as unknown as string[]}
                            onChange={
                              controllerField.onChange as unknown as React.ChangeEventHandler<HTMLInputElement>
                            }
                            error={errors.images as FieldError | undefined}
                            containerClassName={field.gridCols || ""}
                            required={!!field.rules?.required}
                          />
                        )}
                      />
                    );
                  }

                  // Use Controller for product_type_id to handle onChange
                  if (field.name === "product_type_id") {
                    return (
                      <Controller
                        key={field.name}
                        name="product_type_id"
                        control={control}
                        rules={field.rules as RegisterOptions<ProductFormData, "product_type_id">}
                        render={({ field: controllerField }) => (
                          <Input
                            inputType={field.type}
                            label={field.label}
                            placeholder={field.placeholder}
                            options={field.options}
                            value={controllerField.value}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                              handleProductTypeChange(e.target.value);
                            }}
                            error={
                              errors.product_type_id as FieldError | undefined
                            }
                            containerClassName={field.gridCols || ""}
                            required={!!field.rules?.required}
                          />
                        )}
                      />
                    );
                  }

                  // Fields with no custom onChange behavior (code, name_th,
                  // name_en, category_id, base_unit_id, description_th) —
                  // rendered one at a time via the shared FormFields component
                  // so they stay in their original grid position, but get
                  // combobox/etc. support for free.
                  return (
                    <div key={field.name} className={field.gridCols || ""}>
                      <DynamicFormFields
                        fields={[field as unknown as FieldConfig<ProductFormData>]}
                        control={control}
                        errors={errors}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recipe Section */}
            {isSemiFinished && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <ChefHat className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {t("recipeTitle")}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {t("recipeDescription")}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() =>
                      append({ ingredient_id: "", quantity: 0, unit_id: "" })
                    }
                    className="bg-primary hover:bg-[#1a2a47] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("addIngredient")}
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <ChefHat className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p>{t("noIngredients")}</p>
                    </div>
                  ) : (
                    fields.map((field, index) => {
                      const selectedIngredientId = watch(
                        `recipe_ingredients.${index}.ingredient_id`,
                      );
                      const selectedIngredient = optionsData.ingredientsAndContainers.find(
                        (ic) => ic.id === selectedIngredientId,
                      );

                      return (
                        <div
                          key={field.id}
                          className="flex gap-3 items-start bg-gray-50 dark:bg-gray-900 p-4 rounded-lg"
                        >
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Controller
                              name={
                                `recipe_ingredients.${index}.ingredient_id` as const
                              }
                              control={control}
                              rules={{ required: "กรุณาเลือกวัตถุดิบ" }}
                              render={({ field: controllerField }) => (
                                <Combobox
                                  label={t("ingredient")}
                                  options={optionsData.ingredientsAndContainers.map((ic) => ({
                                    value: ic.id,
                                    label: `${ic.name_i18n[locale]} (${ic.code})`,
                                  }))}
                                  value={controllerField.value ?? ""}
                                  onChange={(newIngredientId: string) => {
                                    controllerField.onChange(newIngredientId);

                                    // Auto-set unit_id based on selected ingredient's unit_id
                                    const ingredient =
                                      optionsData.ingredientsAndContainers.find(
                                        (ic) => ic.id === newIngredientId,
                                      );
                                    if (ingredient) {
                                      setValue(
                                        `recipe_ingredients.${index}.unit_id` as const,
                                        ingredient.unit_id,
                                      );
                                    }
                                  }}
                                  error={
                                    errors.recipe_ingredients?.[index]
                                      ?.ingredient_id
                                  }
                                  required
                                />
                              )}
                            />

                            <Controller
                              name={
                                `recipe_ingredients.${index}.quantity` as const
                              }
                              control={control}
                              rules={{
                                required: "กรุณาระบุจำนวน",
                                min: {
                                  value: 0,
                                  message: "จำนวนต้องมากกว่า 0",
                                },
                              }}
                              render={({ field: controllerField }) => (
                                <Input
                                  inputType="number"
                                  label={t("quantity")}
                                  placeholder="0.00"
                                  step="1"
                                  value={controllerField.value ?? ""}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const value = parseFloat(e.target.value);
                                    controllerField.onChange(
                                      isNaN(value) ? "" : value,
                                    );
                                  }}
                                  error={
                                    errors.recipe_ingredients?.[index]?.quantity
                                  }
                                  required
                                />
                              )}
                            />

                            <Controller
                              name={
                                `recipe_ingredients.${index}.unit_id` as const
                              }
                              control={control}
                              rules={{ required: "กรุณาเลือกวัตถุดิบก่อน" }}
                              render={({ field: controllerField }) => (
                                <Input
                                  inputType="select"
                                  label={t("unit")}
                                  options={[
                                    ...optionsData.units.map((unit) => ({
                                      value: unit.id,
                                      label: unit.abbreviation_i18n[locale],
                                    })),
                                  ]}
                                  value={
                                    controllerField.value ??
                                    selectedIngredient?.unit_id ??
                                    ""
                                  }
                                  onChange={controllerField.onChange}
                                  disabled={true}
                                  error={
                                    errors.recipe_ingredients?.[index]?.unit_id
                                  }
                                />
                              )}
                            />
                          </div>

                          <Button
                            type="button"
                            onClick={() => remove(index)}
                            variant="ghost"
                            size="icon"
                            className="mt-6 text-red-600 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Price */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {t("price")}
              </h3>
              <div className="space-y-4">
                <DynamicFormFields
                  fields={priceStockConfig as unknown as FieldConfig<ProductFormData>[]}
                  control={control}
                  errors={errors}
                />
              </div>
            </div>

            {/* Branches (create only — reassigning after creation happens via
                the products-list "จัดการคลัง" modal, one place, not two) */}
            {!isEdit && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Warehouse className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {t("branchesTitle")}
                  </h3>
                </div>
                {optionsData.warehouses.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("warehouses.noWarehouseAssigned")}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {optionsData.warehouses.map((warehouse) => {
                      const selected = (watch("warehouse_ids") || []).includes(
                        warehouse.id,
                      );
                      return (
                        <div
                          key={warehouse.id}
                          className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <Input
                            inputType={INPUT_TYPES.CHECKBOX}
                            checked={selected}
                            onCheckedChange={() =>
                              toggleWarehouseId(warehouse.id)
                            }
                          />
                          <span
                            className="text-sm text-gray-900 dark:text-white cursor-pointer"
                            onClick={() => toggleWarehouseId(warehouse.id)}
                          >
                            {warehouse.name_i18n[locale]}{" "}
                            <span className="text-gray-500 dark:text-gray-400">
                              ({warehouse.code})
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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
              className="w-full py-6 text-lg bg-primary hover:bg-[#1a2a47] text-white shadow-lg"
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
