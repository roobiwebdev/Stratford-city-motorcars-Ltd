"use client";

import { ConflictError, ROLES, ValidationError, errorMessage, type BusinessDetails, type Settings as SettingsData } from "@Stratford-city-motorcars-Ltd/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Check, CircleAlert, Minus } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGrid, TextArea, TextInput } from "@/components/ui/form";
import { ErrorState, LoadingBlock, Notice, PageBody, PageHeader, Panel } from "@/components/ui/page";
import { useUnsavedChanges } from "@/components/ui/unsaved";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { queryKeys, useAdminMutation } from "@/lib/query";
import { useSession } from "@/lib/session";

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function Settings() {
  const { data, error, refetch } = useQuery({ queryKey: queryKeys.settings, queryFn: () => api.settings.get() });

  if (error) {
    return (
      <PageBody>
        <PageHeader eyebrow="Business" title="Settings" />
        <ErrorState error={error} onRetry={() => void refetch()} title="Settings could not be loaded" />
      </PageBody>
    );
  }
  if (!data) {
    return (
      <PageBody>
        <LoadingBlock label="Loading settings" />
      </PageBody>
    );
  }
  return <SettingsView key={data.updatedAt} settings={data} />;
}

function SettingsView({ settings }: { settings: SettingsData }) {
  const { user, can } = useSession();
  const canEdit = can("settings.edit");
  const client = useQueryClient();
  const [form, setForm] = useState<BusinessDetails>(settings.business);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(form) !== JSON.stringify(settings.business);
  useUnsavedChanges(dirty && canEdit);

  const mutation = useAdminMutation(() => api.settings.updateBusiness(form, { expectedUpdatedAt: settings.updatedAt }), {
    success: "Business details saved",
    onSuccess: () => setErrors({}),
  });

  const set = <K extends keyof BusinessDetails>(key: K, value: BusinessDetails[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors(({ [key]: _removed, ...rest }) => rest);
  };
  const setHours = <K extends keyof BusinessDetails["hours"]>(key: K, value: BusinessDetails["hours"][K]) => {
    setForm((current) => ({ ...current, hours: { ...current.hours, [key]: value } }));
    setErrors(({ [`hours.${key}`]: _removed, ...rest }) => rest);
  };

  const save = () =>
    mutation.mutate(undefined, {
      onError: (error) => {
        if (error instanceof ValidationError) setErrors(error.fields);
      },
    });

  const notifications = settings.integrations.notifications;
  const anyNotification = notifications.some((item) => item.configured);
  const failure =
    mutation.error && !(mutation.error instanceof ValidationError && Object.keys(mutation.error.fields).length)
      ? mutation.error instanceof ConflictError
        ? "Someone else saved these settings after you opened them."
        : errorMessage(mutation.error)
      : null;

  return (
    <PageBody className="pb-32 sm:pb-24">
      <PageHeader
        eyebrow="Business"
        title="Settings"
        description="The dealership’s details and how the website is set up."
        actions={
          canEdit ? (
            <Button variant="primary" onClick={save} busy={mutation.isPending} disabled={!dirty} className="max-sm:hidden">
              Save changes
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {!anyNotification ? (
            <Notice tone="danger" title="Nobody is told about new enquiries">
              Enquiries are stored and appear in this admin, but no email, text or webhook is set up — so unless someone checks here, a customer can wait. Ask your developer to connect one.
            </Notice>
          ) : null}

          {!canEdit ? <Notice>Only the owner can change these details.</Notice> : null}

          {failure ? (
            <Notice
              tone="danger"
              title="Not saved"
              action={
                mutation.error instanceof ConflictError ? (
                  <Button size="sm" onClick={() => void client.invalidateQueries({ queryKey: queryKeys.settings })}>
                    Load their version
                  </Button>
                ) : null
              }
            >
              {failure}
            </Notice>
          ) : null}

          <Panel title="Business details">
            <fieldset disabled={!canEdit} className="space-y-5">
              <Notice>
                These are shown across the website — header, footer, contact page and search results. Keep them identical to your Google Business Profile.
              </Notice>
              <FieldGrid>
                <Field label="Business name" required error={errors.name} className="sm:col-span-2">
                  {(c) => <TextInput {...c} value={form.name} onChange={(e) => set("name", e.target.value)} />}
                </Field>
                <Field label="Phone, as shown" required error={errors.phoneDisplay}>
                  {(c) => <TextInput {...c} value={form.phoneDisplay} onChange={(e) => set("phoneDisplay", e.target.value)} />}
                </Field>
                <Field label="Phone, for dialling" required error={errors.phoneE164} description="International format, e.g. +447700900123.">
                  {(c) => <TextInput {...c} value={form.phoneE164} inputMode="tel" onChange={(e) => set("phoneE164", e.target.value.replace(/[^\d+]/g, ""))} />}
                </Field>
                <Field label="WhatsApp number" required error={errors.whatsappNumber} description="Digits only, starting 44.">
                  {(c) => <TextInput {...c} value={form.whatsappNumber} inputMode="numeric" onChange={(e) => set("whatsappNumber", e.target.value.replace(/\D/g, ""))} />}
                </Field>
                <Field label="Email" required error={errors.email}>
                  {(c) => <TextInput {...c} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />}
                </Field>
                <Field label="Street" required error={errors.street}>
                  {(c) => <TextInput {...c} value={form.street} onChange={(e) => set("street", e.target.value)} />}
                </Field>
                <Field label="Town or city" required error={errors.locality}>
                  {(c) => <TextInput {...c} value={form.locality} onChange={(e) => set("locality", e.target.value)} />}
                </Field>
                <Field label="Postcode" required error={errors.postcode}>
                  {(c) => <TextInput {...c} value={form.postcode} autoCapitalize="characters" onChange={(e) => set("postcode", e.target.value.toUpperCase())} />}
                </Field>
                <Field label="Parking">
                  {(c) => <TextInput {...c} value={form.parking} onChange={(e) => set("parking", e.target.value)} />}
                </Field>
              </FieldGrid>
            </fieldset>
          </Panel>

          <Panel title="Opening hours">
            <fieldset disabled={!canEdit} className="space-y-5">
              <div>
                <p className="text-[0.8125rem] font-medium text-ink-800">Open days</p>
                <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Open days">
                  {WEEK.map((day) => {
                    const on = form.hours.days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setHours("days", on ? form.hours.days.filter((item) => item !== day) : WEEK.filter((item) => item === day || form.hours.days.includes(item)))}
                        className={cn("h-10 min-w-12 border px-3 text-[0.8125rem] transition-colors", on ? "border-ink-950 bg-ink-950 text-bone" : "border-border-strong bg-surface-raised text-ink-700 hover:border-ink-500")}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
                {errors["hours.days"] ? <p className="mt-1.5 text-[0.8125rem] text-destructive">{errors["hours.days"]}</p> : null}
              </div>
              <FieldGrid>
                <Field label="Opens" required error={errors["hours.opens"]}>
                  {(c) => <TextInput {...c} type="time" step={900} value={form.hours.opens} onChange={(e) => setHours("opens", e.target.value)} />}
                </Field>
                <Field label="Closes" required error={errors["hours.closes"]}>
                  {(c) => <TextInput {...c} type="time" step={900} value={form.hours.closes} onChange={(e) => setHours("closes", e.target.value)} />}
                </Field>
                <Field label="Other days">
                  {(c) => <TextInput {...c} value={form.hours.weekendNote} onChange={(e) => setHours("weekendNote", e.target.value)} />}
                </Field>
                <Field label="Bank holidays and closures">
                  {(c) => <TextInput {...c} value={form.hours.bankHolidayNote} onChange={(e) => setHours("bankHolidayNote", e.target.value)} />}
                </Field>
                <Field label="Outside opening hours" className="sm:col-span-2">
                  {(c) => <TextArea {...c} rows={2} value={form.hours.outOfHoursNote} onChange={(e) => setHours("outOfHoursNote", e.target.value)} />}
                </Field>
              </FieldGrid>
            </fieldset>
          </Panel>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Panel title="Enquiry notifications">
            <ul className="space-y-2.5">
              {notifications.map((item) => (
                <StatusRow key={item.channel} ok={item.configured} label={item.channel === "webhook" ? "Webhook (Zapier, Make, n8n)" : item.channel === "email" ? "Email" : "Text message (SMS)"} value={item.configured ? "Connected" : "Not set up"} />
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-ink-500">Connected by your developer with the provider&rsquo;s account details — never entered here.</p>
          </Panel>

          <Panel title="Website features">
            <ul className="space-y-4">
              <FeatureRow label="Monthly finance figures" on={settings.compliance.financePromotions.enabled} detail={settings.compliance.financePromotions.detail} />
              <FeatureRow
                label={`Online reservations${settings.compliance.reservations.depositGbp ? ` · £${settings.compliance.reservations.depositGbp} deposit` : ""}`}
                on={settings.compliance.reservations.enabled}
                detail={settings.compliance.reservations.detail}
              />
            </ul>
            <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-ink-500">
              These are switched on by a developer once the wording, provider and terms are confirmed — not from here, because they are regulated.
            </p>
          </Panel>

          <Panel title="Company">
            <ul className="space-y-2.5">
              <StatusRow label="Company number" value={settings.compliance.companyNumber} />
              <StatusRow label="VAT number" value={settings.compliance.vatNumber ?? "Not shown"} ok={settings.compliance.vatNumber ? true : undefined} />
              <StatusRow label="Stock and enquiries storage" ok={settings.integrations.storage === "connected"} value={settings.integrations.storage === "connected" ? "Connected" : "Not connected"} />
              <StatusRow label="Photograph storage" value={settings.integrations.media === "local-disk" ? "Server disk" : "Cloud storage"} />
            </ul>
          </Panel>

          <Panel title="Your account">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-[0.8125rem] text-ink-600">{user.email}</p>
            <p className="mt-2 text-[0.8125rem] text-ink-700">
              {ROLES.find((role) => role.value === user.role)?.label} — {ROLES.find((role) => role.value === user.role)?.summary}
            </p>
            <p className="mt-3 text-xs text-ink-500">Settings last changed {formatRelative(settings.updatedAt)}.</p>
          </Panel>
        </aside>
      </div>

      {canEdit ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:hidden">
          <Button variant="primary" className="w-full" onClick={save} busy={mutation.isPending} disabled={!dirty}>
            {dirty ? "Save changes" : "No changes"}
          </Button>
        </div>
      ) : null}
    </PageBody>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: ReactNode; ok?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-4 text-[0.8125rem]">
      <span className="text-ink-700">{label}</span>
      <span className="flex items-center gap-1.5 text-right font-medium" data-numeric>
        {ok === true ? <Check className="size-3.5 text-success" aria-hidden /> : ok === false ? <CircleAlert className="size-3.5 text-destructive" aria-hidden /> : null}
        {value}
      </span>
    </li>
  );
}

function FeatureRow({ label, on, detail }: { label: string; on: boolean; detail: string }) {
  return (
    <li>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">{label}</span>
        {on ? (
          <Badge tone="ink" dot>
            On
          </Badge>
        ) : (
          <Badge tone="dashed">
            <Minus className="size-3" aria-hidden /> Off
          </Badge>
        )}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-600">{detail}</p>
    </li>
  );
}
