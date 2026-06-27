// client-messages.js
let currentRenderedMessagesHash = '';
let allLoadedMessages = [];
let currentFilesFrom = 0;
const FILES_LIMIT = 40;
let isFetchingMessages = false;

async function loadMessages(isSilent = false, loadMore = false) {
    if (isFetchingMessages) return;
    const token = state.userToken || localStorage.getItem('userToken');
    if (!token) return;

    // מניעת רענון המסך בעת האזנה פעילה
    if (isSilent && currentPlayingId) return;

    const container = document.getElementById('messages-container');
    if (!container) return;

    // איפוס אם זו טעינה רגילה מאפס
    if (!loadMore && !isSilent) {
        currentFilesFrom = 0;
        allLoadedMessages = [];
        container.innerHTML = '<div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען הודעות...</div>';
    }

    isFetchingMessages = true;

    if (loadMore) {
        const btn = document.getElementById('load-more-btn');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> טוען הודעות קודמות...';
    }

    try {
        const fetchFrom = loadMore ? currentFilesFrom + FILES_LIMIT : 0;
        
        const res = await fetch(`${API_BASE_URL}/messages/list`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: token, filesLimit: FILES_LIMIT, filesFrom: fetchFrom })
        });
        const data = await res.json();
        
        isFetchingMessages = false;

        if (!res.ok) {
            if (!isSilent) container.innerHTML = `<div class="loading-state" style="color:var(--danger);">${data.message || data.error || 'שגיאה בשליפה'}</div>`;
            return;
        }

        if (!data.messages || data.messages.length === 0) {
            if (!isSilent && !loadMore) container.innerHTML = '<div class="loading-state">אין הודעות להצגה כרגע.</div>';
            if (loadMore) {
                const btn = document.getElementById('load-more-btn');
                if (btn) {
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> הוצגו כל ההודעות';
                    btn.disabled = true;
                }
            }
            if (!loadMore) currentRenderedMessagesHash = '';
            return;
        }

        // חיבור ההודעות החדשות למערך ההודעות הקיים
        if (loadMore) {
            currentFilesFrom = fetchFrom;
            allLoadedMessages = [...allLoadedMessages, ...data.messages];
        } else {
            currentFilesFrom = 0;
            allLoadedMessages = data.messages;
        }

        const newMessagesHash = allLoadedMessages.map(m => m.name).join('|');

        // אם זו קריאה שקטה ושום הודעה לא נוספה/נמחקה, רק מעדכנים סטטיסטיקות
        if (isSilent && !loadMore && newMessagesHash === currentRenderedMessagesHash) {
            fetchAllStats(data.messages, token, true);
            return;
        }

        currentRenderedMessagesHash = newMessagesHash;
        const hasMore = data.messages.length === FILES_LIMIT; // אם קיבלנו 40 מדויק, כנראה יש עוד.
        
        renderMessages(allLoadedMessages, hasMore);
        
        // טעינת סטטיסטיקות רק להודעות החדשות שנמשכו כדי לחסוך עומס
        const messagesToFetchStats = loadMore ? data.messages : allLoadedMessages;
        fetchAllStats(messagesToFetchStats, token, false);

    } catch (err) {
        isFetchingMessages = false;
        if (!isSilent && !loadMore) container.innerHTML = '<div class="loading-state" style="color:var(--danger);">תקלת תקשורת מול השרת.</div>';
        if (loadMore) {
            const btn = document.getElementById('load-more-btn');
            if (btn) btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> שגיאה, נסה שוב';
        }
    }
}

// פונקציה לטעינת כל הסטטיסטיקות בקבוצות קטנות
async function fetchAllStats(messages, token, isSilentRefresh = false) {
    for (let i = 0; i < messages.length; i += 5) {
        const batch = messages.slice(i, i + 5);
        await Promise.all(batch.map(msg => {
            const fileId = msg.name.replace('.wav', '').replace('.mp3', '');
            return fetchMessageStats(fileId, token, isSilentRefresh);
        }));
    }
}

