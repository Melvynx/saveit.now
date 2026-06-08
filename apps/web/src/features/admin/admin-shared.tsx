import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AdminStatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: ReactNode;
  description?: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-xs font-medium">
          {title}
        </CardTitle>
        <Icon className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {description ? (
          <p className="text-muted-foreground text-xs">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdminSearchInput({
  name = "search",
  defaultValue,
  placeholder = "Search...",
  className,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-64 flex-1", className)}>
      <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
      <Input
        type="search"
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="pl-9"
      />
    </div>
  );
}

export function AdminNativeSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex min-w-36 flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AdminStatusBadge({ value }: { value?: string | null }) {
  const normalized = value ?? "unknown";
  const variant =
    normalized === "active" ||
    normalized === "admin" ||
    normalized === "premium" ||
    normalized === "verified"
      ? "default"
      : normalized === "banned" || normalized === "unverified"
        ? "destructive"
        : "outline";

  return <Badge variant={variant}>{normalized}</Badge>;
}

export function AdminPagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  getHref,
  itemLabel = "users",
}: {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  getHref: (page: number) => string;
  itemLabel?: string;
}) {
  const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">
        {total === 0
          ? `No ${itemLabel} found`
          : `Showing ${startItem.toLocaleString()}-${endItem.toLocaleString()} of ${total.toLocaleString()} ${itemLabel}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          asChild={currentPage > 1}
        >
          {currentPage > 1 ? (
            <a href={getHref(currentPage - 1)}>
              <ChevronLeft className="size-4" />
              Previous
            </a>
          ) : (
            <span>
              <ChevronLeft className="size-4" />
              Previous
            </span>
          )}
        </Button>
        <span className="text-muted-foreground min-w-24 text-center text-sm">
          Page {currentPage} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          asChild={currentPage < totalPages}
        >
          {currentPage < totalPages ? (
            <a href={getHref(currentPage + 1)}>
              Next
              <ChevronRight className="size-4" />
            </a>
          ) : (
            <span>
              Next
              <ChevronRight className="size-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

export function AdminTableSkeleton({
  headers,
  rows = 6,
}: {
  headers: string[];
  rows?: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {headers.map((header) => (
                <TableCell key={header}>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
