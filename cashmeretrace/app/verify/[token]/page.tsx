import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ token: string }>;
};

/** Locale-stable QR path → Mongolian token page. */
export const instant = false;

export default async function VerifyTokenRedirect({ params }: Props) {
  const { token } = await params;
  redirect(`/mn/verify/${encodeURIComponent(token)}`);
}
