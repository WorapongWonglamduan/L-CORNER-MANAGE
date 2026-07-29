"use client";

import { Plus, ShieldCheck, Lock, Pencil, Trash2 } from "lucide-react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { DynamicFilterBar, type FilterFieldConfig } from "@/components/ui/dynamic-filter-bar";
import { DynamicFormFields } from "@/components/dynamic-form/dynamic-form-fields";
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRolesManager } from "./helper";
import { getRoleFormConfig } from "./form/config";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/types/i18n";
import { ALL_PERMISSIONS } from "@/constants/permissions";

// Group `ALL_PERMISSIONS` by resource (the part before the ".") so the
// checkbox grid can be rendered one section per resource.
const GROUPED_PERMISSIONS = ALL_PERMISSIONS.reduce<Record<string, string[]>>(
  (acc, permission) => {
    const [resource] = permission.split(".");
    (acc[resource] ||= []).push(permission);
    return acc;
  },
  {},
);

export default function RolesManager() {
  const locale = useLocale() as Locale;
  const tPermissions = useTranslations("permissions");
  const tCommon = useTranslations("common");
  const {
    t,
    table: { items: roles, loading },
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
      editingItem: editingRole,
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
  } = useRolesManager();

  const isSystem = !!editingRole?.is_system;

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

  const permissionLabel = (permission: string) => {
    const [resource, action] = permission.split(".");
    return `${tPermissions(`resources.${resource}`)} — ${tPermissions(`actions.${action}`)}`;
  };

  const resourceLabel = (resource: string) => tPermissions(`resources.${resource}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
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
          className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-light text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addRole")}
        </Button>
      </div>

      {loading && roles.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">{t("loading")}</p>
          </div>
        </div>
      ) : roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <ShieldCheck className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-300 text-lg">{t("noData")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div
                key={role.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-5 hover:shadow-xl transition-all hover:border-primary group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0 flex items-center justify-center">
                      <ShieldCheck className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base">
                        {role.display_name_i18n[locale]}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {role.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(role)}
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                      title={t("edit")}
                    >
                      <Pencil className="h-4 w-4 text-primary" />
                    </button>
                    {!role.is_system && (
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title={t("delete")}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {role.description_i18n?.[locale] && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 pb-2">
                      {role.description_i18n[locale]}
                    </p>
                  )}
                  {role.is_system && (
                    <div className="flex items-center gap-1 pb-2">
                      <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        {t("systemRole")}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t("permissions")}:
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {role.permissions.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t("status")}:
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        role.is_active
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {role.is_active ? t("active") : t("inactive")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {roles.length > 0 && (
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

      {/*
        Custom dialog (not `EntityDialog`) so the permission checkbox grid —
        which `FieldConfig`/`FormBuilder` has no multi-select type for — can
        live in the SAME form as name/display name/description/is_active.
        Unlike a topping's product availability, a role's permission set is
        core to what the role is, so it's edited together in one action
        rather than as a secondary follow-up dialog.
      */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary text-xl font-bold">
              {editingRole ? t("editRole") : t("addRole")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={formHandleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DynamicFormFields
                fields={getRoleFormConfig(t, isSystem)}
                control={formControl}
                errors={formErrors}
                isLoading={formLoading}
              />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t("permissions")}
              </p>
              <Controller
                name="permissions"
                control={formControl}
                render={({ field: { value, onChange } }) => {
                  const selected: string[] = value || [];
                  const toggle = (permission: string) => {
                    onChange(
                      selected.includes(permission)
                        ? selected.filter((p) => p !== permission)
                        : [...selected, permission],
                    );
                  };
                  return (
                    <div className="space-y-4 max-h-[40vh] overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      {Object.entries(GROUPED_PERMISSIONS).map(
                        ([resource, permissions]) => (
                          <div key={resource}>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                              {resourceLabel(resource)}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {permissions.map((permission) => (
                                <div
                                  key={permission}
                                  className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <Input
                                    inputType={INPUT_TYPES.CHECKBOX}
                                    checked={selected.includes(permission)}
                                    onCheckedChange={() => toggle(permission)}
                                    disabled={formLoading}
                                  />
                                  <span
                                    className="text-sm text-gray-900 dark:text-white cursor-pointer"
                                    onClick={() => toggle(permission)}
                                  >
                                    {permissionLabel(permission)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  );
                }}
              />
            </div>

            {formError && (
              <div className="rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {formError}
                </p>
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose()}
                disabled={formLoading}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
                className="bg-gradient-to-r from-primary to-primary-light text-white"
              >
                {formLoading ? t("saving") : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}
