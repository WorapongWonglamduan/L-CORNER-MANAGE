import { Button } from "@/components/ui/button";
import { Input, INPUT_TYPES } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface RelationPickerItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface RelationPickerDialogProps {
  isOpen: boolean;
  title: string;
  items: RelationPickerItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  emptyLabel: string;
  cancelLabel: string;
  saveLabel: string;
  savingLabel: string;
}

/** Pairs with `useRelationPicker` — renders a checkbox list of `items`, one
 * PUT-and-close save action. Shared by toppings' available-products picker
 * and users' roles/branches pickers. */
export function RelationPickerDialog({
  isOpen,
  title,
  items,
  selectedIds,
  onToggle,
  onClose,
  onSave,
  saving,
  emptyLabel,
  cancelLabel,
  saveLabel,
  savingLabel,
}: RelationPickerDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary text-xl font-bold">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
              {emptyLabel}
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Input
                  inputType={INPUT_TYPES.CHECKBOX}
                  checked={selectedIds.includes(item.id)}
                  onCheckedChange={() => onToggle(item.id)}
                />
                <span
                  className="text-sm text-gray-900 dark:text-white cursor-pointer"
                  onClick={() => onToggle(item.id)}
                >
                  {item.label}
                  {item.sublabel && (
                    <span className="text-gray-500 dark:text-gray-400"> ({item.sublabel})</span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="bg-gradient-to-r from-primary to-primary-light text-white"
          >
            {saving ? savingLabel : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
