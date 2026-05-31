from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="germ//clone backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3007"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Routes are registered here as each module is built:
# from app.routes import ask, settings, corpus
# app.include_router(ask.router)
# app.include_router(settings.router)
# app.include_router(corpus.router)
