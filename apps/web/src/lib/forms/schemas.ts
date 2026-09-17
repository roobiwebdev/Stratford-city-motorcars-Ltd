import type { EnquiryPayload } from "@Stratford-city-motorcars-Ltd/core/enquiry";
import { z } from "zod";

import {
  ENQUIRY_TYPES,
  KEY_COUNTS,
  MOT_STATUSES,
  PREFERRED_TIMES,
  REQUEST_TYPES,
  SERVICE_HISTORY_OPTIONS,
  VEHICLE_CONDITIONS,
} from "./options";

/**
 * Server-side validation. Messages are written to be read by a customer, not a
 * developer. Forms ask only for what the dealership needs to reply — nothing
 * about employment, income or date of birth is collected.
 *
 * Never imported by a client component (see options.ts).
 */

const name = z.string().trim().min(2, "Please enter your name").max(80, "That name looks too long");

const email = z
  .string()
  .trim()
  .min(1, "Please enter your email address")
  .email("That doesn't look like a valid email address")
  .max(160);

/** Forgiving on formatting — UK numbers get written a dozen different ways. */
const phone = z
  .string()
  .trim()
  .min(1, "Please enter a phone number")
  .refine((value) => value.replace(/[^\d]/g, "").length >= 10, "Please enter a valid UK phone number")
  .refine((value) => /^[\d\s()+-]+$/.test(value), "Phone numbers can only contain digits, spaces and + ( ) -")
  .refine((value) => value.replace(/[^\d]/g, "").length <= 15, "That phone number looks too long");

const optionalPhone = z
  .union([z.literal(""), phone])
  .optional()
  .transform((value) => (value === "" ? undefined : value));

