FROM python:3.12-alpine
RUN apk add --no-cache gcc musl-dev linux-headers
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PYTHONUNBUFFERED=1 DJANGO_SETTINGS_MODULE=config.settings
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
