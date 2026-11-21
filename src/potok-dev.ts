import type {
  PotokAggregate,
  PotokAggregateOptions,
  PotokApi,
  PotokCaps,
  PotokBounds,
  PotokChild,
  PotokChildAttrs,
  PotokCreatedChild,
  PotokCollectionListOptions,
  PotokCollectionValue,
  PotokConfig,
  PotokConfigData,
  PotokConfigReply,
  PotokContentFormat,
  PotokData,
  PotokError,
  PotokGroupDescription,
  PotokGroupTab,
  PotokListedValue,
  PotokListOptions,
  PotokManaged,
  PotokMapConfig,
  PotokNewChild,
  PotokOwnGroup,
  PotokPinCount,
  PotokPlace,
  PotokPlaceAttrs,
  PotokPlaceCluster,
  PotokPlacesAll,
  PotokPlacesQuery,
  PotokPlacesView,
  PotokPlaceShape,
  PotokPoll,
  PotokPollListOptions,
  PotokProcess,
  PotokProcessCondition,
  PotokProcessFlow,
  PotokProcessGraph,
  PotokProcessNode,
  PotokProcessWarning,
  PotokProfile,
  PotokSdk,
  PotokReaction,
  PotokRole,
  PotokRoleKey,
  PotokRule,
  PotokScoreCheck,
  PotokSubgroup,
  PotokSubgroupListOptions,
  PotokSubgroupPage,
  PotokSummary,
  PotokTask,
  PotokRenderedTemplate,
  PotokTemplate,
  PotokTemplateField,
  PotokUploadedFile,
  PotokValue,
  PotokValueChange,
} from './potok';

// Dev stand-in for potok-ide's assets/js/potok_app_sdk.js: the same SDK
// (`window.potok`) and legacy shim (`#group-panel-description`.potok), with a
// local server in place of the page that replies like GroupLive.Show.AppApi.
// Values are kept in localStorage so they survive a reload.
//
// `?app=<id>` in the URL runs the app as the alternative description <id>
// (what `<meta name="potok-app">` tells the SDK); without it, as the default
// description. Every app's values share one store, as they do in the group.
//
// The groups `listSubgroups` returns are in localStorage as well, under
// `potok-dev:subgroups`: `{"<sub-group name>": PotokSubgroup[]}`. The app fills
// that key itself in dev; without the name the call answers `not_found`.
//
// The app's own sub-groups (`listChildren`, `createChild`, ...) are in
// `potok-dev:children`. `potok-dev:group` overrides fields of what `getGroup`
// answers, for a viewer with other rights or a group set up another way.
//
// The polls `listPolls` returns are in `potok-dev:polls`, as `PotokPoll[]`, in
// what the viewer sees of them. Potok's own form and voting are not here:
// `openPollForm` adds a poll and `openPoll` votes for the first answer, then
// both say the poll changed.
//
// A map's places (`listPlaces`, `createPlace`) are in `potok-dev:places`, as
// `PotokPlace[]`, the borders of its areas and the lines of its routes
// (`placeShapes`) in `potok-dev:place-shapes` by id, and what `getMapConfig`
// answers in `potok-dev:map-config`: a map app seeds them in dev, `shape`,
// `areas`, `bbox` and `length` included, as the mock works out no geometry. `showGroup` only says
// what Potok would open, then says it closed. A sub-group the app gives a
// place (`createChild`, `createChildren`, `updateChild` with `lat`, `lng`)
// is a place as well. Past 2000 places, `listPlaces(view)` gathers them into
// cells as Potok does. What does not fit in localStorage lives until the next
// reload.
//
// Collections (`getConfig`, `insertValue` with a collection, ...) follow the
// rules of the app's config like the server does, for the viewer `?viewer=`
// plays: see "Collections and rules" below. A rule's process runs its graph
// in the page: see "Processes of the app's collections" below.

const VALUES_STORAGE_KEY = 'potok-dev:values';
const SUBGROUPS_STORAGE_KEY = 'potok-dev:subgroups';
const CHILDREN_STORAGE_KEY = 'potok-dev:children';
const GROUP_STORAGE_KEY = 'potok-dev:group';
const POLLS_STORAGE_KEY = 'potok-dev:polls';
const PLACES_STORAGE_KEY = 'potok-dev:places';
const PLACE_SHAPES_STORAGE_KEY = 'potok-dev:place-shapes';
const SHAPE_LEVELS = [6, 8, 10, 12, 14, 16];
const MAP_CONFIG_STORAGE_KEY = 'potok-dev:map-config';
const POLL_PAGE_SIZE = 30;
const LINK_PARAM = 'at';
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;
const DEFAULT_SUBGROUP_LIMIT = 20;
const MAX_SUBGROUP_LIMIT = 50;
const LEGACY_PAGE_SIZE = 200;
const LEGACY_MAX_ROWS = 5_000;
const MAX_GROUP_NAME_LENGTH = 120;
const MAX_CHILDREN_PER_CALL = 100;
const MAX_KEY_LENGTH = 64;
const MAX_PLACES = 2_000;
const MAX_CELLS = 2_000;
const MAX_SPOT = 50;
const MERCATOR_MAX_LAT = 85.0511287798;
const MAX_PICTURE_LENGTH = 1_000_000;
/** Who an inheriting sub-group holds besides the viewer. */
const DEV_INHERITED_MEMBERS = 4;

const devProfile: PotokProfile = {
  id: 1,
  username: 'dev-user',
  profile_picture_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=potok-dev',
  description: null,
  description_format: 'markdown',
  sharing: 'unique',
  inserted_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  admin: true,
  roles: [],
};

const appParam = Number(new URLSearchParams(location.search).get('app'));
const ownDescriptionId = Number.isInteger(appParam) && appParam > 0 ? appParam : null;

const ownValue = (value: { description_id: number | null }) => value.description_id === ownDescriptionId;

// The app's personal memory, per viewer and app, under `potok-dev:personal`:
// `{"<viewer>:<app>": {"<key>": {value, updated_at}}}`. In potok only that
// person reads it (a guest's stays in the browser), with the same limits.
const PERSONAL_STORAGE_KEY = 'potok-dev:personal';
const PERSONAL_MAX_KEYS = 100;
const PERSONAL_MAX_BYTES = 16384;
const PERSONAL_KEY = /^[A-Za-z0-9_.:-]{1,64}$/;

type PersonalStore = Record<string, Record<string, { value: unknown; updated_at: string }>>;

function loadPersonal(): PersonalStore {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(PERSONAL_STORAGE_KEY) || '{}');
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? (stored as PersonalStore) : {};
  } catch {
    return {};
  }
}

// listener -> whether it gets the values of every app in the group.
const newValueListeners = new Map<(value: PotokValue) => void, boolean>();

function deliverNewValue(value: PotokValue) {
  const own = ownValue(value);

  newValueListeners.forEach((allApps, listener) => {
    if (!own && !allApps) return;

    try {
      listener(value);
    } catch (error) {
      console.error(error);
    }
  });

  if (own) window.dispatchEvent(new CustomEvent('phx:new_data_value', { detail: value }));
}

const pollListeners = new Set<(id: number) => void>();
const waitingListeners = new Set<() => void>();

// What waits for the dev viewer: one form and one decision, until each is done.
let devTasks: PotokTask[] = [
  {
    id: 9001,
    process: { id: 1, name: 'Dev form' },
    element: 'form_1',
    label: 'Kvar',
    kind: 'form',
    title: null,
    text: 'The lift is stuck',
    deadline_at: null,
    outcomes: [],
    attributes: [
      { name: 'naslov', type: 'text', list: false, required: true },
      { name: 'sprat', type: 'number', list: false, required: false },
    ],
    started_by_viewer: true,
  },
  {
    id: 9002,
    process: { id: 2, name: 'Dev decision' },
    element: 'task_1',
    label: 'Approve',
    kind: 'decision',
    title: 'Budget',
    text: null,
    deadline_at: null,
    outcomes: ['yes', 'no'],
    attributes: [],
    started_by_viewer: false,
  },
];

// A task is done: it leaves the list, and the app hears of it.
function finishDevTask(id: number) {
  devTasks = devTasks.filter((task) => task.id !== id);
  setTimeout(() => waitingListeners.forEach((listener) => listener()));
}
const subgroupListeners = new Set<() => void>();
const sheetListeners = new Set<(id: number) => void>();

// Places that did not fit in localStorage, until the next reload.
let memoryPlaces: PotokPlace[] | null = null;

// Places seeded before areas were points.
function loadPlaces(): PotokPlace[] {
  if (memoryPlaces) return memoryPlaces;

  try {
    const stored: unknown = JSON.parse(localStorage.getItem(PLACES_STORAGE_KEY) || '[]');
    return Array.isArray(stored)
      ? stored.map((place: PotokPlace) => ({ ...place, shape: place.shape ?? 'point', areas: place.areas ?? [] }))
      : [];
  } catch {
    return [];
  }
}

function savePlaces(places: PotokPlace[]) {
  try {
    localStorage.setItem(PLACES_STORAGE_KEY, JSON.stringify(places));
    memoryPlaces = null;
  } catch {
    if (!memoryPlaces) console.warn('[potok-dev] The places do not fit in localStorage: they live until the next reload.');
    memoryPlaces = places;
  }
}

// --- A big map's view, gathered as Potok gathers it (Social.list_map_cells) ---

// Lower case, no accents: a rough stand-in for Potok's name search.
const foldName = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'dj')
    .toLowerCase();

// What the pin filter sees a place as: its icon, "picture", or "kind".
function pinKeyOf(place: PotokPlace, icons: Set<string>): string {
  return place.pin === 'picture' || (place.pin !== null && icons.has(place.pin)) ? place.pin : 'kind';
}

function placesFilter(config: PotokMapConfig, search: string | undefined, pins: string[] | undefined) {
  const icons = new Set(config.pins.icons.map((icon) => icon.key));
  const term = search ? foldName(search.trim()) : '';
  const wanted = Array.isArray(pins) && pins.length > 0 ? new Set(pins) : null;

  return (place: PotokPlace) =>
    (term === '' || foldName(place.name).includes(term)) && (!wanted || wanted.has(pinKeyOf(place, icons)));
}

function pinCounts(places: PotokPlace[], config: PotokMapConfig): PotokPinCount[] {
  const icons = new Set(config.pins.icons.map((icon) => icon.key));
  const counts = new Map<string, number>();
  places.forEach((place) => counts.set(pinKeyOf(place, icons), (counts.get(pinKeyOf(place, icons)) ?? 0) + 1));

  return [...counts].map(([pin, count]) => ({ pin, count })).sort((a, b) => b.count - a.count || a.pin.localeCompare(b.pin));
}

function placesExtent(places: PotokPlace[]): { count: number; bounds: PotokBounds | null } {
  if (places.length === 0) return { count: 0, bounds: null };

  const lats = places.map((place) => place.lat);
  const lngs = places.map((place) => place.lng);
  return {
    count: places.length,
    bounds: [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ],
  };
}

const inBox = (place: PotokPlace, [west, south, east, north]: PotokPlacesQuery['bbox']) =>
  place.lat >= south &&
  place.lat <= north &&
  (west <= east ? place.lng >= west && place.lng <= east : place.lng >= west || place.lng <= east);

// Cells of a Web Mercator grid with 4 * 2^zoom cells a side: about 64 pixels.
function gatherPlaces(places: PotokPlace[], view: PotokPlacesQuery, config: PotokMapConfig) {
  const cells = 4 * 2 ** Math.max(0, Math.min(24, Math.trunc(view.zoom)));
  const tones = new Map(config.pins.icons.map((icon) => [icon.key, icon.tone]));
  const groups = new Map<string, PotokPlace[]>();

  for (const place of places) {
    if (!inBox(place, view.bbox)) continue;

    const lat = (Math.min(Math.max(place.lat, -MERCATOR_MAX_LAT), MERCATOR_MAX_LAT) * Math.PI) / 180;
    const x = Math.floor(((place.lng + 180) / 360) * cells);
    const y = Math.floor(((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * cells);
    const key = `${x}:${y}`;
    groups.set(key, [...(groups.get(key) ?? []), place]);
  }

  const kept = [...groups.values()].sort((a, b) => b.length - a.length);
  const truncated = kept.length > MAX_CELLS;
  const shown = kept.slice(0, MAX_CELLS);

  const clusters: PotokPlaceCluster[] = shown
    .filter((cell) => cell.length > 1)
    .map((cell) => {
      const lats = cell.map((place) => place.lat);
      const lngs = cell.map((place) => place.lng);
      const toneCounts: Record<string, number> = {};
      cell.forEach((place) => {
        const tone = (place.pin && tones.get(place.pin)) || 'kind';
        toneCounts[tone] = (toneCounts[tone] ?? 0) + 1;
      });

      return {
        count: cell.length,
        lat: lats.reduce((sum, value) => sum + value, 0) / cell.length,
        lng: lngs.reduce((sum, value) => sum + value, 0) / cell.length,
        bounds: [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)],
        ] as PotokBounds,
        tones: toneCounts,
      };
    });

  return {
    places: shown.filter((cell) => cell.length === 1).map((cell) => cell[0]),
    clusters,
    total: kept.reduce((sum, cell) => sum + cell.length, 0),
    truncated,
  };
}

function loadPlaceShapes(): Record<string, PotokPlaceShape['geojson']> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(PLACE_SHAPES_STORAGE_KEY) || '{}');
    return stored && typeof stored === 'object' ? (stored as Record<string, PotokPlaceShape['geojson']>) : {};
  } catch {
    return {};
  }
}

// Without a seeded config, OpenStreetMap's tiles straight from the browser
// (in potok they come through the page) and no pins to draw.
function loadMapConfig(): PotokMapConfig {
  const fallback: PotokMapConfig = {
    tiles: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      max_zoom: 19,
    },
    default_bounds: [
      [41.85, 18.82],
      [46.19, 23.01],
    ],
    pins: { drop: '', glyph_transform: '', tones: {}, kinds: [], icons: [] },
    place_kinds: [],
    can_create_places: true,
    can_edit_view: true,
  };

  try {
    const stored: unknown = JSON.parse(localStorage.getItem(MAP_CONFIG_STORAGE_KEY) || 'null');
    return stored && typeof stored === 'object' ? { ...fallback, ...(stored as Partial<PotokMapConfig>) } : fallback;
  } catch {
    return fallback;
  }
}

function loadPolls(): PotokPoll[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(POLLS_STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function savePolls(polls: PotokPoll[]) {
  localStorage.setItem(POLLS_STORAGE_KEY, JSON.stringify(polls));
}

function createDescriptionHost(): HTMLElement {
  const existing = document.querySelector('#group-panel-description');
  if (existing instanceof HTMLElement) {
    return existing;
  }

  const host = document.createElement('div');
  host.id = 'group-panel-description';
  host.style.width = '100dvw';
  host.style.minHeight = '100dvh';
  host.style.overflowY = 'auto';
  host.innerHTML = document.body.innerHTML;
  while (document.body.children.length > 0) document.body.removeChild(document.body.children[0]);
  document.body.appendChild(host);

  return host;
}

function loadValues(): PotokListedValue[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(VALUES_STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) return [];

    // Values stored before apps had ids belong to the default description.
    return stored.map((row: PotokListedValue) => ({ ...row, description_id: row.description_id ?? null }));
  } catch {
    return [];
  }
}

function saveValues(values: PotokListedValue[]) {
  try {
    localStorage.setItem(VALUES_STORAGE_KEY, JSON.stringify(values));
  } catch {
    // Storage full or blocked: the values live until the next reload.
  }
}

function loadSubgroups(): Record<string, PotokSubgroup[]> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(SUBGROUPS_STORAGE_KEY) || '{}');
    return stored && typeof stored === 'object' ? (stored as Record<string, PotokSubgroup[]>) : {};
  } catch {
    return {};
  }
}

