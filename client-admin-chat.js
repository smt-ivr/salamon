// client-admin-chat.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. הוספת תפריט צד למנהל
    const adminMenu = document.querySelector('.admin-sidebar-menu');
    if (adminMenu) {
        const chatMenuItem = document.createElement('div');
        chatMenuItem.className = 'nav-item';
        chatMenuItem.id = 'tab-btn-chat';
        chatMenuItem.onclick = () => switchAdminTab('chat');
        chatMenuItem.innerHTML = `<i class="fa-solid fa-headset"></i> <span>ניהול צ'אט לקוחות</span>`;
        adminMenu.appendChild(chatMenuItem);
    }

    // 2. יצירת אזור התוכן המרכזי למערכת הצ'אט
    const appMainArea = document.querySelector('#admin-dash-view .app-main-area');
    if (appMainArea) {
        const chatTab = document.createElement('div');
        chatTab.id = 'tab-admin-chat';
        chatTab.className = 'app-tab';
        chatTab.style.padding = "0"; 
        chatTab.innerHTML = `
            <div class="admin-top-bar" style="margin-bottom: 0; padding: 20px 30px; flex-shrink: 0; background: #fff; border-bottom: 1px solid var(--border-color);">
                <div>
                    <h1>ניהול שיחות ותמיכה בלקוחות</h1>
                    <p class="subtitle" style="margin-bottom: 0;">ניהול פניות, מעקב סטטוס, התראות למייל ומחיקת הודעות</p>
                </div>
                <button onclick="loadAdminChatConversations()" class="btn-primary small-btn" style="width: auto; background: var(--secondary);"><i class="fa-solid fa-rotate-right"></i> רענן רשימה</button>
            </div>

            <div style="display: flex; flex: 1; overflow: hidden; background: #f8fafc;">
                <!-- פאנל ימני: רשימת שיחות -->
                <div style="width: 320px; border-left: 1px solid var(--border-color); display: flex; flex-direction: column; background: #fff;">
                    <div style="padding: 15px; border-bottom: 1px solid var(--border-color); background: #f1f5f9; font-weight: 800; color: var(--text-dark); display: flex; justify-content: space-between; align-items: center;">
                        <span><i class="fa-solid fa-list"></i> פניות פעילות</span>
                    </div>
                    <div id="admin-chat-conv-list" style="flex: 1; overflow-y: auto;">
                        <div class="empty-state" style="padding: 20px;">טוען שיחות...</div>
                    </div>
                </div>

                <!-- פאנל שמאלי: השיחה הפעילה -->
                <div id="admin-active-chat-area" style="flex: 1; display: flex; flex-direction: column; background: #efeae2; display: none;">
                    <div style="height: 65px; background: #f0f2f5; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; padding: 0 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); z-index: 10;">
                        <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 10px; color: var(--text-dark);">
                            <i class="fa-solid fa-circle-user" style="font-size: 1.8rem; color: #94a3b8;"></i>
                            <span id="admin-chat-phone-display" dir="ltr" style="font-family: monospace; font-size: 1.2rem;"></span>
                        </h3>
                        <button onclick="loadActiveAdminChat()" class="btn-text" style="width: auto; padding: 5px 10px; background: #fff; border: 1px solid #e2e8f0;"><i class="fa-solid fa-rotate"></i> רענן שיחה</button>
                    </div>
                    
                    <div id="admin-chat-messages-container" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 8px; background-image: url('https://www.transparenttextures.com/patterns/cubes.png');">
                    </div>

                    <div style="background: #f0f2f5; padding: 15px 20px; border-top: 1px solid var(--border-color);">
                        <form onsubmit="sendAdminChatMessage(event)" style="display: flex; gap: 12px; align-items: center;">
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                                <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--text-light); cursor: pointer; font-weight: 600;">
                                    <input type="checkbox" id="admin-chat-send-email" checked style="accent-color: var(--secondary);">
                                    שלח במקביל התראה למייל של הלקוח
                                </label>
                                <input type="text" id="admin-chat-input" class="input-modern" placeholder="הקלד תגובה ללקוח כאן..." required style="border-radius: 24px; padding: 12px 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #fff;">
                            </div>
                            <button type="submit" id="admin-chat-submit-btn" class="btn-primary" style="width: 50px; height: 50px; border-radius: 50%; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; margin-top: 22px;"><i class="fa-solid fa-paper-plane"></i></button>
                        </form>
                    </div>
                </div>
                
                <!-- מצב ריק - טרם נבחרה שיחה -->
                <div id="admin-chat-empty-state" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; background: #f8fafc;">
                    <i class="fa-solid fa-comments" style="font-size: 5rem; margin-bottom: 20px; opacity: 0.3;"></i>
                    <h2 style="color: var(--text-light);">בחר שיחה מהרשימה</h2>
                    <p>לחץ על מספר טלפון מימין כדי לצפות ולענות לפניות.</p>
                </div>
            </div>
        `;
        appMainArea.appendChild(chatTab);
    }

    // הזרקת עיצובי CSS מותאמים אישית לצ'אט מנהל
    const chatStyles = document.createElement('style');
    chatStyles.innerHTML = `
        .chat-conv-item { padding: 15px 20px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: 0.2s; display: flex; justify-content: space-between; align-items: center; }
        .chat-conv-item:hover { background: #f8fafc; }
        .chat-conv-item.active { background: #eff6ff; border-right: 4px solid var(--secondary); }
        .chat-badge { background: var(--danger); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; }
        
        .chat-bubble-admin { max-width: 75%; padding: 8px 12px; border-radius: 12px; position: relative; margin-bottom: 2px; box-shadow: 0 1px 1px rgba(0,0,0,0.1); display: flex; flex-direction: column; gap: 4px; }
        .chat-in { background: #ffffff; align-self: flex-start; border-top-right-radius: 0; }
        .chat-out { background: #dcf8c6; align-self: flex-end; border-top-left-radius: 0; }
        .chat-deleted { background: transparent !important; border: 1px dashed #cbd5e1; color: #94a3b8; font-style: italic; box-shadow: none; }
        
        .chat-bubble-text { font-size: 0.95rem; line-height: 1.4; word-wrap: break-word; }
        .chat-bubble-meta { display: flex; align-items: center; justify-content: flex-end; gap: 5px; font-size: 0.7rem; color: #64748b; }
        
        .chat-del-btn { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; position: absolute; top: 50%; transform: translateY(-50%); opacity: 0; transition: 0.2s; font-size: 0.8rem; }
        .chat-in .chat-del-btn { left: -35px; }
        .chat-out .chat-del-btn { right: -35px; }
        .chat-bubble-admin:hover .chat-del-btn { opacity: 1; }
        .chat-del-btn:hover { background: #ef4444; color: white; border-color: #ef4444; }
    `;
    document.head.appendChild(chatStyles);
});

