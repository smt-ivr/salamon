// client-admin-chat.js

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
                    <p class="subtitle" style="margin-bottom: 0;">ניהול פניות חיות בזמן אמת, לחץ על שיחה כדי לפתוח אותה</p>
                </div>
                <button onclick="loadAdminChatConversations()" class="btn-primary small-btn" style="width: auto; background: var(--secondary);"><i class="fa-solid fa-rotate-right"></i> רענן רשימה</button>
            </div>
            
            <div id="admin-chat-conv-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                <div class="empty-state" style="padding: 20px; grid-column: 1 / -1;">טוען שיחות...</div>
            </div>
        `;
        appMainArea.appendChild(chatTab);
    }

    // הזרקת המודל (חלון השיחה המרחף)
    const chatModalStyles = document.createElement('style');
    chatModalStyles.innerHTML = `
        .admin-chat-modal .modal-content { max-width: 600px; height: 85vh; max-height: 800px; display: flex; flex-direction: column; padding: 0; background: #efeae2; overflow: hidden;}
        .admin-chat-header { background: #0f172a; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .admin-chat-header h3 { margin: 0; font-size: 1.15rem; display: flex; align-items: center; gap: 10px; font-weight: 700; direction: ltr;}
        .admin-chat-close { background: none; border: none; color: white; font-size: 1.3rem; cursor: pointer; opacity: 0.8; transition: 0.2s; }
        .admin-chat-close:hover { opacity: 1; transform: scale(1.1); color: #ef4444; }
        
        .conv-card { background: #fff; border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; cursor: pointer; transition: 0.2s; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .conv-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.05); border-color: var(--secondary); }
        .conv-badge { background: var(--danger); color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; }
    `;
    document.head.appendChild(chatModalStyles);

    const modalHtml = `
        <div class="modal-overlay admin-chat-modal" id="adminChatActiveModal">
            <div class="modal-content professional-modal">
                <div class="admin-chat-header">
                    <button class="admin-chat-close" onclick="closeAdminChatModal()"><i class="fa-solid fa-xmark"></i></button>
                    <h3><span id="admin-chat-modal-title"></span> <i class="fa-solid fa-circle-user"></i></h3>
                </div>
                
                <div id="admin-chat-messages-container" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 8px; background-image: url('https://www.transparenttextures.com/patterns/cubes.png');">
                </div>

                <div style="background: #f0f2f5; padding: 12px 15px; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 8px;">
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--text-light); cursor: pointer; font-weight: 600;">
                        <input type="checkbox" id="admin-chat-send-email" checked style="accent-color: var(--secondary);">
                        שלח התראה למייל של הלקוח
                    </label>
                    <form onsubmit="sendAdminChatMessage(event)" style="display: flex; gap: 10px; align-items: center;">
                        <input type="text" id="admin-chat-input" class="user-chat-input" placeholder="הקלד תגובה ללקוח..." required autocomplete="off" style="flex: 1; border: none; padding: 12px 18px; border-radius: 24px; outline: none; font-size: 0.95rem;">
                        <button type="submit" id="admin-chat-submit-btn" class="user-chat-send" style="background: var(--secondary); color: white; border: none; width: 42px; height: 42px; border-radius: 50%; cursor: pointer;"><i class="fa-solid fa-paper-plane"></i></button>
                    </form>
                </div>
            </div>
        </div>
    `;
    const container = document.createElement('div');
    container.innerHTML = modalHtml;
    document.body.appendChild(container.firstElementChild);
});

window.activeAdminChatPhone = null;

const originalSwitchTabForChat = window.switchAdminTab;
window.switchAdminTab = function(tabName) {
    if(originalSwitchTabForChat) originalSwitchTabForChat(tabName);
    if (tabName === 'chat') {
        loadAdminChatConversations();
    }
};

function formatAdminSmartDate(dateStr) {
    if (!dateStr) return '';
    const msgDate = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(msgDate)) return dateStr;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
    const timeStr = msgDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    if (msgDay.getTime() === today.getTime()) return `היום, ${timeStr}`;
    else if (msgDay.getTime() === yesterday.getTime()) return `אתמול, ${timeStr}`;
    else return `${msgDate.toLocaleDateString('he-IL')} ${timeStr}`;
}

window.loadAdminChatConversations = async function() {
    const listContainer = document.getElementById('admin-chat-conv-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '<div class="empty-state" style="padding: 20px; grid-column: 1 / -1;"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען...</div>';
    
    try {
        const res = await fetch(`${API_BASE_URL}/admin/chat/conversations`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            listContainer.innerHTML = '';
            if (data.conversations.length === 0) {
                listContainer.innerHTML = '<div class="empty-state" style="padding: 20px; grid-column: 1 / -1;">אין פניות פעילות.</div>';
                return;
            }
            
            data.conversations.forEach(conv => {
                const timeStr = formatAdminSmartDate(conv.last_message_time);
                const item = document.createElement('div');
                item.className = 'conv-card';
                item.onclick = () => openAdminChatModal(conv.user_phone);
                
                let badgeHtml = conv.unread_count > 0 ? `<div class="conv-badge">${conv.unread_count} חדשות</div>` : '';
                
                item.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <span dir="ltr" style="font-weight: 800; font-family: monospace; font-size: 1.15rem; color: var(--text-dark);">${conv.user_phone}</span>
                        <span style="font-size: 0.85rem; color: var(--text-light);"><i class="fa-solid fa-clock"></i> הודעה אחרונה: ${timeStr}</span>
                    </div>
                    ${badgeHtml}
                `;
                listContainer.appendChild(item);
            });
        }
    } catch(e) {
        listContainer.innerHTML = '<div class="empty-state" style="color:var(--danger); grid-column: 1 / -1;">שגיאת תקשורת</div>';
    }
};

