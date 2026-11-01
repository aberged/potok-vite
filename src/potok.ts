// Types for the API that potok-ide exposes to apps (potok-ide:
// assets/js/potok_app_sdk.js, server side in GroupLive.Show.AppApi).
//
// The app runs in a sandboxed iframe that has two APIs:
// - `potok` (legacy): `#group-panel-description`.potok, which the build
//   wrapper in vite.config.ts hands to the app code as a local `potok`;
// - `window.potok`: the newer SDK (insertValue, listValues, onNewValue, ...).

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
    | "unknown_method"
    | "preview"
    | "disconnected";
  message?: string;
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
};

/** A data value as listed; timestamps are ISO 8601 strings. */
export type PotokListedValue<T extends object = PotokData> = PotokValue<T> & {
  inserted_at: string;
  updated_at: string;
};

export type PotokListOptions = {
  /** Page size, at most 200 (the server's default is 50). */
  limit?: number;
  offset?: number;
  /** Only values with a greater id. */
  afterId?: number;
  /** Only values with a smaller id. */
  beforeId?: number;
  /** Key in `data` that must contain `searchValue` (case-insensitive). */
  searchField?: string;
  searchValue?: string;
  /** Key in `data` to order by; without it values come in insertion order. */
  orderBy?: string;
  orderDir?: "asc" | "desc";
};

export type PotokProfile = {
  id: number;
  username: string;
  profile_picture_url: string;
  description: string | null;
  description_format: PotokContentFormat;
  sharing: "unique" | "shared";
  inserted_at: string;
  updated_at: string;
  admin: boolean;
  /** Names of the roles the profile holds in the group. */
  roles: string[];
};

export type PotokGroupDescription = {
  id: number;
  description: string;
  description_format: PotokContentFormat;
};

/** `window.potok`. Calls reject if the page does not answer within 10s. */
export type PotokSdk = {
  insertValue<T extends object = PotokData>(
    data: T | string,
    options?: { contentFormat?: PotokContentFormat },
  ): Promise<{ ok: true; value: PotokValue<T> } | PotokError>;
  listValues<T extends object = PotokData>(
    options?: PotokListOptions,
  ): Promise<{ ok: true; values: PotokListedValue<T>[]; has_more: boolean } | PotokError>;
  updateDescription(
    description: string,
    options?: { descriptionFormat?: PotokContentFormat },
  ): Promise<{ ok: true; group: PotokGroupDescription } | PotokError>;
  getDescription(): Promise<{ ok: true; group: PotokGroupDescription } | PotokError>;
  getCurrentProfile(): Promise<PotokProfile | null>;
  /** Returns a function that removes the listener. */
  onNewValue<T extends object = PotokData>(listener: (value: PotokValue<T>) => void): () => void;
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
