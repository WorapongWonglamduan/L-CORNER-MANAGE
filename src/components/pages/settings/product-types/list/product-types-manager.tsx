"use client";

import { FolderTree } from "lucide-react";
import { useTranslations } from "next-intl";
import { Pagination } from "@/components/ui/pagination";
import { DynamicFilterBar, getSearchAndActiveFilterFields } from "@/components/ui/dynamic-filter-bar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCardGrid, EntityCard } from "@/components/ui/entity-card-grid";
import { DetailRow } from "@/components/ui/detail-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { useProductTypesManager } from "./helper";
import { PRODUCTS_TYPES } from "@/constants/input-types";

const TYPE_LABEL_KEY: Record<string, string> = {
  [PRODUCTS_TYPES.PRODUCT]: "typeProduct",
  [PRODUCTS_TYPES.SEMI_FINISHED]: "typeSemiFinished",
  [PRODUCTS_TYPES.FINISHED_GOOD]: "typeFinishedGood",
  [PRODUCTS_TYPES.INGREDIENT]: "typeIngredient",
  [PRODUCTS_TYPES.CONTAINER]: "typeContainer",
};

// Read-only by design: the 4 product types a shop needs are provisioned
// once, automatically, when the shop is created (api/admin/shops/route.ts)
// and never change afterward — see api/product-types/route.ts's POST
// handler for why there's no add/edit/delete UI here.
export default function ProductTypesManager() {
  const {
    t,
    table: { types, loading, totalItems, totalPages },
    filters,
    pagination: { handlePageChange, handlePageSizeChange },
  } = useProductTypesManager();
  const tCommon = useTranslations("common");
  const { filterOptions } = filters;

  const filterFields = getSearchAndActiveFilterFields(t, tCommon);

  const getTypeBadgeColor = (id: string) => {
    const colors = [
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    ];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="space-y-4">
      <DynamicFilterBar
        fields={filterFields}
        values={{ search: filters.search, isActive: filters.isActive }}
        onApply={filters.applyFilters}
        onReset={filters.resetFilters}
        searchLabel={tCommon("search")}
        resetLabel={tCommon("reset")}
      />

      {loading && types.length === 0 ? (
        <LoadingSpinner label={t("loading")} />
      ) : types.length === 0 ? (
        <EmptyState icon={FolderTree} label={t("noData")} />
      ) : (
        <>
          <EntityCardGrid>
            {types.map((productType) => (
              <EntityCard key={productType.id}>
                <div className="mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    {productType.name_i18n.th}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {productType.name_i18n.en}
                  </p>
                </div>

                <div className="space-y-2">
                  <DetailRow label={t("code")} value={productType.code} bordered={false} />
                  <DetailRow
                    label={t("type")}
                    value={
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getTypeBadgeColor(productType.id)}`}
                      >
                        {t(TYPE_LABEL_KEY[productType.type] ?? "typeProduct")}
                      </span>
                    }
                  />
                  <DetailRow label={t("sortOrder")} value={productType.sort_order} />
                  <DetailRow
                    label={t("status")}
                    value={
                      <StatusBadge
                        active={productType.is_active}
                        activeLabel={t("active")}
                        inactiveLabel={t("inactive")}
                      />
                    }
                  />
                </div>
              </EntityCard>
            ))}
          </EntityCardGrid>

          <Pagination
            currentPage={filterOptions.page}
            totalPages={totalPages}
            itemsPerPage={filterOptions.pageSize}
            totalItems={totalItems}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handlePageSizeChange}
          />
        </>
      )}
    </div>
  );
}
