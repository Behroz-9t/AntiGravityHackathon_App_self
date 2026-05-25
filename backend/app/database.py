import hashlib
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from bson.objectid import ObjectId

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "testingantigravityapp")

try:
    import certifi
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
except ImportError:
    client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users_collection = db["users"]
providers_collection = db["providers"]

def init_db():
    try:
        users_collection.create_index("email", unique=True)
        users_collection.create_index("phone", unique=True)
        providers_collection.create_index("id", unique=True)
        print("[OK] MongoDB initialized with users and unique providers indices")

        # Seed providers if empty so availability is tracked in DB
        if providers_collection.count_documents({}) == 0:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            mock_file = os.path.join(base_dir, "mock_data", "providers.json")
            if os.path.exists(mock_file):
                import json
                with open(mock_file, "r", encoding="utf-8") as f:
                    docs = json.load(f)
                    if isinstance(docs, list) and docs:
                        providers_collection.insert_many(docs)
                        print(f"[OK] Seeded {len(docs)} providers into MongoDB")
            else:
                print(f"[ERROR] Seed file not found at {mock_file}")
    except Exception as e:
        print(f"[ERROR] MongoDB initialization error: {e}")


def get_all_providers():
    try:
        return list(providers_collection.find({}, {"_id": 0}))
    except Exception as e:
        print(f"[ERROR] MongoDB providers read error: {e}")
        return []


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def create_user(name: str, email: str, phone: str, password_raw: str):
    try:
        hashed = hash_password(password_raw)
        user_doc = {
            "name": name,
            "email": email,
            "phone": phone,
            "password": hashed
        }
        result = users_collection.insert_one(user_doc)
        user_id = str(result.inserted_id)
        return {
            "success": True,
            "user": {
                "id": user_id,
                "name": name,
                "email": email,
                "phone": phone
            }
        }
    except DuplicateKeyError as e:
        err_str = str(e).lower()
        if "email" in err_str:
            return {"success": False, "error": "An account with this email already exists."}
        if "phone" in err_str:
            return {"success": False, "error": "An account with this phone number already exists."}
        return {"success": False, "error": "Registration failed: User already exists."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def authenticate_user(identifier: str, password_raw: str):
    try:
        hashed = hash_password(password_raw)
        user = users_collection.find_one({
            "$or": [
                {"phone": identifier},
                {"email": identifier}
            ],
            "password": hashed
        })

        if user:
            return {
                "success": True,
                "user": {
                    "id": str(user["_id"]),
                    "name": user["name"],
                    "email": user["email"],
                    "phone": user["phone"]
                }
            }
        return {"success": False, "error": "Invalid phone/email or password."}
    except Exception as e:
        return {"success": False, "error": str(e)}

def update_provider_availability(provider_id: str, available: bool):
    try:
        providers_collection.update_one({"id": provider_id}, {"$set": {"available": available}})
        print(f"[OK] Provider {provider_id} availability set to {available}")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to update provider {provider_id} availability: {e}")
        return False

init_db()
