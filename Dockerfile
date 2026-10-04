# syntax=docker/dockerfile:1

# ───── build ─────
# Nuxt 4 pede Node ^22.19; "slim" (glibc) evita problema de binário nativo que o alpine dá.
FROM node:22-slim AS build
WORKDIR /app

# o postinstall (`nuxt prepare`) precisa do código-fonte, por isso copia tudo antes do install
COPY . .
RUN npm ci

# URL e chave pública do Supabase vão pro navegador de qualquer jeito (não são segredo) e
# precisam existir NO BUILD: o nome do cookie de sessão é calculado a partir da URL.
ARG NUXT_PUBLIC_SUPABASE_URL
ARG NUXT_PUBLIC_SUPABASE_KEY
# NUXT_SUPABASE_SECRET_KEY aqui é só um marcador pra chave existir na config — o valor real
# entra em runtime (ver o fim do arquivo) e sobrescreve este.
ENV NUXT_PUBLIC_SUPABASE_URL=$NUXT_PUBLIC_SUPABASE_URL \
    NUXT_PUBLIC_SUPABASE_KEY=$NUXT_PUBLIC_SUPABASE_KEY \
    NUXT_SUPABASE_SECRET_KEY=definir-em-runtime

RUN npm run build

# ───── runtime ─────
# O .output do Nuxt é autossuficiente (já leva as dependências que usa) — não precisa de node_modules.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=build --chown=node:node /app/.output ./.output

USER node
EXPOSE 3000

# Segredos entram como variável de ambiente do container, nunca na imagem:
#   NUXT_SUPABASE_SECRET_KEY  — service role key do Supabase (extração e link de dados do Power BI)
#   ANTHROPIC_API_KEY         — extração de foto/PDF
CMD ["node", ".output/server/index.mjs"]
