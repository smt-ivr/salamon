// client-admin-chat.js

let adminChatPolling = null;
window.activeAdminChatPhone = null;
window.allAdminConversations = [];

document.addEventListener('DOMContentLoaded', () => {
    const adminMenu = document.querySelector('.admin-sidebar-menu');
    if (adminMenu) {
        const chatMenuItem = document.createElement('div');
        chatMenuItem.className = 'nav-item';
        chatMenuItem.id = 'tab-btn-chat';
        chatMenuItem.onclick = () => switchAdminTab('chat');
        chatMenuItem.innerHTML = `<i class="fa-solid fa-headset"></i> <span>ניהול צ'אט לקוחות</span>`;
        adminMenu.appendChild(chatMenuItem);
    }

    const appMainArea = document.querySelector('#admin-dash-view .app-main-area');
    if (appMainArea) {
        const chatTab = document.createElement('div');
        chatTab.id = 'tab-admin-chat';
        chatTab.className = 'app-tab scrollable-tab';
        chatTab.innerHTML = `
            <div class="admin-top-bar" style="margin-bottom: 20px;">
                <div>
                    <h1>פניות ושיחות מלקוחות</h1>
                    <p class="subtitle" style="margin-bottom: 0;">ניהול פניות חיות בזמן אמת</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="openCustomEmailModal()" class="btn-primary small-btn" style="width: auto; background: #0f172a;"><i class="fa-solid fa-envelope"></i> שלח מייל חופשי</button>
                    <button onclick="promptNewChat()" class="btn-primary small-btn" style="width: auto; background: var(--secondary);"><i class="fa-solid fa-plus"></i> התחל שיחה חדשה</button>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <input type="text" id="admin-chat-search" class="input-modern" placeholder="חפש לפי מספר טלפון או שם..." onkeyup="filterAdminConversations()" style="max-width: 400px; padding: 12px 15px; border-radius: 8px;">
            </div>

            <div id="admin-chat-conv-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 15px;">
                <div class="empty-state" style="padding: 20px; grid-column: 1 / -1;"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען...</div>
            </div>
        `;
        appMainArea.appendChild(chatTab);
    }

    const chatModalStyles = document.createElement('style');
    chatModalStyles.innerHTML = `
        .admin-chat-modal .modal-content { max-width: 600px; height: 85vh; max-height: 800px; display: flex; flex-direction: column; padding: 0; background: #efeae2; overflow: hidden;}
        .admin-chat-header { background: #0f172a; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .admin-chat-header h3 { margin: 0; font-size: 1.15rem; display: flex; align-items: center; gap: 10px; font-weight: 700;}
        .admin-chat-close { background: none; border: none; color: white; font-size: 1.3rem; cursor: pointer; opacity: 0.8; transition: 0.2s; }
        .admin-chat-close:hover { opacity: 1; transform: scale(1.1); color: #ef4444; }
        
        .conv-card { background: #fff; border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; cursor: pointer; transition: 0.2s; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .conv-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.05); border-color: var(--secondary); }
        .conv-badge { background: var(--danger); color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; }
        
        .chat-del-btn { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; position: absolute; top: 50%; transform: translateY(-50%); opacity: 0; transition: 0.2s; font-size: 0.8rem; }
        .user-chat-in .chat-del-btn { left: -35px; }
        .user-chat-out .chat-del-btn { right: -35px; }
        .user-chat-bubble:hover .chat-del-btn { opacity: 1; }
        .chat-del-btn:hover { background: #ef4444; color: white; border-color: #ef4444; }
    `;
    document.head.appendChild(chatModalStyles);

    const modalHtml = `
        <div class="modal-overlay admin-chat-modal" id="adminChatActiveModal">
            <div class="modal-content professional-modal">
                <div class="admin-chat-header">
                    <button class="admin-chat-close" onclick="closeAdminChatModal()"><i class="fa-solid fa-xmark"></i></button>
                    <h3 style="direction:ltr;"><span id="admin-chat-modal-title"></span> <i class="fa-solid fa-circle-user"></i></h3>
                </div>
                <div id="admin-chat-messages-container" style="flex: 1; overflow-y: auto; padding: 20px 40px; display: flex; flex-direction: column; gap: 8px; background-image: url('https://www.transparenttextures.com/patterns/cubes.png');"></div>
                <div style="background: #f0f2f5; padding: 12px 15px; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 8px;">
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--text-light); cursor: pointer; font-weight: 600;">
                        <input type="checkbox" id="admin-chat-send-email" style="accent-color: var(--secondary);">
                        שלח התראה מעוצבת למייל של הלקוח
                    </label>
                    <form onsubmit="sendAdminChatMessage(event)" style="display: flex; gap: 10px; align-items: center;">
                        <input type="text" id="admin-chat-input" class="user-chat-input" placeholder="הקלד תגובה ללקוח..." required autocomplete="off" style="flex: 1; border: none; padding: 12px 18px; border-radius: 24px; outline: none; font-size: 0.95rem;">
                        <button type="submit" id="admin-chat-submit-btn" class="user-chat-send" style="background: var(--secondary); color: white; border: none; width: 42px; height: 42px; border-radius: 50%; cursor: pointer;"><i class="fa-solid fa-paper-plane"></i></button>
                    </form>
                </div>
            </div>
        </div>

        <div class="modal-overlay" id="adminCustomEmailModal">
            <div class="modal-content professional-modal" style="max-width: 500px;">
                <div class="modal-header">
                    <h2><i class="fa-solid fa-envelope"></i> שליחת מייל חופשי ללקוח</h2>
                    <button class="close-modal-btn" onclick="document.getElementById('adminCustomEmailModal').classList.remove('active')" type="button"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <form onsubmit="sendAdminCustomEmail(event)" style="padding: 20px;">
                    <div class="form-group"><label>כתובת אימייל</label><input type="email" id="custom-email-address" required class="input-modern ltr-input"></div>
                    <div class="form-group"><label>נושא (שורת כותרת במייל)</label><input type="text" id="custom-email-subject" required class="input-modern"></div>
                    <div class="form-group"><label>תוכן המייל</label><textarea id="custom-email-content" required class="input-modern" rows="5"></textarea></div>
                    <button type="submit" id="btn-send-custom-email" class="btn-pro-primary" style="width: 100%;"><i class="fa-solid fa-paper-plane"></i> שלח מייל</button>
                </form>
            </div>
        </div>
    `;
    const container = document.createElement('div');
    container.innerHTML = modalHtml;
    document.body.appendChild(container);

    // טיימר בדיקות רקע למנהל (כל 3 שניות משיכה שקטה כשהצ'אט פתוח, כל 5 כשהוא סגור והמסך פתוח)
    adminChatPolling = setInterval(() => {
        if (!state.adminToken) return;
        const isModalOpen = document.getElementById('adminChatActiveModal').classList.contains('active');
        const isTabOpen = document.getElementById('tab-admin-chat').classList.contains('active');
        
        if (isModalOpen && window.activeAdminChatPhone) {
            silentRefreshAdminChat();
        } else if (isTabOpen && !isModalOpen) {
            silentRefreshAdminConversations();
        }
    }, 4000);
});

