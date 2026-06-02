import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

X = []
y = []

# ===== LOAD KAGGLE DATA =====
kaggle_path = Path("landmarks")

for letter_folder in kaggle_path.iterdir():
    if letter_folder.is_dir():
        label = letter_folder.name

        for file in letter_folder.glob("*.npy"):
            data = np.load(file)
            X.append(data.flatten())
            y.append(label)

print("Kaggle data loaded")

# ===== LOAD YOUR DATA =====
my_path = Path("my_data")

for letter_folder in my_path.iterdir():
    if letter_folder.is_dir():
        label = letter_folder.name

        for file in letter_folder.glob("*.npy"):
            data = np.load(file)
            X.append(data.flatten())
            y.append(label)

print("My data loaded")

# ===== FINAL DATA =====
X = np.array(X)
y = np.array(y)

print("Total dataset:", X.shape)

# ===== ENCODE =====
le = LabelEncoder()
y_encoded = le.fit_transform(y)

# ===== SPLIT =====
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded,
    test_size=0.2,
    random_state=42,
    stratify=y_encoded
)

# ===== MODEL =====
model = RandomForestClassifier(
    n_estimators=300,
    random_state=42
)

model.fit(X_train, y_train)

# ===== EVALUATE =====
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)

print("Accuracy:", acc)

# ===== SAVE =====
joblib.dump(model, "asl_rf_model.pkl")
joblib.dump(le, "label_encoder.pkl")

print("Model saved!")