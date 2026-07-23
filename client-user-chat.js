// client-user-chat.js

let userChatPollingInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    injectUserChatModal();
    
    // בדיקת הודעות שלא נקראו כל 10 שניות
    setInterval(() => {
        if (state.userToken && !document.getElementById('userChatModal').classList.contains('active')) {
            checkUnreadMessages();
        }
    }, 10000);
});

function injectUserChatModal() {
    const chatStyles = document.createElement('style');
    chatStyles.innerHTML = `
        .user-chat-modal .modal-content { max-width: 450px; height: 80vh; max-height: 700px; display: flex; flex-direction: column; padding: 0; background: #efeae2; }
        .user-chat-header { background: #0f172a; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .user-chat-header h3 { margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 10px; }
        .user-chat-close { background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; opacity: 0.8; transition: 0.2s; }
        .user-chat-close:hover { opacity: 1; transform: scale(1.1); }
        
        .user-chat-messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; background-image: url('https://www.transparenttextures.com/patterns/cubes.png'); }
        
        .user-chat-bubble { max-width: 80%; padding: 8px 12px; border-radius: 12px; position: relative; box-shadow: 0 1px 1px rgba(0,0,0,0.1); display: flex; flex-direction: column; gap: 4px; }
        .user-chat-out { background: #dcf8c6; align-self: flex-end; border-top-left-radius: 0; }
        .user-chat-in { background: #ffffff; align-self: flex-start; border-top-right-radius: 0; }
        .user-chat-deleted { background: transparent !important; border: 1px dashed #cbd5e1; color: #94a3b8; font-style: italic; box-shadow: none; }
        
        .user-chat-text { font-size: 0.95rem; line-height: 1.4; word-wrap: break-word; color: #111b21; }
        .user-chat-meta { display: flex; align-items: center; justify-content: flex-end; gap: 5px; font-size: 0.7rem; color: #64748b; }
        
        .user-chat-input-area { background: #f0f2f5; padding: 10px 15px; display: flex; gap: 10px; align-items: center; flex-shrink: 0; }
        .user-chat-input { flex: 1; border: none; padding: 12px 18px; border-radius: 24px; outline: none; font-size: 0.95rem; box-shadow: 0 1px 1px rgba(0,0,0,0.05); }
        .user-chat-send { background: var(--play-out); color: white; border: none; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; cursor: pointer; transition: 0.2s; flex-shrink: 0; }
        .user-chat-send:hover:not(:disabled) { background: #15803d; transform: scale(1.05); }
        .user-chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
    `;
    document.head.appendChild(chatStyles);

    const modalHtml = `
        <div class="modal-overlay user-chat-modal" id="userChatModal">
            <div class="modal-content professional-modal">
                <div class="user-chat-header">
                    <h3><i class="fa-solid fa-headset"></i> צ'אט תמיכה והנהלה</h3>
                    <button class="user-chat-close" onclick="closeUserChatModal()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="user-chat-messages" id="user-chat-msg-container">
                    <div class="empty-state" style="margin-top: 50px;">טוען שיחה...</div>
                </div>
                <form class="user-chat-input-area" onsubmit="sendUserChatMessage(event)">
                    <input type="text" id="user-chat-input" class="user-chat-input" placeholder="הקלד הודעה להנהלה..." required autocomplete="off">
                    <button type="submit" id="user-chat-submit" class="user-chat-send"><i class="fa-solid fa-paper-plane"></i></button>
                </form>
            </div>
        </div>
    `;
    const container = document.createElement('div');
    container.innerHTML = modalHtml;
    document.body.appendChild(container.firstElementChild);
}

// פונקציית עיצוב תאריכים חכמה (היום, אתמול, וכו')
function formatChatSmartDate(dateStr) {
    if (!dateStr) return '';
    const msgDate = new Date(dateStr.replace(' ', 'T') + 'Z');
    if (isNaN(msgDate)) return dateStr;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
    const timeStr = msgDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    if (msgDay.getTime() === today.getTime()) {
        return `היום, ${timeStr}`;
    } else if (msgDay.getTime() === yesterday.getTime()) {
        return `אתמול, ${timeStr}`;
    } else {
        return `${msgDate.toLocaleDateString('he-IL')} ${timeStr}`;
    }
}

