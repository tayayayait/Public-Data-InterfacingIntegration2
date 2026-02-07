import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function decodeHtml(html: string) {
  if (typeof DOMParser === "undefined" || !html) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.documentElement.textContent || html;
}
