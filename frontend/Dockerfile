FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve@14.2.6
COPY --from=build /app/dist ./dist
ENV PORT=4173
EXPOSE 4173
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT}"]
