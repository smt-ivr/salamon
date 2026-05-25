const htmlContent = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מערכת סלומון - הדור הבא</title>
    <link rel="stylesheet" href="/salamon/style.css">
    <script src="/salamon/frontend.js" defer></script>
</head>
<body>

    <header id="main-header">
        <div class="logo">
            <span class="logo-icon">💠</span> Salamon
        </div>
        <nav class="nav-links" id="navLinks">
            <button id="nav-auth" class="active" onclick="goBackToInit()">התחברות</button>
            <button id="nav-logout" style="display:none;" onclick="logout()">התנתק</button>
        </nav>
    </header>

    <main id="main-content">
        <div class="auth-wrapper">
            <section id="init-view" class="view-section active">
                <div class="glass-card fade-in">
                    <h2>ברוכים הבאים</h2>
                    <p class="subtitle">הזן מזהה להתחברות או הרשמה למערכת</p>
                    <div id="alert-init" class="alert-box"></div>
                    <form onsubmit="checkIdentifier(event)">
                        <div class="form-group">
                            <input type="text" id="init_id" required placeholder="טלפון או אימייל" class="center-text ltr-input input-modern">
                        </div>
                        <button type="submit" id="btn-init" class="btn-primary">המשך ➔</button>
                    </form>
                </div>
            </section>

            <section id="login-view" class="view-section">
                <div class="glass-card fade-in">
                    <h2>התחברות לחשבון</h2>
                    <div id="alert-login" class="alert-box"></div>
                    <div class="locked-input-container">
                        <span id="login_display_id"></span>
                        <button type="button" onclick="goBackToInit()">✎ שנה</button>
                    </div>
                    <form onsubmit="userLogin(event)">
                        <div class="form-group">
                            <input type="password" id="login_pass" required placeholder="הזן סיסמה" class="input-modern">
                        </div>
                        <button type="submit" id="btn-login" class="btn-primary">כניסה</button>
                    </form>
                </div>
            </section>

            <section id="register-view" class="view-section">
                <div class="glass-card fade-in">
                    <h2>יצירת חשבון</h2>
                    <div id="alert-register" class="alert-box"></div>
                    <div class="locked-input-container">
                        <span id="reg_display_phone"></span>
                        <button type="button" onclick="goBackToInit()">✎ שנה</button>
                    </div>
                    <form onsubmit="userRegister(event)">
                        <div class="form-group">
                            <label>שם מלא (מתוך ימות המשיח)</label>
                            <input type="text" id="reg_name" readonly class="readonly-input input-modern">
                        </div>
                        <div class="form-group">
                            <label>אימייל לגיבוי</label>
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
                        <button type="submit" id="btn-register" class="btn-primary">הרשמה ➔</button>
                    </form>
                </div>
            </section>

            <section id="admin-login-view" class="view-section">
                <div class="glass-card fade-in admin-card">
                    <div class="admin-shield">🛡️</div>
                    <h2>כניסת הנהלה</h2>
                    <div id="alert-admin-login" class="alert-box"></div>
                    <form onsubmit="adminLogin(event)">
                        <div class="form-group">
                            <input type="text" id="admin_user" required placeholder="שם משתמש" class="ltr-input input-modern">
                        </div>
                        <div class="form-group">
                            <input type="password" id="admin_pass" required placeholder="סיסמה" class="input-modern">
                        </div>
                        <button type="submit" id="btn-admin-login" class="btn-admin">התחבר למערכת</button>
                    </form>
                </div>
            </section>
        </div>

        <section id="user-dash-view" class="view-section dashboard-layout fade-in">
            <aside class="sidebar">
                <div class="user-info-mini">
                    <div class="avatar-mini">👤</div>
                    <span id="sidebar-name">אורח</span>
                </div>
                <ul class="sidebar-menu">
                    <li class="active" onclick="switchUserTab('overview', this)">📊 סקירה כללית</li>
                    <li onclick="switchUserTab('settings', this)">⚙️ הגדרות פרופיל</li>
                    <li class="disabled">📦 שירותים נוספים (בקרוב)</li>
                </ul>
            </aside>
            
            <div class="dashboard-content">
                <div id="alert-dash" class="alert-box"></div>
                
                <div id="tab-overview" class="dash-tab active">
                    <h1>שלום, <span id="dash-welcome-title">אורח</span> 👋</h1>
                    <p class="subtitle">ברוך הבא לאזור האישי החדש שלך.</p>
                    
                    <div class="status-grid">
                        <div class="status-card">
                            <div class="status-icon">📱</div>
                            <div class="label">טלפון מזוהה</div>
                            <div class="value ltr-input" id="dash-phone">-</div>
                        </div>
                        <div class="status-card">
                            <div class="status-icon">🔔</div>
                            <div class="label">סטטוס צינתוקים</div>
                            <div class="value" id="dash-tzintukim">-</div>
                        </div>
                    </div>
                </div>

                <div id="tab-settings" class="dash-tab" style="display:none;">
                    <h2>הגדרות חשבון</h2>
                    <div class="glass-card" style="margin:0; max-width: 600px;">
                        <form onsubmit="updateUserProfile(event)" class="edit-form">
                            <div class="form-group">
                                <label>אימייל מעודכן</label>
                                <input type="email" id="update_email" class="ltr-input input-modern">
                            </div>
                            <div class="form-group">
                                <label>סיסמה חדשה (השאר ריק אם אין שינוי)</label>
                                <input type="password" id="update_new_pass" placeholder="****" class="input-modern">
                            </div>
                            <div class="verification-box">
                                <label>סיסמה נוכחית (חובה לאימות השינויים)</label>
                                <input type="password" id="update_old_pass" required placeholder="הזן סיסמה נוכחית" class="input-modern">
                            </div>
                            <div class="form-actions" style="margin-top: 20px;">
                                <button type="submit" id="btn-update" class="btn-primary">שמור שינויים</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>

        <section id="admin-dash-view" class="view-section dashboard-layout fade-in">
            <div class="dashboard-content" style="width: 100%;">
                <div class="admin-header">
                    <div>
                        <h1>פאנל ניהול משתמשים</h1>
                        <p class="subtitle">שליטה ופיקוח בזמן אמת</p>
                    </div>
                    <button onclick="loadAdminUsers()" class="btn-primary small-btn" id="btn-refresh-users">רענן נתונים ↻</button>
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
        <div class="glass-card modal-content">
            <h2>עריכת משתמש</h2>
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
                <div class="form-actions" style="margin-top: 30px;">
                    <button type="button" class="btn-text" onclick="closeAdminModal()">ביטול</button>
                    <button type="submit" id="btn-modal-save" class="btn-primary">שמור שינויים</button>
                </div>
            </form>
        </div>
    </div>
</body>
</html>`;

export default htmlContent;
