"use client";

import {
  PHOTO_CATEGORIES,
  REQUIRED_DEALER_PHOTOS,
  ValidationError,
  errorMessage,
  type PhotoCategory,
  type VehicleImage,
  type VehicleMedia,
  type VehicleSpin,
  type VehicleVideo,
} from "@Stratford-city-motorcars-Ltd/core";
import { useRef, useState, type DragEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  ImagePlus,
  Link2,
  Orbit,
  Star,
  Trash2,
  Video,
  X,
} from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button, IconButton, Spinner } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/dialog";
import { Field, Select, TextInput } from "@/components/ui/form";
import { Photo } from "@/components/ui/photo";
import { api } from "@/lib/api";

const CATEGORY_LABEL: Record<PhotoCategory, string> = {
  exterior: "Exterior",
  interior: "Interior",
  detail: "Detail",
  documents: "Documents",
};

type Upload = { key: string; name: string; progress: number; error?: string };

/**
 * Photographs, walkaround video and 360° links for one car.
 *
 * Designed for a phone in the showroom first: one button opens the camera or
 * the photo library and takes many photographs at once, and order is changed
 * with move buttons. On a desktop, files can be dropped and photos dragged.
 *
 * Uploads are stored against the car at once (so nothing taken on a phone is
 * lost); category, description, order, cover and removals are kept when the
 * car is saved.
 */
