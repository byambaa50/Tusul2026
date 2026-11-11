import { redirect } from "next/navigation";

/** Bare URL → Mongolian login (mn-first, NFR-19). */
export const instant = false;

export default function RootPage() {
  redirect("/mn/login");
}
