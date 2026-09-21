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

export function dockerWhaleIcon(): SVGSVGElement {
  return filledSvg('0 0 24 24', [
    // Body: rounded nose on the left, flat-ish back carrying the containers, a
    // small notch detail near the tail on the right.
    'M2 16c0-3 2.5-5.5 5.5-5.5h8c2 0 3.8 1 4.9 2.6.4-.3.8-.8 1-1.3.3.7.2 1.5-.2 2.1.6.2 1.3.2 1.9-.1-.3.8-1 1.4-1.9 1.6-1 2.4-3.4 4.1-6.2 4.1H7.5C4.5 21.5 2 19 2 16Z',
    // Three containers stacked on its back.
    'M7 9h2v4H7Z',
    'M10 9h2v4h-2Z',
    'M13 9h2v4h-2Z',
  ]);
}

export function githubIcon(): SVGSVGElement {
  return filledSvg('0 0 24 24', [
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
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
