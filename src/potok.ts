// Types for the API that potok-ide exposes to apps (potok-ide:
// assets/js/potok_app_sdk.js, server side in GroupLive.Show.AppApi).
//
// The app runs in a sandboxed iframe that has two APIs:
// - `potok` (legacy): `#group-panel-description`.potok, which the build
//   wrapper in vite.config.ts hands to the app code as a local `potok`;
// - `window.potok`: the newer SDK (insertValue, listValues, onNewValue, ...).
//
// A group has one app per description: the default one and each alternative
// description with "Uses API". Each app has its own data values; both APIs
// see only those of their own app unless asked for the group's (`scope`).
//
// Values can also live in collections, under rules the app's editors keep in
// its config (`getConfig`, `saveConfig`): who writes, who reads everything and
// who only their own. Those come only through the calls that name a
// collection, and never through `onNewValue`.

export type PotokContentFormat = "markdown" | "html";

export type PotokData = Record<string, unknown>;

/** Failed call; `message` is set (localized) only by server-side checks. */
export type PotokError = {
  ok: false;
  error:
    | "not_a_member"
    | "forbidden"
    | "rate_limited"
    | "invalid_value"
    | "invalid_description"
    | "invalid_group"
    /** `createPlace`: a name, kind, place or pin it does not take. */
    | "invalid_place"
    /** `showGroup` from inside what `showGroup` opened. */
    | "unavailable"
    | "invalid_emoji"
    | "invalid_date"
    /** The viewer closed the picker of `pickEmoji`. */
    | "cancelled"
    | "unknown_method"
    /** The call came from an app that is no longer on screen. */
    | "stale_app"
    /** No such sub-group or group, or the viewer cannot see it. */
    | "not_found"
    | "preview"
    | "disconnected"
    /** Collections: the rule takes no more values (closed, or past its deadline). */
    | "closed"
    /** `once`: this person has a value there already. */
    | "already_answered"
    /** The scores are out, so the value no longer changes. */
    | "released"
    | "too_large"
    | "invalid_collection"
    /** `saveConfig`: rules that cannot hold; `reason` says which. */
    | "invalid_rules"
    | "invalid_files"
    | "files_missing"
    | "files_exposed"
    /** Someone else saved in between; `current` is what is there now. */
    | "conflict"
    | "no_config"
    | "not_scored"
    | "invalid_summary"
    /** `match` was not an object of at most 4 KB as JSON. */
    | "invalid_match"
    /** `aggregateValues`: a bad key, path or too many fields. */
    | "invalid_aggregate"
    /** A count or sum took over 5 seconds; a map's view took over 4. */
    | "timeout"
    /** `saveConfig`: the graph of a collection's process cannot hold; `collection`, `path` and `reason` say where. */
    | "invalid_process"
    /** `completeTask`: the run no longer waits on that task. */
    | "not_waiting"
    /** `completeTask`: an outcome the task does not have. */
    | "invalid_outcome"
    /** `completeTask`: the rule's process was taken away. */
    | "process_inactive"
    /** `setPersonal` and the rest: a key is 1 to 64 letters, digits and `_ . : -`. */
    | "invalid_key"
    /** `setPersonal`: the value is over 16 KB as JSON. */
    | "too_big"
    /** `setPersonal`: the app keeps 100 keys for this person already. */
    | "too_many_keys"
    /** `retryProcess`: the instance has not failed. */
    | "not_failed"
    /** `cancelProcess`: the instance has ended already. */
    | "not_running"
    /** `openProcessForm`, `openProcessStart`: in a sheet over another page (`showGroup`). */
    | "not_here";
  message?: string;
  /** `invalid_rules`: which rule cannot hold; `invalid_process`: why, such as `no_flow` or `unknown_role`. */
  reason?: string;
  current?: unknown;
  /** `invalid_process`: the collection whose rule it is. */
  collection?: string;
  /** `invalid_process`: where, counted from the rule, such as `process.graph.nodes.3.outcomes`. */
  path?: string;
  /** `createChildren`: the position of the child that failed; nothing was saved. */
  index?: number;
};

/** A data value, as returned by insert and sent to new value listeners. */
export type PotokValue<T extends object = PotokData> = {
  id: number;
  content: string;
  /** The inserted JSON object. */
  data: T | null;
  content_format: PotokContentFormat;
  is_data: boolean;
  group_id: number;
  parent_id: number | null;
  creator_id: number;
  creator_username: string | null;
  /** The app the value belongs to: null for the default description's. */
  description_id: number | null;
};

/** A data value as listed; timestamps are ISO 8601 strings. */
export type PotokListedValue<T extends object = PotokData> = PotokValue<T> & {
  inserted_at: string;
  updated_at: string;
};

/** What Potok adds to a value of a quiz, as far as the viewer may see it. */
export type PotokManaged = {
  score?: number;
  max?: number;
  /** Answers waiting for an editor. */
  pending?: number;
  items: Record<
    string,
    {
      ok?: boolean | null;
      points?: number | null;
      /** An editor gave these points. */
      graded?: boolean;
      feedback?: string;
      /** The right answers, once released, when the editors show them. */
      expected?: Record<string, unknown>;
    }
  >;
};

/**
 * A value of a collection. `creator_id` and `creator_username` are null on
 * someone else's anonymous value. Timestamps are ISO 8601 strings.
 */
export type PotokCollectionValue<T extends object = PotokData> = Omit<
  PotokListedValue<T>,
  "creator_id" | "creator_username"
> & {
  creator_id: number | null;
  creator_username: string | null;
  collection: string;
  /** Written while its collection was anonymous. */
  anonymous: boolean;
  /** Counts its changes; pass it to `updateValue`. */
  revision: number;
  managed: PotokManaged | null;
};

export type PotokListOptions = {
  /** Page size, at most 200 (the server's default is 50). */
  limit?: number;
  /** Counts on from the cursor, if there is one. */
  offset?: number;
  /** The values right after this id; `has_more` then means newer ones beyond. */
  afterId?: number;
  /** The values right before this id; `has_more` then means older ones beyond. */
  beforeId?: number;
  /** Key in `data` that must contain `searchValue` (case-insensitive). */
  searchField?: string;
  searchValue?: string;
  /** Only values whose data contains this: `{status: "open"}`. JSON types count: `{n: 5}` does not find `"5"`. */
  match?: PotokData;
  /** Adds `total`, the count of what the filters keep. */
  total?: boolean;
  /** Key in `data` to order by; then the cursors only narrow by id. Without it, the order they were written in. */
  orderBy?: string;
  /** "desc" for the newest first. */
  orderDir?: "asc" | "desc";
  /** "group" adds the values of the group's other apps that the viewer can open. */
  scope?: "group";
};

/** A page of a collection: by id, at most 100 values, right next to a cursor. */
export type PotokCollectionListOptions = {
  collection: string;
  limit?: number;
  offset?: number;
  afterId?: number;
  beforeId?: number;
  /** "desc" for the newest first. */
  orderDir?: "asc" | "desc";
  /** Only the viewer's own values. */
  mine?: boolean;
  /** Adds `total`, the count of what the filters keep. */
  total?: boolean;
  /** Only values whose data contains this (full readers only). */
  match?: PotokData;
};