window.openAdminChatModal = function(phone) {
    window.activeAdminChatPhone = phone;
    document.getElementById('admin-chat-modal-title').innerText = phone;
    document.getElementById('adminChatActiveModal').classList.add('active');
    
    loadActiveAdminChat();
    
    fetch(`${API_BASE_URL}/admin/chat/read`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken: state.adminToken, targetPhone: phone })
    }).then(() => loadAdminChatConversations());
};

window.closeAdminChatModal = function() {
    document.getElementById('adminChatActiveModal').classList.remove('active');
    window.activeAdminChatPhone = null;
    loadAdminChatConversations(); // מרענן את רשימת השיחות בסגירה
};

window.loadActiveAdminChat = async function() {
    if (!window.activeAdminChatPhone) return;
    const msgContainer = document.getElementById('admin-chat-messages-container');
    
    try {
        const res = await fetch(`${API_BASE_URL}/admin/chat/list`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, targetPhone: window.activeAdminChatPhone })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            msgContainer.innerHTML = '';
            
            if (data.messages.length === 0) {
                msgContainer.innerHTML = '<div style="text-align: center; color: var(--text-light); margin-top: 20px;">אין הודעות להצגה.</div>';
                return;
            }
            
            data.messages.forEach(msg => {
                const isOut = msg.sender === 'admin';
                const bubbleClass = isOut ? 'user-chat-out' : 'user-chat-in'; // משתמש באותם קלאסים ירוק/לבן
                const isDeleted = msg.is_deleted === 1;
                
                const timeStr = formatAdminSmartDate(msg.created_at);
                
                let readTicks = '';
                if (isOut && !isDeleted) {
                    readTicks = msg.is_read ? '<i class="fa-solid fa-check-double" style="color: #3b82f6;"></i>' : '<i class="fa-solid fa-check-double" style="color: #94a3b8;"></i>';
                }
                
                const textContent = isDeleted ? '🚫 ההודעה נמחקה' : msg.message_text;

                const bubble = document.createElement('div');
                bubble.className = `user-chat-bubble ${bubbleClass} ${isDeleted ? 'user-chat-deleted' : ''}`;
                bubble.innerHTML = `
                    <div class="user-chat-text">${textContent}</div>
                    <div class="user-chat-meta">
                        <span dir="ltr">${timeStr}</span>
                        ${readTicks}
                    </div>
                `;
                msgContainer.appendChild(bubble);
            });
            
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }
    } catch (e) {
        showToast('שגיאה בטעינת השיחה', 'error');
    }
};

window.sendAdminChatMessage = async function(e) {
    e.preventDefault();
    if (!window.activeAdminChatPhone) return;
    
    const inputEl = document.getElementById('admin-chat-input');
    const text = inputEl.value.trim();
    const sendEmailCheck = document.getElementById('admin-chat-send-email').checked;
    
    if (!text) return;
    
    const btn = document.getElementById('admin-chat-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    
    try {
        const res = await fetch(`${API_BASE_URL}/admin/chat/send`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                adminToken: state.adminToken, 
                targetPhone: window.activeAdminChatPhone,
                text: text,
                sendEmail: sendEmailCheck
            })
        });
        const data = await res.json();
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
        
        if (res.ok && data.success) {
            inputEl.value = '';
            loadActiveAdminChat();
        } else {
            showToast(data.error || 'שגיאה בשליחת הודעה', 'error');
        }
    } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
        showToast('שגיאת תקשורת', 'error');
    }
};
