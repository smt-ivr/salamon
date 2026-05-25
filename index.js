const htmlContent = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מערכת סלומון - אזור אישי</title>
    <link rel="stylesheet" href="/salamon/style.css">
    <script src="/salamon/frontend.js" defer></script>
</head>
<body>

    <header>
        <div class="logo">Salamon.</div>
        <nav class="nav-links" id="navLinks">
            <button id="nav-auth" class="active" onclick="goBackToInit()">התחברות והרשמה</button>
            <button id="nav-dash" style="display:none;" onclick="showView('user-dash-view')">האזור שלי</button>
            <button id="nav-admin-dash" style="display:none;" onclick="showView('admin-dash-view')">ניהול משתמשים</button>
            <button id="nav-admin-login" onclick="showView('admin-login-view'); clearMessage();">כניסת מנהל</button>
            <button id="nav-logout" style="display:none;" onclick="logout()">התנתק מהמערכת</button>
        </nav>
    </header>

    <main>
        <section id="init-view" class="view-section active">
            <div class="card fade-in">
                <h2>התחברות למערכת</h2>
                <div id="alert-init" class="alert-box"></div>
                <p class="subtitle">הזן מספר טלפון או כתובת אימייל.<br>המערכת תזהה אוטומטית אם יש לך חשבון קיים.</p>
                <form onsubmit="checkIdentifier(event)">
                    <div class="form-group">
                        <input type="text" id="init_id" required placeholder="0501234567 או name@example.com" class="center-text ltr-input">
                    </div>
                    <button type="submit" id="btn-init" class="btn-primary">המשך לשלב הבא</button>
                </form>
            </div>
        </section>

        <section id="login-view" class="view-section">
            <div class="card fade-in">
                <h2>התחברות לחשבון</h2>
                <div id="alert-login" class="alert-box"></div>
                
                <div class="locked-input-container">
                    <span id="login_display_id"></span>
                    <button type="button" onclick="goBackToInit()">✎ שנה מזהה</button>
                </div>

                <form onsubmit="userLogin(event)">
                    <div class="form-group">
                        <label>הקלד סיסמה</label>
                        <input type="password" id="login_pass" required placeholder="הסיסמה שלך">
                    </div>
                    <button type="submit" id="btn-login" class="btn-primary">התחבר עכשיו</button>
                </form>
            </div>
        </section>

        <section id="register-view" class="view-section">
            <div class="card fade-in">
                <h2>יצירת חשבון חדש</h2>
                <div id="alert-register" class="alert-box"></div>
                
                <div class="locked-input-container">
                    <span id="reg_display_phone"></span>
                    <button type="button" onclick="goBackToInit()">✎ שנה מספר</button>
                </div>

                <form onsubmit="userRegister(event)">
                    <div class="form-group">
                        <label>שם מלא (מתוך ימות המשיח)</label>
                        <input type="text" id="reg_name" readonly class="readonly-input">
                    </div>
                    <div class="form-group">
                        <label>אימייל לגיבוי ושחזור (אופציונלי)</label>
                        <input type="email" id="reg_email" placeholder="name@domain.com" class="ltr-input">
                    </div>
                    <div class="form-group">
                        <label>בחר סיסמה (4 עד 10 ספרות)</label>
                        <input type="password" id="reg_password" required placeholder="****">
                    </div>
                    <div class="form-group">
                        <label>אימות סיסמה</label>
                        <input type="password" id="reg_password_confirm" required placeholder="****">
                    </div>
                    <button type="submit" id="btn-register" class="btn-primary">סיים הרשמה</button>
                </form>
            </div>
        </section>

        <section id="user-dash-view" class="view-section">
            <div class="card large profile-card fade-in">
                
                <div id="profile-display">
                    <div class="profile-header">
                        <div class="avatar">👤</div>
                        <h2 id="dash-welcome-title">שלום, אורח</h2>
                        <p class="subtitle">האזור האישי שלך בסלומון</p>
                    </div>

                    <div id="alert-dash" class="alert-box"></div>

                    <div class="status-grid">
                        <div class="status-item">
                            <div class="label">טלפון מזוהה</div>
                            <div class="value ltr-input" id="dash-phone">-</div>
                        </div>
                        <div class="status-item">
                            <div class="label">שם במערכת</div>
                            <div class="value" id="dash-name">-</div>
                        </div>
                        <div class="status-item">
                            <div class="label">סטטוס צינתוקים</div>
                            <div class="value" id="dash-tzintukim" style="margin-top: 5px;">-</div>
                        </div>
                    </div>

                    <div class="profile-actions">
                        <button class="btn-outline" onclick="toggleEditMode(true)">⚙️ הגדרות ועריכת פרופיל</button>
                    </div>
                </div>

                <div id="profile-edit" style="display: none;">
                    <div class="profile-header">
                        <h2>עריכת פרטי חשבון</h2>
                        <p class="subtitle">עדכן את כתובת האימייל או החלף סיסמה</p>
                    </div>
                    
                    <form onsubmit="updateUserProfile(event)" class="edit-form">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>אימייל מעודכן</label>
                                <input type="email" id="update_email" class="ltr-input">
                            </div>
                            <div class="form-group">
                                <label>סיסמה חדשה (השאר ריק אם אין שינוי)</label>
                                <input type="password" id="update_new_pass" placeholder="****">
                            </div>
                        </div>
                        <div class="form-group verification-box">
                            <label>סיסמה נוכחית (חובה לאימות)</label>
                            <input type="password" id="update_old_pass" required placeholder="הזן סיסמה קיימת לאישור">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-text" onclick="toggleEditMode(false)">ביטול וחזרה</button>
                            <button type="submit" id="btn-update" class="btn-primary" style="max-width: 200px;">שמור שינויים</button>
                        </div>
                    </form>
                </div>
            </div>
        </section>

        <section id="admin-login-view" class="view-section">
            <div class="card fade-in">
                <h2>התחברות לניהול</h2>
                <div id="alert-admin-login" class="alert-box"></div>
                <form onsubmit="adminLogin(event)">
                    <div class="form-group">
                        <label>שם משתמש מנהל</label>
                        <input type="text" id="admin_user" required class="ltr-input">
                    </div>
                    <div class="form-group">
                        <label>סיסמת מנהל</label>
                        <input type="password" id="admin_pass" required>
                    </div>
                    <button type="submit" id="btn-admin-login" class="btn-primary dark-btn">התחבר כמנהל</button>
                </form>
            </div>
        </section>

        <section id="admin-dash-view" class="view-section">
            <div class="card large fade-in">
                <div class="admin-header">
                    <div>
                        <h2 style="margin: 0; text-align: right;">ניהול משתמשים</h2>
                        <p class="subtitle" style="margin-top: 5px;">משיכת נתונים בזמן אמת</p>
                    </div>
                    <button onclick="loadAdminUsers()" class="btn-primary small-btn" id="btn-refresh-users">רענן נתונים ↻</button>
                </div>
                
                <div id="alert-admin-dash" class="alert-box"></div>

                <div class="table-container">
                    <table>
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
        <div class="card modal-content">
            <h2 style="margin-bottom: 20px;">עריכת משתמש</h2>
            <div id="alert-modal" class="alert-box"></div>
            <form onsubmit="submitAdminUpdate(event)">
                <div class="form-group">
                    <label>טלפון (לא ניתן לשינוי)</label>
                    <input type="text" id="modal_phone" readonly class="readonly-input ltr-input">
                </div>
                <div class="form-group">
                    <label>אימייל</label>
                    <input type="email" id="modal_email" class="ltr-input">
                </div>
                <div class="form-group">
                    <label>סיסמה חדשה (השאר ריק ללא שינוי)</label>
                    <input type="text" id="modal_password" class="ltr-input">
                </div>
                <div class="form-actions" style="margin-top: 30px;">
                    <button type="button" class="btn-text" onclick="closeAdminModal()">ביטול</button>
                    <button type="submit" id="btn-modal-save" class="btn-primary" style="flex: 2;">שמור נתונים</button>
                </div>
            </form>
        </div>
    </div>
</body>
</html>`;

export default htmlContent;