/** Role keys: "everyone", "admin" or a custom role's UUID (`listRoles`). */
export type PotokRoleKey = string;

/** A rule of a collection, as the editors write it and Potok keeps it. */
export type PotokRule = {
  write?: PotokRoleKey[];
  read?: PotokRoleKey[];
  summary?: PotokRoleKey[];
  once?: boolean;
  edit_own?: boolean;
  anonymous?: boolean;
  public?: boolean;
  open?: boolean;
  /** ISO 8601 with a zone. */
  closes_at?: string | null;
  /** The path to the map of answers in each value. */
  under?: string[] | null;
  uploads?: Record<
    string,
    {
      target: "private" | "public";
      max_files?: number;
      max_bytes?: number;
      types?: ("document" | "presentation" | "spreadsheet" | "drawing" | "pdf" | "image" | "video" | "audio")[];
    }
  >;
  score?: {
    release?: "immediate" | "manual";
    released?: boolean;
    show?: { missed?: boolean; correct?: boolean; points?: boolean };
  } | null;
  /** Runs a process for every new value of the collection. */
  process?: PotokRuleProcess | null;
};

/**
 * A rule's process. Its first save gives it a profile of its own called
 * `name` (at most 60 characters), which joins the app's group with what
 * `everyone` holds there and signs what the process does; the editor who
 * saved it owns it. Without `graph` it starts nothing. Taking it out of the
 * rule cancels its instances that run or wait.
 */
export type PotokRuleProcess = { name: string; graph?: PotokProcessGraph };

/**
 * What a process does, elements named as in BPMN; an instance stands on one
 * element at a time. Saved only when an instance can finish it: one start,
 * every element reachable from it and able to reach an end, a flow for every
 * outcome, role keys the group has.
 */
export type PotokProcessGraph = { nodes: PotokProcessNode[]; flows: PotokProcessFlow[] };

/**
 * An element. Ids are lowercase letters, digits, `-` and `_`, from a letter,
 * at most 40; `label` (at most 60) names it on a drawing and where an
 * instance waits or stopped. Texts and names may hold fields of the value,
 * as `{{title}}` or `{{a.q1}}`, and a task's decision, as `{{task_id.outcome}}`.
 * Durations are ISO 8601 (`PT30M`, `PT1H`, `P3D`, `P1W`), from a minute to a year.
 */
export type PotokProcessNode = { id: string; label?: string } & (
  /** A gateway takes the first flow whose `condition` holds, else its `default` flow. */
  | { type: "startEvent" | "endEvent" | "exclusiveGateway" }
  /** Writes `text` into the app's group (`in: "app"`, the default) or a sub-group an element of the instance made (`in`: its id); needs `post_values`. */
  | { type: "serviceTask"; action: "message"; text: string; in?: string }
  /**
   * Makes a sub-group called `name`; `admins` are role keys, "owner" and "triggered_by" (the last two by default); needs `create_subgroups`.
   * With `inherits` it inherits the members of the app's group, all of them or, with `inherit_roles`, only the holders of those roles.
   */
  | {
      type: "serviceTask";
      action: "subgroup";
      name: string;
      admins?: string[];
      inherits?: boolean;
      inherit_roles?: PotokRoleKey[];
    }
  /** Sends `text` (at most 240 characters) to the people of `role`, as a mention of the role would; needs `mention_roles`. */
  | { type: "serviceTask"; action: "push"; role: PotokRoleKey; text: string }
  /** Waits for someone holding `role` to pick one of `outcomes` (at most 10), until an optional `deadline`. */
  | { type: "userTask"; role: PotokRoleKey; outcomes: string[]; deadline?: string }
  | { type: "timer"; duration: string }
);

/**
 * A flow `from` one element `to` another: plain, or with one of the rest. A
 * task leaves by each `outcome` and, with a deadline, by `deadline: true`; a
 * gateway by a `condition` or as its `default`.
 */
export type PotokProcessFlow = {
  from: string;
  to: string;
  outcome?: string;
  deadline?: true;
  condition?: PotokProcessCondition;
  default?: true;
};

/** One field of the value compared, as numbers when both sides are numbers and as texts otherwise. */
export type PotokProcessCondition =
  | { field: string; op: "=" | "!=" | "<" | ">"; value: string | number | boolean }
  | { field: string; op: "empty" };

/** For editors: what a collection's process lacks. */
export type PotokProcessWarning = {
  /** The permissions its graph's actions need that its profile does not hold. */
  missing: string[];
  /** Its owner no longer edits the app. */
  owner_left: boolean;
};

/** An instance of a process, as far as the viewer may see it. */
export type PotokProcess = {
  id: number;
  /** The value it runs for; null for a run of a process drawn in Potok that has none. */
  value_id: number | null;
  status: "running" | "waiting" | "done" | "failed" | "cancelled";
  /** The element it stands on. */
  element: string;
  /** When a timer or a task's deadline wakes it (ISO 8601). */
  wake_at: string | null;
  /** Where it stopped and why, once it has failed. */
  error: { element: string; reason: string } | null;
  /** The sub-groups it made, by the element that made them. */
  groups: Record<string, number>;
  /** The task it waits on; null while it runs, on a timer or once it ends. */
  task: {
    element: string;
    outcomes: string[];
    deadline_at: string | null;
    /** The viewer holds the task's role. */
    can_complete: boolean;
  } | null;
  /** Who decided what, the oldest first. */
  log: PotokProcessLogEntry[];
};

export type PotokProcessLogEntry = {
  at: string;
  element: string;
  outcome: string | null;
  comment: string | null;
  /** A form filled in, in a process drawn in Potok. The key does end in "?". */
  "form?": boolean;
  by: { id: number; username: string | null };
};

/** One check of a quiz's key, by question. */
export type PotokScoreCheck = { points: number } & (
  | { eq: unknown }
  | { set: unknown[] }
  | { text: string[]; others_wrong?: boolean }
  | { rows: Record<string, unknown> }
  | { row_sets: Record<string, unknown[]> }
  | { manual: true }
) & { ok?: string; bad?: string };

/** The app's config data: what the app keeps, and the parts Potok reads. */
export type PotokConfigData = PotokData & {
  rules?: Record<string, PotokRule>;
  /** Only editors read it. */
  secret?: PotokData & { score?: Record<string, Record<string, PotokScoreCheck>> };
  /** The groups that keep the app's files; written by Potok. */
  files?: { public?: number; private?: number };
  /**
   * true: whoever opens the app reads the config, outside members too (and
   * guests where the group is open to them), as a site's menus and theme are
   * for every visitor; `secret` still goes only to editors. A boolean only.
   */
  public?: boolean;
};

export type PotokConfig = {
  id: number;
  revision: number;
  data: PotokConfigData;
  updated_at: string;
};

/** What the viewer may do in a collection. */
export type PotokCaps = {
  ruled: boolean;
  write: boolean;
  write_block: "closed" | "role" | "blocked" | "members_only" | "not_permitted" | null;
  read: "all" | "own";
  summary: boolean;
  edit_own: boolean;
  manage: boolean;
  open: boolean;
  once: boolean;
  anonymous: boolean;
  public: boolean;
  released: boolean;
  /** This person has a value there already. */
  written: boolean;
  /** The viewer gets a push for each new value. */
  notify: boolean;
};

