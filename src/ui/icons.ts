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

export function gearIcon(): SVGSVGElement {
  return svg('0 0 24 24', [
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
    'M19.4 13.5a7.4 7.4 0 0 0 0-3l2-1.4-2-3.4-2.3.9a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.6a7.5 7.5 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.4a7.4 7.4 0 0 0 0 3l-2 1.4 2 3.4 2.3-.9c.76.66 1.64 1.17 2.6 1.5l.5 2.6h4l.5-2.6a7.5 7.5 0 0 0 2.6-1.5l2.3.9 2-3.4-2-1.4Z',
  ]);
}

export function packageIcon(): SVGSVGElement {
  return svg('0 0 24 24', [
    'M12 2.5 3 7v10l9 4.5 9-4.5V7l-9-4.5Z',
    'M3 7l9 4.5 9-4.5',
    'M12 11.5V21',
  ]);
}

export function githubIcon(): SVGSVGElement {
  return svg('0 0 24 24', [
    'M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.65-.2.65-.5v-1.8c-2.65.6-3.2-1.15-3.2-1.15-.45-1.1-1.1-1.4-1.1-1.4-.9-.6.05-.6.05-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.85.1-.65.35-1.1.65-1.35-2.1-.25-4.3-1.05-4.3-4.65 0-1.05.35-1.9 1-2.55-.1-.25-.45-1.25.1-2.6 0 0 .85-.25 2.75 1a9.4 9.4 0 0 1 5 0c1.9-1.25 2.75-1 2.75-1 .55 1.35.2 2.35.1 2.6.65.65 1 1.5 1 2.55 0 3.6-2.2 4.4-4.3 4.65.35.3.65.9.65 1.8v2.65c0 .3.15.6.65.5A9.5 9.5 0 0 0 12 2.5Z',
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
