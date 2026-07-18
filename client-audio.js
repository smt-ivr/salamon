let mediaRecorder;
let audioChunks = [];
let pendingBlob = null;
let pendingFileName = "";
let recordingTimerInterval = null;
let recordingSeconds = 0;
let tzintukTimerInterval = null;
let tzintukSecondsLeft = 90;
let pendingDeleteFileName = null;

// הזרקת מודלים בטעינת העמוד
document.addEventListener('DOMContentLoaded', injectAudioModals);

function resetRecordingUI() {
    const pauseBtn = document.getElementById('btn-pause-resume');
    if (pauseBtn) pauseBtn.innerHTML = '<span class="icon-wrap"><i class="fa-solid fa-pause"></i></span> השהה';
    const visualizer = document.querySelector('.recording-visualizer');
    if (visualizer) visualizer.classList.remove('paused');
    stopRecordingTimer();
}

async function toggleChatRecording() {
    if (!state.currentUser?.canRecord) return;
    if (globalAudio && !globalAudio.paused) globalAudio.pause();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => { if (event.data.size > 0) audioChunks.push(event.data); };

        mediaRecorder.onstop = () => {
            pendingBlob = new Blob(audioChunks);
            const extension = pendingBlob.type.includes('mp4') ? 'mp4' : (pendingBlob.type.includes('webm') ? 'webm' : 'ogg');
            pendingFileName = `recording.${extension}`;
            showPreviewUI();
        };

        resetRecordingUI(); 
        mediaRecorder.start();
        document.getElementById('review-title').innerHTML = '<i class="fa-solid fa-microphone"></i> מקליט כעת...';
        
        document.getElementById('recording-ui').style.display = 'block';
        document.getElementById('preview-ui').style.display = 'none';
        document.getElementById('upload-success-ui').style.display = 'none';
        document.getElementById('uploadReviewModal').classList.add('active');
        startRecordingTimer();
    } catch (err) {
        alert("שגיאה בגישה למיקרופון: יש לאשר הרשאת מיקרופון לדפדפן בהגדרות המכשיר.");
    }
}

function togglePauseResumeRecording() {
    const btn = document.getElementById('btn-pause-resume');
    const visualizer = document.querySelector('.recording-visualizer');
    if (!mediaRecorder) return;
    if (mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        stopRecordingTimer();
        btn.innerHTML = '<span class="icon-wrap"><i class="fa-solid fa-play"></i></span> המשך';
        if (visualizer) visualizer.classList.add('paused');
    } else if (mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        startRecordingTimer(false);
        btn.innerHTML = '<span class="icon-wrap"><i class="fa-solid fa-pause"></i></span> השהה';
        if (visualizer) visualizer.classList.remove('paused');
    }
}

function stopRecordingForReview() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
}