/** The period of `listSubgroups` and `listChildren`, or `invalid_date` for what is no moment. */
function inPeriod(
  options: PotokSubgroupListOptions,
): ((group: PotokSubgroup) => boolean) | { ok: false; error: 'invalid_date' } {
  const moment = (value: string | undefined) => (value === undefined ? undefined : Date.parse(value));
  const from = moment(options.from);
  const to = moment(options.to);

  if (Number.isNaN(from) || Number.isNaN(to)) return { ok: false, error: 'invalid_date' };

  return (group) => {
    const placed = Date.parse(group.published_at ?? group.inserted_at);
    return (from === undefined || placed >= from) && (to === undefined || placed < to);
  };
}

/** The answer to `aroundId`; null when the rows, newest first, do not hold that group. */
function aroundPage(rows: PotokSubgroup[], aroundId: number | undefined, limit: number): PotokSubgroupPage | null {
  const index = rows.findIndex((group) => group.id === aroundId);
  if (index < 0) return null;

  const first = Math.max(0, index - limit);
  const end = index + limit + 1;

  return { ok: true, groups: rows.slice(first, end), has_more: rows.length > end, has_newer: first > 0 };
}

function saveSubgroups(subgroups: Record<string, PotokSubgroup[]>) {
  localStorage.setItem(SUBGROUPS_STORAGE_KEY, JSON.stringify(subgroups));
}

function loadChildren(): PotokChild[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(CHILDREN_STORAGE_KEY) || '[]');
    return Array.isArray(stored)
      ? stored.map((child: PotokChild) => ({
          ...child,
          key: child.key ?? null,
          lat: child.lat ?? null,
          lng: child.lng ?? null,
          pin: child.pin ?? null,
        }))
      : [];
  } catch {
    return [];
  }
}

function saveChildren(children: PotokChild[]) {
  try {
    localStorage.setItem(CHILDREN_STORAGE_KEY, JSON.stringify(children));
  } catch {
    // Storage full or blocked: the groups live until the next reload.
  }
}

function loadOwnGroup(): PotokOwnGroup {
  const group: PotokOwnGroup = {
    id: 1,
    name: 'dev-group',
    is_public: false,
    inherits_members: false,
    inherit_role_keys: [],
    parent: null,
    can_manage_children: true,
    can_create_children: true,
    everyone_creates_subgroups: false,
    can_start_polls: true,
    signed_in: true,
  };

  try {
    const stored: unknown = JSON.parse(localStorage.getItem(GROUP_STORAGE_KEY) || '{}');
    return stored && typeof stored === 'object' ? { ...group, ...stored } : group;
  } catch {
    return group;
  }
}

// What a guest gets of a group below, as the server gives it: no author and
// no reactions of its own; dev groups say `guest_text: false` to keep their text
// from guests, as a group that keeps its description from them does.
function asSeenByViewer(group: PotokSubgroup & { guest_text?: boolean }): PotokSubgroup {
  if (viewerId !== null) return group;

  return {
    ...group,
    creator_id: null,
    can_react: false,
    description_html: group.guest_text === false ? null : group.description_html,
  };
}

// A rough stand-in for the server's sanitizer and markdown: comments and
// scripts go, and markdown stays plain text in paragraphs.
function devDescriptionHtml(description: string, format: PotokContentFormat): string | null {
  if (description.trim() === '') return null;

  if (format === 'html') {
    return description.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/gi, '');
  }

  const text = description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function devPicture(id: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="hsl(${(id * 47) % 360} 60% 55%)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const closed = (group: PotokSubgroup) => !group.is_public && !group.inherits_members;

const feedTime = (group: PotokSubgroup) => group.published_at ?? group.inserted_at;

// Social.list_visible_child_groups_newest_first: when it opened up, then id.
function compareFeedOrder(a: PotokSubgroup, b: PotokSubgroup): number {
  return feedTime(b).localeCompare(feedTime(a)) || b.id - a.id;
}

// Like Value.decode_data_value: `data` must be a JSON object; undefined means
// the server would reject it.
function decodeData(data: string): PotokData | null | undefined {
  const trimmed = data.trim();
  if (trimmed === '') return null;

  try {
    const decoded: unknown = JSON.parse(trimmed);
    if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
      return decoded as PotokData;
    }
  } catch {
    // Not JSON.
  }

  return undefined;
}

// Show.value_payload/1 carries no timestamps; listed values do.
function valuePayload(row: PotokListedValue): PotokValue {
  const { inserted_at: _insertedAt, updated_at: _updatedAt, ...value } = row;
  return value;
}

// `data ->> field` in Postgres, with a missing field as ''.
function dataText(row: PotokListedValue, field: string): string {
  const item = row.data?.[field];
  if (item == null) return '';
  return typeof item === 'object' ? JSON.stringify(item) : String(item);
}

const timestamp = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');

function nonNegativeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

// Social.maybe_order_data_value_field: insertion order by default; by a
// `data` field case-insensitively, and numerically first for "number".
function compareRows(orderBy: string | undefined, orderDir: string | undefined) {
  const dir = orderDir === 'desc' ? -1 : 1;

  return (a: PotokListedValue, b: PotokListedValue) => {
    if (orderBy) {
      const aText = dataText(a, orderBy);
      const bText = dataText(b, orderBy);

      if (orderBy === 'number') {
        // Non-numbers sort like NULL: last when ascending, first when descending.
        const numeric = (text: string) => (/^-?[0-9]+(\.[0-9]+)?$/.test(text) ? Number(text) : Infinity);
        const aNumber = numeric(aText);
        const bNumber = numeric(bText);
        if (aNumber !== bNumber) return (aNumber < bNumber ? -1 : 1) * dir;
      }

      const aLower = aText.toLowerCase();
      const bLower = bText.toLowerCase();
      if (aLower !== bLower) return (aLower < bLower ? -1 : 1) * dir;
    }

    return (a.id - b.id) * dir;
  };
}

type CursorOptions = { orderBy?: string; orderDir?: string; afterId?: number; beforeId?: number; offset?: number };

// Social.data_value_scan/1: a lone cursor is walked away from, so the page
// lies right next to it in either order; ordered by a data key, the cursors
// only narrow by id. `has_more` says whether more lie beyond, away from it.
function pageNextToCursor<T extends { id: number }>(
  rows: T[],
  order: (orderDir: 'asc' | 'desc') => (a: T, b: T) => number,
  options: CursorOptions,
  limit: number,
): { page: T[]; more: boolean } {
  const afterId = nonNegativeInteger(options.afterId);
  const beforeId = nonNegativeInteger(options.beforeId);
  const desc = options.orderDir === 'desc';
  const keyed = !!options.orderBy?.trim();
  const flip =
    !keyed && ((!desc && beforeId !== undefined && afterId === undefined) || (desc && afterId !== undefined && beforeId === undefined));
  const offset = nonNegativeInteger(options.offset) ?? 0;

  const walked = rows
    .filter((row) => afterId === undefined || row.id > afterId)
    .filter((row) => beforeId === undefined || row.id < beforeId)
    .sort(order(desc !== flip ? 'desc' : 'asc'))
    .slice(offset, offset + limit + 1);

  const page = walked.slice(0, limit);
  return { page: flip ? page.reverse() : page, more: walked.length > limit };
}

// AppApi.match_option/1: none when absent or empty; anything but an object of
// at most 4 KB as JSON is refused, so a broken filter never reads as everything.
function matchOption(match: unknown): { ok: true; match: PotokData | null } | PotokError {
  if (match === undefined || match === null) return { ok: true, match: null };
  if (typeof match !== 'object' || Array.isArray(match) || new TextEncoder().encode(JSON.stringify(match)).length > 4096) {
    return { ok: false, error: 'invalid_match' };
  }
  return { ok: true, match: Object.keys(match).length ? (match as PotokData) : null };
}

// ValueAggregate: sums over the numbers at `under` in each value's data.
const MAX_AGGREGATE_FIELDS = 5;
const MAX_AGGREGATE_BUCKETS = 50;

function aggregateKey(key: unknown): key is string {
  return typeof key === 'string' && new TextEncoder().encode(key).length >= 1 && new TextEncoder().encode(key).length <= 64;
}

// A JSON number, or a string that is a plain decimal, of at most 61 characters.
function aggregateNumber(item: unknown): number | null {
  if (typeof item === 'number' && Number.isFinite(item) && String(item).length <= 61) return item;
  if (typeof item === 'string' && item.length <= 61 && /^-?[0-9]+(\.[0-9]+)?$/.test(item)) return Number(item);
  return null;
}

function fieldStats(nodes: unknown[], field: string) {
  const numbers = nodes
    .map((node) => aggregateNumber(node && typeof node === 'object' ? (node as PotokData)[field] : undefined))
    .filter((n): n is number => n !== null);
  const sum = numbers.reduce((total, n) => total + n, 0);

  return {
    count: numbers.length,
    sum,
    avg: numbers.length ? sum / numbers.length : null,
    min: numbers.length ? Math.min(...numbers) : null,
    max: numbers.length ? Math.max(...numbers) : null,
  };
}

function aggregate(
  datas: unknown[],
  options: PotokAggregateOptions,
  defaultUnder: string[],
): ({ ok: true } & PotokAggregate) | PotokError {
  const invalid: PotokError = { ok: false, error: 'invalid_aggregate' };
  const fields = [...new Set(options.fields ?? [])];
  const under = options.under ?? defaultUnder;
  const groupBy = options.groupBy ?? null;

  if (fields.length > MAX_AGGREGATE_FIELDS || !fields.every(aggregateKey)) return invalid;
  if (!Array.isArray(under) || under.length > 3 || !under.every(aggregateKey)) return invalid;
  if (groupBy !== null && !aggregateKey(groupBy)) return invalid;

  const nodes = datas.map((data) => (under.length ? at(data, under) : data));
  const statsOf = (group: unknown[]) => Object.fromEntries(fields.map((field) => [field, fieldStats(group, field)]));

  if (groupBy === null) {
    return { ok: true, total: nodes.length, fields: statsOf(nodes), buckets: null, other: null };
  }

  const groups = new Map<string | null, unknown[]>();
  for (const node of nodes) {
    const item = node && typeof node === 'object' ? (node as PotokData)[groupBy] : undefined;
    const value = ['string', 'number', 'boolean'].includes(typeof item) ? String(item).slice(0, 200) : null;
    groups.set(value, [...(groups.get(value) ?? []), node]);
  }

  const sorted = [...groups.entries()].sort(([a, aNodes], [b, bNodes]) =>
    bNodes.length !== aNodes.length ? bNodes.length - aNodes.length : a === null ? 1 : b === null ? -1 : a < b ? -1 : a > b ? 1 : 0,
  );
  const top = sorted.slice(0, MAX_AGGREGATE_BUCKETS);
  const rest = sorted.slice(MAX_AGGREGATE_BUCKETS);

  return {
    ok: true,
    total: nodes.length,
    fields: statsOf(nodes),
    buckets: top.map(([value, group]) => ({ value, count: group.length, fields: statsOf(group) })),
    other: rest.length ? { buckets: rest.length, count: rest.reduce((n, [, group]) => n + group.length, 0) } : null,
  };
}

// --- Collections and rules (AppData, ValueRules, ValueScoring, ValueSummary) ---
//
// `?viewer=` plays another viewer: `editor` (the default, an admin), `reader`
// (holds the role "pregled"), `member` (holds "ispitanik"), `outsider` (signed
// in, not a member) or `guest`. The config of each app is in
// `potok-dev:config:<app>`, files sent from the frame live until a reload.

const CONFIG_STORAGE_KEY = 'potok-dev:config';
const NOTIFY_STORAGE_KEY = 'potok-dev:notify';
const RESERVED_COLLECTIONS = ['config', 'notify', 'files'];
const MAX_COLLECTION_LIMIT = 100;
const MAX_VALUE_BYTES = 64 * 1024;
const MAX_CONFIG_BYTES = 512 * 1024;
const MAX_BUCKETS = 50;

export const DEV_READER_ROLE = '00000000-0000-4000-8000-000000000001';
export const DEV_FILLER_ROLE = '00000000-0000-4000-8000-000000000002';

const devRoles: PotokRole[] = [
  { key: 'admin', name: 'Admin', builtin: true },
  { key: DEV_READER_ROLE, name: 'pregled', builtin: false },
  { key: DEV_FILLER_ROLE, name: 'ispitanik', builtin: false },
  { key: 'everyone', name: 'Svi', builtin: true },
];

type DevViewer = 'editor' | 'reader' | 'member' | 'outsider' | 'guest';

const viewerParam = new URLSearchParams(location.search).get('viewer');
const devViewer: DevViewer =
  viewerParam === 'reader' || viewerParam === 'member' || viewerParam === 'outsider' || viewerParam === 'guest'
    ? viewerParam
    : 'editor';

const viewerIds: Record<DevViewer, number | null> = { editor: 1, reader: 2, member: 3, outsider: 4, guest: null };
const viewerRoleKeys: Record<DevViewer, string[]> = {
  editor: ['everyone', 'admin'],
  reader: ['everyone', DEV_READER_ROLE],
  member: ['everyone', DEV_FILLER_ROLE],
  outsider: [],
  guest: [],
};

const viewerId = viewerIds[devViewer];
const viewerMember = devViewer === 'editor' || devViewer === 'reader' || devViewer === 'member';
const viewerManages = devViewer === 'editor';
const onList = (keys: string[] | undefined) => (keys ?? []).some((key) => viewerRoleKeys[devViewer].includes(key));

type DevRule = Required<Omit<PotokRule, 'closes_at' | 'under' | 'score'>> & {
  ruled: boolean;
  closes_at: string | null;
  under: string[] | null;
  score: PotokRule['score'];
};

function devRule(config: PotokConfig | null, collection: string): DevRule {
  const rule = config?.data.rules?.[collection];

  return {
    ruled: Boolean(rule),
    write: rule ? (rule.public ? ['everyone'] : (rule.write ?? ['everyone'])) : ['everyone'],
    read: rule?.read ?? [],
    summary: rule?.summary ?? [],
    once: rule?.once ?? false,
    edit_own: rule?.edit_own ?? false,
    anonymous: rule?.anonymous ?? false,
    public: rule?.public ?? false,
    open: rule?.open ?? true,
    closes_at: rule?.closes_at ?? null,
    under: rule?.under ?? null,
    uploads: rule?.uploads ?? {},
    score: rule?.score ?? null,
    process: rule?.process ?? null,
  };
}

const ruleOpen = (rule: DevRule) => rule.open && (!rule.closes_at || Date.now() < Date.parse(rule.closes_at));
const rulePublic = (rule: DevRule, group: PotokOwnGroup) => rule.public && group.is_public;
const fullReader = (rule: DevRule) => viewerManages || (viewerMember && onList(rule.read));
const released = (rule: DevRule) => rule.score?.release === 'immediate' || rule.score?.released === true;

function writeBlock(rule: DevRule, group: PotokOwnGroup): PotokCaps['write_block'] {
  if (viewerId === null) return 'not_permitted';
  if (!ruleOpen(rule)) return 'closed';
  if (viewerMember) return onList(rule.write) ? null : 'role';
  return rulePublic(rule, group) ? null : 'members_only';
}

function summaryReader(rule: DevRule, group: PotokOwnGroup): boolean {
  if (fullReader(rule)) return true;
  if (viewerMember) return onList(rule.summary);
  return rulePublic(rule, group) && rule.summary.includes('everyone');
}

function loadConfig(): PotokConfig | null {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(`${CONFIG_STORAGE_KEY}:${ownDescriptionId ?? 'default'}`) || 'null',
    );
    return stored && typeof stored === 'object' ? (stored as PotokConfig) : null;
  } catch {
    return null;
  }
}

function saveConfigData(config: PotokConfig) {
  localStorage.setItem(`${CONFIG_STORAGE_KEY}:${ownDescriptionId ?? 'default'}`, JSON.stringify(config));
}

