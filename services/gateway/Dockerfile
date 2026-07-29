# Build context is the repo root — see services/nutrition-api/Dockerfile for the
# reasoning behind the manifest-only deps layer.
#   docker build -f services/gateway/Dockerfile -t foodsnap-gateway .

FROM node:24-alpine AS deps
WORKDIR /repo
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/mobile/package.json apps/mobile/
COPY packages/food-classifier/package.json packages/food-classifier/
COPY packages/shared/package.json packages/shared/
COPY services/gateway/package.json services/gateway/
COPY services/nutrition-api/package.json services/nutrition-api/
RUN yarn workspaces focus @foodsnap/gateway

FROM deps AS build
WORKDIR /repo
COPY packages/shared packages/shared
COPY services/gateway services/gateway
RUN yarn workspace @foodsnap/gateway build

FROM deps AS runtime
ENV NODE_ENV=production
WORKDIR /repo
RUN yarn workspaces focus @foodsnap/gateway --production && yarn cache clean
COPY --from=build /repo/services/gateway/dist services/gateway/dist

USER node
EXPOSE 8080
CMD ["node", "services/gateway/dist/index.js"]
