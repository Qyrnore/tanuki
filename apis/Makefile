# build every image, start detached
up:
	docker compose up -d

up-build:
	docker compose up -d --build

up-build-no-cache:
	docker compose up -d --build --no-cache

# stop & remove containers + anon volumes
down:
	docker compose down -v

# tail logs
logs:
	docker compose logs -f --tail=100

# run Django migrations after first boot
migrate:
	docker compose exec item      python manage.py migrate
	docker compose exec analysis  python manage.py migrate