function startRecordingTimer(reset = true) {
    if (reset) recordingSeconds = 0;
    updateTimerDisplay();
    recordingTimerInterval = setInterval(() => {
        recordingSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function stopRecordingTimer() { if (recordingTimerInterval) clearInterval(recordingTimerInterval); }

function updateTimerDisplay() {
    const m = Math.floor(recordingSeconds / 60).toString().padStart(2, '0');
    const s = (recordingSeconds % 60).toString().padStart(2, '0');
    document.getElementById('recording-timer').innerText = `${m}:${s}`;
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (globalAudio && !globalAudio.paused) globalAudio.pause();
    pendingBlob = file;
    pendingFileName = file.name;
    document.getElementById('review-title').innerHTML = '<i class="fa-solid fa-file-audio"></i> אישור קובץ';
    showPreviewUI();
    document.getElementById('uploadReviewModal').classList.add('active');
    event.target.value = '';
}

function showPreviewUI() {
    document.getElementById('recording-ui').style.display = 'none';
    document.getElementById('upload-success-ui').style.display = 'none';
    document.getElementById('preview-ui').style.display = 'block';
    if (document.getElementById('review-title').innerText.includes('מקליט')) {
        document.getElementById('review-title').innerHTML = '<i class="fa-solid fa-headphones"></i> האזנה ואישור';
    }
    const audioEl = document.getElementById('preview-audio');
    audioEl.src = URL.createObjectURL(pendingBlob);
    const sizeKb = (pendingBlob.size / 1024).toFixed(1);
    document.getElementById('file-info').innerText = `${pendingFileName} (${sizeKb} KB)`;
}

function closeUploadModal() {
    document.getElementById('uploadReviewModal').classList.remove('active');
    const audioEl = document.getElementById('preview-audio');
    audioEl.pause();
    audioEl.src = '';
    pendingBlob = null;
    pendingFileName = "";
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    resetRecordingUI();
    if (tzintukTimerInterval) clearInterval(tzintukTimerInterval);
    
    const confirmBtn = document.getElementById('btn-confirm-send');
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> שלח הודעה'; }
    
    const tzintukActionBtns = document.getElementById('tzintuk-action-buttons');
    if (tzintukActionBtns) tzintukActionBtns.style.display = 'flex';
    
    const tzintukBtn = document.getElementById('btn-send-tzintuk');
    if (tzintukBtn) { tzintukBtn.disabled = false; tzintukBtn.innerHTML = '<i class="fa-solid fa-phone-volume" style="margin-left: 5px;"></i> שלח צינתוק עכשיו'; }

    const statusMsg = document.getElementById('tzintuk-status-msg');
    if (statusMsg) statusMsg.style.display = 'none';
}

async function confirmUpload() {
    if (!pendingBlob) return;
    const confirmBtn = document.getElementById('btn-confirm-send');
    confirmBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> מעלה...';
    confirmBtn.disabled = true;

    const audioEl = document.getElementById('preview-audio');
    audioEl.pause();
    
    const typeOfUpload = pendingFileName.startsWith('recording.') ? 'record' : 'file';
    const formData = new FormData();
    formData.append('userToken', state.userToken);
    formData.append('file', pendingBlob, pendingFileName);
    formData.append('uploadType', typeOfUpload);
    try {
        const res = await fetch(`${API_BASE_URL}/messages/upload`, { method: 'POST', body: formData });
        const result = await res.json();
        
        if (res.ok && result.success) {
            showUploadSuccessUI();
            if(typeof loadMessages === 'function') loadMessages(); 
        } else {
            alert(`שגיאה בהעלאה: ${result.message || result.error || 'נכשל'}`);
            confirmBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> שלח הודעה';
            confirmBtn.disabled = false;
        }
    } catch (err) {
        alert('שגיאת תקשורת בשליחה. אנא נסה שוב.');
        confirmBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> שלח הודעה';
        confirmBtn.disabled = false;
    }
}

function showUploadSuccessUI() {
    document.getElementById('recording-ui').style.display = 'none';
    document.getElementById('preview-ui').style.display = 'none';
    document.getElementById('upload-success-ui').style.display = 'block';
    document.getElementById('review-title').innerHTML = '<i class="fa-solid fa-check"></i> הפעולה הצליחה';
    
    tzintukSecondsLeft = 90;
    updateTzintukTimerDisplay();
    
    if (tzintukTimerInterval) clearInterval(tzintukTimerInterval);
    tzintukTimerInterval = setInterval(() => {
        tzintukSecondsLeft--;
        updateTzintukTimerDisplay();
        if (tzintukSecondsLeft <= 0) closeUploadModal();
    }, 1000);
}

function updateTzintukTimerDisplay() {
    const el = document.getElementById('tzintuk-timer');
    if (!el) return;
    const m = Math.floor(tzintukSecondsLeft / 60).toString().padStart(2, '0');
    const s = (tzintukSecondsLeft % 60).toString().padStart(2, '0');
    el.innerText = `${m}:${s}`;
    if (tzintukSecondsLeft <= 10) el.classList.add('danger'); else el.classList.remove('danger');
}

async function triggerTzintuk() {
    clearInterval(tzintukTimerInterval);
    const btn = document.getElementById('btn-send-tzintuk');
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> שולח פקודה...';
    btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE_URL}/messages/tzintuk`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken })
        });
        const data = await res.json();
        document.getElementById('tzintuk-action-buttons').style.display = 'none';
        const statusMsg = document.getElementById('tzintuk-status-msg');
        statusMsg.style.display = 'block';
        if (res.ok && data.success) {
            statusMsg.className = 'tzintuk-status-msg success';
            statusMsg.innerHTML = '<i class="fa-solid fa-check"></i> ' + data.message;
        } else {
            statusMsg.className = 'tzintuk-status-msg error';
            statusMsg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + (data.message || 'שגיאה בשליחה');
        }
        setTimeout(() => { closeUploadModal(); }, 5000);
    } catch (err) {
        document.getElementById('tzintuk-action-buttons').style.display = 'none';
        const statusMsg = document.getElementById('tzintuk-status-msg');
        statusMsg.style.display = 'block';
        statusMsg.className = 'tzintuk-status-msg error';
        statusMsg.innerHTML = '<i class="fa-solid fa-xmark"></i> תקלת רשת, לא ניתן לשלוח כרגע.';
        setTimeout(() => { closeUploadModal(); }, 5000);
    }
}

async function attemptDeleteMessage(fileName, fileId) {
    if (globalAudio && !globalAudio.paused) globalAudio.pause();
    const btn = document.getElementById(`del-btn-${fileId}`);
    let originalHtml = '';
    if (btn) { originalHtml = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>'; btn.disabled = true; }
    try {
        const res = await fetch(`${API_BASE_URL}/messages/check-delete`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken, fileName: fileName })
        });
        const data = await res.json();
        if (btn) { btn.innerHTML = originalHtml; btn.disabled = false; }
        if (res.ok && data.success) {
            pendingDeleteFileName = fileName;
            document.getElementById('delete-confirm-ui').style.display = 'block';
            document.getElementById('delete-success-ui').style.display = 'none';
            document.getElementById('deleteConfirmModal').classList.add('active');
        } else {
            showErrorModal("פעולה נדחתה", (data.message || 'אין לך הרשאה למחוק הודעה זו.'));
        }
    } catch (err) {
        if (btn) { btn.innerHTML = originalHtml; btn.disabled = false; }
        showErrorModal("שגיאת תקשורת", "אירעה שגיאה בבדיקת הרשאת המחיקה.");
    }
}

function closeDeleteModal() {
    document.getElementById('deleteConfirmModal').classList.remove('active');
    pendingDeleteFileName = null;
    
    // החזרת המודל למצבו המקורי לאחר שהוסתר
    setTimeout(() => {
        document.getElementById('delete-confirm-ui').style.display = 'block';
        document.getElementById('delete-success-ui').style.display = 'none';
        const btn = document.getElementById('btn-confirm-delete');
        if(btn) { btn.innerHTML = 'כן, מחק'; btn.disabled = false; }
    }, 300);
}

async function confirmDeleteMessage() {
    if (!pendingDeleteFileName) return;
    const btn = document.getElementById('btn-confirm-delete');
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> מוחק...';
    btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE_URL}/messages/delete`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken, fileName: pendingDeleteFileName })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            document.getElementById('delete-confirm-ui').style.display = 'none';
            document.getElementById('delete-success-ui').style.display = 'block';
            if(typeof loadMessages === 'function') loadMessages(); 
            setTimeout(() => { closeDeleteModal(); }, 2500);
        } else {
            closeDeleteModal();
            showErrorModal("שגיאה במחיקה", (data.message || 'הפעולה נכשלה'));
        }
    } catch (err) {
        closeDeleteModal();
        showErrorModal("שגיאת תקשורת", "שגיאת תקשורת מול השרת.");
    }
}

