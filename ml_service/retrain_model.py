import pandas as pd
import joblib
import os
import io
from pymongo import MongoClient
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime

load_dotenv(dotenv_path="./.env")

def get_database():
    mongo_url = os.getenv("mongo_url")
    if not mongo_url:
        raise ValueError("Mongo_url not found")
    
    client = MongoClient(mongo_url)
    
    try:
        db = client.get_database()
    except:
        db = client['test'] 
    return db

def retrain_pipeline():
    print("🚀 Starting Retraining Pipeline...")

    try:
        base_path = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(base_path, "parking_synthetic_data.csv")
        synthetic_df = pd.read_csv(csv_path)
    except FileNotFoundError:
        return {"status": "error", "message": "Synthetic data CSV not found"}

    db = get_database()
    real_data_cursor = db.pricingdatasets.find({"wasBooked": True})
    real_data_list = list(real_data_cursor)
    
    real_df = pd.DataFrame()
    if len(real_data_list) > 0:
        temp_df = pd.DataFrame(real_data_list)
        real_df = temp_df[['hourOfDay', 'dayOfWeek', 'isWeekend', 'occupancyRate', 'finalPrice']].copy()
        real_df.rename(columns={
            'hourOfDay': 'hour_of_day',
            'dayOfWeek': 'day_of_week',
            'isWeekend': 'is_weekend',
            'occupancyRate': 'occupancy_rate',
            'finalPrice': 'price'
        }, inplace=True)
        real_df['is_weekend'] = real_df['is_weekend'].astype(int)

    combined_df = pd.concat([synthetic_df, real_df], ignore_index=True)
    
    X = combined_df[['hour_of_day', 'day_of_week', 'is_weekend', 'occupancy_rate']]
    y = combined_df['price']
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    buffer = io.BytesIO()
    joblib.dump(model, buffer)
    model_binary = buffer.getvalue()
    
    db.ml_models.replace_one(
        {"model_name": "pricing_v1"},
        {
            "model_name": "pricing_v1",
            "data": model_binary,
            "updated_at": datetime.utcnow(),
            "samples_count": len(combined_df)
        },
        upsert=True
    )
    
    print("Model saved to MongoDB successfully.")
    return {"status": "success", "samples": len(combined_df)}

if __name__ == "__main__":
    retrain_pipeline()