function loadNotify(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(NOTIFY_STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

const byteSize = (data: unknown) => new TextEncoder().encode(JSON.stringify(data)).length;

// `data @> match` in Postgres: objects by key, arrays by containment.
function contains(data: unknown, match: unknown): boolean {
  if (Array.isArray(match)) {
    return Array.isArray(data) && match.every((item) => data.some((element) => contains(element, item)));
  }
  if (match && typeof match === 'object') {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    return Object.entries(match).every(([key, value]) => contains((data as PotokData)[key], value));
  }
  return data === match;
}

function at(data: unknown, path: string[] | null): unknown {
  if (!path) return undefined;
  return path.reduce<unknown>(
    (node, key) => (node && typeof node === 'object' ? (node as PotokData)[key] : undefined),
    data,
  );
}

// ValueScoring: the same checks as on the server.
const normalizeText = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');
const checkPoints = (check: PotokScoreCheck) => Math.max(0, Math.min(1000, Math.trunc(check.points || 0)));
const sameSet = (a: unknown, b: unknown) =>
  Array.isArray(a) && Array.isArray(b) && a.length > 0 && a.length === new Set(a).size && a.every((x) => b.includes(x)) && b.every((x) => a.includes(x));

function itemMax(check: PotokScoreCheck): number {
  if ('rows' in check) return checkPoints(check) * Object.keys(check.rows).length;
  if ('row_sets' in check) return checkPoints(check) * Object.keys(check.row_sets).length;
  return checkPoints(check);
}

function checkAnswer(answer: unknown, check: PotokScoreCheck): { ok: boolean | null; points: number | null } {
  const points = checkPoints(check);
  const right = (ok: boolean) => ({ ok, points: ok ? points : 0 });

  if ('eq' in check) return right(answer !== undefined && answer !== null && answer === check.eq);
  if ('set' in check) return right(sameSet(answer, check.set));
  if ('text' in check) {
    if (typeof answer !== 'string' || normalizeText(answer) === '') return right(false);
    if (check.text.map(normalizeText).includes(normalizeText(answer))) return right(true);
    return check.others_wrong ? right(false) : { ok: null, points: null };
  }
  if ('rows' in check || 'row_sets' in check) {
    const expected = ('rows' in check ? check.rows : check.row_sets) as Record<string, unknown>;
    const given = answer && typeof answer === 'object' ? (answer as PotokData) : {};
    const rows = Object.entries(expected);
    const good = rows.filter(([row, value]) => ('rows' in check ? given[row] === value : sameSet(given[row], value))).length;
    return { ok: rows.length > 0 && good === rows.length, points: good * points };
  }
  return { ok: null, points: null };
}

function scoreAnswers(answers: unknown, key: Record<string, PotokScoreCheck>, previous: PotokManaged | null): PotokManaged {
  const given = answers && typeof answers === 'object' ? (answers as PotokData) : {};
  const items: PotokManaged['items'] = {};

  Object.entries(key).forEach(([question, check]) => {
    const before = previous?.items[question];

    if (before?.graded) {
      const points = Math.min(before.points ?? 0, itemMax(check));
      items[question] = { ok: points >= itemMax(check), points, graded: true, ...(before.feedback ? { feedback: before.feedback } : {}) };
    } else {
      items[question] = { ...checkAnswer(given[question], check), ...(before?.feedback ? { feedback: before.feedback } : {}) };
    }
  });

  return {
    score: Object.values(items).reduce((sum, item) => sum + (item.points ?? 0), 0),
    max: Object.values(key).reduce((sum, check) => sum + itemMax(check), 0),
    pending: Object.values(items).filter((item) => item.points === null || item.points === undefined).length,
    items,
  };
}

function authorView(managed: PotokManaged, rule: DevRule, key: Record<string, PotokScoreCheck>): PotokManaged {
  const show = { missed: true, correct: true, points: true, ...(rule.score?.show ?? {}) };
  const items: PotokManaged['items'] = {};

  Object.entries(managed.items).forEach(([question, item]) => {
    const check = key[question];
    const feedback = item.feedback || (item.ok === true ? check?.ok : item.ok === false ? check?.bad : undefined);
    const expected = check
      ? Object.fromEntries(Object.entries(check).filter(([name]) => ['eq', 'set', 'text', 'rows', 'row_sets'].includes(name)))
      : undefined;

    items[question] = {
      ...(show.missed ? { ok: item.ok } : {}),
      ...(show.points ? { points: item.points } : {}),
      ...(show.correct && expected ? { expected } : {}),
      ...(feedback ? { feedback } : {}),
    };
  });

  return show.points ? { score: managed.score, max: managed.max, pending: managed.pending, items } : { items };
}

const collectionListeners = new Map<(change: PotokValueChange) => void, string | null>();

function deliverChange(change: PotokValueChange) {
  collectionListeners.forEach((collection, listener) => {
    if (collection !== null && collection !== change.collection) return;

    try {
      listener(change);
    } catch (error) {
      console.error(error);
    }
  });
}

// --- Processes of the app's collections (Processes, Engine, Processes.Graph) ---
//
// A rule's `process` with a `graph` starts an instance for each new value of
// its collection. Instances are kept in `potok-dev:processes` and run in the
// page. A service task only says on the console what Potok would do (a
// sub-group it makes gets a made-up id), and a message whose text comes out
// empty fails the instance with `empty_text`, as in Potok, so that
// `retryProcess` has something to take up. Timers and deadlines wake an
// instance while the page stays open, or at the next call. `saveConfig`
// checks a graph's shape and roles as Potok does, but not every limit.

const PROCESSES_STORAGE_KEY = 'potok-dev:processes';
const MAX_PROCESS_LIST = 100;
const MAX_PROCESS_STEPS = 5_000;
const MAX_PROCESS_NAME = 60;
const MAX_PROCESS_COMMENT = 1_000;
const MAX_TIMEOUT_MS = 2_147_483_647;
const PROCESS_ID_FORMAT = /^[a-z][a-z0-9_-]{0,39}$/;
const PROCESS_FIELD_FORMAT = /^[\p{L}\p{Nd}_.-]{1,64}$/u;
const PROCESS_PLACEHOLDER = /\{\{\s*([\p{L}\p{Nd}_.-]+)\s*\}\}/gu;
const PROCESS_DURATION = /^P(?:(\d+)W|(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?)$/;
const DEFAULT_SUBGROUP_ADMINS = ['owner', 'triggered_by'];

type DevInstance = {
  id: number;
  /** The app, as `description_id`. */
  app: number | null;
  collection: string;
  value_id: number;
  /** The value's author, who sees the instance without reading the collection in full. */
  creator_id: number | null;
  status: PotokProcess['status'];
  element: string;
  wake_at: string | null;
  error: PotokProcess['error'];
  groups: Record<string, number>;
  log: { at: string; element: string; outcome: string; comment: string | null; by: number }[];
  /** A task's decision, read by the texts and conditions after it as `{{task.outcome}}`. */
  results: Record<string, { outcome: string; comment: string | null; by: string | null }>;
  steps: number;
  /** The graph it started with: a rule saved later changes only the instances after it. */
  graph: PotokProcessGraph;
};

const viewerNames = new Map(
  (Object.entries(viewerIds) as [DevViewer, number | null][]).map(([name, id]) => [id, `dev-${name}`]),
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function loadInstances(): DevInstance[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(PROCESSES_STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveInstances(instances: DevInstance[]) {
  localStorage.setItem(PROCESSES_STORAGE_KEY, JSON.stringify(instances));
}

function durationSeconds(duration: unknown): number | null {
  const match = typeof duration === 'string' ? PROCESS_DURATION.exec(duration) : null;
  if (!match) return null;

  const [weeks, days, hours, minutes] = match.slice(1).map((part) => Number(part ?? 0));
  return weeks * 604_800 + days * 86_400 + hours * 3_600 + minutes * 60;
}

function validDuration(duration: unknown): boolean {
  const seconds = durationSeconds(duration);
  return seconds !== null && seconds >= 60 && seconds <= 366 * 24 * 3_600;
}

const later = (duration: string) =>
  new Date(Date.now() + (durationSeconds(duration) ?? 0) * 1000).toISOString().replace(/\.\d+Z$/, 'Z');

// Processes.Legacy: a field is a path of names with dots between them.
function processField(data: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (isRecord(acc) ? acc[key] : undefined), data);
}

const processText = (value: unknown) =>
  typeof value === 'string' ? value : typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';

function processNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || !/^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value.trim())) return null;
  return Number(value.trim());
}

const renderProcessText = (text: string, data: PotokData) =>
  text.replace(PROCESS_PLACEHOLDER, (_whole, field: string) => processText(processField(data, field))).trim();

function conditionHolds(condition: PotokProcessCondition, data: PotokData): boolean {
  const actual = processField(data, condition.field);

  if (condition.op === 'empty') {
    return (
      actual === null ||
      actual === undefined ||
      (typeof actual === 'string' && actual.trim() === '') ||
      (Array.isArray(actual) && actual.length === 0) ||
      (isRecord(actual) && Object.keys(actual).length === 0)
    );
  }

  const a = processNumber(actual);
  const b = processNumber(condition.value);
  const same =
    a !== null && b !== null ? a === b : processText(actual).trim() === processText(condition.value).trim();

  switch (condition.op) {
    case '=':
      return same;
    case '!=':
      return !same;
    case '<':
      return a !== null && b !== null && a < b;
    case '>':
      return a !== null && b !== null && a > b;
  }
}

const plainFlow = (flow: PotokProcessFlow) =>
  flow.outcome === undefined && flow.deadline === undefined && flow.condition === undefined && flow.default === undefined;

const nodeOf = (graph: PotokProcessGraph, id: string) => graph.nodes.find((node) => node.id === id);
const flowsOut = (graph: PotokProcessGraph, id: string) => graph.flows.filter((flow) => flow.from === id);

// Processes.Graph.normalize/2 and unknown_role/2, in short: what each element
// takes, a shape an instance can finish, and roles the group has. Gives the
// path counted from the graph and the reason, or null.
function graphProblem(graph: unknown): [string, string] | null {
  if (!isRecord(graph) || !Array.isArray(graph.nodes) || !Array.isArray(graph.flows)) return ['', 'invalid'];
  if (graph.nodes.length === 0) return ['nodes', 'empty'];
  if (graph.nodes.length > 100) return ['nodes', 'too_many'];
  if (graph.flows.length > 200) return ['flows', 'too_many'];

  for (const [i, node] of graph.nodes.entries()) {
    const problem = elementProblem(node, `nodes.${i}`);
    if (problem) return problem;
  }

  const nodes = graph.nodes as PotokProcessNode[];
  const ids = new Set<string>();

  for (const [i, node] of nodes.entries()) {
    if (ids.has(node.id)) return [`nodes.${i}.id`, 'duplicate'];
    ids.add(node.id);
  }

  for (const [i, flow] of graph.flows.entries()) {
    const problem = flowProblem(flow, `flows.${i}`, ids);
    if (problem) return problem;
  }

  const flows = graph.flows as PotokProcessFlow[];
  const starts = nodes.flatMap((node, i) => (node.type === 'startEvent' ? [i] : []));
  if (starts.length === 0) return ['nodes', 'no_start'];
  if (starts.length > 1) return [`nodes.${starts[1]}`, 'second_start'];
  if (!nodes.some((node) => node.type === 'endEvent')) return ['nodes', 'no_end'];

  for (const [i, node] of nodes.entries()) {
    const problem = leavingProblem(node, `nodes.${i}`, flows);
    if (problem) return problem;
  }

  for (const [i, node] of nodes.entries()) {
    if (node.type !== 'serviceTask' || node.action !== 'message' || (node.in ?? 'app') === 'app') continue;
    if (!nodes.some((other) => other.id === node.in && other.type === 'serviceTask' && other.action === 'subgroup')) {
      return [`nodes.${i}.in`, 'unknown'];
    }
  }

  const walk = (from: string[], next: (id: string) => string[]) => {
    const seen = new Set(from);
    const queue = [...from];

    while (queue.length > 0) {
      next(queue.pop()!).forEach((id) => {
        if (!seen.has(id)) {
          seen.add(id);
          queue.push(id);
        }
      });
    }

    return seen;
  };

  const reached = walk([nodes[starts[0]].id], (id) => flowsOut({ nodes, flows }, id).map((flow) => flow.to));
  const unreached = nodes.findIndex((node) => !reached.has(node.id));
  if (unreached >= 0) return [`nodes.${unreached}`, 'unreachable'];

  const ends = nodes.filter((node) => node.type === 'endEvent').map((node) => node.id);
  const finishing = walk(ends, (id) => flows.filter((flow) => flow.to === id).map((flow) => flow.from));
  const stuck = nodes.findIndex((node) => !finishing.has(node.id));
  if (stuck >= 0) return [`nodes.${stuck}`, 'dead_end'];

  const keys = new Set(devRoles.map((role) => role.key));

  for (const [i, node] of nodes.entries()) {
    if ((node.type === 'userTask' || (node.type === 'serviceTask' && node.action === 'push')) && !keys.has(node.role)) {
      return [`nodes.${i}.role`, 'unknown_role'];
    }

    if (node.type === 'serviceTask' && node.action === 'subgroup') {
      const j = (node.admins ?? []).findIndex((key) => !DEFAULT_SUBGROUP_ADMINS.includes(key) && !keys.has(key));
      if (j >= 0) return [`nodes.${i}.admins.${j}`, 'unknown_role'];
    }
  }

  return null;
}

const textProblem = (text: unknown, max: number, path: string): [string, string] | null =>
  typeof text === 'string' && text.trim().length >= 1 && text.trim().length <= max ? null : [path, 'invalid'];

const keyProblem = (key: unknown, path: string): [string, string] | null =>
  typeof key === 'string' && key.length >= 1 && key.length <= 64 ? null : [path, 'invalid'];

function elementProblem(node: unknown, path: string): [string, string] | null {
  if (!isRecord(node) || typeof node.id !== 'string' || !PROCESS_ID_FORMAT.test(node.id)) return [path, 'invalid'];
  if (node.label !== undefined && node.label !== null && textProblem(node.label, 60, '')) return [`${path}.label`, 'invalid'];

  const deadline = () =>
    node.deadline === undefined || node.deadline === null || validDuration(node.deadline) ? null : [`${path}.deadline`, 'invalid'] as [string, string];

  switch (node.type) {
    case 'startEvent':
    case 'endEvent':
    case 'exclusiveGateway':
      return null;
    case 'timer':
      return validDuration(node.duration) ? null : [`${path}.duration`, 'invalid'];
    case 'userTask': {
      const outcomes = node.outcomes;
      if (!Array.isArray(outcomes) || outcomes.length < 1 || outcomes.length > 10) return [`${path}.outcomes`, 'invalid'];
      const bad = outcomes.findIndex((outcome) => textProblem(outcome, 40, ''));
      if (bad >= 0) return [`${path}.outcomes.${bad}`, 'invalid'];
      if (new Set(outcomes).size !== outcomes.length) return [`${path}.outcomes`, 'duplicate'];
      return keyProblem(node.role, `${path}.role`) ?? deadline();
    }
    case 'serviceTask':
      switch (node.action) {
        case 'message':
          return (
            textProblem(node.text, 1_000, `${path}.text`) ??
            (node.in === undefined || node.in === 'app' || (typeof node.in === 'string' && PROCESS_ID_FORMAT.test(node.in))
              ? null
              : [`${path}.in`, 'invalid'])
          );
        case 'subgroup': {
          const admins = node.admins ?? DEFAULT_SUBGROUP_ADMINS;
          if (!Array.isArray(admins) || admins.length < 1 || admins.length > 10) return [`${path}.admins`, 'invalid'];
          const bad = admins.findIndex((key, j) => keyProblem(key, `${j}`));
          return textProblem(node.name, 120, `${path}.name`) ?? (bad >= 0 ? [`${path}.admins.${bad}`, 'invalid'] : null);
        }
        case 'push':
          return keyProblem(node.role, `${path}.role`) ?? textProblem(node.text, 240, `${path}.text`);
        default:
          return [`${path}.action`, 'invalid'];
      }
    default:
      return [path, 'invalid'];
  }
}

function flowProblem(flow: unknown, path: string, ids: Set<string>): [string, string] | null {
  if (!isRecord(flow) || typeof flow.from !== 'string' || typeof flow.to !== 'string') return [path, 'invalid'];
  if (!ids.has(flow.from)) return [`${path}.from`, 'unknown'];
  if (!ids.has(flow.to)) return [`${path}.to`, 'unknown'];

  const kinds = ['outcome', 'deadline', 'condition', 'default', 'each'].filter((key) => key in flow);
  if (kinds.length === 0) return null;
  if (kinds.length > 1) return [path, 'invalid'];

  const condition = flow.condition;

  switch (kinds[0]) {
    case 'outcome':
      return typeof flow.outcome === 'string' ? null : [path, 'invalid'];
    case 'deadline':
    case 'default':
      return flow[kinds[0]] === true ? null : [path, 'invalid'];
    case 'condition':
      if (!isRecord(condition) || typeof condition.field !== 'string') return [`${path}.condition`, 'invalid'];
      if (
        condition.op !== 'empty' &&
        !(['=', '!=', '<', '>'].includes(condition.op as string) && ['string', 'number', 'boolean'].includes(typeof condition.value))
      ) {
        return [`${path}.condition`, 'invalid'];
      }
      return PROCESS_FIELD_FORMAT.test(condition.field) ? null : [`${path}.condition.field`, 'invalid'];
    default:
      return [path, 'invalid'];
  }
}

// What may leave each element.
function leavingProblem(node: PotokProcessNode, path: string, flows: PotokProcessFlow[]): [string, string] | null {
  const out = flows.filter((flow) => flow.from === node.id);
  const plainOne = out.length === 1 && plainFlow(out[0]);

  switch (node.type) {
    case 'startEvent':
      if (flows.some((flow) => flow.to === node.id)) return [path, 'start_incoming'];
      return plainOne ? null : [path, 'one_flow'];
    case 'endEvent':
      return out.length === 0 ? null : [path, 'end_outgoing'];
    case 'serviceTask':
    case 'timer':
      return plainOne ? null : [path, 'one_flow'];
    case 'userTask': {
      if (out.some((flow) => flow.outcome === undefined && flow.deadline === undefined)) return [path, 'plain_flow'];
      const byOutcome = out.flatMap((flow) => (flow.outcome === undefined ? [] : [flow.outcome])).sort();
      if (JSON.stringify(byOutcome) !== JSON.stringify([...node.outcomes].sort())) return [`${path}.outcomes`, 'no_flow'];
      const deadlines = out.filter((flow) => flow.deadline !== undefined).length;
      return deadlines === (node.deadline ? 1 : 0) ? null : [`${path}.deadline`, 'no_flow'];
    }
    case 'exclusiveGateway': {
      const defaults = out.filter((flow) => flow.default !== undefined).length;
      const conditioned = out.filter((flow) => flow.condition !== undefined).length;
      if (defaults !== 1) return [path, 'no_default'];
      return conditioned >= 1 && defaults + conditioned === out.length ? null : [path, 'conditions'];
    }
  }
}

// ValueRules: a rule's process is a name, and a graph that can hold.
function processesProblem(rules: Record<string, PotokRule> | undefined): PotokError | null {
  for (const [collection, rule] of Object.entries(rules ?? {})) {
    const process: unknown = rule?.process;
    if (process === undefined || process === null) continue;

    if (!isRecord(process) || typeof process.name !== 'string' || textProblem(process.name, MAX_PROCESS_NAME, '')) {
      return { ok: false, error: 'invalid_rules', reason: 'invalid_rules' };
    }

    if (process.graph === undefined || process.graph === null) continue;

    const problem = graphProblem(process.graph);
    if (problem) {
      const [path, reason] = problem;
      return { ok: false, error: 'invalid_process', collection, path: path ? `process.graph.${path}` : 'process.graph', reason };
    }
  }

  return null;
}

// Engine.run: steps on from where the instance stands until it waits, ends
// or fails. Texts and conditions read the value's data as it is now, over
// the decisions taken so far.
function runInstance(instance: DevInstance) {
  const fail = (reason: string) => {
    instance.status = 'failed';
    instance.wake_at = null;
    instance.error = { element: instance.element, reason };
  };

  const value = loadValues().find((row) => row.id === instance.value_id);
  const data: PotokData = { ...instance.results, ...(value?.data ?? {}) };

  instance.status = 'running';
  instance.wake_at = null;

  for (;;) {
    if (instance.steps >= MAX_PROCESS_STEPS) return fail('too_many_steps');

    const node = nodeOf(instance.graph, instance.element);
    if (!node) return fail('unknown_element');

    instance.steps += 1;
    const out = flowsOut(instance.graph, node.id);
    let next: PotokProcessFlow | undefined;

    switch (node.type) {
      case 'startEvent':
        next = out.find(plainFlow);
        break;
      case 'serviceTask': {
        const reason = performService(node, instance, data);
        if (reason) return fail(reason);
        next = out.find(plainFlow);
        break;
      }
      case 'exclusiveGateway':
        next = out.find((flow) => flow.condition && conditionHolds(flow.condition, data)) ?? out.find((flow) => flow.default);
        break;
      case 'userTask':
        instance.status = 'waiting';
        instance.wake_at = node.deadline ? later(node.deadline) : null;
        return;
      case 'timer':
        instance.status = 'waiting';
        instance.wake_at = later(node.duration);
        return;
      case 'endEvent':
        instance.status = 'done';
        return;
    }

    if (!next) return fail('no_flow');
    instance.element = next.to;
  }
}

// ProcessActions, as far as the console goes.
function performService(
  node: Extract<PotokProcessNode, { type: 'serviceTask' }>,
  instance: DevInstance,
  data: PotokData,
): string | null {
  const name = devRule(loadConfig(), instance.collection).process?.name ?? instance.collection;

  switch (node.action) {
    case 'message': {
      const text = renderProcessText(node.text, data);
      if (text === '') return 'empty_text';

      const target = node.in && node.in !== 'app' ? instance.groups[node.in] : 'app';
      if (target === undefined) return 'no_subgroup';

      console.info(`[potok-dev] process "${name}" writes in ${target === 'app' ? "the app's group" : `sub-group ${target}`}:`, text);
      return null;
    }
    case 'subgroup': {
      const index = instance.graph.nodes.indexOf(node);
      const title = renderProcessText(node.name, data).slice(0, MAX_GROUP_NAME_LENGTH) || name;
      instance.groups[node.id] = 800_000 + instance.id * 100 + index;
      console.info(`[potok-dev] process "${name}" makes sub-group ${instance.groups[node.id]}:`, title);
      return null;
    }
    case 'push':
      console.info(`[potok-dev] process "${name}" sends a push to role ${node.role}:`, renderProcessText(node.text, data).slice(0, 240));
      return null;
  }
}

// Processes.present/3: what the viewer sees of an instance.
function presentInstance(instance: DevInstance): PotokProcess {
  const node = nodeOf(instance.graph, instance.element);

  return {
    id: instance.id,
    value_id: instance.value_id,
    status: instance.status,
    element: instance.element,
    wake_at: instance.wake_at,
    error: instance.error,
    groups: { ...instance.groups },
    task:
      instance.status === 'waiting' && node?.type === 'userTask'
        ? {
            element: node.id,
            outcomes: node.outcomes,
            deadline_at: instance.wake_at,
            can_complete: viewerRoleKeys[devViewer].includes(node.role),
          }
        : null,
    log: instance.log.map((entry) => ({
      at: entry.at,
      element: entry.element,
      outcome: entry.outcome,
      comment: entry.comment,
      'form?': false,
      by: { id: entry.by, username: viewerNames.get(entry.by) ?? null },
    })),
  };
}

// A timer or a task's deadline wakes the instance while the page stays open.
function scheduleWake(instance: DevInstance) {
  if (instance.status !== 'waiting' || !instance.wake_at) return;

  const delay = Date.parse(instance.wake_at) - Date.now();
  if (delay < MAX_TIMEOUT_MS) setTimeout(wakeDueInstances, Math.max(0, delay) + 50);
}

// The app's open pages hear which instance moved.
function announceInstance(instance: DevInstance) {
  if (instance.app === ownDescriptionId) {
    setTimeout(() => deliverChange({ event: 'process', collection: instance.collection, id: instance.id }));
  }

  scheduleWake(instance);
}

// Scheduler: the instances whose timer or task's deadline is due go on.
function wakeDueInstances() {
  const instances = loadInstances();
  const now = Date.now();
  const woken = instances.filter(
    (instance) => instance.status === 'waiting' && instance.wake_at && Date.parse(instance.wake_at) <= now,
  );

  woken.forEach((instance) => {
    const timer = nodeOf(instance.graph, instance.element)?.type === 'timer';
    const flow = flowsOut(instance.graph, instance.element).find((row) => (timer ? plainFlow(row) : row.deadline));

    if (flow) {
      instance.element = flow.to;
      runInstance(instance);
    } else {
      instance.status = 'failed';
      instance.wake_at = null;
      instance.error = { element: instance.element, reason: 'no_flow' };
    }
  });

  if (woken.length > 0) {
    saveInstances(instances);
    woken.forEach(announceInstance);
  }
}

// A new value of a collection whose rule has a process with a graph.
function startProcess(collection: string, rule: DevRule, value: { id: number; creator_id: number | null }) {
  const graph = rule.process?.graph;
  const start = graph?.nodes.find((node) => node.type === 'startEvent');
  if (!graph || !start) return;

  const instances = loadInstances();
  const instance: DevInstance = {
    id: instances.reduce((max, row) => Math.max(max, row.id), 0) + 1,
    app: ownDescriptionId,
    collection,
    value_id: value.id,
    creator_id: value.creator_id,
    status: 'running',
    element: start.id,
    wake_at: null,
    error: null,
    groups: {},
    log: [],
    results: {},
    steps: 0,
    graph: structuredClone(graph),
  };

  runInstance(instance);
  instances.push(instance);
  saveInstances(instances);
  announceInstance(instance);
}

type DevFile =PotokUploadedFile & { blob: Blob; collection: string | null; slot: string; response: number | null; sender: number | null };

// ValueSummary: buckets by JSON type, the 50 biggest per key and row.
function summarize(rows: PotokCollectionValue[], under: string[], keys: string[]): PotokSummary['keys'] {
  const result: PotokSummary['keys'] = {};

  keys.forEach((key) => {
    const perRow = new Map<string | null, { answered: Set<number>; counts: Map<string, Set<number>> }>();
    const answered = new Set<number>();
    const add = (row: string | null, bucket: unknown, id: number) => {
      if (!['string', 'number', 'boolean'].includes(typeof bucket) || bucket === '') return;
      const entry = perRow.get(row) ?? { answered: new Set<number>(), counts: new Map<string, Set<number>>() };
      const text = String(bucket);
      entry.counts.set(text, (entry.counts.get(text) ?? new Set<number>()).add(id));
      entry.answered.add(id);
      perRow.set(row, entry);
      answered.add(id);
    };
    const cell = (row: string | null, value: unknown, id: number) =>
      Array.isArray(value) ? value.forEach((item) => add(row, item, id)) : add(row, value, id);

    rows.forEach((row) => {
      const value = (at(row.data, under) as PotokData | undefined)?.[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.entries(value).forEach(([gridRow, gridValue]) => cell(gridRow, gridValue, row.id));
      } else {
        cell(null, value, row.id);
      }
    });

    if (answered.size === 0) return;

    result[key] = {
      answered: answered.size,
      rows: [...perRow.entries()].map(([row, entry]) => {
        const buckets = [...entry.counts.entries()]
          .map(([value, ids]) => ({ value, count: ids.size }))
          .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

        return {
          row,
          answered: entry.answered.size,
          buckets: buckets.slice(0, MAX_BUCKETS),
          other: buckets.slice(MAX_BUCKETS).reduce((sum, bucket) => sum + bucket.count, 0),
        };
      }),
    };
  });

  return result;
}

function scoreStats(rows: PotokCollectionValue[]): PotokSummary['score'] {
  const scores = rows.map((row) => row.managed?.score).filter((score): score is number => typeof score === 'number').sort((a, b) => a - b);
  const items: NonNullable<PotokSummary['score']>['items'] = {};

  rows.forEach((row) =>
    Object.entries(row.managed?.items ?? {}).forEach(([question, item]) => {
      const status = typeof item.points !== 'number' ? 'pending' : item.ok ? 'ok' : 'bad';
      items[question] = { ...items[question], [status]: (items[question]?.[status] ?? 0) + 1 };
    }),
  );

  const median =
    scores.length === 0 ? null : scores.length % 2 ? scores[(scores.length - 1) / 2] : (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2;
  const distribution = [...new Set(scores)].map((score) => ({ score, count: scores.filter((s) => s === score).length }));

  return {
    count: scores.length,
    average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
    median,
    min: scores.length ? scores[0] : null,
    max: scores.length ? scores[scores.length - 1] : null,
    distribution,
    items,
  };
}

const devFiles = new Map<number, DevFile>();

type DevServer = ReturnType<typeof createServer>;

function createServer(el: HTMLElement) {
  const values = loadValues();
  const ownGroup = loadOwnGroup();
  let children = loadChildren();
  loadInstances().forEach(scheduleWake);

  // A tab with another `?app` writes to the same store; its values are taken
  // in before every call, so that neither tab overwrites the other's.
  const syncValues = () => {
    const known = new Set(values.map((row) => row.id));
    values.push(...loadValues().filter((row) => !known.has(row.id)));
  };

  // In potok the group description is the app's HTML.
  let description = el.innerHTML;
  let descriptionFormat: PotokContentFormat = 'html';

  const group = (): PotokGroupDescription => ({
    id: 1,
    description_id: ownDescriptionId,
    name: ownDescriptionId === null ? null : `alt-${ownDescriptionId}`,
    description,
    description_format: descriptionFormat,
  });

  const forbidden: PotokError = {
    ok: false,
    error: 'forbidden',
    message: 'Your roles in this group do not allow that.',
  };

  const invalidGroup: PotokError = { ok: false, error: 'invalid_group', message: 'Could not save the group.' };

  const inRange = (value: unknown, bound: number) => typeof value === 'number' && Math.abs(value) <= bound;

  // Both or neither, numbers in range; both null only where `nulls` (to take a place away).
  const validPlace = (lat: unknown, lng: unknown, nulls: boolean) =>
    (lat === undefined && lng === undefined) ||
    (nulls && lat === null && lng === null) ||
    (inRange(lat, 90) && inRange(lng, 180));

  // A key of the seeded pins (any, while none are seeded), "picture" or null.
  const validPin = (pin: unknown) => {
    if (pin === undefined || pin === null || pin === 'picture') return true;
    const icons = loadMapConfig().pins.icons.map((icon) => icon.key);
    return typeof pin === 'string' && (icons.length === 0 || icons.includes(pin));
  };

  // As in potok: the roles of this group, "everyone" taking every member.
  const validRoleKeys = (keys: PotokRoleKey[] | null | undefined) =>
    keys === undefined ||
    keys === null ||
    (Array.isArray(keys) &&
      keys.every((key) => key === '' || devRoles.some((role) => role.key === key)));

  const roleKeys = (keys: PotokRoleKey[] | null | undefined): PotokRoleKey[] => {
    const picked = [...new Set((keys ?? []).filter((key) => key !== ''))];
    return picked.includes('everyone') ? [] : picked.sort();
  };

  const validAttrs = (attrs: PotokChildAttrs, nulls = true) =>
    (attrs.name === undefined || (attrs.name.trim() !== '' && attrs.name.length <= MAX_GROUP_NAME_LENGTH)) &&
    validRoleKeys(attrs.inheritRoleKeys) &&
    (attrs.picture === undefined || attrs.picture.length <= MAX_PICTURE_LENGTH) &&
    validPlace(attrs.lat, attrs.lng, nulls) &&
    validPin(attrs.pin);

  const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

  const applyAttrs = (child: PotokChild, attrs: PotokChildAttrs): PotokChild => {
    const description = attrs.description ?? child.description ?? '';
    const format = attrs.descriptionFormat ?? child.description_format;
    const inherits = attrs.inheritsMembers ?? child.inherits_members;
    const placed = attrs.lat !== undefined;

    return {
      ...child,
      name: attrs.name ?? child.name,
      description,
      description_format: format,
      description_html: devDescriptionHtml(description, format),
      is_public: attrs.isPublic ?? child.is_public,
      inherits_members: inherits,
      inherit_role_keys: inherits ? roleKeys(attrs.inheritRoleKeys ?? child.inherit_role_keys) : [],
      picture_url: attrs.picture === '' ? devPicture(child.id) : (attrs.picture ?? child.picture_url),
      member_count: inherits ? 1 + DEV_INHERITED_MEMBERS : child.member_count,
      lat: placed ? (attrs.lat === null ? null : round6(attrs.lat as number)) : child.lat,
      lng: placed ? (attrs.lng === null ? null : round6(attrs.lng as number)) : child.lng,
      pin: attrs.pin !== undefined ? attrs.pin : child.pin,
      updated_at: timestamp(),
    };
  };

  // One id space for sub-groups and places, as both are groups in potok.
  const nextId = () =>
    Math.max(
      100,
      children.reduce((max, row) => Math.max(max, row.id), 0),
      loadPlaces().reduce((max, row) => Math.max(max, row.id), 0),
    ) + 1;

  const newChild = (id: number, name: string, key: string | null): PotokChild => {
    const now = timestamp();

    return {
      id,
      name,
      description_html: null,
      app_description: null,
      uses_api: false,
      picture_url: devPicture(id),
      is_public: false,
      inherits_members: false,
      creator_id: devProfile.id,
      inserted_at: now,
      published_at: null,
      last_value_at: null,
      comment_count: 0,
      reactions: [],
      can_react: true,
      description: '',
      description_format: 'markdown',
      can_edit: true,
      inherit_role_keys: [],
      member_count: 1,
      updated_at: now,
      key,
      lat: null,
      lng: null,
      pin: null,
    };
  };

  // A sub-group with a place is one of the map's places, a plain group ("none").
  const placeOfChild = (child: PotokChild): PotokPlace | null =>
    child.lat === null || child.lng === null
      ? null
      : {
          id: child.id,
          name: child.name,
          lat: child.lat,
          lng: child.lng,
          kind: 'none',
          pin: child.pin,
          picture_url: null,
          is_public: child.is_public,
          shape: 'point',
          areas: [],
        };

  const syncPlaces = (changed: PotokChild[]) => {
    const ids = new Set(changed.map((child) => child.id));
    const added = changed.flatMap((child) => placeOfChild(child) ?? []);
    const before = loadPlaces();
    if (added.length === 0 && !before.some((place) => ids.has(place.id))) return;

    savePlaces([...before.filter((place) => !ids.has(place.id)), ...added]);
  };

  // The child, or the failure the server answers with.
  const editableChild = (id: number): PotokChild | PotokError => {
    if (!ownGroup.can_manage_children) return forbidden;

    const child = children.find((row) => row.id === id);
    if (!child) return { ok: false, error: 'not_found' };

    return child.can_edit ? child : forbidden;
  };

  const storeChild = (child: PotokChild) => {
    children = [...children.filter((row) => row.id !== child.id), child];
    saveChildren(children);
    syncPlaces([child]);
    return { ok: true as const, group: child };
  };

  // A key as the server takes it: 1 to 64 characters, no control characters.
  const validKey = (key: unknown) =>
    key === undefined ||
    (typeof key === 'string' && key.length >= 1 && key.length <= MAX_KEY_LENGTH && !/[\u0000-\u001f\u007f]/.test(key));

  return {
    insertValue(params: { data: string; content_format: PotokContentFormat }): { ok: true; value: PotokValue } | PotokError {
      const data = decodeData(params.data);
      if (data === undefined) {
        return { ok: false, error: 'invalid_value', message: 'Could not create value.' };
      }

      syncValues();
      const now = timestamp();
      const row: PotokListedValue = {
        id: values.reduce((max, v) => Math.max(max, v.id), 0) + 1,
        content: 'data:',
        data,
        content_format: params.content_format,
        is_data: true,
        group_id: 1,
        parent_id: null,
        creator_id: devProfile.id,
        creator_username: devProfile.username,
        description_id: ownDescriptionId,
        inserted_at: now,
        updated_at: now,
      };
      values.push(row);
      saveValues(values);

      const value = valuePayload(row);
      // The server broadcasts every new value, also to the viewer who sent it.
      setTimeout(() => deliverNewValue(value));
      return { ok: true, value };
    },

    // What a list or a sum of values outside collections reads: `scope`,
    // `match` and `searchField` / `searchValue`.
    plainRows(options: PotokListOptions | PotokAggregateOptions): { ok: true; rows: PotokListedValue[] } | PotokError {
      if (!viewerMember) {
        return { ok: false, error: 'not_a_member', message: 'You must be a group member to access group data values.' };
      }

      const matched = matchOption(options.match);
      if (!matched.ok) return matched;
      const searchField = options.searchField?.trim();
      const searchValue = options.searchValue?.trim().toLowerCase();

      syncValues();
      // "group": every app's values (in dev the viewer can open them all).
      const rows = values
        // Values in collections never reach the calls that name none.
        .filter((row) => !(row as unknown as { collection?: string }).collection)
        .filter((row) => options.scope === 'group' || ownValue(row))
        .filter((row) => !matched.match || contains(row.data, matched.match))
        .filter((row) => !searchField || !searchValue || dataText(row, searchField).toLowerCase().includes(searchValue));

      return { ok: true, rows };
    },

    listValues(
      options: PotokListOptions,
    ): { ok: true; values: PotokListedValue[]; has_more: boolean; total: number | null } | PotokError {
      const limit = Math.max(1, Math.min(nonNegativeInteger(options.limit) ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT));
      const kept = this.plainRows(options);
      if (!kept.ok) return kept;

      const orderBy = options.orderBy?.trim();
      const { page, more } = pageNextToCursor(kept.rows, (dir) => compareRows(orderBy, dir), options, limit);

      return { ok: true, values: page, has_more: more, total: options.total ? kept.rows.length : null };
    },

    aggregateValues(options: PotokAggregateOptions): ({ ok: true } & PotokAggregate) | PotokError {
      if (options.collection) {
        const config = loadConfig();
        const rule = devRule(config, options.collection);
        if (!fullReader(rule)) {
          return viewerMember
            ? forbidden
            : { ok: false, error: 'not_a_member', message: 'You must be a group member to access group data values.' };
        }

        const matched = matchOption(options.match);
        if (!matched.ok) return matched;

        syncValues();
        const rows = (values as unknown as PotokCollectionValue[])
          .filter((row) => row.collection === options.collection && ownValue(row))
          .filter((row) => !matched.match || contains(row.data, matched.match));

        return aggregate(rows.map((row) => row.data), options, rule.under ?? []);
      }

      const kept = this.plainRows(options);
      if (!kept.ok) return kept;
      return aggregate(kept.rows.map((row) => row.data), options, []);
    },

    updateDescription(params: {
      description: string;
      description_format: PotokContentFormat | null;
    }): { ok: true; group: PotokGroupDescription } {
      description = params.description;
      descriptionFormat = params.description_format ?? descriptionFormat;
      console.info('[potok-dev] Description updated; in potok the app restarts with the new HTML.');

      return { ok: true, group: group() };
    },

    getDescription(): { ok: true; group: PotokGroupDescription } {
      return { ok: true, group: group() };
    },

    // A guest (`?viewer=guest`) has no profile.
    currentProfile(): { ok: true; profile: PotokProfile | null } {
      return { ok: true, profile: viewerId === null ? null : devProfile };
    },

    listSubgroups(
      name: string,
      options: PotokSubgroupListOptions,
    ): PotokSubgroupPage | PotokError {
      const groups = loadSubgroups()[name];
      if (!groups) return { ok: false, error: 'not_found' };

      const limit = Math.min(nonNegativeInteger(options.limit) ?? DEFAULT_SUBGROUP_LIMIT, MAX_SUBGROUP_LIMIT);
      const beforeId = nonNegativeInteger(options.beforeId);
      const period = inPeriod(options);
      if (typeof period !== 'function') return period;

      const inOrder = groups.filter(period).sort((a, b) => b.id - a.id);
      const around = aroundPage(inOrder, nonNegativeInteger(options.aroundId), limit);
      if (around) return around;

      const rows = inOrder.filter((group) => beforeId === undefined || group.id < beforeId).slice(0, limit + 1);

      return {
        ok: true,
        groups: rows.slice(0, limit).map(asSeenByViewer),
        has_more: rows.length > limit,
        has_newer: false,
      };
    },

    openGroup(id: number, tab: PotokGroupTab | undefined): { ok: true } | PotokError {
      const known =
        (id === ownGroup.id && (tab === 'settings' || tab === 'templates')) ||
        id === ownGroup.parent?.id ||
        children.some((group) => group.id === id) ||
        Object.values(loadSubgroups()).some((groups) => groups.some((group) => group.id === id));
      if (!known) return { ok: false, error: 'not_found' };

      const path =
        tab === 'description'
          ? 'group_home'
          : tab === 'settings'
            ? 'edit_group'
            : tab === 'templates'
              ? 'edit_group?section=templates'
              : 'values';
      console.info(`[potok-dev] openGroup: in potok the viewer goes to /groups/${id}/${path} and the app ends.`);
      return { ok: true };
    },

    openMap(lat: unknown, lng: unknown, label: unknown): { ok: true } | PotokError {
      if (devViewer === 'guest') return forbidden;
      const inRange = (n: unknown, bound: number) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= bound;
      if (!inRange(lat, 90) || !inRange(lng, 180)) return { ok: false, error: 'invalid_place' };

      const query = new URLSearchParams({ point: `${(lat as number).toFixed(6)},${(lng as number).toFixed(6)}`, group: String(ownGroup.id) });
      if (typeof label === 'string' && label.trim() !== '') query.set('label', label.trim().slice(0, 80));
      console.info(`[potok-dev] openMap: in potok the viewer goes to /groups/<root>/map?${query} and the app ends.`);
      return { ok: true };
    },

    toggleGroupReaction(id: number, emoji: string): { ok: true; reactions: PotokReaction[] } | PotokError {
      const subgroups = loadSubgroups();
      const group = Object.values(subgroups)
        .flat()
        .find((row) => row.id === id);
      if (!group) return { ok: false, error: 'not_found' };
      if (!group.can_react) return forbidden;

      const own = group.reactions.find((reaction) => reaction.emoji === emoji);

      if (!own) group.reactions.push({ emoji, count: 1, mine: true });
      else if (!own.mine) Object.assign(own, { count: own.count + 1, mine: true });
      else if (own.count > 1) Object.assign(own, { count: own.count - 1, mine: false });
      else group.reactions.splice(group.reactions.indexOf(own), 1);

      saveSubgroups(subgroups);
      return { ok: true, reactions: group.reactions };
    },

    pickEmoji(): { ok: true; emoji: string } | PotokError {
      const emoji = window.prompt('[potok-dev] pickEmoji: in potok this is its emoji picker.', '🎉');
      return emoji ? { ok: true, emoji } : { ok: false, error: 'cancelled' };
    },

    shareGroup(id: number, inApp: boolean | undefined): { ok: true } | PotokError {
      const known = Object.values(loadSubgroups()).some((groups) => groups.some((group) => group.id === id));
      if (!known) return { ok: false, error: 'not_found' };

      const link = inApp ? `/groups/${ownGroup.id}/group_home?at=${id}` : `/groups/${id}`;
      console.info(`[potok-dev] shareGroup: in potok the page offers to share ${link}.`);
      return { ok: true };
    },

    linkGroup(id: number): { ok: true } | PotokError {
      if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, error: 'invalid_group' };

      const url = new URL(location.href);
      url.searchParams.set(LINK_PARAM, String(id));
      history.replaceState(history.state, '', url);
      return { ok: true };
    },

    getLinkedGroup(): { ok: true; group_id: number | null } {
      return { ok: true, group_id: Number(new URLSearchParams(location.search).get(LINK_PARAM)) || null };
    },

    personal(method: 'list' | 'get' | 'set' | 'delete', key?: unknown, value?: unknown) {
      const store = loadPersonal();
      const mine = `${devViewer}:${ownDescriptionId ?? ''}`;
      const items = store[mine] ?? {};

      if (method === 'list') {
        const list = Object.keys(items)
          .sort()
          .map((name) => ({ key: name, value: items[name].value, updated_at: items[name].updated_at }));
        return { ok: true as const, items: list };
      }

      if (typeof key !== 'string' || !PERSONAL_KEY.test(key)) return { ok: false as const, error: 'invalid_key' as const };
      if (method === 'get') return { ok: true as const, value: items[key]?.value ?? null };

      if (method === 'delete') {
        delete items[key];
      } else {
        const json = JSON.stringify(value ?? null);
        if (new TextEncoder().encode(json).length > PERSONAL_MAX_BYTES) return { ok: false as const, error: 'too_big' as const };
        if (!(key in items) && Object.keys(items).length >= PERSONAL_MAX_KEYS) {
          return { ok: false as const, error: 'too_many_keys' as const };
        }
        items[key] = { value: JSON.parse(json), updated_at: new Date().toISOString() };
      }

      store[mine] = items;
      localStorage.setItem(PERSONAL_STORAGE_KEY, JSON.stringify(store));
      return { ok: true as const };
    },

    openLogin(): { ok: true } | PotokError {
      if (viewerId !== null) return { ok: false, error: 'unavailable' };

      console.info("[potok-dev] openLogin: in potok the page goes to Potok's log-in and comes back here.");
      return { ok: true };
    },

    // A guest sees the group and nothing it may do there.
    getGroup(): { ok: true; group: PotokOwnGroup } {
      if (viewerId !== null) return { ok: true, group: ownGroup };

      return {
        ok: true,
        group: {
          ...ownGroup,
          can_manage_children: false,
          can_create_children: false,
          can_start_polls: false,
          signed_in: false,
        },
      };
    },

    listChildren(options: PotokSubgroupListOptions): PotokSubgroupPage | PotokError {
      if (!ownGroup.can_manage_children) return forbidden;

      const limit = Math.min(nonNegativeInteger(options.limit) ?? DEFAULT_SUBGROUP_LIMIT, MAX_SUBGROUP_LIMIT);
      const beforeId = nonNegativeInteger(options.beforeId);
      const period = inPeriod(options);
      if (typeof period !== 'function') return period;
      const before = children.find((group) => group.id === beforeId);

      const inOrder = [...children].sort(compareFeedOrder).filter(period);
      const around = aroundPage(inOrder, nonNegativeInteger(options.aroundId), limit);
      if (around) return around;

      const rows = inOrder
        .filter((group) => {
          if (beforeId === undefined) return true;
          return before ? compareFeedOrder(before, group) < 0 : group.id < beforeId;
        })
        .slice(0, limit + 1);

      return { ok: true, groups: rows.slice(0, limit), has_more: rows.length > limit, has_newer: false };
    },

    getChild(id: number): { ok: true; group: PotokChild } | PotokError {
      if (!ownGroup.can_manage_children) return forbidden;

      const child = children.find((row) => row.id === id);
      if (!child) return { ok: false, error: 'not_found' };

      return { ok: true, group: child.can_edit ? child : { ...child, description: null } };
    },

    createChild(attrs: PotokChildAttrs & { name: string }): { ok: true; group: PotokChild } | PotokError {
      if (!ownGroup.can_create_children) return forbidden;
      if (!validAttrs(attrs, false)) return invalidGroup;

      return storeChild(applyAttrs(newChild(nextId(), attrs.name, null), attrs));
    },

    // All or none, as the server: a bad child answers with its index.
    createChildren(list: PotokNewChild[]): { ok: true; groups: PotokCreatedChild[] } | PotokError {
      if (!ownGroup.can_manage_children || !ownGroup.can_create_children) return forbidden;
      if (!Array.isArray(list) || list.length === 0 || list.length > MAX_CHILDREN_PER_CALL) {
        return { ok: false, error: 'too_large', message: `From 1 to ${MAX_CHILDREN_PER_CALL} groups at a time.` };
      }

      const seen = new Set<string>();
      for (const [index, attrs] of list.entries()) {
        const valid =
          attrs &&
          typeof attrs === 'object' &&
          typeof attrs.name === 'string' &&
          (attrs as PotokChildAttrs).picture === undefined &&
          validAttrs(attrs, false) &&
          validKey(attrs.key) &&
          (attrs.key === undefined || !seen.has(attrs.key));

        if (!valid) return { ...invalidGroup, index };
        if (attrs.key !== undefined) seen.add(attrs.key);
      }

      const byKey = new Map(children.flatMap((child) => (child.key === null ? [] : [[child.key, child] as const])));
      let id = nextId();
      const made: PotokChild[] = [];

      const groups = list.map((attrs) => {
        const existing = attrs.key === undefined ? undefined : byKey.get(attrs.key);
        if (existing) return { id: existing.id, key: existing.key, created: false };

        const { key, ...rest } = attrs;
        const child = applyAttrs(newChild(id++, attrs.name, key ?? null), rest);
        made.push(child);
        return { id: child.id, key: child.key, created: true };
      });

      if (made.length > 0) {
        children = [...children, ...made];
        saveChildren(children);
        syncPlaces(made);
        setTimeout(() => subgroupListeners.forEach((listener) => listener()));
      }

      return { ok: true, groups };
    },

    updateChild(id: number, attrs: PotokChildAttrs): { ok: true; group: PotokChild } | PotokError {
      const child = editableChild(id);
      if ('ok' in child) return child;
      if (!validAttrs(attrs)) return invalidGroup;

      const updated = applyAttrs(child, attrs);
      const opened = closed(child) && !closed(updated);

      return storeChild({ ...updated, published_at: opened ? timestamp() : updated.published_at });
    },

    withdrawChild(id: number): { ok: true; group: PotokChild } | PotokError {
      const child = editableChild(id);
      if ('ok' in child) return child;

      return storeChild({
        ...child,
        is_public: false,
        inherits_members: false,
        inherit_role_keys: [],
        published_at: null,
        member_count: 1,
        updated_at: timestamp(),
      });
    },

    previewDescription(
      description: string,
      format: PotokContentFormat | null,
    ): { ok: true; html: string | null } | PotokError {
      if (!ownGroup.can_manage_children) return forbidden;

      return { ok: true, html: devDescriptionHtml(description, format ?? 'markdown') };
    },

    listTemplates(): { ok: true; templates: PotokTemplate[] } | PotokError {
      if (!ownGroup.can_manage_children) return forbidden;

      return {
        ok: true,
        templates: loadTemplates().map((template) => ({
          ...template,
          thumbnail: devTemplateHtml(template, devTemplateSample(template)),
        })),
      };
    },

    renderTemplate(id: string, fields: Record<string, string | string[]>): PotokRenderedTemplate | PotokError {
      if (!ownGroup.can_manage_children) return forbidden;

      const template = loadTemplates().find((row) => row.id === id);
      if (!template) return { ok: false, error: 'not_found', message: 'This group has no such template.' };

      const keys = new Set(template.fields.flatMap(({ key, captions }) => (captions ? [key, captions] : [key])));
      const kept = Object.fromEntries(Object.entries(fields ?? {}).filter(([key]) => keys.has(key)));
      const html = devTemplateHtml(template, kept);
      const marker = JSON.stringify({ v: 1, template: id, rev: template.rev, fields: kept, hash: devHash(html) })
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/--/g, '-\\u002d');

      const required = template.fields.find(({ kind, required }) => kind === 'text' && required);
      const named = required && typeof kept[required.key] === 'string' ? (kept[required.key] as string).trim() : '';

      return {
        ok: true,
        description: `<!--potok-post ${marker}-->\n${html}`,
        name: named.slice(0, 120) || template.name,
        html,
        missing: template.fields
          .filter(({ required: needed, key }) => {
            if (!needed) return false;
            const value = kept[key];
            return Array.isArray(value) ? value.every((item) => item.trim() === '') : !value?.trim();
          })
          .map(({ label }) => label),
        rev: template.rev,
      };
    },

    listPolls(options: PotokPollListOptions): { ok: true; polls: PotokPoll[]; has_more: boolean } {
      const status = options.status ?? 'open';

      const rows = loadPolls()
        .filter((poll) => (status === 'closed' ? !poll.open : poll.open))
        .filter((poll) => status !== 'waiting' || (poll.can_vote && !poll.voted))
        .filter((poll) => options.beforeId === undefined || poll.id < options.beforeId)
        .sort((a, b) => b.id - a.id);

      return {
        ok: true,
        polls: rows.slice(0, POLL_PAGE_SIZE),
        has_more: rows.length > POLL_PAGE_SIZE,
      };
    },

    getPoll(id: number): { ok: true; poll: PotokPoll } | PotokError {
      const poll = loadPolls().find((row) => row.id === id);

      return poll ? { ok: true, poll } : { ok: false, error: 'not_found' };
    },

    openPoll(id: number): { ok: true } | PotokError {
      const polls = loadPolls();
      const poll = polls.find((row) => row.id === id);
      if (!poll) return { ok: false, error: 'not_found' };

      if (poll.can_vote && !poll.voted) {
        poll.voted = true;
        poll.voters_count += 1;
        poll.can_see_results = !poll.secret;
        poll.options[0].mine = !poll.secret;
        poll.options.forEach((option, index) => {
          option.votes_count = poll.secret ? null : (option.votes_count ?? 0) + (index === 0 ? 1 : 0);
        });
        savePolls(polls);
        setTimeout(() => pollListeners.forEach((listener) => listener(id)));
      }

      return { ok: true };
    },

    openPollForm(): { ok: true } | PotokError {
      if (!ownGroup.can_start_polls) return forbidden;

      const polls = loadPolls();
      const id = polls.reduce((max, poll) => Math.max(max, poll.id), 0) + 1;

      polls.push({
        id,
        question: `Dev question ${id}`,
        description: '',
        kind: 'single',
        max_choices: null,
        closes_at: null,
        closed_at: null,
        open: true,
        secret: false,
        public: false,
        can_vote: true,
        voted: false,
        can_see_results: false,
        can_see_details: true,
        can_manage: true,
        voters_count: 0,
        outcome: null,
        winner_option_id: null,
        options: [
          { id: id * 100 + 1, text: 'Yes', votes_count: null, mine: false },
          { id: id * 100 + 2, text: 'No', votes_count: null, mine: false },
        ],
      });
      savePolls(polls);
      setTimeout(() => pollListeners.forEach((listener) => listener(id)));

      return { ok: true };
    },

    // --- Maps ---

    mapConfig(): { ok: true } & PotokMapConfig {
      return { ok: true, ...loadMapConfig() };
    },

    listPlaces(view?: PotokPlacesQuery): { ok: true; places: PotokPlace[]; truncated: boolean } | PotokPlacesAll | PotokPlacesView | PotokError {
      const places = loadPlaces();
      if (view === undefined) return { ok: true, places: places.slice(0, MAX_PLACES), truncated: places.length > MAX_PLACES };

      const validView =
        Array.isArray(view.bbox) &&
        view.bbox.length === 4 &&
        view.bbox.every((edge) => typeof edge === 'number') &&
        Number.isInteger(view.zoom) &&
        view.zoom >= 0 &&
        view.zoom <= 24;

      if (!validView) return { ok: false, error: 'invalid_place' };
      if (places.length <= MAX_PLACES) return { ok: true, mode: 'all', places, truncated: false };

      const config = loadMapConfig();
      const kept = places.filter(placesFilter(config, view.search, view.pins));
      return {
        ok: true,
        mode: 'view',
        ...gatherPlaces(kept, view, config),
        ...(view.extent ? { extent: placesExtent(kept) } : {}),
        ...(view.counts ? { pins: pinCounts(places, config) } : {}),
      };
    },

    listPlacesAt(
      bounds: PotokBounds,
      options: { search?: string; pins?: string[] },
    ): { ok: true; places: PotokPlace[]; has_more: boolean } | PotokError {
      const valid = Array.isArray(bounds) && bounds.flat().length === 4 && bounds.flat().every((edge) => typeof edge === 'number');
      if (!valid) return { ok: false, error: 'invalid_place' };

      const [[south, west], [north, east]] = bounds;
      const rows = loadPlaces()
        .filter(placesFilter(loadMapConfig(), options.search, options.pins))
        .filter((place) => place.lat >= south && place.lat <= north && place.lng >= west && place.lng <= east)
        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id - b.id);

      return { ok: true, places: rows.slice(0, MAX_SPOT), has_more: rows.length > MAX_SPOT };
    },

    // The borders and lines as seeded, whatever the zoom.
    placeShapes(ids: number[], zoom: number): { ok: true; level: number; shapes: PotokPlaceShape[] } | PotokError {
      if (!Array.isArray(ids) || typeof zoom !== 'number') return { ok: false, error: 'invalid_place' };

      const level = SHAPE_LEVELS.find((candidate) => candidate >= zoom) ?? 16;
      const stored = loadPlaceShapes();
      const places = new Map(loadPlaces().map((place) => [place.id, place]));
      const shapes = ids.slice(0, 100).flatMap((id) => {
        const place = places.get(id);
        const geojson = stored[String(id)];
        return (place?.shape === 'area' || place?.shape === 'route') && geojson
          ? [{ id, v: place.v ?? 0, geojson }]
          : [];
      });

      return { ok: true, level, shapes };
    },

    createPlace(attrs: PotokPlaceAttrs): { ok: true; place: PotokPlace } | PotokError {
      const config = loadMapConfig();
      if (!config.can_create_places) return forbidden;

      const name = typeof attrs.name === 'string' ? attrs.name.trim() : '';
      const kinds = config.place_kinds.map((kind) => kind.key);
      const valid =
        name !== '' &&
        (kinds.length === 0 || kinds.includes(attrs.kind)) &&
        typeof attrs.lat === 'number' &&
        Math.abs(attrs.lat) <= 90 &&
        typeof attrs.lng === 'number' &&
        Math.abs(attrs.lng) <= 180;

      if (!valid) return { ok: false, error: 'invalid_place', message: 'Could not save the group.' };

      const places = loadPlaces();
      const place: PotokPlace = {
        id: Math.max(
          places.reduce((max, row) => Math.max(max, row.id), 0),
          children.reduce((max, row) => Math.max(max, row.id), 0),
        ) + 1,
        name,
        lat: attrs.lat,
        lng: attrs.lng,
        kind: attrs.kind,
        pin: attrs.pin ?? null,
        picture_url: null,
        is_public: attrs.isPublic ?? false,
        shape: 'point',
        areas: [],
      };

      savePlaces([...places, place]);
      setTimeout(() => subgroupListeners.forEach((listener) => listener()));

      return { ok: true, place };
    },

    showGroup(id: number): { ok: true } | PotokError {
      const place = loadPlaces().find((row) => row.id === id);
      if (!place) return { ok: false, error: 'not_found' };

      setTimeout(() => {
        window.alert(`[potok-dev] showGroup: in potok the page opens the description of "${place.name}" over the app.`);
        sheetListeners.forEach((listener) => listener(id));
      });

      return { ok: true };
    },

    // --- Collections ---

    getConfig(): PotokConfigReply | PotokError {
      const config = loadConfig();
      const rules = config?.data.rules ?? {};
      const anyPublic = Object.keys(rules).some((name) => rulePublic(devRule(config, name), ownGroup));

      if (!viewerMember && !anyPublic) {
        return { ok: false, error: 'not_a_member', message: 'You must be a group member to access group data values.' };
      }

      syncValues();
      const caps: Record<string, PotokCaps> = {};

      Object.keys(rules).forEach((name) => {
        const rule = devRule(config, name);
        const block = writeBlock(rule, ownGroup);

        caps[name] = {
          ruled: true,
          write: block === null,
          write_block: block,
          read: fullReader(rule) ? 'all' : 'own',
          summary: summaryReader(rule, ownGroup),
          edit_own: rule.edit_own && ruleOpen(rule) && !released(rule),
          manage: viewerManages,
          open: ruleOpen(rule),
          once: rule.once,
          anonymous: rule.anonymous,
          public: rulePublic(rule, ownGroup),
          released: released(rule),
          written: (values as unknown as PotokCollectionValue[]).some(
            (row) => row.collection === name && ownValue(row) && row.creator_id === viewerId,
          ),
          notify: loadNotify().includes(`${viewerId}:${name}`),
        };
      });

      const files = config?.data.files ?? {};

      return {
        ok: true,
        config:
          config && !viewerManages
            ? { ...config, data: Object.fromEntries(Object.entries(config.data).filter(([key]) => key !== 'secret')) }
            : config,
        caps,
        // The process profile holds what it needs here, and its owner edits the app.
        process_warnings: {},
        manage: viewerManages,
        can_create_groups: viewerManages,
        files: viewerManages
          ? { public: files.public ? 'ok' : 'missing', private: files.private ? 'ok' : 'missing' }
          : null,
        visible_role_keys: [],
        viewer: {
          signed_in: viewerId !== null,
          member: viewerMember,
          profile_id: viewerId,
          username: viewerId === null ? null : `dev-${devViewer}`,
        },
      };
    },

    saveConfig(
      data: PotokConfigData,
      revision: number | null,
    ): { ok: true; config: PotokConfig; process_warnings: Record<string, PotokProcessWarning> } | PotokError {
      if (!viewerManages) return forbidden;
      if (byteSize(data) > MAX_CONFIG_BYTES) return { ok: false, error: 'too_large', message: 'That is too much to save.' };

      const current = loadConfig();
      if ((current?.revision ?? 0) !== (revision ?? -1) && !(current === null && (revision ?? 0) === 0)) {
        return { ok: false, error: 'conflict', current };
      }

      const invalid = processesProblem(data.rules);
      if (invalid) return invalid;

      const config: PotokConfig = {
        id: current?.id ?? 900_000 + (ownDescriptionId ?? 0),
        revision: current ? current.revision + 1 : 0,
        data: { ...data, files: current?.data.files ?? {} },
        updated_at: timestamp(),
      };

      saveConfigData(config);
      setTimeout(() => deliverChange({ event: 'config', collection: 'config', id: config.id, revision: config.revision }));

      // A rule that lost its process cancels the instances that run or wait.
      const instances = loadInstances();
      const stopped = instances.filter(
        (instance) =>
          instance.app === ownDescriptionId &&
          (instance.status === 'running' || instance.status === 'waiting') &&
          !data.rules?.[instance.collection]?.process,
      );

      stopped.forEach((instance) => {
        instance.status = 'cancelled';
        instance.wake_at = null;
      });

      if (stopped.length > 0) {
        saveInstances(instances);
        stopped.forEach(announceInstance);
      }

      return { ok: true, config, process_warnings: {} };
    },

    insertCollectionValue(collection: string, data: string): { ok: true; value: PotokCollectionValue } | PotokError {
      if (RESERVED_COLLECTIONS.includes(collection) || !/^[a-z][a-z0-9_-]{0,39}$/.test(collection)) {
        return { ok: false, error: 'invalid_collection' };
      }

      const decoded = decodeData(data);
      if (!decoded) return { ok: false, error: 'invalid_value', message: 'Could not save the data value.' };
      if (byteSize(decoded) > MAX_VALUE_BYTES) return { ok: false, error: 'too_large', message: 'That is too much to save.' };

      const config = loadConfig();
      const rule = devRule(config, collection);
      const block = writeBlock(rule, ownGroup);

      if (block === 'closed') return { ok: false, error: 'closed', message: 'This no longer takes answers.' };
      if (block === 'members_only') return { ok: false, error: 'not_a_member', message: 'You must be a group member to access group data values.' };
      if (block) return forbidden;

      syncValues();

      const rows = values as unknown as PotokCollectionValue[];

      if (rule.once && rows.some((row) => row.collection === collection && ownValue(row) && row.creator_id === viewerId)) {
        return { ok: false, error: 'already_answered', message: 'You have already answered.' };
      }

      const now = timestamp();
      const key = config?.data.secret?.score?.[collection] ?? {};
      const row = {
        id: values.reduce((max, v) => Math.max(max, v.id), 0) + 1,
        content: 'data:',
        data: decoded,
        content_format: 'markdown' as PotokContentFormat,
        is_data: true,
        group_id: 1,
        parent_id: null,
        creator_id: viewerId ?? 0,
        creator_username: `dev-${devViewer}`,
        description_id: ownDescriptionId,
        collection,
        anonymous: rule.anonymous,
        revision: 0,
        managed: rule.score && rule.under ? scoreAnswers(at(decoded, rule.under), key, null) : null,
        inserted_at: now,
        updated_at: now,
      };

      values.push(row as unknown as PotokListedValue);
      saveValues(values);
      this.claimFiles(rule, decoded, row.id);

      const value = this.present(row as PotokCollectionValue, rule, key);
      setTimeout(() => deliverChange({ event: 'created', collection, value }));
      startProcess(collection, rule, row);
      return { ok: true, value };
    },

    present(row: PotokCollectionValue, rule: DevRule, key: Record<string, PotokScoreCheck>): PotokCollectionValue {
      const own = row.creator_id === viewerId;
      const author = row.anonymous && !own ? { creator_id: null, creator_username: null } : {};
      const managed = !row.managed
        ? null
        : fullReader(rule)
          ? row.managed
          : own && released(rule)
            ? authorView(row.managed, rule, key)
            : null;

      return { ...row, ...author, managed };
    },

    listCollection(
      options: PotokCollectionListOptions,
    ): { ok: true; values: PotokCollectionValue[]; has_more: boolean; total: number | null } | PotokError {
      const config = loadConfig();
      const rule = devRule(config, options.collection);
      const full = fullReader(rule);

      if (viewerId === null) return forbidden;
      if (!full && !viewerMember && !rulePublic(rule, ownGroup)) {
        return { ok: false, error: 'not_a_member', message: 'You must be a group member to access group data values.' };
      }

      const matched = matchOption(options.match);
      if (!matched.ok) return matched;

      syncValues();
      const limit = Math.max(1, Math.min(nonNegativeInteger(options.limit) ?? DEFAULT_LIST_LIMIT, MAX_COLLECTION_LIMIT));
      const key = config?.data.secret?.score?.[options.collection] ?? {};

      const kept = (values as unknown as PotokCollectionValue[])
        .filter((row) => row.collection === options.collection && ownValue(row))
        .filter((row) => !(options.mine || !full) || row.creator_id === viewerId)
        .filter((row) => !full || !matched.match || contains(row.data, matched.match));

      const byId = (dir: 'asc' | 'desc') => (a: PotokCollectionValue, b: PotokCollectionValue) =>
        dir === 'desc' ? b.id - a.id : a.id - b.id;
      const { page, more } = pageNextToCursor(kept, byId, options, limit);

      return {
        ok: true,
        values: page.map((row) => this.present(row, rule, key)),
        has_more: more,
        total: options.total ? kept.length : null,
      };
    },

    updateCollectionValue(id: number, data: string, revision: number | null): { ok: true; value: PotokCollectionValue } | PotokError {
      syncValues();
      const row = (values as unknown as PotokCollectionValue[]).find(
        (value) => value.id === id && value.collection && !RESERVED_COLLECTIONS.includes(value.collection) && ownValue(value),
      );
      if (!row) return { ok: false, error: 'not_found' };

      const config = loadConfig();
      const rule = devRule(config, row.collection);
      const decoded = decodeData(data);

      if (row.creator_id !== viewerId || !rule.edit_own) return forbidden;
      if (!ruleOpen(rule)) return { ok: false, error: 'closed', message: 'This no longer takes answers.' };
      if (released(rule)) return { ok: false, error: 'released', message: 'The scores are out, so the answer can no longer change.' };
      if (revision !== null && revision !== row.revision) return { ok: false, error: 'conflict', current: row };
      if (!decoded) return { ok: false, error: 'invalid_value', message: 'Could not save the data value.' };

      const key = config?.data.secret?.score?.[row.collection] ?? {};
      Object.assign(row, {
        data: decoded,
        revision: row.revision + 1,
        updated_at: timestamp(),
        managed: rule.score && rule.under ? scoreAnswers(at(decoded, rule.under), key, row.managed) : row.managed,
      });
      saveValues(values);
      this.claimFiles(rule, decoded, row.id);

      const value = this.present(row, rule, key);
      setTimeout(() => deliverChange({ event: 'updated', collection: row.collection, value }));
      return { ok: true, value };
    },

    deleteCollectionValue(id: number): { ok: true; id: number } | PotokError {
      if (!viewerManages) return forbidden;

      syncValues();
      const index = values.findIndex(
        (row) => row.id === id && (row as unknown as PotokCollectionValue).collection && ownValue(row),
      );
      if (index < 0) return { ok: false, error: 'not_found' };

      const [row] = values.splice(index, 1) as unknown as PotokCollectionValue[];
      saveValues(values);
      setTimeout(() => deliverChange({ event: 'deleted', collection: row.collection, id }));
      return { ok: true, id };
    },

    deleteCollection(collection: string): { ok: true; count: number } | PotokError {
      if (!viewerManages) return forbidden;

      syncValues();
      const before = values.length;
      const left = values.filter(
        (row) => !((row as unknown as PotokCollectionValue).collection === collection && ownValue(row)),
      );
      values.splice(0, values.length, ...left);
      saveValues(values);
      setTimeout(() => deliverChange({ event: 'cleared', collection }));
      return { ok: true, count: before - left.length };
    },

    summarizeCollection(
      collection: string,
      options: { under?: string[] | null; keys?: string[]; score?: boolean },
    ): { ok: true; summary: PotokSummary } | PotokError {
      const config = loadConfig();
      const rule = devRule(config, collection);
      if (!summaryReader(rule, ownGroup)) return forbidden;

      const under = options.under ?? rule.under;
      if (!under) return { ok: false, error: 'invalid_summary' };

      syncValues();
      const rows = (values as unknown as PotokCollectionValue[]).filter((row) => row.collection === collection && ownValue(row));

      return {
        ok: true,
        summary: {
          total: rows.length,
          keys: summarize(rows, under, options.keys ?? []),
          score: options.score && fullReader(rule) ? scoreStats(rows) : null,
        },
      };
    },

    gradeCollectionValue(
      id: number,
      items: Record<string, { points?: number | null; feedback?: string }>,
    ): { ok: true; value: PotokCollectionValue } | PotokError {
      if (!viewerManages) return forbidden;

      syncValues();
      const row = (values as unknown as PotokCollectionValue[]).find((value) => value.id === id && ownValue(value));
      if (!row) return { ok: false, error: 'not_found' };

      const config = loadConfig();
      const rule = devRule(config, row.collection);
      const key = config?.data.secret?.score?.[row.collection] ?? {};
      if (!rule.score || !rule.under) return { ok: false, error: 'not_scored' };

      const managed = scoreAnswers(at(row.data, rule.under), key, row.managed);

      Object.entries(items).forEach(([question, grade]) => {
        const check = key[question];
        const item = managed.items[question];
        if (!check || !item) return;

        if (typeof grade.feedback === 'string') item.feedback = grade.feedback.trim() || undefined;
        if (typeof grade.points === 'number') {
          const points = Math.max(0, Math.min(Math.trunc(grade.points), itemMax(check)));
          Object.assign(item, { points, ok: points >= itemMax(check), graded: true });
        } else if (grade.points === null) {
          delete item.graded;
          Object.assign(item, checkAnswer(at(row.data, [...rule.under!, question]), check));
        }
      });

      const regraded = scoreAnswers(at(row.data, rule.under), key, managed);
      row.managed = regraded;
      saveValues(values);

      const value = this.present(row, rule, key);
      setTimeout(() => deliverChange({ event: 'updated', collection: row.collection, value }));
      return { ok: true, value };
    },

    listRoles(): { ok: true; roles: PotokRole[] } | PotokError {
      return viewerMember ? { ok: true, roles: devRoles } : { ok: false, error: 'not_a_member' };
    },

    setNotifications(collection: string, on: boolean): { ok: true; on: boolean } | PotokError {
      if (!fullReader(devRule(loadConfig(), collection))) return forbidden;

      const entry = `${viewerId}:${collection}`;
      const subscribed = loadNotify().filter((item) => item !== entry);
      localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(on ? [...subscribed, entry] : subscribed));
      console.info(`[potok-dev] setNotifications: in potok each new value of ${collection} pushes to this viewer.`);
      return { ok: true, on };
    },

    ensureFileGroups(): { ok: true; files: { public?: number; private?: number } } | PotokError {
      if (!viewerManages) return forbidden;

      const config = loadConfig();
      if (!config) return { ok: false, error: 'no_config' };

      const files = { public: config.data.files?.public ?? 801, private: config.data.files?.private ?? 802 };
      saveConfigData({ ...config, data: { ...config.data, files } });
      return { ok: true, files };
    },

    async sendFile(
      file: File | Blob,
      collection: string | null,
      slot: string,
      onProgress?: (percent: number) => void,
    ): Promise<{ ok: true; file: PotokUploadedFile } | PotokError> {
      const config = loadConfig();
      const name = file instanceof File ? file.name : 'file';

      if (collection === null) {
        if (!viewerManages) return forbidden;
        if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) return { ok: false, error: 'invalid_files' };
      } else {
        const rule = devRule(config, collection);
        const spec = rule.uploads[slot];
        if (writeBlock(rule, ownGroup)) return forbidden;
        if (!spec || file.size > (spec.max_bytes ?? 10 * 1024 * 1024)) {
          return { ok: false, error: 'invalid_files', message: 'A file is missing or does not fit.' };
        }
      }

      if (!config?.data.files?.[collection === null ? 'public' : (config.data.rules?.[collection]?.uploads?.[slot]?.target ?? 'private')]) {
        return { ok: false, error: 'files_missing', message: 'The group that keeps the files is gone.' };
      }

      [25, 60, 100].forEach((percent, index) => setTimeout(() => onProgress?.(percent), 80 * (index + 1)));
      await new Promise((resolve) => setTimeout(resolve, 300));

      const id = Math.max(700_000, ...devFiles.keys()) + 1;
      const url =
        collection === null
          ? await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.readAsDataURL(file);
            })
          : undefined;

      const sent: DevFile = { file: id, name, size: file.size, type: file.type, blob: file, collection, slot, response: null, sender: viewerId };
      devFiles.set(id, sent);

      return { ok: true, file: { file: id, name, size: file.size, type: file.type, ...(url ? { url } : {}) } };
    },

    claimFiles(rule: DevRule, data: PotokData, responseId: number) {
      Object.keys(rule.uploads).forEach((slot) => {
        const refs = at(data, [...(rule.under ?? []), slot]);
        if (!Array.isArray(refs)) return;

        refs.forEach((ref: { file?: number }) => {
          const sent = typeof ref?.file === 'number' ? devFiles.get(ref.file) : undefined;
          if (sent && sent.sender === viewerId && (sent.response === null || sent.response === responseId)) {
            sent.response = responseId;
          }
        });
      });
    },

    fileUrl(id: number): { ok: true; url: string; name: string; type: string; size: number } | PotokError {
      const sent = devFiles.get(id);
      if (!sent) return { ok: false, error: 'not_found' };

      return { ok: true, url: URL.createObjectURL(sent.blob), name: sent.name, type: sent.type, size: sent.size };
    },

    // --- Processes (see "Processes of the app's collections" above) ---

    listProcesses(collection: unknown, ids: unknown): { ok: true; processes: PotokProcess[] } | PotokError {
      if (viewerId === null) return forbidden;
      if (typeof collection !== 'string') return { ok: false, error: 'invalid_collection' };

      wakeDueInstances();
      const all = fullReader(devRule(loadConfig(), collection));
      const kept = Array.isArray(ids) ? ids.filter(Number.isInteger).slice(0, MAX_PROCESS_LIST) : null;

      const processes = loadInstances()
        .filter(
          (instance) =>
            instance.app === ownDescriptionId &&
            instance.collection === collection &&
            (all || instance.creator_id === viewerId) &&
            (!kept || kept.includes(instance.value_id)),
        )
        .sort((a, b) => b.id - a.id)
        .slice(0, MAX_PROCESS_LIST)
        .map(presentInstance);

      return { ok: true, processes };
    },

    // Engine.complete_task/5, with the refusals in its order.
    completeProcessTask(
      id: number,
      element: unknown,
      outcome: unknown,
      comment: unknown,
    ): { ok: true; process: PotokProcess } | PotokError {
      if (viewerId === null) return forbidden;

      wakeDueInstances();
      const instances = loadInstances();
      const instance = instances.find((row) => row.id === id && row.app === ownDescriptionId);
      if (!instance) return { ok: false, error: 'not_found' };
      if (typeof element !== 'string' || typeof outcome !== 'string') return { ok: false, error: 'invalid_outcome' };

      const task = nodeOf(instance.graph, instance.element);
      if (instance.status !== 'waiting' || instance.element !== element || task?.type !== 'userTask') {
        return { ok: false, error: 'not_waiting' };
      }

      if (!task.outcomes.includes(outcome)) return { ok: false, error: 'invalid_outcome' };
      if (!devRule(loadConfig(), instance.collection).process) return { ok: false, error: 'process_inactive' };
      if (!viewerRoleKeys[devViewer].includes(task.role)) return forbidden;

      const text = typeof comment === 'string' ? comment.trim().slice(0, MAX_PROCESS_COMMENT) || null : null;
      instance.log.push({ at: timestamp(), element, outcome, comment: text, by: viewerId });
      instance.results[element] = { outcome, comment: text, by: viewerNames.get(viewerId) ?? null };
      instance.element = flowsOut(instance.graph, element).find((flow) => flow.outcome === outcome)!.to;
      runInstance(instance);

      saveInstances(instances);
      announceInstance(instance);
      return { ok: true, process: presentInstance(instance) };
    },

    // Processes.retry/4 and cancel/4: for the app's editors.
    retryProcess(id: number): { ok: true; process: PotokProcess } | PotokError {
      if (!viewerManages) return forbidden;

      const instances = loadInstances();
      const instance = instances.find((row) => row.id === id && row.app === ownDescriptionId);
      if (!instance) return { ok: false, error: 'not_found' };
      if (instance.status !== 'failed') return { ok: false, error: 'not_failed' };

      instance.error = null;
      runInstance(instance);

      saveInstances(instances);
      announceInstance(instance);
      return { ok: true, process: presentInstance(instance) };
    },

    cancelProcess(id: number): { ok: true; process: PotokProcess } | PotokError {
      if (!viewerManages) return forbidden;

      const instances = loadInstances();
      const instance = instances.find((row) => row.id === id && row.app === ownDescriptionId);
      if (!instance) return { ok: false, error: 'not_found' };
      if (!['running', 'waiting', 'failed'].includes(instance.status)) return { ok: false, error: 'not_running' };

      instance.status = 'cancelled';
      instance.wake_at = null;

      saveInstances(instances);
      announceInstance(instance);
      return { ok: true, process: presentInstance(instance) };
    },
  };
}

