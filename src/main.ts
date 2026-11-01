import type { PotokError, PotokValue } from './potok';

if (import.meta.env.DEV) {
  const { installDevPotok } = await import('./potok-dev');
  installDevPotok();
}

// Demo: every click is a data value, and each member's avatar sits where they
// clicked last. Values cannot be changed or deleted, so the state is derived
// from all of them.
//
// No top-level await below this point: the build wrapper (vite.config.ts)
// runs this code inside a plain function.

type Click = { x: number; y: number; picture: string };

const container = document.querySelector<HTMLDivElement>('.app-main')!;
const status = document.querySelector<HTMLParagraphElement>('.app-status')!;
const avatars = new Map<number, { img: HTMLImageElement; id: number }>();
const profile = potok.getCurrentProfile();

function showError(reply: PotokError) {
  status.textContent = reply.message ?? reply.error;
}

function createAvatar(value: PotokValue<Click>): HTMLImageElement {
  const img = document.createElement('img');
  img.className =
    'pointer-events-none absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white object-cover shadow transition-[left,top] duration-300';
  img.alt = value.creator_username ?? '';
  img.title = value.creator_username ?? '';
  container.appendChild(img);
  return img;
}

function placeAvatar(value: PotokValue<Click>) {
  if (!value.data) return;

  // The list and the callback can overlap; an older click must not win.
  const known = avatars.get(value.creator_id);
  if (known && known.id >= value.id) return;

  const img = known?.img ?? createAvatar(value);
  avatars.set(value.creator_id, { img, id: value.id });
  img.src = value.data.picture;
  img.style.left = `${value.data.x}px`;
  img.style.top = `${value.data.y}px`;
}

async function load() {
  // Subscribe first so that no click is missed while the list loads.
  potok.setNewValueCallback<Click>((event) => placeAvatar(event.detail));

  const reply = await potok.getGroupDataValues<Click>();
  if (!reply.ok) {
    showError(reply);
    return;
  }

  reply.values.forEach(placeAvatar);
}

container.addEventListener('click', async (event) => {
  const current = await profile;
  if (!current) return;

  const rect = container.getBoundingClientRect();
  const click: Click = {
    x: Math.round(event.clientX - rect.left),
    y: Math.round(event.clientY - rect.top),
    picture: current.profile_picture_url,
  };

  // The avatar moves when the value comes back through the callback, as it
  // does for every other member.
  const reply = await potok.insertGroupValue(JSON.stringify(click));
  if (reply.ok) {
    status.textContent = '';
  } else {
    showError(reply);
  }
}, potok.eventListenerOptions);

void load();
