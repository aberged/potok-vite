
export type PotokApi = {
  el: HTMLElement;
  abortController: AbortController;
  getCurrentProfile: () => Promise<{
    profile_picture_url: string;
    username: string;
    [key: string]: any;
  }>;
  updateGroupDescription: (html: string) => Promise<{
    description: string;
    descriptionFormat: "html" | "markdown";
  }>;
  getGroupDescription: () => Promise<{
    description: string;
    descriptionFormat: "html" | "markdown";
  }>;
  insertGroupValue: (value: any) => void;
  getGroupDataValues: () => Promise<{
    id: number;
    content: string;
    content_format: "mardown" | "html";
    is_data: boolean;
    group_id: number;
    parent_id: number;
    creator_id: number;
    creator_username: string;
  }>;
  setNewValueCallback: (callback: (value: any) => void) => void;
  eventListenerOptions: AddEventListenerOptions;
};

declare global {
  const potok: PotokApi;
}

export {};