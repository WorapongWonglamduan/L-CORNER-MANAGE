"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUsersManager, AppUser } from "./helper";
import { getUserFormConfig } from "../form/config";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/types/i18n";
import { toast } from "@/lib/toast";

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

  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [rolesUser, setRolesUser] = useState<AppUser | null>(null);
  const [savingRoles, setSavingRoles] = useState(false);
  const { watch, setValue, reset } = useForm<{ selectedRoleIds: string[] }>({
    defaultValues: { selectedRoleIds: [] },
  });
  const selectedRoleIds = watch("selectedRoleIds");

  const handleOpenRoles = (user: AppUser) => {
    setRolesUser(user);
    reset({ selectedRoleIds: user.user_roles.map((ur) => ur.role_id) });
    setRolesDialogOpen(true);
  };

  const handleCloseRoles = () => {
    setRolesDialogOpen(false);
    setRolesUser(null);
    reset({ selectedRoleIds: [] });
  };

  const toggleRoleId = (id: string) => {
    setValue(
      "selectedRoleIds",
      selectedRoleIds.includes(id)
        ? selectedRoleIds.filter((r) => r !== id)
        : [...selectedRoleIds, id],
    );
  };

  const handleSaveRoles = async () => {
    if (!rolesUser) return;
    try {
      setSavingRoles(true);
      const response = await fetch(`/api/users/${rolesUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_ids: selectedRoleIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("saving"));
      }

      toast.success(t("save"));
      handleCloseRoles();
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("saving");
      toast.error(message);
    } finally {
      setSavingRoles(false);
    }
  };

  const [branchesDialogOpen, setBranchesDialogOpen] = useState(false);
  const [branchesUser, setBranchesUser] = useState<AppUser | null>(null);
  const [savingBranches, setSavingBranches] = useState(false);
  const {
    watch: watchBranches,
    setValue: setBranchesValue,
    reset: resetBranches,
  } = useForm<{ selectedWarehouseIds: string[] }>({
    defaultValues: { selectedWarehouseIds: [] },
  });
  const selectedWarehouseIds = watchBranches("selectedWarehouseIds");

  const handleOpenBranches = (user: AppUser) => {
    setBranchesUser(user);
    resetBranches({
      selectedWarehouseIds: user.user_warehouses.map((uw) => uw.warehouse_id),
    });
    setBranchesDialogOpen(true);
  };

  const handleCloseBranches = () => {
    setBranchesDialogOpen(false);
    setBranchesUser(null);
    resetBranches({ selectedWarehouseIds: [] });
  };

  const toggleWarehouseId = (id: string) => {
    setBranchesValue(
      "selectedWarehouseIds",
      selectedWarehouseIds.includes(id)
        ? selectedWarehouseIds.filter((w) => w !== id)
        : [...selectedWarehouseIds, id],
    );
  };

  const handleSaveBranches = async () => {
    if (!branchesUser) return;
    try {
      setSavingBranches(true);
      const response = await fetch(`/api/users/${branchesUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouse_ids: selectedWarehouseIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("saving"));
      }

      toast.success(t("save"));
      handleCloseBranches();
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("saving");
      toast.error(message);
    } finally {
      setSavingBranches(false);
    }
  };

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
                        <DropdownMenuItem onClick={() => handleOpenRoles(user)}>
                          <ShieldCheck className="h-4 w-4" />
                          {t("roles")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenBranches(user)}
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

      <Dialog
        open={rolesDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseRoles();
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary text-xl font-bold">
              {t("roles")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {roles.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                {t("noData")}
              </p>
            ) : (
              roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Input
                    inputType={INPUT_TYPES.CHECKBOX}
                    checked={selectedRoleIds.includes(role.id)}
                    onCheckedChange={() => toggleRoleId(role.id)}
                  />
                  <span
                    className="text-sm text-gray-900 dark:text-white cursor-pointer"
                    onClick={() => toggleRoleId(role.id)}
                  >
                    {role.display_name_i18n[locale]}{" "}
                    <span className="text-gray-500 dark:text-gray-400">({role.name})</span>
                  </span>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseRoles}
              disabled={savingRoles}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSaveRoles}
              disabled={savingRoles}
              className="bg-gradient-to-r from-primary to-primary-light text-white"
            >
              {savingRoles ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={branchesDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseBranches();
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary text-xl font-bold">
              {t("branches")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {warehouses.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                {t("noData")}
              </p>
            ) : (
              warehouses.map((warehouse) => (
                <div
                  key={warehouse.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Input
                    inputType={INPUT_TYPES.CHECKBOX}
                    checked={selectedWarehouseIds.includes(warehouse.id)}
                    onCheckedChange={() => toggleWarehouseId(warehouse.id)}
                  />
                  <span
                    className="text-sm text-gray-900 dark:text-white cursor-pointer"
                    onClick={() => toggleWarehouseId(warehouse.id)}
                  >
                    {warehouse.name_i18n[locale]}{" "}
                    <span className="text-gray-500 dark:text-gray-400">({warehouse.code})</span>
                  </span>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseBranches}
              disabled={savingBranches}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSaveBranches}
              disabled={savingBranches}
              className="bg-gradient-to-r from-primary to-primary-light text-white"
            >
              {savingBranches ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}
