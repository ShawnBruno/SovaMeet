import json
import sys

import joblib


model = joblib.load("asl_rf_model.pkl")
label_encoder = joblib.load("label_encoder.pkl")


for line in sys.stdin:
    try:
        data = json.loads(line)
        landmarks = data.get("landmarks", [])

        if len(landmarks) != 63:
            result = {
                "id": data.get("id"),
                "letter": ""
            }
        else:
            prediction = model.predict([landmarks])
            letter = label_encoder.inverse_transform(prediction)[0]
            result = {
                "id": data.get("id"),
                "letter": str(letter)
            }

        print(json.dumps(result), flush=True)

    except Exception as error:
        print(json.dumps({
            "id": None,
            "letter": "",
            "error": str(error)
        }), flush=True)
