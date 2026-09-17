import type { Metadata } from "next";

import { NewVehicle } from "@/components/stock/new-vehicle";

export const metadata: Metadata = { title: "Add a car" };

export default function NewVehiclePage() {
  return <NewVehicle />;
}
