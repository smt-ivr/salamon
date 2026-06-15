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
                            <button class="upload-btn attach-btn" id="chat-attach-btn" onclick="attemptFileUpload()" title="בחר קובץ מהמכשיר">
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
                                    <th>צינתוקים</th>
                                    <th>הקלטה</th>
                                    <th>העלאה קבצים</th>
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
                    <input type="checkbox" id="modal_can_record" style="width: 20px; height: 20px; cursor: pointer;">
                    <label for="modal_can_record" style="margin: 0; font-size: 0.95rem; cursor: pointer; color: var(--text-main);">מורשה להקליט הודעות (מיקרופון)</label>
                </div>

                <div class="form-group" style="display: flex; align-items: center; gap: 10px; margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 8px;">
                    <input type="checkbox" id="modal_can_upload" style="width: 20px; height: 20px; cursor: pointer;">
                    <label for="modal_can_upload" style="margin: 0; font-size: 0.95rem; cursor: pointer; color: var(--text-main);">מורשה להעלות קבצים חיצונים</label>
                </div>

                <div style="margin-top: 30px; display: flex; gap: 10px;">
                    <button type="button" class="btn-text" onclick="closeAdminModal()">ביטול</button>
                    <button type="submit" id="btn-modal-save" class="btn-primary" style="flex: 1; background: var(--secondary);">שמור שינויים <i class="fa-solid fa-check"></i></button>
                </div>
            </form>
        </div>
    </div>

    <div class="modal-overlay" id="uploadReviewModal">
        <div class="modal-content professional-modal">
            <div class="modal-header">
                <h2 id="review-title"><i class="fa-solid fa-microphone"></i> הקלטת הודעה</h2>
                <button class="close-modal-btn" onclick="cancelUpload()" title="סגור"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <div id="recording-ui" style="display: none;">
                <div class="recording-visualizer">
                    <div class="bar"></div><div class="bar"></div><div class="bar"></div>
                    <div class="bar"></div><div class="bar"></div><div class="bar"></div>
                    <div class="bar"></div><div class="bar"></div><div class="bar"></div>
                </div>
                <div id="recording-timer" class="recording-timer-pro">00:00</div>
                <div class="recording-actions-pro">
                    <button type="button" class="btn-pro-secondary" id="btn-pause-resume" onclick="togglePauseResumeRecording()">
                        <span class="icon-wrap"><i class="fa-solid fa-pause"></i></span> השהה
                    </button>
                    <button type="button" class="btn-pro-danger" onclick="stopRecordingForReview()">
                        <span class="icon-wrap"><i class="fa-solid fa-stop"></i></span> סיום הקלטה
                    </button>
                </div>
            </div>

            <div id="preview-ui" style="display: none;">
                <div class="preview-card">
                    <div class="file-icon-large"><i class="fa-solid fa-file-audio"></i></div>
                    <div id="file-info" class="file-info-text"></div>
                    <audio id="preview-audio" controls class="preview-audio-modern"></audio>
                </div>
                <div class="preview-actions-pro">
                    <button type="button" class="btn-pro-outline" onclick="cancelUpload()">
                        <i class="fa-solid fa-trash-can"></i> מחיקה
                    </button>
                    <button type="button" class="btn-pro-primary" id="btn-confirm-send" onclick="confirmUpload()">
                        <i class="fa-solid fa-paper-plane"></i> שלח הודעה
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="permissionAlertModal">
        <div class="modal-content text-center" style="max-width: 320px; padding: 30px; border-radius: 16px;">
            <div style="font-size: 3.5rem; color: #f59e0b; margin-bottom: 15px;"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <h3 style="margin-bottom: 10px; color: var(--text-dark); font-size: 1.3rem;">נדרשת הרשאה מיוחדת</h3>
            <p id="permissionAlertText" style="font-size: 0.95rem; color: var(--text-light); margin-bottom: 25px; line-height: 1.5;">
                העלאת קבצי שמע חיצוניים חסומה כברירת מחדל כדי למנוע העלאת שירים או קבצים לא מאושרים. 
                <br><br>כדי לפתוח אפשרות זו עבורך, אנא פנה להנהלת המערכת.
            </p>
            <button class="btn-primary" onclick="closePermissionAlert()" style="background: #f59e0b;">הבנתי, תודה</button>
        </div>
    </div>

    <audio id="global-audio-player"></audio>

</body>
</html>`;

export default htmlContent;
