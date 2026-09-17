/**
 * Viewings and test drives the dealership has arranged.
 *
 * On the website a viewing or test drive is only ever a *request* inside an
 * enquiry. An appointment is what the dealership agrees with the customer
 * afterwards — or books directly from a phone call or WhatsApp message.
 *
 * BACKEND NOTE: there is no table for these yet.
 */

export const APPOINTMENT_TYPES = [
  { value: "viewing", label: "Viewing" },
  { value: "test-drive", label: "Test drive" },
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number]["value"];

export const APPOINTMENT_STATUSES = [
  { value: "requested", label: "To confirm", note: "Not yet agreed with the customer" },
  { value: "confirmed", label: "Confirmed", note: "Agreed with the customer" },
  { value: "completed", label: "Completed", note: "Took place" },
  { value: "no-show", label: "No-show", note: "The customer did not come" },
  { value: "cancelled", label: "Cancelled", note: "Called off" },
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]["value"];

export const ACTIVE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = ["requested", "confirmed"];

/**
 * Checks before a test drive. The client has not confirmed how test drives
 * are arranged (build status item 21), so these are record-keeping only and
 * block nothing.
 */
export interface TestDriveChecks {
  licenceSeen: boolean;
  insuranceConfirmed: boolean;
}

export interface Appointment {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  /** ISO instant. */
  startsAt: string;
  durationMinutes: number;
  vehicleId: string | null;
  /** Snapshot for display, resolved by the API. */
  vehicleTitle: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  enquiryId: string | null;
  enquiryReference: string | null;
  /** Team member id. */
  handledBy: string | null;
  notes: string;
  checks: TestDriveChecks;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentInput {
  type: AppointmentType;
  status: AppointmentStatus;
  startsAt: string;
  durationMinutes: number;
  vehicleId: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  enquiryId: string | null;
  handledBy: string | null;
  notes: string;
  checks: TestDriveChecks;
}

export interface AppointmentListQuery {
  /** ISO instant, inclusive. */
  from?: string;
  /** ISO instant, exclusive. */
  to?: string;
  status?: AppointmentStatus | "active" | "all";
  type?: AppointmentType | "all";
  vehicleId?: string;
  customerId?: string;
}

export const APPOINTMENT_DURATIONS = [30, 45, 60, 90] as const;

export function appointmentTypeLabel(type: AppointmentType): string {
  return APPOINTMENT_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function appointmentStatusLabel(status: AppointmentStatus): string {
  return APPOINTMENT_STATUSES.find((item) => item.value === status)?.label ?? status;
}
