import { Pencil, Trash2 } from "lucide-react";

interface ActionButtonsProps {
  onEdit: () => void;
  onDelete: () => void;
  editTitle?: string;
  deleteTitle?: string;
}

export function ActionButtons({
  onEdit,
  onDelete,
  editTitle = "แก้ไข",
  deleteTitle = "ลบ",
}: ActionButtonsProps) {
  return (
    <div className="flex gap-1">
      <button
        onClick={onEdit}
        className="p-2 hover:bg-primary/10 rounded-lg transition-all hover:scale-105 active:scale-95"
        title={editTitle}
      >
        <Pencil className="h-4 w-4 text-primary" />
      </button>
      <button
        onClick={onDelete}
        className="p-2 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-all hover:scale-105 active:scale-95"
        title={deleteTitle}
      >
        <Trash2 className="h-4 w-4 text-red-600" />
      </button>
    </div>
  );
}
