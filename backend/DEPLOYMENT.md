# Backend Deployment Guide

This backend is a FastAPI application with MongoDB support.

## Deploy targets
- Docker container
- Heroku / Railway / Render using `Procfile`
- Any host that supports Python and environment variables

## Required environment variables
- `MONGO_URI` - MongoDB connection string
- `DB_NAME` - MongoDB database name
- Optional: `PORT` for the web server (default `8000`)

Example `.env`:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=testingantigravityapp
PORT=8000
```

## Build and run locally
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Docker build and run
```bash
cd backend
docker build -t antigravity-backend .
docker run -d -p 8000:8000 \
  -e MONGO_URI="your-mongo-uri" \
  -e DB_NAME="antigravity" \
  -e PORT=8000 \
  antigravity-backend
```

## Heroku / Render / Railway
The `Procfile` already declares the web command:
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Notes
- Ensure `MONGO_URI` is set in the deployment environment.
- The backend reads environment variables automatically using `python-dotenv`.
- The app falls back to the local `backend/app/mock_data/providers.json` if the database provider collection is empty.

## Seed providers JSON into MongoDB
If you are deploying to a new MongoDB instance, run this locally before using the app:
```bash
cd backend
venv\Scripts\python.exe load_providers.py
```

This script loads `app/mock_data/providers.json` into the MongoDB `providers` collection.
