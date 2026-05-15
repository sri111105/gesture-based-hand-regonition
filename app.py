import cv2
import mediapipe as mp
import math
import numpy as np
from flask import Flask, render_template, Response
from flask_socketio import SocketIO
import threading
import time

import json
import os

app = Flask(__name__, static_folder='static', template_folder='templates')
QUESTIONS_FILE = 'questions.json'

def load_questions():
    if os.path.exists(QUESTIONS_FILE):
        with open(QUESTIONS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_questions(questions):
    with open(QUESTIONS_FILE, 'w') as f:
        json.dump(questions, f, indent=4)
socketio = SocketIO(app, cors_allowed_origins="*")

mp_hands = mp.solutions.hands
mp_face_detection = mp.solutions.face_detection
mp_drawing = mp.solutions.drawing_utils

# PERFORMANCE OPTIMIZATION: Use lightweight model complexity (0) and max 1 hand
hands = mp_hands.Hands(
    model_complexity=0, 
    min_detection_confidence=0.6, 
    min_tracking_confidence=0.6, 
    max_num_hands=1
)
face_detection = mp_face_detection.FaceDetection(min_detection_confidence=0.6)

camera = cv2.VideoCapture(0)
# PERFORMANCE OPTIMIZATION: Lower resolution for faster processing
camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

if not camera.isOpened():
    print("WARNING: Cannot open camera.")

global_frame = None
lock = threading.Lock()

smoothed_x = 0.5
smoothed_y = 0.5
# PERFORMANCE OPTIMIZATION: Higher alpha = less lag, but still enough to remove jitter
alpha = 0.7 
is_pinched = False
pinch_threshold = 0.05

def check_action(index_tip, thumb_tip):
    global is_pinched
    distance = math.sqrt((index_tip.x - thumb_tip.x)**2 + (index_tip.y - thumb_tip.y)**2)
    action = "move"
    current_pinched = distance < pinch_threshold
    
    if current_pinched and not is_pinched:
        action = "click"
    is_pinched = current_pinched
    return action

def camera_task():
    global global_frame, smoothed_x, smoothed_y
    frame_count = 0
    face_warnings = []
    
W    while True:
        success, frame = camera.read()
        if not success:
            time.sleep(0.01)
            continue
            
        frame_count += 1
        frame = cv2.flip(frame, 1)
        
        # PERFORMANCE OPTIMIZATION: Only pass RGB to MediaPipe (no need to copy if we use frame directly but OpenCV requires BGR->RGB)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb_frame.flags.writeable = False # Speeds up processing slightly
        
        # Apply face detection only every 10 frames to save CPU!
        if frame_count % 10 == 0:
            faces = face_detection.process(rgb_frame)
            face_warnings = []
            if faces.detections:
                if len(faces.detections) > 1:
                    face_warnings.append("Multiple faces detected! (Cheating alert)")
            else:
                face_warnings.append("No face detected! (Ensure face is visible)")
                
        results = hands.process(rgb_frame)
        rgb_frame.flags.writeable = True
        
        hand_warnings = []
        cursor_data = None
        
        if results.multi_hand_landmarks:
            hand_landmarks = results.multi_hand_landmarks[0]
            mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            
            index_tip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]
            thumb_tip = hand_landmarks.landmark[mp_hands.HandLandmark.THUMB_TIP]
            
            # Map raw coordinates to screen - adjusted for wider reach
            mapped_x = np.clip((index_tip.x - 0.1) / 0.8, 0, 1)
            mapped_y = np.clip((index_tip.y - 0.1) / 0.8, 0, 1)
            
            # Fast responsive smoothing
            smoothed_x = alpha * mapped_x + (1 - alpha) * smoothed_x
            smoothed_y = alpha * mapped_y + (1 - alpha) * smoothed_y
            
            action = check_action(index_tip, thumb_tip)
            
            cursor_data = {
                "x": smoothed_x,
                "y": smoothed_y,
                "action": action
            }
        else:
            hand_warnings.append("No hand! (Paused)")
            
        all_warnings = face_warnings + hand_warnings
        
        if cursor_data or all_warnings:
            socketio.emit('tracking_data', {
                'cursor': cursor_data,
                'warnings': all_warnings
            })
            
        y_pos = 30
        for w in all_warnings:
            cv2.putText(frame, w, (10, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2, cv2.LINE_AA)
            y_pos += 30
            
        with lock:
            global_frame = frame.copy()
            
        # Tiny sleep to yield CPU quickly but allow 60+ internal FPS
        time.sleep(0.005)

# Start background camera directly
threading.Thread(target=camera_task, daemon=True).start()

def generate_frames():
    global global_frame
    while True:
        with lock:
            if global_frame is None:
                current_frame = None
            else:
                current_frame = global_frame.copy()
                
        if current_frame is not None:
            # Compress image with lower quality for fast streaming to UI
            ret, buffer = cv2.imencode('.jpg', current_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        # Stream at roughly 30 API frames to keep video feed smooth but reduce network overhead
        time.sleep(0.033)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/questions', methods=['GET'])
def get_questions():
    return {"questions": load_questions()}

@app.route('/api/questions', methods=['POST'])
def add_question():
    from flask import request
    data = request.json
    questions = load_questions()
    questions.append(data)
    save_questions(questions)
    return {"status": "success"}

@app.route('/api/questions/delete', methods=['POST'])
def delete_question():
    from flask import request
    data = request.json
    qid = data.get('id')
    questions = load_questions()
    # Filter out the question with the matching ID
    new_questions = [q for q in questions if q.get('id') != qid]
    if len(new_questions) < len(questions):
        save_questions(new_questions)
        return {"status": "success"}
    return {"status": "error", "message": "Question not found"}, 404

@app.route('/api/questions/clear', methods=['POST'])
def clear_questions():
    save_questions([])
    return {"status": "success"}

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000, host='0.0.0.0', use_reloader=False, allow_unsafe_werkzeug=True)
