FROM golang:1.23-alpine AS builder

WORKDIR /src
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/xingyao-cloud ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/xingyao-migrate ./cmd/migrate

FROM alpine:3.21
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /out/xingyao-cloud /usr/local/bin/xingyao-cloud
COPY --from=builder /out/xingyao-migrate /usr/local/bin/xingyao-migrate
COPY migrations /app/migrations
WORKDIR /app
USER app
EXPOSE 8080
CMD ["xingyao-cloud"]
