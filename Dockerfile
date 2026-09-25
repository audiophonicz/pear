FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.30.5-alpine AS runtime
# Pull current Alpine package patches at build time rather than only relying on
# however fresh the base image tag happens to be -- CVEs get published faster
# than any pinned tag gets rebuilt.
RUN apk update && apk upgrade --no-cache
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
