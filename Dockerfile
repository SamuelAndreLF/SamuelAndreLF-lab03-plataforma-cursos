# better-sqlite3 é um módulo nativo: precisa compilar na imagem.
# Por isso a build acontece numa etapa com as ferramentas de compilação, e só
# o resultado vai para a imagem final — que fica bem menor.
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
# O banco fica num volume para não sumir quando o contêiner for recriado.
VOLUME /app/dados
ENV DB_FILE=/app/dados/cursos.db
EXPOSE 3000
CMD ["node", "src/server.js"]
