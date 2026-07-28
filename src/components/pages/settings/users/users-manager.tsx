"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, Users as UsersIcon, ShieldCheck, Warehouse as WarehouseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { DynamicFilterBar, type FilterFieldConfig } from "@/components/ui/dynamic-filter-bar";
import { ActionButtons } from "@/components/ui/action-buttons";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUsersManager, AppUser } from "./helper";
import { getUserFormConfig } from "./form/config";
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
  const { watch: watchBranches, setValue: setBranchesValue, reset: resetBranches } =
    useForm<{ selectedWarehouseIds: string[] }>({
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
          {t("addUser")}
        </Button>
      </div>

      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">{t("loading")}</p>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <UsersIcon className="h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">{t("noData")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all hover:border-primary group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0 flex items-center justify-center">
                      <UsersIcon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {user.full_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {user.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenRoles(user)}
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                      title={t("roles")}
                    >
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    </button>
                    <button
                      onClick={() => handleOpenBranches(user)}
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                      title={t("branches")}
                    >
                      <WarehouseIcon className="h-4 w-4 text-primary" />
                    </button>
                    <ActionButtons
                      onEdit={() => handleEdit(user)}
                      onDelete={() => handleDelete(user.id)}
                      editTitle={t("edit")}
                      deleteTitle={t("delete")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-600">
                      {t("email")}:
                    </span>
                    <span className="font-semibold text-gray-900 truncate max-w-[60%] text-right">
                      {user.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("roles")}:
                    </span>
                    <span className="font-semibold text-gray-900 text-right">
                      {user.user_roles.length > 0
                        ? user.user_roles
                            .map((ur) => ur.role.display_name_i18n[locale])
                            .join(", ")
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("branches")}:
                    </span>
                    <span className="font-semibold text-gray-900 text-right">
                      {user.user_warehouses.length > 0
                        ? user.user_warehouses.map((uw) => uw.warehouse.code).join(", ")
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t("status")}:
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {user.is_active ? t("active") : t("inactive")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

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
              <p className="text-sm text-gray-500 py-4 text-center">
                {t("noData")}
              </p>
            ) : (
              roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50"
                >
                  <Input
                    inputType={INPUT_TYPES.CHECKBOX}
                    checked={selectedRoleIds.includes(role.id)}
                    onCheckedChange={() => toggleRoleId(role.id)}
                  />
                  <span
                    className="text-sm text-gray-900 cursor-pointer"
                    onClick={() => toggleRoleId(role.id)}
                  >
                    {role.display_name_i18n[locale]}{" "}
                    <span className="text-gray-500">({role.name})</span>
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
              <p className="text-sm text-gray-500 py-4 text-center">
                {t("noData")}
              </p>
            ) : (
              warehouses.map((warehouse) => (
                <div
                  key={warehouse.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50"
                >
                  <Input
                    inputType={INPUT_TYPES.CHECKBOX}
                    checked={selectedWarehouseIds.includes(warehouse.id)}
                    onCheckedChange={() => toggleWarehouseId(warehouse.id)}
                  />
                  <span
                    className="text-sm text-gray-900 cursor-pointer"
                    onClick={() => toggleWarehouseId(warehouse.id)}
                  >
                    {warehouse.name_i18n[locale]}{" "}
                    <span className="text-gray-500">({warehouse.code})</span>
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
