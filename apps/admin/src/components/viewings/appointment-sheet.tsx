"use client";

import {
  APPOINTMENT_DURATIONS,
  APPOINTMENT_STATUSES,
  ConflictError,
  ValidationError,
  errorMessage,
  isWithinOpeningHours,
  type Appointment,
  type AppointmentInput,
  type AppointmentType,
} from "@Stratford-city-motorcars-Ltd/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TriangleAlert } from "lucide-react";

import { routes } from "@/components/shell/routes";
import { vehicleName } from "@/components/stock/vehicle-actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, ChoiceGroup, Field, FieldGrid, Select, TextArea, TextInput } from "@/components/ui/form";
import { GuardedLink } from "@/components/ui/unsaved";
import { api } from "@/lib/api";
import { fromDateTimeInput, showroomClock, toDateTimeInput } from "@/lib/format";
import { queryKeys, useAdminMutation } from "@/lib/query";
import { useSession } from "@/lib/session";

export type AppointmentPrefill = Partial<Pick<AppointmentInput, "type" | "vehicleId" | "customerId" | "customerName" | "customerPhone" | "enquiryId" | "handledBy" | "startsAt" | "notes">>;

/** The next weekday slot on the hour inside opening hours, as a sensible default. */
function nextSlot(): string {
  const date = new Date(Date.now() + 86_400_000);
  date.setMinutes(0, 0, 0);
  date.setHours(13);
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  return date.toISOString();
}

/**
 * Arrange or change a viewing or test drive. Opens as a side sheet (full
 * screen on a phone). Arranging one from an enquiry links the two and moves
 * the enquiry to "Viewing arranged". Nothing is sent to the customer: confirm
 * the time with them by phone or WhatsApp as usual.
 */
