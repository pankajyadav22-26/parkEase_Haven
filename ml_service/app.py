from flask import Flask, request, jsonify
import joblib
import io
import os
import pandas as pd
from retrain_model import retrain_pipeline, get_database

app = Flask(__name__)

model = None

def load_model():
    global model
    try:
        db = get_database()
        doc = db.ml_models.find_one({"model_name": "pricing_v1"})
        
        if doc:
            print("Loading model from MongoDB...")
            buffer = io.BytesIO(doc['data'])
            model = joblib.load(buffer)
        else:
            print("No model found in DB. Please run /retrain first.")
            model = None
    except Exception as e:
        print(f"Error loading model: {e}")

load_model()

@app.route('/predict_price', methods=['POST'])
def predict_price():
    if not model:
        return jsonify({"status": "error", "message": "Model not loaded. Train first."}), 503

    try:
        data = request.get_json()
        
        features_df = pd.DataFrame([{
            'hour_of_day': data['hour'],
            'day_of_week': data['day_of_week'],
            'is_weekend': data['is_weekend'],
            'occupancy_rate': data['occupancy']
        }])

        predicted_price = model.predict(features_df)[0]

        return jsonify({"status": "success", "predicted_price": round(predicted_price, 2)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/retrain', methods=['POST'])
def trigger_retrain():
    result = retrain_pipeline()
    if result['status'] == 'success':
        load_model()
    return jsonify(result)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port)