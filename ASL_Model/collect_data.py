import cv2
import mediapipe as mp
import numpy as np
import os

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1)
mp_draw = mp.solutions.drawing_utils

SAVE_PATH = "my_data"

os.makedirs(SAVE_PATH, exist_ok=True)

cap = cv2.VideoCapture(0)

current_label = None
count = 0
target_count = 50

print("Press key (A/B/C...) to START collecting for that letter")

while True:
    success, img = cap.read()
    img = cv2.flip(img, 1)

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    result = hands.process(rgb)

    key = cv2.waitKey(1)

    if key == 27:
        break

    if key != -1:
        label = chr(key).upper()
        if label.isalpha():
            current_label = label
            count = 0
            os.makedirs(f"{SAVE_PATH}/{label}", exist_ok=True)
            print(f"Collecting {label}...")

    if result.multi_hand_landmarks and current_label:
        for hand_landmarks in result.multi_hand_landmarks:

            mp_draw.draw_landmarks(img, hand_landmarks, mp_hands.HAND_CONNECTIONS)

            lm_list = []
            for lm in hand_landmarks.landmark:
                lm_list.extend([lm.x, lm.y, lm.z])

            if len(lm_list) == 63 and count < target_count:

                file_path = f"{SAVE_PATH}/{current_label}/{count}.npy"
                np.save(file_path, lm_list)

                count += 1
                print(f"{current_label}: {count}/{target_count}")

    cv2.imshow("Collect Data", img)

cap.release()
cv2.destroyAllWindows()