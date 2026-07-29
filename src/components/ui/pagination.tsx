import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { Input, INPUT_TYPES } from "./Input";
import { useTranslations } from "next-intl";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  onItemsPerPageChange,
}: PaginationProps) {
  const t = useTranslations("pagination");
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span className="hidden sm:inline">{t("show")}</span>
        <Input
          inputType={INPUT_TYPES.SELECT}
          value={itemsPerPage}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const value = Number(e.target.value);
            if (value) onItemsPerPageChange(value);
          }}
          options={[
            { value: 5, label: "5" },
            { value: 10, label: "10" },
            { value: 20, label: "20" },
            { value: 50, label: "50" },
          ]}
          containerClassName="w-20"
        />
        <span className="hidden sm:inline">
          {t("itemsPerPage")} ({startItem}-{endItem} {t("of")} {totalItems})
        </span>
        <span className="sm:hidden">
          {startItem}-{endItem}/{totalItems}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">{t("previous")}</span>
        </Button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={page === "..."}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                page === currentPage
                  ? "bg-gradient-to-r from-primary to-primary-light text-white shadow-md"
                  : page === "..."
                  ? "cursor-default text-gray-400 dark:text-gray-500"
                  : "hover:bg-primary/10 text-gray-700 dark:text-gray-300"
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <span className="hidden sm:inline mr-1">{t("next")}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
