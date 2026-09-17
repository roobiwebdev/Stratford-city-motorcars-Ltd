import type { Route } from "next";

/**
 * Every admin path. The admin is its own app on its own origin, so there is
 * no `/admin` prefix. `typedRoutes` is on, so paths built from ids are cast
 * once here rather than at every link.
 */
export const routes = {
  signIn: "/sign-in" as Route,
  overview: "/dashboard" as Route,
  enquiries: "/enquiries" as Route,
  enquiry: (id: string) => `/enquiries/${id}` as Route,
  partExchange: "/part-exchange" as Route,
  viewings: "/viewings" as Route,
  customers: "/customers" as Route,
  customer: (id: string) => `/customers/${id}` as Route,
  stock: "/stock" as Route,
  newVehicle: "/stock/new" as Route,
  vehicle: (id: string) => `/stock/${id}` as Route,
  team: "/team" as Route,
  settings: "/settings" as Route,
} as const;

/** A route with a query string, typed once. */
export function withQuery(path: Route, params: Record<string, string | undefined>): Route {
  const search = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const text = search.toString();
  return (text ? `${path}?${text}` : path) as Route;
}
