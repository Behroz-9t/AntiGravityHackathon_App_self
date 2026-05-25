import json
import os
from dotenv import load_dotenv
from pymongo import MongoClient

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'testingantigravityapp')

try:
    import certifi
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
except ImportError:
    client = MongoClient(MONGO_URI)
db = client[DB_NAME]
providers = db['providers']

json_path = os.path.join(BASE_DIR, 'app', 'mock_data', 'providers.json')

with open(json_path, 'r', encoding='utf-8') as f:
    documents = json.load(f)

if not isinstance(documents, list):
    raise SystemExit('providers.json must contain a top-level JSON array')

print(f'Loaded {len(documents)} provider documents from {json_path}')

providers.delete_many({})
result = providers.insert_many(documents)
print(f'Inserted {len(result.inserted_ids)} providers into MongoDB collection "providers"')