function attemptFileUpload() {
    if (!state.currentUser) return;
    if (state.currentUser.canUpload) {
        document.getElementById('chat-file-input').click();
    } else {
        showErrorModal('פעולה נדחתה', 'אין לך הרשאה להעלות קבצים. פנה למנהל המערכת.');
    }
}

// === פונקציית הזרקת המודלים ===
function injectAudioModals() {
    const modalsContainer = document.createElement('div');
    modalsContainer.innerHTML = `
        <div class="modal-overlay" id="uploadReviewModal">
            <div class="modal-content professional-modal" style="max-width: 450px;">
                <div class="modal-header">
                    <h2 id="review-title"><i class="fa-solid fa-microphone"></i> מקליט כעת...</h2>
                    <button class="close-modal-btn" onclick="closeUploadModal()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                
                <div id="recording-ui" style="display: none; padding: 30px 24px; text-align: center;">
                    <div class="recording-timer-pro" id="recording-timer">00:00</div>
                    <div class="recording-visualizer">
                        <div class="bar"></div><div class="bar"></div><div class="bar"></div>
                    </div>
                    <div class="recording-actions-pro">
                        <button id="btn-pause-resume" class="btn-pro-secondary" onclick="togglePauseResumeRecording()">
                            <span class="icon-wrap"><i class="fa-solid fa-pause"></i></span> השהה
                        </button>
                        <button class="btn-pro-primary" onclick="stopRecordingForReview()">
                            <i class="fa-solid fa-stop"></i> סיים הקלטה
                        </button>
                    </div>
                </div>

                <div id="preview-ui" style="display: none; padding: 30px 24px; text-align: center;">
                    <div class="preview-card">
                        <i class="fa-solid fa-file-audio file-icon-large"></i>
                        <div id="file-info" class="file-info-text"></div>
                        <audio id="preview-audio" controls style="width: 100%; height: 40px; outline: none;"></audio>
                    </div>
                    <div class="preview-actions-pro">
                        <button class="btn-pro-outline" onclick="closeUploadModal()">
                            <i class="fa-solid fa-trash"></i> בטל
                        </button>
                        <button id="btn-confirm-send" class="btn-pro-primary" onclick="confirmUpload()">
                            <i class="fa-solid fa-paper-plane"></i> שלח הודעה
                        </button>
                    </div>
                </div>

                <div id="upload-success-ui" style="display: none; padding: 30px 24px; text-align: center;">
                    <div class="success-header-pro"><i class="fa-solid fa-circle-check text-success-pro"></i></div>
                    <h3 style="margin-bottom: 15px; color: var(--text-dark);">ההודעה נשמרה במערכת!</h3>
                    
                    <div class="tzintuk-prompt-box">
                        <p style="margin-bottom: 10px; font-weight: 600; color: var(--text-dark);">האם לשלוח צינתוק למנויים?</p>
                        <div id="tzintuk-action-buttons" style="display: flex; gap: 10px; justify-content: center;">
                            <button class="btn-pro-secondary" onclick="closeUploadModal()">לא כרגע</button>
                            <button id="btn-send-tzintuk" class="btn-pro-primary" onclick="triggerTzintuk()">
                                <i class="fa-solid fa-phone-volume"></i> שלח צינתוק עכשיו
                            </button>
                        </div>
                        <div id="tzintuk-status-msg" class="tzintuk-status-msg"></div>
                    </div>
                    
                    <div class="tzintuk-timer-wrap">
                        חלון הצינתוק ייסגר אוטומטית בעוד: <span id="tzintuk-timer" class="tzintuk-timer-text">01:30</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal-overlay" id="deleteConfirmModal">
            <div class="modal-content professional-modal" style="max-width: 400px; text-align: center; border-top: 4px solid var(--danger); position: relative;">
                
                <button class="close-modal-btn" onclick="closeDeleteModal()" style="position: absolute; top: 15px; left: 15px;"><i class="fa-solid fa-xmark"></i></button>

                <div id="delete-confirm-ui" style="padding: 40px 25px 30px;">
                    <div style="width: 65px; height: 65px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <i class="fa-solid fa-trash-can" style="font-size: 2rem; color: var(--danger);"></i>
                    </div>
                    <h2 style="color: var(--text-dark); font-size: 1.35rem; margin-bottom: 12px; font-weight: 800;">מחיקת הודעה</h2>
                    <p style="font-size: 1rem; color: var(--text-light); margin-bottom: 25px; line-height: 1.6;">האם אתה בטוח שברצונך למחוק הודעה זו?<br>הפעולה תסיר את ההודעה מהמערכת לצמיתות.</p>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button class="btn-pro-secondary" onclick="closeDeleteModal()" style="flex: 1; padding: 14px;">ביטול</button>
                        <button id="btn-confirm-delete" class="btn-pro-primary" style="flex: 1.5; background: var(--danger); box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2); padding: 14px;" onclick="confirmDeleteMessage()">כן, מחק</button>
                    </div>
                </div>

                <div id="delete-success-ui" style="display: none; padding: 40px 25px;">
                    <div style="width: 80px; height: 80px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; position: relative;">
                        <i class="fa-solid fa-trash-can" style="font-size: 2.5rem; color: #15803d; animation: scaleUp 0.4s ease-out;"></i>
                        <div style="position: absolute; bottom: -5px; right: -5px; background: white; border-radius: 50%; padding: 2px;">
                            <i class="fa-solid fa-circle-check" style="font-size: 1.8rem; color: #15803d;"></i>
                        </div>
                    </div>
                    <h2 style="color: var(--text-dark); font-size: 1.5rem; margin-bottom: 10px; font-weight: 800;">ההודעה נמחקה בהצלחה</h2>
                    <p style="font-size: 1rem; color: var(--text-light);">הקובץ הוסר מהמערכת ולא יוצג יותר.</p>
                </div>

            </div>
        </div>
    `;
    document.body.appendChild(modalsContainer);
}
