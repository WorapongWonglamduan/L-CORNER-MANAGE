"use client";

import {
  Plus,
  Users as UsersIcon,
  ShieldCheck,
  Warehouse as WarehouseIcon,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  DynamicFilterBar,
  getSearchAndActiveFilterFields,
} from "@/components/ui/dynamic-filter-bar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCardGrid, EntityCard } from "@/components/ui/entity-card-grid";
import { DetailRow } from "@/components/ui/detail-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { RelationPickerDialog } from "@/components/ui/relation-picker-dialog";
import { useRelationPicker } from "@/hooks/useRelationPicker";
import { useUsersManager, AppUser } from "./helper";
import { getUserFormConfig } from "../form/config";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/types/i18n";

export default function UsersManager() {
  const locale = useLocale() as Locale;
  const tCommon = useTranslations("common");
  const {
    t,
    table: { items: users, loading },
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
      editingItem: editingUser,
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
      dataLoading,
    },
    roles,
    warehouses,
    refetch,
  } = useUsersManager();

  const filterFields = getSearchAndActiveFilterFields(t, tCommon);

  const rolesPicker = useRelationPicker<AppUser>({
    buildEndpoint: (user) => `/api/users/${user.id}`,
    bodyKey: "role_ids",
    getInitialIds: (user) => user.user_roles.map((ur) => ur.role_id),
    onSaved: refetch,
    savedMessage: t("save"),
    errorFallback: t("saving"),
  });

  const branchesPicker = useRelationPicker<AppUser>({
    buildEndpoint: (user) => `/api/users/${user.id}`,
    bodyKey: "warehouse_ids",
    getInitialIds: (user) => user.user_warehouses.map((uw) => uw.warehouse_id),
    onSaved: refetch,
    savedMessage: t("save"),
    errorFallback: t("saving"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-light text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addUser")}
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

      {loading && users.length === 0 ? (
        <LoadingSpinner label={t("loading")} />
      ) : users.length === 0 ? (
        <EmptyState icon={UsersIcon} label={t("noData")} />
      ) : (
        <>
          <EntityCardGrid>
            {users.map((user) => (
              <EntityCard key={user.id}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0 flex items-center justify-center">
                      <UsersIcon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base">
                        {user.full_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                          title={t("actions")}
                        >
                          <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => rolesPicker.open(user)}>
                          <ShieldCheck className="h-4 w-4" />
                          {t("roles")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => branchesPicker.open(user)}
                        >
                          <WarehouseIcon className="h-4 w-4" />
                          {t("branches")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                          <Pencil className="h-4 w-4" />
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t("email")}:</span>
                    <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[60%] text-right">
                      {user.email}
                    </span>
                  </div>
                  <DetailRow
                    label={t("roles")}
                    value={
                      user.user_roles.length > 0
                        ? user.user_roles
                            .map((ur) => ur.role.display_name_i18n[locale])
                            .join(", ")
                        : "-"
                    }
                  />
                  <DetailRow
                    label={t("branches")}
                    value={
                      user.user_warehouses.length > 0
                        ? user.user_warehouses.map((uw) => uw.warehouse.code).join(", ")
                        : "-"
                    }
                  />
                  <DetailRow
                    label={t("status")}
                    value={
                      <StatusBadge
                        active={user.is_active}
                        activeLabel={t("active")}
                        inactiveLabel={t("inactive")}
                      />
                    }
                  />
                </div>
              </EntityCard>
            ))}
          </EntityCardGrid>

          {users.length > 0 && (
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
        title={editingUser ? t("editUser") : t("addUser")}
        fields={getUserFormConfig(t, !!editingUser)}
        control={formControl}
        handleSubmit={formHandleSubmit}
        onSubmit={handleFormSubmit}
        errors={formErrors}
        loading={formLoading || dataLoading}
        error={formError}
        cancelText={t("cancel")}
        saveText={t("save")}
        savingText={t("saving")}
        maxWidth="2xl"
      />

      <RelationPickerDialog
        isOpen={rolesPicker.isOpen}
        title={t("roles")}
        items={roles.map((role) => ({
          id: role.id,
          label: role.display_name_i18n[locale],
          sublabel: role.name,
        }))}
        selectedIds={rolesPicker.selectedIds}
        onToggle={rolesPicker.toggle}
        onClose={rolesPicker.close}
        onSave={rolesPicker.save}
        saving={rolesPicker.saving}
        emptyLabel={t("noData")}
        cancelLabel={t("cancel")}
        saveLabel={t("save")}
        savingLabel={t("saving")}
      />

      <RelationPickerDialog
        isOpen={branchesPicker.isOpen}
        title={t("branches")}
        items={warehouses.map((warehouse) => ({
          id: warehouse.id,
          label: warehouse.name_i18n[locale],
          sublabel: warehouse.code,
        }))}
        selectedIds={branchesPicker.selectedIds}
        onToggle={branchesPicker.toggle}
        onClose={branchesPicker.close}
        onSave={branchesPicker.save}
        saving={branchesPicker.saving}
        emptyLabel={t("noData")}
        cancelLabel={t("cancel")}
        saveLabel={t("save")}
        savingLabel={t("saving")}
      />

      <ConfirmDialog />
    </div>
  );
}
