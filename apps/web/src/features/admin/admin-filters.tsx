import type { AdminSearchParams } from "./search-params";

type AdminFiltersProps = {
  searchParams: AdminSearchParams;
};

export const AdminFilters = ({ searchParams }: AdminFiltersProps) => {
  return (
    <form className="flex flex-col sm:flex-row gap-4" method="get">
      <div className="relative flex-1">
        <input
          type="search"
          name="search"
          placeholder="Search users by email..."
          defaultValue={searchParams.search}
          className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 pl-10 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
        <span className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2">
          ⌕
        </span>
      </div>
      <input type="hidden" name="page" value="1" />
      <select
        name="filter"
        defaultValue={searchParams.filter}
        className="border-input bg-background h-9 rounded-md border px-3 text-sm"
      >
        <option value="all">All Users</option>
        <option value="premium">Premium Only</option>
        <option value="regular">Regular Only</option>
      </select>
      <select
        name="sortBy"
        defaultValue={searchParams.sortBy}
        className="border-input bg-background h-9 rounded-md border px-3 text-sm"
      >
        <option value="createdAt">Created Date</option>
        <option value="bookmarks">Bookmarks Count</option>
        <option value="clicks">Clicks Count</option>
      </select>
      <select
        name="order"
        defaultValue={searchParams.order}
        className="border-input bg-background h-9 rounded-md border px-3 text-sm"
      >
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>
      <button
        type="submit"
        className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-4 text-sm font-medium"
      >
        Apply
      </button>
    </form>
  );
};
