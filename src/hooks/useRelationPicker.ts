import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/lib/toast";

interface UseRelationPickerOptions<TEntity> {
  /** Builds the PUT endpoint for saving this entity's selection. */
  buildEndpoint: (entity: TEntity) => string;
  /** Key the selected ids are sent under in the PUT body, e.g. "role_ids". */
  bodyKey: string;
  /** Reads the entity's currently-selected ids when the picker opens. */
  getInitialIds: (entity: TEntity) => string[];
  /** Called after a successful save (e.g. to refetch the list). */
  onSaved?: () => void;
  /** Toast message shown on a successful save. */
  savedMessage: string;
  /** Fallback error message when the API doesn't return one. */
  errorFallback: string;
}

/**
 * Backs the "pick a set of related ids for one entity" dialogs — toppings'
 * available-products picker, and users' roles/branches pickers — which all
 * repeat the same shape: open with an entity, toggle checkboxes, PUT the
 * selected ids, close on success. Pair with `RelationPickerDialog` for the
 * rendered UI.
 */
export function useRelationPicker<TEntity extends { id: string }>(
  options: UseRelationPickerOptions<TEntity>,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [entity, setEntity] = useState<TEntity | null>(null);
  const [saving, setSaving] = useState(false);
  const { watch, setValue, reset } = useForm<{ selectedIds: string[] }>({
    defaultValues: { selectedIds: [] },
  });
  const selectedIds = watch("selectedIds");

  const open = (target: TEntity) => {
    setEntity(target);
    reset({ selectedIds: options.getInitialIds(target) });
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setEntity(null);
    reset({ selectedIds: [] });
  };

  const toggle = (id: string) => {
    setValue(
      "selectedIds",
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  const save = async () => {
    if (!entity) return;
    try {
      setSaving(true);
      const response = await fetch(options.buildEndpoint(entity), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [options.bodyKey]: selectedIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || options.errorFallback);
      }

      toast.success(options.savedMessage);
      close();
      options.onSaved?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : options.errorFallback;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return { isOpen, entity, selectedIds, saving, open, close, toggle, save };
}
