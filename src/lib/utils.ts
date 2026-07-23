import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Pull a displayable message out of an unknown thrown value (ApiError, Error, …). */
export function errorMessage(err: unknown, fallback = "Please try again") {
  return err instanceof Error && err.message ? err.message : fallback;
}