export type PotokConfigReply = {
  ok: true;
  config: PotokConfig | null;
  caps: Record<string, PotokCaps>;
  /** For editors, by collection: the processes that lack something. Empty for everyone else. */
  process_warnings: Record<string, PotokProcessWarning>;
  /** The viewer edits the app. */
  manage: boolean;
  /** They may make its file groups too. */
  can_create_groups: boolean;
  /** For editors: whether the file groups stand. */
  files: { public: "ok" | "missing" | "exposed"; private: "ok" | "missing" | "exposed" } | null;
  /** The roles an alternative description is limited to; [] for all. */
  visible_role_keys: PotokRoleKey[];
  viewer: { signed_in: boolean; member: boolean; profile_id: number | null; username: string | null };
};

export type PotokRole = { key: PotokRoleKey; name: string; builtin: boolean };

export type PotokSummary = {
  total: number;
  keys: Record<
    string,
    {
      answered: number;
      /** `row` is null for a plain answer, the row's key in a grid. */
      rows: { row: string | null; answered: number; other: number; buckets: { value: string; count: number }[] }[];
    }
  >;
  score: {
    count: number;
    average: number | null;
    median: number | null;
    min: number | null;
    max: number | null;
    distribution: { score: number; count: number }[];
    items: Record<string, { ok?: number; bad?: number; pending?: number }>;
  } | null;
};

/** A key of the personal memory (`listPersonal`). */
export interface PotokPersonalItem {
  key: string;
  value: unknown;
  updated_at?: string;
}

/** What `aggregateValues` adds up. Keys are 1 to 64 bytes. */
export type PotokAggregateOptions = {
  /** Up to 5 keys holding numbers: JSON numbers or plain decimal strings ("12", "-3.5"). */
  fields?: string[];
  /** A key to group by; its value as text, cut to 200 characters. */
  groupBy?: string;
  /** Path of up to 3 keys to the object the keys are read in; the top of `data` by default. */
  under?: string[];
  match?: PotokData;
  searchField?: string;
  searchValue?: string;
  scope?: "group";
  /** A collection, for those who read all of it; read at its rule's `under` by default. */
  collection?: string;
};

/** `count` values held a number; `sum` is 0 and the rest null when none did. */
export type PotokFieldStats = {
  count: number;
  sum: number;
  avg: number | null;
  min: number | null;
  max: number | null;
};

export type PotokAggregate = {
  total: number;
  fields: Record<string, PotokFieldStats>;
  /** With `groupBy`: the 50 biggest groups first; `value` is null for values without one. */
  buckets: { value: string | null; count: number; fields: Record<string, PotokFieldStats> }[] | null;
  /** The groups past the 50 biggest, or null. */
  other: { buckets: number; count: number } | null;
};

/** A file sent from the frame; put `{file}` into the value. */
export type PotokUploadedFile = {
  file: number;
  name: string;
  size: number;
  type: string;
  /** Only for a picture or video of the app: an address anyone who sees the app opens. */
  url?: string;
};

/** A field of a group's own template, as `listTemplates` gives it. */
export type PotokTemplateField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "url" | "date" | "time" | "choice" | "items" | "image" | "pictures" | "video";
  required: boolean;
  hint: string;
  /** The options of a `choice`. */
  options: string[];
  /** For `pictures`: the key their captions go under, one for each. */
  captions?: string;
};

/** A template of the group's own, or of a group above it, made in Potok's settings. */
export type PotokTemplate = {
  id: `custom:${number}`;
  name: string;
  purpose: string;
  /** Goes up with every save; a description keeps the one it was made with. */
  rev: number;
  fields: PotokTemplateField[];
  /** Whether it is this group's own. */
  own: boolean;
  /** The group it comes from, when the viewer sees it; null for the group's own. */
  owner: string | null;
  /** Its HTML with sample values, sanitized. */
  thumbnail: string;
};

/** What `renderTemplate` makes of a template's fields. */
export type PotokRenderedTemplate = {
  ok: true;
  /** What to save, with `descriptionFormat: "html"`. */
  description: string;
  /** What the post is called: its first required short text, else the template's name. */
  name: string;
  /** How it shows. */
  html: string | null;
  /** The labels of required fields still empty. */
  missing: string[];
  rev: number;
};

/** A change in the app's collections the viewer may see. */
export type PotokValueChange<T extends object = PotokData> =
  | { event: "created" | "updated"; collection: string; value: PotokCollectionValue<T> }
  | { event: "deleted"; collection: string; id: number }
  | { event: "cleared"; collection: string | null }
  | { event: "regraded"; collection: string }
  | { event: "config"; collection: "config"; id: number; revision: number }
  /** An instance of the collection's process moved; read it again with `listProcesses`. */
  | { event: "process"; collection: string; id: number };

export type PotokProfile = {
  id: number;
  username: string;
  profile_picture_url: string;
  /** null when empty, or when the group's members may not read it. */
  description: string | null;
  description_format: PotokContentFormat;
  /**
   * What the profile tells about itself to the members of this group, each
   * left out when it is not filled or not for them. `website` holds up to
   * three links, one per line. Missing on a Potok without details.
   */
  details?: Partial<
    Record<
      "first_name" | "last_name" | "occupation" | "place" | "phone" | "email" | "website",
      string
    >
  >;
  sharing: "unique" | "shared";
  inserted_at: string;
  updated_at: string;
  admin: boolean;
  /** Names of the roles the profile holds in the group. */
  roles: string[];
};

/** The app's own description; `id` is the group's. */
export type PotokGroupDescription = {
  id: number;
  /** null for the default description. */
  description_id: number | null;
  /** The default description's label (if set) or the alternative description's name. */
  name: string | null;
  description: string;
  description_format: PotokContentFormat;
};

/** One emoji on a group, whoever used it. */
export type PotokReaction = {
  emoji: string;
  count: number;
  /** The viewer is among them. */
  mine: boolean;
};

/**
 * A direct sub-group of the app's group, or a group under one; timestamps are
 * ISO 8601 strings.
 */
export type PotokSubgroup = {
  id: number;
  name: string;
  /**
   * The description as sanitized HTML, safe to put in the page; a `rich-content`
   * element around it gives the styles of the group page. null for a group
   * without a description and for an app, whose description is its source code,
   * and for a guest also for a group that keeps its description from guests.
   */
  description_html: string | null;
  /**
   * With `brief` (and in `searchSubgroups`): the text of the group's card, as
   * plain text of at most 200 characters, in place of `description_html`;
   * null otherwise, and where the viewer may not read the description.
   */
  summary?: string | null;
  /** What an app says about itself in its meta tags, as plain text; null otherwise. */
  app_description: string | null;
  uses_api: boolean;
  picture_url: string;
  is_public: boolean;
  inherits_members: boolean;
  /** null for a guest, who learns nothing of who made a group. */
  creator_id: number | null;
  inserted_at: string;
  /** When a closed group (private, not inheriting) last opened up; null if it never was closed. */
  published_at: string | null;
  /** When the newest chat value was posted. */
  last_value_at: string | null;
  /** The messages in its chat. A thread is a group of its own and does not count. */
  comment_count: number;
  /** In the order each emoji was first used. */
  reactions: PotokReaction[];
  /** Whether `toggleGroupReaction` works for this viewer: not only for members of a public group. */
  can_react: boolean;
};

