# potok-vite

Šablon za pravljenje **potok aplikacija** uz Vite, TypeScript i Tailwind.

Potok aplikacija je HTML koji se nalepi kao opis grupe sa uključenom opcijom „Koristi API“. potok je pokreće u sandboxed iframe-u i daje joj API za čitanje i upis podataka grupe.

Opis može biti podrazumevani ili jedan od alternativnih opisa grupe, pa grupa može imati više aplikacija, svaku sa svojim podacima.

## Brzi start

```sh
npm install
npm run dev      # lokalno, uz dev mock potok API-ja
npm run build    # tsc + vite build → dist/potok-build.html
```

Objavljivanje:

1. Pokreni `npm run build`.
2. U potok-u otvori grupu, pa **Izmeni grupu** i uključi **Koristi API**.
3. U polje **Opis** nalepi ceo sadržaj `dist/potok-build.html` i sačuvaj.

Za alternativni opis: u **Izmeni grupu**, pod **Alternativni opisi**, klikni **Novi opis**. Upiši ime, uključi **Koristi API**, nalepi `dist/potok-build.html` u opis i klikni **Sačuvaj opis**.

Pregled u formi za izmenu prikazuje aplikaciju, ali odbija API pozive (greška `preview`). Pravi rad se vidi tek na stranici grupe.

## Kako radi

`npm run build` pravi običan Vite build. Posle toga `potokBuildPlugin` iz [vite.config.ts](vite.config.ts) spaja sve u jedan fajl, `dist/potok-build.html`:

```html
<style>/* sav CSS */</style>
<!-- sadržaj <body> iz index.html -->
<script type="module">
  // čeka da se pojavi #group-panel-description.potok, pa:
  const potok = host.potok;
  potok.eventListenerOptions = {signal: potok.abortController.signal};
  // ... tvoj bundle ...
</script>
```

potok taj HTML stavlja u iframe:

```html
<head>
  <meta name="potok-app" content="">  <!-- "" za podrazumevani opis, inače id alternativnog opisa -->
  <!-- CSS stranice i potok_app_sdk.js -->
</head>
<body><div id="group-panel-description"><!-- sadržaj potok-build.html --></div></body>
```

- Iframe nema `allow-same-origin`, pa ne vidi stranicu, kolačiće ni sesiju. Sa potok-om razgovara samo preko API-ja.
- Iframe učitava CSS stranice (Tailwind i daisyUI) i prati njenu temu (`data-theme`).
- `localStorage` radi, a stranica ga čuva posebno za svaku aplikaciju (najviše 256 KB). Kopija pripada mestu, ne aplikaciji: kad „Postavi kao podrazumevani“ zameni dve aplikacije, svaka nađe kopiju one druge. `sessionStorage` živi samo u memoriji.
- Aplikacija se ponovo učitava posle prekida i obnove veze. Isto se dešava kad se promeni opis grupe ili pristup korisnika (članstvo, uloge).

## Struktura

| Fajl | Šta je |
|---|---|
| [index.html](index.html) | HTML aplikacije; u build ulazi sadržaj `<body>` |
| [src/main.ts](src/main.ts) | kod aplikacije (trenutno demo) |
| [src/style.css](src/style.css) | ulaz za Tailwind |
| [src/potok.ts](src/potok.ts) | tipovi potok API-ja (`potok` i `window.potok`) |
| [src/potok-dev.ts](src/potok-dev.ts) | dev mock API-ja; ne ulazi u build |
| [vite.config.ts](vite.config.ts) | Tailwind i `potokBuildPlugin` |

## Demo

U [src/main.ts](src/main.ts) svaki klik je jedna data vrednost `{x, y, picture}`. Avatar svakog člana stoji tamo gde je poslednji put kliknuo.

- Pri učitavanju aplikacija čita sve vrednosti (`getGroupDataValues`).
- Na klik upisuje novu vrednost (`insertGroupValue`).
- Preko `setNewValueCallback` uživo pomera avatare svih članova, i sopstveni.

Za svoju aplikaciju zameni sadržaj `<body>` u `index.html` i kod u `src/main.ts`. Fajlovi `potok.ts`, `potok-dev.ts` i `vite.config.ts` ostaju isti.

## Više aplikacija u grupi

Grupa ima po jednu aplikaciju za svaki opis sa „Koristi API“: podrazumevani opis i svaki takav alternativni opis.

