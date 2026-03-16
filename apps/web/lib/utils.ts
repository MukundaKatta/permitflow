import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function daysUntil(dateString: string): number {
  const target = new Date(dateString);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    not_started: "bg-gray-100 text-gray-800",
    in_progress: "bg-blue-100 text-blue-800",
    submitted: "bg-yellow-100 text-yellow-800",
    under_review: "bg-purple-100 text-purple-800",
    approved: "bg-green-100 text-green-800",
    denied: "bg-red-100 text-red-800",
    expired: "bg-orange-100 text-orange-800",
    renewal_needed: "bg-amber-100 text-amber-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function priorityLabel(priority: number): string {
  if (priority >= 9) return "Critical";
  if (priority >= 7) return "High";
  if (priority >= 4) return "Medium";
  return "Low";
}

export function priorityColor(priority: number): string {
  if (priority >= 9) return "text-red-600";
  if (priority >= 7) return "text-orange-600";
  if (priority >= 4) return "text-yellow-600";
  return "text-gray-500";
}