/** A direct sub-group of the app's group, with what it takes to edit it. */
export type PotokChild = PotokSubgroup & {
  /** The source: null when the viewer cannot edit the group, and for an app. */
  description: string | null;
  description_format: PotokContentFormat;
  can_edit: boolean;
  /** The roles of the app's group its members are inherited by; empty for all of them, or when it does not inherit. */
  inherit_role_keys: PotokRoleKey[];
  member_count: number;
  updated_at: string;
  /** The app's own key, given by `createChildren`; null for a group made otherwise. */
  key: string | null;
  /** Where its pin stands on a map; null for a group without a place. */
  lat: number | null;
  lng: number | null;
  /** A key of `pins.icons` or "picture"; null for its kind's. */
  pin: string | null;
  /** The group it stands under: the app's group, or a section (`under`). */
  parent_id: number;
  /** Its description goes to guests; follows the app's group at every save. */
  for_guests: boolean;
  /** Outsiders write in its chat (an open chat); follows the app's group too. */
  public_chat: boolean;
  /** When the draft opens by itself (`publishAt`); null when it waits for nothing. */
  publish_at: string | null;
  /** Why it did not open at its time: "not_permitted" or "error"; null otherwise. */
  publish_failure: string | null;
};

/** What an app may set on a sub-group. A field left out stays as it is. */
export type PotokChildAttrs = {
  name?: string;
  description?: string;
  descriptionFormat?: PotokContentFormat;
  isPublic?: boolean;
  inheritsMembers?: boolean;
  /**
   * With `inheritsMembers`: only the members of the app's group who hold one
   * of these roles there come in (keys from `listRoles`), with all their
   * roles, and they leave on losing the last of them. Empty or "everyone"
   * takes every member; a key the group has not is refused (`invalid_group`).
   * Narrowing it in `updateChild` sends away whoever no longer fits, except
   * the viewer.
   */
  inheritRoleKeys?: PotokRoleKey[];
  /** An image URL or a `data:` URL, at most 1,000,000 characters. */
  picture?: string;
  /**
   * Where its pin stands on a map (`listPlaces`), rounded to 6 decimals: both
   * or neither. Both null take the place away (`updateChild`).
   */
  lat?: number | null;
  lng?: number | null;
  /** A key of `pins.icons` (`getMapConfig`) or "picture"; null for its kind's. */
  pin?: string | null;
  /**
   * A draft opens by itself at this moment (ISO 8601 with a zone, ahead and
   * within a year): it then becomes what `publishAs` says, in the name of the
   * viewer, unless they may no longer edit it. null takes the time away;
   * publishing or withdrawing by hand does too. `invalid_date` for a bad one.
   */
  publishAt?: string | null;
  /** Whom it opens to at `publishAt`: both true by default. */
  publishAs?: { isPublic?: boolean; inheritsMembers?: boolean };
};

/** Where the calls on the groups below act: `under` a direct sub-group (its id), as a site's section. */
export type PotokUnder = { under?: number };

/** A sub-group `createChildren` makes. */
export type PotokNewChild = Omit<PotokChildAttrs, "picture" | "lat" | "lng" | "pin"> & {
  name: string;
  lat?: number;
  lng?: number;
  pin?: string;
  /**
   * The app's own name for it, 1 to 64 characters without control characters,
   * unique under this group and set once: a group whose key is there already
   * is not made again. Groups with a key are records: their own map shows
   * them, the root's map and the place picker of events do not.
   */
  key?: string;
};

/** What `createChildren` did with one child, in the order they were sent. */
export type PotokCreatedChild = {
  id: number;
  key: string | null;
  /** false: a group with this key was there already, and `id` is that one. */
  created: boolean;
};

/** The app's own group and what the viewer may do there. */
export type PotokOwnGroup = {
  id: number;
  name: string;
  is_public: boolean;
  inherits_members: boolean;
  /** The parent's roles it inherits members by; empty for all of them. */
  inherit_role_keys: PotokRoleKey[];
  /** null for a viewer who cannot see that group. */
  parent: { id: number; name: string; is_public: boolean; uses_api: boolean } | null;
  /** The viewer may keep the sub-groups: they hold `edit_group` here. */
  can_manage_children: boolean;
  /** They hold `create_subgroups` as well. */
  can_create_children: boolean;
  /** Any member can add a group here by hand, past the app. */
  everyone_creates_subgroups: boolean;
  /** `openPollForm` works for this viewer. */
  can_start_polls: boolean;
  /**
   * false for a guest: someone without an account at a public group that opened
   * its description to guests. The app then only reads; `openLogin` takes them
   * to log in.
   */
  signed_in: boolean;
};

/** `templates` is the Šabloni card of the settings. */
export type PotokGroupTab = "chat" | "description" | "settings" | "templates";

/** One path of a pin's glyph (24 x 24 Heroicons, solid). */
export type PotokPinPath = { d: string; evenodd: boolean };

/** How a kind of group or a chosen icon looks on a map. */
export type PotokPinLook = {
  key: string;
  /** Its name in the viewer's language. */
  title: string;
  /** A key of `tones`. */
  tone: string;
  paths: PotokPinPath[];
  /**
   * A kind's small glyph (Heroicons 16 solid), which a pin the group picked
   * keeps in its top right corner, as on the group's avatar; null for "none".
   * Icons have none.
   */
  mark?: PotokPinPath[] | null;
};

/** What a map needs before its first pin (`getMapConfig`). */
export type PotokMapConfig = {
  /** Tiles come through Potok: `url` has `{z}`, `{x}` and `{y}`; `attribution` is HTML to show. */
  tiles: { url: string; attribution: string; max_zoom: number };
  /** `[[south, west], [north, east]]`: where a map opens until its editors save a view. */
  default_bounds: [[number, number], [number, number]];
  pins: {
    /** The drop on a 32 x 40 box, as an SVG path, its point at (16, 39). */
    drop: string;
    /** Where the glyph goes in the drop, as an SVG transform. */
    glyph_transform: string;
    /** Where a kind's `mark` goes, in a white disc of radius 5.5 around (26.5, 6.5), as an SVG transform. Potok always sends it. */
    mark_transform?: string;
    /** The colour of each tone, as `#rrggbb`; a white glyph reads on every one. */
    tones: Record<string, string>;
    /** What a group shows by its kind: its preset, "app" or "none". */
    kinds: PotokPinLook[];
    /** What a group can pick instead, in the order of its settings. */
    icons: PotokPinLook[];
  };
  /** The kinds `createPlace` takes, in the order of Potok's "Create sub-group" menu. */
  place_kinds: { key: string; title: string }[];
  /** `createPlace` works for this viewer: a member who may make sub-groups here. */
  can_create_places: boolean;
  /** The viewer may edit this group, so may save the map's view in its config. */
  can_edit_view: boolean;
};

