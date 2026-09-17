import type { Appointment, AppointmentInput, AppointmentListQuery } from "./appointment";
import type { Customer, CustomerDetail, CustomerInput, CustomerListQuery } from "./customer";
import type {
  ClosedReason,
  Enquiry,
  EnquiryActivity,
  EnquiryCounts,
  EnquiryListQuery,
  UpdateEnquiryStatusInput,
  ValuationInput,
} from "./enquiry";
import type { Page } from "./list";
import type { Overview } from "./overview";
import type { BusinessDetails, Settings } from "./settings";
import type {
  AdminVehicle,
  MarkSoldInput,
  ReserveInput,
  SaveVehicleResult,
  Versioned,
} from "./stock";
import type { InviteMemberInput, SessionUser, TeamMember, UpdateMemberInput } from "./team";
import type { PhotoCategory, VehicleImage, VehicleRecord } from "./vehicle";

/**
 * ============================================================================
 * THE ADMIN'S CONTRACT WITH THE API
 * ============================================================================
 *
 * Every screen in apps/admin reads and writes through this interface and
 * nothing else. apps/admin ships two implementations:
 *
 *  - `mock`  in-browser sample data, for building and reviewing the admin
 *  - `http`  calls `/api/admin/*` — the backend implements the endpoints
 *
 * docs/STRATFORD_ADMIN_CONTRACT.md maps each method to an endpoint, its
 * permission and its errors. Rules for every endpoint:
 *
 *  - every request needs a session (401 otherwise)
 *  - writes check the capability named in the contract (403 otherwise)
 *  - writes to an existing record carry `expectedUpdatedAt`; a mismatch is 409
 *  - rule failures are 422 with per-field messages (see errors.ts)
 */
export interface AdminApi {
  session: {
    /** The current user, or null when signed out. */
    get(): Promise<SessionUser | null>;
    signIn(input: { email: string; password: string }): Promise<SessionUser>;
    signOut(): Promise<void>;
  };

  overview: {
    get(): Promise<Overview>;
  };

  stock: {
    /** Every car, in every status. */
    list(): Promise<AdminVehicle[]>;
    get(id: string): Promise<AdminVehicle>;
    /** A new, empty draft. */
    create(): Promise<AdminVehicle>;
    /**
     * Saves the whole record. The API keeps `status` as stored (use the
     * status methods), appends a changed slug of a car that has been public to
     * `previousSlugs`, and accepts only media ids already on the record.
     */
    save(record: VehicleRecord, options: Versioned): Promise<SaveVehicleResult>;
    /** 422 with `issues` when a publishing rule is not met. */
    publish(id: string, options: Versioned): Promise<SaveVehicleResult>;
    /** Back to draft. */
    unpublish(id: string, options: Versioned): Promise<SaveVehicleResult>;
    setFeatured(id: string, featured: boolean, options: Versioned): Promise<SaveVehicleResult>;
    reserve(id: string, input: ReserveInput, options: Versioned): Promise<SaveVehicleResult>;
    releaseReservation(id: string, options: Versioned): Promise<SaveVehicleResult>;
    markSold(id: string, input: MarkSoldInput, options: Versioned): Promise<SaveVehicleResult>;
    /** Sold back to for sale — for a sale that fell through. */
    undoSale(id: string, options: Versioned): Promise<SaveVehicleResult>;
    /** Needs `stock.archive`. */
    archive(id: string, options: Versioned): Promise<SaveVehicleResult>;
    /** Needs `stock.archive`. Restores as a draft. */
    restore(id: string, options: Versioned): Promise<SaveVehicleResult>;
    /** A draft copy with no media, no slug history and no sale. */
    duplicate(id: string): Promise<AdminVehicle>;
    /**
     * Stores a photograph for this car and returns it as a dealer image.
     * The API re-encodes, strips metadata, records real dimensions and refuses
     * undersized images. The image is appended to the record's media at once
     * WITHOUT changing `updatedAt`, so an open editor can still save; the
     * editor's next save sets its order, category, description and cover.
     */
    uploadImage(
      id: string,
      file: File,
      input: { category: PhotoCategory; alt: string },
      onProgress?: (fraction: number) => void,
    ): Promise<VehicleImage>;
  };

  enquiries: {
    list(query: EnquiryListQuery): Promise<Page<Enquiry>>;
    counts(query?: Pick<EnquiryListQuery, "kind">): Promise<EnquiryCounts>;
    get(id: string): Promise<{ enquiry: Enquiry; activity: EnquiryActivity[]; appointments: Appointment[] }>;
    updateStatus(id: string, input: UpdateEnquiryStatusInput, options: Versioned): Promise<Enquiry>;
    assign(id: string, memberId: string | null, options: Versioned): Promise<Enquiry>;
    addNote(id: string, body: string): Promise<EnquiryActivity>;
    /** Part exchanges only. */
    updateValuation(id: string, input: ValuationInput, options: Versioned): Promise<Enquiry>;
    /** Needs `enquiries.delete`. Permanent. */
    remove(id: string, reason: Extract<ClosedReason, "spam"> | "erasure-request"): Promise<void>;
  };

  appointments: {
    list(query: AppointmentListQuery): Promise<Appointment[]>;
    create(input: AppointmentInput): Promise<Appointment>;
    update(id: string, input: AppointmentInput, options: Versioned): Promise<Appointment>;
  };

  customers: {
    list(query: CustomerListQuery): Promise<Page<Customer>>;
    get(id: string): Promise<CustomerDetail>;
    update(id: string, input: CustomerInput, options: Versioned): Promise<Customer>;
  };

  team: {
    list(): Promise<TeamMember[]>;
    /** Needs `team.manage`. Sends the invitation email (backend). */
    invite(input: InviteMemberInput): Promise<TeamMember>;
    /** Needs `team.manage`. The last active owner cannot be demoted or deactivated (422). */
    update(id: string, input: UpdateMemberInput): Promise<TeamMember>;
    /** Needs `team.manage`. */
    resendInvite(id: string): Promise<void>;
  };

  settings: {
    get(): Promise<Settings>;
    /** Needs `settings.edit`. */
    updateBusiness(input: BusinessDetails, options: Versioned): Promise<Settings>;
  };
}