export function MediaManager({
  vehicleId,
  media,
  coverImageId,
  onChange,
  onCoverChange,
  onUploaded,
  canEdit,
  error,
}: {
  vehicleId: string;
  media: VehicleMedia[];
  coverImageId?: string;
  onChange: (media: VehicleMedia[]) => void;
  onCoverChange: (id: string | undefined) => void;
  /** An upload the API has stored — added without marking the form unsaved. */
  onUploaded: (image: VehicleImage) => void;
  canEdit: boolean;
  error?: string;
}) {
  const confirm = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<PhotoCategory>("exterior");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  const images = media.filter((item): item is VehicleImage => item.kind === "image");
  const dealer = images.filter((image) => image.provenance === "dealer");
  const videos = media.filter((item): item is VehicleVideo => item.kind === "video");
  const spins = media.filter((item): item is VehicleSpin => item.kind === "spin");
  const cover = dealer.find((image) => image.id === coverImageId) ?? dealer.find((image) => image.category === "exterior") ?? dealer[0];
  const counts = Object.fromEntries(PHOTO_CATEGORIES.map((value) => [value, dealer.filter((image) => image.category === value).length])) as Record<PhotoCategory, number>;

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    const batch = list.map((file) => ({ key: `${file.name}-${crypto.randomUUID()}`, name: file.name, progress: 0 }));
    setUploads((current) => [...current, ...batch]);
    const uploadCategory = category;
    // One at a time: a phone on showroom Wi-Fi copes better, and order is kept.
    for (const [i, file] of list.entries()) {
      const key = batch[i]!.key;
      try {
        const image = await api.stock.uploadImage(vehicleId, file, { category: uploadCategory, alt: "" }, (progress) =>
          setUploads((current) => current.map((item) => (item.key === key ? { ...item, progress } : item))),
        );
        onUploaded(image);
        setUploads((current) => current.filter((item) => item.key !== key));
      } catch (caught) {
        const message = caught instanceof ValidationError && caught.fields.file ? caught.fields.file : errorMessage(caught, "The upload failed.");
        setUploads((current) => current.map((item) => (item.key === key ? { ...item, error: message } : item)));
      }
    }
  };

  const update = (id: string, patch: Partial<VehicleImage>) =>
    onChange(media.map((item) => (item.id === id && item.kind === "image" ? { ...item, ...patch } : item)));

  const move = (id: string, direction: -1 | 1) => {
    // Photographs move past each other only; links keep their place.
    const neighbour = images[images.findIndex((image) => image.id === id) + direction];
    if (!neighbour) return;
    const index = media.findIndex((item) => item.id === id);
    const target = media.findIndex((item) => item.id === neighbour.id);
    const next = [...media];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  const moveTo = (id: string, beforeId: string) => {
    if (id === beforeId) return;
    const item = media.find((entry) => entry.id === id);
    if (!item) return;
    const rest = media.filter((entry) => entry.id !== id);
    const index = rest.findIndex((entry) => entry.id === beforeId);
    rest.splice(index < 0 ? rest.length : index, 0, item);
    onChange(rest);
  };

  const remove = async (item: VehicleMedia) => {
    const ok = await confirm({
      title: item.kind === "image" ? "Remove this photograph?" : "Remove this link?",
      body:
        item.kind === "image"
          ? "It is removed from the car when you save, and deleted from storage then."
          : "It is removed from the car when you save.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    if (item.id === coverImageId) onCoverChange(undefined);
    onChange(media.filter((entry) => entry.id !== item.id));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files.length) void upload(event.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      {/* Where this car stands against the publishing minimum and the 20+ standard. */}
      <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
        {(["exterior", "interior"] as const).map((value) => {
          const required = REQUIRED_DEALER_PHOTOS[value] ?? 0;
          const met = counts[value] >= required;
          return (
            <div key={value} className="flex items-center justify-between gap-2 bg-surface-raised px-3.5 py-3">
              <span>
                <span className="admin-label block">{CATEGORY_LABEL[value]}</span>
                <span data-numeric className="mt-1 block text-sm">
                  {counts[value]} <span className="text-ink-500">· {required}+ needed</span>
                </span>
              </span>
              {met ? <Check className="size-4 text-success" aria-label="Enough to publish" /> : <CircleAlert className="size-4 text-destructive" aria-label="Needed to publish" />}
            </div>
          );
        })}
        <div className="bg-surface-raised px-3.5 py-3">
          <span className="admin-label block">All photographs</span>
          <span data-numeric className="mt-1 block text-sm">
            {dealer.length} <span className="text-ink-500">of 20+ target</span>
          </span>
        </div>
        <div className="bg-surface-raised px-3.5 py-3">
          <span className="admin-label block">Walkaround</span>
          <span className="mt-1 block text-sm">{videos.some((video) => video.provenance === "dealer") ? "Added" : <span className="text-ink-500">Not yet</span>}</span>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {canEdit ? (
        <div
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("Files")) {
              event.preventDefault();
              setDragOver(true);
            }
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col gap-4 border border-dashed p-4 transition-colors sm:flex-row sm:items-center sm:justify-between sm:p-5",
            dragOver ? "border-ink-900 bg-ink-50" : "border-border-strong bg-surface",
          )}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">Add photographs</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              JPEG, PNG, WebP or AVIF, at least 1200 × 800. <span className="hidden sm:inline">Drop files here, or choose them.</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="sm:w-40">
              <Select aria-label="Category for new photographs" value={category} onChange={(event) => setCategory(event.target.value as PhotoCategory)}>
                {PHOTO_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    As {CATEGORY_LABEL[value].toLowerCase()}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="primary" onClick={() => inputRef.current?.click()}>
              <ImagePlus aria-hidden />
              Choose photographs
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                if (event.target.files) void upload(event.target.files);
                event.target.value = "";
              }}
            />
          </div>
        </div>
      ) : null}

      {uploads.length ? (
        <ul aria-live="polite" className="divide-y divide-border border border-border bg-surface-raised">
          {uploads.map((item) => (
            <li key={item.key} className="flex items-center gap-3 px-4 py-3">
              {item.error ? <CircleAlert className="size-4 shrink-0 text-destructive" aria-hidden /> : <Spinner className="shrink-0 text-ink-500" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{item.name}</p>
                {item.error ? (
                  <p className="text-xs text-destructive">{item.error}</p>
                ) : (
                  <div className="mt-1.5 h-1 bg-ink-150" role="progressbar" aria-valuenow={Math.round(item.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${item.name}`}>
                    <div className="h-full bg-ink-900 transition-[width] duration-200" style={{ width: `${item.progress * 100}%` }} />
                  </div>
                )}
              </div>
              {item.error ? (
                <IconButton label="Dismiss" size="sm" onClick={() => setUploads((current) => current.filter((entry) => entry.key !== item.key))}>
                  <X aria-hidden />
                </IconButton>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {images.length === 0 && uploads.length === 0 ? (
        <p className="border border-border bg-surface-raised px-4 py-6 text-sm text-muted-foreground">
          No photographs yet. The website needs at least one exterior and one interior photograph taken by you before this car can be published.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {images.map((image, index) => {
            const isCover = image.id === cover?.id;
            const library = image.provenance === "library";
            return (
              <li
                key={image.id}
                draggable={canEdit}
                onDragStart={(event) => {
                  setDragging(image.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setDragging(null)}
                onDragOver={(event) => {
                  if (dragging) event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!dragging) return;
                  event.preventDefault();
                  event.stopPropagation();
                  moveTo(dragging, image.id);
                  setDragging(null);
                }}
                className={cn(
                  "flex flex-col border bg-surface-raised transition-[opacity,border-color]",
                  dragging === image.id ? "opacity-40" : "",
                  isCover ? "border-ink-900" : "border-border",
                  library && "border-dashed",
                )}
              >
                <div className="relative">
                  <Photo src={image.src} alt={image.alt || `Photograph ${index + 1}`} label={CATEGORY_LABEL[image.category]} className="aspect-[3/2] w-full" sizes="(min-width: 640px) 320px, 100vw" />
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {isCover ? (
                      <Badge tone="ink">
                        <Star className="size-3" aria-hidden /> Cover
                      </Badge>
                    ) : null}
                    {library ? <Badge tone="danger">Library — not your photo</Badge> : null}
                  </div>
                  <span data-numeric className="absolute right-2 bottom-2 bg-ink-950/80 px-1.5 py-0.5 text-[0.6875rem] text-bone">
                    {index + 1}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-3">
                  {library ? (
                    <p className="text-xs leading-snug text-ink-600">A reference image of the same model. It never counts towards publishing and is never shown on the website.</p>
                  ) : null}
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <Select aria-label={`Category for photograph ${index + 1}`} value={image.category} disabled={!canEdit} onChange={(event) => update(image.id, { category: event.target.value as PhotoCategory })}>
                      {PHOTO_CATEGORIES.map((value) => (
                        <option key={value} value={value}>
                          {CATEGORY_LABEL[value]}
                        </option>
                      ))}
                    </Select>
                    {!library && !isCover && canEdit ? (
                      <Button size="md" onClick={() => onCoverChange(image.id)}>
                        Make cover
                      </Button>
                    ) : null}
                  </div>
                  <Field label={`Photo ${index + 1} description`} description={image.alt ? undefined : "Describe the car and the angle, for screen readers and Google Images."}>
                    {(control) => (
                      <TextInput
                        {...control}
                        value={image.alt}
                        maxLength={250}
                        disabled={!canEdit}
                        placeholder="e.g. Front three-quarter view in GT Silver"
                        onChange={(event) => update(image.id, { alt: event.target.value })}
                      />
                    )}
                  </Field>
                  {canEdit ? (
                    <div className="mt-auto flex items-center justify-between border-t border-border pt-2">
                      <div className="flex">
                        <IconButton label={`Move photograph ${index + 1} earlier`} size="sm" disabled={index === 0} onClick={() => move(image.id, -1)}>
                          <ArrowLeft aria-hidden />
                        </IconButton>
                        <IconButton label={`Move photograph ${index + 1} later`} size="sm" disabled={index === images.length - 1} onClick={() => move(image.id, 1)}>
                          <ArrowRight aria-hidden />
                        </IconButton>
                      </div>
                      <IconButton label={`Remove photograph ${index + 1}`} size="sm" className="hover:bg-destructive/10 hover:text-destructive" onClick={() => void remove(image)}>
                        <Trash2 aria-hidden />
                      </IconButton>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <LinkedMedia videos={videos} spins={spins} canEdit={canEdit} onAdd={(item) => onChange([...media, item])} onRemove={(item) => void remove(item)} />
    </div>
  );
}

/** "https://youtu.be/abc…" → a video source, or null. */
function parseVideoLink(value: string): VehicleVideo["source"] | null {
  const text = value.trim();
  const youtube = text.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (youtube) return { type: "youtube", videoId: youtube[1]! };
  const vimeo = text.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/);
  if (vimeo) return { type: "vimeo", videoId: vimeo[1]! };
  return null;
}

function LinkedMedia({
  videos,
  spins,
  canEdit,
  onAdd,
  onRemove,
}: {
  videos: VehicleVideo[];
  spins: VehicleSpin[];
  canEdit: boolean;
  onAdd: (item: VehicleVideo | VehicleSpin) => void;
  onRemove: (item: VehicleVideo | VehicleSpin) => void;
}) {
  const [kind, setKind] = useState<"video" | "spin">("video");
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [linkError, setLinkError] = useState<string>();

  const add = () => {
    const id = `m-${crypto.randomUUID().slice(0, 12)}`;
    if (kind === "video") {
      const source = parseVideoLink(link);
      if (!source) {
        setLinkError("Paste a YouTube or Vimeo link, e.g. https://youtu.be/…");
        return;
      }
      onAdd({ id, kind: "video", title: title.trim() || "Walkaround", source, provenance: "dealer" });
    } else {
      if (!/^https:\/\/\S+$/.test(link.trim())) {
        setLinkError("Paste the full link, starting https://");
        return;
      }
      onAdd({ id, kind: "spin", title: title.trim() || "360° view", url: link.trim(), provenance: "dealer" });
    }
    setLink("");
    setTitle("");
    setLinkError(undefined);
  };

  const linked = [...videos, ...spins];

  return (
    <div className="border-t border-border pt-5">
      <h3 className="text-sm font-medium">Walkaround video and 360° view</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Upload the video to YouTube as unlisted (or Vimeo) and paste the link. It only loads when a buyer presses play.
      </p>

      {linked.length ? (
        <ul className="mt-3 divide-y divide-border border border-border bg-surface-raised">
          {linked.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
              {item.kind === "video" ? <Video className="size-4 shrink-0 text-ink-500" aria-hidden /> : <Orbit className="size-4 shrink-0 text-ink-500" aria-hidden />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{item.title}</p>
                <p className="truncate text-xs text-ink-500">
                  {item.kind === "video"
                    ? item.source.type === "file"
                      ? "Video file"
                      : `${item.source.type === "youtube" ? "YouTube" : "Vimeo"} · ${item.source.videoId}`
                    : item.url}
                </p>
              </div>
              {canEdit ? (
                <IconButton label={`Remove ${item.title}`} size="sm" className="hover:bg-destructive/10 hover:text-destructive" onClick={() => onRemove(item)}>
                  <Trash2 aria-hidden />
                </IconButton>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canEdit ? (
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[9rem_minmax(0,1fr)_minmax(0,12rem)_auto] md:items-start">
          <Select aria-label="Type of link" value={kind} onChange={(event) => setKind(event.target.value as "video" | "spin")}>
            <option value="video">Video</option>
            <option value="spin">360° view</option>
          </Select>
          <div>
            <div className="relative">
              <Link2 aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-500" />
              <TextInput
                aria-label={kind === "video" ? "YouTube or Vimeo link" : "360° view link"}
                aria-invalid={linkError ? true : undefined}
                value={link}
                onChange={(event) => {
                  setLink(event.target.value);
                  setLinkError(undefined);
                }}
                placeholder={kind === "video" ? "https://youtu.be/…" : "https://…"}
                className="pl-9"
                inputMode="url"
              />
            </div>
            {linkError ? <p className="mt-1 text-xs text-destructive">{linkError}</p> : null}
          </div>
          <TextInput aria-label="Title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === "video" ? "Walkaround" : "360° view"} />
          <Button onClick={add} disabled={!link.trim()}>
            Add link
          </Button>
        </div>
      ) : null}
    </div>
  );
}