/** A sub-group right under the app's group that has a place on a map. */
export type PotokPlace = {
  id: number;
  name: string;
  /** Where its pin stands; for an area, a point inside it; for a route, its start. */
  lat: number;
  lng: number;
  /** A key of `pins.kinds`. */
  kind: string;
  /** A key of `pins.icons`, "picture" for the group's picture, null for its kind's. */
  pin: string | null;
  picture_url: string | null;
  is_public: boolean;
  /**
   * "area" for a group that covers an area, "route" for one that runs along a
   * line, such as a walk or a bike path (their shapes come from `placeShapes`).
   */
  shape: 'point' | 'area' | 'route';
  /**
   * The areas among the map's places that hold this one, smallest first: its
   * pin lies inside them, and for an area they are the bigger ones; a route
   * lies in every area it passes through.
   */
  areas: number[];
  /** An area's or a route's box: [west, south, east, north]. */
  bbox?: [number, number, number, number];
  /** Changes with an area's border or a route's line: what to keep its shapes by. */
  v?: number;
  /** A route's length, in metres along the Earth's surface. */
  length?: number;
};

/**
 * The shape of an area or a route, simplified for one level of detail
 * (`placeShapes`): a border for an area, a line for a route.
 */
export type PotokPlaceShape = {
  id: number;
  /** The `v` of its place. */
  v: number;
  geojson:
    | { type: 'MultiPolygon'; coordinates: [number, number][][][] }
    | { type: 'MultiLineString'; coordinates: [number, number][][] };
};

/** `[[south, west], [north, east]]`, as Leaflet takes bounds. */
export type PotokBounds = [[number, number], [number, number]];

/** What part of a map `listPlaces` reads, and which of its places. */
export type PotokPlacesQuery = {
  /** The view's box: [west, south, east, north]. */
  bbox: [number, number, number, number];
  /** The map's zoom, 0 to 24. */
  zoom: number;
  /** Only places with this in their name (case, accents and script do not count). Big maps only. */
  search?: string;
  /** Only places that show one of these: keys of `pins.icons` and "kind" for those that show their kind. Big maps only. */
  pins?: string[];
  /** Also `extent`: how many places the filters keep and the box around them. */
  extent?: boolean;
  /** Also `pins` in the reply: how many of the map's places show each pin, whatever the filters. */
  counts?: boolean;
};

/** Places a big map's view holds too close together to draw one by one. */
export type PotokPlaceCluster = {
  count: number;
  /** Their average position. */
  lat: number;
  lng: number;
  /** The box around them. */
  bounds: PotokBounds;
  /** How many of them have each tone (keys of `pins.tones`); tones with none are left out. */
  tones: Record<string, number>;
};

/** How many places show a pin: a key of `pins.icons`, "picture", or "kind". */
export type PotokPinCount = { pin: string; count: number };

/**
 * `listPlaces(view)` on a map of up to 2000 places: all of them, as without a
 * view, filtered and gathered by the app. `search`, `pins`, `extent` and
 * `counts` are ignored: the app works them out from `places`.
 */
export type PotokPlacesAll = {
  ok: true;
  /** Absent from a Potok older than views. */
  mode?: "all";
  places: PotokPlace[];
  truncated: boolean;
};

/**
 * `listPlaces(view)` on a bigger map: Potok gathers the places in the view
 * into cells of about 64 pixels; a cell with one place gives that place, the
 * others a cluster.
 */
export type PotokPlacesView = {
  ok: true;
  mode: "view";
  /** The places alone in their cells. */
  places: PotokPlace[];
  clusters: PotokPlaceCluster[];
  /** The places the filters keep in the view. */
  total: number;
  /** The view had more cells than a reply takes (2000). */
  truncated: boolean;
  /** With `extent`; `bounds` null when the filters keep none. */
  extent?: { count: number; bounds: PotokBounds | null };
  /** With `counts`, the most shown first. */
  pins?: PotokPinCount[];
};

/** A new place: a sub-group from a preset, as Potok's menu makes it, standing at `lat`, `lng`. */
export type PotokPlaceAttrs = {
  name: string;
  /** A key of `place_kinds`. */
  kind: string;
  lat: number;
  lng: number;
  /** Left out, the preset's default under this group. */
  isPublic?: boolean;
  /** A key of `pins.icons` or "picture"; left out, the kind's. */
  pin?: string;
};

export type PotokSubgroupListOptions = {
  /** Page size, at most 50 (the server's default is 20). */
  limit?: number;
  /** The id of the last group of the previous page. */
  beforeId?: number;
  /** Only groups published at this moment or later: ISO 8601 with a zone. Send it with every page. */
  from?: string;
  /** Only groups published before this moment: ISO 8601 with a zone. Send it with every page. */
  to?: string;
  /**
   * The groups around this one instead of the first page, however far down it
   * lies: up to `limit` on each side. Look for its id in the reply, as a group
   * the list does not hold gives the first page.
   */
  aroundId?: number;
  /** Each group's `summary` (its card's text) instead of its whole `description_html`. */
  brief?: boolean;
};

/** A part of a list of sub-groups, newest first. */
export type PotokSubgroupPage = {
  ok: true;
  groups: PotokSubgroup[];
  /** There are older groups below these. */
  has_more: boolean;
  /** There are newer groups above these. Only `aroundId` can say so. */
  has_newer: boolean;
};

/** An answer of a poll. `votes_count` is null while the poll's rules keep it from this viewer. */
export type PotokPollOption = {
  id: number;
  text: string;
  votes_count: number | null;
  /** The viewer's ballot holds it. Always false in a secret poll, which keeps no answers. */
  mine: boolean;
};

/** A poll of the app's group, as far as its rules show it to this viewer; times are ISO 8601. */
export type PotokPoll = {
  id: number;
  question: string;
  /** Markdown. */
  description: string;
  kind: "single" | "multiple";
  /** For `multiple`: at most this many answers; null for no limit. */
  max_choices: number | null;
  closes_at: string | null;
  closed_at: string | null;
  open: boolean;
  /** Nobody can see who voted for what, and no counts show before the end. */
  secret: boolean;
  /** Signed-in non-members vote too. */
  public: boolean;
  /** `openPoll` lets the viewer vote now, or change their vote. */
  can_vote: boolean;
  voted: boolean;
  can_see_results: boolean;
  can_see_details: boolean;
  /** They may end, change or delete it, on Potok's own page. */
  can_manage: boolean;
  voters_count: number;
  /** What was decided, once the rules show it. */
  outcome: "passed" | "failed" | "no_quorum" | "tie" | null;
  winner_option_id: number | null;
  options: PotokPollOption[];
};

/** An attribute of an entity a process drawn in the group asks for. */
export type PotokAttribute = {
  name: string;
  type: "text" | "number" | "boolean" | "date" | "datetime" | "choice" | "entity";
  /** A list of what the type says, a row per item in Potok's form. */
  list: boolean;
  required: boolean;
  /** The choices of a `choice`. */
  options?: string[];
  /** The id of the entity an `entity` holds. */
  entity?: number;
};

/** What waits for the viewer in the group (`listWaiting`). */
export type PotokTask = {
  /** The run that waits: `openProcessForm` and `completeTask` take it. */
  id: number;
  process: { id: number; name: string };
  element: string;
  label: string;
  /** A form to fill in (`attributes`) or a decision (`outcomes`). */
  kind: "form" | "decision";
  title: string | null;
  text: string | null;
  deadline_at: string | null;
  outcomes: string[];
  attributes: PotokAttribute[];
  /** Whether the viewer started the run it waits in. */
  started_by_viewer: boolean;
};

