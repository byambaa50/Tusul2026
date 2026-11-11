import { redirect } from "next/navigation";

/** Locale-stable QR path → Mongolian verification page. */
export const instant = false;

export default function VerifyRootRedirect() {
  redirect("/mn/verify");
}
