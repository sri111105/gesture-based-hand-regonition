const socket = io();

// UI Screens
const homeScreen = document.getElementById('home-screen');
const managementScreen = document.getElementById('management-screen');
const quizScreen = document.getElementById('quiz-screen');

// UI Elements
const cursor = document.getElementById('cursor');
const warningBox = document.getElementById('warning-box');
const warningList = document.getElementById('warning-list');
const questionText = document.getElementById('question-text');
const optionsGrid = document.getElementById('options-grid');
const scoreDisplay = document.getElementById('score-display');
const timeDisplay = document.getElementById('time-display');
const quizContent = document.getElementById('quiz-content');
const resultContent = document.getElementById('result-content');
const finalScoreDisplay = document.getElementById('final-score-display');
const restartBtn = document.getElementById('restart-btn');

// New Interactive Elements
const btnStartQuiz = document.getElementById('btn-start-quiz');
const btnManageQuestions = document.getElementById('btn-manage-questions');
const btnBackHome = document.getElementById('btn-back-home');
const btnSaveQuestion = document.getElementById('btn-save-question');
const btnExitQuiz = document.getElementById('btn-exit-quiz');
const questionsList = document.getElementById('questions-list');
const btnClearAll = document.getElementById('btn-clear-all');

// Inputs
const inputQText = document.getElementById('input-q-text');
const inputCorrect = document.getElementById('input-correct');

// Quiz Data
let questions = [];
let currentQuestion = 0;
let score = 0;
let timeLeft = 30;
let timerId = null;
let isQuizActive = false;
let isWaiting = false;

// Screen Navigation
function showScreen(screenId) {
    [homeScreen, managementScreen, quizScreen].forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

// Initialize Home
showScreen('home-screen');

// Question Management Logic
async function fetchQuestions() {
    try {
        const response = await fetch('/api/questions');
        const data = await response.json();
        questions = data.questions;
        updateQuestionsList();
    } catch (err) {
        console.error("Failed to fetch questions", err);
    }
}

function updateQuestionsList() {
    questionsList.innerHTML = '';
    if (questions.length === 0) {
        questionsList.innerHTML = '<p class="empty-msg">No questions added yet.</p>';
        if (btnClearAll) btnClearAll.classList.add('hidden');
        return;
    }
    
    if (btnClearAll) btnClearAll.classList.remove('hidden');

    questions.forEach((q) => {
        const item = document.createElement('div');
        item.className = 'question-item';
        item.innerHTML = `
            <div class="q-item-info">
                <h4>${q.q}</h4>
                <p>${q.options.join(', ')}</p>
                <span class="ans-badge">Ans: ${String.fromCharCode(65 + parseInt(q.answer))}</span>
            </div>
        `;
        questionsList.appendChild(item);
    });
}

async function clearAllQuestions() {
    if (!confirm("Are you sure you want to delete all questions?")) return;

    try {
        const res = await fetch('/api/questions/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
            fetchQuestions();
            showFeedback("All questions cleared successfully!");
        }
    } catch (err) {
        console.error("Error clearing questions", err);
    }
}

function showFeedback(msg) {
    const toast = document.getElementById('feedback-toast');
    if (!toast) {
        // Fallback if toast element doesn't exist yet
        console.log("Feedback:", msg);
        alert(msg);
        return;
    }
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

btnSaveQuestion.onclick = async () => {
    const qText = inputQText.value;
    const opts = [
        document.getElementById('input-opt-0').value,
        document.getElementById('input-opt-1').value,
        document.getElementById('input-opt-2').value,
        document.getElementById('input-opt-3').value
    ];
    const correct = parseInt(inputCorrect.value);

    if (!qText || opts.some(o => !o)) {
        alert("Please fill all fields!");
        return;
    }

    const newQ = { 
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        q: qText, 
        options: opts, 
        answer: correct 
    };

    try {
        const res = await fetch('/api/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newQ)
        });
        if (res.ok) {
            // Clear inputs
            inputQText.value = '';
            for (let i = 0; i < 4; i++) document.getElementById(`input-opt-${i}`).value = '';
            fetchQuestions();
            showFeedback("Question saved successfully!");
        }
    } catch (err) {
        console.error("Error saving question", err);
    }
};

// Quiz Logic
async function startQuizSession() {
    await fetchQuestions();
    if (questions.length === 0) {
        alert("Please add some questions first!");
        showScreen('management-screen');
        return;
    }
    showScreen('quiz-screen');
    isQuizActive = true;
    initQuiz();
}

function initQuiz() {
    currentQuestion = 0;
    score = 0;
    scoreDisplay.innerText = score;
    quizContent.classList.remove('hidden');
    resultContent.classList.add('hidden');
    loadQuestion();
}

function loadQuestion() {
    if (currentQuestion >= questions.length) {
        endQuiz();
        return;
    }
    
    isWaiting = false;
    timeLeft = 30;
    timeDisplay.innerText = timeLeft;
    timeDisplay.parentElement.classList.remove('warning');
    
    const q = questions[currentQuestion];
    questionText.innerText = q.q;
    
    optionsGrid.innerHTML = '';
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn interactive-element';
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(index, btn);
        optionsGrid.appendChild(btn);
    });
    
    startTimer();
}

