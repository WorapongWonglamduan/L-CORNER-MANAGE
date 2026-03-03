import { Pencil, Trash2 } from "lucide-react";

interface ProductActionButtonsProps {
  onEdit: () => void;
  onDelete: () => void;
  editTitle?: string;
  deleteTitle?: string;
}

export function ProductActionButtons({
  onEdit,
  onDelete,
  editTitle = "แก้ไข",
  deleteTitle = "ลบ",
}: ProductActionButtonsProps) {
  return (
    <div className="flex gap-1.5">
      <button
        onClick={onEdit}
        className="p-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all duration-200 group"
        title={editTitle}
      >
        <Pencil className="h-4 w-4 text-white/90 group-hover:text-white" />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 bg-white/10 hover:bg-red-500/90 backdrop-blur-sm rounded-lg transition-all duration-200 group"
        title={deleteTitle}
      >
        <Trash2 className="h-4 w-4 text-white/90 group-hover:text-white" />
      </button>
    </div>
  );
}
