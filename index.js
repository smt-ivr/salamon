const htmlContent = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>עכשיו סלומון</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="/salamon/style.css">
    <script src="/salamon/frontend.js" defer></script>
</head>
<body>

    <header id="main-header">
        <div class="logo">
            <i class="fa-solid fa-layer-group logo-icon"></i>עכשיו סלומון
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

        <section id="verify-view" class="view-section auth-section">
            <div class="clean-card fade-in">
                <h2>אימות מספר טלפון</h2>
                <p class="subtitle">כדי להירשם, הזן את הקוד שקיבלת כעת בשיחה נכנסת</p>
                <div id="alert-verify" class="alert-box"></div>
                <div class="locked-input-container">
                    <span id="verify_display_phone" dir="ltr" style="color: var(--primary);"></span>
                    <button type="button" onclick="goBackToInit()"><i class="fa-solid fa-pen"></i> שנה</button>
                </div>
                <form onsubmit="verifyPhoneCode(event)">
                    <div class="form-group">
                        <input type="text" id="verify_code" required placeholder="הזן את הקוד שקיבלת" class="center-text ltr-input input-modern" autocomplete="one-time-code" maxlength="6">
                    </div>
                    <button type="submit" id="btn-verify" class="btn-primary">אמת והמשך <i class="fa-solid fa-shield-check" style="margin-right: 5px;"></i></button>
                </form>
                <button type="button" class="btn-text" onclick="resendVerification()" style="margin-top: 15px; width: 100%;"><i class="fa-solid fa-phone-volume"></i> לא קיבלת שיחה? נסה שוב</button>
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
                        <label>אימייל</label>
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
                    <button type="submit" id="btn-register" class="btn-primary">סיום הרשמה <i class="fa-solid fa-check" style="margin-right: 5px;"></i></button>
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

        <section id="user-dash-view" class="view-section dashboard-layout fade-in">
            <aside class="sidebar">
                <div class="user-info-mini">
                    <div class="avatar-mini"><i class="fa-solid fa-user"></i></div>
                    <span id="sidebar-name">אורח</span>
                </div>
                <ul class="sidebar-menu">
                    <li class="active" onclick="switchUserTab('overview', this)"><i class="fa-solid fa-chart-pie"></i> סקירה כללית</li>
                    <li onclick="switchUserTab('messages', this); loadMessages();"><i class="fa-solid fa-microphone-lines"></i> הודעות קוליות</li>
                    <li onclick="switchUserTab('settings', this)"><i class="fa-solid fa-gear"></i> הגדרות פרופיל</li>
                </ul>
            </aside>
            
            <div class="dashboard-content">
                <div id="alert-dash" class="alert-box"></div>
                
                <div id="tab-overview" class="dash-tab active">
                    <h1 style="margin-bottom: 5px;">שלום, <span id="dash-welcome-title">אורח</span></h1>
                    <p class="subtitle" style="text-align: right; margin-bottom: 30px;">ברוך הבא לאזור האישי החדש שלך.</p>
                    
                    <div class="status-grid">
                        <div class="status-card">
                            <div class="status-icon"><i class="fa-solid fa-mobile-screen"></i></div>
                            <div class="label">טלפון מזוהה</div>
                            <div class="value ltr-input" id="dash-phone">-</div>
                        </div>
                        <div class="status-card">
                            <div class="status-icon"><i class="fa-solid fa-bell"></i></div>
                            <div class="label">סטטוס צינתוקים</div>
                            <div class="value" id="dash-tzintukim">-</div>
                        </div>
                    </div>
                </div>

                <div id="tab-messages" class="dash-tab" style="display:none;">
                    <div class="admin-header" style="margin-bottom: 20px;">
                        <div>
                            <h1 style="margin-bottom: 5px;">הודעות מהמערכת</h1>
                            <p class="subtitle" style="text-align:right;">האזנה להודעות קוליות ישירות מהאתר</p>
                        </div>
                        <button onclick="loadMessages()" class="btn-primary small-btn" id="btn-refresh-messages" style="width: auto;"><i class="fa-solid fa-rotate-right"></i> רענן נתונים</button>
                    </div>
                    
                    <div id="alert-messages" class="alert-box"></div>
                    
                    <div class="audio-player-container" id="audio-player-wrapper">
                        <div class="playing-title" id="playing-title">מנגן כעת: המתן...</div>
                        <audio id="main-audio-player" controls controlsList="nodownload" style="width: 100%; outline: none;"></audio>
                    </div>

                    <div class="table-wrapper">
                        <table class="modern-table">
                            <thead>
                                <tr>
                                    <th>שם הקובץ</th>
                                    <th>תאריך</th>
                                    <th>גודל</th>
                                    <th>אורך</th>
                                    <th>פעולות</th>
                                </tr>
                            </thead>
                            <tbody id="messages-table-body">
                                <tr><td colspan="5" class="empty-state">טוען הודעות...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div id="tab-settings" class="dash-tab" style="display:none;">
                    <h2 style="text-align:right; margin-bottom:20px;">הגדרות חשבון</h2>
                    <form onsubmit="updateUserProfile(event)" class="edit-form" style="max-width: 500px;">
                        <div class="form-group">
                            <label>אימייל מעודכן</label>
                            <input type="email" id="update_email" class="ltr-input input-modern">
                        </div>
                        <div class="form-group">
                            <label>סיסמה חדשה (השאר ריק אם אין שינוי)</label>
                            <input type="password" id="update_new_pass" placeholder="****" class="input-modern">
                        </div>
                        <div class="verification-box">
                            <label><i class="fa-solid fa-lock"></i> סיסמה נוכחית (חובה לאימות)</label>
                            <input type="password" id="update_old_pass" required placeholder="הזן סיסמה נוכחית" class="input-modern">
                        </div>
                        <div class="form-actions" style="margin-top: 20px;">
                            <button type="submit" id="btn-update" class="btn-primary">שמור שינויים <i class="fa-solid fa-floppy-disk"></i></button>
                        </div>
                    </form>
                </div>
            </div>
        </section>

        <section id="admin-dash-view" class="view-section dashboard-layout fade-in">
            <div class="dashboard-content" style="width: 100%;">
                <div class="admin-header">
                    <div>
                        <h1 style="margin-bottom: 5px;">פאנל ניהול משתמשים</h1>
                        <p class="subtitle" style="text-align:right;">שליטה ופיקוח בזמן אמת</p>
                    </div>
                    <button onclick="loadAdminUsers()" class="btn-primary small-btn" id="btn-refresh-users"><i class="fa-solid fa-rotate-right"></i> רענן נתונים</button>
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
                                <th>פעולות</th>
                            </tr>
                        </thead>
                        <tbody id="admin-users-table-body">
                            <tr><td colspan="6" class="empty-state">יש ללחוץ על "רענן נתונים"</td></tr>
                        </tbody>
                    </table>
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
</body>
</html>`;

export default htmlContent;
