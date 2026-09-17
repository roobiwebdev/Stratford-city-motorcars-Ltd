"use client";

import {
  CLOSED_REASONS,
  ENQUIRY_STATUSES,
  NotFoundError,
  REQUEST_TYPES,
  VALUATION_STATUSES,
  ConflictError,
  ValidationError,
  errorMessage,
  formatDate,
  formatMileage,
  formatPrice,
  formatVehiclePrice,
  isOpenEnquiry,
  type Appointment,
  type ClosedReason,
  type Enquiry,
  type EnquiryActivity,
  type EnquiryStatus,
  type ValuationStatus,
} from "@Stratford-city-motorcars-Ltd/core";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  CalendarPlus,
  CircleAlert,
  Copy,
  MessageSquareText,
  PencilLine,
  Trash2,
  UserRound,
} from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { routes } from "@/components/shell/routes";
import { AppointmentStatusBadge, EnquiryStatusBadge, ValuationBadge, VehicleStatusBadge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, NumberInput, Select, TextArea, TextInput } from "@/components/ui/form";
import { DefinitionList, ErrorState, LoadingBlock, Notice, PageBody, PageHeader, Panel } from "@/components/ui/page";
import { Photo } from "@/components/ui/photo";
import { notify } from "@/components/ui/toast";
import { GuardedLink, useUnsavedChanges } from "@/components/ui/unsaved";
import { AppointmentSheet } from "@/components/viewings/appointment-sheet";
import { api } from "@/lib/api";
import { formatDateTime, formatRelative, formatShortDate, formatTime, formatWeekdayDate } from "@/lib/format";
import { queryKeys, useAdminMutation } from "@/lib/query";
import { useSession } from "@/lib/session";

import { ContactActions, KindTag, Waiting } from "./parts";

export function EnquiryDetail({ id }: { id: string }) {
  const query = useQuery({ queryKey: queryKeys.enquiry(id), queryFn: () => api.enquiries.get(id) });

  if (query.error) {
    return (
      <PageBody>
        <PageHeader back={{ label: "Enquiries", href: routes.enquiries }} title={query.error instanceof NotFoundError ? "Enquiry not found" : "This enquiry could not be loaded"} />
        <ErrorState error={query.error} onRetry={query.error instanceof NotFoundError ? undefined : () => void query.refetch()} />
      </PageBody>
    );
  }
  if (!query.data) {
    return (
      <PageBody>
        <LoadingBlock label="Loading the enquiry" />
      </PageBody>
    );
  }
  return <Detail {...query.data} />;
}

