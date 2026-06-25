const messagesJsContent = \`async function loadMessages() {
    const token = state.userToken || localStorage.getItem('userToken');
    if (!token) return;

    const container = document.getElementById('messages-container');
    if(!container) return;
    
    container.innerHTML = '<div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען הודעות...</div>';
    try {
        const res = await fetch(\`\${API_BASE_URL}/messages/list\`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: token })
        });
        const data = await res.json();
        
        if (!res.ok) {
            container.innerHTML = \`<div class="loading-state" style="color:var(--danger);">\${data.message || data.error || 'שגיאה בשליפה'}</div>\`;
            return;
        }

        if (!data.messages || data.messages.length === 0) {
            container.innerHTML = '<div class="loading-state">אין הודעות להצגה כרגע.</div>';
            return;
        }

        renderMessages(data.messages);
    } catch (err) {
        container.innerHTML = '<div class="loading-state" style="color:var(--danger);">תקלת תקשורת מול השרת.</div>';
    }
}

function renderMessages(messages) {
    const container = document.getElementById('messages-container');
    container.innerHTML = ''; 

    if(messages.length === 0) return;
    let currentDateGroup = messages[0].mtime ? messages[0].mtime.split(" ")[0] : "-";

    messages.forEach((msg, index) => {
        const fullDateTime = msg.mtime || '-';
        let datePart = "-", timePart = "-";
        if(fullDateTime.includes(" ")) [datePart, timePart] = fullDateTime.split(" ");

        if (datePart !== currentDateGroup) {
             if (currentDateGroup !== "-") {
                const divider = document.createElement('div');
                divider.className = 'date-divider';
                divider.innerHTML = \`<span>\${currentDateGroup}</span>\`;
                container.appendChild(divider);
            }
            currentDateGroup = datePart;
        }

        const isOut = msg.isOutgoing === true; 
        const bubbleClass = isOut ? 'bubble-out' : 'bubble-in';
        const fileId = msg.name.replace('.wav', '').replace('.mp3', '');
        const senderName = msg.valName || 'מערכת';
        const durationText = msg.durationStr || '00:00';

        const fileIdGroup = isOut ? \`
            <div class="file-id-group">
                <span class="file-id">ID: \${fileId}</span>
                <button id="del-btn-\${fileId}" class="delete-msg-btn" onclick="attemptDeleteMessage('\${msg.name}', '\${fileId}')" title="מחק הודעה"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        \` : \`<span class="file-id">ID: \${fileId}</span>\`;
        const bubble = document.createElement('div');
        bubble.className = \`bubble \${bubbleClass}\`;
        bubble.innerHTML = \`
            <div class="msg-top">
                <span class="sender-name">\${senderName}</span>
                \${fileIdGroup}
            </div>
            <div class="audio-player">
                <button class="play-btn-circle" id="btn-\${fileId}" onclick="togglePlay('\${fileId}')">
                    <i class="fa-solid fa-play"></i>
                </button>
                <div class="player-track-container">
                    <input type="range" id="slider-\${fileId}" min="0" max="100" value="0" oninput="seekAudio('\${fileId}', this.value)">
                    <div class="track-fill" id="fill-\${fileId}"></div>
                    <div class="player-times">
                        <span id="current-\${fileId}">0:00</span>
                        <span>\${durationText}</span>
                    </div>
                </div>
            </div>
            <div class="msg-bottom-time">
                <span dir="ltr">\${fullDateTime}</span>
                \${isOut ? '<i class="fa-solid fa-check-double" style="color:#16a34a; font-size:0.8rem; margin-right:4px;"></i>' : ''}
            </div>
        \`;
        container.appendChild(bubble);

        if (index === messages.length - 1) {
            const divider = document.createElement('div');
            divider.className = 'date-divider';
            divider.innerHTML = \`<span>\${currentDateGroup}</span>\`;
            container.appendChild(divider);
        }
    });
}

function setupAudioListeners() {
    globalAudio.addEventListener('timeupdate', () => {
        if (!currentPlayingId) return;
        const slider = document.getElementById(\`slider-\${currentPlayingId}\`);
        const fill = document.getElementById(\`fill-\${currentPlayingId}\`);
        const timeLabel = document.getElementById(\`current-\${currentPlayingId}\`);

        if(globalAudio.duration && slider) {
            const percent = (globalAudio.currentTime / globalAudio.duration) * 100;
            if(!slider.matches(':active')) { 
                slider.value = percent;
                fill.style.width = percent + '%';
            }
            
            const m = Math.floor(globalAudio.currentTime / 60);
            const s = Math.floor(globalAudio.currentTime % 60);
            timeLabel.innerText = \`\${m}:\${s < 10 ? '0' : ''}\${s}\`;
        }
    });
    globalAudio.addEventListener('ended', () => {
        if (!currentPlayingId) return;
        const btn = document.getElementById(\`btn-\${currentPlayingId}\`);
        if(btn) btn.querySelector('i').className = 'fa-solid fa-play';
        const slider = document.getElementById(\`slider-\${currentPlayingId}\`);
        if(slider) {
            slider.value = 0;
            document.getElementById(\`fill-\${currentPlayingId}\`).style.width = '0%';
            document.getElementById(\`current-\${currentPlayingId}\`).innerText = '0:00';
        }
        currentPlayingId = null;
    });
}

function togglePlay(fileId) {
    const btn = document.getElementById(\`btn-\${fileId}\`);
    const icon = btn.querySelector('i');
    if (currentPlayingId === fileId) {
        if (globalAudio.paused) {
            globalAudio.play();
            icon.className = 'fa-solid fa-pause';
        } else {
            globalAudio.pause();
            icon.className = 'fa-solid fa-play';
        }
        return;
    }

    if (currentPlayingId) {
        const oldBtn = document.getElementById(\`btn-\${currentPlayingId}\`);
        if(oldBtn) oldBtn.querySelector('i').className = 'fa-solid fa-play';
    }

    currentPlayingId = fileId;
    icon.className = 'fa-solid fa-circle-notch fa-spin';
    const token = state.userToken || localStorage.getItem('userToken');
    const streamUrl = \`\${API_BASE_URL}/messages/stream?fileId=\${encodeURIComponent(fileId)}&userToken=\${encodeURIComponent(token)}\`;
    
    globalAudio.src = streamUrl;
    globalAudio.play().then(() => {
        icon.className = 'fa-solid fa-pause';
    }).catch(err => {
        icon.className = 'fa-solid fa-triangle-exclamation';
    });
}

function seekAudio(fileId, percentValue) {
    const fill = document.getElementById(\`fill-\${fileId}\`);
    if(fill) fill.style.width = percentValue + '%';
    if (currentPlayingId === fileId && globalAudio.duration) {
        globalAudio.currentTime = (percentValue / 100) * globalAudio.duration;
    }
}\`;

export default messagesJsContent;
