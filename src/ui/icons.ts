// Small original line-icon set for the header toolbar. Hand-drawn paths, not
// sourced from any icon library or another project's asset.

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(viewBox: string, paths: string[]): SVGSVGElement {
  const node = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  node.setAttribute('viewBox', viewBox);
  node.setAttribute('width', '20');
  node.setAttribute('height', '20');
  node.setAttribute('fill', 'none');
  node.setAttribute('stroke', 'currentColor');
  node.setAttribute('stroke-width', '1.8');
  node.setAttribute('stroke-linecap', 'round');
  node.setAttribute('stroke-linejoin', 'round');
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    node.appendChild(path);
  }
  return node;
}

/** Solid-fill variant, for glyphs (brand marks) that are conventionally shown filled
 * rather than as a line icon -- a stroke outline distorts a path drawn for fill. */
function filledSvg(viewBox: string, paths: string[]): SVGSVGElement {
  const node = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  node.setAttribute('viewBox', viewBox);
  node.setAttribute('width', '20');
  node.setAttribute('height', '20');
  node.setAttribute('fill', 'currentColor');
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    node.appendChild(path);
  }
  return node;
}

export function gearIcon(): SVGSVGElement {
  return svg('0 0 24 24', [
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
    'M19.4 13.5a7.4 7.4 0 0 0 0-3l2-1.4-2-3.4-2.3.9a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.6a7.5 7.5 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.4a7.4 7.4 0 0 0 0 3l-2 1.4 2 3.4 2.3-.9c.76.66 1.64 1.17 2.6 1.5l.5 2.6h4l.5-2.6a7.5 7.5 0 0 0 2.6-1.5l2.3.9 2-3.4-2-1.4Z',
  ]);
}

// Docker whale and GitHub octocat below are Font Awesome Free brand icons (the
// same ones PASTA itself uses -- its package.json depends on
// @fortawesome/fontawesome-free), reproduced exactly (CC BY 4.0) with our own
// color applied via currentColor rather than theirs.

export function dockerWhaleIcon(): SVGSVGElement {
  return filledSvg('0 0 640 512', [
    'M349.9 236.3h-66.1v-59.4h66.1v59.4zm0-204.3h-66.1v60.7h66.1V32zm78.2 144.8H362v59.4h66.1v-59.4zm-156.3-72.1h-66.1v60.1h66.1v-60.1zm78.1 0h-66.1v60.1h66.1v-60.1zm276.8 100c-14.4-9.7-47.6-13.2-73.1-8.4-3.3-24-16.7-44.9-41.1-63.7l-14-9.3-9.3 14c-18.4 27.8-23.4 73.6-3.7 103.8-8.7 4.7-25.8 11.1-48.4 10.7H2.4c-8.7 50.8 5.8 116.8 44 162.1 37.1 43.9 92.7 66.2 165.4 66.2 157.4 0 273.9-72.5 328.4-204.2 21.4.4 67.6.1 91.3-45.2 1.5-2.5 6.6-13.2 8.5-17.1l-13.3-8.9zm-511.1-27.9h-66v59.4h66.1v-59.4zm78.1 0h-66.1v59.4h66.1v-59.4zm78.1 0h-66.1v59.4h66.1v-59.4zm-78.1-72.1h-66.1v60.1h66.1v-60.1z',
  ]);
}

export function githubIcon(): SVGSVGElement {
  return filledSvg('0 0 496 512', [
    'M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z',
  ]);
}

export function helpIcon(): SVGSVGElement {
  return svg('0 0 24 24', [
    'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19Z',
    'M9.3 9a2.7 2.7 0 1 1 3.85 2.45c-.75.35-1.15.85-1.15 1.55v.5',
    'M12 17.2v.1',
  ]);
}

export function closeIcon(): SVGSVGElement {
  return svg('0 0 24 24', ['M6 6l12 12', 'M18 6 6 18']);
}

export function chevronDownIcon(): SVGSVGElement {
  return svg('0 0 24 24', ['M6 9l6 6 6-6']);
}

export function chevronLeftIcon(): SVGSVGElement {
  return svg('0 0 24 24', ['M15 5l-7 7 7 7']);
}

export function chevronRightIcon(): SVGSVGElement {
  return svg('0 0 24 24', ['M9 5l7 7-7 7']);
}

export function checkIcon(): SVGSVGElement {
  return svg('0 0 24 24', ['M5 12.5l4.5 4.5L19 7']);
}

export function serversIcon(): SVGSVGElement {
  return svg('0 0 24 24', [
    'M4 4.5h16v5H4z',
    'M4 14.5h16v5H4z',
    'M7.5 7h.01',
    'M7.5 17h.01',
  ]);
}

export function logoutIcon(): SVGSVGElement {
  return svg('0 0 24 24', [
    'M9.5 4.5h-4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h4',
    'M16 15.5l4-3.5-4-3.5',
    'M20 12H9.5',
  ]);
}
