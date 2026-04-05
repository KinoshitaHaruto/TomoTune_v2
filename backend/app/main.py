import logging
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv()

from app.api import songs, users, posts, spotify

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

app = FastAPI(title="TomoTune API")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],    
    allow_headers=["*"],
)

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TYPE_PICTURES_DIR = os.path.join(STATIC_DIR, "type_pictures")
DIST_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend", "dist")

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/type_pictures", StaticFiles(directory=TYPE_PICTURES_DIR), name="type_pictures")

# Include Routers
app.include_router(songs.router, prefix="/api", tags=["Songs & Likes"])
app.include_router(users.router, prefix="/api", tags=["Users & Diagnosis"])
app.include_router(posts.router, prefix="/api", tags=["Posts & Comments"])
app.include_router(spotify.router, prefix="/api", tags=["Spotify"])

# Mount frontend
if os.path.exists(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="dist")
else:
    logger.warning(f"'dist' folder not found at {DIST_DIR}.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
