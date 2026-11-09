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
| [src/style.css](src/style.css) | ulaz za Tailwind; ne čita dev mock |
| [src/potok.ts](src/potok.ts) | tipovi potok API-ja (`potok` i `window.potok`) |
| [src/potok-dev.ts](src/potok-dev.ts) | dev mock API-ja; ne ulazi u build |
| [vite.config.ts](vite.config.ts) | Tailwind, `potokBuildPlugin` i licence u build-u |

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
| `listValues(options?)` | `{ok: true, values, has_more, total}`, najviše 200 vrednosti po pozivu (podrazumevano 50) |
| `aggregateValues(options?)` | `{ok: true, total, fields, buckets, other}`: zbir, prosek, najmanji i najveći broj, izračunati u bazi, nad istim vrednostima koje bi `listValues` listao sa istim filterima. Opcije su ispod |
| `onNewValue(listener, {scope?})` | funkciju za odjavu; `listener` dobija svaku novu vrednost ove aplikacije, a uz `scope: "group"` i ostalih aplikacija grupe |
| `getCurrentProfile()` | profil ili `null` |
| `getDescription()`, `updateDescription(html, {descriptionFormat?})` | `{ok: true, group}` za opis ove aplikacije |
| `listSubgroups(name, {limit?, beforeId?, from?, to?, aroundId?})` | `{ok: true, groups, has_more, has_newer}`: grupe ispod direktne podgrupe sa tačnim imenom `name`, od najnovije, najviše 50 po pozivu (podrazumevano 20). `from` i `to` su trenuci u ISO 8601 sa zonom i ostavljaju grupe objavljene u tom periodu: `from` ulazi u period, a `to` ne ulazi. `aroundId` umesto prve strane daje grupe oko te jedne, ma koliko duboko stajala: do `limit` sa svake strane, a `has_newer` kaže da iznad njih ima još. Grupa koje nema u listi daje prvu stranu, pa proveri da li je `id` u `groups` |
| `openGroup(id, {tab?})` | `{ok: true}`; vodi gledaoca na roditelja ove grupe, u direktnu podgrupu ili u grupu koju `listSubgroups` može da vrati: u chat, sa `tab: "description"` na opis, gde radi grupa koja je aplikacija, a sa `tab: "settings"` na podešavanja. Aplikacija se gasi sa stranicom |
| `getGroup()` | `{ok: true, group}`: ova grupa, njen roditelj i šta gledalac tu sme |
| `listPolls({status?, beforeId?})` | `{ok: true, polls, has_more}`: glasanja ove grupe, od najnovijeg, po 30, onoliko koliko njihova pravila pokazuju gledaocu. `status` je `"open"`, `"closed"` ili `"waiting"`, ono u čemu gledalac još može da glasa |
| `getPoll(id)` | `{ok: true, poll}`; broj koji gledalac ne sme da vidi je `null` |
| `openPoll(id)` | `{ok: true}`; otvara glasanje u dijalogu Potoka, preko aplikacije, gde gledalac glasa. Aplikacija samo čita: radi za svakog gledaoca, a glas može da bude konačan |
| `openPollForm()` | `{ok: true}`; otvara Potokovu formu za novo glasanje, ako `can_start_polls` iz `getGroup` to dozvoljava |
| `onPollChange(listener)` | funkciju za odjavu; `listener` dobija id glasanja koje se promenilo, dobilo glas ili je obrisano |
| `toggleGroupReaction(id, emoji)` | `{ok: true, reactions}`; dodaje reakciju gledaoca na grupu ispod ove, ili je skida, kao klik na reakciju. Radi za svakog gledaoca sa `can_react` na toj grupi, i troši limit upisa |
| `pickEmoji()` | `{ok: true, emoji}`; gledalac bira emoji u Potokovom biraču. Poziv čeka koliko god treba, a `{ok: false, error: "cancelled"}` znači da je birač zatvoren |
| `shareGroup(id, {inApp?})` | `{ok: true}`; stranica nudi deljenje linka grupe do koje stiže `openGroup`. Frame nema ni Web Share ni clipboard. Sa `inApp: true` link vodi na ovu aplikaciju otvorenu na toj grupi, koja mora da bude ispod nje |
| `linkGroup(id)` | `{ok: true}`; upisuje grupu u adresu strane (`?at=<id>`), bez novog koraka u istoriji, pa ta adresa otvara aplikaciju baš tu |
| `getLinkedGroup()` | `{ok: true, group_id}`: grupa iz adrese ili `null`. Niko je ne proverava, to radi `aroundId` |
| `listChildren({limit?, beforeId?, from?, to?, aroundId?})` | `{ok: true, groups, has_more, has_newer}`: direktne podgrupe, istim redom i sa istim opcijama kao `listSubgroups` |
| `getChild(id)` | `{ok: true, group}` sa izvorom opisa; `description` je `null` za grupu koju gledalac ne sme da menja i za aplikaciju |
| `createChild(attrs)` | `{ok: true, group}`; nova podgrupa, a gledalac postaje njen admin |
| `updateChild(id, attrs)` | `{ok: true, group}`; menja samo polja koja dobije, a grupu koja je aplikacija odbija sa `forbidden` |
| `withdrawChild(id)` | `{ok: true, group}`; grupa postaje privatna, prestaje da nasleđuje i nasleđeni članovi izlaze |
| `previewDescription(text, {descriptionFormat?})` | `{ok: true, html}`: tekst onako kako će ga feed prikazati, prečišćen na serveru |