/** Free text. More than two links is almost always spam, never a car enquiry. */
const freeText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters`)
    .refine((value) => (value.match(/https?:\/\/|www\./gi) ?? []).length <= 2, "Please remove the links from your message");

const optionalText = (max: number) =>
  freeText(max)
    .optional()
    .transform((value) => (value ? value : undefined));

/** Honeypot — real customers never see or fill this; bots usually do. */
const honeypot = z.string().max(0, "This submission was rejected").optional().or(z.literal(""));

const positiveMoney = z
  .union([z.literal(""), z.coerce.number().min(0, "Please enter a positive amount").max(10_000_000)])
  .optional()
  .transform((value) => (value === "" || value === undefined ? undefined : Math.round(Number(value))));

const vehicleSlug = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]{1,120}$/)
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : undefined));

const checkbox = z
  .union([z.literal("on"), z.literal(""), z.boolean()])
  .optional()
  .transform((value) => value === "on" || value === true);

// ---- Vehicle enquiry, viewing and test-drive requests ----------------------------

const today = () => new Date().toISOString().slice(0, 10);

export const vehicleEnquirySchema = z
  .object({
    kind: z.literal("vehicle-enquiry"),
    requestType: z.enum(REQUEST_TYPES.map((type) => type.value) as ["question", "viewing", "test-drive"]),
    name,
    email,
    phone: optionalPhone,
    preferredDate: z
      .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a date")])
      .optional()
      .transform((value) => (value ? value : undefined)),
    preferredTime: z
      .union([z.literal(""), z.enum(PREFERRED_TIMES)])
      .optional()
      .transform((value) => (value ? value : undefined)),
    message: optionalText(2000),
    /** Set from the page, not typed by the customer. */
    vehicleSlug: z.string().regex(/^[a-z0-9-]{1,120}$/),
    vehicleTitle: z.string().trim().min(1).max(200),
    interestedInFinance: checkbox,
    hasPartExchange: checkbox,
    website: honeypot,
  })
  .superRefine((value, context) => {
    if (value.requestType === "question" && !value.message) {
      context.addIssue({ code: "custom", path: ["message"], message: "Please tell us what you'd like to know" });
    }
    if (value.requestType !== "question" && !value.phone) {
      context.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Please add a phone number so we can confirm a time with you",
      });
    }
    if (value.preferredDate) {
      const latest = new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10);
      if (value.preferredDate < today()) {
        context.addIssue({ code: "custom", path: ["preferredDate"], message: "Please choose today or a later date" });
      } else if (value.preferredDate > latest) {
        context.addIssue({ code: "custom", path: ["preferredDate"], message: "Please choose a date in the next four months" });
      }
    }
  });

export type VehicleEnquiryInput = z.infer<typeof vehicleEnquirySchema>;

// ---- Finance ------------------------------------------------------------------------

/** Kept short at the client's request: contact details, the car, and two numbers. */
export const financeSchema = z.object({
  kind: z.literal("finance"),
  name,
  email,
  phone,
  vehicle: optionalText(160),
  vehicleSlug,
  deposit: positiveMoney,
  monthlyBudget: positiveMoney,
  hasPartExchange: checkbox,
  website: honeypot,
});

export type FinanceInput = z.infer<typeof financeSchema>;

// ---- Part exchange ------------------------------------------------------------------

const currentYear = new Date().getFullYear();

/** Exactly what the dealership said it needs to value a part exchange. */
export const partExchangeSchema = z.object({
  kind: z.literal("part-exchange"),
  name,
  email,
  phone,
  registration: z
    .string()
    .trim()
    .min(2, "Please enter the registration")
    .max(12, "That registration looks too long")
    .regex(/^[A-Za-z0-9 ]+$/, "Registrations use letters, numbers and spaces only")
    .transform((value) => value.toUpperCase().replace(/\s+/g, " ")),
  make: z.string().trim().min(1, "Please enter the make").max(60),
  model: z.string().trim().min(1, "Please enter the model").max(60),
  year: z.coerce
    .number({ message: "Please enter the year" })
    .int()
    .min(1900, "Please enter a valid year")
    .max(currentYear + 1, "Please enter a valid year"),
  mileage: z.coerce
    .number({ message: "Please enter the mileage" })
    .int()
    .min(0, "Please enter the mileage")
    .max(1_000_000, "Please enter a valid mileage"),
  serviceHistory: z.enum(SERVICE_HISTORY_OPTIONS, { message: "Please choose an option" }),
  motStatus: z.enum(MOT_STATUSES, { message: "Please choose an option" }),
  keys: z.enum(KEY_COUNTS, { message: "Please choose how many keys" }),
  condition: z.enum(VEHICLE_CONDITIONS, { message: "Please choose an option" }),
  conditionNotes: optionalText(1000),
  outstandingFinance: checkbox,
  interestedIn: optionalText(160),
  vehicleSlug,
  website: honeypot,
});

export type PartExchangeInput = z.infer<typeof partExchangeSchema>;

// ---- General contact ------------------------------------------------------------------

export const contactSchema = z.object({
  kind: z.literal("contact"),
  name,
  email,
  phone: optionalPhone,
  enquiryType: z.enum(ENQUIRY_TYPES),
  message: freeText(2000).pipe(z.string().min(10, "Please tell us a little more so we can help")),
  website: honeypot,
});

export type ContactInput = z.infer<typeof contactSchema>;

// ---- Union ------------------------------------------------------------------------------

export type LeadInput = VehicleEnquiryInput | FinanceInput | PartExchangeInput | ContactInput;
export type LeadKind = LeadInput["kind"];

export type { FormState } from "./options";

// ---- Contract with the admin ------------------------------------------------------------

/**
 * The admin reads stored submissions as `EnquiryPayload` (packages/core). The
 * stored payload is a submission minus the honeypot, so it must stay
 * assignable — change a form here and this stops compiling until the shared
 * shape is updated too.
 */
type StoredPayload = LeadInput extends infer Input ? (Input extends LeadInput ? Omit<Input, "website"> : never) : never;
const _storedPayloadMatchesAdmin: (value: StoredPayload) => EnquiryPayload = (value) => value;
void _storedPayloadMatchesAdmin;
