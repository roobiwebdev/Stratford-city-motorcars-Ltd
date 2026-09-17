import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorisedError,
  ValidationError,
  type AdminApi,
  type PublicationIssue,
} from "@Stratford-city-motorcars-Ltd/core";

/**
 * ============================================================================
 * INTEGRATION POINT — the real API.
 * ============================================================================
 *
 * Implements `AdminApi` over HTTP. Selected with NEXT_PUBLIC_ADMIN_DATA=api.
 * The endpoints, permissions and error shapes are listed in
 * docs/STRATFORD_ADMIN_CONTRACT.md; this file is the client side of that
 * document and should change only if the document does.
 *
 * The session is a cookie on the API's origin, so every request is sent with
 * credentials. The API must allow this origin with credentials (CORS).
 */

type ErrorBody = {
  error?: string;
  fields?: Record<string, string>;
  issues?: PublicationIssue[];
  capability?: string;
  currentUpdatedAt?: string;
};

function toQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === "all") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

async function toError(response: Response): Promise<Error> {
  const body = ((await response.json().catch(() => null)) ?? {}) as ErrorBody;
  switch (response.status) {
    case 401:
      return new UnauthorisedError(body.error);
    case 403:
      return new ForbiddenError(body.error, body.capability);
    case 404:
      return new NotFoundError(body.error);
    case 409:
      return new ConflictError(body.error, body.currentUpdatedAt);
    case 422:
      return new ValidationError(body.fields, body.error, body.issues);
    default:
      return new Error(body.error || "Something went wrong on the server. Nothing was changed.");
  }
}

export function createHttpApi(origin: string): AdminApi {
  const base = `${origin.replace(/\/+$/, "")}/api/admin`;

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${base}${path}`, {
        method,
        credentials: "include",
        headers: body === undefined ? undefined : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new Error("Could not reach the server. Check your connection and try again.");
    }
    if (!response.ok) throw await toError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  const get = <T>(path: string) => request<T>("GET", path);
  const post = <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {});
  const patch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);
  const put = <T>(path: string, body: unknown) => request<T>("PUT", path, body);

  return {
    session: {
      get: async () => {
        try {
          return await get("/session");
        } catch (error) {
          if (error instanceof UnauthorisedError) return null;
          throw error;
        }
      },
      signIn: (input) => post("/session", input),
      signOut: () => request("DELETE", "/session"),
    },

    overview: {
      get: () => get("/overview"),
    },

    stock: {
      list: () => get("/vehicles"),
      get: (id) => get(`/vehicles/${id}`),
      create: () => post("/vehicles"),
      save: (record, options) => put(`/vehicles/${record.id}`, { record, ...options }),
      publish: (id, options) => post(`/vehicles/${id}/publish`, options),
      unpublish: (id, options) => post(`/vehicles/${id}/unpublish`, options),
      setFeatured: (id, featured, options) => post(`/vehicles/${id}/featured`, { featured, ...options }),
      reserve: (id, input, options) => post(`/vehicles/${id}/reservation`, { ...input, ...options }),
      releaseReservation: (id, options) => request("DELETE", `/vehicles/${id}/reservation`, options),
      markSold: (id, input, options) => post(`/vehicles/${id}/sale`, { ...input, ...options }),
      undoSale: (id, options) => request("DELETE", `/vehicles/${id}/sale`, options),
      archive: (id, options) => post(`/vehicles/${id}/archive`, options),
      restore: (id, options) => post(`/vehicles/${id}/restore`, options),
      duplicate: (id) => post(`/vehicles/${id}/duplicate`),
      uploadImage: (id, file, input, onProgress) =>
        new Promise((resolve, reject) => {
          // XMLHttpRequest, not fetch: fetch cannot report upload progress.
          const form = new FormData();
          form.set("file", file);
          form.set("category", input.category);
          form.set("alt", input.alt);
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${base}/vehicles/${id}/media`);
          xhr.withCredentials = true;
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) onProgress?.(event.loaded / event.total);
          };
          xhr.onerror = () => reject(new Error("The upload could not reach the server. Try again."));
          xhr.onload = async () => {
            const response = new Response(xhr.responseText, {
              status: xhr.status,
              headers: { "content-type": "application/json" },
            });
            if (xhr.status >= 200 && xhr.status < 300) resolve(await response.json());
            else reject(await toError(response));
          };
          xhr.send(form);
        }),
    },

    enquiries: {
      list: (query) => get(`/enquiries${toQuery(query)}`),
      counts: (query = {}) => get(`/enquiries/counts${toQuery(query)}`),
      get: (id) => get(`/enquiries/${id}`),
      updateStatus: (id, input, options) => patch(`/enquiries/${id}/status`, { ...input, ...options }),
      assign: (id, memberId, options) => patch(`/enquiries/${id}/handler`, { memberId, ...options }),
      addNote: (id, body) => post(`/enquiries/${id}/notes`, { body }),
      updateValuation: (id, input, options) => put(`/enquiries/${id}/valuation`, { ...input, ...options }),
      remove: (id, reason) => request("DELETE", `/enquiries/${id}`, { reason }),
    },

    appointments: {
      list: (query) => get(`/appointments${toQuery(query)}`),
      create: (input) => post("/appointments", input),
      update: (id, input, options) => put(`/appointments/${id}`, { ...input, ...options }),
    },

    customers: {
      list: (query) => get(`/customers${toQuery(query)}`),
      get: (id) => get(`/customers/${id}`),
      update: (id, input, options) => put(`/customers/${id}`, { ...input, ...options }),
    },

    team: {
      list: () => get("/team"),
      invite: (input) => post("/team", input),
      update: (id, input) => patch(`/team/${id}`, input),
      resendInvite: (id) => post(`/team/${id}/invitation`),
    },

    settings: {
      get: () => get("/settings"),
      updateBusiness: (input, options) => put("/settings/business", { business: input, ...options }),
    },
  };
}