function startTimer() {
    clearInterval(timerId);
    timerId = setInterval(() => {
        if (!isQuizActive || isWaiting) return;
        
        timeLeft--;
        timeDisplay.innerText = timeLeft;
        
        if(timeLeft <= 5) {
            timeDisplay.parentElement.classList.add('warning');
        }
        
        if (timeLeft <= 0) {
            handleAnswer(-1, null);
        }
    }, 1000);
}

function handleAnswer(selectedIndex, btnElement) {
    if (isWaiting) return;
    isWaiting = true;
    clearInterval(timerId);
    
    const q = questions[currentQuestion];
    
    if (selectedIndex === q.answer) {
        if (btnElement) btnElement.classList.add('correct');
        score += 10;
        scoreDisplay.innerText = score;
    } else {
        if (btnElement) {
            btnElement.classList.add('wrong');
        }
        const options = optionsGrid.querySelectorAll('.option-btn');
        if (options[q.answer]) {
            options[q.answer].classList.add('correct');
        }
    }
    
    setTimeout(() => {
        currentQuestion++;
        loadQuestion();
    }, 2000);
}

function endQuiz() {
    isQuizActive = false;
    clearInterval(timerId);
    quizContent.classList.add('hidden');
    resultContent.classList.remove('hidden');
    finalScoreDisplay.innerText = score;
}

// Navigation Events
btnStartQuiz.onclick = () => startQuizSession();
btnManageQuestions.onclick = () => {
    showScreen('management-screen');
    fetchQuestions();
};
btnBackHome.onclick = () => showScreen('home-screen');
btnClearAll.onclick = () => clearAllQuestions();
btnExitQuiz.onclick = () => {
    isQuizActive = false;
    showScreen('home-screen');
};
restartBtn.onclick = () => {
    isQuizActive = true;
    initQuiz();
};

// Tracker logic
let currentHovered = null;

socket.on('tracking_data', (data) => {
    // Handle Warnings
    if (data.warnings && data.warnings.length > 0) {
        warningBox.classList.remove('hidden');
        warningList.innerHTML = '';
        data.warnings.forEach(w => {
            const li = document.createElement('li');
            li.innerText = w;
            warningList.appendChild(li);
        });
        if (isQuizActive) isQuizActive = false;
    } else {
        warningBox.classList.add('hidden');
        if (quizScreen.classList.contains('hidden') === false) {
            isQuizActive = true;
        }
    }
    
    // Handle Cursor Movement
    if (data.cursor && !isWaiting) {
        const x = data.cursor.x * window.innerWidth;
        const y = data.cursor.y * window.innerHeight;
        
        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';
        
        const el = document.elementFromPoint(x, y);
        
        if (el && (el.classList.contains('interactive-element') || el.closest('.interactive-element'))) {
            const target = el.classList.contains('interactive-element') ? el : el.closest('.interactive-element');
            
            if (currentHovered && currentHovered !== target) {
                currentHovered.classList.remove('hovered');
            }
            currentHovered = target;
            currentHovered.classList.add('hovered');
            
            if (data.cursor.action === 'click') {
                target.click();
                cursor.classList.add('pinched');
                setTimeout(() => cursor.classList.remove('pinched'), 200);
            }
        } else {
            if (currentHovered) {
                currentHovered.classList.remove('hovered');
                currentHovered = null;
            }
        }
        
        if (data.cursor.action === 'click') {
            cursor.classList.add('pinched');
        }
    }
});
