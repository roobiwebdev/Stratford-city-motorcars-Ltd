"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { Button } from "@/components/ui/button";
import { Dialog, useConfirm } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/form";
import { notify } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { SAMPLE_PASSWORD } from "@/lib/api/mock/fixtures";
import { getControls, resetDb, setControls, STORAGE_FULL_EVENT, type SampleControls as Controls } from "@/lib/api/mock/store";
import { queryKeys } from "@/lib/query";
import { useSession } from "@/lib/session";

/**
 * Sample mode: always visible, so nobody mistakes the sample for the real
 * thing. Opens controls for reviewing the admin — switch between the owner
 * and staff views, slow the network, make requests fail, start again.
 *
 * Only rendered when NEXT_PUBLIC_ADMIN_DATA is `mock`.
 */
export function SampleModeButton({ className, compact }: { className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [storageFull, setStorageFull] = useState(false);

  useEffect(() => {
    const onFull = () => setStorageFull(true);
    window.addEventListener(STORAGE_FULL_EVENT, onFull);
    return () => window.removeEventListener(STORAGE_FULL_EVENT, onFull);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-9 items-center gap-2 border border-brass/60 bg-brass/10 px-2.5 text-[0.6875rem] font-medium tracking-[0.08em] text-brass-deep uppercase transition-colors hover:bg-brass/20",
          className,
        )}
      >
        <FlaskConical className="size-3.5" aria-hidden />
        {compact ? "Sample" : "Sample data"}
        {storageFull ? <span className="sr-only">, changes will not survive a reload</span> : null}
        {storageFull ? <span aria-hidden className="size-1.5 bg-destructive" /> : null}
      </button>
      {open ? <SampleControlsDialog onClose={() => setOpen(false)} storageFull={storageFull} /> : null}
    </>
  );
}

function SampleControlsDialog({ onClose, storageFull }: { onClose: () => void; storageFull: boolean }) {
  const [controls, set] = useState<Controls>(() => getControls());
  const { user } = useSession();
  const client = useQueryClient();
  const confirm = useConfirm();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const update = (next: Partial<Controls>) => {
    setControls(next);
    set(getControls());
  };

  const switchUser = async (email: string) => {
    setSwitching(true);
    try {
      const next = await api.session.signIn({ email, password: SAMPLE_PASSWORD });
      client.setQueryData(queryKeys.session, next);
      await client.invalidateQueries({ queryKey: queryKeys.all });
      notify.success(`Now viewing as ${next.name}`, next.role === "owner" ? "Owner" : "Staff");
      onClose();
    } catch (error) {
      notify.error("Could not switch", error instanceof Error ? error.message : undefined);
    } finally {
      setSwitching(false);
    }
  };

  const reset = async () => {
    const ok = await confirm({
      title: "Reset the sample data?",
      body: "Every change you have made in this tab — cars, enquiries, notes, viewings — is replaced with the original sample.",
      confirmLabel: "Reset sample data",
      tone: "danger",
    });
    if (!ok) return;
    resetDb();
    await client.invalidateQueries({ queryKey: queryKeys.all });
    notify.success("Sample data reset");
    onClose();
    router.refresh();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Sample data"
      description="This admin is running on invented records so it can be reviewed before the backend exists."
      width="30rem"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-6 text-sm">
        <ul className="space-y-1.5 text-[0.8125rem] leading-relaxed text-ink-700">
          <li>Nothing is saved to a server and nothing is sent to anyone.</li>
          <li>Changes stay in this browser tab until you close it or reset.</li>
          <li>Customers are invented; emails use example.com and phone numbers the reserved 07700 900 range.</li>
          <li>Photographs are placeholders until the dealership supplies its own.</li>
        </ul>

        {storageFull ? (
          <p className="border-l-2 border-destructive bg-destructive/6 px-3 py-2 text-[0.8125rem] text-ink-800">
            This tab&rsquo;s storage is full (usually from added photographs). Your changes still work, but a reload will lose the latest ones.
          </p>
        ) : null}

        <section>
          <h3 className="admin-label">View the admin as</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { email: "owner@example.com", label: "Owner", detail: "Daniel Reyes" },
              { email: "staff@example.com", label: "Staff", detail: "Priya Shah" },
            ].map((option) => {
              const current = user.email === option.email;
              return (
                <button
                  key={option.email}
                  type="button"
                  disabled={current || switching}
                  onClick={() => void switchUser(option.email)}
                  aria-pressed={current}
                  className={cn(
                    "flex flex-col items-start border px-3 py-2.5 text-left transition-colors",
                    current ? "border-ink-950 bg-ink-950 text-bone" : "border-border-strong hover:border-ink-500",
                  )}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className={cn("text-xs", current ? "text-bone/70" : "text-muted-foreground")}>{option.detail}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="admin-label">Test loading and errors</h3>
          <Checkbox
            label="Slow network"
            description="Every request takes about two seconds."
            checked={controls.latency === "slow"}
            onChange={(checked) => update({ latency: checked ? "slow" : "normal" })}
          />
          <Checkbox
            label="Fail the next request"
            description="The next load or save fails once, as if the connection dropped."
            checked={controls.failures === "next"}
            onChange={(checked) => update({ failures: checked ? "next" : "off" })}
          />
          <Checkbox
            label="Fail every request"
            description="Everything fails until you turn this off."
            checked={controls.failures === "always"}
            onChange={(checked) => update({ failures: checked ? "always" : "off" })}
          />
        </section>

        <section>
          <h3 className="admin-label">Start again</h3>
          <Button variant="danger" size="sm" className="mt-2" onClick={() => void reset()}>
            Reset sample data
          </Button>
        </section>
      </div>
    </Dialog>
  );
}
