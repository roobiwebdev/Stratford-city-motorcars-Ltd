import type { Metadata } from "next";
import { Suspense } from "react";

import { StockList } from "@/components/stock/stock-list";

export const metadata: Metadata = { title: "Cars" };

export default function StockPage() {
  return (
    <Suspense>
      <StockList />
    </Suspense>
  );
}
