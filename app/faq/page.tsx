export default function FaqPage() {
  return (
    <article className="max-w-3xl mx-auto space-y-6 text-sm leading-relaxed">
      <h1 className="text-3xl font-semibold tracking-tight text-text">FAQ</h1>

      <Section title="How is overweightness calculated?">
        <p>For each unique (map, mods) combination:</p>
        <ol className="list-decimal list-inside space-y-1 mt-2 pl-2">
          <li>
            Add up how often it appears in player top 100s, weighted by position.
            A player&apos;s #1 score contributes 1.0; #10 contributes ~0.43; #50
            contributes ~0.015.
          </li>
          <li>
            Divide by how many players play at that map&apos;s RP level, so popular
            difficulty bands don&apos;t dominate.
          </li>
          <li>
            Divide by log(hours since the map was last updated).
          </li>
        </ol>
        <p className="mt-2">
          Original formula adapted from{" "}
          <a
            className="underline hover:text-accent"
            href="https://github.com/grumd/osu-pps"
            target="_blank"
            rel="noopener noreferrer"
          >
            grumd/osu-pps
          </a>; the magnitude curve and time decay have been retuned for Rhythia.
        </p>
      </Section>

      <Section title="What does &ldquo;updated:&rdquo; mean? Why not &ldquo;ranked:&rdquo;?">
        <p>
          The Rhythia API doesn&apos;t expose a separate &ldquo;ranked at&rdquo; timestamp
          &mdash; only &ldquo;last updated&rdquo;, which is whenever the map was most
          recently edited. We use that as a proxy for when the map went ranked.
        </p>
      </Section>

      <Section title="How often does the data refresh?">
        <p>
          Once a week, Sunday 03:00 UTC. The &ldquo;updated&rdquo; timestamp in the
          header reflects when the last refresh finished.
        </p>
      </Section>

      <Section title="How is overweightness different from raw RP?">
        <p>
          Raw RP rewards difficulty &mdash; harder map, more RP per play. Overweightness
          rewards <em>efficiency</em>: how much RP a map hands out compared to other maps
          you could realistically be playing instead.
        </p>
        <p className="mt-2">
          A 200 RP map that&apos;s in dozens of players&apos; top 100s at 0.87× speed can
          be more &ldquo;overweight&rdquo; than a 500 RP map that only a handful of top
          players can pass. The first is a farm; the second is a peak. If you&apos;re trying
          to grow your own RP, the overweight ones move the needle faster.
        </p>
      </Section>

      <Section title="Why isn't a particular map here?">
        <p>
          The list only includes maps that appear in at least one player&apos;s top 100.
          Very niche or extremely hard maps may not show up.
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-accent">{title}</h2>
      <div className="text-text-dim">{children}</div>
    </section>
  );
}
