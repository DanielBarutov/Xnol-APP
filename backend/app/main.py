from fastapi import FastAPI

app = FastAPI(title="XNoll Finance API", version="1.0.0")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