/** A process drawn in the group the viewer may start by hand (`listStartable`). */
export type PotokStartable = {
  id: number;
  name: string;
  /** The attributes of an entity, or a title and a text. */
  takes: "entity" | "text";
  attributes: PotokAttribute[];
};

export type PotokPollListOptions = {
  /** "waiting" holds those the viewer can still vote in, without paging. */
  status?: "open" | "closed" | "waiting";
  /** The id of the last poll of the previous page. */
  beforeId?: number;
};

/** `window.potok`. Calls reject if the page does not answer within 10s. */
export type PotokSdk = {
  /** Into a collection, as its rule allows. */
  insertValue<T extends object = PotokData>(
    data: T | string,
    options: { collection: string },
  ): Promise<{ ok: true; value: PotokCollectionValue<T> } | PotokError>;
  insertValue<T extends object = PotokData>(
    data: T | string,
    options?: { contentFormat?: PotokContentFormat },
  ): Promise<{ ok: true; value: PotokValue<T> } | PotokError>;
  /** A collection: every value for its readers, otherwise the viewer's own. */
  listValues<T extends object = PotokData>(
    options: PotokCollectionListOptions,
  ): Promise<
    { ok: true; values: PotokCollectionValue<T>[]; has_more: boolean; total: number | null } | PotokError
  >;
  listValues<T extends object = PotokData>(
    options?: PotokListOptions,
  ): Promise<
    { ok: true; values: PotokListedValue<T>[]; has_more: boolean; total: number | null } | PotokError
  >;
  /** Sums in the database over what `listValues` would page through; 120 a minute with `summarizeValues`. */
  aggregateValues(options?: PotokAggregateOptions): Promise<({ ok: true } & PotokAggregate) | PotokError>;
  /** The config and, per ruled collection, what the viewer may do there. */
  getConfig(): Promise<PotokConfigReply | PotokError>;
  /** For editors. Pass the revision you started from (0 for the first save). */
  saveConfig(
    data: PotokConfigData,
    options: { revision: number },
  ): Promise<
    { ok: true; config: PotokConfig; process_warnings: Record<string, PotokProcessWarning> } | PotokError
  >;
  /** The viewer's own value, where the rule lets authors change theirs. */
  updateValue<T extends object = PotokData>(
    id: number,
    data: T | string,
    options?: { revision?: number },
  ): Promise<{ ok: true; value: PotokCollectionValue<T> } | PotokError>;
  /** For editors: one value of a collection, with its files. */
  deleteValue(id: number): Promise<{ ok: true; id: number } | PotokError>;
  /** For editors: a whole collection, with its files. */
  deleteValues(collection: string): Promise<{ ok: true; count: number } | PotokError>;
  /** Counts over the answers under `under`, for `keys`; `score` adds a quiz's numbers. */
  summarizeValues(
    collection: string,
    options?: { under?: string[]; keys?: string[]; score?: boolean },
  ): Promise<{ ok: true; summary: PotokSummary } | PotokError>;
  /** An editor's points and words; `points: null` gives the answer back to the key. */
  gradeValue(
    id: number,
    items: Record<string, { points?: number | null; feedback?: string }>,
  ): Promise<{ ok: true; value: PotokCollectionValue } | PotokError>;
  listRoles(): Promise<{ ok: true; roles: PotokRole[] } | PotokError>;
  /** The viewer's push for each new value of the collection. */
  setNotifications(collection: string, on: boolean): Promise<{ ok: true; on: boolean } | PotokError>;
  /** For editors: makes the app's "Files" and "Private files" groups if missing. */
  ensureFileGroups(): Promise<{ ok: true; files: { public?: number; private?: number } } | PotokError>;
  /** An address the frame can show a file by, for ten minutes. */
  fileUrl(
    id: number,
  ): Promise<{ ok: true; url: string; name: string; type: string; size: number } | PotokError>;
  /** Sends a file for `slot` of `collection`; waits for as long as the upload takes. */
  uploadFile(
    file: File | Blob,
    options: { collection: string; slot: string; onProgress?: (percent: number) => void },
  ): Promise<{ ok: true; file: PotokUploadedFile } | PotokError>;
  /** For editors: a picture of the app itself, with an address in `file.url`. */
  uploadImage(
    file: File | Blob,
    options?: { onProgress?: (percent: number) => void },
  ): Promise<{ ok: true; file: PotokUploadedFile } | PotokError>;
  /** For editors: a picture or a video (mp4, webm, quicktime) of the app, with an address in `file.url`. */
  uploadMedia(
    file: File | Blob,
    options?: { onProgress?: (percent: number) => void },
  ): Promise<{ ok: true; file: PotokUploadedFile } | PotokError>;
  /** Changes in the app's collections the viewer may see; returns a remover. */
  onValues<T extends object = PotokData>(
    listener: (change: PotokValueChange<T>) => void,
    options?: { collection?: string },
  ): () => void;
  /**
   * The instances of `collection`'s process the viewer may see, of the values
   * they read in full and of their own, newest first, at most 100. `ids`
   * keeps those of these values. Processes drawn in Potok are left out.
   */
  listProcesses(
    collection: string,
    options?: { ids?: number[] },
  ): Promise<{ ok: true; processes: PotokProcess[] } | PotokError>;
  /** For editors: takes a failed instance up again where it stopped. */
  retryProcess(id: number): Promise<{ ok: true; process: PotokProcess } | PotokError>;
  /** For editors: cancels an instance that runs, waits or has failed. */
  cancelProcess(id: number): Promise<{ ok: true; process: PotokProcess } | PotokError>;
  updateDescription(
    description: string,
    options?: { descriptionFormat?: PotokContentFormat },
  ): Promise<{ ok: true; group: PotokGroupDescription } | PotokError>;
  getDescription(): Promise<{ ok: true; group: PotokGroupDescription } | PotokError>;
  getCurrentProfile(): Promise<PotokProfile | null>;
  /**
   * The groups under this group's direct sub-group called exactly `name`, or
   * with that id (which stays when the sub-group is renamed), newest first, as
   * far as the viewer can see them. Of several sub-groups with one name the
   * oldest counts.
   */
  listSubgroups(
    name: string | number,
    options?: PotokSubgroupListOptions,
  ): Promise<PotokSubgroupPage | PotokError>;
  /**
   * One group `listSubgroups` could return, or a direct sub-group, with the
   * group it stands under: what an app opens from its address
   * (`getLinkedGroup`) without knowing where it stands. `not_found` for the
   * app's own group and its file groups.
   */
  getSubgroup(
    id: number,
    options?: { brief?: boolean },
  ): Promise<{ ok: true; group: PotokSubgroup & { parent_id: number } } | PotokError>;
  /**
   * Groups one level under this group's direct sub-groups (or under `under`)
   * whose name or text holds `q`, in any case, with or without diacritics, in
   * either script: a site's search box. Each comes with its `summary`. A guest
   * finds by text only what is open to guests. Counts as a heavy read.
   */
  searchSubgroups(
    q: string,
    options?: PotokSubgroupListOptions & PotokUnder,
  ): Promise<{ ok: true; groups: PotokSubgroup[]; has_more: boolean } | PotokError>;
  /**
   * Takes the viewer to this group's parent, a direct sub-group or a group
   * `listSubgroups` can return: to its chat, with `tab: "description"` to its
   * description, where a group that is an app runs, or with `tab: "settings"` to
   * its settings. The app ends with the page.
   */
  openGroup(id: number, options?: { tab?: PotokGroupTab }): Promise<{ ok: true } | PotokError>;
  /**
   * Takes the viewer, on the same page, to the root's map at the point (in
   * degrees): a pin with this group's picture, and a card with its name and
   * `label` (at most 80 characters). For a place the app keeps in its own data;
   * the group's own place stays as it is. `invalid_place` for a point out of
   * range, `forbidden` for a guest. The app ends with the page.
   */
  openMap(point: { lat: number; lng: number; label?: string | null }): Promise<{ ok: true } | PotokError>;
  /**
   * Adds the viewer's reaction to a group below this one, or takes it back, as
   * a click on a reaction does. Counts as a write for the rate limit.
   */
  toggleGroupReaction(id: number, emoji: string): Promise<{ ok: true; reactions: PotokReaction[] } | PotokError>;
  /** Lets the viewer choose any emoji in Potok's own picker; waits for as long as they take. */
  pickEmoji(): Promise<{ ok: true; emoji: string } | PotokError>;
  /**
   * Opens the page's way of sharing with the link of a group `openGroup` can
   * reach. A frame has neither Web Share nor the clipboard. With `inApp` the link
   * is to this app open on that group, which must lie below it.
   */
  shareGroup(id: number, options?: { inApp?: boolean }): Promise<{ ok: true } | PotokError>;
  /**
   * Puts a group in the page's address, so that the address opens this app on
   * it; the app finds it again with `getLinkedGroup`. Without `push` the
   * address changes in place. With `push` it is a new entry of the browser's
   * history, as a site goes to another page: Back brings the one before, and
   * the app hears of it through `onLinkedGroupChange` instead of the page
   * leaving. null takes the group out of the address. `entry` is the number of
   * the history entry the app is on (null for one it did not push).
   */
  linkGroup(
    id: number | null,
    options?: { push?: boolean },
  ): Promise<{ ok: true; entry: number | null } | PotokError>;
  /** The group in the page's address and the entry of the history. Nothing checks it: `aroundId` does. */
  getLinkedGroup(): Promise<{ ok: true; group_id: number | null; entry: number | null } | PotokError>;
  /**
   * Back or Forward brought the page to another entry the app pushed, or to
   * the address it opened with: show that group, the start for null, and find
   * where that entry had scrolled by its number. Returns a function that
   * removes the listener.
   */
  onLinkedGroupChange(listener: (change: { group_id: number | null; entry: number | null }) => void): () => void;
  /**
   * The app's personal memory: what it keeps for the viewer alone, the same on
   * every device, such as how far they read. Nobody else reads it, not even the
   * app's editors, and the viewer sees and deletes it in Potok's settings. A
   * guest's stays in the browser. Up to 100 keys per person, 16 KB each.
   */
  listPersonal(): Promise<{ ok: true; items: PotokPersonalItem[] } | PotokError>;
  /** One key of the personal memory: `value` is null for a key not kept. */
  getPersonal<T = unknown>(key: string): Promise<{ ok: true; value: T | null } | PotokError>;
  /** Keeps anything JSON holds under `key`, for the viewer alone. Counts as a write. */
  setPersonal(key: string, value: unknown): Promise<{ ok: true } | PotokError>;
  /** Forgets a key of the personal memory; one not kept is fine. Counts as a write. */
  deletePersonal(key: string): Promise<{ ok: true } | PotokError>;
  /**
   * For a guest (`getCurrentProfile()` resolves to null): takes the page to
   * Potok's log-in, which brings them back to this group. A frame cannot leave
   * the page itself. Anywhere else `unavailable`.
   */
  openLogin(): Promise<{ ok: true } | PotokError>;
  getGroup(): Promise<{ ok: true; group: PotokOwnGroup } | PotokError>;
  /**
   * The direct sub-groups, in the order of `listSubgroups`. This and the calls
   * below act in the viewer's name, so they need `can_manage_children`.
   */
  listChildren(
    options?: PotokSubgroupListOptions & PotokUnder,
  ): Promise<PotokSubgroupPage | PotokError>;
  getChild(id: number, options?: PotokUnder): Promise<{ ok: true; group: PotokChild } | PotokError>;
  /**
   * Needs `can_create_children`. Without `isPublic` or `inheritsMembers` only
   * the viewer sees the group. With `under` it goes under that direct
   * sub-group (a site's section), never one that is an app or keeps the app's
   * files. `editorsOnly`: only those who may edit the new group add groups to
   * it, as a site's section, where members cannot put their own groups among
   * the articles.
   */
  createChild(
    attrs: PotokChildAttrs & PotokUnder & { name: string; editorsOnly?: boolean },
  ): Promise<{ ok: true; group: PotokChild } | PotokError>;
  /**
   * Makes up to 100 sub-groups at once, all or none (`invalid_group` with the
   * `index` of the one that failed), for one write of the rate limit. A child
   * whose `key` is there already is not made again (`created: false`), so a
   * call that timed out can be sent again as it was. Needs `can_create_children`.
   * Open pages hear of the whole call once, and the viewer's unread counts
   * do not follow the new groups.
   */
  createChildren(
    children: PotokNewChild[],
    options?: { onExisting?: "skip" },
  ): Promise<{ ok: true; groups: PotokCreatedChild[] } | PotokError>;
  /**
   * A draft that opens up moves to the top of the order; one that turns back
   * into a draft loses its `published_at`. With `updatedAt` (the `updated_at`
   * the app read) a save after someone else's answers `conflict` with the
   * group as it is now instead of writing over it.
   */
  updateChild(
    id: number,
    attrs: PotokChildAttrs & PotokUnder,
    options?: { updatedAt?: string },
  ): Promise<{ ok: true; group: PotokChild } | (PotokError & { group?: PotokChild })>;
  /** Closes the group again, and its inherited members leave. Direct members and the viewer stay. */
  withdrawChild(id: number, options?: PotokUnder): Promise<{ ok: true; group: PotokChild } | PotokError>;
  /** Moves a group from one direct sub-group (`under`) to another (`to`): a site's article to another section. */
  moveChild(id: number, where: { under: number; to: number }): Promise<{ ok: true; group: PotokChild } | PotokError>;
  /**
   * Gives the groups this app keeps (its sub-groups and those right under them)
   * this group's guests and open chat again where they differ, for when those
   * changed after the groups were made. One write.
   */
  applyAccessToChildren(): Promise<{ ok: true; updated: number; skipped: number } | PotokError>;
  /** The text as a feed will show it, sanitized on the server; counts as a write for the rate limit. */
  previewDescription(
    description: string,
    options?: { descriptionFormat?: PotokContentFormat },
  ): Promise<{ ok: true; html: string | null } | PotokError>;
  /** For editors: the templates of the group's own and of every group above it, nearest first. */
  listTemplates(): Promise<{ ok: true; templates: PotokTemplate[] } | PotokError>;
  /** For editors: a description from one of those templates, rendered on the server; counts as a write. */
  renderTemplate(id: string, fields: Record<string, string | string[]>): Promise<PotokRenderedTemplate | PotokError>;
  /** The polls of this group, the newest first, 30 per call. */
  listPolls(
    options?: PotokPollListOptions,
  ): Promise<{ ok: true; polls: PotokPoll[]; has_more: boolean } | PotokError>;
  getPoll(id: number): Promise<{ ok: true; poll: PotokPoll } | PotokError>;
  /**
   * Opens the poll in a dialog of Potok's, over the app, where the viewer votes.
   * An app cannot vote or change a poll itself: it runs for every viewer, and a
   * vote can be final.
   */
  openPoll(id: number): Promise<{ ok: true } | PotokError>;
  /** Opens Potok's form for a new poll in this group; needs `can_start_polls`. */
  openPollForm(): Promise<{ ok: true } | PotokError>;
  /**
   * Gets the id of a poll that changed, got a vote or was deleted, a few at a
   * time. Read it again with `getPoll`; a deleted one is `not_found`. Returns a
   * function that removes the listener.
   */
  onPollChange(listener: (id: number) => void): () => void;
  /**
   * What waits for the viewer in the group, of the processes its editors draw
   * in Potok: a form to fill in or a decision, the nearest deadline first.
   * Members only.
   */
  listWaiting(): Promise<{ ok: true; tasks: PotokTask[] } | PotokError>;
  /**
   * Opens Potok's dialog of a form that waits for the viewer, over the app. An
   * app reads a form and never fills one in. In a sheet over another page:
   * `not_here`.
   */
  openProcessForm(id: number): Promise<{ ok: true } | PotokError>;
  /**
   * Finishes the task the instance `id` waits on at `element`, picking
   * `outcome`, for someone holding its role: of the app's own process
   * (`listProcesses`) or a drawn decision that waits for the viewer
   * (`listWaiting`). `comment` (at most 1000 characters) goes into its log.
   */
  completeTask(
    id: number,
    element: string,
    outcome: string,
    options?: { comment?: string },
  ): Promise<{ ok: true; process: PotokProcess } | PotokError>;
  /** The processes drawn in the group the viewer may start by hand. */
  listStartable(): Promise<{ ok: true; processes: PotokStartable[] } | PotokError>;
  /**
   * Opens Potok's Start dialog of one, over the app, with `prefill` (by
   * attribute, or `title` and `text`) written in for the viewer to change.
   */
  openProcessStart(
    id: number,
    options?: { prefill?: Record<string, unknown> },
  ): Promise<{ ok: true } | PotokError>;
  /**
   * Gets word when what waits for the viewer changed: read it again with
   * `listWaiting`. Returns a function that removes the listener.
   */
  onWaiting(listener: () => void): () => void;
  /**
   * Gets every new value of this app, also the viewer's own; with
   * `{scope: "group"}` also those of the group's other apps. Returns a
   * function that removes the listener.
   */
  onNewValue<T extends object = PotokData>(
    listener: (value: PotokValue<T>) => void,
    options?: { scope?: "group" },
  ): () => void;
  /** How a map is drawn: tiles, where it opens, every pin, and what the viewer may do on it. */
  getMapConfig(): Promise<({ ok: true } & PotokMapConfig) | PotokError>;
  /** The sub-groups right under this group that the viewer sees and that have a place, up to 2000. */
  listPlaces(): Promise<{ ok: true; places: PotokPlace[]; truncated: boolean } | PotokError>;
  /**
   * With a view: all the places of a map of up to 2000 (`mode: "all"`), or
   * what a bigger map shows in the view, gathered by Potok (`mode: "view"`).
   * Ask again when the view moves; a view slower than 4 seconds is `timeout`.
   */
  listPlaces(view: PotokPlacesQuery): Promise<PotokPlacesAll | PotokPlacesView | PotokError>;
  /**
   * The places whose pins stand inside `bounds`, edges included, by name, at
   * most 50: what a cluster holds that the map cannot spread any further.
   */
  listPlacesAt(
    bounds: PotokBounds,
    options?: { search?: string; pins?: string[] },
  ): Promise<{ ok: true; places: PotokPlace[]; has_more: boolean } | PotokError>;
  /**
   * The borders of areas and the lines of routes among `listPlaces` (at most
   * 100 ids), simplified for `zoom`; `level` is the zoom they were simplified
   * for (6, 8, 10, 12, 14 or 16). Keep them by `id`, `v` and `level`.
   */
  placeShapes(
    ids: number[],
    zoom: number,
  ): Promise<{ ok: true; level: number; shapes: PotokPlaceShape[] } | PotokError>;
  /** Makes a sub-group where the viewer tapped; needs `can_create_places`. */
  createPlace(attrs: PotokPlaceAttrs): Promise<{ ok: true; place: PotokPlace } | PotokError>;
  /**
   * Opens a sub-group's description on Potok's page, over the app, with a link
   * to the group. Its own app, a form or a poll, runs there with that group's
   * rights. Only for a sub-group right under this group.
   */
  showGroup(id: number): Promise<{ ok: true } | PotokError>;
  /** Gets the id of the group whose description the viewer closed. Returns a function that removes the listener. */
  onGroupSheetClose(listener: (id: number) => void): () => void;
  /**
   * Called when a sub-group of this group was made, changed or deleted, with
   * no more said: read again what the app shows. Returns a function that
   * removes the listener.
   */
  onSubgroupsChange(listener: () => void): () => void;
};

