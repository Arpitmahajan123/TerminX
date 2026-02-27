
# farmwise_api.py — Run with: uvicorn farmwise_api:app --reload
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pickle, json

app = FastAPI(title="FarmWise AI", version="1.0",
              description="AI-powered harvest optimization for Indian farmers")

# Load models at startup
with open("farmwise_models.pkl", "rb") as f:
    MODELS = pickle.load(f)

class PredictRequest(BaseModel):
    crop: str
    crop_age_days: int
    rain_forecast_pct: float
    humidity_pct: float
    price_current: float
    price_predicted_7d: float
    date: str = None
    storage_temp: float = 30
    transit_hrs: int = 4
    has_cold_chain: bool = False
    quantity_quintals: int = 10
    budget_per_quintal: int = 200
    language: str = "en"

@app.post("/predict")
async def predict(req: PredictRequest):
    """Full recommendation: harvest + market + spoilage + preservation"""
    result = farmwise_predict(**req.dict())
    return result

@app.get("/crops")
async def list_crops():
    """List all supported crops with their parameters"""
    return {"crops": list(MODELS["crop_db"].keys())}

@app.get("/markets")
async def list_markets():
    """List available markets"""
    return {"markets": MODELS["market_db"]}

@app.get("/health")
async def health():
    return {"status": "healthy", "models_loaded": True,
            "metrics": MODELS["metrics"]}
