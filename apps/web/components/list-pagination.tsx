interface ListPaginationProps {
  page: number;
  total: number;
  limit: number;
  loading: boolean;
  label: string;
  onPageChange: (page: number) => void;
}

export function ListPagination({
  page,
  total,
  limit,
  loading,
  label,
  onPageChange,
}: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  return (
    <nav
      className="mt-4 flex items-center justify-between gap-3"
      aria-label={`${label} pagination`}
    >
      <button
        type="button"
        disabled={page === 1 || loading}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="h-10 rounded-xl border border-[#d5dfdb] bg-white px-4 text-xs font-bold text-[#39574f] transition hover:bg-[#f1f6f4] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Previous
      </button>
      <span className="text-xs font-semibold text-[#71827d]">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page === totalPages || loading}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        className="h-10 rounded-xl border border-[#d5dfdb] bg-white px-4 text-xs font-bold text-[#39574f] transition hover:bg-[#f1f6f4] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Next
      </button>
    </nav>
  );
}
