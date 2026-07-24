FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY services/api/package.json services/api/
RUN npm ci --workspace services/api --include-workspace-root=false || npm install --workspace services/api
COPY services/api services/api
EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "services/api"]
