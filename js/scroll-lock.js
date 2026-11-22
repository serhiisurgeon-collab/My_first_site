// Menu and search share one lock so closing either cannot unlock the other.
const owners = new Set();
let saved;

export function lockScroll(owner) {
  if (owners.has(owner)) return;
  if (!owners.size) {
    const body = document.body;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    saved = { x: window.scrollX, y: window.scrollY, style: body.getAttribute('style') };
    const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
    Object.assign(body.style, {
      position: 'fixed', top: `-${saved.y}px`, left: `-${saved.x}px`,
      width: '100%', overflow: 'hidden', paddingRight: `${padding + gap}px`,
    });
  }
  owners.add(owner);
}

export function unlockScroll(owner) {
  if (!owners.delete(owner) || owners.size || !saved) return;
  if (saved.style === null) document.body.removeAttribute('style');
  else document.body.setAttribute('style', saved.style);
  window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' });
  saved = undefined;
}