- Svaka aplikacija ima svoje vrednosti. `getGroupDataValues`, `listValues`, `onNewValue` i `setNewValueCallback` vide samo vrednosti svoje aplikacije.
- Uz `scope: "group"`, `listValues` i `onNewValue` daju i vrednosti ostalih aplikacija grupe koje korisnik sme da otvori. Svaka vrednost nosi `description_id` svoje aplikacije (`null` za podrazumevani opis).
- Alternativni opis ograničen na uloge vide samo članovi sa tim ulogama i oni koji smeju da menjaju grupu. Ostali ne vide ni tu aplikaciju ni njene vrednosti.
- „Postavi kao podrazumevani“ menja mesta dvema aplikacijama: njihov sadržaj, imena i vrednosti.
- Pozivi rade nad opisom koji je na ekranu. Poziv iz aplikacije koju je korisnik upravo napustio server odbija sa `stale_app`.

## API

U kodu aplikacije `potok` je legacy API sa `#group-panel-description`, a `window.potok` je noviji SDK. Oba rade nad istim podacima, a tipovi su u [src/potok.ts](src/potok.ts). Detaljna referenca je u README-u projekta potok-ide, u sekciji „App API“.

### `potok` (legacy)

| Metoda | Vraća |
|---|---|
| `insertGroupValue(json, {contentFormat?})` | `{ok: true, value}`; `json` je JSON objekat kao string |
| `getGroupDataValues(options?)` | bez `limit`: `{ok: true, values}` (sve vrednosti, do 5000); sa `limit`: jednu stranu i `has_more` |
| `setNewValueCallback(fn)` | ništa; `fn` dobija `CustomEvent` sa novom vrednošću u `detail`, a novi callback zamenjuje stari |
| `getCurrentProfile()` | profil ili `null` |
| `getGroupDescription()` | `{description, descriptionFormat}` |
| `updateGroupDescription(html, {descriptionFormat?})` | `{ok: true, group}` |
| `el`, `abortController`, `eventListenerOptions` | `#group-panel-description` i `{signal}` za `addEventListener` |

### `window.potok`

| Metoda | Vraća |
|---|---|
| `insertValue(data, {contentFormat?})` | `{ok: true, value}`; `data` je objekat ili JSON string |
| `listValues(options?)` | `{ok: true, values, has_more}`, najviše 200 vrednosti po pozivu (podrazumevano 50) |
| `onNewValue(listener, {scope?})` | funkciju za odjavu; `listener` dobija svaku novu vrednost ove aplikacije, a uz `scope: "group"` i ostalih aplikacija grupe |
| `getCurrentProfile()` | profil ili `null` |
| `getDescription()`, `updateDescription(html, {descriptionFormat?})` | `{ok: true, group}` za opis ove aplikacije |
| `listSubgroups(name, {limit?, beforeId?})` | `{ok: true, groups, has_more}`: grupe ispod direktne podgrupe sa tačnim imenom `name`, od najnovije, najviše 50 po pozivu (podrazumevano 20) |
| `openGroup(id, {tab?})` | `{ok: true}`; vodi gledaoca u chat grupe koju `listSubgroups` može da vrati, a sa `tab: "description"` na njen opis, gde radi grupa koja je aplikacija. Aplikacija se gasi sa stranicom |

Opcije za listanje:

- `limit`, `offset`
- `afterId`, `beforeId`: samo vrednosti sa većim, odnosno manjim `id`
- `searchField` i `searchValue`: traži tekst u `data[searchField]`, bez obzira na velika i mala slova
- `orderBy`: ključ u `data` (polje `"number"` se sortira numerički); bez njega vrednosti idu redom kojim su upisane
- `orderDir`: `"asc"` (podrazumevano) ili `"desc"`
- `scope`: bez njega samo vrednosti ove aplikacije; `"group"` dodaje vrednosti ostalih aplikacija grupe

Vrednost izgleda ovako: `{id, content, data, content_format, is_data, group_id, parent_id, creator_id, creator_username, description_id}`. Listane vrednosti imaju i `inserted_at` i `updated_at`.

`group` izgleda ovako: `{id, description_id, name, description, description_format}`. `id` je id grupe, a `description_id` je `null` za podrazumevani opis.

Podgrupa iz `listSubgroups` izgleda ovako: `{id, name, description_html, app_description, uses_api, picture_url, inserted_at, last_value_at}`. `description_html` je prečišćen HTML, pa sme u stranicu aplikacije, a element sa klasom `rich-content` oko njega daje stilove stranice grupe. `null` je za grupu bez opisa i za aplikaciju, čiji je opis izvorni kod. `app_description` je ono što aplikacija kaže o sebi u meta tagovima (`<meta name="description">`), kao običan tekst, a `null` je za sve ostale grupe.

