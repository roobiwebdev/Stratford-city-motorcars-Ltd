/**
 * Paging for lists that grow without limit (enquiries, customers).
 *
 * Stock is not paged: a dealership holding around thirty cars is fetched
 * whole and filtered in the browser, which keeps search instant.
 */

export interface ListQuery<Sort extends string = string> {
  /** Free text; each list documents which fields it matches. */
  search?: string;
  sort?: Sort;
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 25;

export function pageCount(page: Pick<Page<unknown>, "total" | "pageSize">): number {
  return Math.max(1, Math.ceil(page.total / page.pageSize));
}
