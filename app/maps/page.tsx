import { MapFilters } from "@/components/MapFilters";
import { MapsList } from "@/components/MapsList";
import { parseMapsFilters, queryMaps } from "@/lib/queries";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MapsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filters = parseMapsFilters(sp);
  const { rows, total } = await queryMaps(filters);

  const filterKey = JSON.stringify({
    ...filters,
    page: undefined,
  });

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-1 pb-2 -mt-1 bg-bg">
        <MapFilters />
      </div>
      <MapsList
        key={filterKey}
        initialRows={rows}
        initialPage={filters.page}
        total={total}
        filters={filters}
      />
    </div>
  );
}
