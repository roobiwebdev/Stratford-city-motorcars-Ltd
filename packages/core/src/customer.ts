import type { Appointment } from "./appointment";
import type { Enquiry } from "./enquiry";
import type { ListQuery } from "./list";

/**
 * People who have enquired, viewed or bought.
 *
 * The website has no customer record: each enquiry carries its own name and
 * contact details. The API groups enquiries into customers.
 *
 * BACKEND NOTE: suggested matching is by normalised email, then by phone
 * digits. Matching is imperfect — two people sharing a phone, one person with
 * two emails — so the grouping must be correctable later.
 */

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string;
  /** ISO. */
  createdAt: string;
  updatedAt: string;
  /** ISO. The latest enquiry, appointment or purchase. */
  lastActivityAt: string;
  enquiryCount: number;
  openEnquiryCount: number;
  appointmentCount: number;
  purchaseCount: number;
}

export interface CustomerPurchase {
  vehicleId: string;
  title: string;
  year: number | null;
  /** ISO. */
  soldAt: string;
  /** Null when not recorded or the role may not see it. */
  salePrice: number | null;
}

export interface CustomerDetail {
  customer: Customer;
  enquiries: Enquiry[];
  appointments: Appointment[];
  purchases: CustomerPurchase[];
}

export const CUSTOMER_SORTS = [
  { value: "recent", label: "Recent activity" },
  { value: "name", label: "Name A–Z" },
] as const;

export type CustomerSort = (typeof CUSTOMER_SORTS)[number]["value"];

/** Search matches name, email and phone. */
export interface CustomerListQuery extends ListQuery<CustomerSort> {
  filter?: "all" | "open-enquiries" | "buyers";
}

export interface CustomerInput {
  name: string;
  email: string | null;
  phone: string | null;
  notes: string;
}
