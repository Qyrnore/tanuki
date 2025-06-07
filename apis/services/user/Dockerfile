FROM denoland/deno:alpine
WORKDIR /app
COPY . .
RUN deno cache main.ts
ENV PORT=8010
CMD ["run", "--allow-net", "--allow-env", "main.ts"]
