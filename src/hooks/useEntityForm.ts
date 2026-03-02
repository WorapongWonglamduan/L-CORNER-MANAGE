import { useState, useCallback } from "react";
import { useForm, UseFormProps } from "react-hook-form";
import { FieldValues } from "react-hook-form";

interface BaseEntity {
  id: string;
}

interface UseEntityFormOptions<T extends FieldValues, E extends BaseEntity> {
  formConfig: UseFormProps<T>;
  endpoint: string;
  transformToPayload: (data: T) => unknown;
  transformToForm: (entity: E) => T;
  onSuccess?: () => void;
  confirmDelete?: (options: {
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
  }) => Promise<boolean>;
}

interface UseEntityFormResult<T extends FieldValues, E extends BaseEntity> {
  control: ReturnType<typeof useForm<T>>["control"];
  handleSubmit: ReturnType<typeof useForm<T>>["handleSubmit"];
  errors: ReturnType<typeof useForm<T>>["formState"]["errors"];
  reset: ReturnType<typeof useForm<T>>["reset"];
  loading: boolean;
  error: string;
  editingEntity: E | null;
  dialogOpen: boolean;
  handleCreate: () => void;
  handleEdit: (entity: E) => void;
  handleDelete: (id: string, confirmMessage?: string) => Promise<void>;
  handleDialogClose: (refresh?: boolean) => void;
  handleFormSubmit: (data: T) => Promise<void>;
  setDialogOpen: (open: boolean) => void;
  setEditingEntity: (entity: E | null) => void;
}

export function useEntityForm<T extends FieldValues, E extends BaseEntity>(
  options: UseEntityFormOptions<T, E>,
): UseEntityFormResult<T, E> {
  const {
    formConfig,
    endpoint,
    transformToPayload,
    transformToForm,
    onSuccess,
    confirmDelete,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<E | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<T>(formConfig);

  const handleCreate = useCallback(() => {
    setEditingEntity(null);
    reset(formConfig.defaultValues as T);
    setError("");
    setDialogOpen(true);
  }, [reset, formConfig.defaultValues]);

  const handleEdit = useCallback(
    (entity: E) => {
      setEditingEntity(entity);
      reset(transformToForm(entity));
      setError("");
      setDialogOpen(true);
    },
    [reset, transformToForm],
  );

  const handleDelete = useCallback(
    async (
      id: string,
      confirmMessage = "Are you sure you want to delete this item?",
    ) => {
      const confirmed = confirmDelete
        ? await confirmDelete({
            title: "Confirm Delete",
            description: confirmMessage,
            confirmText: "Delete",
            cancelText: "Cancel",
          })
        : confirm(confirmMessage);

      if (!confirmed) return;

      try {
        setLoading(true);
        const response = await fetch(`${endpoint}/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete item");
        }

        onSuccess?.();
      } catch (err) {
        console.error("Error deleting item:", err);
        setError(err instanceof Error ? err.message : "Failed to delete item");
      } finally {
        setLoading(false);
      }
    },
    [endpoint, onSuccess, confirmDelete],
  );

  const handleDialogClose = useCallback(
    (refresh?: boolean) => {
      setDialogOpen(false);
      setEditingEntity(null);
      if (refresh) {
        onSuccess?.();
      }
    },
    [onSuccess],
  );

  const handleFormSubmit = useCallback(
    async (data: T) => {
      try {
        setLoading(true);
        setError("");

        const payload = transformToPayload(data);
        const url = editingEntity
          ? `${endpoint}/${editingEntity.id}`
          : endpoint;
        const method = editingEntity ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "An error occurred");
        }

        handleDialogClose(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [editingEntity, endpoint, transformToPayload, handleDialogClose],
  );

  return {
    control,
    handleSubmit,
    errors,
    reset,
    loading,
    error,
    editingEntity,
    dialogOpen,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDialogClose,
    handleFormSubmit,
    setDialogOpen,
    setEditingEntity,
  };
}
