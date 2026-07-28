import { Eye, MoreVertical, Pencil, Power, PowerOff, Trash2, Warehouse } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProductActionButtonsProps {
  onView?: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onManageWarehouses?: () => void;
  onToggleActive?: () => void;
  isActive?: boolean;
  viewTitle?: string;
  editTitle?: string;
  deleteTitle?: string;
  manageWarehousesTitle?: string;
  activateTitle?: string;
  deactivateTitle?: string;
}

export function ProductActionButtons({
  onView,
  onEdit,
  onDelete,
  onManageWarehouses,
  onToggleActive,
  isActive = true,
  viewTitle = "ดูรายละเอียด",
  editTitle = "แก้ไข",
  deleteTitle = "ลบ",
  manageWarehousesTitle = "จัดการคลัง",
  activateTitle = "เปิดใช้งาน",
  deactivateTitle = "ปิดใช้งาน",
}: ProductActionButtonsProps) {
  const hasOverflowActions = !!(onView || onManageWarehouses || onToggleActive);

  return (
    <div className="flex gap-1 sm:gap-1.5 shrink-0">
      {hasOverflowActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 sm:p-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 group"
              title="เพิ่มเติม"
            >
              <MoreVertical className="h-4 w-4 text-white/90 group-hover:text-white" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onView && (
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4" />
                {viewTitle}
              </DropdownMenuItem>
            )}
            {onManageWarehouses && (
              <DropdownMenuItem onClick={onManageWarehouses}>
                <Warehouse className="h-4 w-4" />
                {manageWarehousesTitle}
              </DropdownMenuItem>
            )}
            {onToggleActive && (
              <DropdownMenuItem onClick={onToggleActive}>
                {isActive ? (
                  <PowerOff className="h-4 w-4" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                {isActive ? deactivateTitle : activateTitle}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <button
        onClick={onEdit}
        className="p-2 sm:p-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all duration-200 group"
        title={editTitle}
      >
        <Pencil className="h-4 w-4 text-white/90 group-hover:text-white" />
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          className="p-2 sm:p-1.5 bg-white/10 hover:bg-red-500/90 backdrop-blur-sm rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 group"
          title={deleteTitle}
        >
          <Trash2 className="h-4 w-4 text-white/90 group-hover:text-white" />
        </button>
      )}
    </div>
  );
}
