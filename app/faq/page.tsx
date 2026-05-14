export default function FaqPage() {
  return (
    <article className="max-w-3xl mx-auto space-y-6 text-sm leading-relaxed">
      <h1 className="text-3xl font-semibold tracking-tight text-text">FAQ</h1>

      <Section title="How is overweightness calculated?">
        <p>For each unique (map, mods) combination:</p>
        <ol className="list-decimal list-inside space-y-1 mt-2 pl-2">
          <li>
            Add up how often it appears in player top 100s, weighted sharply by position.
            A player&apos;s #1 score contributes ~1.0; #5 contributes ~0.13; #20
            contributes nearly 0.
          </li>
          <li>
            Divide by how many players play at that map&apos;s RP level, so popular
            difficulty bands don&apos;t dominate.
          </li>
          <li>
            Divide by hours since the map was last updated.
          </li>
        </ol>
        <p className="mt-2">
          Formula adapted from{" "}
          <a
            className="underline hover:text-accent"
            href="https://github.com/grumd/osu-pps"
            target="_blank"
            rel="noopener noreferrer"
          >
            grumd/osu-pps
          </a>.
        </p>
      </Section>

      <Section title="What does &ldquo;updated:&rdquo; mean? Why not &ldquo;ranked:&rdquo;?">
        <p>
          The Rhythia API doesn&apos;t expose a separate &ldquo;ranked at&rdquo; timestamp
          &mdash; only &ldquo;last updated&rdquo;, which is whenever the map was most
          recently edited. We use that as a proxy for when the map went ranked.
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
