"use client";

import {
  ValidationError,
  errorMessage,
  formatPrice,
  type AdminVehicle,
  type PublicationIssue,
  type SaveVehicleResult,
} from "@Stratford-city-motorcars-Ltd/core";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { routes } from "@/components/shell/routes";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog, useConfirm } from "@/components/ui/dialog";
import { Field, NumberInput, Select, TextArea, TextInput } from "@/components/ui/form";
import { notify } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { dateKey } from "@/lib/format";
import { queryKeys, useAdminMutation } from "@/lib/query";
import { useSession } from "@/lib/session";

export function vehicleName(vehicle: Pick<AdminVehicle, "year" | "title">) {
  return [vehicle.year, vehicle.title.trim()].filter(Boolean).join(" ") || "Untitled car";
}

type Run = (vehicle: AdminVehicle) => Promise<SaveVehicleResult>;

/**
 * Everything that changes a car's lifecycle — publish, feature, reserve, sell,
 * archive, duplicate — with the confirmations and dialogs each needs. Shared
 * by the stock list and the editor so both behave identically.
 *
 * `render` must be placed in the tree for the dialogs to appear.
 */
export function useVehicleActions(options: { onChange?: (result: SaveVehicleResult) => void } = {}) {
  const { can } = useSession();
  const confirm = useConfirm();
  const router = useRouter();
  const [blocked, setBlocked] = useState<{ vehicle: AdminVehicle; issues: PublicationIssue[] } | null>(null);
  const [reserving, setReserving] = useState<AdminVehicle | null>(null);
  const [selling, setSelling] = useState<AdminVehicle | null>(null);

  const mutation = useAdminMutation(({ run, vehicle }: { run: Run; vehicle: AdminVehicle; success: string }) => run(vehicle), {
    success: undefined,
    onSuccess: (result, input) => {
      notify.success(input.success, vehicleName(result.vehicle));
      options.onChange?.(result);
    },
  });

  const perform = async (vehicle: AdminVehicle, run: Run, success: string) => {
    try {
      await mutation.mutateAsync({ run, vehicle, success });
      return true;
    } catch (error) {
      if (error instanceof ValidationError && error.issues.length) {
        setBlocked({ vehicle, issues: error.issues });
      } else {
        notify.error("Nothing was changed", errorMessage(error));
      }
      return false;
    }
  };

  const version = (vehicle: AdminVehicle) => ({ expectedUpdatedAt: vehicle.updatedAt });

  const actions = {
    busy: mutation.isPending,

    publish: (vehicle: AdminVehicle) => perform(vehicle, (v) => api.stock.publish(v.id, version(v)), "Published — for sale on the website"),

    unpublish: async (vehicle: AdminVehicle) => {
      const ok = await confirm({
        title: "Take this car off the website?",
        body: (
          <>
            <strong className="font-medium">{vehicleName(vehicle)}</strong> goes back to draft. Its page stops working until it is published again
            {vehicle.featured ? ", and it is removed from the homepage" : ""}.
          </>
        ),
        confirmLabel: "Unpublish",
      });
      return ok ? perform(vehicle, (v) => api.stock.unpublish(v.id, version(v)), "Taken off the website") : false;
    },

    feature: (vehicle: AdminVehicle, featured: boolean) =>
      perform(vehicle, (v) => api.stock.setFeatured(v.id, featured, version(v)), featured ? "Featured on the homepage" : "Removed from the homepage"),

    reserve: (vehicle: AdminVehicle) => setReserving(vehicle),

    release: async (vehicle: AdminVehicle) => {
      const ok = await confirm({
        title: "Release the reservation?",
        body: (
          <>
            {vehicle.reservation ? `${vehicle.reservation.customerName}'s reservation is removed and ` : ""}
            the RESERVED badge comes off the website.
            {vehicle.reservation?.depositNote ? " Any deposit taken is not refunded from here." : ""}
          </>
        ),
        confirmLabel: "Release",
      });
      return ok ? perform(vehicle, (v) => api.stock.releaseReservation(v.id, version(v)), "Reservation released") : false;
    },

    sell: (vehicle: AdminVehicle) => setSelling(vehicle),

    undoSale: async (vehicle: AdminVehicle) => {
      const ok = await confirm({
        title: "Put this car back on sale?",
        body: "For a sale that fell through. The SOLD mark and the sale record are removed, and the car returns to the listings.",
        confirmLabel: "Put back on sale",
        tone: "danger",
      });
      return ok ? perform(vehicle, (v) => api.stock.undoSale(v.id, version(v)), "Back on sale") : false;
    },

    archive: async (vehicle: AdminVehicle) => {
      const ok = await confirm({
        title: "Archive this car?",
        body: (
          <>
            <strong className="font-medium">{vehicleName(vehicle)}</strong> is withdrawn: its page on the website stops working and it leaves every
            list. It stays here, and can be restored as a draft.
          </>
        ),
        confirmLabel: "Archive",
        tone: "danger",
      });
      return ok ? perform(vehicle, (v) => api.stock.archive(v.id, version(v)), "Archived") : false;
    },

    restore: (vehicle: AdminVehicle) => perform(vehicle, (v) => api.stock.restore(v.id, version(v)), "Restored as a draft"),

    duplicate: async (vehicle: AdminVehicle) => {
      try {
        const copy = await api.stock.duplicate(vehicle.id);
        notify.success("Copy created as a draft", "Photographs, registration and history are not copied.");
        router.push(routes.vehicle(copy.id));
      } catch (error) {
        notify.error("The copy was not created", errorMessage(error));
      }
    },

    can,
  };

  const render: ReactNode = (
    <>
      {blocked ? <BlockedDialog {...blocked} onClose={() => setBlocked(null)} /> : null}
      {reserving ? (
        <ReserveDialog
          vehicle={reserving}
          onClose={() => setReserving(null)}
          onDone={(result) => {
            setReserving(null);
            options.onChange?.(result);
          }}
        />
      ) : null}
      {selling ? (
        <SellDialog
          vehicle={selling}
          onClose={() => setSelling(null)}
          onDone={(result) => {
            setSelling(null);
            options.onChange?.(result);
          }}
        />
      ) : null}
    </>
  );

  return { ...actions, render };
}

