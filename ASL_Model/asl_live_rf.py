import cv2
import mediapipe as mp
import numpy as np
import joblib
import time

def send_to_chat(text):
    print("SENDING:", text)

    # ===== SovaMeet integration =====

def send_live_text(text):
    print("LIVE:", text)

    # send to frontend as "typing preview"

# ===== LOAD MODEL =====
model = joblib.load("asl_rf_model.pkl")
label_encoder = joblib.load("label_encoder.pkl")

# ===== MEDIAPIPE =====
mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils

hands = mp_hands.Hands(
    max_num_hands=1,
    min_detection_confidence=0.7
)

# ===== CHAT SYSTEM =====
current_word = ""
chat_lines = []

last_letter = ""
last_time = time.time()
delay = 1.2   # letter delay
word_pause = 2.0

# ===== CAMERA =====
cap = cv2.VideoCapture(0)

while True:
    success, img = cap.read()
    img = cv2.flip(img, 1)

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    result = hands.process(rgb)

    detected_letter = ""
    hand_detected = False

    if result.multi_hand_landmarks:
        for hand_landmarks in result.multi_hand_landmarks:

            hand_detected = True

            # ===== EXTRACT LANDMARKS =====
            lm_list = []
            for lm in hand_landmarks.landmark:
                lm_list.extend([lm.x, lm.y, lm.z])

            # ===== PREDICT =====
            if len(lm_list) == 63:
                prediction = model.predict([lm_list])
                detected_letter = label_encoder.inverse_transform(prediction)[0]

            mp_draw.draw_landmarks(img, hand_landmarks, mp_hands.HAND_CONNECTIONS)

    # ===== LETTER ADD LOGIC =====
    if detected_letter != "":
        if detected_letter == last_letter and time.time() - last_time > delay:
            current_word += detected_letter
            send_live_text(current_word)
            last_time = time.time()
        last_letter = detected_letter
    else:
        last_letter = ""

    # ===== WORD COMPLETE =====
    if current_word != "" and time.time() - last_time > word_pause:
        chat_lines.append(f"[User] Shawn : {current_word}")
        send_to_chat(current_word)
        current_word = ""

    # ===== UI PANEL =====
    h, w, _ = img.shape
    canvas = cv2.copyMakeBorder(img, 0, 0, 0, 400,
                                cv2.BORDER_CONSTANT,
                                value=(30, 30, 30))

    y = 40

    cv2.putText(canvas, "ASL Chat",
                (w + 20, y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8,
                (255, 255, 255), 2)

    y += 60

    cv2.putText(canvas, f"Current: {current_word}",
                (w + 20, y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                (200, 200, 200), 2)

    y += 60

    for line in chat_lines[-6:]:
        cv2.putText(canvas, line,
                    (w + 20, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                    (255, 255, 255), 2)
        y += 40

    # ===== SHOW =====
    cv2.imshow("SovaMeet ASL (Final)", canvas)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()