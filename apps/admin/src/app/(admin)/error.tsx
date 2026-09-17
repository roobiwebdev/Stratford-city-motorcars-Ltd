"use client";

import { PageBody, ErrorState } from "@/components/ui/page";

/** A screen that throws while rendering. Details stay in the console, not on screen. */
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageBody className="pt-10">
      <ErrorState
        title="Something went wrong on this screen"
        error={new Error("The page could not be shown. Nothing you saved before this was lost.")}
        onRetry={reset}
      />
    </PageBody>
  );
}
