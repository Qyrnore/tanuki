from functools import lru_cache
from pymongo import MongoClient
from django.conf import settings

@lru_cache
def get_db():
    """Return a cached PyMongo Database handle."""
    client = MongoClient(settings.MONGO_URI, uuidRepresentation="standard")
    return client[settings.MONGO_DB]
