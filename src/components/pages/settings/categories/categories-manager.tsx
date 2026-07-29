"use client";

import { Plus, FolderTree } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { DynamicFilterBar, type FilterFieldConfig } from "@/components/ui/dynamic-filter-bar";
import { ActionButtons } from "@/components/ui/action-buttons";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { useCategoriesManager } from "./helper";
import { getCategoryFormConfig } from "./form/config";

export default function CategoriesManager() {
  const { t, table, filters, pagination, actions, modal, form, ConfirmDialog } =
    useCategoriesManager();
  const tCommon = useTranslations("common");
  const { categories, allCategories, loading } = table;
  const { handleCreate, handleEdit, handleDelete } = actions;

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

  const getParentName = (parentId?: string) => {
    if (!parentId) return "-";
    const parent = allCategories.find((cat) => cat.id === parentId);
    return parent ? parent.name_i18n.th : "-";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <DynamicFilterBar
          fields={filterFields}
          values={{ search: filters.search, isActive: filters.isActive }}
          onApply={filters.applyFilters}
          onReset={filters.resetFilters}
          searchLabel={tCommon("search")}
          resetLabel={tCommon("reset")}
          className="w-full"
        />
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-primary to-primary-light text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addCategory")}
        </Button>
      </div>

      {loading && categories.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">{t("loading")}</p>
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <FolderTree className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-300 text-lg">{t("noData")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-5 hover:shadow-xl transition-all hover:border-primary group relative"
              >
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
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t("parentCategory")}:
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {getParentName(category.parent_id)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t("sortOrder")}:
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {category.sort_order}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t("status")}:
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        category.is_active
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      }`}
                    >
                      {category.is_active ? t("active") : t("inactive")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

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
