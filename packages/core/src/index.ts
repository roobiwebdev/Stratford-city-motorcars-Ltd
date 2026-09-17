/**
 * The shared contract: the website, the admin and the API compile against it.
 *
 * `vehicle`, `visibility` and `format` are also imported by subpath from the
 * website (and loaded directly by its inventory check), so they must keep to
 * type-only imports.
 */
export * from "./vehicle";
export * from "./visibility";
export * from "./format";
export * from "./stock";
export * from "./enquiry";
export * from "./appointment";
export * from "./customer";
export * from "./team";
export * from "./permissions";
export * from "./settings";
export * from "./overview";
export * from "./list";
export * from "./errors";
export type * from "./api";
