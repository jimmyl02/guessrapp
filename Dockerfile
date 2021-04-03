FROM node:14.16.0-buster-slim AS build
WORKDIR /app

COPY . .

RUN yarn install --frozen-lockfile && yarn cache clean
RUN yarn build

FROM node:14.16.0-buster-slim AS run
WORKDIR /app

COPY --from=build /app/yarn.lock /app/package.json /app/
COPY --from=build /app/packages/client/package.json /app/packages/client/package.json
COPY --from=build /app/packages/server/package.json /app/packages/server/package.json

ENV NODE_ENV production
RUN yarn install --prod --frozen-lockfile && yarn cache clean

COPY --from=build /app/dist /app/dist

CMD ["node", "--unhandled-rejections=strict", "/app/dist/server/dist/index.js"]