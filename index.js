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

    <header id="main-header">
        <div class="logo">
            <i class="fa-solid fa-layer-group logo-icon"></i> עכשיו סלומון
        </div>
        <nav class="nav-links" id="navLinks">
            <button id="nav-auth" class="active" onclick="goBackToInit()"><i class="fa-solid fa-right-to-bracket"></i> התחברות</button>
            <button id="nav-logout" style="display:none;" onclick="logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> התנתק</button>
        </nav>
    </header>

    <main id="main-content">
        <section id="init-view" class="view-section auth-section active">
            <div class="clean-card fade-in">
                <h2>ברוכים הבאים</h2>
                <p class="subtitle">הזן טלפון או אימייל להתחברות</p>
                <div id="alert-init" class="alert-box"></div>
                <form onsubmit="checkIdentifier(event)">
                    <div class="form-group">
                        <input type="text" id="init_id" required placeholder="טלפון או אימייל" class="center-text ltr-input input-modern">
                    </div>
                    <button type="submit" id="btn-init" class="btn-primary">המשך <i class="fa-solid fa-arrow-left" style="margin-right: 8px;"></i></button>
                </form>
            </div>
        </section>

        <section id="login-view" class="view-section auth-section">
            <div class="clean-card fade-in">
                <h2>התחברות לחשבון</h2>
                <div id="alert-login" class="alert-box"></div>
                <div class="locked-input-container">
                    <span id="login_display_id"></span>
                    <button type="button" onclick="goBackToInit()"><i class="fa-solid fa-pen"></i> שנה</button>
                </div>
                <form onsubmit="userLogin(event)">
                    <div class="form-group">
                        <input type="password" id="login_pass" required placeholder="הזן סיסמה" class="input-modern">
                    </div>
                    <button type="submit" id="btn-login" class="btn-primary">היכנס למערכת</button>
                </form>
            </div>
        </section>

        <section id="pre-verify-view" class="view-section auth-section">
            <div class="clean-card fade-in">
                <h2>רישום למערכת</h2>
                <p class="subtitle">המספר <span id="pre_verify_phone" dir="ltr" style="font-weight:bold; color:var(--primary);"></span> מורשה אך טרם נרשם.</p>
                <div id="alert-pre-verify" class="alert-box"></div>
                <div class="verification-box">
                    <i class="fa-solid fa-triangle-exclamation" style="margin-bottom: 8px; font-size: 1.2rem; display: block; text-align: center;"></i>
                    כדי לפתוח חשבון, חובה לאמת את המספר תחילה.<br>
                    המערכת תוציא כעת שיחת צינתוק קצרה לטלפון שלך.
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button type="button" id="btn-approve-tzintuk" class="btn-primary" onclick="approveVerification()">שלח לי צינתוק עכשיו <i class="fa-solid fa-phone-volume"></i></button>
                    <button type="button" class="btn-text" onclick="goBackToInit()">ביטול וחזרה</button>
                </div>
            </div>
        </section>

        <section id="verify-view" class="view-section auth-section">
            <div class="clean-card fade-in">
                <h2>אימות מספר טלפון</h2>
                <p class="subtitle">הזן את 4 הספרות האחרונות מהשיחה</p>
                <div id="alert-verify" class="alert-box"></div>
                <div class="locked-input-container">
                    <span id="verify_display_phone" dir="ltr" style="color: var(--primary);"></span>
                    <button type="button" onclick="goBackToInit()"><i class="fa-solid fa-pen"></i> שנה</button>
                </div>
                <form onsubmit="verifyPhoneCode(event)">
                    <div class="form-group">
                        <input type="text" id="verify_code" required placeholder="הזן קוד מזהה" class="center-text ltr-input input-modern" autocomplete="one-time-code" maxlength="6">
                    </div>
                    <button type="submit" id="btn-verify" class="btn-primary">אמת והמשך <i class="fa-solid fa-shield-check"></i></button>
                </form>
                <button type="button" class="btn-text" onclick="resendVerification()" style="margin-top: 15px;"><i class="fa-solid fa-phone-volume"></i> לא קיבלת שיחה? נסה שוב</button>
            </div>
        </section>

        <section id="register-view" class="view-section auth-section">
            <div class="clean-card fade-in">
                <h2>יצירת חשבון</h2>
                <div id="alert-register" class="alert-box"></div>
                <div class="locked-input-container">
                    <span id="reg_display_phone"></span>
                    <span style="font-size: 0.8rem; color: var(--success);"><i class="fa-solid fa-circle-check"></i> מספר מאומת</span>
                </div>
                <form onsubmit="userRegister(event)">
                    <div class="form-group">
                        <label>שם מלא</label>
                        <input type="text" id="reg_name" readonly class="readonly-input input-modern">
                    </div>
                    <div class="form-group">
                        <label>אימייל (לא חובה)</label>
                        <input type="email" id="reg_email" placeholder="name@domain.com" class="ltr-input input-modern">
                    </div>
                    <div class="form-group">
                        <label>בחר סיסמה</label>
                        <input type="password" id="reg_password" required placeholder="****" class="input-modern">
                    </div>
                    <div class="form-group">
                        <label>אימות סיסמה</label>
                        <input type="password" id="reg_password_confirm" required placeholder="****" class="input-modern">
                    </div>
                    <button type="submit" id="btn-register" class="btn-primary">סיום הרשמה <i class="fa-solid fa-check"></i></button>
                </form>
            </div>
        </section>

        <section id="admin-login-view" class="view-section auth-section">
            <div class="clean-card fade-in admin-card">
                <div class="admin-shield"><i class="fa-solid fa-shield-halved"></i></div>
                <h2>כניסת הנהלה</h2>
                <div id="alert-admin-login" class="alert-box"></div>
                <form onsubmit="adminLogin(event)">
                    <div class="form-group">
                        <input type="text" id="admin_user" required placeholder="שם משתמש" class="ltr-input input-modern">
                    </div>
                    <div class="form-group">
                        <input type="password" id="admin_pass" required placeholder="סיסמה" class="input-modern">
                    </div>
                    <button type="submit" id="btn-admin-login" class="btn-admin">התחברות מאובטחת</button>
                </form>
            </div>
        </section>

        <section id="user-dash-view" class="view-section dashboard-layout fade-in" style="padding: 0; background: #fff;">
            
            <aside class="sidebar app-sidebar">
                <div class="sidebar-header" style="height: 65px; padding: 0 15px; background: var(--header-bg); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--play-out); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;"><i class="fa-solid fa-user"></i></div>
                        <div>
                            <h2 id="ui-user-name" style="font-size: 0.95rem; margin-bottom:0; color: var(--text-dark);">טוען...</h2>
                            <p id="ui-user-phone" class="ltr-input" style="font-size: 0.8rem; color: var(--text-light); text-align: right; margin:0;">---</p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button title="הגדרות חשבון" onclick="switchUserTab('settings', this)" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-light); padding: 8px;"><i class="fa-solid fa-gear"></i></button>
                        <button title="התנתק" onclick="logout()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--danger); padding: 8px;"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>
                    </div>
                </div>
                
                <div class="tzintuk-status" id="ui-tzintuk-badge" style="padding: 10px 15px; font-size: 0.85rem; font-weight: 600; border-bottom: 1px solid var(--border);"></div>

                <nav class="nav-menu" style="flex: 1; padding-top: 10px;">
                    <div class="nav-item active" style="padding: 15px 20px; display: flex; align-items: center; gap: 15px; cursor: pointer; font-weight: 600; border-right: 4px solid var(--play-out); background: #f0f2f5; color: var(--play-out);" onclick="switchUserTab('messages', this)">
                        <i class="fa-solid fa-comments" style="width: 25px; text-align: center; font-size: 1.2rem;"></i> <span>הודעות סלומון</span>
                    </div>
                </nav>
            </aside>
            
            <div class="dashboard-content app-main-area" style="padding: 0; display: flex; flex-direction: column; background: var(--chat-bg);">
                
                <div id="tab-messages" class="dash-tab active" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative;">
                    <div style="height: 65px; background: var(--header-bg); padding: 0 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); flex-shrink: 0; z-index: 10;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: #0f766e; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #fff;"><i class="fa-solid fa-headphones"></i></div>
                            <div>
                                <h3 style="font-size: 1.05rem; color: var(--text-dark); margin:0;">עכשיו סלומון</h3>
                                <p style="font-size: 0.8rem; color: var(--text-light); margin:0;">מחובר ומסונכרן</p>
                            </div>
                        </div>
                        <button onclick="loadMessages()" style="background: none; border: none; font-size: 1.2rem; color: var(--text-light); cursor: pointer;" title="רענן"><i class="fa-solid fa-rotate-right"></i></button>
                    </div>
                    
                    <div id="messages-table-body" class="messages-chat-container">
                        </div>
                </div>

                <div id="tab-settings" class="dash-tab" style="display:none; padding: 40px 20px; overflow-y: auto; background: #fff;">
                    <h2 style="text-align:center; margin-bottom:25px; color: var(--text-dark);">הגדרות פרופיל</h2>
                    <div id="alert-dash" class="alert-box" style="max-width: 500px; margin: 0 auto 15px auto;"></div>
                    <form onsubmit="updateUserProfile(event)" style="max-width: 500px; margin: 0 auto; border: 1px solid var(--border); padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
                        <div class="form-group">
                            <label>אימייל מעודכן</label>
                            <input type="email" id="update_email" class="ltr-input input-modern">
                        </div>
                        <div class="form-group">
                            <label>סיסמה חדשה (השאר ריק ללא שינוי)</label>
                            <input type="password" id="update_new_pass" placeholder="****" class="input-modern">
                        </div>
                        <div class="form-group" style="margin-top: 30px; border-top: 1px solid var(--border); padding-top: 20px;">
                            <label style="color: var(--danger);"><i class="fa-solid fa-lock"></i> סיסמה נוכחית (חובה לאימות)</label>
                            <input type="password" id="update_old_pass" required placeholder="הזן סיסמה נוכחית" class="input-modern">
                        </div>
                        <div class="form-actions" style="margin-top: 20px;">
                            <button type="submit" id="btn-update" class="btn-primary" style="background: var(--play-out);">שמור שינויים <i class="fa-solid fa-floppy-disk"></i></button>
                        </div>
                    </form>
                </div>

            </div>
        </section>

        <section id="admin-dash-view" class="view-section dashboard-layout fade-in">
            <aside class="sidebar" style="border-top: 4px solid var(--secondary);">
                <div class="user-info-mini">
                    <div class="avatar-mini" style="background: var(--secondary); color: white;"><i class="fa-solid fa-shield-halved"></i></div>
                    <span style="font-weight: 700; color: var(--text-dark); font-size: 1.1rem;">פאנל הנהלה</span>
                </div>
                <ul class="sidebar-menu admin-sidebar-menu">
                    <li class="active" onclick="switchAdminTab('users', this)"><i class="fa-solid fa-users"></i> ניהול משתמשים</li>
                    <li onclick="switchAdminTab('tzintuk', this)"><i class="fa-solid fa-phone-shield"></i> אבטחה וצינתוקים</li>
                </ul>
            </aside>

            <div class="dashboard-content">
                <div id="alert-admin-dash" class="alert-box"></div>
                
                <div id="tab-admin-users" class="admin-dash-tab active">
                    <div class="admin-header">
                        <div>
                            <h1 style="margin-bottom: 5px;">רשימת משתמשים</h1>
                            <p class="subtitle" style="text-align:right;">צפייה ועריכת משתמשים רשומים</p>
                        </div>
                        <button onclick="loadAdminUsers()" class="btn-primary small-btn" id="btn-refresh-users" style="width: auto;"><i class="fa-solid fa-rotate-right"></i> רענן נתונים</button>
                    </div>
                    <div class="table-wrapper">
                        <table class="modern-table">
                            <thead>
                                <tr>
                                    <th>טלפון</th>
                                    <th>שם משתמש</th>
                                    <th>אימייל</th>
                                    <th>סיסמה</th>
                                    <th>צינתוקים</th>
                                    <th>פעולות</th>
                                </tr>
                            </thead>
                            <tbody id="admin-users-table-body">
                                <tr><td colspan="6" class="empty-state">יש ללחוץ על "רענן נתונים"</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div id="tab-admin-tzintuk" class="admin-dash-tab" style="display:none;">
                    <div class="admin-header" style="border-bottom:none; padding-bottom:0;">
                        <div>
                            <h1 style="margin-bottom: 5px;">מערכת אימות וחסימות</h1>
                        </div>
                        <button onclick="switchAdminTab('tzintuk', document.querySelector('.admin-sidebar-menu li:nth-child(2)'))" class="btn-primary small-btn" style="width: auto; background: var(--text-main);"><i class="fa-solid fa-rotate-right"></i> רענן הכל</button>
                    </div>

                    <div class="clean-card" style="max-width: 100%; margin-bottom: 30px; border: 1px solid var(--danger);">
                        <h3 style="color: var(--danger); margin-bottom: 15px;"><i class="fa-solid fa-ban"></i> חסימה ידנית חדשה</h3>
                        <form id="manual-block-form" onsubmit="submitManualBlock(event)" style="display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-end;">
                            <div class="form-group" style="flex: 1; min-width: 120px;">
                                <label>סוג חסימה</label>
                                <select id="block_type" class="input-modern" style="padding: 10px;">
                                    <option value="phone">מספר טלפון</option>
                                    <option value="ip">כתובת IP</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex: 2; min-width: 200px;">
                                <label>טלפון / IP לחסימה</label>
                                <input type="text" id="block_value" required class="ltr-input input-modern" style="padding: 10px;">
                            </div>
                            <div class="form-group" style="flex: 2; min-width: 200px;">
                                <label>סיבת חסימה</label>
                                <input type="text" id="block_reason" class="input-modern" style="padding: 10px;">
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
                                <button type="submit" id="btn-submit-block" class="btn-primary" style="background: var(--danger); padding: 10px;">החל חסימה</button>
                            </div>
                        </form>
                    </div>

                    <h3 style="margin-bottom: 10px; color: var(--text-dark);"><i class="fa-solid fa-shield-virus"></i> חסימות פעילות</h3>
                    <div class="table-wrapper" style="margin-bottom: 40px;">
                        <table class="modern-table">
                            <thead>
                                <tr>
                                    <th>סוג</th>
                                    <th>ערך</th>
                                    <th>סיבה</th>
                                    <th>תאריך חסימה</th>
                                    <th>תפוגה</th>
                                    <th>פעולות</th>
                                </tr>
                            </thead>
                            <tbody id="admin-blocks-table-body"></tbody>
                        </table>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px;">
                        <h3 style="color: var(--text-dark); margin: 0;"><i class="fa-solid fa-list-ol"></i> היסטוריית אימותים</h3>
                        <button onclick="cleanOldLogs()" id="btn-clean-logs" class="btn-text" style="font-size: 0.85rem;"><i class="fa-solid fa-broom"></i> נקה לוגים ישנים</button>
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
        </section>
    </main>

    <div class="modal-overlay" id="adminEditModal">
        <div class="clean-card modal-content">
            <h2 style="margin-bottom: 20px;">עריכת משתמש</h2>
            <div id="alert-modal" class="alert-box"></div>
            <form onsubmit="submitAdminUpdate(event)">
                <div class="form-group">
                    <label>טלפון</label>
                    <input type="text" id="modal_phone" readonly class="readonly-input ltr-input input-modern">
                </div>
                <div class="form-group">
                    <label>אימייל</label>
                    <input type="email" id="modal_email" class="ltr-input input-modern">
                </div>
                <div class="form-group">
                    <label>סיסמה חדשה</label>
                    <input type="text" id="modal_password" class="ltr-input input-modern">
                </div>
                <div class="form-actions" style="margin-top: 30px; display: flex; gap: 10px;">
                    <button type="button" class="btn-text" onclick="closeAdminModal()">ביטול</button>
                    <button type="submit" id="btn-modal-save" class="btn-primary" style="flex: 1;">שמור שינויים <i class="fa-solid fa-check"></i></button>
                </div>
            </form>
        </div>
    </div>

    <audio id="global-audio-player"></audio>

</body>
</html>`;

export default htmlContent;
