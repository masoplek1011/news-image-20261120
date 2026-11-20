# The World in One Day — 20 November 2026

[![make.fun](https://make.fun/badge/news-image-20261120.svg)](https://make.fun/bounty/news-image-20261120)
[![rank](https://make.fun/masoplek1011/news-image-20261120/rank.svg)](https://make.fun/bounty/news-image-20261120)
[![reward](https://make.fun/masoplek1011/news-image-20261120/reward.svg)](https://make.fun/bounty/news-image-20261120)

A newspaper front page that sums up 20 November 2026's world news in one
image: **"THE WORLD IN ONE DAY"** — six verified stories, each with its own
hand-drawn illustration, on a single 1024×1024 poster.

## The six stories

1. **Trump, Xi & Putin sign 'Peace Declaration'** — the first-ever trilateral
   summit in Shenzhen, 19 Nov. A four-point declaration: UN reform, more
   refined-oil production and supply, and that nuclear war "cannot be won and
   must never be fought", plus dialogue on reducing nuclear risk. It does not
   mention the war in Ukraine or Iran, and there were no arms-control talks.
   *(Reuters / USA Today / The Times, 20 Nov)*
2. **Missile hits Riyadh tower** — a Houthi strike hits the Public Investment
   Fund tower in Riyadh, 19 Nov; the group also claims attacks on King Khalid
   airport and the Financial Center. Oil prices rise on supply fears;
   Brent $92.22. *(Reuters, 19–20 Nov)*
3. **Kyiv hit by ballistic missiles** — Russia strikes Kyiv with ballistic
   missiles overnight (19→20 Nov); debris sets a three-storey building ablaze
   in the Obolon district; blasts are heard before dawn. *(Reuters, 20 Nov)*
4. **Korea tops $1 trillion in exports** — a first in history; the fourth
   country after the US, Germany (2006) and China (2007), and the first new
   member in 19 years. AI chips lead the way: semiconductor exports
   $396.8 billion, Jan–Oct. *(Yonhap / Korea JoongAng Daily, 19 Nov)*
5. **Trump pardons Pete Rose** — a posthumous "Complete and Total Pardon" for
   tax crimes. Baseball's hit king, 4,256 hits; banned in 1989 over gambling;
   died in 2024 aged 83. Hall of Fame eligibility at the earliest in 2028.
   *(Reuters / AP, 19 Nov)*
6. **Fiona the hippo dies at 9** — the beloved Cincinnati Zoo star dies after
   swallowing a knitted hat thrown by a visitor, which was caught in a ceiling
   fan and dropped into her enclosure. Vets could not save her.
   *(AP / USA Today, 19 Nov)*

## How it works

`main.ts` draws the whole poster from code — no network, no dependencies,
no downloaded assets:

- a hand-rolled **5×7 bitmap font** (upper/lowercase, digits, punctuation),
- a hand-rolled **PNG encoder** (CRC32 + zlib, RGB, 1024×1024),
- six hand-drawn vector scenes (flags, a tower in flames, missiles over Kyiv,
  an export chart with an AI chip, a ballpark, a hippo in the water),
- fully **deterministic**: two runs produce byte-identical PNGs.

The program writes only to `MAKEFUN_OUTPUT_DIR` (default `out/`).

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024×1024). Run it twice and compare
`sha256sum out/entry.png` — the hashes match.

## License

MIT — see [LICENSE](LICENSE).