async function fetchMessageStats(fileId, token, isSilentRefresh = false) {
    const container = document.getElementById(`stats-${fileId}`);
    if (!container) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/messages/stats`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: token, fileId: fileId })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            const s = data.stats;
            container.innerHTML = `
                <span title="האזנות באתר"><i class="fa-solid fa-globe"></i> ${s.webListens}</span>
                <span style="color:#cbd5e1; margin: 0 3px;">|</span>
                <span title="האזנות בטלפון"><i class="fa-solid fa-phone"></i> ${s.phoneListens}</span>
            `;
        } else if (!isSilentRefresh) {
            container.innerHTML = `<span style="color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> שגיאה</span>`;
        }
    } catch (err) {
        if (!isSilentRefresh) {
            container.innerHTML = `<span style="color:var(--danger);"><i class="fa-solid fa-wifi"></i> נכשל</span>`;
        }
    }
}

function renderMessages(messages, hasMore) {
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
                divider.innerHTML = `<span>${currentDateGroup}</span>`;
                container.appendChild(divider);
            }
            currentDateGroup = datePart;
        }

        const isOut = msg.isOutgoing === true; 
        const bubbleClass = isOut ? 'bubble-out' : 'bubble-in';
        const fileId = msg.name.replace('.wav', '').replace('.mp3', '');
        const senderName = msg.valName || 'מערכת';
        const durationText = msg.durationStr || '00:00';

        let sourceIndicator = '';
        if (msg.fromWebType) {
            let extraIcon = msg.fromWebType === 'file' ? 
                `<i class="fa-solid fa-paperclip" style="font-size: 11px; color: #64748b; margin-left: 4px;" title="הועלה כקובץ דרך האתר"></i>` : '';

            sourceIndicator = `
                <span title="ההודעה הועלתה דרך אתר עכשיו סלומון" style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; margin-right: 6px; border-radius: 50%; background: #f1f5f9; border: 1px solid #cbd5e1; overflow: hidden; flex-shrink: 0;">
                    <i class="fa-solid fa-cloud-arrow-up" style="font-size: 11px; color: #94a3b8; position: absolute; z-index: 1;"></i>
                    <img src="https://smt-tel-manager.netlify.app/salamon-logo.png" alt="W" draggable="false" style="width: 100%; height: 100%; object-fit: cover; position: absolute; z-index: 2; pointer-events: none;" onerror="this.style.display='none'">
                </span>
                ${extraIcon}
            `;
        } else {
            sourceIndicator = `
                <span title="ההודעה הוקלטה דרך הטלפון" style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin-right: 6px; border-radius: 50%; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; flex-shrink: 0;">
                    <i class="fa-solid fa-phone" style="font-size: 9px;"></i>
                </span>
            `;
        }

        const fileIdGroup = isOut ? `
            <div class="file-id-group">
                <span class="file-id">ID: ${fileId}</span>
                <button id="del-btn-${fileId}" class="delete-msg-btn" onclick="attemptDeleteMessage('${msg.name}', '${fileId}')" title="מחק הודעה"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        ` : `<span class="file-id">ID: ${fileId}</span>`;
        
        const bubble = document.createElement('div');
        bubble.className = `bubble ${bubbleClass}`;
        bubble.innerHTML = `
            <div class="msg-top">
                <span class="sender-name" style="display: flex; align-items: center;">${senderName}${sourceIndicator}</span>
                ${fileIdGroup}
            </div>
            <div class="audio-player">
                <button class="play-btn-circle" id="btn-${fileId}" onclick="togglePlay('${fileId}')">
                    <i class="fa-solid fa-play"></i>
                </button>
                <div class="player-track-container">
                    <input type="range" id="slider-${fileId}" min="0" max="100" value="0" oninput="seekAudio('${fileId}', this.value)">
                    <div class="track-fill" id="fill-${fileId}"></div>
                    <div class="player-times">
                        <span id="current-${fileId}">0:00</span>
                        <span>${durationText}</span>
                    </div>
                </div>
            </div>
            <div class="msg-bottom-row">
                <div class="msg-stats-badge" id="stats-${fileId}">
                    <i class="fa-solid fa-circle-notch fa-spin"></i> טוען צפיות...
                </div>
                <div class="msg-bottom-time">
                    <span dir="ltr">${fullDateTime}</span>
                    ${isOut ? '<i class="fa-solid fa-check-double" style="color:#16a34a; font-size:0.8rem; margin-right:4px;"></i>' : ''}
                </div>
            </div>
        `;
        container.appendChild(bubble);

        if (index === messages.length - 1) {
            const divider = document.createElement('div');
            divider.className = 'date-divider';
            divider.innerHTML = `<span>${currentDateGroup}</span>`;
            container.appendChild(divider);
        }
    });

    // הוספת כפתור "טען הודעות קודמות" בסוף הקונטיינר (שמופיע בראש המסך עקב עיצוב flex column-reverse)
    if (hasMore) {
        const loadMoreContainer = document.createElement('div');
        loadMoreContainer.className = 'load-more-wrapper';
        
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'load-more-btn';
        loadMoreBtn.className = 'btn-load-more';
        loadMoreBtn.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> טען הודעות קודמות';
        loadMoreBtn.onclick = () => loadMessages(false, true);
        
        loadMoreContainer.appendChild(loadMoreBtn);
        container.appendChild(loadMoreContainer);
    }
}

