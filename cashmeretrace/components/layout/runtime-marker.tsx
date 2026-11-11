import { Suspense } from "react";
import { connection } from "next/server";

async function Connection() {
  await connection();
  return null;
}

/**
 * Tells Next.js that localized pages intentionally read the URL at request
 * time, so `generateMetadata` can keep using the locale without a dev error.
 */
export default function RuntimeMarker() {
  return (
    <Suspense fallback={null}>
      <Connection />
    </Suspense>
  );
}
