import type { Metadata } from "next";

import { VehicleEditor } from "@/components/stock/vehicle-editor";

export const metadata: Metadata = { title: "Car" };

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VehicleEditor id={id} />;
}
