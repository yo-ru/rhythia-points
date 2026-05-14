"use server";

import { queryMaps, type MapRow } from "@/lib/queries";
import type { MapsFilters } from "@/lib/types";

export async function loadMoreMaps(
  filters: MapsFilters,
  page: number,
): Promise<{ rows: MapRow[]; page: number }> {
  const { rows } = await queryMaps({ ...filters, page });
  return { rows, page };
}