const originalSwitchTabForChat = window.switchAdminTab;
window.switchAdminTab = function(tabName) {
    if(originalSwitchTabForChat) originalSwitchTabForChat(tabName);
    if (tabName === 'chat') loadAdminChatConversations();
};

function formatAdminSmartDate(dateStr) {
    if (!dateStr) return '';
    const msgDate = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(msgDate)) return dateStr;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
    const timeStr = msgDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    if (msgDay.getTime() === today.getTime()) return `היום, ${timeStr}`;
    else if (msgDay.getTime() === yesterday.getTime()) return `אתמול, ${timeStr}`;
    else return `${msgDate.toLocaleDateString('he-IL')} ${timeStr}`;
}

window.promptNewChat = function() {
    const phone = prompt("הכנס מספר טלפון להתחלת שיחה:");
    if (phone && phone.trim().length >= 9) openAdminChatModal(phone.trim());
}

window.openCustomEmailModal = function() {
    document.getElementById('custom-email-address').value = '';
    document.getElementById('custom-email-subject').value = '';
    document.getElementById('custom-email-content').value = '';
    document.getElementById('adminCustomEmailModal').classList.add('active');
}

window.sendAdminCustomEmail = async function(e) {
    e.preventDefault();
    const email = document.getElementById('custom-email-address').value;
    const subject = document.getElementById('custom-email-subject').value;
    const content = document.getElementById('custom-email-content').value;
    
    const btn = document.getElementById('btn-send-custom-email');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    try {
        const res = await fetch(`${API_BASE_URL}/admin/chat/custom-email`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, email, subject, content })
        });
        const data = await res.json();
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> שלח מייל';
        if (res.ok && data.success) {
            showToast('המייל נשלח בהצלחה', 'success');
            document.getElementById('adminCustomEmailModal').classList.remove('active');
        } else showToast(data.error || 'שגיאה בשליחה', 'error');
    } catch(err) {
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> שלח מייל';
        showToast('שגיאת תקשורת', 'error');
    }
}

