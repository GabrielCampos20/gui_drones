FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "until nc -z db 5432; do echo 'Aguardando banco...'; sleep 2; done && npx prisma migrate deploy && npm run dev"]
