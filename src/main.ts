if (import.meta.env.DEV) {
  const { installDevPotok } = await import('./potok-dev');
  installDevPotok();
}

const conatainer = document.querySelector('.app-main')! as HTMLDivElement;

conatainer.addEventListener('click', async (e) => {
  const profile = await potok.getCurrentProfile();
  console.log('click', profile);
  let x = e.offsetX;
  let y = e.offsetY;
  if (e.target instanceof HTMLImageElement) {
    x = e.target.parentElement!.offsetLeft;
    y = e.target.parentElement!.offsetTop;
    conatainer.removeChild(e.target.parentElement!);
  }
  const newEll = document.createElement('div');
  newEll.style.position = 'absolute';
  newEll.style.left = x + 'px';
  newEll.style.top = y + 'px';
  newEll.innerHTML = `<img src="${profile.profile_picture_url}" alt="potok" class="size-6 shrink-0 rounded-full border border-red-300 bg-base-100 object-cover shadow-sm">`;
  conatainer.appendChild(newEll);
  const app = potok.el;//document.querySelector('#group-panel-description')! as HTMLDivElement;
  const res = await potok.updateGroupDescription(app.children[0].innerHTML);
  console.debug("<#HOOK#> updateGroupDescription res", res);
}, potok.eventListenerOptions);
