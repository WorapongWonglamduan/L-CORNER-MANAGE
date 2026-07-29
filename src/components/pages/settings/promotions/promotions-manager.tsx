"use client";

import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { DynamicFilterBar, type FilterFieldConfig } from "@/components/ui/dynamic-filter-bar";
import { ActionButtons } from "@/components/ui/action-buttons";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { usePromotionsManager } from "./helper";
import { getPromotionFormConfig } from "./form/config";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/types/i18n";
import type { Promotion } from "./helper";

export default function PromotionsManager() {
  const locale = useLocale() as Locale;
  const tCommon = useTranslations("common");
  const {
    t,
    table: { items: promotions, loading },
    filters,
    pagination: {
      filterOptions,
      totalItems,
      totalPages,
      handlePageChange,
      handlePageSizeChange,
    },
    actions: { handleCreate, handleEdit, handleDelete },
    dialog: {
      open: dialogOpen,
      editingItem: editingPromotion,
      onClose: handleDialogClose,
      ConfirmDialog,
    },
    form: {
      control: formControl,
      handleSubmit: formHandleSubmit,
      errors: formErrors,
      loading: formLoading,
      error: formError,
      onSubmit: handleFormSubmit,
    },
  } = usePromotionsManager();

  const filterFields: FilterFieldConfig[] = [
    { name: "search", type: "text", placeholder: t("searchPlaceholder") },
    {
      name: "isActive",
      type: "select",
      placeholder: tCommon("allStatus"),
      options: [
        { value: "true", label: t("active") },
        { value: "false", label: t("inactive") },
      ],
    },
  ];

  const formatDiscount = (promotion: Promotion) => {
    return promotion.discount_type === "percentage"
      ? `${Number(promotion.discount_value)}%`
      : `฿${Number(promotion.discount_value).toLocaleString()}`;
  };

  const isExpired = (promotion: Promotion) => {
    if (!promotion.expires_at) return false;
    return new Date(promotion.expires_at) < new Date();
  };

  const formatExpiry = (promotion: Promotion) => {
    if (!promotion.expires_at) return "-";
    return new Date(promotion.expires_at).toLocaleDateString(
      locale === "th" ? "th-TH" : "en-US",
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-light text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addPromotion")}
        </Button>
      </div>

      <DynamicFilterBar
        fields={filterFields}
        values={{ search: filters.search, isActive: filters.isActive }}
        onApply={filters.applyFilters}
        onReset={filters.resetFilters}
        searchLabel={tCommon("search")}
        resetLabel={tCommon("reset")}
      />

      {loading && promotions.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">{t("loading")}</p>
          </div>
        </div>
      ) : promotions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <Tag className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-300 text-lg">{t("noData")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotions.map((promotion) => {
              const expired = isExpired(promotion);
              return (
                <div
                  key={promotion.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-5 hover:shadow-xl transition-all hover:border-primary group relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="inline-block font-mono font-bold text-sm px-2 py-1 rounded-md bg-primary/10 text-primary tracking-wide">
                        {promotion.code}
                      </span>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base mt-2">
                        {promotion.name_i18n[locale]}
                      </h3>
                    </div>
                    <ActionButtons
                      onEdit={() => handleEdit(promotion)}
                      onDelete={() => handleDelete(promotion.id)}
                      editTitle={t("edit")}
                      deleteTitle={t("delete")}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("discountType")}:
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatDiscount(promotion)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("usedCount")}:
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {promotion.used_count} / {promotion.max_uses ?? "∞"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("expiresAt")}:
                      </span>
                      <span
                        className={`font-semibold ${
                          expired && promotion.is_active
                            ? "text-amber-600"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {formatExpiry(promotion)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("status")}:
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          promotion.is_active
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {promotion.is_active ? t("active") : t("inactive")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {promotions.length > 0 && (
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
          )}
        </>
      )}

      <EntityDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        title={editingPromotion ? t("editPromotion") : t("addPromotion")}
        fields={getPromotionFormConfig(t)}
        control={formControl}
        handleSubmit={formHandleSubmit}
        onSubmit={handleFormSubmit}
        errors={formErrors}
        loading={formLoading}
        error={formError}
        cancelText={t("cancel")}
        saveText={t("save")}
        savingText={t("saving")}
        maxWidth="2xl"
      />

      <ConfirmDialog />
    </div>
  );
}