window.loadAdminChatConversations = async function() {
    const listContainer = document.getElementById('admin-chat-conv-list');
    if (!listContainer) return;
    listContainer.innerHTML = '<div class="empty-state" style="padding: 20px; grid-column: 1 / -1;"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען...</div>';
    try {
        const res = await fetch(`${API_BASE_URL}/admin/chat/conversations`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            window.allAdminConversations = data.conversations;
            renderAdminConversationList();
        }
    } catch(e) { listContainer.innerHTML = '<div class="empty-state" style="color:var(--danger); grid-column: 1 / -1;">שגיאת תקשורת</div>'; }
};

window.silentRefreshAdminConversations = async function() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/chat/conversations`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            window.allAdminConversations = data.conversations;
            renderAdminConversationList(true);
        }
    } catch(e) {}
};

window.filterAdminConversations = function() { renderAdminConversationList(); };

function renderAdminConversationList(silent = false) {
    const listContainer = document.getElementById('admin-chat-conv-list');
    const searchVal = document.getElementById('admin-chat-search').value.toLowerCase();
    const filtered = window.allAdminConversations.filter(c => c.user_phone.includes(searchVal) || (c.user_name && c.user_name.toLowerCase().includes(searchVal)));
    
    listContainer.innerHTML = '';
    if (filtered.length === 0) { listContainer.innerHTML = '<div class="empty-state" style="padding: 20px; grid-column: 1 / -1;">לא נמצאו שיחות.</div>'; return; }
    
    filtered.forEach(conv => {
        const timeStr = formatAdminSmartDate(conv.last_message_time);
        const item = document.createElement('div');
        item.className = 'conv-card';
        item.onclick = () => openAdminChatModal(conv.user_phone);
        let badgeHtml = conv.unread_count > 0 ? `<div class="conv-badge">${conv.unread_count} חדשות</div>` : '';
        
        item.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 6px;">
                <span style="font-weight: 800; font-size: 1.1rem; color: var(--text-dark);">${conv.user_name} <span dir="ltr" style="font-family: monospace; color: var(--secondary); font-size:0.9rem;">(${conv.user_phone})</span></span>
                <span style="font-size: 0.85rem; color: var(--text-light);"><i class="fa-solid fa-clock"></i> הודעה אחרונה: ${timeStr}</span>
            </div>
            ${badgeHtml}
        `;
        listContainer.appendChild(item);
    });
}

let adminLastMessagesHash = "";

window.openAdminChatModal = function(phone) {
    window.activeAdminChatPhone = phone;
    document.getElementById('admin-chat-modal-title').innerText = phone;
    document.getElementById('adminChatActiveModal').classList.add('active');
    
    adminLastMessagesHash = "";
    document.getElementById('admin-chat-messages-container').innerHTML = '<div class="empty-state" style="margin-top: 50px;"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען...</div>';
    
    loadActiveAdminChat();
    fetch(`${API_BASE_URL}/admin/chat/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken, targetPhone: phone }) }).then(() => silentRefreshAdminConversations());
};

window.closeAdminChatModal = function() {
    document.getElementById('adminChatActiveModal').classList.remove('active');
    window.activeAdminChatPhone = null;
    silentRefreshAdminConversations();
};

window.loadActiveAdminChat = async function() {
    if (!window.activeAdminChatPhone) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/chat/list`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, targetPhone: window.activeAdminChatPhone })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            adminLastMessagesHash = JSON.stringify(data.messages);
            document.getElementById('admin-chat-modal-title').innerText = `${data.userName} (${window.activeAdminChatPhone})`;
            renderAdminChatMessages(data.messages);
        }
    } catch (e) { showToast('שגיאה בטעינת השיחה', 'error'); }
};

