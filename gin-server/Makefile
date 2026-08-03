.PHONY: dev test lint infra-up infra-down stack-up stack-down migrate-up migrate-down

dev:
	go run ./cmd/api

test:
	go test ./...

lint:
	go vet ./...

infra-up:
	docker compose up -d postgres redis

infra-down:
	docker compose down

stack-up:
	docker compose up -d --build

stack-down:
	docker compose down

migrate-up:
	go run ./cmd/migrate -direction up

migrate-down:
	go run ./cmd/migrate -direction down -steps 1
