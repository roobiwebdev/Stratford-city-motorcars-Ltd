"use client";

import {
  CUSTOMER_SORTS,
  ConflictError,
  DEFAULT_PAGE_SIZE,
  NotFoundError,
  ValidationError,
  errorMessage,
  formatDate,
  formatPrice,
  type Customer,
  type CustomerDetail,
  type CustomerListQuery,
  type CustomerSort,
} from "@Stratford-city-motorcars-Ltd/core";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PencilLine, UserRound } from "lucide-react";

import { EnquiryLine, ContactActions } from "@/components/enquiries/parts";
import { routes } from "@/components/shell/routes";
import { AppointmentStatusBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGrid, Select, TextArea, TextInput } from "@/components/ui/form";
import { DefinitionList, EmptyState, ErrorState, LoadingBlock, LoadingRows, PageBody, PageHeader, Panel } from "@/components/ui/page";
import { DataTable, rowLinkClass, type Column } from "@/components/ui/table";
import { Pagination, SearchField, SegmentedFilter, Toolbar } from "@/components/ui/toolbar";
import { GuardedLink, useUnsavedChanges } from "@/components/ui/unsaved";
import { api } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import { queryKeys, useAdminMutation } from "@/lib/query";
import { useSession } from "@/lib/session";

type Filter = NonNullable<CustomerListQuery["filter"]>;

/**
 * People who have enquired, come in or bought, grouped from their enquiries
 * by the API. Nothing here is a marketing list — there is no consent to
 * contact anyone about anything other than their own enquiry.
 */
