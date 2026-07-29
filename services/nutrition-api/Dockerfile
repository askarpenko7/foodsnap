# Build context is the repo root — the service depends on @foodsnap/shared, and
# Yarn needs the workspace root manifest plus the lockfile to resolve anything.
#   docker build -f services/nutrition-api/Dockerfile -t foodsnap-nutrition-api .

FROM node:24-alpine AS deps
WORKDIR /repo
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
# Manifests only, so editing source doesn't invalidate the install layer.
# Every workspace manifest is needed for Yarn to read the workspace graph, but
# `workspaces focus` then installs just this service's subtree — React Native
# never lands in a backend image.
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/mobile/package.json apps/mobile/
COPY packages/food-classifier/package.json packages/food-classifier/
COPY packages/shared/package.json packages/shared/
COPY services/gateway/package.json services/gateway/
COPY services/nutrition-api/package.json services/nutrition-api/
RUN yarn workspaces focus @foodsnap/nutrition-api

FROM deps AS build
WORKDIR /repo
COPY packages/shared packages/shared
COPY services/nutrition-api services/nutrition-api
RUN yarn workspace @foodsnap/nutrition-api build

# tsup bundles our own code and inlines foods.json, so the runtime image needs
# only the third-party packages this service imports at run time.
FROM deps AS runtime
ENV NODE_ENV=production
WORKDIR /repo
RUN yarn workspaces focus @foodsnap/nutrition-api --production && yarn cache clean
COPY --from=build /repo/services/nutrition-api/dist services/nutrition-api/dist

# node:alpine ships an unprivileged `node` user; nothing here needs root.
USER node
EXPOSE 3001
# Exec form on purpose: PID 1 is node itself, so SIGTERM reaches the shutdown
# handler in index.ts and in-flight requests get to finish.
CMD ["node", "services/nutrition-api/dist/index.js"]