`listSubgroups` vidi ono što vidi i gledalac: bez niti, direktnih razgovora i privatnih grupa čiji gledalac nije član. Ako gledalac ne vidi ni samu podgrupu, odgovor je `not_found`. Imena nisu jedinstvena, pa od više podgrupa istog imena važi najstarija. Redosled se ne pomera, pa je sledeća strana `beforeId` sa `id`-jem poslednje grupe prethodne strane.

Neuspeo poziv vraća `{ok: false, error, message?}`. Mogući kodovi greške su `not_a_member`, `forbidden`, `rate_limited`, `invalid_value`, `invalid_description`, `unknown_method`, `stale_app`, `not_found`, `preview` i `disconnected`. Ako stranica ne odgovori za 10 s, promise se odbija (reject).

Tip podataka se zadaje generikom:

```ts
type Item = { name: string; count: number };

async function load() {
  const reply = await potok.getGroupDataValues<Item>();
  if (!reply.ok) return console.error(reply.error);

  const total = reply.values.reduce((sum, v) => sum + (v.data?.count ?? 0), 0);
}
```

## Dev mock

U `npm run dev` [src/potok-dev.ts](src/potok-dev.ts) pravi `#group-panel-description` i postavlja lažni API koji odgovara isto kao potok:

- Vrednosti čuva u `localStorage` pod ključem `potok-dev:values`, pa prežive reload. Za reset pokreni `localStorage.removeItem('potok-dev:values')` u konzoli.
- Paginacija, pretraga i sortiranje rade kao na serveru.
- Posle upisa šalje novu vrednost svim callback-ovima, i pošiljaocu, kao potok.
- Trenutni profil je `dev-user`, sa admin pravima.
- Grupe za `listSubgroups` stoje u `localStorage` pod ključem `potok-dev:subgroups`, kao `{"<ime podgrupe>": PotokSubgroup[]}`, a puni ih sama aplikacija u dev-u. `openGroup` samo piše u konzolu.
- Bez parametara aplikacija radi kao podrazumevani opis. Sa `?app=<id>` u URL-u (npr. `http://localhost:5173/?app=2`) radi kao alternativni opis sa tim id-jem. Vrednosti svih aplikacija stoje pod istim ključem, pa `scope: "group"` vidi sve.

Razlike u odnosu na potok:

- `potok` i `window.potok` su isti objekat sa oba API-ja. U potok-u su odvojeni, i tipovi to poštuju.
- `updateGroupDescription` samo zapamti opis, a u potok-u bi se aplikacija ponovo učitala.
- Nema daisyUI stilova stranice, pa klase poput `btn` ili `table` u dev-u nisu stilizovane.
- Nema drugih korisnika, limita upisa ni grešaka poput `not_a_member` i `stale_app`.
- Nove vrednosti ne prelaze iz jednog taba u drugi, pa aplikacija na `/?app=2` ne dobija uživo vrednosti upisane na `/`.

## Pravila i zamke

- **Bez top-level `await` u kodu aplikacije.** Wrapper ubacuje bundle u običnu funkciju. Zato je `await` van `async` funkcije sintaksna greška, i aplikacija se ne pokreće. Izuzetak je `if (import.meta.env.DEV)` blok na vrhu `main.ts`, jer se on izbacuje iz build-a.
- **Sav JS mora biti u jednom fajlu.** Ne koristi dinamički `import()` ni podelu na chunk-ove, jer se objavljuje samo `potok-build.html`.
- **Slike i fontovi moraju biti inline** (data URL ili SVG u HTML-u) ili sa apsolutnog URL-a. Fajlovi iz `dist/assets` i `public/` se ne objavljuju. Vite sam inline-uje samo asset-e manje od 4 KB (`build.assetsInlineLimit`).
- **`data` mora biti JSON objekat.** Niz, broj ili tekst server odbija sa `invalid_value`.
- **Vrednosti se samo dodaju.** API nema izmenu ni brisanje, pa stanje računaj iz svih vrednosti: na primer poslednja vrednost po korisniku, kao u demou, ili zbir.
- **`updateGroupDescription` menja samu aplikaciju.** Opis je HTML aplikacije, pa je ovaj poziv ponovo pokreće. Menja samo opis te aplikacije (podrazumevani ili alternativni). Ne koristi ga za čuvanje stanja.
- **Limiti:** najviše 200 vrednosti po strani i 5000 za `getGroupDataValues()` bez `limit`. Upisa može biti najviše 30 zaredom, a limit se obnavlja tokom 10 s.
- **Prava:** upis traži članstvo u grupi, a izmena opisa traži pravo na izmenu grupe.