function Detail({ enquiry, activity, appointments }: { enquiry: Enquiry; activity: EnquiryActivity[]; appointments: Appointment[] }) {
  const { can } = useSession();
  const canEdit = can("enquiries.edit");
  const router = useRouter();
  const team = useQuery({ queryKey: queryKeys.team, queryFn: () => api.team.list() });
  const [closing, setClosing] = useState(false);
  const [arranging, setArranging] = useState(false);
  const [openAppointment, setOpenAppointment] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const version = { expectedUpdatedAt: enquiry.updatedAt };
  const conflictMessage = "Someone else updated this enquiry a moment ago. The latest version is now shown — try again.";

  const status = useAdminMutation(
    (input: { status: EnquiryStatus; closedReason?: ClosedReason }) => api.enquiries.updateStatus(enquiry.id, input, version),
    { success: (result) => `Marked ${ENQUIRY_STATUSES.find((item) => item.value === result.status)?.label.toLowerCase()}` },
  );
  const assign = useAdminMutation((memberId: string | null) => api.enquiries.assign(enquiry.id, memberId, version), {
    success: (result) => (result.handledBy ? "Handler updated" : "No longer assigned"),
  });

  const runStatus = (input: { status: EnquiryStatus; closedReason?: ClosedReason }) =>
    status.mutate(input, {
      onError: (error) => notify.error("Status not changed", error instanceof ConflictError ? conflictMessage : errorMessage(error)),
    });

  const changeStatus = (next: EnquiryStatus) => {
    if (next === "not-proceeding") setClosing(true);
    else runStatus({ status: next });
  };

  const payload = enquiry.payload;
  const contextTitle = enquiry.vehicle?.title ?? ("vehicleTitle" in payload ? payload.vehicleTitle : undefined);
  const busy = status.isPending || assign.isPending;

  return (
    <PageBody>
      <PageHeader
        back={{ label: enquiry.kind === "part-exchange" ? "Part exchange" : "Enquiries", href: enquiry.kind === "part-exchange" ? routes.partExchange : routes.enquiries }}
        title={enquiry.name}
        meta={
          <>
            <EnquiryStatusBadge status={enquiry.status} />
            <KindTag kind={enquiry.kind} />
            <span data-numeric className="text-xs text-ink-600">
              {enquiry.reference}
            </span>
            <span className="text-xs text-ink-500" title={formatDateTime(enquiry.createdAt)}>
              Received {formatRelative(enquiry.createdAt)}
            </span>
            {enquiry.status === "new" ? <Waiting since={enquiry.createdAt} /> : null}
          </>
        }
        actions={<ContactActions enquiry={enquiry} context={contextTitle} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {enquiry.status === "new" && canEdit ? (
            <Notice
              tone="warning"
              title="Waiting for a reply"
              action={
                <Button size="sm" variant="primary" onClick={() => changeStatus("contacted")} busy={status.isPending}>
                  <MessageSquareText aria-hidden />
                  Mark contacted
                </Button>
              }
            >
              Reply by phone, WhatsApp or email, then mark it contacted. Nothing is sent from here.
            </Notice>
          ) : null}

          <VehicleContext enquiry={enquiry} />

          <Panel title="What they sent">
            <Submission enquiry={enquiry} />
          </Panel>

          {payload.kind === "part-exchange" ? <ValuationPanel enquiry={enquiry} canEdit={canEdit} /> : null}

          <Timeline enquiry={enquiry} activity={activity} canEdit={canEdit} />
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Panel title="Follow-up">
            <div className="space-y-5">
              <Field label="Status">
                {(c) => (
                  <Select {...c} value={enquiry.status} disabled={!canEdit || busy} onChange={(event) => changeStatus(event.target.value as EnquiryStatus)}>
                    {ENQUIRY_STATUSES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              {enquiry.status === "not-proceeding" && enquiry.closedReason ? (
                <p className="-mt-3 text-xs text-ink-600">Reason: {CLOSED_REASONS.find((item) => item.value === enquiry.closedReason)?.label}</p>
              ) : null}
              <Field label="Handled by">
                {(c) => (
                  <Select {...c} value={enquiry.handledBy ?? ""} disabled={!canEdit || busy || team.isPending} onChange={(event) => assign.mutate(event.target.value || null, { onError: (error) => notify.error("Not changed", error instanceof ConflictError ? conflictMessage : errorMessage(error)) })}>
                    <option value="">Nobody yet</option>
                    {(team.data ?? [])
                      .filter((member) => member.status === "active" || member.id === enquiry.handledBy)
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                          {member.status !== "active" ? " (deactivated)" : ""}
                        </option>
                      ))}
                  </Select>
                )}
              </Field>
            </div>
          </Panel>

          <Panel title="Contact">
            <DefinitionList
                  stacked
              items={[
                { label: "Name", value: enquiry.name },
                { label: "Phone", value: enquiry.phone ? <CopyValue value={enquiry.phone} label="phone number" /> : <span className="text-ink-500">Not given</span> },
                { label: "Email", value: enquiry.email ? <CopyValue value={enquiry.email} label="email address" /> : <span className="text-ink-500">Not given</span> },
              ]}
            />
            {!enquiry.phone && !enquiry.email ? (
              <p className="mt-3 flex gap-2 text-xs text-destructive">
                <CircleAlert className="size-3.5 shrink-0" aria-hidden />
                No way to contact this person was given.
              </p>
            ) : null}
            {enquiry.customerId ? (
              <GuardedLink href={routes.customer(enquiry.customerId)} className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-[0.8125rem] text-ink-700 hover:text-foreground">
                <UserRound className="size-4" aria-hidden />
                Customer history
              </GuardedLink>
            ) : null}
          </Panel>

          <Panel
            title="Viewings & test drives"
            flush
            action={
              can("appointments.edit") && isOpenEnquiry(enquiry.status) ? (
                <Button size="sm" onClick={() => setArranging(true)}>
                  <CalendarPlus aria-hidden />
                  Arrange
                </Button>
              ) : null
            }
          >
            {appointments.length ? (
              <ul className="divide-y divide-border">
                {appointments.map((appointment) => (
                  <li key={appointment.id}>
                    <button type="button" onClick={() => setOpenAppointment(appointment.id)} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-ink-50 sm:px-5">
                      <span>
                        <span className="block text-sm">
                          {formatWeekdayDate(appointment.startsAt)}, {formatTime(appointment.startsAt)}
                        </span>
                        <span className="block text-xs text-ink-600">
                          {appointment.type === "test-drive" ? "Test drive" : "Viewing"} · {appointment.vehicleTitle ?? "Car not set"}
                        </span>
                      </span>
                      <AppointmentStatusBadge status={appointment.status} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-[0.8125rem] text-ink-600 sm:px-5">
                {payload.kind === "vehicle-enquiry" && payload.requestType !== "question" ? "They asked for one — nothing is arranged yet." : "Nothing arranged."}
              </p>
            )}
          </Panel>

          {can("enquiries.delete") ? (
            <div className="border-t border-border pt-4">
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/8 hover:text-destructive" onClick={() => setDeleting(true)}>
                <Trash2 aria-hidden />
                Delete enquiry
              </Button>
              <p className="mt-1 text-xs text-ink-500">For spam, or when a customer asks for their details to be erased.</p>
            </div>
          ) : null}
        </aside>
      </div>

      {closing ? (
        <ClosedReasonDialog
          busy={status.isPending}
          onClose={() => setClosing(false)}
          onConfirm={(reason) => {
            status.mutate(
              { status: "not-proceeding", closedReason: reason },
              {
                onSuccess: () => setClosing(false),
                onError: (error) => notify.error("Status not changed", error instanceof ConflictError ? conflictMessage : errorMessage(error)),
              },
            );
          }}
        />
      ) : null}

      {arranging ? (
        <AppointmentSheet
          onClose={() => setArranging(false)}
          prefill={{
            type: payload.kind === "vehicle-enquiry" && payload.requestType === "test-drive" ? "test-drive" : "viewing",
            vehicleId: enquiry.vehicle?.id ?? null,
            customerId: enquiry.customerId,
            customerName: enquiry.name,
            customerPhone: enquiry.phone,
            enquiryId: enquiry.id,
            handledBy: enquiry.handledBy ?? undefined,
            notes: payload.kind === "vehicle-enquiry" && payload.preferredTime ? `Asked for: ${payload.preferredTime}${payload.preferredDate ? `, ${formatDate(payload.preferredDate)}` : ""}` : "",
          }}
        />
      ) : null}

      {openAppointment ? (
        <AppointmentSheet appointment={appointments.find((item) => item.id === openAppointment)} onClose={() => setOpenAppointment(null)} />
      ) : null}

      {deleting ? (
        <DeleteDialog
          enquiry={enquiry}
          onClose={() => setDeleting(false)}
          onDeleted={async () => {
            setDeleting(false);
            router.replace(routes.enquiries);
          }}
        />
      ) : null}
    </PageBody>
  );
}

function CopyValue({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex items-center justify-between gap-2">
      <span className="min-w-0 [overflow-wrap:anywhere]">{value}</span>
      <IconButton
        size="sm"
        label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            notify.success(`${label[0]!.toUpperCase()}${label.slice(1)} copied`);
          } catch {
            notify.error("Could not copy", "Select the text and copy it instead.");
          }
        }}
      >
        <Copy aria-hidden />
      </IconButton>
    </span>
  );
}

/** The car the enquiry is about, and whether that is still a live conversation. */
function VehicleContext({ enquiry }: { enquiry: Enquiry }) {
  const { payload, vehicle } = enquiry;
  const named = "vehicleTitle" in payload ? payload.vehicleTitle : payload.kind === "finance" ? payload.vehicle : payload.kind === "part-exchange" ? payload.interestedIn : undefined;

  if (!vehicle) {
    if (!enquiry.vehicleSlug && !named) return null;
    return (
      <Notice tone="warning" title="The car they asked about is no longer in stock">
        They asked about {named ? <strong className="font-medium">{named}</strong> : "a car"}
        {enquiry.vehicleSlug ? ` (/vehicles/${enquiry.vehicleSlug})` : ""}, which does not match any car in the system now. Suggest something similar when you reply.
      </Notice>
    );
  }

  const warning =
    vehicle.status === "sold"
      ? "This car has been sold since they enquired."
      : vehicle.status === "archived"
        ? "This car has been withdrawn."
        : vehicle.status === "draft"
          ? "This car is a draft and not on the website."
          : vehicle.reserved
            ? "This car is reserved for another buyer."
            : null;

  return (
    <div className={cn("flex items-center gap-4 border bg-surface-raised p-3 sm:p-4", warning ? "border-brass/60" : "border-border")}>
      <Photo src={vehicle.coverSrc} alt="" label="Cover" className="h-16 w-24 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="admin-label">{payload.kind === "part-exchange" ? "Interested in" : "About"}</p>
        <GuardedLink href={routes.vehicle(vehicle.id)} className="mt-0.5 block truncate font-medium hover:underline hover:decoration-brass hover:underline-offset-4">
          {[vehicle.year, vehicle.title].filter(Boolean).join(" ")}
        </GuardedLink>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span data-numeric className="text-sm">
            {vehicle.price === null && !vehicle.priceOnApplication ? "Price not set" : formatVehiclePrice(vehicle)}
          </span>
          <VehicleStatusBadge status={vehicle.status} />
        </div>
        {warning ? <p className="mt-1.5 text-xs font-medium text-brass-deep">{warning}</p> : null}
      </div>
    </div>
  );
}

function Yes({ value }: { value: boolean }) {
  return <>{value ? "Yes" : "No"}</>;
}

/** Everything the customer typed, laid out for the kind of form they used. */
function Submission({ enquiry }: { enquiry: Enquiry }) {
  const { payload } = enquiry;
  let items: { label: string; value: ReactNode; hidden?: boolean }[] = [];
  let message: string | undefined;

  switch (payload.kind) {
    case "vehicle-enquiry":
      items = [
        { label: "Request", value: REQUEST_TYPES.find((item) => item.value === payload.requestType)?.label },
        { label: "Car", value: payload.vehicleTitle },
        { label: "Preferred date", value: payload.preferredDate ? formatDate(payload.preferredDate) : null, hidden: payload.requestType === "question" },
        { label: "Preferred time", value: payload.preferredTime, hidden: payload.requestType === "question" },
        { label: "Interested in finance", value: <Yes value={payload.interestedInFinance} /> },
        { label: "Has a part exchange", value: <Yes value={payload.hasPartExchange} /> },
      ];
      message = payload.message;
      break;
    case "finance":
      items = [
        { label: "Car", value: payload.vehicle },
        { label: "Deposit", value: payload.deposit !== undefined ? formatPrice(payload.deposit) : null },
        { label: "Monthly budget", value: payload.monthlyBudget !== undefined ? formatPrice(payload.monthlyBudget) : null },
        { label: "Has a part exchange", value: <Yes value={payload.hasPartExchange} /> },
      ];
      break;
    case "part-exchange":
      items = [
        { label: "Car", value: `${payload.year} ${payload.make} ${payload.model}` },
        { label: "Registration", value: payload.registration },
        { label: "Mileage", value: formatMileage(payload.mileage) },
        { label: "Service history", value: payload.serviceHistory },
        { label: "MOT", value: payload.motStatus },
        { label: "Keys", value: payload.keys },
        { label: "Condition", value: payload.condition },
        { label: "Outstanding finance", value: <Yes value={payload.outstandingFinance} /> },
        { label: "Interested in", value: payload.interestedIn },
      ];
      message = payload.conditionNotes;
      break;
    case "contact":
      items = [{ label: "Enquiry type", value: payload.enquiryType }];
      message = payload.message;
      break;
  }

  return (
    <div className="space-y-5">
      {message ? (
        <blockquote className="border-l-2 border-brass pl-4 text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink-800">{message}</blockquote>
      ) : null}
      <DefinitionList items={items} />
    </div>
  );
}

function ValuationPanel({ enquiry, canEdit }: { enquiry: Enquiry; canEdit: boolean }) {
  const current = enquiry.valuation;
  const [editing, setEditing] = useState(false);
  const [statusValue, setStatusValue] = useState<ValuationStatus>(current?.status ?? "awaiting");
  const [amount, setAmount] = useState<number | null>(current?.amount ?? null);
  const [note, setNote] = useState(current?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useAdminMutation(
    () => api.enquiries.updateValuation(enquiry.id, { status: statusValue, amount, note }, { expectedUpdatedAt: enquiry.updatedAt }),
    { success: "Valuation recorded", onSuccess: () => setEditing(false) },
  );

  const save = () => {
    if (statusValue !== "awaiting" && (amount === null || amount <= 0)) {
      setErrors({ amount: "Enter the valuation in whole pounds." });
      return;
    }
    mutation.mutate(undefined, {
      onError: (error) => {
        if (error instanceof ValidationError) setErrors(error.fields);
        else notify.error("Valuation not recorded", error instanceof ConflictError ? "Someone else updated this enquiry. Reload and try again." : errorMessage(error));
      },
    });
  };

  return (
    <Panel
      title="Valuation"
      action={
        canEdit && !editing ? (
          <Button size="sm" onClick={() => setEditing(true)}>
            <PencilLine aria-hidden />
            {current && current.status !== "awaiting" ? "Update" : "Record valuation"}
          </Button>
        ) : null
      }
    >
      {editing ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Stage">
              {(c) => (
                <Select {...c} value={statusValue} onChange={(event) => setStatusValue(event.target.value as ValuationStatus)}>
                  {VALUATION_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Initial guide" required={statusValue !== "awaiting"} error={errors.amount}>
              {(c) => <NumberInput {...c} prefix="£" value={amount} onValueChange={(value) => { setAmount(value); setErrors({}); }} />}
            </Field>
          </div>
          <Field label="Note" description="e.g. what the figure depends on. Kept internal.">
            {(c) => <TextInput {...c} value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} />}
          </Field>
          <p className="text-xs text-ink-600">Valuations are an initial guide, confirmed only after a physical inspection and document check.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} busy={mutation.isPending}>
              Save valuation
            </Button>
          </div>
        </div>
      ) : current && current.status !== "awaiting" ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span data-numeric className="font-display text-3xl">
            {current.amount !== null ? formatPrice(current.amount) : "—"}
          </span>
          <ValuationBadge status={current.status} />
          <span className="text-xs text-ink-500">Updated {formatShortDate(current.updatedAt)}</span>
          {current.note ? <p className="w-full text-[0.8125rem] text-ink-700">{current.note}</p> : null}
        </div>
      ) : (
        <p className="text-sm text-ink-600">No valuation given yet. The website tells customers valuations usually come within 24 hours on weekdays.</p>
      )}
    </Panel>
  );
}

function Timeline({ enquiry, activity, canEdit }: { enquiry: Enquiry; activity: EnquiryActivity[]; canEdit: boolean }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  useUnsavedChanges(note.trim().length > 0);

  const mutation = useAdminMutation((body: string) => api.enquiries.addNote(enquiry.id, body), {
    success: "Note added",
    onSuccess: () => {
      setNote("");
      setError(undefined);
    },
  });

  const submit = () => {
    if (!note.trim()) {
      setError("Write a note first.");
      return;
    }
    mutation.mutate(note, {
      onError: (caught) => (caught instanceof ValidationError && caught.fields.body ? setError(caught.fields.body) : notify.error("Note not added", errorMessage(caught))),
    });
  };

  return (
    <Panel title="Notes & history">
      {canEdit ? (
        <div className="mb-6">
          <Field label="Add a note" error={error} counter={note.length > 1600 ? { length: note.length, max: 2000 } : undefined}>
            {(c) => (
              <TextArea
                {...c}
                rows={3}
                value={note}
                placeholder="What was said, what happens next…"
                onChange={(event) => {
                  setNote(event.target.value);
                  setError(undefined);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
                }}
              />
            )}
          </Field>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="hidden text-xs text-ink-500 sm:block">Internal only — the customer never sees notes.</p>
            <Button variant="primary" size="sm" onClick={submit} busy={mutation.isPending} className="max-sm:w-full">
              Add note
            </Button>
          </div>
        </div>
      ) : null}
      {activity.length ? (
        <ol className="relative space-y-5 before:absolute before:top-1 before:bottom-1 before:left-[5px] before:w-px before:bg-border">
          {activity.map((entry) => (
            <li key={entry.id} className="relative pl-7">
              <span
                aria-hidden
                className={cn(
                  "absolute top-1.5 left-0 size-[11px] border-2 border-surface-raised",
                  entry.type === "note" ? "bg-ink-900" : entry.type === "created" ? "bg-brass" : "bg-ink-300",
                )}
              />
              <p className={cn("text-sm leading-relaxed whitespace-pre-line", entry.type === "note" ? "text-foreground" : "text-ink-600")}>{entry.body}</p>
              <p className="mt-0.5 text-xs text-ink-500">
                {entry.authorName} · <time dateTime={entry.createdAt} title={formatDateTime(entry.createdAt)}>{formatRelative(entry.createdAt)}</time>
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-600">No history yet.</p>
      )}
    </Panel>
  );
}

function ClosedReasonDialog({ onClose, onConfirm, busy }: { onClose: () => void; onConfirm: (reason: ClosedReason) => void; busy: boolean }) {
  const [reason, setReason] = useState<ClosedReason | "">("");
  const [error, setError] = useState<string>();
  return (
    <Dialog
      open
      onClose={onClose}
      title="Not proceeding"
      description="Why is this enquiry not going ahead? It helps to see patterns later."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" busy={busy} onClick={() => (reason ? onConfirm(reason) : setError("Choose a reason."))}>
            Close enquiry
          </Button>
        </>
      }
    >
      <fieldset>
        <legend className="sr-only">Reason</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CLOSED_REASONS.map((option) => (
            <label key={option.value} className={cn("flex min-h-11 cursor-pointer items-center gap-3 border px-3 text-sm transition-colors", reason === option.value ? "border-ink-950 bg-ink-50" : "border-border hover:border-ink-400")}>
              <input type="radio" name="reason" value={option.value} checked={reason === option.value} onChange={() => { setReason(option.value); setError(undefined); }} className="accent-ink-950" />
              {option.label}
            </label>
          ))}
        </div>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </fieldset>
    </Dialog>
  );
}

function DeleteDialog({
  enquiry,
  onClose,
  onDeleted,
}: {
  enquiry: Enquiry;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [reason, setReason] = useState<"spam" | "erasure-request" | "">("");
  const [typed, setTyped] = useState("");
  const mutation = useAdminMutation(() => api.enquiries.remove(enquiry.id, reason as "spam" | "erasure-request"), {
    success: "Enquiry deleted",
    failure: "The enquiry was not deleted",
    onSuccess: onDeleted,
  });
  const ready = reason !== "" && typed.trim().toUpperCase() === enquiry.reference;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Delete this enquiry?"
      description="This permanently removes the enquiry, its notes and its history. It cannot be undone."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keep it
          </Button>
          <Button variant="danger" disabled={!ready} busy={mutation.isPending} onClick={() => mutation.mutate(undefined)}>
            Delete permanently
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <fieldset>
          <legend className="text-[0.8125rem] font-medium">Why?</legend>
          <div className="mt-2 grid gap-2">
            {[
              { value: "spam" as const, label: "Spam", detail: "Not a real customer." },
              { value: "erasure-request" as const, label: "The customer asked to be erased", detail: "Their right to erasure under UK GDPR." },
            ].map((option) => (
              <label key={option.value} className={cn("flex cursor-pointer items-start gap-3 border px-3 py-2.5 transition-colors", reason === option.value ? "border-ink-950 bg-ink-50" : "border-border hover:border-ink-400")}>
                <input type="radio" name="delete-reason" checked={reason === option.value} onChange={() => setReason(option.value)} className="mt-1 accent-ink-950" />
                <span>
                  <span className="block text-sm">{option.label}</span>
                  <span className="block text-xs text-ink-600">{option.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={`Type the reference ${enquiry.reference} to confirm`}>
          {(c) => <TextInput {...c} value={typed} autoComplete="off" spellCheck={false} autoCapitalize="characters" onChange={(event) => setTyped(event.target.value)} />}
        </Field>
        {reason === "erasure-request" ? (
          <p className="text-xs text-ink-600">Also remove them from anything held outside this system, such as WhatsApp chats or the enquiry email inbox.</p>
        ) : null}
      </div>
    </Dialog>
  );
}
