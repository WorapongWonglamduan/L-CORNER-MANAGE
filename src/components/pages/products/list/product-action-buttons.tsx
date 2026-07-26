import { Eye, Pencil, Trash2 } from "lucide-react";

interface ProductActionButtonsProps {
  onView?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  viewTitle?: string;
  editTitle?: string;
  deleteTitle?: string;
}

export function ProductActionButtons({
  onView,
  onEdit,
  onDelete,
  viewTitle = "ดูรายละเอียด",
  editTitle = "แก้ไข",
  deleteTitle = "ลบ",
}: ProductActionButtonsProps) {
  return (
    <div className="flex gap-1 sm:gap-1.5 shrink-0">
      {onView && (
        <button
          onClick={onView}
          className="p-2 sm:p-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all duration-200 group"
          title={viewTitle}
        >
          <Eye className="h-4 w-4 text-white/90 group-hover:text-white" />
        </button>
      )}
      <button
        onClick={onEdit}
        className="p-2 sm:p-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all duration-200 group"
        title={editTitle}
      >
        <Pencil className="h-4 w-4 text-white/90 group-hover:text-white" />
      </button>
      <button
        onClick={onDelete}
        className="p-2 sm:p-1.5 bg-white/10 hover:bg-red-500/90 backdrop-blur-sm rounded-lg transition-all duration-200 group"
        title={deleteTitle}
      >
        <Trash2 className="h-4 w-4 text-white/90 group-hover:text-white" />
      </button>
    </div>
  );
}
