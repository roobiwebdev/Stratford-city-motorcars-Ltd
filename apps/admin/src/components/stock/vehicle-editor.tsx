"use client";

import {
  BODY_TYPES,
  ConflictError,
  FUEL_TYPES,
  HPI_STATUSES,
  NotFoundError,
  PUBLIC_PRICE_RANGE,
  TRANSMISSIONS,
  ValidationError,
  errorMessage,
  formatDate,
  formatPrice,
  listingProgress,
  slugify,
  type AdminVehicle,
  type BodyType,
  type FuelType,
  type HpiStatus,
  type MotTestRecord,
  type Transmission,
  type VehicleImage,
  type VehicleRecord,
} from "@Stratford-city-motorcars-Ltd/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Copy,
  EyeOff,
  Plus,
  RotateCcw,
  Save,
  Send,
  Star,
  StarOff,
  Tag as TagIcon,
  Trash2,
  Undo2,
  Unlock,
  Archive,
  ExternalLink,
} from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { routes } from "@/components/shell/routes";
import { Tag, VehicleStatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { ChoiceGroup, Field, FieldGrid, NumberInput, Select, TextArea, TextInput } from "@/components/ui/form";
import { ActionMenu, type MenuAction } from "@/components/ui/menu";
import { ErrorState, LoadingBlock, Notice, PageBody, PageHeader, Panel } from "@/components/ui/page";
import { notify } from "@/components/ui/toast";
import { useUnsavedChanges } from "@/components/ui/unsaved";
import { api, SITE_URL } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { queryKeys } from "@/lib/query";
import { useSession } from "@/lib/session";

import { MediaManager } from "./media-manager";
import { PublishingPanel, SECTIONS, type SectionId } from "./publishing-panel";
import { useVehicleActions, vehicleName } from "./vehicle-actions";

/** The editable part of an AdminVehicle. */
function toRecord(vehicle: AdminVehicle): VehicleRecord {
  const { reservation: _reservation, sale: _sale, openEnquiryCount: _count, ...record } = vehicle;
  return record;
}

/** Field paths the API reports, mapped to the section they live in. */
const FIELD_SECTION: Record<string, SectionId> = {
  title: "identity",
  make: "identity",
  model: "identity",
  variant: "identity",
  year: "identity",
  registration: "identity",
  price: "price",
  adminFee: "price",
  mileage: "specification",
  colour: "specification",
  description: "description",
  features: "description",
  slug: "visibility",
  seoTitle: "visibility",
  seoDescription: "visibility",
};

export function VehicleEditor({ id }: { id: string }) {
  const query = useQuery({ queryKey: queryKeys.vehicle(id), queryFn: () => api.stock.get(id) });

  if (query.error) {
    return (
      <PageBody>
        <PageHeader back={{ label: "Cars", href: routes.stock }} title={query.error instanceof NotFoundError ? "Car not found" : "This car could not be loaded"} />
        <ErrorState error={query.error} onRetry={query.error instanceof NotFoundError ? undefined : () => void query.refetch()} />
      </PageBody>
    );
  }
  if (!query.data) {
    return (
      <PageBody>
        <LoadingBlock label="Loading the car" />
      </PageBody>
    );
  }
  // Keyed by id so opening another car starts a fresh form.
  return <Editor key={query.data.id} vehicle={query.data} />;
}

function Editor({ vehicle: loaded }: { vehicle: AdminVehicle }) {
  const client = useQueryClient();
  const { can } = useSession();
  const canEdit = can("stock.edit");

  /** The last version the server confirmed, and what is on screen. */
  const [vehicle, setVehicle] = useState(loaded);
  const [base, setBase] = useState<VehicleRecord>(() => toRecord(loaded));
  const [draft, setDraft] = useState<VehicleRecord>(() => toRecord(loaded));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(() => !loaded.slug.startsWith("new-car-"));

  const dirty = JSON.stringify(base) !== JSON.stringify(draft);
  useUnsavedChanges(dirty && canEdit);

  const accept = (next: AdminVehicle) => {
    setVehicle(next);
    setBase(toRecord(next));
    setDraft(toRecord(next));
    client.setQueryData(queryKeys.vehicle(next.id), next);
  };

  const actions = useVehicleActions({ onChange: (result) => accept(result.vehicle) });

  // A newer version fetched in the background (a change made elsewhere) is
  // taken up when there are no unsaved edits; otherwise the version check
  // on save reports the conflict.
  useEffect(() => {
    if (!dirty && loaded.updatedAt > vehicle.updatedAt) accept(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to a newer server version
  }, [loaded.updatedAt]);

  const set = <K extends keyof VehicleRecord>(key: K, value: VehicleRecord[K]) => {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (!slugTouched && (key === "title" || key === "year") && current.status === "draft") {
        const suggested = slugify([next.title, next.year].filter(Boolean).join(" "));
        if (suggested) next.slug = suggested;
      }
      return next;
    });
    if (fieldErrors[key as string]) setFieldErrors(({ [key as string]: _removed, ...rest }) => rest);
  };

  const progress = listingProgress(draft);

  const save = async (): Promise<AdminVehicle | null> => {
    setSaving(true);
    try {
      const result = await api.stock.save(draft, { expectedUpdatedAt: vehicle.updatedAt });
      accept(result.vehicle);
      setFieldErrors({});
      setConflict(false);
      await client.invalidateQueries({ queryKey: queryKeys.all, refetchType: "active" });
      notify.success("Saved", result.vehicle.status === "published" && listingProgress(result.vehicle).live ? "The website shows the change on the next visit." : undefined);
      return result.vehicle;
    } catch (error) {
      if (error instanceof ConflictError) {
        setConflict(true);
      } else if (error instanceof ValidationError) {
        setFieldErrors(error.fields);
        const first = Object.keys(error.fields)[0];
        const section = first ? FIELD_SECTION[first] ?? (first.startsWith("media") ? "media" : undefined) : undefined;
        notify.error("Not saved", Object.values(error.fields)[0] ?? error.message);
        if (section) document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        notify.error("Not saved", errorMessage(error));
      }
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveThenPublish = async () => {
    const current = dirty ? await save() : vehicle;
    if (current) await actions.publish(current);
  };

  const reload = async () => {
    const latest = await client.fetchQuery({ queryKey: queryKeys.vehicle(vehicle.id), queryFn: () => api.stock.get(vehicle.id) });
    accept(latest);
    setConflict(false);
    notify.info("Loaded the latest version", "Your unsaved changes were discarded.");
  };

  const name = vehicleName(draft);
  const liveUrl = `${SITE_URL}/vehicles/${vehicle.slug}`;
  const persistedLive = listingProgress(vehicle).live;

  const menu: MenuAction[] = [
    { label: "View on website", icon: <ExternalLink />, onSelect: () => window.open(liveUrl, "_blank", "noopener"), hidden: !persistedLive },
    { label: vehicle.featured ? "Remove from homepage" : "Feature on homepage", icon: vehicle.featured ? <StarOff /> : <Star />, onSelect: () => void actions.feature(vehicle, !vehicle.featured), hidden: vehicle.status !== "published" || !canEdit, disabled: dirty, reason: dirty ? "Save your changes first." : undefined },
    { label: "Reserve", icon: <TagIcon />, onSelect: () => actions.reserve(vehicle), hidden: vehicle.status !== "published" || vehicle.reserved || !canEdit, disabled: dirty, reason: dirty ? "Save your changes first." : undefined },
    { label: "Release reservation", icon: <Unlock />, onSelect: () => void actions.release(vehicle), hidden: !vehicle.reserved || vehicle.status !== "published" || !canEdit, disabled: dirty, reason: dirty ? "Save your changes first." : undefined },
    { label: "Mark as sold", icon: <BadgeCheck />, onSelect: () => actions.sell(vehicle), hidden: vehicle.status !== "published" || !canEdit, disabled: dirty, reason: dirty ? "Save your changes first." : undefined },
    { label: "Put back on sale", icon: <Undo2 />, onSelect: () => void actions.undoSale(vehicle), hidden: vehicle.status !== "sold" || !canEdit },
    { label: "Unpublish", icon: <EyeOff />, onSelect: () => void actions.unpublish(vehicle), hidden: vehicle.status !== "published" || !canEdit, disabled: dirty, reason: dirty ? "Save your changes first." : undefined },
    "separator",
    { label: "Duplicate", icon: <Copy />, onSelect: () => void actions.duplicate(vehicle), hidden: !canEdit },
    { label: "Archive", icon: <Archive />, tone: "danger", onSelect: () => void actions.archive(vehicle), hidden: vehicle.status === "archived" || !can("stock.archive") },
    { label: "Restore as draft", icon: <RotateCcw />, onSelect: () => void actions.restore(vehicle), hidden: vehicle.status !== "archived" || !can("stock.archive") },
  ];

  const primary =
    vehicle.status === "draft" && canEdit ? (
      <Button variant={dirty ? "secondary" : "primary"} onClick={() => void saveThenPublish()} disabled={saving || actions.busy} className="max-sm:hidden">
        <Send aria-hidden />
        {dirty ? "Save & publish" : "Publish"}
      </Button>
    ) : null;

  return (
    <PageBody className="pb-32 lg:pb-24">
      <PageHeader
        back={{ label: "Cars", href: routes.stock }}
        title={name}
        meta={
          <>
            <VehicleStatusBadge status={vehicle.status} live={vehicle.status === "published" ? persistedLive : undefined} />
            {vehicle.reserved ? <Tag className="border-brass/60 text-brass-deep">Reserved</Tag> : null}
            {vehicle.featured ? <Tag icon={<Star aria-hidden />}>Featured</Tag> : null}
            <span className="text-xs text-ink-500">{dirty ? "Unsaved changes" : `Saved ${formatRelative(vehicle.updatedAt)}`}</span>
          </>
        }
        actions={
          <>
            <ActionMenu label="More actions" actions={menu} trigger="More" />
            {primary}
            {canEdit ? (
              <Button variant={vehicle.status === "draft" && !dirty ? "secondary" : "primary"} onClick={() => void save()} busy={saving} disabled={!dirty} className="max-sm:hidden">
                <Save aria-hidden />
                Save
              </Button>
            ) : null}
          </>
        }
      />

      {!canEdit ? <Notice className="mb-6">Your role can view this car but not change it.</Notice> : null}

      {conflict ? (
        <Notice
          tone="danger"
          className="mb-6"
          title="Someone else saved this car after you opened it"
          action={
            <Button size="sm" onClick={() => void reload()}>
              Load their version
            </Button>
          }
        >
          Your changes have not been saved. Loading the latest version discards them — copy anything you need first.
        </Notice>
      ) : null}

      {vehicle.sale ? (
        <Notice className="mb-6" title={`Sold ${formatDate(vehicle.sale.soldAt)}${vehicle.sale.customerName ? ` to ${vehicle.sale.customerName}` : ""}`}>
          {vehicle.sale.salePrice !== null ? `Sale price ${formatPrice(vehicle.sale.salePrice)}. ` : ""}The page stays on the website marked SOLD.
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="order-2 flex min-w-0 flex-col gap-6 xl:order-1">
          <Section id="identity" title="The car">
            <FieldGrid>
              <Field label="Make" required error={fieldErrors.make}>
                {(c) => <TextInput {...c} value={draft.make} disabled={!canEdit} onChange={(e) => set("make", e.target.value)} placeholder="e.g. Porsche" autoCapitalize="words" />}
              </Field>
              <Field label="Model" required error={fieldErrors.model}>
                {(c) => <TextInput {...c} value={draft.model} disabled={!canEdit} onChange={(e) => set("model", e.target.value)} placeholder="e.g. 911" />}
              </Field>
              <Field label="Variant" error={fieldErrors.variant}>
                {(c) => <TextInput {...c} value={draft.variant ?? ""} disabled={!canEdit} onChange={(e) => set("variant", e.target.value || undefined)} placeholder="e.g. Carrera 4S PDK" />}
              </Field>
              <Field label="Year" required error={fieldErrors.year}>
                {(c) => <NumberInput {...c} value={draft.year} disabled={!canEdit} onValueChange={(v) => set("year", v)} placeholder="e.g. 2019" maxLength={4} formatGroups={false} />}
              </Field>
              <Field
                label="Listing title"
                required
                className="sm:col-span-2"
                error={fieldErrors.title}
                counter={{ length: draft.title.length, max: 160 }}
                description="The headline on the website, exactly as you want it. The year is shown beside it."
                action={
                  canEdit && (draft.make || draft.model) ? (
                    <button type="button" className="text-xs text-ink-600 underline decoration-brass underline-offset-4 hover:text-foreground" onClick={() => set("title", [draft.make, draft.model, draft.variant].filter(Boolean).join(" "))}>
                      Use make and model
                    </button>
                  ) : null
                }
              >
                {(c) => <TextInput {...c} value={draft.title} disabled={!canEdit} onChange={(e) => set("title", e.target.value)} />}
              </Field>
              <Field label="Registration" description="Kept for your records; not shown on the website.">
                {(c) => <TextInput {...c} value={draft.registration ?? ""} disabled={!canEdit} maxLength={12} autoCapitalize="characters" onChange={(e) => set("registration", e.target.value.toUpperCase() || undefined)} />}
              </Field>
              <Field label="First registered">
                {(c) => <TextInput {...c} type="date" value={draft.registrationDate ?? ""} disabled={!canEdit} onChange={(e) => set("registrationDate", e.target.value || undefined)} />}
              </Field>
            </FieldGrid>
          </Section>

          <Section id="price" title="Price">
            <div className="space-y-5">
              <Field label="How the price is shown">
                {(c) => (
                  <ChoiceGroup
                    control={c}
                    label="How the price is shown"
                    value={draft.priceOnApplication ? "poa" : "price"}
                    onChange={(value) => set("priceOnApplication", value === "poa")}
                    options={[
                      { value: "price", label: "Cash price" },
                      { value: "poa", label: "Price on application" },
                    ]}
                    className={cn("sm:max-w-md", !canEdit && "pointer-events-none opacity-60")}
                  />
                )}
              </Field>
              <FieldGrid>
                {draft.priceOnApplication ? (
                  <p className="text-[0.8125rem] leading-relaxed text-ink-700 sm:col-span-2">
                    The website shows POA and sorts the car with the most valuable stock. Any price you keep below is for your records only.
                  </p>
                ) : null}
                <Field
                  label={draft.priceOnApplication ? "Price (not shown)" : "Cash price"}
                  required={!draft.priceOnApplication}
                  error={fieldErrors.price}
                  description={`The website lists cars from ${formatPrice(PUBLIC_PRICE_RANGE.min)} to ${formatPrice(PUBLIC_PRICE_RANGE.max)}.`}
                >
                  {(c) => <NumberInput {...c} prefix="£" value={draft.price} disabled={!canEdit} onValueChange={(v) => set("price", v)} />}
                </Field>
                <Field label="Admin or delivery fee" description="Shown next to the price when set.">
                  {(c) => <NumberInput {...c} prefix="£" value={draft.adminFee ?? null} disabled={!canEdit} onValueChange={(v) => set("adminFee", v ?? undefined)} />}
                </Field>
              </FieldGrid>
              <Notice>
                Monthly finance figures are switched off for the whole website until the firm&rsquo;s FCA status wording and a lender are confirmed.
              </Notice>
            </div>
          </Section>

          <Section id="specification" title="Specification">
            <FieldGrid className="lg:grid-cols-3">
              <Field label="Mileage" required error={fieldErrors.mileage}>
                {(c) => <NumberInput {...c} suffix="miles" value={draft.mileage} disabled={!canEdit} onValueChange={(v) => set("mileage", v)} />}
              </Field>
              <Field label="Fuel" required>
                {(c) => (
                  <Select {...c} value={draft.fuel ?? ""} disabled={!canEdit} onChange={(e) => set("fuel", (e.target.value || null) as FuelType | null)}>
                    <option value="">Choose…</option>
                    {FUEL_TYPES.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Gearbox" required>
                {(c) => (
                  <Select {...c} value={draft.transmission ?? ""} disabled={!canEdit} onChange={(e) => set("transmission", (e.target.value || null) as Transmission | null)}>
                    <option value="">Choose…</option>
                    {TRANSMISSIONS.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Body style" required>
                {(c) => (
                  <Select {...c} value={draft.bodyType ?? ""} disabled={!canEdit} onChange={(e) => set("bodyType", (e.target.value || null) as BodyType | null)}>
                    <option value="">Choose…</option>
                    {BODY_TYPES.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Colour" required error={fieldErrors.colour}>
                {(c) => <TextInput {...c} value={draft.colour} disabled={!canEdit} onChange={(e) => set("colour", e.target.value)} placeholder="As you describe it" />}
              </Field>
              <Field label="Interior">
                {(c) => <TextInput {...c} value={draft.interior ?? ""} disabled={!canEdit} onChange={(e) => set("interior", e.target.value || undefined)} placeholder="e.g. Black leather" />}
              </Field>
              <Field label="Engine">
                {(c) => <TextInput {...c} value={draft.engine ?? ""} disabled={!canEdit} onChange={(e) => set("engine", e.target.value || undefined)} placeholder="e.g. 3.0L Twin-Turbo" />}
              </Field>
              <Field label="Engine size">
                {(c) => <NumberInput {...c} suffix="cc" value={draft.engineSizeCc ?? null} disabled={!canEdit} onValueChange={(v) => set("engineSizeCc", v ?? undefined)} />}
              </Field>
              <Field label="Power">
                {(c) => <TextInput {...c} value={draft.power ?? ""} disabled={!canEdit} onChange={(e) => set("power", e.target.value || undefined)} placeholder="e.g. 450 PS" />}
              </Field>
              <Field label="Doors">
                {(c) => <NumberInput {...c} value={draft.doors ?? null} disabled={!canEdit} onValueChange={(v) => set("doors", v ?? undefined)} />}
              </Field>
              <Field label="Seats">
                {(c) => <NumberInput {...c} value={draft.seats ?? null} disabled={!canEdit} onValueChange={(v) => set("seats", v ?? undefined)} />}
              </Field>
              <Field label="Previous owners">
                {(c) => <NumberInput {...c} value={draft.previousOwners ?? null} disabled={!canEdit} onValueChange={(v) => set("previousOwners", v ?? undefined)} />}
              </Field>
              <Field label="Insurance group">
                {(c) => <TextInput {...c} value={draft.insuranceGroup ?? ""} disabled={!canEdit} maxLength={10} onChange={(e) => set("insuranceGroup", e.target.value || undefined)} />}
              </Field>
              <Field label="Road tax band">
                {(c) => <TextInput {...c} value={draft.roadTaxBand ?? ""} disabled={!canEdit} maxLength={40} onChange={(e) => set("roadTaxBand", e.target.value || undefined)} />}
              </Field>
            </FieldGrid>
          </Section>

          <Section id="history" title="History & checks" description="Only enter what your records show. Anything left blank tells buyers to ask you, rather than guessing.">
            <div className="space-y-6">
              <FieldGrid>
                <Field label="Service history" className="sm:col-span-2">
                  {(c) => <TextInput {...c} value={draft.serviceHistory ?? ""} disabled={!canEdit} maxLength={200} onChange={(e) => set("serviceHistory", e.target.value || undefined)} placeholder="e.g. Full Porsche main dealer history" />}
                </Field>
                <Field label="MOT expires">
                  {(c) => <TextInput {...c} type="date" value={draft.motExpiry ?? ""} disabled={!canEdit} onChange={(e) => set("motExpiry", e.target.value || undefined)} />}
                </Field>
                <Field label="Documents">
                  {(c) => <TextInput {...c} value={draft.documentation ?? ""} disabled={!canEdit} maxLength={300} onChange={(e) => set("documentation", e.target.value || undefined)} placeholder="e.g. V5C present, two keys" />}
                </Field>
              </FieldGrid>

              <Field label="History check (HPI)" description="Run through the Autotrader portal. “Not known” shows buyers “ask us”.">
                {(c) => (
                  <ChoiceGroup
                    control={c}
                    label="History check"
                    value={draft.hpiStatus}
                    onChange={(value: HpiStatus) => set("hpiStatus", value)}
                    options={HPI_STATUSES.map((value) => ({ value, label: value === "clear" ? "Clear" : value === "not-checked" ? "Not checked" : "Not known" }))}
                    className={cn("sm:max-w-md", !canEdit && "pointer-events-none opacity-60")}
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Warranty available" description="Third-party warranty, always sold separately.">
                  {(c) => (
                    <TriState control={c} label="Warranty available" value={draft.warranty.available} disabled={!canEdit} onChange={(value) => set("warranty", { ...draft.warranty, available: value })} />
                  )}
                </Field>
                <Field label="ULEZ compliant" description="From the Euro rating — never assumed from year or fuel.">
                  {(c) => <TriState control={c} label="ULEZ compliant" value={draft.ulezCompliant} disabled={!canEdit} onChange={(value) => set("ulezCompliant", value)} />}
                </Field>
                {draft.warranty.available ? (
                  <>
                    <Field label="Longest warranty term">
                      {(c) => <NumberInput {...c} suffix="months" value={draft.warranty.termMonths ?? null} disabled={!canEdit} onValueChange={(v) => set("warranty", { ...draft.warranty, termMonths: v ?? undefined })} />}
                    </Field>
                    <Field label="Warranty note">
                      {(c) => <TextInput {...c} value={draft.warranty.notes ?? ""} disabled={!canEdit} maxLength={300} onChange={(e) => set("warranty", { ...draft.warranty, notes: e.target.value || undefined })} />}
                    </Field>
                  </>
                ) : null}
              </div>

              <MotHistory rows={draft.motHistory} disabled={!canEdit} onChange={(rows) => set("motHistory", rows)} />
            </div>
          </Section>

          <Section id="description" title="Description & features">
            <div className="space-y-6">
              <Field label="Description" required error={fieldErrors.description} counter={{ length: draft.description.length, max: 6000 }} description="Write it as you would describe the car to a buyer in the showroom.">
                {(c) => <TextArea {...c} rows={8} value={draft.description} disabled={!canEdit} onChange={(e) => set("description", e.target.value)} />}
              </Field>
              <Features items={draft.features} disabled={!canEdit} error={fieldErrors.features} onChange={(items) => set("features", items)} />
            </div>
          </Section>

          <Section id="media" title="Photographs & video">
            <MediaManager
              vehicleId={vehicle.id}
              media={draft.media}
              coverImageId={draft.coverImageId}
              canEdit={canEdit}
              onChange={(media) => set("media", media)}
              onCoverChange={(coverId) => set("coverImageId", coverId)}
              onUploaded={(image: VehicleImage) => {
                // Already stored on the car: add it to both, so an upload alone is not an unsaved change.
                setBase((current) => ({ ...current, media: [...current.media, image] }));
                setDraft((current) => ({ ...current, media: [...current.media, image] }));
              }}
            />
          </Section>

          <Section id="visibility" title="Web address & search">
            <div className="space-y-5">
              <Field
                label="Web address"
                required
                error={fieldErrors.slug}
                description={
                  vehicle.listedAt && draft.slug !== vehicle.slug
                    ? `This car has been on the website. Its old address, /vehicles/${vehicle.slug}, will keep redirecting here.`
                    : `${SITE_URL.replace(/^https?:\/\//, "")}/vehicles/${draft.slug || "…"}`
                }
                action={
                  canEdit ? (
                    <button
                      type="button"
                      className="text-xs text-ink-600 underline decoration-brass underline-offset-4 hover:text-foreground"
                      onClick={() => {
                        setSlugTouched(true);
                        set("slug", slugify([draft.title, draft.year].filter(Boolean).join(" ")));
                      }}
                    >
                      Suggest from title
                    </button>
                  ) : null
                }
              >
                {(c) => (
                  <TextInput
                    {...c}
                    value={draft.slug}
                    disabled={!canEdit}
                    spellCheck={false}
                    autoCapitalize="none"
                    onChange={(e) => {
                      setSlugTouched(true);
                      set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                    }}
                  />
                )}
              </Field>
              {vehicle.previousSlugs.length ? (
                <p className="text-xs text-ink-600">
                  Also redirects from: {vehicle.previousSlugs.map((slug) => `/vehicles/${slug}`).join(", ")}
                </p>
              ) : null}
              <FieldGrid>
                <Field label="Search title" description="Leave blank to use the listing title." error={fieldErrors.seoTitle} counter={{ length: (draft.seoTitle ?? "").length, max: 70 }}>
                  {(c) => <TextInput {...c} value={draft.seoTitle ?? ""} disabled={!canEdit} onChange={(e) => set("seoTitle", e.target.value || undefined)} />}
                </Field>
                <Field label="Search description" description="Leave blank to use the start of the description." error={fieldErrors.seoDescription} counter={{ length: (draft.seoDescription ?? "").length, max: 170 }}>
                  {(c) => <TextArea {...c} rows={3} value={draft.seoDescription ?? ""} disabled={!canEdit} onChange={(e) => set("seoDescription", e.target.value || undefined)} />}
                </Field>
              </FieldGrid>
              <SearchPreview record={draft} />
            </div>
          </Section>
        </div>

        <aside className="order-1 min-w-0 xl:order-2">
          <div className="xl:sticky xl:top-18">
            <PublishingPanel vehicle={vehicle} draft={draft} progress={progress} dirty={dirty} canEdit={canEdit} />
          </div>
        </aside>
      </div>

      {/* Phones: the two things you do most, always within reach. */}
      {canEdit ? (
        <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:hidden">
          {vehicle.status === "draft" ? (
            <Button className="flex-1" onClick={() => void saveThenPublish()} disabled={saving || actions.busy}>
              <Send aria-hidden />
              {dirty ? "Save & publish" : "Publish"}
            </Button>
          ) : null}
          <Button variant="primary" className="flex-1" onClick={() => void save()} busy={saving} disabled={!dirty}>
            <Save aria-hidden />
            {dirty ? "Save" : "Saved"}
          </Button>
        </div>
      ) : null}

      {actions.render}
    </PageBody>
  );
}

function Section({ id, title, description, children }: { id: SectionId; title: string; description?: string; children: ReactNode }) {
  const index = SECTIONS.findIndex((section) => section.id === id) + 1;
  return (
    <Panel
      id={id}
      title={
        <h2 className="flex items-baseline gap-3">
          <span data-numeric className="admin-eyebrow">
            {String(index).padStart(2, "0")}
          </span>
          <span className="font-display text-lg">{title}</span>
        </h2>
      }
    >
      {description ? <p className="-mt-1 mb-5 text-[0.8125rem] leading-relaxed text-ink-600">{description}</p> : null}
      {children}
    </Panel>
  );
}

function TriState({
  value,
  onChange,
  label,
  disabled,
  control,
}: {
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  label: string;
  disabled?: boolean;
  control: Parameters<typeof ChoiceGroup>[0]["control"];
}) {
  return (
    <ChoiceGroup
      control={control}
      label={label}
      value={value === null ? "unknown" : value ? "yes" : "no"}
      onChange={(next) => onChange(next === "unknown" ? null : next === "yes")}
      options={[
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "unknown", label: "Not known" },
      ]}
      className={cn(disabled && "pointer-events-none opacity-60")}
    />
  );
}

function MotHistory({ rows, onChange, disabled }: { rows: MotTestRecord[]; onChange: (rows: MotTestRecord[]) => void; disabled?: boolean }) {
  const update = (index: number, patch: Partial<MotTestRecord>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">MOT history</h3>
          <p className="text-xs text-muted-foreground">Newest first, from the MOT record.</p>
        </div>
        {!disabled ? (
          <Button size="sm" onClick={() => onChange([{ date: "", result: "pass" }, ...rows])}>
            <Plus aria-hidden />
            Add test
          </Button>
        ) : null}
      </div>
      {rows.length ? (
        <ul className="mt-3 divide-y divide-border border border-border">
          {rows.map((row, index) => (
            <li key={index} className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-[10rem_8rem_9rem_minmax(0,1fr)_auto] sm:items-center">
              <TextInput type="date" aria-label={`Test ${index + 1} date`} value={row.date} disabled={disabled} onChange={(e) => update(index, { date: e.target.value })} />
              <Select aria-label={`Test ${index + 1} result`} value={row.result} disabled={disabled} onChange={(e) => update(index, { result: e.target.value as MotTestRecord["result"] })}>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
              </Select>
              <NumberInput aria-label={`Test ${index + 1} mileage`} suffix="miles" value={row.mileage ?? null} disabled={disabled} onValueChange={(v) => update(index, { mileage: v ?? undefined })} />
              <TextInput aria-label={`Test ${index + 1} advisories`} placeholder="Advisories" value={row.notes ?? ""} disabled={disabled} onChange={(e) => update(index, { notes: e.target.value || undefined })} className="col-span-2 sm:col-span-1" />
              {!disabled ? (
                <IconButton label={`Remove test ${index + 1}`} size="sm" className="col-span-2 justify-self-end hover:text-destructive sm:col-span-1" onClick={() => onChange(rows.filter((_, i) => i !== index))}>
                  <Trash2 aria-hidden />
                </IconButton>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[0.8125rem] text-ink-500">No MOT tests recorded.</p>
      )}
    </div>
  );
}

function Features({ items, onChange, disabled, error }: { items: string[]; onChange: (items: string[]) => void; disabled?: boolean; error?: string }) {
  const [text, setText] = useState("");
  const add = () => {
    const values = text
      .split(/\n|,(?=\s*[A-Z0-9])/)
      .map((value) => value.trim())
      .filter((value) => value && !items.includes(value));
    if (values.length) onChange([...items, ...values].slice(0, 60));
    setText("");
  };
  const move = (index: number, direction: -1 | 1) => {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };
  return (
    <div>
      <h3 className="text-sm font-medium">Features</h3>
      <p className="text-xs text-muted-foreground">The equipment buyers look for. Shown as a list on the car&rsquo;s page.</p>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      {items.length ? (
        <ol className="mt-3 divide-y divide-border border border-border">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-center gap-2 py-1 pr-1 pl-3">
              <span className="min-w-0 flex-1 truncate text-sm">{item}</span>
              {!disabled ? (
                <>
                  <IconButton label={`Move ${item} up`} size="sm" disabled={index === 0} onClick={() => move(index, -1)}>
                    <ArrowUp aria-hidden />
                  </IconButton>
                  <IconButton label={`Move ${item} down`} size="sm" disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDown aria-hidden />
                  </IconButton>
                  <IconButton label={`Remove ${item}`} size="sm" className="hover:text-destructive" onClick={() => onChange(items.filter((_, i) => i !== index))}>
                    <Trash2 aria-hidden />
                  </IconButton>
                </>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
      {!disabled ? (
        <div className="mt-3 flex gap-2">
          <TextInput
            aria-label="Add a feature"
            value={text}
            maxLength={400}
            placeholder="e.g. Sport Chrono Package"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button onClick={add} disabled={!text.trim()}>
            Add
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Roughly how the listing appears in Google results. */
function SearchPreview({ record }: { record: VehicleRecord }) {
  const title = record.seoTitle || `${vehicleName(record)} for sale | Stratford City Motorcars`;
  const description = record.seoDescription || record.description.slice(0, 160) || "Add a description to see how it will read.";
  return (
    <div className="border border-border bg-surface p-4">
      <p className="admin-label">Search preview</p>
      <p className="mt-2 truncate text-xs text-ink-600">{SITE_URL.replace(/^https?:\/\//, "")} › vehicles › {record.slug || "…"}</p>
      <p className="mt-1 line-clamp-1 text-lg leading-snug text-[#1a0dab]">{title}</p>
      <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-relaxed text-ink-700">{description}</p>
    </div>
  );
}
