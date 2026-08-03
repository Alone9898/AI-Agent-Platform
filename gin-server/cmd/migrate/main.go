package main

import (
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/joho/godotenv"
)

func main() {
	direction := flag.String("direction", "up", "migration direction: up or down")
	steps := flag.Int("steps", 0, "number of migrations; 0 applies all pending migrations")
	source := flag.String("source", "file://migrations", "migration source URL")
	flag.Parse()
	_ = godotenv.Load()

	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		dsn = "postgres://xingyao:xingyao_dev_password@localhost:5432/xingyao?sslmode=disable"
	}

	runner, err := migrate.New(*source, dsn)
	if err != nil {
		fail("create migration runner", err)
	}
	defer runner.Close()

	switch *direction {
	case "up":
		if *steps > 0 {
			err = runner.Steps(*steps)
		} else {
			err = runner.Up()
		}
	case "down":
		if *steps <= 0 {
			fail("run migration", errors.New("down migration requires -steps greater than 0"))
		}
		err = runner.Steps(-*steps)
	default:
		fail("run migration", fmt.Errorf("unsupported direction %q", *direction))
	}

	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		fail("run migration", err)
	}
	slog.Info("database migrations complete", "direction", *direction, "steps", *steps)
}

func fail(operation string, err error) {
	slog.Error(operation, "error", err)
	os.Exit(1)
}
