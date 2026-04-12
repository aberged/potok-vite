import type { PotokApi } from './potok';

function createDescriptionHost(): HTMLElement {
  const existing = document.querySelector('#group-panel-description');
  if (existing instanceof HTMLElement) {
    return existing;
  }

  const host = document.createElement('div');
  host.id = 'group-panel-description';
  host.style.position = 'fixed';
  host.style.right = '0px';
  host.style.bottom = '0px';
  host.style.width = '100dvw';
  host.style.minHeight = '100dvh';
  host.innerHTML = document.body.innerHTML;
  while (document.body.children.length > 0) document.body.removeChild(document.body.children[0]);
  document.body.appendChild(host);

  return host;
}

export function installDevPotok(): PotokApi {
  const current = (globalThis as { potok?: PotokApi }).potok;
  if (current) {
    return current;
  }

  const abortController = new AbortController();
  const el = createDescriptionHost();
  let description = el.children[0]?.innerHTML ?? '';

  const potokApi: PotokApi = {
    el,
    abortController,
    async getCurrentProfile() {
      return {
        username: 'dev-user',
        profile_picture_url: 'https://api.dicebear.com/9.x/thumbs/svg?seed=potok-dev',
      };
    },
    async updateGroupDescription(html: string) {
      description = html;
      if (el.children[0] instanceof HTMLElement) {
        el.children[0].innerHTML = html;
      }

      return {
        description,
        descriptionFormat: 'html',
      };
    },
    async getGroupDescription() {
      return {
        description,
        descriptionFormat: 'html',
      };
    },
    insertGroupValue(value: unknown) {
      if (el.children[0] instanceof HTMLElement) {
        el.children[0].innerHTML += String(value);
        description = el.children[0].innerHTML;
      }
    },
    async getGroupDataValues() {
      return {
        id: 1,
        content: description,
        content_format: 'html',
        is_data: true,
        group_id: 1,
        parent_id: 0,
        creator_id: 1,
        creator_username: 'dev-user',
      };
    },
    eventListenerOptions: { signal: abortController.signal },
  };

  Object.defineProperty(globalThis, 'potok', {
    configurable: true,
    value: potokApi,
  });

  return potokApi;
}