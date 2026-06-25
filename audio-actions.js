const audioActionsJsContent = \`let mediaRecorder;
let audioChunks = [];
let pendingBlob = null;
let pendingFileName = "";
let recordingTimerInterval = null;
let recordingSeconds = 0;
let tzintukTimerInterval = null;
let tzintukSecondsLeft = 90;
let pendingDeleteFileName = null;

function resetRecordingUI() {
    const pauseBtn = document.getElementById('btn-pause-resume');
    if (pauseBtn) {
        pauseBtn.innerHTML = '<span class="icon-wrap"><i class="fa-solid fa-pause"></i></span> השהה';
    }
    const visualizer = document.querySelector('.recording-visualizer');
    if (visualizer) {
        visualizer.classList.remove('paused');
    }
    stopRecordingTimer();
}

async function toggleChatRecording() {
    if (!state.currentUser?.canRecord) return;
    if (globalAudio && !globalAudio.paused) globalAudio.pause();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            pendingBlob = new Blob(audioChunks);
            const extension = pendingBlob.type.includes('mp4') ? 'mp4' : (pendingBlob.type.includes('webm') ? 'webm' : 'ogg');
            pendingFileName = \`recording.\${extension}\`;
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

function stopRecordingTimer() {
    if (recordingTimerInterval) clearInterval(recordingTimerInterval);
}

function updateTimerDisplay() {
    const m = Math.floor(recordingSeconds / 60).toString().padStart(2, '0');
    const s = (recordingSeconds % 60).toString().padStart(2, '0');
    document.getElementById('recording-timer').innerText = \`\${m}:\${s}\`;
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
    document.getElementById('file-info').innerText = \`\${pendingFileName} (\${sizeKb} KB)\`;
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
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> שלח הודעה';
    }

    const tzintukActionBtns = document.getElementById('tzintuk-action-buttons');
    if (tzintukActionBtns) tzintukActionBtns.style.display = 'flex';
    
    const tzintukBtn = document.getElementById('btn-send-tzintuk');
    if (tzintukBtn) {
        tzintukBtn.disabled = false;
        tzintukBtn.innerHTML = '<i class="fa-solid fa-phone-volume" style="margin-left: 5px;"></i> שלח צינתוק עכשיו';
    }

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
        const res = await fetch(\`\${API_BASE_URL}/messages/upload\`, {
            method: 'POST', body: formData
        });
        const result = await res.json();
        
        if (res.ok && result.success) {
            showUploadSuccessUI();
            loadMessages(); 
        } else {
            alert(\`שגיאה בהעלאה: \${result.message || result.error || 'נכשל'}\`);
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
        
        if (tzintukSecondsLeft <= 0) {
            closeUploadModal();
        }
    }, 1000);
}

function updateTzintukTimerDisplay() {
    const el = document.getElementById('tzintuk-timer');
    if (!el) return;
    
    const m = Math.floor(tzintukSecondsLeft / 60).toString().padStart(2, '0');
    const s = (tzintukSecondsLeft % 60).toString().padStart(2, '0');
    el.innerText = \`\${m}:\${s}\`;
    if (tzintukSecondsLeft <= 10) {
        el.classList.add('danger');
    } else {
        el.classList.remove('danger');
    }
}

async function triggerTzintuk() {
    clearInterval(tzintukTimerInterval);
    const btn = document.getElementById('btn-send-tzintuk');
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> שולח פקודה...';
    btn.disabled = true;
    try {
        const res = await fetch(\`\${API_BASE_URL}/messages/tzintuk\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    const btn = document.getElementById(\`del-btn-\${fileId}\`);
    let originalHtml = '';
    
    if (btn) {
        originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        btn.disabled = true;
    }

    try {
        const res = await fetch(\`\${API_BASE_URL}/messages/check-delete\`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken, fileName: fileName })
        });
        const data = await res.json();
        
        if (btn) {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }

        if (res.ok && data.success) {
            pendingDeleteFileName = fileName;
            document.getElementById('delete-status-msg').style.display = 'none';
            document.getElementById('delete-action-buttons').style.display = 'flex';
            document.getElementById('delete-modal-texts').style.display = 'block';
            document.getElementById('deleteConfirmModal').classList.add('active');
        } else {
            showErrorModal("לא ניתן למחוק", (data.message || 'סיבה לא ידועה.'));
        }
    } catch (err) {
        if (btn) {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
        showErrorModal("שגיאת תקשורת", "אירעה שגיאה בבדיקת הרשאת המחיקה.");
    }
}

function closeDeleteModal() {
    document.getElementById('deleteConfirmModal').classList.remove('active');
    pendingDeleteFileName = null;
    const btn = document.getElementById('btn-confirm-delete');
    if(btn) {
        btn.innerHTML = 'כן, מחק הודעה';
        btn.disabled = false;
    }
}

async function confirmDeleteMessage() {
    if (!pendingDeleteFileName) return;
    
    const btn = document.getElementById('btn-confirm-delete');
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> מוחק...';
    btn.disabled = true;
    try {
        const res = await fetch(\`\${API_BASE_URL}/messages/delete\`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken, fileName: pendingDeleteFileName })
        });
        const data = await res.json();
        
        const statusMsg = document.getElementById('delete-status-msg');
        document.getElementById('delete-action-buttons').style.display = 'none';
        document.getElementById('delete-modal-texts').style.display = 'none';
        statusMsg.style.display = 'block';
        if (res.ok && data.success) {
            statusMsg.className = 'tzintuk-status-msg success';
            statusMsg.innerHTML = '<i class="fa-solid fa-check"></i> ' + data.message;
            
            loadMessages(); 
            setTimeout(() => { closeDeleteModal(); }, 3000);
        } else {
            statusMsg.className = 'tzintuk-status-msg error';
            statusMsg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + (data.message || 'הפעולה נכשלה');
            setTimeout(() => { closeDeleteModal(); }, 5000);
        }
    } catch (err) {
        const statusMsg = document.getElementById('delete-status-msg');
        document.getElementById('delete-action-buttons').style.display = 'none';
        document.getElementById('delete-modal-texts').style.display = 'none';
        statusMsg.style.display = 'block';
        statusMsg.className = 'tzintuk-status-msg error';
        statusMsg.innerHTML = '<i class="fa-solid fa-xmark"></i> שגיאת תקשורת מול השרת.';
        
        setTimeout(() => { closeDeleteModal(); }, 3000);
    }
}

function attemptFileUpload() {
    if (!state.currentUser) return;
    if (state.currentUser.canUpload) {
        document.getElementById('chat-file-input').click();
    } else {
        showErrorModal('הרשאה חסרה', 'אין לך הרשאה להעלות קבצים. פנה למנהל המערכת.');
    }
}\`;

export default audioActionsJsContent;