window.silentRefreshAdminChat = async function() {
    if (!window.activeAdminChatPhone) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/chat/list`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, targetPhone: window.activeAdminChatPhone })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            const newHash = JSON.stringify(data.messages);
            if (newHash !== adminLastMessagesHash) {
                adminLastMessagesHash = newHash;
                renderAdminChatMessages(data.messages, true);
                fetch(`${API_BASE_URL}/admin/chat/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken: state.adminToken, targetPhone: window.activeAdminChatPhone }) }).then(() => silentRefreshAdminConversations());
            }
        }
    } catch (e) {}
};

function renderAdminChatMessages(messages, isSilent = false) {
    const msgContainer = document.getElementById('admin-chat-messages-container');
    const isScrolledToBottom = msgContainer.scrollHeight - msgContainer.scrollTop <= msgContainer.clientHeight + 50;
    
    msgContainer.innerHTML = '';
    if (messages.length === 0) { msgContainer.innerHTML = '<div style="text-align: center; color: var(--text-light); margin-top: 20px;">התחל שיחה עכשיו!</div>'; return; }
            
    messages.forEach(msg => {
        const isOut = msg.sender === 'admin';
        const bubbleClass = isOut ? 'user-chat-out' : 'user-chat-in'; // מנהל ירוק, לקוח לבן
        const isDeleted = msg.is_deleted === 1;
        const timeStr = formatAdminSmartDate(msg.created_at);
        
        let readTicks = '';
        if (isOut && !isDeleted) readTicks = msg.is_read ? '<i class="fa-solid fa-check-double" style="color: #3b82f6;"></i>' : '<i class="fa-solid fa-check-double" style="color: #94a3b8;"></i>';
        
        const textContent = isDeleted ? '🚫 ההודעה נמחקה' : msg.message_text;
        const delBtn = !isDeleted ? `<button class="chat-del-btn" title="מחק הודעה" onclick="deleteAdminChatMessage(${msg.id})"><i class="fa-solid fa-trash-can"></i></button>` : '';

        const bubble = document.createElement('div');
        bubble.className = `user-chat-bubble ${bubbleClass} ${isDeleted ? 'user-chat-deleted' : ''}`;
        bubble.innerHTML = `
            ${delBtn}
            <div class="user-chat-text">${textContent}</div>
            <div class="user-chat-meta"><span dir="ltr">${timeStr}</span>${readTicks}</div>
        `;
        msgContainer.appendChild(bubble);
    });
    
    if (!isSilent || isScrolledToBottom) msgContainer.scrollTop = msgContainer.scrollHeight;
}

window.sendAdminChatMessage = async function(e) {
    e.preventDefault();
    if (!window.activeAdminChatPhone) return;
    
    const inputEl = document.getElementById('admin-chat-input');
    const text = inputEl.value.trim();
    const sendEmailCheck = document.getElementById('admin-chat-send-email').checked;
    if (!text) return;
    
    const msgContainer = document.getElementById('admin-chat-messages-container');
    const timeStr = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const tempBubble = document.createElement('div');
    tempBubble.className = `user-chat-bubble user-chat-out`;
    tempBubble.innerHTML = `<div class="user-chat-text">${text}</div><div class="user-chat-meta"><span dir="ltr">היום, ${timeStr}</span><i class="fa-solid fa-check" style="color: #94a3b8;"></i></div>`;
    msgContainer.appendChild(tempBubble);
    msgContainer.scrollTop = msgContainer.scrollHeight;

    inputEl.value = '';
    const btn = document.getElementById('admin-chat-submit-btn');
    btn.disabled = true;
    
    try {
        const res = await fetch(`${API_BASE_URL}/admin/chat/send`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, targetPhone: window.activeAdminChatPhone, text: text, sendEmail: sendEmailCheck })
        });
        btn.disabled = false;
        if (res.ok) silentRefreshAdminChat();
        else { showToast('שגיאה בשליחת הודעה', 'error'); tempBubble.remove(); }
    } catch (err) { btn.disabled = false; showToast('שגיאת תקשורת', 'error'); tempBubble.remove(); }
};

window.deleteAdminChatMessage = async function(messageId) {
    const hardDelete = confirm('האם למחוק לצמיתות מהמסד? [ביטול = מחיקה רכה]');
    try {
        const res = await fetch(`${API_BASE_URL}/admin/chat/delete`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, messageId: messageId, hardDelete: hardDelete })
        });
        if (res.ok) silentRefreshAdminChat();
    } catch (e) { showToast('שגיאת תקשורת', 'error'); }
};
