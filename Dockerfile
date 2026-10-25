FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.30.6-alpine AS runtime
# Pull current Alpine package patches at build time rather than only relying on
# however fresh the base image tag happens to be -- CVEs get published faster
# than any pinned tag gets rebuilt. Note this doesn't cover nginx itself: the
# nginx package in this image is built and versioned by the nginx project's
# own image, not sourced from Alpine's repos, so `apk upgrade` never bumps it
# -- an nginx CVE needs the base image TAG bumped (as just happened here,
# 1.30.5 -> 1.30.6), not just a rebuild against the same tag.
# Also drop curl -- it ships in the base nginx-alpine image but nothing here
# uses it (not a dependency of anything else installed, confirmed via `apk info
# --rdepends curl`; no HEALTHCHECK or shelled-out probe calls it either, the
# k8s liveness/readiness checks hit the container over HTTP directly). Removing
# it outright means its CVEs can't affect this image at all, rather than
# waiting on an Alpine branch backport or suppressing the finding.
RUN apk update && apk upgrade --no-cache && apk del curl
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