async function checkUnreadMessages() {
    if (!state.userToken) return;
    try {
        const res = await fetch(`${API_BASE_URL}/chat/list`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            // סופרים הודעות מההנהלה שלא נקראו
            const unreadCount = data.messages.filter(m => m.sender === 'admin' && !m.isRead).length;
            updateChatBadge(unreadCount);
            
            // אם המודל פתוח, נרנדר את השיחה כדי לקבל נתונים חיים
            if (document.getElementById('userChatModal').classList.contains('active')) {
                renderUserChatMessages(data.messages);
            }
        }
    } catch (e) {}
}

function updateChatBadge(count) {
    const badge = document.getElementById('user-chat-badge');
    if (!badge) return;
    if (count > 0) {
        badge.innerText = count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

window.openUserChatModal = async function() {
    document.getElementById('userChatModal').classList.add('active');
    
    const msgContainer = document.getElementById('user-chat-msg-container');
    msgContainer.innerHTML = '<div class="empty-state" style="margin-top: 50px;"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען...</div>';
    
    try {
        const res = await fetch(`${API_BASE_URL}/chat/list`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            renderUserChatMessages(data.messages);
            // אם פתחנו את הצ'אט, אנחנו מסמנים את ההודעות כנקראו
            markUserChatAsRead();
        } else {
            msgContainer.innerHTML = `<div class="empty-state" style="color:var(--danger); margin-top: 50px;">${data.error || 'שגיאה בשליפה'}</div>`;
        }
    } catch (err) {
        msgContainer.innerHTML = '<div class="empty-state" style="color:var(--danger); margin-top: 50px;">שגיאת תקשורת</div>';
    }
};

window.closeUserChatModal = function() {
    document.getElementById('userChatModal').classList.remove('active');
};

async function markUserChatAsRead() {
    if (!state.userToken) return;
    try {
        const res = await fetch(`${API_BASE_URL}/chat/read`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken })
        });
        if (res.ok) {
            updateChatBadge(0);
        }
    } catch (e) {}
}

function renderUserChatMessages(messages) {
    const container = document.getElementById('user-chat-msg-container');
    container.innerHTML = '';
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #94a3b8; margin-top: 40px;">
                <i class="fa-solid fa-comments" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>אין הודעות בשיחה זו.</p>
                <p style="font-size: 0.85rem; margin-top: 5px;">שלח הודעה להנהלה למטה כדי להתחיל.</p>
            </div>
        `;
        return;
    }
    
    messages.forEach(msg => {
        const isOut = msg.sender === 'user';
        const bubbleClass = isOut ? 'user-chat-out' : 'user-chat-in';
        const isDeleted = msg.isDeleted;
        
        const timeStr = formatChatSmartDate(msg.createdAt);
        
        let readTicks = '';
        if (isOut && !isDeleted) {
            readTicks = msg.isRead ? '<i class="fa-solid fa-check-double" style="color: #3b82f6;"></i>' : '<i class="fa-solid fa-check" style="color: #94a3b8;"></i>';
        }
        
        const textContent = isDeleted ? '🚫 ההודעה נמחקה' : msg.text;
        
        const bubble = document.createElement('div');
        bubble.className = `user-chat-bubble ${bubbleClass} ${isDeleted ? 'user-chat-deleted' : ''}`;
        bubble.innerHTML = `
            <div class="user-chat-text">${textContent}</div>
            <div class="user-chat-meta">
                <span dir="ltr">${timeStr}</span>
                ${readTicks}
            </div>
        `;
        container.appendChild(bubble);
    });
    
    // גלילה אוטומטית למטה
    container.scrollTop = container.scrollHeight;
}

window.sendUserChatMessage = async function(e) {
    e.preventDefault();
    const input = document.getElementById('user-chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    const btn = document.getElementById('user-chat-submit');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    
    try {
        const res = await fetch(`${API_BASE_URL}/chat/send`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken, text: text })
        });
        const data = await res.json();
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
        
        if (res.ok && data.success) {
            input.value = '';
            // טעינת ההודעות מחדש לאחר השליחה
            openUserChatModal();
        } else {
            showToast(data.error || 'שגיאה בשליחת הודעה', 'error');
        }
    } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
        showToast('שגיאת תקשורת מול השרת', 'error');
    }
};