function BlockedDialog({ vehicle, issues, onClose }: { vehicle: AdminVehicle; issues: PublicationIssue[]; onClose: () => void }) {
  return (
    <Dialog
      open
      onClose={onClose}
      title="Not ready for the website"
      description={`${vehicleName(vehicle)} needs these before it can be published. Nothing was changed.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <ButtonLink href={routes.vehicle(vehicle.id)} variant="primary">
            Open the car
            <ArrowRight aria-hidden />
          </ButtonLink>
        </>
      }
    >
      <ul className="space-y-2">
        {issues.map((issue) => (
          <li key={issue.code} className="flex gap-3 text-sm">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 bg-destructive" />
            {issue.message}
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

/** Customers for pickers. A dealership's list stays small enough to load whole. */
function useCustomerOptions() {
  return useQuery({
    queryKey: queryKeys.customers({ picker: true }),
    queryFn: () => api.customers.list({ sort: "name", pageSize: 500 }),
    select: (page) => page.items,
  });
}

function CustomerChoice({
  customerId,
  name,
  onChange,
  error,
  required,
}: {
  customerId: string;
  name: string;
  onChange: (next: { customerId: string; name: string }) => void;
  error?: string;
  required?: boolean;
}) {
  const customers = useCustomerOptions();
  return (
    <div className="space-y-3">
      <Field label="Customer" required={required} description={customers.error ? "The customer list could not be loaded; type their name below." : undefined}>
        {(control) => (
          <Select
            {...control}
            value={customerId}
            disabled={customers.isPending}
            onChange={(event) => {
              const match = customers.data?.find((customer) => customer.id === event.target.value);
              onChange({ customerId: event.target.value, name: match?.name ?? "" });
            }}
          >
            <option value="">{customers.isPending ? "Loading customers…" : "Someone not in the list"}</option>
            {customers.data?.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
                {customer.phone ? ` · ${customer.phone}` : ""}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {customerId ? null : (
        <Field label="Name" required={required} error={error}>
          {(control) => <TextInput {...control} value={name} onChange={(event) => onChange({ customerId: "", name: event.target.value })} autoComplete="off" />}
        </Field>
      )}
    </div>
  );
}

function ReserveDialog({ vehicle, onClose, onDone }: { vehicle: AdminVehicle; onClose: () => void; onDone: (result: SaveVehicleResult) => void }) {
  const [customer, setCustomer] = useState({ customerId: "", name: "" });
  const [depositNote, setDepositNote] = useState("");
  const [note, setNote] = useState("");
  const [nameError, setNameError] = useState<string>();

  const mutation = useAdminMutation(
    () =>
      api.stock.reserve(
        vehicle.id,
        { customerId: customer.customerId || null, customerName: customer.name.trim(), depositNote: depositNote.trim() || undefined, note: note.trim() || undefined },
        { expectedUpdatedAt: vehicle.updatedAt },
      ),
    { success: "Reserved", successDetail: "The website shows a RESERVED badge; the car stays listed.", onSuccess: onDone },
  );

  const submit = () => {
    if (!customer.name.trim()) {
      setNameError("Add who the car is reserved for.");
      return;
    }
    mutation.mutate(undefined, {
      onError: (error) => {
        if (error instanceof ValidationError && error.fields.customerName) setNameError(error.fields.customerName);
      },
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Reserve this car"
      description={vehicleName(vehicle)}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} busy={mutation.isPending}>
            Reserve
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <CustomerChoice required customerId={customer.customerId} name={customer.name} error={nameError} onChange={(next) => { setCustomer(next); setNameError(undefined); }} />
        <Field label="Deposit" description="Deposits are taken in person today. Record what was agreed — no payment is taken here.">
          {(control) => <TextInput {...control} value={depositNote} onChange={(event) => setDepositNote(event.target.value)} placeholder="e.g. £500 by card in the showroom" />}
        </Field>
        <Field label="Note">
          {(control) => <TextArea {...control} rows={3} value={note} onChange={(event) => setNote(event.target.value)} />}
        </Field>
        {mutation.error && !(mutation.error instanceof ValidationError && mutation.error.fields.customerName) ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(mutation.error)}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}

function SellDialog({ vehicle, onClose, onDone }: { vehicle: AdminVehicle; onClose: () => void; onDone: (result: SaveVehicleResult) => void }) {
  const { can } = useSession();
  const [soldOn, setSoldOn] = useState(dateKey(new Date()));
  const [salePrice, setSalePrice] = useState<number | null>(vehicle.price);
  const [customer, setCustomer] = useState({
    customerId: vehicle.reservation?.customerId ?? "",
    name: vehicle.reservation?.customerName ?? "",
  });
  const [enquiryId, setEnquiryId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const enquiries = useQuery({
    queryKey: queryKeys.enquiries({ vehicleId: vehicle.id, picker: true }),
    queryFn: () => api.enquiries.list({ vehicleId: vehicle.id, status: "all", pageSize: 50 }),
    select: (page) => page.items,
  });

  const mutation = useAdminMutation(
    () =>
      api.stock.markSold(
        vehicle.id,
        {
          soldOn,
          salePrice: can("stock.salePrice") ? salePrice : null,
          customerId: customer.customerId || null,
          customerName: customer.name.trim() || null,
          enquiryId: enquiryId || null,
        },
        { expectedUpdatedAt: vehicle.updatedAt },
      ),
    {
      success: "Marked as sold",
      successDetail: "The page stays up marked SOLD, and the car leaves the listings.",
      onSuccess: onDone,
    },
  );

  const submit = () => {
    mutation.mutate(undefined, {
      onError: (error) => {
        if (error instanceof ValidationError) setFieldErrors(error.fields);
      },
    });
  };

  const today = dateKey(new Date());

  return (
    <Dialog
      open
      onClose={onClose}
      title="Mark as sold"
      description={vehicleName(vehicle)}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} busy={mutation.isPending}>
            Mark as sold
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-[0.8125rem] leading-relaxed text-ink-700">
          The car&rsquo;s page stays on the website marked SOLD, with an invitation to ask about something similar. It leaves the listings, the
          homepage and related cars{vehicle.reserved ? ", and its reservation is closed" : ""}.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Sold on" required error={fieldErrors.soldOn}>
            {(control) => <TextInput {...control} type="date" max={today} value={soldOn} onChange={(event) => setSoldOn(event.target.value)} />}
          </Field>
          {can("stock.salePrice") ? (
            <Field label="Sale price" description={vehicle.price ? `Listed at ${formatPrice(vehicle.price)}` : vehicle.priceOnApplication ? "Listed as POA" : undefined}>
              {(control) => <NumberInput {...control} prefix="£" value={salePrice} onValueChange={setSalePrice} />}
            </Field>
          ) : null}
        </div>
        <CustomerChoice customerId={customer.customerId} name={customer.name} onChange={setCustomer} />
        <Field label="From enquiry" description="Linking it marks that enquiry as sold.">
          {(control) => (
            <Select {...control} value={enquiryId} onChange={(event) => setEnquiryId(event.target.value)} disabled={enquiries.isPending}>
              <option value="">{enquiries.isPending ? "Loading enquiries…" : enquiries.data?.length ? "Not from an enquiry" : "No enquiries about this car"}</option>
              {enquiries.data?.map((enquiry) => (
                <option key={enquiry.id} value={enquiry.id}>
                  {enquiry.name} · {enquiry.reference}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {mutation.error && !(mutation.error instanceof ValidationError && Object.keys(mutation.error.fields).length) ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(mutation.error)}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
