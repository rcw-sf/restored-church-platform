import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  itemName?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemName = "items",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  return (
    <div
      className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 bg-base-100 border-t border-base-200"
      data-testid="pagination-container"
    >
      <div className="text-sm opacity-70">
        Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
        <span className="font-semibold">{endIndex}</span> of{" "}
        <span className="font-semibold">{totalItems}</span> {itemName}
      </div>
      <div className="join">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="join-item btn btn-outline btn-sm"
          data-testid="prev-page-button"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          className="join-item btn btn-outline btn-sm bg-base-100 cursor-default pointer-events-none"
          data-testid="current-page-label"
        >
          Page {currentPage} of {totalPages}
        </button>
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="join-item btn btn-outline btn-sm"
          data-testid="next-page-button"
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
