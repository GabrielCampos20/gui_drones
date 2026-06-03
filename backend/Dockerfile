FROM node:20-alpine
WORKDIR /app

# Instalar Azul Zulu JRE 11 para executar o simulador Java
RUN apk add --no-cache wget \
    && wget -q https://cdn.azul.com/public_keys/alpine-signing@azul.com-5d5dc44c.rsa.pub -P /etc/apk/keys/ \
    && echo "https://repos.azul.com/zulu/alpine" >> /etc/apk/repositories \
    && apk add --no-cache zulu11-jre-headless \
    && apk del wget

ENV JAVA_HOME=/usr/lib/jvm/zulu11
ENV PATH="${JAVA_HOME}/bin:${PATH}"

COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "until nc -z db 5432; do echo 'Aguardando banco...'; sleep 2; done && npx prisma generate && npx prisma migrate deploy && npm run dev"]
