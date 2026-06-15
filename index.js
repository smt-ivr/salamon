const htmlContent = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>עכשיו סלומון</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="/salamon/style.css">
    <script src="/salamon/frontend.js" defer></script>
    <script src="/salamon/admin-tzintuk.txt" defer></script>
</head>
<body>

    <div class="app-wrapper">

        <main id="auth-layout" class="view-section active">
            <div class="auth-container">
                
                <section id="init-view" class="auth-card active">
                    <div class="auth-icon"><i class="fa-solid fa-layer-group"></i></div>
                    <h2>עכשיו סלומון</h2>
                    <p class="subtitle">הזן טלפון או אימייל להתחברות</p>
                    <div id="alert-init" class="alert-box"></div>
                    <form onsubmit="event.preventDefault(); checkIdentifier(event);">
                        <div class="form-group">
                            <input type="text" id="init_id" required placeholder="טלפון או אימייל" class="center-text ltr-input input-modern">
                        </div>
                        <button type="submit" id="btn-init" class="btn-primary">המשך <i class="fa-solid fa-arrow-left"></i></button>
                    </form>
                </section>

                <section id="login-view" class="auth-card">
                    <div class="auth-icon"><i class="fa-solid fa-lock"></i></div>
                    <h2>התחברות לחשבון</h2>
                    <div id="alert-login" class="alert-box"></div>
                    <div class="locked-input-container">
                        <span id="login_display_id"></span>
                        <button type="button" onclick="goBackToInit()"><i class="fa-solid fa-pen"></i> שנה</button>
                    </div>
                    <form onsubmit="event.preventDefault(); userLogin(event);">
                        <div class="form-group">
                            <input type="password" id="login_pass" required placeholder="הזן סיסמה" class="input-modern">
                        </div>
                        <button type="submit" id="btn-login" class="btn-primary">היכנס למערכת</button>
                    </form>
                </section>

                <section id="pre-verify-view" class="auth-card">
                    <div class="auth-icon"><i class="fa-solid fa-user-plus"></i></div>
                    <h2>רישום למערכת</h2>
                    <p class="subtitle">המספר <span id="pre_verify_phone" dir="ltr" style="font-weight:bold; color:var(--play-out);"></span> מורשה אך טרם נרשם.</p>
                    <div id="alert-pre-verify" class="alert-box"></div>
                    <div class="warning-box">
                        <i class="fa-solid fa-triangle-exclamation" style="display:block; text-align:center; font-size:1.5rem; margin-bottom:10px;"></i>
                        חובה לאמת את המספר תחילה.<br>המערכת תשלח כעת שיחת אימות צינתוק לטלפון.
                    </div>
                    <button type="button" id="btn-approve-tzintuk" class="btn-primary" onclick="approveVerification()">שלח צינתוק עכשיו <i class="fa-solid fa-phone-volume"></i></button>
                    <button type="button" class="btn-text" onclick="goBackToInit()">ביטול וחזרה</button>
                </section>

                <section id="verify-view" class="auth-card">
                    <div class="auth-icon"><i class="fa-solid fa-phone-shield"></i></div>
                    <h2>אימות מספר</h2>
                    <p class="subtitle">הזן את 4 הספרות האחרונות מהשיחה</p>
                    <div id="alert-verify" class="alert-box"></div>
                    <div class="locked-input-container">
                        <span id="verify_display_phone" dir="ltr" style="color: var(--play-out);"></span>
                        <button type="button" onclick="goBackToInit()"><i class="fa-solid fa-pen"></i> שנה</button>
                    </div>
                    <form onsubmit="event.preventDefault(); verifyPhoneCode(event);">
                        <div class="form-group">
                            <input type="text" id="verify_code" required placeholder="הזן קוד" class="center-text ltr-input input-modern" maxlength="6">
                        </div>
                        <button type="submit" id="btn-verify" class="btn-primary">אמת והמשך <i class="fa-solid fa-shield-check"></i></button>
                    </form>
                    <button type="button" class="btn-text" onclick="resendVerification()"><i class="fa-solid fa-phone-volume"></i> לא קיבלת שיחה? נסה שוב</button>
                </section>

                <section id="register-view" class="auth-card">
                    <div class="auth-icon"><i class="fa-solid fa-user-check"></i></div>
                    <h2>יצירת חשבון</h2>
                    <div id="alert-register" class="alert-box"></div>
                    <div class="locked-input-container">
                        <span id="reg_display_phone"></span>
                        <span style="font-size: 0.8rem; color: #10b981;"><i class="fa-solid fa-circle-check"></i> מאומת</span>
                    </div>
                    <form onsubmit="event.preventDefault(); userRegister(event);">
                        <div class="form-group">
                            <input type="text" id="reg_name" readonly class="input-modern" style="background:#f0f2f5; color:#94a3b8;">
                        </div>
                        <div class="form-group">
                            <input type="email" id="reg_email" placeholder="אימייל (לא חובה)" class="ltr-input input-modern">
                        </div>
                        <div class="form-group">
                            <input type="password" id="reg_password" required placeholder="בחר סיסמה" class="input-modern">
                        </div>
                        <div class="form-group">
                            <input type="password" id="reg_password_confirm" required placeholder="אימות סיסמה" class="input-modern">
                        </div>
                        <button type="submit" id="btn-register" class="btn-primary">סיום הרשמה <i class="fa-solid fa-check"></i></button>
                    </form>
                </section>

                <section id="admin-login-view" class="auth-card">
                    <div class="auth-icon" style="color: var(--secondary);"><i class="fa-solid fa-shield-halved"></i></div>
                    <h2>כניסת הנהלה</h2>
                    <div id="alert-admin-login" class="alert-box"></div>
                    <form onsubmit="event.preventDefault(); adminLogin(event);">
                        <div class="form-group">
                            <input type="text" id="admin_user" required placeholder="שם משתמש" class="ltr-input input-modern">
                        </div>
                        <div class="form-group">
                            <input type="password" id="admin_pass" required placeholder="סיסמה" class="input-modern">
                        </div>
                        <button type="submit" id="btn-admin-login" class="btn-primary" style="background: var(--secondary);">התחברות מאובטחת</button>
                    </form>
                </section>

            </div>
        </main>

        <main id="user-dash-view" class="view-section app-layout">
            <aside class="app-sidebar">
                <div class="sidebar-header">
                    <div class="user-profile-wrap">
                        <div class="avatar"><i class="fa-solid fa-user"></i></div>
                        <div class="user-details">
                            <h2 id="ui-user-name">טוען...</h2>
                            <p id="ui-user-phone">---</p>
                        </div>
                    </div>
                    <div class="sidebar-actions">
                        <button title="הגדרות חשבון" onclick="switchUserTab('settings')"><i class="fa-solid fa-gear"></i></button>
                        <button title="התנתק" class="logout-btn" onclick="logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>
                    </div>
                </div>
                
                <div class="tzintuk-status" id="ui-tzintuk-badge"></div>

                <nav class="nav-menu">
                    <div class="nav-item active" id="tab-btn-messages" onclick="switchUserTab('messages')">
                        <i class="fa-solid fa-comments"></i> <span style="margin-right: 5px;">הודעות</span>
                    </div>
                </nav>
            </aside>

            <div class="app-main-area">
                <div id="tab-messages" class="app-tab active">
                    <div class="chat-header-fixed">
                        <div class="header-title-group">
                            <div class="header-icon"><i class="fa-solid fa-headphones"></i></div>
                            <div class="header-title">
                                <h3>עכשיו סלומון</h3>
                                <p>מחובר</p>
                            </div>
                        </div>
                        <button class="icon-btn" onclick="loadMessages()" title="רענן"><i class="fa-solid fa-rotate-right"></i></button>
                    </div>
                    <div id="messages-container"></div>
                    
                    <div id="chat-upload-area" class="chat-upload-area">
                        <div class="chat-input-wrapper">
                            <div class="upload-status" id="chat-upload-status">הקלט או בחר קובץ להעלאה</div>
                            <button class="upload-btn attach-btn" onclick="document.getElementById('chat-file-input').click()" title="בחר קובץ מהמכשיר">
                                <i class="fa-solid fa-paperclip"></i>
                            </button>
                            <input type="file" id="chat-file-input" accept="audio/*" style="display: none;" onchange="handleFileUpload(event)">
                        </div>
                        <button class="upload-btn record-btn" id="chat-record-btn" onclick="toggleChatRecording()" title="הקלט הודעה">
                            <i class="fa-solid fa-microphone"></i>
                        </button>
                    </div>
                </div>

                <div id="tab-settings" class="app-tab scrollable-tab">
                    <div class="settings-wrapper">
                        <h2>הגדרות פרופיל</h2>
                        <div class="settings-card">
                            <div id="alert-dash" class="alert-box"></div>
                            <form onsubmit="event.preventDefault(); updateUserProfile(event);">
                                <div class="form-group">
                                    <label>אימייל מעודכן</label>
                                    <input type="email" id="update_email" class="ltr-input input-modern">
                                </div>
                                <div class="form-group">
                                    <label>סיסמה חדשה (השאר ריק ללא שינוי)</label>
                                    <input type="password" id="update_new_pass" placeholder="****" class="input-modern">
                                </div>
                                <div class="form-group" style="margin-top: 30px; border-top: 1px solid var(--border-color); padding-top: 20px;">
                                    <label style="color: var(--danger);"><i class="fa-solid fa-lock"></i> סיסמה נוכחית (חובה לאימות)</label>
                                    <input type="password" id="update_old_pass" required placeholder="הזן סיסמה נוכחית" class="input-modern">
                                </div>
                                <button type="submit" id="btn-update" class="btn-primary" style="margin-top: 10px;">שמור שינויים <i class="fa-solid fa-floppy-disk"></i></button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <main id="admin-dash-view" class="view-section app-layout">
            <aside class="app-sidebar" style="border-top: 4px solid var(--secondary);">
                <div class="sidebar-header">
                    <div class="user-profile-wrap">
                        <div class="avatar" style="background: var(--secondary);"><i class="fa-solid fa-shield-halved"></i></div>
                        <div class="user-details">
                            <h2>פאנל הנהלה</h2>
                            <p>מחובר כמנהל</p>
                        </div>
                    </div>
                    <div class="sidebar-actions">
                        <button title="התנתק" class="logout-btn" onclick="logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>
                    </div>
                </div>

                <nav class="nav-menu admin-sidebar-menu">
                    <div class="nav-item active" id="tab-btn-users" onclick="switchAdminTab('users')">
                        <i class="fa-solid fa-users"></i> <span>ניהול משתמשים</span>
                    </div>
                    <div class="nav-item" id="tab-btn-tzintuk" onclick="switchAdminTab('tzintuk')">
                        <i class="fa-solid fa-phone-shield"></i> <span>אבטחה וצינתוקים</span>
                    </div>
                </nav>
            </aside>

            <div class="app-main-area" style="background: #fff; overflow-y: auto;">
                <div id="tab-admin-users" class="app-tab scrollable-tab active">
                    <div class="admin-top-bar">
                        <div>
                            <h1>רשימת משתמשים</h1>
                            <p class="subtitle">צפייה ועריכת משתמשים רשומים</p>
                        </div>
                        <button onclick="loadAdminUsers()" class="btn-primary small-btn" id="btn-refresh-users" style="width: auto; background: var(--secondary);"><i class="fa-solid fa-rotate-right"></i> רענן נתונים</button>
                    </div>
                    <div id="alert-admin-dash" class="alert-box"></div>
                    <div class="table-wrapper">
                        <table class="modern-table">
                            <thead>
                                <tr>
                                    <th>טלפון</th>
                                    <th>שם משתמש</th>
                                    <th>אימייל</th>
                                    <th>סיסמה</th>
                                    <th>צינתוקים</th>
                                    <th>הרשאת העלאה</th>
                                    <th>פעולות</th>
                                </tr>
                            </thead>
                            <tbody id="admin-users-table-body">
                                <tr><td colspan="7" class="empty-state">יש ללחוץ על "רענן נתונים"</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div id="tab-admin-tzintuk" class="app-tab scrollable-tab">
                    <div class="admin-top-bar">
                        <div>
                            <h1>מערכת אימות וחסימות</h1>
                            <p class="subtitle">שליטה על צינתוקים וניטור התקפות</p>
                        </div>
                        <button onclick="loadVerifyBlocks(); loadVerifyLogs();" class="btn-primary small-btn" style="width: auto; background: var(--text-main);"><i class="fa-solid fa-rotate-right"></i> רענן הכל</button>
                    </div>

                    <div class="settings-card" style="max-width: 100%; border-color: var(--danger); margin-bottom: 30px;">
                        <h3 style="color: var(--danger); margin-bottom: 15px;"><i class="fa-solid fa-ban"></i> חסימה ידנית חדשה</h3>
                        <form id="manual-block-form" onsubmit="event.preventDefault(); submitManualBlock(event);" style="display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-end;">
                            <div class="form-group" style="flex: 1; min-width: 120px;">
                                <label>סוג חסימה</label>
                                <select id="block_type" class="input-modern" style="padding: 10px;">
                                    <option value="phone">מספר טלפון</option>
                                    <option value="ip">כתובת IP</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex: 2; min-width: 200px;">
                                <label>טלפון / IP לחסימה</label>
                                <input type="text" id="block_value" required class="ltr-input input-modern" style="padding: 10px;" placeholder="לדוגמה: 0501234567">
                            </div>
                            <div class="form-group" style="flex: 2; min-width: 200px;">
                                <label>סיבת חסימה</label>
                                <input type="text" id="block_reason" class="input-modern" style="padding: 10px;" placeholder="ספאם, נסיון פריצה...">
                            </div>
                            <div class="form-group" style="flex: 1; min-width: 100px;">
                                <label>זמן</label>
                                <input type="number" id="block_duration" value="24" required class="input-modern center-text" style="padding: 10px;">
                            </div>
                            <div class="form-group" style="flex: 1; min-width: 120px;">
                                <label>יחידת זמן</label>
                                <select id="block_unit" class="input-modern" style="padding: 10px;">
                                    <option value="hours">שעות</option>
                                    <option value="minutes">דקות</option>
                                    <option value="days">ימים</option>
                                    <option value="permanent">לצמיתות</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex: 1; min-width: 150px;">
                                <button type="submit" id="btn-submit-block" class="btn-primary" style="background: var(--danger); padding: 10px;">החל חסימה <i class="fa-solid fa-lock"></i></button>
                            </div>
                        </form>
                    </div>

                    <h3 style="margin-bottom: 15px; color: var(--text-dark);"><i class="fa-solid fa-shield-virus"></i> חסימות פעילות ברשת</h3>
                    <div class="table-wrapper" style="margin-bottom: 40px;">
                        <table class="modern-table">
                            <thead>
                                <tr>
                                    <th>סוג</th>
                                    <th>ערך (טלפון/IP)</th>
                                    <th>סיבה</th>
                                    <th>תאריך חסימה</th>
                                    <th>תפוגה</th>
                                    <th>פעולות</th>
                                </tr>
                            </thead>
                            <tbody id="admin-blocks-table-body"></tbody>
                        </table>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px;">
                        <h3 style="color: var(--text-dark); margin: 0;"><i class="fa-solid fa-list-ol"></i> היסטוריית בקשות אימות אחרונות</h3>
                        <button onclick="cleanOldLogs()" id="btn-clean-logs" class="btn-text" style="font-size: 0.85rem; padding: 0;"><i class="fa-solid fa-broom"></i> נקה לוגים ישנים</button>
                    </div>
                    <div class="table-wrapper">
                        <table class="modern-table">
                            <thead>
                                <tr>
                                    <th>תאריך ושעה</th>
                                    <th>טלפון</th>
                                    <th>כתובת IP</th>
                                    <th>מטרה</th>
                                    <th>קוד סודי</th>
                                    <th>סטטוס אימות</th>
                                    <th>נסיונות</th>
                                </tr>
                            </thead>
                            <tbody id="admin-logs-table-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>

    </div> 
    
    <div class="modal-overlay" id="adminEditModal">
        <div class="modal-content">
            <h2 style="margin-bottom: 20px;">עריכת משתמש</h2>
            <div id="alert-modal" class="alert-box"></div>
            <form onsubmit="event.preventDefault(); submitAdminUpdate(event);">
                <div class="form-group">
                    <label>טלפון</label>
                    <input type="text" id="modal_phone" readonly class="input-modern" style="background:#f0f2f5; color:#94a3b8; direction:ltr; text-align:right;">
                </div>
                <div class="form-group">
                    <label>אימייל</label>
                    <input type="email" id="modal_email" class="ltr-input input-modern">
                </div>
                <div class="form-group">
                    <label>סיסמה חדשה</label>
                    <input type="text" id="modal_password" class="ltr-input input-modern">
                </div>
                
                <div class="form-group" style="display: flex; align-items: center; gap: 10px; margin-top: 15px; padding: 10px; background: #f8fafc; border-radius: 8px;">
                    <input type="checkbox" id="modal_can_upload" style="width: 20px; height: 20px; cursor: pointer;">
                    <label for="modal_can_upload" style="margin: 0; font-size: 0.95rem; cursor: pointer; color: var(--text-main);">מורשה להעלות הודעות לאתר</label>
                </div>

                <div style="margin-top: 30px; display: flex; gap: 10px;">
                    <button type="button" class="btn-text" onclick="closeAdminModal()">ביטול</button>
                    <button type="submit" id="btn-modal-save" class="btn-primary" style="flex: 1; background: var(--secondary);">שמור שינויים <i class="fa-solid fa-check"></i></button>
                </div>
            </form>
        </div>
    </div>

    <div class="modal-overlay" id="uploadReviewModal">
        <div class="modal-content text-center" style="max-width: 400px; padding: 30px;">
            <h2 id="review-title" style="margin-bottom: 20px; color: var(--text-dark);">הקלטת הודעה</h2>
            
            <div id="recording-ui" style="display: none;">
                <div class="recording-pulse">
                    <i class="fa-solid fa-microphone"></i>
                </div>
                <div id="recording-timer" style="font-size: 2.8rem; font-weight: bold; margin: 20px 0; font-variant-numeric: tabular-nums; color: var(--text-main);">00:00</div>
                
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <button type="button" class="btn-text" id="btn-pause-resume" onclick="togglePauseResumeRecording()" style="flex: 1; min-width: 120px; background: #f1f5f9; border-radius: 8px; font-size: 1rem;"><i class="fa-solid fa-pause"></i> השהה</button>
                    <button type="button" class="btn-primary" onclick="stopRecordingForReview()" style="flex: 1; min-width: 120px; background: var(--danger);"><i class="fa-solid fa-stop"></i> סיום</button>
                </div>
                <button type="button" class="btn-text" onclick="cancelUpload()" style="margin-top: 20px; color: var(--text-light);"><i class="fa-solid fa-times"></i> ביטול ומחיקה</button>
            </div>

            <div id="preview-ui" style="display: none;">
                <div id="file-info" style="margin-bottom: 15px; font-size: 0.95rem; font-weight: 600; color: var(--text-light); direction: ltr; word-break: break-all;"></div>
                
                <audio id="preview-audio" controls class="preview-audio-modern"></audio>
                
                <div style="display: flex; gap: 10px; margin-top: 25px;">
                    <button type="button" class="btn-text" style="flex: 1; background: #fee2e2; color: #b91c1c; border-radius: 8px;" onclick="cancelUpload()"><i class="fa-solid fa-trash"></i> מחיקה</button>
                    <button type="button" class="btn-primary" style="flex: 1.5; background: var(--play-out);" id="btn-confirm-send" onclick="confirmUpload()"><i class="fa-solid fa-paper-plane"></i> שלח עכשיו</button>
                </div>
            </div>
        </div>
    </div>

    <audio id="global-audio-player"></audio>

</body>
</html>`;

export default htmlContent;
