import type { Role } from "./team";

/**
 * What each role may do.
 *
 * The API must check these on every request that reads or changes something
 * a role is not allowed. The admin calls `can()` only to avoid offering an
 * action that would be refused — hiding a button is never the protection.
 */

export type Capability =
  /** Create and edit cars, photos and video; publish and unpublish. */
  | "stock.edit"
  /** Archive a car or restore an archived one. */
  | "stock.archive"
  /** See and record the price a car actually sold for. */
  | "stock.salePrice"
  /** Work enquiries: status, notes, handler, valuations. */
  | "enquiries.edit"
  /** Remove an enquiry permanently (spam, or a customer's erasure request). */
  | "enquiries.delete"
  /** Arrange and update viewings and test drives. */
  | "appointments.edit"
  /** Edit customer contact details and notes. */
  | "customers.edit"
  /** Invite people, change roles, deactivate accounts. */
  | "team.manage"
  /** Business details and opening hours. */
  | "settings.edit";

const grants: Record<Role, readonly Capability[]> = {
  owner: [
    "stock.edit",
    "stock.archive",
    "stock.salePrice",
    "enquiries.edit",
    "enquiries.delete",
    "appointments.edit",
    "customers.edit",
    "team.manage",
    "settings.edit",
  ],
  staff: ["stock.edit", "enquiries.edit", "appointments.edit", "customers.edit"],
};

export function can(role: Role, capability: Capability): boolean {
  return grants[role].includes(capability);
}

/** The reason shown beside an action the signed-in role cannot use. */
export function deniedReason(capability: Capability): string {
  switch (capability) {
    case "stock.archive":
      return "Only the owner can archive or restore cars.";
    case "stock.salePrice":
      return "Only the owner can see sale prices.";
    case "enquiries.delete":
      return "Only the owner can delete enquiries.";
    case "team.manage":
      return "Only the owner can manage the team.";
    case "settings.edit":
      return "Only the owner can change settings.";
    default:
      return "Your role does not include this.";
  }
}