export function CustomerList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filter = (["all", "open-enquiries", "buyers"] as const).find((value) => value === params.get("filter")) ?? "all";
  const sort = (CUSTOMER_SORTS.map((item) => item.value) as CustomerSort[]).find((value) => value === params.get("sort")) ?? "recent";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [debounced, setDebounced] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const setParams = (next: Record<string, string | undefined>, resetPage = true) => {
    const query = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all" || (key === "sort" && value === "recent")) query.delete(key);
      else query.set(key, value);
    }
    if (resetPage && !("page" in next)) query.delete("page");
    router.replace(`${pathname}${query.size ? `?${query}` : ""}` as Route, { scroll: false });
  };

  useEffect(() => {
    if ((params.get("q") ?? "") !== debounced) setParams({ q: debounced || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync the debounced search into the URL only
  }, [debounced]);

  const listQuery: CustomerListQuery = { filter, sort, search: debounced || undefined, page, pageSize: DEFAULT_PAGE_SIZE };
  const { data, isPending, error, refetch, isPlaceholderData } = useQuery({
    queryKey: queryKeys.customers(listQuery),
    queryFn: () => api.customers.list(listQuery),
    placeholderData: keepPreviousData,
  });

  const columns: Column<Customer>[] = [
    {
      id: "name",
      header: "Customer",
      cell: (customer) => (
        <div className="min-w-0">
          <GuardedLink href={routes.customer(customer.id)} className={rowLinkClass}>
            {customer.name}
          </GuardedLink>
          <p className="mt-0.5 truncate text-xs text-ink-500">{[customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact details"}</p>
        </div>
      ),
    },
    {
      id: "activity",
      header: "History",
      cell: (customer) => (
        <div className="flex flex-wrap gap-1.5">
          {customer.openEnquiryCount ? <Tag className="border-brass/60 text-brass-deep">{customer.openEnquiryCount} open</Tag> : null}
          <Tag>
            {customer.enquiryCount} {customer.enquiryCount === 1 ? "enquiry" : "enquiries"}
          </Tag>
          {customer.appointmentCount ? <Tag>{customer.appointmentCount} visits</Tag> : null}
          {customer.purchaseCount ? <Tag className="border-ink-900 text-foreground">Bought {customer.purchaseCount}</Tag> : null}
        </div>
      ),
    },
    { id: "last", header: "Last activity", minWidth: "lg", cell: (customer) => <span className="text-[0.8125rem] text-ink-600">{formatRelative(customer.lastActivityAt)}</span> },
    { id: "contact", header: "Contact", hideHeader: true, align: "right", minWidth: "lg", cell: (customer) => <div className="flex justify-end"><ContactActions enquiry={customer} size="sm" /></div> },
  ];

  return (
    <PageBody>
      <PageHeader
        eyebrow="Sales"
        title="Customers"
        description="Everyone who has enquired, visited or bought — grouped from their enquiries by email address and phone number."
      />

      <SegmentedFilter
        label="Filter customers"
        value={filter}
        onChange={(value: Filter) => setParams({ filter: value })}
        options={[
          { value: "all", label: "Everyone" },
          { value: "open-enquiries", label: "With open enquiries" },
          { value: "buyers", label: "Bought from us" },
        ]}
        className="mb-4"
      />

      <Toolbar>
        <SearchField label="Search customers" placeholder="Name, email or phone" value={search} onChange={setSearch} />
        <div className="w-full sm:ml-auto sm:w-44">
          <Select aria-label="Sort customers" value={sort} onChange={(event) => setParams({ sort: event.target.value })}>
            {CUSTOMER_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </Toolbar>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Customers could not be loaded" />
      ) : isPending ? (
        <LoadingRows label="Loading customers" thumb={false} />
      ) : data.total === 0 ? (
        debounced || filter !== "all" ? (
          <EmptyState compact title="No customers match" body="Try a different search or filter." action={<Button onClick={() => { setSearch(""); setParams({ q: undefined, filter: undefined }); }}>Clear filters</Button>} />
        ) : (
          <EmptyState icon={<UserRound />} title="No customers yet" body="Customers appear here as soon as someone sends an enquiry, or you arrange a viewing for them." />
        )
      ) : (
        <>
          <DataTable
            caption="Customers"
            rows={data.items}
            columns={columns}
            rowKey={(customer) => customer.id}
            sortable={false}
            busy={isPlaceholderData}
            renderCard={(customer) => (
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <GuardedLink href={routes.customer(customer.id)} className={`${rowLinkClass} truncate`}>
                    {customer.name}
                  </GuardedLink>
                  <span className="shrink-0 text-xs text-ink-500">{formatRelative(customer.lastActivityAt)}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-500">{customer.phone ?? customer.email ?? "No contact details"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {customer.openEnquiryCount ? <Tag className="border-brass/60 text-brass-deep">{customer.openEnquiryCount} open</Tag> : null}
                  <Tag>{customer.enquiryCount} {customer.enquiryCount === 1 ? "enquiry" : "enquiries"}</Tag>
                  {customer.purchaseCount ? <Tag className="border-ink-900 text-foreground">Bought {customer.purchaseCount}</Tag> : null}
                </div>
              </div>
            )}
          />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} noun={["customer", "customers"]} onChange={(next) => setParams({ page: String(next) }, false)} />
        </>
      )}
    </PageBody>
  );
}

export function CustomerProfile({ id }: { id: string }) {
  const query = useQuery({ queryKey: queryKeys.customer(id), queryFn: () => api.customers.get(id) });
  if (query.error) {
    return (
      <PageBody>
        <PageHeader back={{ label: "Customers", href: routes.customers }} title={query.error instanceof NotFoundError ? "Customer not found" : "This customer could not be loaded"} />
        <ErrorState error={query.error} onRetry={query.error instanceof NotFoundError ? undefined : () => void query.refetch()} />
      </PageBody>
    );
  }
  if (!query.data) {
    return (
      <PageBody>
        <LoadingBlock label="Loading the customer" />
      </PageBody>
    );
  }
  return <Profile detail={query.data} />;
}

function Profile({ detail }: { detail: CustomerDetail }) {
  const { customer, enquiries, appointments, purchases } = detail;
  const { can } = useSession();
  const [editing, setEditing] = useState(false);

  return (
    <PageBody>
      <PageHeader
        back={{ label: "Customers", href: routes.customers }}
        title={customer.name}
        meta={
          <>
            {customer.openEnquiryCount ? <Tag className="border-brass/60 text-brass-deep">{customer.openEnquiryCount} open enquiries</Tag> : null}
            {customer.purchaseCount ? <Tag className="border-ink-900 text-foreground">Customer · bought {customer.purchaseCount}</Tag> : null}
            <span className="text-xs text-ink-500">First seen {formatDate(customer.createdAt)}</span>
          </>
        }
        actions={<ContactActions enquiry={customer} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title={`Enquiries · ${enquiries.length}`} flush>
            {enquiries.length ? (
              <ul className="divide-y divide-border">
                {enquiries.map((enquiry) => (
                  <li key={enquiry.id}>
                    <EnquiryLine enquiry={enquiry} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-5 text-sm text-ink-600">No enquiries.</p>
            )}
          </Panel>

          <Panel title={`Viewings & test drives · ${appointments.length}`} flush>
            {appointments.length ? (
              <ul className="divide-y divide-border">
                {appointments.map((appointment) => (
                  <li key={appointment.id}>
                    <GuardedLink href={`${routes.viewings}?open=${appointment.id}` as Route} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-ink-50 sm:px-5">
                      <span className="min-w-0">
                        <span className="block text-sm">{formatDateTime(appointment.startsAt)}</span>
                        <span className="block truncate text-xs text-ink-600">
                          {appointment.type === "test-drive" ? "Test drive" : "Viewing"} · {appointment.vehicleTitle ?? "Car not set"}
                        </span>
                      </span>
                      <AppointmentStatusBadge status={appointment.status} />
                    </GuardedLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-5 text-sm text-ink-600">None arranged.</p>
            )}
          </Panel>

          {purchases.length ? (
            <Panel title="Bought" flush>
              <ul className="divide-y divide-border">
                {purchases.map((purchase) => (
                  <li key={purchase.vehicleId}>
                    <GuardedLink href={routes.vehicle(purchase.vehicleId)} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink-50 sm:px-5">
                      <span>
                        <span className="block text-sm">{[purchase.year, purchase.title].filter(Boolean).join(" ")}</span>
                        <span className="block text-xs text-ink-600">Sold {formatDate(purchase.soldAt)}</span>
                      </span>
                      {purchase.salePrice !== null ? (
                        <span data-numeric className="text-sm font-medium">
                          {formatPrice(purchase.salePrice)}
                        </span>
                      ) : null}
                    </GuardedLink>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Panel
            title="Details"
            action={
              can("customers.edit") && !editing ? (
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                  <PencilLine aria-hidden />
                  Edit
                </Button>
              ) : null
            }
          >
            {editing ? (
              <CustomerForm customer={customer} onDone={() => setEditing(false)} />
            ) : (
              <>
                <DefinitionList
                  stacked
                  items={[
                    { label: "Phone", value: customer.phone },
                    { label: "Email", value: customer.email ? <span className="[overflow-wrap:anywhere]">{customer.email}</span> : null },
                  ]}
                />
                <div className="mt-4 border-t border-border pt-4">
                  <p className="admin-label">Notes</p>
                  <p className="mt-1.5 text-sm whitespace-pre-line text-ink-800">{customer.notes || <span className="text-ink-500">No notes.</span>}</p>
                </div>
              </>
            )}
          </Panel>
          <p className="text-xs leading-relaxed text-ink-500">
            Contact customers only about their own enquiries and purchases. Nobody here has agreed to marketing.
          </p>
        </aside>
      </div>
    </PageBody>
  );
}

function CustomerForm({ customer, onDone }: { customer: Customer; onDone: () => void }) {
  const [form, setForm] = useState({ name: customer.name, email: customer.email ?? "", phone: customer.phone ?? "", notes: customer.notes });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = form.name !== customer.name || form.email !== (customer.email ?? "") || form.phone !== (customer.phone ?? "") || form.notes !== customer.notes;
  useUnsavedChanges(dirty);

  const mutation = useAdminMutation(
    () => api.customers.update(customer.id, { name: form.name, email: form.email || null, phone: form.phone || null, notes: form.notes }, { expectedUpdatedAt: customer.updatedAt }),
    { success: "Customer updated", onSuccess: onDone },
  );

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors(({ [key]: _removed, ...rest }) => rest);
  };

  const failure = mutation.error && !(mutation.error instanceof ValidationError) ? (mutation.error instanceof ConflictError ? "Someone else changed this customer. Cancel and try again." : errorMessage(mutation.error)) : null;

  return (
    <div className="space-y-4">
      <Field label="Name" required error={errors.name}>
        {(c) => <TextInput {...c} value={form.name} onChange={(e) => set("name", e.target.value)} />}
      </Field>
      <FieldGrid className="sm:grid-cols-1">
        <Field label="Phone" error={errors.phone}>
          {(c) => <TextInput {...c} type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />}
        </Field>
        <Field label="Email" error={errors.email}>
          {(c) => <TextInput {...c} type="email" inputMode="email" value={form.email} onChange={(e) => set("email", e.target.value)} />}
        </Field>
      </FieldGrid>
      <Field label="Notes" error={errors.notes} description="Internal. Keep to what helps you serve them.">
        {(c) => <TextArea {...c} rows={4} value={form.notes} onChange={(e) => set("notes", e.target.value)} />}
      </Field>
      {failure ? (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          variant="primary"
          busy={mutation.isPending}
          disabled={!dirty}
          onClick={() => mutation.mutate(undefined, { onError: (error) => error instanceof ValidationError && setErrors(error.fields) })}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
