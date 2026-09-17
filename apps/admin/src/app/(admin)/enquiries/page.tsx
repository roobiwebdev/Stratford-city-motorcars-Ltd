import type { Metadata } from "next";
import { Suspense } from "react";

import { EnquiryList } from "@/components/enquiries/enquiry-list";

export const metadata: Metadata = { title: "Enquiries" };

export default function EnquiriesPage() {
  return (
    <Suspense>
      <EnquiryList />
    </Suspense>
  );
}
