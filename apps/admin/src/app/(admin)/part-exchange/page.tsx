import type { Metadata } from "next";
import { Suspense } from "react";

import { EnquiryList } from "@/components/enquiries/enquiry-list";

export const metadata: Metadata = { title: "Part exchange" };

export default function PartExchangePage() {
  return (
    <Suspense>
      <EnquiryList mode="part-exchange" />
    </Suspense>
  );
}
