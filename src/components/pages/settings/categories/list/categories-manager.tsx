"use client";

import { Plus, FolderTree } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { useCategoriesManager } from "./helper";
import { getCategoryFormConfig } from "../form/config";

export default function CategoriesManager() {
  const { t, table, filters, pagination, actions, modal, form, ConfirmDialog } =
    useCategoriesManager();
  const tCommon = useTranslations("common");
  const { categories, allCategories, loading } = table;
  const { handleCreate, handleEdit, handleDelete } = actions;

  const filterFields = getSearchAndActiveFilterFields(t, tCommon);

  const getParentName = (parentId?: string) => {
    if (!parentId) return "-";
    const parent = allCategories.find((cat) => cat.id === parentId);
    return parent ? parent.name_i18n.th : "-";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-primary to-primary-light text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addCategory")}
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

      {loading && categories.length === 0 ? (
        <LoadingSpinner label={t("loading")} />
      ) : categories.length === 0 ? (
        <EmptyState icon={FolderTree} label={t("noData")} />
      ) : (
        <>
          <EntityCardGrid>
            {categories.map((category) => (
              <EntityCard key={category.id}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary/20 transition-colors">
                      <FolderTree className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base">
                        {category.name_i18n.th}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {category.name_i18n.en}
                      </p>
                    </div>
                  </div>
                  <ActionButtons
                    onEdit={() => handleEdit(category)}
                    onDelete={() => handleDelete(category.id)}
                    editTitle={t("edit") || "แก้ไข"}
                    deleteTitle={t("delete") || "ลบ"}
                  />
                </div>

                <div className="space-y-2">
                  <DetailRow
                    label={t("parentCategory")}
                    value={getParentName(category.parent_id)}
                    bordered={false}
                  />
                  <DetailRow label={t("sortOrder")} value={category.sort_order} />
                  <DetailRow
                    label={t("status")}
                    value={
                      <StatusBadge
                        active={category.is_active}
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
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            itemsPerPage={pagination.pageSize}
            totalItems={pagination.totalItems}
            onPageChange={pagination.onPageChange}
            onItemsPerPageChange={pagination.onPageSizeChange}
          />
        </>
      )}

      <EntityDialog
        open={modal.isOpen}
        onClose={modal.onClose}
        title={modal.editingCategory ? t("editCategory") : t("addCategory")}
        fields={getCategoryFormConfig(
          t,
          allCategories.filter((cat) => cat.id !== modal.editingCategory?.id),
        )}
        control={form.control}
        handleSubmit={form.handleSubmit}
        onSubmit={form.onSubmit}
        errors={form.errors}
        loading={form.loading}
        error={form.error}
        cancelText={t("cancel")}
        saveText={t("save")}
        savingText={t("saving")}
        maxWidth="2xl"
      />

      <ConfirmDialog />
    </div>
  );
}