// משתנה למעקב אחר השיחה הפעילה
window.activeAdminChatPhone = null;

// חיבור התאב למערכת הניווט של המנהל
const originalSwitchTabForChat = window.switchAdminTab;
window.switchAdminTab = function(tabName) {
    if(originalSwitchTabForChat) originalSwitchTabForChat(tabName);
    if (tabName === 'chat') {
        loadAdminChatConversations();
    }
};

window.loadAdminChatConversations = async function() {
    const listContainer = document.getElementById('admin-chat-conv-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '<div class="empty-state" style="padding: 20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> טוען...</div>';
    
    try {
        const res = await fetch(`${API_BASE_URL}/admin/chat/conversations`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            listContainer.innerHTML = '';
            if (data.conversations.length === 0) {
                listContainer.innerHTML = '<div class="empty-state" style="padding: 20px;">אין פניות פעילות.</div>';
                return;
            }
            
            data.conversations.forEach(conv => {
                const isActive = window.activeAdminChatPhone === conv.user_phone;
                const timeObj = new Date(conv.last_message_time.replace(' ', 'T') + 'Z');
                const timeStr = isNaN(timeObj) ? '' : timeObj.toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'});
                
                const item = document.createElement('div');
                item.className = `chat-conv-item ${isActive ? 'active' : ''}`;
                item.onclick = () => openAdminChat(conv.user_phone);
                
                let badgeHtml = conv.unread_count > 0 ? `<span class="chat-badge">${conv.unread_count}</span>` : '';
                
                item.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <span dir="ltr" style="font-weight: 700; font-family: monospace; font-size: 1.05rem; color: var(--text-dark);">${conv.user_phone}</span>
                        <span style="font-size: 0.8rem; color: var(--text-light);"><i class="fa-solid fa-clock"></i> ${timeStr}</span>
                    </div>
                    <div>${badgeHtml}</div>
                `;
                listContainer.appendChild(item);
            });
        } else {
            listContainer.innerHTML = `<div class="empty-state" style="color:var(--danger);">שגיאה: ${data.error}</div>`;
        }
    } catch(e) {
        listContainer.innerHTML = '<div class="empty-state" style="color:var(--danger);">שגיאת תקשורת</div>';
    }
};

window.openAdminChat = function(phone) {
    window.activeAdminChatPhone = phone;
    document.getElementById('admin-chat-empty-state').style.display = 'none';
    document.getElementById('admin-active-chat-area').style.display = 'flex';
    document.getElementById('admin-chat-phone-display').innerText = phone;
    
    // סימון ויזואלי של השיחה הנוכחית ברשימה
    document.querySelectorAll('.chat-conv-item').forEach(el => el.classList.remove('active'));
    
    // טעינת ההודעות
    loadActiveAdminChat();
    
    // עדכון קריאת הודעות ברקע (מעלים את הבועות האדומות)
    fetch(`${API_BASE_URL}/admin/chat/read`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken: state.adminToken, targetPhone: phone })
    }).then(() => loadAdminChatConversations());
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
                const bubbleClass = isOut ? 'chat-out' : 'chat-in';
                const isDeleted = msg.is_deleted === 1;
                
                const timeObj = new Date(msg.created_at.replace(' ', 'T') + 'Z');
                const timeStr = isNaN(timeObj) ? '' : timeObj.toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'});
                
                let readTicks = '';
                if (isOut && !isDeleted) {
                    readTicks = msg.is_read ? '<i class="fa-solid fa-check-double" style="color: #3b82f6;"></i>' : '<i class="fa-solid fa-check" style="color: #94a3b8;"></i>';
                }
                
                const textContent = isDeleted ? '🚫 ההודעה נמחקה' : msg.message_text;
                // כפתור מחיקה יופיע רק להודעות שטרם נמחקו
                const delBtn = !isDeleted ? `<button class="chat-del-btn" title="מחק הודעה" onclick="deleteAdminChatMessage(${msg.id})"><i class="fa-solid fa-trash-can"></i></button>` : '';

                const bubble = document.createElement('div');
                bubble.className = `chat-bubble-admin ${bubbleClass} ${isDeleted ? 'chat-deleted' : ''}`;
                bubble.innerHTML = `
                    ${delBtn}
                    <div class="chat-bubble-text">${textContent}</div>
                    <div class="chat-bubble-meta">
                        <span dir="ltr">${timeStr}</span>
                        ${readTicks}
                    </div>
                `;
                msgContainer.appendChild(bubble);
            });
            
            // גלילה אוטומטית למטה
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
            loadActiveAdminChat(); // רענון אזור השיחה
            loadAdminChatConversations(); // רענון הרשימה משמאל לזמן ההודעה האחרונה
        } else {
            showToast(data.error || 'שגיאה בשליחת הודעה', 'error');
        }
    } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
        showToast('שגיאת תקשורת', 'error');
    }
};

window.deleteAdminChatMessage = async function(messageId) {
    // מערכת חכמה לבחירה בין מחיקה רכה לקשה
    const hardDelete = confirm('האם תרצה למחוק את ההודעה לצמיתות ממאגר הנתונים?\n\n[אישור] = מחיקה לצמיתות (ההודעה תעלם לחלוטין).\n[ביטול] = מחיקה רכה (ישאיר חיווי "ההודעה נמחקה").');
    
    try {
        const res = await fetch(`${API_BASE_URL}/admin/chat/delete`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                adminToken: state.adminToken, 
                messageId: messageId,
                hardDelete: hardDelete 
            })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            showToast('ההודעה נמחקה', 'success');
            loadActiveAdminChat();
        } else {
            showToast(data.error || 'שגיאה במחיקה', 'error');
        }
    } catch (e) {
        showToast('שגיאת תקשורת', 'error');
    }
};
