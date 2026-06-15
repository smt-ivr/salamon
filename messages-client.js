// messages-client.js
const API_URL = 'https://smti.uk/salamon/api';

async function loadMessages() {
    // משיכת הטוקן של המשתמש מזיכרון הדפדפן
    const token = localStorage.getItem('userToken');
    if (!token) {
        showMessage('alert-messages', 'אינך מחובר למערכת. אנא התחבר מחדש.', 'error');
        return;
    }

    const tbody = document.getElementById('messages-table-body');
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען הודעות מהשרת...</td></tr>';
    setLoading('btn-refresh-messages', true);

    try {
        const res = await fetch(`${API_URL}/messages/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: token })
        });
        
        const data = await res.json();
        setLoading('btn-refresh-messages', false, '<i class="fa-solid fa-rotate-right"></i> רענן הודעות');

        if (!res.ok) {
            showMessage('alert-messages', data.error || 'שגיאה בשליפת ההודעות', 'error');
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="color:red;">שגיאה בטעינה</td></tr>';
            return;
        }

        if (!data.messages || data.messages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">אין הודעות במערכת או בשלוחה זו.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.messages.forEach(msg => {
            const tr = document.createElement('tr');
            
            // עיבוד נתונים להצגה יפה
            const dateStr = msg.mtime || '-';
            const sizeKb = msg.size ? (msg.size / 1024).toFixed(1) + ' KB' : '-';
            
            tr.innerHTML = `
                <td dir="ltr" style="text-align:right; font-weight:600; color:var(--primary);">${msg.name}</td>
                <td dir="ltr" style="text-align:right;">${dateStr}</td>
                <td dir="ltr" style="text-align:right; color:var(--text-light);">${sizeKb}</td>
                <td>${msg.durationStr || '-'}</td>
                <td>
                    <button class="play-btn" onclick="playAudio('${msg.path}', '${msg.name}')">
                        <i class="fa-solid fa-play"></i> האזן
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        setLoading('btn-refresh-messages', false, '<i class="fa-solid fa-rotate-right"></i> רענן הודעות');
        showMessage('alert-messages', 'שגיאת רשת בשליפת הנתונים', 'error');
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="color:red;">שגיאה בתקשורת</td></tr>';
    }
}

function playAudio(path, fileName) {
    const token = localStorage.getItem('userToken');
    if (!token) {
        alert("אינך מחובר למערכת");
        return;
    }
    
    const playerWrapper = document.getElementById('audio-player-wrapper');
    const player = document.getElementById('main-audio-player');
    const title = document.getElementById('playing-title');
    
    // הצגת הנגן ואנימציית טעינה
    playerWrapper.style.display = 'block';
    playerWrapper.classList.add('fade-in');
    title.innerHTML = `<i class="fa-solid fa-music"></i> מתחבר לשרת... <i class="fa-solid fa-circle-notch fa-spin" style="font-size:0.8em; margin-right:5px;"></i>`;
    
    // הרכבת הקישור המאובטח להזרמה - דרך ה-API שלנו
    const streamUrl = `${API_URL}/messages/stream?path=${encodeURIComponent(path)}&userToken=${encodeURIComponent(token)}`;
    
    player.src = streamUrl;
    player.play().then(() => {
        title.innerHTML = `<i class="fa-solid fa-volume-high"></i> מנגן כעת: <span dir="ltr">${fileName}</span>`;
    }).catch(e => {
        title.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> שגיאה בהפעלת הקובץ: ${fileName}`;
        console.error("Playback error:", e);
    });
}