Opcije za listanje:

- `limit`, `offset`
- `orderDir`: `"asc"` (podrazumevano, od najstarije) ili `"desc"` (od najnovije)
- `afterId`, `beforeId`: strana odmah uz taj `id`, redom koji si tražio. `beforeId` daje vrednosti odmah pre njega, `afterId` one odmah posle, a oba one između. `has_more` kaže da li iza strane ima još, dalje od kursora: uz samo `beforeId` to su starije vrednosti. `offset` se broji od kursora
- `match`: objekat; ostaju vrednosti čiji ga `data` sadrži (`{status: "open"}`). Poredi i JSON tip, pa `{n: 5}` ne nalazi `"5"`, a `{tags: ["a"]}` nalazi svaku listu koja ima `"a"`. Sve osim objekta (do 4 KB kao JSON) daje `invalid_match`
- `searchField` i `searchValue`: traži tekst u `data[searchField]`, bez obzira na velika i mala slova; sužava zajedno sa `match`
- `total: true`: dodaje `total`, koliko vrednosti filteri ostavljaju na svim stranama
- `orderBy`: ključ u `data` (polje `"number"` se sortira numerički), u smeru `orderDir`. Tada kursori samo sužavaju po `id`, a strane idu preko `offset`
- `scope`: bez njega samo vrednosti ove aplikacije; `"group"` dodaje vrednosti ostalih aplikacija grupe

Opcije za `aggregateValues`, uz `match`, `searchField` / `searchValue` i `scope` iznad:

- `fields`: do 5 ključeva. Za svaki `fields[ključ]` je `{count, sum, avg, min, max}` nad vrednostima koje tu imaju broj: JSON broj ili string koji je običan decimalni broj (`"12"`, `"-3.5"`, ali ne `"1,5"` ni `"1e3"`), do 61 znak. `count` kaže koliko ih je bilo; bez nijednog, `sum` je 0, a ostalo `null`
- `under`: putanja od najviše 3 ključa do objekta u kom se ključevi čitaju (`["a"]`); podrazumevano vrh `data`
- `groupBy`: ključ. Tada je `buckets` lista `[{value, count, fields}]` po vrednosti tog ključa, prvo 50 najvećih, a `other` je `{buckets, count}` za ostale. String, broj ili boolean je grupa, kao tekst do 200 znakova; vrednosti bez njega su grupa `null`. Bez `groupBy`, `buckets` i `other` su `null`
- Ključevi imaju od 1 do 64 bajta, a sve ostalo daje `invalid_aggregate`. Poziv traje najviše 5 s (`timeout`), a sa `summarizeValues` ulazi u limit od 120 u minuti po gledaocu (`rate_limited`), jer svaki čita sve vrednosti koje filteri ostavljaju
- `{collection}` radi za one koji čitaju celu kolekciju, i čita na `under` iz njenog pravila

Vrednost izgleda ovako: `{id, content, data, content_format, is_data, group_id, parent_id, creator_id, creator_username, description_id}`. Listane vrednosti imaju i `inserted_at` i `updated_at`.

`group` izgleda ovako: `{id, description_id, name, description, description_format}`. `id` je id grupe, a `description_id` je `null` za podrazumevani opis.

Podgrupa iz `listSubgroups` i `listChildren` izgleda ovako: `{id, name, description_html, app_description, uses_api, picture_url, is_public, inherits_members, creator_id, inserted_at, published_at, last_value_at, comment_count, reactions, can_react}`. `description_html` je prečišćen HTML, pa sme u stranicu aplikacije, a element sa klasom `rich-content` oko njega daje stilove stranice grupe. `null` je za grupu bez opisa i za aplikaciju, čiji je opis izvorni kod. `app_description` je ono što aplikacija kaže o sebi u meta tagovima (`<meta name="description">`), kao običan tekst, a `null` je za sve ostale grupe. `comment_count` je broj poruka u chatu grupe, bez niti. `reactions` su `[{emoji, count, mine}]`, redom kojim su emoji prvi put upotrebljeni. `can_react` kaže sme li gledalac da reaguje: član sa dozvolom za reakcije, ili nečlan javne grupe ako uloga „Svi“ ima tu dozvolu.

`listSubgroups` vidi ono što vidi i gledalac: bez niti, direktnih razgovora i privatnih grupa čiji gledalac nije član. Ako gledalac ne vidi ni samu podgrupu, odgovor je `not_found`. Imena nisu jedinstvena, pa od više podgrupa istog imena važi najstarija. Sledeća strana je `beforeId` sa `id`-jem poslednje grupe prethodne strane. Red je od najnovije, a zatvorena grupa (privatna, bez nasleđivanja) računa se od trenutka kad se otvorila, što je `published_at`.

