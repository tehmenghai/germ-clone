from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.auth import SESSION_SECRET_KEY
from app.routes import ask, profiles, session, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_dotenv()
    yield


app = FastAPI(title="germ//clone backend", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3007",   # Next.js dev server
        "http://localhost:8080",   # test UI served via python -m http.server
        # "null" (file:// origin) intentionally NOT allowed — credentialed CORS from
        # a locally-opened HTML file is a known-bad combination (issue #28).
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Backs the passphrase-gate session cookie (app/auth.py, app/routes/session.py).
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET_KEY, same_site="lax")

app.include_router(session.router)
app.include_router(ask.router)
app.include_router(settings.router)
app.include_router(profiles.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