/** Legacy API (`#group-panel-description`.potok). */
export type PotokApi = {
  readonly el: HTMLElement;
  abortController: AbortController;
  /** `{signal}` of `abortController`; set by the build wrapper and by installDevPotok. */
  eventListenerOptions: AddEventListenerOptions;
  /** `content` is a JSON object as a string; anything but a string is sent as "". */
  insertGroupValue<T extends object = PotokData>(
    content: string,
    options?: { contentFormat?: PotokContentFormat },
  ): Promise<{ ok: true; value: PotokValue<T> } | PotokError>;
  updateGroupDescription(
    description: string,
    options?: { descriptionFormat?: PotokContentFormat },
  ): Promise<{ ok: true; group: PotokGroupDescription } | PotokError>;
  getGroupDescription(): Promise<{
    description: string;
    descriptionFormat: PotokContentFormat;
  }>;
  /** With `limit`: one page (at most 200 values). */
  getGroupDataValues<T extends object = PotokData>(
    options: PotokListOptions & { limit: number },
  ): Promise<{ ok: true; values: PotokListedValue<T>[]; has_more: boolean } | PotokError>;
  /** Without `limit`: every value (fetched in pages of 200, up to 5000). */
  getGroupDataValues<T extends object = PotokData>(
    options?: Omit<PotokListOptions, "limit" | "offset">,
  ): Promise<{ ok: true; values: PotokListedValue<T>[] } | PotokError>;
  getCurrentProfile(): Promise<PotokProfile | null>;
  /** Replaces the previous callback; it receives a `phx:new_data_value` event. */
  setNewValueCallback<T extends object = PotokData>(
    callback: (event: CustomEvent<PotokValue<T>>) => void,
  ): void;
};

declare global {
  const potok: PotokApi;

  interface Window {
    potok: PotokSdk;
  }
}

export {};