export function AppointmentSheet({
  appointment,
  prefill,
  onClose,
  onSaved,
}: {
  appointment?: Appointment;
  prefill?: AppointmentPrefill;
  onClose: () => void;
  onSaved?: (appointment: Appointment) => void;
}) {
  const { user, can } = useSession();
  const canEdit = can("appointments.edit");
  const stock = useQuery({ queryKey: queryKeys.stock, queryFn: () => api.stock.list() });
  const team = useQuery({ queryKey: queryKeys.team, queryFn: () => api.team.list() });
  const settings = useQuery({ queryKey: queryKeys.settings, queryFn: () => api.settings.get() });
  const customers = useQuery({
    queryKey: queryKeys.customers({ picker: true }),
    queryFn: () => api.customers.list({ sort: "name", pageSize: 500 }),
    select: (page) => page.items,
  });

  const [form, setForm] = useState<AppointmentInput>(() => ({
    type: appointment?.type ?? prefill?.type ?? "viewing",
    status: appointment?.status ?? "confirmed",
    startsAt: appointment?.startsAt ?? prefill?.startsAt ?? nextSlot(),
    durationMinutes: appointment?.durationMinutes ?? 45,
    vehicleId: appointment?.vehicleId ?? prefill?.vehicleId ?? null,
    customerId: appointment?.customerId ?? prefill?.customerId ?? null,
    customerName: appointment?.customerName ?? prefill?.customerName ?? "",
    customerPhone: appointment?.customerPhone ?? prefill?.customerPhone ?? null,
    enquiryId: appointment?.enquiryId ?? prefill?.enquiryId ?? null,
    handledBy: appointment?.handledBy ?? prefill?.handledBy ?? user.id,
    notes: appointment?.notes ?? prefill?.notes ?? "",
    checks: appointment?.checks ?? { licenceSeen: false, insuranceConfirmed: false },
  }));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);

  const set = <K extends keyof AppointmentInput>(key: K, value: AppointmentInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors(({ [key]: _removed, ...rest }) => rest);
  };

  const mutation = useAdminMutation(
    () => (appointment ? api.appointments.update(appointment.id, form, { expectedUpdatedAt: appointment.updatedAt }) : api.appointments.create(form)),
    {
      success: appointment ? "Appointment updated" : form.type === "test-drive" ? "Test drive arranged" : "Viewing arranged",
      successDetail: appointment ? undefined : "Nothing was sent to the customer — confirm the time with them as usual.",
      onSuccess: (saved) => {
        onSaved?.(saved);
        onClose();
      },
    },
  );

  const submit = () => {
    const errors: Record<string, string> = {};
    if (!form.customerName.trim()) errors.customerName = "Add the customer's name.";
    if (!form.vehicleId) errors.vehicleId = "Choose the car.";
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    mutation.mutate(undefined, {
      onError: (error) => {
        if (error instanceof ValidationError) setFieldErrors(error.fields);
        if (error instanceof ConflictError) setConflict(true);
      },
    });
  };

  const hours = settings.data?.business.hours;
  const outsideHours = hours ? !isWithinOpeningHours(showroomClock(form.startsAt), hours) : false;
  const inPast = new Date(form.startsAt).getTime() < Date.now() - 30 * 60_000 && (form.status === "requested" || form.status === "confirmed");

  // Sold and archived cars are only offered if already chosen.
  const cars = (stock.data ?? []).filter((vehicle) => vehicle.status === "published" || vehicle.status === "draft" || vehicle.id === form.vehicleId);
  const chosenCar = stock.data?.find((vehicle) => vehicle.id === form.vehicleId);

  const generalError = mutation.error && !(mutation.error instanceof ValidationError && Object.keys(mutation.error.fields).length) && !(mutation.error instanceof ConflictError) ? errorMessage(mutation.error) : null;

  return (
    <Dialog
      open
      onClose={onClose}
      variant="sheet"
      width="34rem"
      title={appointment ? "Appointment" : "Arrange a viewing or test drive"}
      description={
        form.enquiryId ? (
          <>
            Linked to{" "}
            <GuardedLink href={routes.enquiry(form.enquiryId)} className="underline decoration-brass underline-offset-4">
              {appointment?.enquiryReference ?? "the enquiry"}
            </GuardedLink>
          </>
        ) : undefined
      }
      footer={
        canEdit ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} busy={mutation.isPending}>
              {appointment ? "Save changes" : "Arrange"}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      <fieldset disabled={!canEdit} className="space-y-5">
        {conflict ? (
          <p role="alert" className="border-l-2 border-destructive bg-destructive/6 px-3 py-2 text-[0.8125rem]">
            Someone else changed this appointment after you opened it. Close and open it again to see their changes.
          </p>
        ) : null}

        <Field label="Type">
          {(c) => (
            <ChoiceGroup
              control={c}
              label="Type"
              value={form.type}
              onChange={(value: AppointmentType) => set("type", value)}
              options={[
                { value: "viewing", label: "Viewing" },
                { value: "test-drive", label: "Test drive" },
              ]}
            />
          )}
        </Field>

        <FieldGrid>
          <Field label="Date and time" required error={fieldErrors.startsAt}>
            {(c) => (
              <TextInput
                {...c}
                type="datetime-local"
                step={900}
                value={toDateTimeInput(form.startsAt)}
                onChange={(event) => {
                  if (event.target.value) set("startsAt", fromDateTimeInput(event.target.value));
                }}
              />
            )}
          </Field>
          <Field label="Length">
            {(c) => (
              <Select {...c} value={form.durationMinutes} onChange={(event) => set("durationMinutes", Number(event.target.value))}>
                {APPOINTMENT_DURATIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </FieldGrid>

        {outsideHours && hours ? (
          <p className="flex gap-2 text-[0.8125rem] text-ink-700">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brass-deep" aria-hidden />
            Outside opening hours ({hours.days[0]?.slice(0, 3)}–{hours.days.at(-1)?.slice(0, 3)} {hours.opens}–{hours.closes}). That&rsquo;s fine by appointment — make sure someone is there.
          </p>
        ) : null}
        {inPast ? (
          <p className="flex gap-2 text-[0.8125rem] text-ink-700">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brass-deep" aria-hidden />
            This time has passed. Mark it completed, a no-show or cancelled.
          </p>
        ) : null}

        <Field label="Car" required error={fieldErrors.vehicleId} description={chosenCar && chosenCar.status === "sold" ? "This car has since been sold." : undefined}>
          {(c) => (
            <Select {...c} value={form.vehicleId ?? ""} disabled={stock.isPending} onChange={(event) => set("vehicleId", event.target.value || null)}>
              <option value="">{stock.isPending ? "Loading stock…" : "Choose a car…"}</option>
              {cars.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicleName(vehicle)}
                  {vehicle.status === "draft" ? " (draft)" : vehicle.status === "sold" ? " (sold)" : vehicle.reserved ? " (reserved)" : ""}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Customer" description="Choose someone who has enquired, or type a name for someone new.">
          {(c) => (
            <Select
              {...c}
              value={form.customerId ?? ""}
              disabled={customers.isPending}
              onChange={(event) => {
                const match = customers.data?.find((customer) => customer.id === event.target.value);
                setForm((current) => ({
                  ...current,
                  customerId: match?.id ?? null,
                  customerName: match?.name ?? "",
                  customerPhone: match?.phone ?? null,
                }));
              }}
            >
              <option value="">{customers.isPending ? "Loading customers…" : "Someone new"}</option>
              {customers.data?.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <FieldGrid>
          <Field label="Name" required error={fieldErrors.customerName}>
            {(c) => <TextInput {...c} value={form.customerName} autoComplete="off" onChange={(event) => set("customerName", event.target.value)} />}
          </Field>
          <Field label="Phone" error={fieldErrors.customerPhone}>
            {(c) => <TextInput {...c} type="tel" inputMode="tel" value={form.customerPhone ?? ""} onChange={(event) => set("customerPhone", event.target.value || null)} />}
          </Field>
        </FieldGrid>

        <FieldGrid>
          <Field label="Status">
            {(c) => (
              <Select {...c} value={form.status} onChange={(event) => set("status", event.target.value as AppointmentInput["status"])}>
                {APPOINTMENT_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Who is meeting them">
            {(c) => (
              <Select {...c} value={form.handledBy ?? ""} onChange={(event) => set("handledBy", event.target.value || null)}>
                <option value="">Not decided</option>
                {(team.data ?? [])
                  .filter((member) => member.status === "active" || member.id === form.handledBy)
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
        </FieldGrid>

        {form.type === "test-drive" ? (
          <div className="space-y-3 border border-border bg-surface p-4">
            <p className="admin-label">Before the drive</p>
            <Checkbox label="Driving licence seen" checked={form.checks.licenceSeen} onChange={(checked) => set("checks", { ...form.checks, licenceSeen: checked })} />
            <Checkbox label="Insurance confirmed" checked={form.checks.insuranceConfirmed} onChange={(checked) => set("checks", { ...form.checks, insuranceConfirmed: checked })} />
            <p className="text-xs text-ink-500">For your records. How test drives are arranged is still to be confirmed.</p>
          </div>
        ) : null}

        <Field label="Notes" error={fieldErrors.notes}>
          {(c) => <TextArea {...c} rows={3} value={form.notes} onChange={(event) => set("notes", event.target.value)} />}
        </Field>

        {generalError ? (
          <p role="alert" className="text-sm text-destructive">
            {generalError}
          </p>
        ) : null}
      </fieldset>
    </Dialog>
  );
}
