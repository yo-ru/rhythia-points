import { MapFilters } from "@/components/MapFilters";
import { MapsList } from "@/components/MapsList";
import { MapsHero } from "@/components/MapsHero";
import { MapsExplore } from "@/components/MapsExplore";
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
    <div className="space-y-4 text-white">
      <MapsHero />
      <MapsExplore />
      <MapFilters />
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
