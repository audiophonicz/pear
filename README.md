# PEAR

**P**lex **E**ntity **A**dded**A**t **R**elocator

A small browser-only tool for cleaning up Plex's "Recently Added" hub. Sign in
to Plex (or connect to a server manually), browse what's recently added
across your Movie and TV libraries, select one or more items, and push their
`addedAt` timestamp back — either by a number of days or to an exact date —
so they drop out of "Recently Added" without touching the file itself.

## Credit

PEAR is a companion to [PASTA](https://github.com/cglatot/pasta), cglatot's
excellent audio/subtitle track tool for Plex. PEAR borrows PASTA's general
shape (a browser-only app that signs in to plex.tv and talks directly to
your Plex Media Server, no backend required) but is an independent
implementation with its own codebase, stack, and UI. If you like PEAR,
go check out PASTA too.

## How it works

PEAR runs entirely in your browser. There is no backend server beyond a
static file host — the app calls `plex.tv` for sign-in and your Plex Media
Server directly for everything else, the same way Plex Web itself does.
Nothing is sent to any third party.

Two ways to connect:

- **Sign in with Plex** — standard PIN-based OAuth flow, then pick a
  discovered server (with a "prefer local address" option, same idea as
  connecting from Plex Web on your home network).
- **Connect manually** — type a server address and an `X-Plex-Token`
  directly, for servers that don't show up in discovery (custom domains,
  relay-only, firewalled, etc).

## Development

Requires Node 20+.

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build locally
```

## Running it

### Docker

```bash
docker compose up -d
```

or build/run directly:

```bash
docker build -t pear .
docker run -d -p 8088:80 --name pear pear
```

### Kubernetes / K3s

See [`k8s/manifest.example.yaml`](k8s/manifest.example.yaml) for a starting
Deployment/Service/HTTPRoute (Gateway API) targeting a `pear-namespace`
namespace. PEAR is stateless — everything about your session (account token,
server, and connection preferences) lives in the browser's `localStorage` —
so no persistent volume is needed.

## Notes

- Relocating `addedAt` also locks the field (`addedAt.locked=1`) so a future
  library scan won't silently revert it back to the original added date.
- This edits Plex's own metadata for the item, not the file on disk — nothing
  about your media files changes.