function createSdk(server: DevServer): PotokSdk {
  return {
    insertValue: (async (
      data: unknown,
      options: { contentFormat?: PotokContentFormat; collection?: string } = {},
    ) => {
      const encoded = typeof data === 'string' ? data : JSON.stringify(data ?? {});
      if (options.collection) return server.insertCollectionValue(options.collection, encoded);

      return server.insertValue({ data: encoded, content_format: options.contentFormat || 'markdown' });
    }) as PotokSdk['insertValue'],

    listValues: (async (options: PotokListOptions | PotokCollectionListOptions = {}) =>
      'collection' in options && options.collection
        ? server.listCollection(options as PotokCollectionListOptions)
        : server.listValues(options as PotokListOptions)) as PotokSdk['listValues'],

    async getConfig() {
      return server.getConfig();
    },

    async saveConfig(data, options) {
      return server.saveConfig(data, options?.revision ?? null);
    },

    updateValue: (async (id: number, data: unknown, options: { revision?: number } = {}) =>
      server.updateCollectionValue(
        id,
        typeof data === 'string' ? data : JSON.stringify(data ?? {}),
        options.revision ?? null,
      )) as PotokSdk['updateValue'],

    async deleteValue(id) {
      return server.deleteCollectionValue(id);
    },

    async deleteValues(collection) {
      return server.deleteCollection(collection);
    },

    async summarizeValues(collection, options = {}) {
      return server.summarizeCollection(collection, options);
    },

    async aggregateValues(options = {}) {
      return server.aggregateValues(options);
    },

    async gradeValue(id, items) {
      return server.gradeCollectionValue(id, items);
    },

    async listRoles() {
      return server.listRoles();
    },

    async setNotifications(collection, on) {
      return server.setNotifications(collection, on === true);
    },

    async ensureFileGroups() {
      return server.ensureFileGroups();
    },

    async fileUrl(id) {
      return server.fileUrl(id);
    },

    uploadFile(file, options) {
      return server.sendFile(file, options.collection, options.slot, options.onProgress);
    },

    uploadImage(file, options = {}) {
      return server.sendFile(file, null, '_image', options.onProgress);
    },

    uploadMedia(file, options = {}) {
      return server.sendFile(file, null, '_image', options.onProgress);
    },

    onValues(listener, options = {}) {
      if (typeof listener !== 'function') return () => {};

      const added = listener as (change: PotokValueChange) => void;
      collectionListeners.set(added, options.collection ?? null);
      return () => collectionListeners.delete(added);
    },

    async listProcesses(collection, options = {}) {
      return server.listProcesses(collection, options.ids ?? null);
    },

    async retryProcess(id) {
      return server.retryProcess(id);
    },

    async cancelProcess(id) {
      return server.cancelProcess(id);
    },

    async updateDescription(description, options = {}) {
      return server.updateDescription({
        description: typeof description === 'string' ? description : '',
        description_format: options.descriptionFormat || null,
      });
    },

    async getDescription() {
      return server.getDescription();
    },

    async getCurrentProfile() {
      const reply = server.currentProfile();
      return reply.ok ? reply.profile : null;
    },

    async listSubgroups(name, options = {}) {
      return server.listSubgroups(name, options);
    },

    async openGroup(id, options = {}) {
      return server.openGroup(id, options.tab);
    },

    async openMap(point) {
      return server.openMap(point?.lat, point?.lng, point?.label);
    },

    async toggleGroupReaction(id, emoji) {
      return server.toggleGroupReaction(id, emoji);
    },

    async pickEmoji() {
      return server.pickEmoji();
    },

    async shareGroup(id, options = {}) {
      return server.shareGroup(id, options.inApp);
    },

    async linkGroup(id) {
      return server.linkGroup(id);
    },

    async getLinkedGroup() {
      return server.getLinkedGroup();
    },

    async listPersonal() {
      return server.personal('list') as never;
    },

    async getPersonal(key) {
      return server.personal('get', key) as never;
    },

    async setPersonal(key, value) {
      return server.personal('set', key, value) as never;
    },

    async deletePersonal(key) {
      return server.personal('delete', key) as never;
    },

    async openLogin() {
      return server.openLogin();
    },

    async getGroup() {
      return server.getGroup();
    },

    async listChildren(options = {}) {
      return server.listChildren(options);
    },

    async getChild(id) {
      return server.getChild(id);
    },

    async createChild(attrs) {
      return server.createChild(attrs);
    },

    async createChildren(list) {
      return server.createChildren(list);
    },

    async updateChild(id, attrs) {
      return server.updateChild(id, attrs);
    },

    async withdrawChild(id) {
      return server.withdrawChild(id);
    },

    async previewDescription(description, options = {}) {
      return server.previewDescription(description, options.descriptionFormat ?? null);
    },

    async listTemplates() {
      return server.listTemplates();
    },

    async renderTemplate(id, fields) {
      return server.renderTemplate(typeof id === 'string' ? id : '', fields && typeof fields === 'object' ? fields : {});
    },

    async listPolls(options = {}) {
      return server.listPolls(options);
    },

    async getPoll(id) {
      return server.getPoll(id);
    },

    async openPoll(id) {
      return server.openPoll(id);
    },

    async openPollForm() {
      return server.openPollForm();
    },

    // A form opens in Potok's dialog: here it is filled in at once.
    async listWaiting() {
      return { ok: true as const, tasks: devTasks };
    },

    async openProcessForm(id) {
      if (!devTasks.some((task) => task.id === id && task.kind === 'form')) {
        return { ok: false, error: 'not_found' };
      }

      finishDevTask(id);
      return { ok: true as const };
    },

    // A drawn decision that waits for the viewer, or a task of the app's own process.
    async completeTask(id, element, outcome, options = {}) {
      const task = devTasks.find((row) => row.id === id && row.kind === 'decision');
      if (!task) return server.completeProcessTask(id, element, outcome, options.comment ?? null);
      if (task.element !== element) return { ok: false, error: 'not_waiting' };
      if (!task.outcomes.includes(outcome)) return { ok: false, error: 'invalid_outcome' };

      finishDevTask(id);

      const at = timestamp();
      const comment = options.comment?.trim().slice(0, MAX_PROCESS_COMMENT) || null;

      return {
        ok: true as const,
        process: {
          id,
          value_id: null,
          status: 'done' as const,
          element: 'end',
          wake_at: null,
          error: null,
          groups: {},
          task: null,
          log: [{ at, element, outcome, comment, 'form?': false, by: { id: viewerId ?? 0, username: viewerNames.get(viewerId) ?? null } }],
        },
      };
    },

    async listStartable() {
      return {
        ok: true as const,
        processes: [
          {
            id: 3,
            name: 'Dev start',
            takes: 'entity' as const,
            attributes: [{ name: 'naslov', type: 'text' as const, list: false, required: true }],
          },
        ],
      };
    },

    async openProcessStart(id) {
      return id === 3 ? { ok: true as const } : { ok: false, error: 'not_found' };
    },

    onWaiting(listener) {
      waitingListeners.add(listener);
      return () => waitingListeners.delete(listener);
    },

    onPollChange(listener) {
      pollListeners.add(listener);
      return () => pollListeners.delete(listener);
    },

    onNewValue(listener, options = {}) {
      if (typeof listener !== 'function') return () => {};

      const added = listener as (value: PotokValue) => void;
      newValueListeners.set(added, options.scope === 'group');
      return () => newValueListeners.delete(added);
    },

    async getMapConfig() {
      return server.mapConfig();
    },

    // One function for both overloads of the type.
    listPlaces: (async (view?: PotokPlacesQuery) => server.listPlaces(view)) as PotokSdk['listPlaces'],

    async listPlacesAt(bounds, options = {}) {
      return server.listPlacesAt(bounds, options);
    },

    async placeShapes(ids, zoom) {
      return server.placeShapes(ids, zoom);
    },

    async createPlace(attrs) {
      return server.createPlace(attrs);
    },

    async showGroup(id) {
      return server.showGroup(id);
    },

    onGroupSheetClose(listener) {
      if (typeof listener !== 'function') return () => {};

      sheetListeners.add(listener);
      return () => sheetListeners.delete(listener);
    },

    onSubgroupsChange(listener) {
      if (typeof listener !== 'function') return () => {};

      subgroupListeners.add(listener);
      return () => subgroupListeners.delete(listener);
    },
  };
}