`listChildren`, `getChild`, `createChild`, `updateChild`, `withdrawChild` i `previewDescription` rade u ime gledaoca, pa traže gledaoca koji sme da menja grupu aplikacije (`can_manage_children` iz `getGroup`). Ostali dobijaju `forbidden`. Dosežu samo direktne podgrupe. Pravljenje traži i `create_subgroups` (`can_create_children`), a izmena traži i `edit_group` u samoj podgrupi.

`attrs` su `{name, description, descriptionFormat, isPublic, inheritsMembers, picture}`. Aplikacija ne može da postavi `uses_api` ni bilo šta drugo, i nema poziva za brisanje grupe. `picture` je adresa slike ili `data:` adresa, najviše 1.000.000 znakova, a stiže na `picture_url`, koji ne traži sesiju ni za privatnu grupu.

`group` iz `getGroup` izgleda ovako: `{id, name, is_public, inherits_members, parent, can_manage_children, can_create_children, everyone_creates_subgroups, can_start_polls}`, a `parent` je `{id, name, is_public, uses_api}` ili `null` ako gledalac ne vidi tu grupu. `group` iz poziva za podgrupe je podgrupa sa još `{description, description_format, can_edit, member_count, updated_at}`.

Primer dve aplikacije na ovim pozivima, od kojih jedna piše ono što druga prikazuje, opisan je u projektu potok-ide, u `docs/feed-i-feedcreator.md`.

Neuspeo poziv vraća `{ok: false, error, message?}`. Mogući kodovi greške su `not_a_member`, `forbidden`, `rate_limited`, `invalid_value`, `invalid_description`, `invalid_group`, `invalid_match`, `invalid_aggregate`, `timeout`, `unknown_method`, `stale_app`, `not_found`, `preview` i `disconnected`. Ako stranica ne odgovori za 10 s, promise se odbija (reject).

Tip podataka se zadaje generikom:

```ts
type Item = { name: string; count: number };

async function load() {
  const reply = await potok.getGroupDataValues<Item>();
  if (!reply.ok) return console.error(reply.error);

  const total = reply.values.reduce((sum, v) => sum + (v.data?.count ?? 0), 0);
}
```

Isti zbir, a da aplikacija ne čita sve vrednosti, daje `aggregateValues`:

```ts
const reply = await window.potok.aggregateValues({ fields: ["count"] });
if (reply.ok) console.log(reply.fields.count.sum);
```

## Dev mock

U `npm run dev` [src/potok-dev.ts](src/potok-dev.ts) pravi `#group-panel-description` i postavlja lažni API koji odgovara isto kao potok:

- Vrednosti čuva u `localStorage` pod ključem `potok-dev:values`, pa prežive reload. Za reset pokreni `localStorage.removeItem('potok-dev:values')` u konzoli.
- Paginacija, pretraga i sortiranje rade kao na serveru.
- Posle upisa šalje novu vrednost svim callback-ovima, i pošiljaocu, kao potok.
- Trenutni profil je `dev-user`, sa admin pravima.
- Grupe za `listSubgroups` stoje u `localStorage` pod ključem `potok-dev:subgroups`, kao `{"<ime podgrupe>": PotokSubgroup[]}`, a puni ih sama aplikacija u dev-u. `openGroup` i `shareGroup` samo pišu u konzolu, `toggleGroupReaction` menja taj isti ključ, a `pickEmoji` pita preko `prompt`-a.
- Glasanja stoje pod ključem `potok-dev:polls`, kao `PotokPoll[]`. Potokove forme i glasanja ovde nema: `openPollForm` dodaje glasanje, a `openPoll` glasa za prvi odgovor.
- Podgrupe aplikacije stoje pod ključem `potok-dev:children`. `potok-dev:group` menja polja koja vraća `getGroup`, na primer `{"can_manage_children": false}` za gledaoca bez prava.
- `previewDescription` i `description_html` su gruba zamena za server: skidaju komentare i skripte, a markdown ostaje običan tekst. Šta server stvarno propušta vidi se tek u potok-u.
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
- **Licence putuju sa build-om.** Na vrh skripte u `potok-build.html` build upisuje pun tekst licence svakog paketa iz `node_modules` koji pakuje (Vite-ov `build.license`). Komentare sa `@license` ili `/*!` iz samog koda zadržava, iako ih Vite pri minifikaciji inače briše. Kod koji ulazi bez napomene dobija je u tvom kodu ili CSS-u: daisyUI-jev CSS iz Tailwind dodatka stiže bez nje, pa aplikacije sa daisyUI-jem imaju `/*! daisyUI | MIT License | https://daisyui.com */` u `style.css`.
- **Tailwind ne čita dev mock.** `src/style.css` isključuje `potok-dev.ts` (`@source not`). Mock ne ulazi u build, ali bi Tailwind reči iz njega uzeo za klase i dodao ih u CSS build-a.

## Licenca

MIT, vidi [LICENSE](LICENSE).
