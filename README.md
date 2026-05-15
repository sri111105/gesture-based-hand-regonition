# Gesture-Based Hand Recognition Quiz System 🖐️🧠

A state-of-the-art, contactless quiz platform driven by artificial intelligence. This system uses computer vision to track hand gestures for interacting with the interface, and includes an anti-cheating mechanism through facial detection.

## 🚀 Features

- **Touchless Interface**: Navigate the quiz and make selections entirely using hand gestures.
- **Real-Time Hand Tracking**: Built on Google's MediaPipe for highly accurate and fast hand landmark detection.
- **Anti-Cheating Mechanisms**: Employs real-time face detection to monitor for multiple faces or a missing face, automatically raising alerts.
- **Teacher/Admin Dashboard**: Built-in REST APIs to dynamically add, delete, and clear quiz questions (`questions.json`).
- **Low Latency Video Streaming**: Utilizes Flask-SocketIO and optimized OpenCV video encoding to provide a real-time, smooth user experience.
- **Modern UI**: Clean and intuitive web interface.

## 🛠️ Tech Stack

- **Backend**: Python, Flask, Flask-SocketIO
- **Computer Vision**: OpenCV, MediaPipe (Hands & Face Detection)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Data Storage**: JSON (`questions.json`)

## 📂 Project Structure

```text
MINI ONE/
│
├── app.py                # Main Flask application and MediaPipe video processing logic
├── requirements.txt      # Python dependencies
├── questions.json        # Local storage for quiz questions
│
├── static/
│   ├── script.js         # Frontend logic for gesture interaction and SocketIO
│   └── style.css         # UI styling and layout
│
└── templates/
    └── index.html        # Main application webpage
```

## ⚙️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sri111105/GESTURE-BASED-HAND-RECOGNITION.git
   cd GESTURE-BASED-HAND-RECOGNITION
   ```

2. **Set up a virtual environment (Recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```

3. **Install the dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application:**
   ```bash
   python app.py
   ```

5. **Access the application:**
   Open your web browser and navigate to `http://localhost:5000`.

## 🎮 How to Use

1. Ensure your webcam is connected and the room is well-lit.
2. Grant camera permissions if prompted by your browser or OS.
3. Use your **Index Finger** to move the on-screen cursor.
4. **Pinch** your Index Finger and Thumb together to simulate a "click" action.
5. Answer questions and progress through the quiz hands-free!

## ⚠️ Notes on Performance

- The application uses `model_complexity=0` and downscales the video to `640x480` to ensure smooth tracking on standard hardware.
- Face detection only runs periodically (every 10 frames) to minimize CPU usage.

---
*Built with ❤️ utilizing Python and MediaPipe.*