function setupAudioListeners() {
    globalAudio.addEventListener('timeupdate', () => {
        if (!currentPlayingId) return;
        const slider = document.getElementById(`slider-${currentPlayingId}`);
        const fill = document.getElementById(`fill-${currentPlayingId}`);
        const timeLabel = document.getElementById(`current-${currentPlayingId}`);

        if(globalAudio.duration && slider) {
            const percent = (globalAudio.currentTime / globalAudio.duration) * 100;
            if(!slider.matches(':active')) { 
                slider.value = percent;
                fill.style.width = percent + '%';
            }
            const m = Math.floor(globalAudio.currentTime / 60);
            const s = Math.floor(globalAudio.currentTime % 60);
            timeLabel.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        }
    });
    globalAudio.addEventListener('ended', () => {
        if (!currentPlayingId) return;
        const btn = document.getElementById(`btn-${currentPlayingId}`);
        if(btn) btn.querySelector('i').className = 'fa-solid fa-play';
        const slider = document.getElementById(`slider-${currentPlayingId}`);
        if(slider) {
            slider.value = 0;
            document.getElementById(`fill-${currentPlayingId}`).style.width = '0%';
            document.getElementById(`current-${currentPlayingId}`).innerText = '0:00';
        }
        currentPlayingId = null;
    });
}

function togglePlay(fileId) {
    const token = state.userToken || localStorage.getItem('userToken');
    const btn = document.getElementById(`btn-${fileId}`);
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
        const oldBtn = document.getElementById(`btn-${currentPlayingId}`);
        if(oldBtn) oldBtn.querySelector('i').className = 'fa-solid fa-play';
    }

    currentPlayingId = fileId;
    icon.className = 'fa-solid fa-circle-notch fa-spin';
    const streamUrl = `${API_BASE_URL}/messages/stream?fileId=${encodeURIComponent(fileId)}&userToken=${encodeURIComponent(token)}`;
    
    globalAudio.src = streamUrl;
    globalAudio.play().then(() => {
        icon.className = 'fa-solid fa-pause';
        
        if (!window.playedFiles) window.playedFiles = new Set();
        if (!window.playedFiles.has(fileId)) {
            window.playedFiles.add(fileId);
            setTimeout(() => fetchMessageStats(fileId, token, true), 2000);
        }
        
    }).catch(err => {
        icon.className = 'fa-solid fa-triangle-exclamation';
    });
}

function seekAudio(fileId, percentValue) {
    const fill = document.getElementById(`fill-${fileId}`);
    if(fill) fill.style.width = percentValue + '%';
    if (currentPlayingId === fileId && globalAudio.duration) {
        globalAudio.currentTime = (percentValue / 100) * globalAudio.duration;
    }
}
