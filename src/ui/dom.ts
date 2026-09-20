// Tiny DOM helpers so the views don't hand-roll innerHTML string templates everywhere,
// which keeps user-supplied text (titles, server names) out of raw HTML injection paths.

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts: { class?: string; text?: string; attrs?: Record<string, string> } = {},
  children: (Node | null | undefined | false)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.text !== undefined) node.textContent = opts.text;
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  }
  for (const child of children) {
    if (child) node.appendChild(child);
  }
  return node;
}

export function mount(root: HTMLElement, view: Node): void {
  root.replaceChildren(view);
}

export function statusBanner(kind: 'error' | 'info', message: string): HTMLElement {
  return el('div', { class: `banner banner-${kind}`, text: message });
}
