import { useTranslations } from "next-intl";
import { useEntityList } from "@/hooks/useEntityList";
import { useEntityForm } from "@/hooks/useEntityForm";
import { FilterOptions } from "@/hooks/usePagination";

export interface UnitFormData {
  name_th: string;
  name_en: string;
  abbreviation_th: string;
  abbreviation_en: string;
  unit_type?: string;
  is_base_unit: boolean;
  is_active: boolean;
}

interface Unit {
  id: string;
  name_i18n: {
    th: string;
    en: string;
  };
  abbreviation_i18n: {
    th: string;
    en: string;
  };
  unit_type: string | null;
  is_base_unit: boolean;
  is_active: boolean;
  created_at: string;
}

interface UnitsFilterOptions extends FilterOptions {
  search?: string;
  isActive?: boolean;
}

export function useUnitsManager() {
  const t = useTranslations("settings.units");

  const {
    items: units,
    loading,
    totalItems,
    totalPages,
    filterOptions,
    handlePageChange,
    handlePageSizeChange,
    handleSearchChange,
    refetch,
  } = useEntityList<Unit, UnitsFilterOptions>({
    endpoint: "/api/units",
    initialFilters: {
      search: "",
    },
  });

  const {
    control,
    handleSubmit,
    errors,
    loading: formLoading,
    error: formError,
    editingEntity: editingUnit,
    dialogOpen,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDialogClose,
    handleFormSubmit,
  } = useEntityForm<UnitFormData, Unit>({
    formConfig: {
      defaultValues: {
        name_th: "",
        name_en: "",
        abbreviation_th: "",
        abbreviation_en: "",
        unit_type: "",
        is_base_unit: false,
        is_active: true,
      },
    },
    endpoint: "/api/units",
    transformToPayload: (data) => ({
      name_i18n: {
        th: data.name_th,
        en: data.name_en,
      },
      abbreviation_i18n: {
        th: data.abbreviation_th,
        en: data.abbreviation_en,
      },
      unit_type: data.unit_type || null,
      is_base_unit: data.is_base_unit,
      is_active: data.is_active,
    }),
    transformToForm: (unit) => ({
      name_th: unit.name_i18n.th,
      name_en: unit.name_i18n.en,
      abbreviation_th: unit.abbreviation_i18n.th,
      abbreviation_en: unit.abbreviation_i18n.en,
      unit_type: unit.unit_type || "",
      is_base_unit: unit.is_base_unit,
      is_active: unit.is_active,
    }),
    onSuccess: refetch,
  });

  return {
    t,
    units,
    allUnits: units,
    loading,
    searchQuery: filterOptions.search || "",
    setSearchQuery: handleSearchChange,
    dialogOpen,
    editingUnit,
    filterOptions,
    totalItems,
    totalPages,
    handleCreate,
    handleEdit,
    handleDelete: (id: string) => handleDelete(id, t("confirmDelete")),
    handleDialogClose,
    handleFormSubmit,
    handlePageChange,
    handlePageSizeChange,
    formControl: control,
    formHandleSubmit: handleSubmit,
    formErrors: errors,
    formLoading,
    formError,
  };
}
