import type { Metadata } from "next";
import { Suspense } from "react";

import { CustomerList } from "@/components/customers/customers";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <Suspense>
      <CustomerList />
    </Suspense>
  );
}
