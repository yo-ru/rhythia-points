# rhythia-points

A farm-value leaderboard for [Rhythia](https://rhythia.com/) beatmaps. Maps are ranked by *overweightness* — how much RP a map gives relative to other maps of the same difficulty. Top of the list = easiest source of RP per attempt.

Live at [rp.its.moe](https://rp.its.moe).

## How it works

A weekly scrape walks the top Rhythia players, pulls each player's top 100 scores, and tags every (map, mods) variant with the overweightness formula from [grumd/osu-pps](https://github.com/grumd/osu-pps):

```
ow = x / adj^0.65 / log(1 + h)

  x   sum of magnitudeByIndex(topIndex) across all sampled scores
  adj number of players at this map's RP block
  h   hours since the map was last updated
```

`magnitudeByIndex(i) = 0.92^i` — a player's #1 score counts 1.0; #10 counts ~0.43; #50 counts ~0.015. So `x` is *how broadly this map sits across players' top-100s*, weighted toward the top.

## Stack

Next.js 15 + React 19 on Vercel · Postgres 16 on Neon · Prisma 5 · Tailwind 3 · scrape pipeline on GitHub Actions.

## Credit

Overweightness formula adapted from [grumd/osu-pps](https://github.com/grumd/osu-pps). Cover art fallback uses the [Deezer API](https://developers.deezer.com/api/search) for maps Rhythia doesn't ship art for.

## License

MIT.
