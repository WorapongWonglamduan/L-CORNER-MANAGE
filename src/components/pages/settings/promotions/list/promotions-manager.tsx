"use client";

import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { DynamicFilterBar, getSearchAndActiveFilterFields } from "@/components/ui/dynamic-filter-bar";
import { ActionButtons } from "@/components/ui/action-buttons";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCardGrid, EntityCard } from "@/components/ui/entity-card-grid";
import { DetailRow } from "@/components/ui/detail-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { usePromotionsManager } from "./helper";
import { getPromotionFormConfig } from "../form/config";
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

  const filterFields = getSearchAndActiveFilterFields(t, tCommon);

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
        <LoadingSpinner label={t("loading")} />
      ) : promotions.length === 0 ? (
        <EmptyState icon={Tag} label={t("noData")} />
      ) : (
        <>
          <EntityCardGrid>
            {promotions.map((promotion) => {
              const expired = isExpired(promotion);
              return (
                <EntityCard key={promotion.id}>
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
                    <DetailRow
                      label={t("discountType")}
                      value={formatDiscount(promotion)}
                      bordered={false}
                    />
                    <DetailRow
                      label={t("usedCount")}
                      value={`${promotion.used_count} / ${promotion.max_uses ?? "∞"}`}
                    />
                    <DetailRow
                      label={t("expiresAt")}
                      value={
                        <span
                          className={
                            expired && promotion.is_active
                              ? "text-amber-600"
                              : "text-gray-900 dark:text-white"
                          }
                        >
                          {formatExpiry(promotion)}
                        </span>
                      }
                    />
                    <DetailRow
                      label={t("status")}
                      value={
                        <StatusBadge
                          active={promotion.is_active}
                          activeLabel={t("active")}
                          inactiveLabel={t("inactive")}
                        />
                      }
                    />
                  </div>
                </EntityCard>
              );
            })}
          </EntityCardGrid>

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
