import type { Appointment } from "./appointment";
import type { Enquiry, EnquiryCounts } from "./enquiry";
import type { PublicationIssue } from "./visibility";
import type { VehicleStatus } from "./vehicle";

/**
 * The overview screen, computed by the API in one request.
 *
 * Every figure comes from stored stock, enquiries and appointments. The
 * website has no visitor tracking, so there are no traffic or conversion
 * numbers, and none are estimated.
 */

export interface OverviewListing {
  id: string;
  title: string;
  year: number | null;
  status: VehicleStatus;
  coverSrc: string | null;
  dealerPhotos: number;
  hasVideo: boolean;
  /** Publishing blockers (excluding status). */
  issues: PublicationIssue[];
  /** Non-blocking gaps against the finished-listing standard. */
  recommendationCount: number;
}

export interface Overview {
  /** ISO. */
  generatedAt: string;
  stock: {
    /** For sale and on the website. */
    live: number;
    drafts: number;
    /** Drafts with no blockers — one click from the website. */
    readyToPublish: number;
    reserved: number;
    featured: number;
    /** Sold in the last 30 days. */
    soldRecently: number;
    /** Cash prices of live, unsold cars. */
    stockValue: number;
    /** Live cars priced on application, not in `stockValue`. */
    poaCount: number;
    /** Marked for sale but kept off the website by a rule. */
    withheld: OverviewListing[];
    /** Drafts and live cars short of the listing standard, worst first. */
    needsWork: OverviewListing[];
  };
  enquiries: EnquiryCounts & {
    /** New enquiries, oldest first. */
    needsReply: Enquiry[];
    recent: Enquiry[];
    /** Part exchanges awaiting a valuation. */
    awaitingValuation: number;
  };
  appointments: {
    today: Appointment[];
    /** The next seven days after today. */
    upcoming: Appointment[];
    toConfirm: number;
  };
}