function createLegacy(sdk: PotokSdk, abortController: AbortController): PotokApi {
  let legacyCallback: ((value: PotokValue) => void) | null = null;

  // Before the sandbox, `getGroupDataValues()` without a limit returned every
  // row; the legacy wrapper pages through the capped API to keep that contract.
  const legacyListAll = async (options: PotokListOptions) => {
    const values: PotokListedValue[] = [];
    let offset = 0;

    while (values.length < LEGACY_MAX_ROWS) {
      const reply = await sdk.listValues({ ...options, limit: LEGACY_PAGE_SIZE, offset });
      if (!reply.ok) return reply;

      values.push(...reply.values);
      if (!reply.has_more) break;
      offset += reply.values.length;
    }

    return { ok: true as const, values };
  };

  return {
    get el() {
      return document.getElementById('group-panel-description')!;
    },

    abortController,

    eventListenerOptions: { signal: abortController.signal },

    insertGroupValue<T extends object = PotokData>(
      content: string,
      options: { contentFormat?: PotokContentFormat } = {},
    ) {
      return sdk.insertValue<T>(typeof content === 'string' ? content : '', options);
    },

    updateGroupDescription: (description, options = {}) => sdk.updateDescription(description, options),

    async getGroupDescription() {
      const reply = await sdk.getDescription();
      const group = reply.ok ? reply.group : null;

      return {
        description: group?.description || '',
        descriptionFormat: group?.description_format || 'html',
      };
    },

    getGroupDataValues: ((options: PotokListOptions = {}) =>
      options.limit == null ? legacyListAll(options) : sdk.listValues(options)) as PotokApi['getGroupDataValues'],

    getCurrentProfile: () => sdk.getCurrentProfile(),

    setNewValueCallback<T extends object = PotokData>(fn: (event: CustomEvent<PotokValue<T>>) => void) {
      if (typeof fn !== 'function') return;

      // The old callback received the `phx:new_data_value` event itself.
      if (legacyCallback) newValueListeners.delete(legacyCallback);
      legacyCallback = (value) => fn(new CustomEvent('phx:new_data_value', { detail: value as PotokValue<T> }));
      newValueListeners.set(legacyCallback, false);
    },
  };
}

