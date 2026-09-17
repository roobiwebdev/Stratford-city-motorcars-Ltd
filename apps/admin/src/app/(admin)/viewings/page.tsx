import type { Metadata } from "next";
import { Suspense } from "react";

import { Viewings } from "@/components/viewings/viewings";

export const metadata: Metadata = { title: "Viewings & test drives" };

export default function ViewingsPage() {
  return (
    <Suspense>
      <Viewings />
    </Suspense>
  );
}
