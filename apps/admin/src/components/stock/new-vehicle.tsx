"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { routes } from "@/components/shell/routes";
import { ErrorState, LoadingBlock, PageBody, PageHeader } from "@/components/ui/page";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query";

/**
 * Adding a car creates an empty draft straight away and opens it, so
 * photographs can be uploaded against it from the first minute. A draft is
 * never on the website.
 */
export function NewVehicle() {
  const router = useRouter();
  const client = useQueryClient();
  const started = useRef(false);
  const [error, setError] = useState<Error | null>(null);

  const create = () => {
    setError(null);
    api.stock
      .create()
      .then((vehicle) => {
        client.setQueryData(queryKeys.vehicle(vehicle.id), vehicle);
        void client.invalidateQueries({ queryKey: queryKeys.stock });
        router.replace(routes.vehicle(vehicle.id));
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught : new Error("The draft could not be created.")));
  };

  useEffect(() => {
    // Once, even under React's development double-mount.
    if (started.current) return;
    started.current = true;
    create();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on arrival
  }, []);

  return (
    <PageBody>
      {error ? (
        <>
          <PageHeader back={{ label: "Cars", href: routes.stock }} title="Add a car" />
          <ErrorState error={error} onRetry={create} title="The draft could not be created" />
        </>
      ) : (
        <LoadingBlock label="Creating a draft" />
      )}
    </PageBody>
  );
}