// --- Templates of a group's own (`listTemplates`, `renderTemplate`)
//
// In `potok-dev:templates`, as `PotokTemplate[]` without `thumbnail`. Potok
// renders a template's own HTML; the mock lays the fields out plainly, which
// is enough to see a form and its preview work.

const TEMPLATES_KEY = 'potok-dev:templates';

const DEV_TEMPLATES: Omit<PotokTemplate, 'thumbnail'>[] = [
  {
    id: 'custom:1',
    name: 'Utakmica',
    purpose: 'Rezultat, strelci, slike i snimak.',
    rev: 1,
    own: false,
    owner: 'Liga',
    fields: [
      { key: 'domacin', label: 'Domaćin', kind: 'text', required: true, hint: '', options: [] },
      { key: 'ishod', label: 'Ishod', kind: 'choice', required: false, hint: '', options: ['pobeda', 'nerešeno', 'poraz'] },
      { key: 'strelci', label: 'Strelci', kind: 'items', required: false, hint: '', options: [] },
      { key: 'izvestaj', label: 'Izveštaj', kind: 'textarea', required: false, hint: '', options: [] },
      { key: 'slika', label: 'Slika', kind: 'image', required: false, hint: '', options: [] },
      {
        key: 'galerija',
        label: 'Galerija',
        kind: 'pictures',
        required: false,
        hint: '',
        options: [],
        captions: 'galerija_captions',
      },
      { key: 'snimak', label: 'Snimak', kind: 'video', required: false, hint: '', options: [] },
    ],
  },
];

