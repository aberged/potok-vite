# AGENTS.md

Uputstvo za AI agente koji rade u ovom repou. Detalji API-ja, limiti i dev mock su u [README.md](README.md).

## Šta je ovo

Šablon za potok aplikaciju: Vite, TypeScript i Tailwind. `npm run build` pravi jedan fajl, `dist/potok-build.html`, koji se otprema u opis potok grupe (Uredi grupu, Opis, **Otpremi ZIP**). potok ga pokreće u sandboxed iframe-u, bez `allow-same-origin`.

## Komande

```sh
npm install
npm run dev      # lokalno, uz dev mock API-ja (src/potok-dev.ts)
npm run build    # tsc + vite build → dist/potok-build.html
```

Nema testova ni lintera. `npm run build` je jedina automatska provera: `tsc` hvata greške u tipovima i nekorišćene promenljive.

## Šta se menja

- `index.html`: u build ulazi samo sadržaj `<body>`.
- `src/main.ts`: kod aplikacije.
- `src/style.css`: ulaz za Tailwind.

`src/potok.ts`, `src/potok-dev.ts` i `vite.config.ts` prate API potok-ide-a i wrapper. Ne menjaj ih, osim ako zadatak to izričito traži.

Ovaj šablon je nacrtan na strani pomoći `/pomoc/arhitektura-aplikacije` u potok-ide-u (prvi dijagram u `page_html/help_app_architecture.html.heex`): fajlovi iz spiska gore, `potokBuildPlugin`, `npm run build` i izlaz `dist/potok-build.html`. Kad se nešto od toga promeni, promeni i taj dijagram: nijedan test u potok-ide-u to ne vidi.

Iz ovog repoa je napisan i priručnik za programere potok aplikacija (zaseban repo `potok-prirucnik`, pored ovog). Njegove oznake izvora vode na linije `src/potok.ts`, `README.md`, `AGENTS.md` i ostalih fajlova na jednom commit-u. Kad se promeni API ili pravila, tamo pomeri zakucan commit i pokreni `node alati/napravi-indeks.js` i `node alati/proveri-primere.js`: prvi javlja nove metode i kodove grešaka koji nisu opisani, a drugi primere koji više ne prolaze `tsc` (koraci su u `ODRZAVANJE.md` tog repoa).

## Pravila

Kršenje ovih pravila obično prolazi `npm run dev`, pa i `npm run build`, a aplikacija pukne tek u potok-u.

- **Bez top-level `await`.** Wrapper ubacuje bundle u običnu funkciju. Jedini izuzetak je `if (import.meta.env.DEV)` blok na vrhu `src/main.ts`, jer ga build izbacuje.
- **Ceo JS u jednom fajlu.** Bez dinamičkog `import()` i bez chunk-ova.
- **Slike i fontovi inline** (data URL ili SVG u HTML-u) ili sa apsolutnog URL-a. `public/` i `dist/assets` se ne objavljuju.
- **`potok` se ne uvozi.** U build-u ga daje wrapper kao lokalnu promenljivu, a u dev-u ga postavlja mock. Iz `src/potok.ts` se uvoze samo tipovi (`import type`).
- **`potok` i `window.potok` su dva API-ja.** `potok` je legacy (`insertGroupValue`, `getGroupDataValues`...), a `window.potok` noviji SDK (`insertValue`, `listValues`...). U dev mock-u su isti objekat, a u potok-u nisu, pa ne zovi metodu jednog API-ja na drugom.
- **Listener-i dobijaju `potok.eventListenerOptions`** (`{signal}`), da se uklone kad se aplikacija ponovo učita.
- **`data` je uvek JSON objekat.** Niz, broj ili tekst server odbija sa `invalid_value`.
- **Vrednosti se uglavnom samo dodaju.** Legacy `potok` nema izmenu ni brisanje, pa stanje računaj iz svih vrednosti. U `window.potok` autor menja svoju vrednost (`updateValue`) samo kad pravilo kolekcije ima `edit_own`, a brišu samo urednici.
- **`updateGroupDescription` menja i ponovo pokreće samu aplikaciju.** Ne koristi ga za čuvanje stanja.
- **daisyUI klase** (`btn`, `table`...) rade u potok-u, ali u dev-u nisu stilizovane.

## Konvencije

- Komentari u kodu na engleskom, tekst u UI-ju na srpskom.
- Oblik podataka zadaj generikom: `potok.getGroupDataValues<Item>()`, `PotokValue<Item>`.
- Pozivi koji vraćaju `ok` mogu da ne uspeju: proveri `if (!reply.ok)` pre korišćenja odgovora.

## Provera

1. `npm run build` prolazi.
2. `dist/potok-build.html` nema `import(`, `<link` ni `<script src`, jer CSS i JS moraju biti inline.
3. Ako se menja ponašanje aplikacije, proveri ga u `npm run dev`.

## Aplikacija

Trenutno demo: svaki klik je vrednost `{x, y, picture}`, a avatar svakog člana stoji tamo gde je poslednji put kliknuo.

Kad od šablona praviš svoju aplikaciju, ovde opiši šta radi, oblik `data` i kako se stanje računa iz vrednosti.
