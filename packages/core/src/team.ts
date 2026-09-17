/**
 * The people who sign in to the admin.
 *
 * A small family business: an owner, and possibly members of staff. Roles are
 * decided by the API from the session and enforced there on every request —
 * see `permissions.ts`. Nothing in the admin's interface is the protection.
 */

export const ROLES = [
  {
    value: "owner",
    label: "Owner",
    summary: "Everything, including the team, settings, archiving cars and sale prices.",
  },
  {
    value: "staff",
    label: "Staff",
    summary: "Stock, enquiries, viewings and customers. No team, settings, archiving or sale prices.",
  },
] as const satisfies readonly { value: string; label: string; summary: string }[];

export type Role = (typeof ROLES)[number]["value"];

/**
 *  - `invited`      an invitation was sent and has not been accepted
 *  - `active`       can sign in
 *  - `deactivated`  can no longer sign in; kept so their history keeps a name
 */
export const MEMBER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "deactivated", label: "Deactivated" },
] as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[number]["value"];

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
  /** ISO. */
  createdAt: string;
  /** ISO. Null until they first sign in. */
  lastActiveAt: string | null;
}

/** Who is signed in, as the API reports it. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface InviteMemberInput {
  name: string;
  email: string;
  role: Role;
}

export interface UpdateMemberInput {
  role?: Role;
  status?: Extract<MemberStatus, "active" | "deactivated">;
}