function loadTemplates(): Omit<PotokTemplate, 'thumbnail'>[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? 'null');
    return Array.isArray(stored) ? (stored as Omit<PotokTemplate, 'thumbnail'>[]) : DEV_TEMPLATES;
  } catch {
    return DEV_TEMPLATES;
  }
}

const devEscape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const devAddress = (text: string) => (/^https?:\/\//i.test(text.trim()) ? devEscape(text.trim()) : '');

function devTemplateHtml(template: { fields: PotokTemplateField[] }, fields: Record<string, unknown>): string {
  const text = (key: string) => (typeof fields[key] === 'string' ? (fields[key] as string).trim() : '');
  const list = (key: string) => (Array.isArray(fields[key]) ? (fields[key] as unknown[]).map(String) : []);

  return template.fields
    .map((field, index) => {
      const value = text(field.key);

      switch (field.kind) {
        case 'items': {
          const rows = list(field.key).filter((row) => row.trim() !== '');
          return rows.length ? `<ul>${rows.map((row) => `<li>${devEscape(row)}</li>`).join('')}</ul>` : '';
        }
        case 'pictures': {
          const captions = list(field.captions ?? '');
          return list(field.key)
            .map((picture, row) => [devAddress(picture), captions[row] ?? ''] as const)
            .filter(([address]) => address)
            .map(([address, caption]) => `<figure><img src="${address}" alt=""><figcaption>${devEscape(caption)}</figcaption></figure>`)
            .join('');
        }
        case 'image':
          return devAddress(value) ? `<img src="${devAddress(value)}" alt="">` : '';
        case 'video':
          return devAddress(value) ? `<video src="${devAddress(value)}" controls preload="metadata"></video>` : '';
        case 'url':
          return devAddress(value) ? `<p><a href="${devAddress(value)}">${devEscape(field.label)}</a></p>` : '';
        default:
          if (!value) return '';
          return index === 0 ? `<h2>${devEscape(value)}</h2>` : `<p>${devEscape(value)}</p>`;
      }
    })
    .join('');
}

/** Words in every text field, as Potok's thumbnails have; no picture or video. */
function devTemplateSample(template: { fields: PotokTemplateField[] }): Record<string, string | string[]> {
  return Object.fromEntries(
    template.fields.flatMap((field): [string, string | string[]][] => {
      switch (field.kind) {
        case 'items':
          return [[field.key, [`${field.label} 1`, `${field.label} 2`]]];
        case 'pictures':
        case 'image':
        case 'video':
          return [];
        case 'choice':
          return [[field.key, field.options[0] ?? '']];
        default:
          return [[field.key, field.label]];
      }
    }),
  );
}

/** FNV-1a, as `post.ts` and Potok hash a description below its marker. */
function devHash(html: string): string {
  let hash = 0x811c9dc5;

  for (const unit of html.replace(/\r/g, '').trim()) {
    hash ^= unit.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function installDevPotok(): PotokApi {
  const current = (globalThis as { potok?: PotokApi }).potok;
  if (current) {
    return current;
  }

  const abortController = new AbortController();
  const host = createDescriptionHost();
  const sdk = createSdk(createServer(host));
  const legacy = createLegacy(sdk, abortController);

  (host as HTMLElement & { potok?: PotokApi }).potok = legacy;

  // Without the build wrapper `potok` in app code is `window.potok` as well,
  // so in dev it carries both APIs (they share only getCurrentProfile).
  Object.defineProperty(globalThis, 'potok', {
    configurable: true,
    value: { ...sdk, ...legacy },
  });

  return legacy;
}
