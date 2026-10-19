// settings.js — הגדרות מתקדמות: חשבון, אבטחה, מכשירים, מראה, השמעה, התראות, הקלטה ואפליקציה.
// הגדרות המראה וההשמעה נשמרות מיד ומסונכרנות בין כל המכשירים של המשתמש.

(() => {
'use strict';
const { $, esc, api } = App;

const S = { root: null, page: 'home', security: null };
const ACCENTS = { green: ['ירוק', '#16a34a'], blue: ['כחול', '#2563eb'], violet: ['סגול', '#7c3aed'], rose: ['ורוד', '#e11d48'], orange: ['כתום', '#ea580c'], teal: ['טורקיז', '#0d9488'], slate: ['אפור', '#334155'] };
const EVENTS = { LOGIN: ['כניסה', 'fa-right-to-bracket'], LOGIN_MASTER: ['כניסת מנהל', 'fa-user-shield'], LOGIN_FAILED: ['ניסיון כניסה שנכשל', 'fa-triangle-exclamation'], LOGOUT: ['יציאה', 'fa-right-from-bracket'], PASSWORD_CHANGE: ['שינוי סיסמה', 'fa-key'], PASSWORD_RESET: ['איפוס סיסמה', 'fa-key'], PROFILE_UPDATE: ['עדכון פרטים', 'fa-user-pen'], EMAIL_LINK_OPENED: ['כניסה מקישור במייל', 'fa-envelope-open-text'], REGISTER: ['פתיחת החשבון', 'fa-user-plus'] };

const ic = (icon, color) => `<span class="ic" style="background:${color}"><i class="${icon.includes('fa-brands') ? icon : 'fa-solid ' + icon}"></i></span>`;
const item = ({ act, page, icon, color, title, sub, val, danger, href }) => {
    const inner = `${ic(icon, color)}<span class="tx"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>${val ? `<span class="val">${esc(val)}</span>` : ''}<i class="fa-solid fa-chevron-left chev"></i>`;
    if (href) return `<a class="set-item ${danger ? 'danger' : ''}" href="${href}" style="text-decoration:none;color:inherit;">${inner}</a>`;
    return `<button class="set-item ${danger ? 'danger' : ''}" data-act="${act || 'set-page'}" ${page ? `data-page="${page}"` : ''}>${inner}</button>`;
};
const toggle = (key, title, sub, icon, color) => `<label class="set-item">${ic(icon, color)}<span class="tx"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="switch"><input type="checkbox" data-pref="${key}" ${App.prefs[key] ? 'checked' : ''}><span></span></span></label>`;
const pageHead = title => `<div class="set-page-head"><button class="icon-btn" data-act="set-page" data-page="home" aria-label="חזרה"><i class="fa-solid fa-arrow-right"></i></button><h2>${esc(title)}</h2></div>`;

function themeLabel() { return { system: 'לפי המכשיר', light: 'בהיר', dark: 'כהה' }[App.prefs.theme]; }

const PAGES = {
    home() {
        const u = App.user;
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
        return `<div class="set-hero">${App.avatar(u.name, u.phone, 'lg', u.profilePictureUrl)}<div style="position:relative;min-width:0;"><b>${esc(u.name)}</b><small>${esc(u.phone)}</small>
            <div class="chips-row">${u.connectedToTzintukim ? '<span class="badge"><i class="fa-solid fa-phone-volume"></i> מחובר לצינתוקים</span>' : '<span class="badge"><i class="fa-solid fa-phone-slash"></i> לא מחובר לצינתוקים</span>'}
            <span class="badge"><i class="fa-${u.authMethod === 'google' ? 'brands fa-google' : 'solid fa-lock'}"></i> ${u.authMethod === 'google' ? 'Google' : 'סיסמה'}</span>
            ${u.isSuperAdmin ? '<span class="badge"><i class="fa-solid fa-crown"></i> מנהל-על</span>' : u.isAdmin ? '<span class="badge"><i class="fa-solid fa-user-shield"></i> צוות</span>' : ''}</div></div></div>

        <div class="set-group"><h4>חשבון</h4><div class="set-list">
            ${item({ page: 'profile', icon: 'fa-user', color: '#2563eb', title: 'פרטים אישיים', sub: u.email || 'לא הוגדר מייל' })}
            ${item({ page: 'security', icon: 'fa-shield-halved', color: '#16a34a', title: 'אבטחה וסיסמה', sub: 'שינוי סיסמה, כניסה עם Google בלבד' })}
            ${item({ page: 'devices', icon: 'fa-laptop-code', color: '#7c3aed', title: 'מכשירים והתחברויות', sub: 'איפה החשבון מחובר, ומה קרה בו לאחרונה' })}
        </div></div>

        <div class="set-group"><h4>חוויה</h4><div class="set-list">
            ${item({ page: 'appearance', icon: 'fa-palette', color: '#db2777', title: 'מראה', sub: 'ערכת צבעים, צבע מבטא, גודל טקסט', val: themeLabel() })}
            ${item({ page: 'playback', icon: 'fa-headphones', color: '#0d9488', title: 'השמעה', sub: 'מהירות, דילוגים, השמעה רציפה', val: `${App.prefs.playbackRate}×` })}
            ${item({ page: 'notifications', icon: 'fa-bell', color: '#ea580c', title: 'התראות וצלילים', sub: 'הודעות חדשות, תשובות בצ׳אט, שעות שקט', val: App.canNotify() ? 'פעיל' : '' })}
            ${App.user.canRecord || App.user.canUpload ? item({ page: 'recording', icon: 'fa-microphone', color: '#dc2626', title: 'הקלטה ושליחה', sub: 'בדיקת מיקרופון, אישור לפני שליחה, צינתוק' }) : ''}
        </div></div>

        <div class="set-group"><h4>אפליקציה</h4><div class="set-list">
            ${standalone ? '' : App.installPrompt ? item({ act: 'set-install', icon: 'fa-download', color: '#0891b2', title: 'התקנה כאפליקציה', sub: 'אייקון במסך הבית, פתיחה במסך מלא' }) : isIOS ? item({ act: 'set-ios-install', icon: 'fa-download', color: '#0891b2', title: 'הוספה למסך הבית', sub: 'פתיחה כמו אפליקציה, במסך מלא' }) : ''}
            ${item({ page: 'data', icon: 'fa-database', color: '#64748b', title: 'נתונים ואיפוס', sub: 'ניקוי נתונים מהמכשיר, איפוס הגדרות' })}
            ${u.isAdmin || u.isSuperAdmin ? item({ href: '/salamon/admin', icon: 'fa-user-shield', color: '#0f172a', title: 'מרכז השליטה', sub: 'ניהול המערכת' }) : ''}
            ${item({ href: '/salamon', icon: 'fa-clock-rotate-left', color: '#94a3b8', title: 'מעבר לגרסה הקלאסית', sub: 'האתר הרגיל נשאר זמין תמיד' })}
            ${item({ page: 'about', icon: 'fa-circle-info', color: '#4f46e5', title: 'עזרה וקיצורים', sub: 'מה חדש, קיצורי מקלדת' })}
        </div></div>

        <div class="set-group"><div class="set-list">
            ${item({ act: 'set-logout', icon: 'fa-right-from-bracket', color: 'var(--bad)', title: 'יציאה מהחשבון', danger: true })}
        </div></div>
        <div class="muted" style="text-align:center;font-size:.78rem;padding:4px 0 12px;">עכשיו סלומון · גרסה 2.0</div>`;
    },

    profile() {
        const u = App.user;
        return `${pageHead('פרטים אישיים')}
        <div class="set-group"><div class="set-list">
            <div class="set-block"><span class="label">שם</span><b>${esc(u.name)}</b><span class="hint">השם נקבע במערכת הטלפונית (ההקלטה של השם שלכם בקו)</span></div>
            <div class="set-block"><span class="label">מספר טלפון</span><b class="ltr" style="text-align:right;">${esc(u.phone)}</b>
                <span class="badge ${u.connectedToTzintukim ? 'good' : 'warn'}" style="justify-self:start;"><i class="fa-solid ${u.connectedToTzintukim ? 'fa-phone-volume' : 'fa-phone-slash'}"></i> ${u.connectedToTzintukim ? 'מחובר לרשימת הצינתוקים' : 'לא מחובר לרשימת הצינתוקים'}</span></div>
        </div></div>
        <div class="set-group"><h4>מייל</h4><div class="set-list">
            <div class="set-block">
                ${u.emailGloballyBlocked ? `<div class="alert warn"><i class="fa-solid fa-ban"></i><div>הכתובת הזו חסמה בעבר קבלת מיילים מהמערכת, ולכן לא יישלחו אליה מיילים.<br><button class="btn sm soft" data-act="set-unblock" style="margin-top:8px;">ביטול החסימה</button></div></div>` : ''}
                <div class="field"><label for="s-email">כתובת מייל</label><input class="input ltr" id="s-email" type="email" value="${esc(u.email)}" placeholder="name@example.com" autocomplete="email"></div>
                <span class="hint">משמש לאיפוס סיסמה, התראות אבטחה ותשובות מהצוות</span>
            </div>
            <label class="set-item">${ic('fa-envelope', '#2563eb')}<span class="tx"><b>עדכונים במייל</b><small>התראות אבטחה, קודי איפוס ותשובות מהצ׳אט</small></span><span class="switch"><input type="checkbox" id="s-receive" ${u.receiveEmails ? 'checked' : ''}><span></span></span></label>
        </div></div>
        <button class="btn primary lg block" data-act="set-save-profile"><i class="fa-solid fa-floppy-disk"></i> שמירת השינויים</button>`;
    },

    security() {
        const u = App.user;
        return `${pageHead('אבטחה וסיסמה')}
        ${u.authMethod === 'password' ? `<div class="set-group"><h4>שינוי סיסמה</h4><div class="set-list"><div class="set-block">
            <div class="field"><label for="s-old">הסיסמה הנוכחית</label><input class="input ltr" id="s-old" type="password" inputmode="numeric" maxlength="10" autocomplete="current-password"></div>
            <div class="field"><label for="s-new">סיסמה חדשה (4–10 ספרות)</label><input class="input ltr" id="s-new" type="password" inputmode="numeric" maxlength="10" autocomplete="new-password"><div class="meter"><i id="s-meter"></i></div><span class="hint" id="s-meter-t"></span></div>
            <div class="field"><label for="s-new2">אימות הסיסמה החדשה</label><input class="input ltr" id="s-new2" type="password" inputmode="numeric" maxlength="10" autocomplete="new-password"></div>
            <label class="check"><input type="checkbox" id="s-logout-all"> לנתק את כל שאר המכשירים</label>
            <button class="btn primary block" data-act="set-change-pass"><i class="fa-solid fa-key"></i> עדכון הסיסמה</button>
        </div></div></div>` : `<div class="alert info" style="margin-bottom:16px;"><i class="fa-brands fa-google"></i><div>התחברתם עם Google, ולכן אין צורך בסיסמה כאן.</div></div>`}
        <div class="set-group"><h4>כניסה</h4><div class="set-list">
            <label class="set-item">${ic('fa-google fa-brands', '#4285f4')}<span class="tx"><b>כניסה עם Google בלבד</b><small>${u.authMethod === 'google' ? 'אף אחד לא יוכל להיכנס עם סיסמה, רק עם חשבון ה-Google שלכם' : 'זמין רק כשמחוברים עכשיו דרך Google'}</small></span><span class="switch"><input type="checkbox" id="s-google-only" ${u.googleLoginOnly ? 'checked' : ''} ${u.authMethod === 'google' || u.googleLoginOnly ? '' : 'disabled'}><span></span></span></label>
        </div></div>
        <div class="set-group"><div class="set-list">${item({ page: 'devices', icon: 'fa-laptop-code', color: '#7c3aed', title: 'מכשירים והתחברויות', sub: 'ניתוק מכשירים שאתם לא מזהים' })}</div></div>`;
    },

    devices() {
        return `${pageHead('מכשירים והתחברויות')}<div id="s-dev"><div class="skeleton" style="height:160px;border-radius:20px;"></div></div>`;
    },

    appearance() {
        const p = App.prefs;
        return `${pageHead('מראה')}
        <div class="set-group"><h4>ערכת צבעים</h4><div class="theme-cards">
            ${['system', 'light', 'dark'].map(t => `<button class="theme-card ${p.theme === t ? 'on' : ''}" data-act="set-theme" data-v="${t}"><span class="tc ${t}"><i></i><i></i></span>${{ system: 'לפי המכשיר', light: 'בהיר', dark: 'כהה' }[t]}</button>`).join('')}
        </div></div>
        <div class="set-group"><h4>צבע מבטא</h4><div class="card" style="padding:16px;"><div class="accents">
            ${Object.entries(ACCENTS).map(([k, [l, c]]) => `<button class="accent ${p.accent === k ? 'on' : ''}" data-act="set-accent" data-v="${k}" style="background:${c}" aria-label="${l}" title="${l}"></button>`).join('')}
        </div></div></div>
        <div class="set-group"><h4>טקסט ותצוגה</h4><div class="set-list">
            <div class="set-block"><span class="label">גודל טקסט</span><div class="range-row"><span style="font-size:.8rem;">א</span><input type="range" class="range" min="0.85" max="1.3" step="0.05" value="${p.fontScale}" id="s-font"><span style="font-size:1.3rem;">א</span><span class="val" id="s-font-v">${Math.round(p.fontScale * 100)}%</span></div></div>
            <div class="set-block"><span class="label">צפיפות</span><div class="seg"><button data-act="set-density" data-v="comfortable" class="${p.density === 'comfortable' ? 'on' : ''}">מרווח</button><button data-act="set-density" data-v="compact" class="${p.density === 'compact' ? 'on' : ''}">צפוף</button></div></div>
            ${toggle('reduceMotion', 'הפחתת אנימציות', 'מעברים ותנועות מינימליים', 'fa-wand-magic-sparkles', '#64748b')}
        </div></div>
        <div class="set-group"><h4>מסך פתיחה</h4><div class="set-list"><div class="set-block"><div class="seg">
            ${[['feed', 'הודעות'], ['chat', 'צ׳אט'], ['settings', 'הגדרות']].map(([k, l]) => `<button data-act="set-start" data-v="${k}" class="${p.startTab === k ? 'on' : ''}">${l}</button>`).join('')}
        </div></div></div></div>`;
    },

    playback() {
        const p = App.prefs;
        return `${pageHead('השמעה')}
        <div class="set-group"><h4>מהירות ברירת מחדל</h4><div class="set-list"><div class="set-block"><div class="seg">
            ${[0.75, 1, 1.25, 1.5, 1.75, 2].map(r => `<button data-act="set-rate" data-v="${r}" class="${p.playbackRate === r ? 'on' : ''}">${r}×</button>`).join('')}
        </div></div></div></div>
        <div class="set-group"><h4>דילוג קדימה ואחורה</h4><div class="set-list"><div class="set-block"><div class="seg">
            ${[5, 10, 15, 30].map(r => `<button data-act="set-skip" data-v="${r}" class="${p.skipSeconds === r ? 'on' : ''}">${r} שנ׳</button>`).join('')}
        </div></div></div></div>
        <div class="set-group"><div class="set-list">
            ${toggle('autoplayNext', 'השמעה רציפה', 'כשהודעה נגמרת, ממשיכים לבאה אחריה', 'fa-forward', '#0d9488')}
            ${toggle('rememberPosition', 'זכירת המקום', 'הודעה שנעצרה באמצע תמשיך מאותה נקודה', 'fa-bookmark', '#2563eb')}
            ${toggle('hideHeard', 'הסתרת הודעות ששמעתי', 'ברשימה הראשית יופיעו רק הודעות חדשות', 'fa-eye-slash', '#7c3aed')}
            ${toggle('showStats', 'הצגת מספר האזנות', 'כמה שמעו כל הודעה באתר ובטלפון', 'fa-chart-simple', '#ea580c')}
        </div></div>
        <div class="alert info"><i class="fa-solid fa-mobile-screen"></i><div>אפשר לשלוט בנגן גם ממסך הנעילה ומהאוזניות, כמו בכל אפליקציית מוזיקה.</div></div>`;
    },

    notifications() {
        const perm = 'Notification' in window ? Notification.permission : 'unsupported';
        return `${pageHead('התראות וצלילים')}
        <div class="set-group"><div class="set-list"><div class="set-block">
            ${perm === 'granted' ? '<div class="alert good"><i class="fa-solid fa-bell"></i><div>התראות הדפדפן פעילות במכשיר הזה</div></div>'
                : perm === 'denied' ? '<div class="alert bad"><i class="fa-solid fa-bell-slash"></i><div>ההתראות חסומות בדפדפן. כדי לאפשר: לחצו על סמל המנעול ליד כתובת האתר, ובחרו "התראות: לאפשר".</div></div>'
                : perm === 'unsupported' ? '<div class="alert warn"><i class="fa-solid fa-circle-info"></i><div>הדפדפן הזה לא תומך בהתראות. באייפון: הוסיפו את האתר למסך הבית ופתחו משם.</div></div>'
                : '<div class="alert info"><i class="fa-solid fa-bell"></i><div>כדי לקבל התראות גם כשהאתר ברקע, צריך לאשר אותן פעם אחת.</div></div><button class="btn primary block" data-act="set-notify-enable"><i class="fa-solid fa-bell"></i> הפעלת התראות</button>'}
        </div></div></div>
        <div class="set-group"><h4>על מה להתריע</h4><div class="set-list">
            ${toggle('notifyNewMessages', 'הודעה קולית חדשה', 'כשמישהו משאיר הודעה חדשה', 'fa-headphones', '#16a34a')}
            ${toggle('notifyChat', 'תשובה בצ׳אט', 'כשהצוות עונה לכם', 'fa-comments', '#2563eb')}
        </div></div>
        <div class="set-group"><h4>שעות שקט</h4><div class="set-list"><div class="set-block">
            <span class="hint">בשעות האלה לא יקפצו התראות (ההודעות עדיין יחכו לכם באתר)</span>
            <div class="time-row"><span>מ-</span><input type="time" class="input" id="s-q1" value="${esc(App.prefs.quietStart)}"><span>עד</span><input type="time" class="input" id="s-q2" value="${esc(App.prefs.quietEnd)}"><button class="icon-btn" data-act="set-quiet-clear" aria-label="ביטול שעות שקט"><i class="fa-solid fa-xmark"></i></button></div>
        </div></div></div>
        <div class="set-group"><h4>משוב</h4><div class="set-list">
            ${toggle('sounds', 'צלילים', 'צליל קצר בשליחה ובהודעה חדשה', 'fa-volume-high', '#ea580c')}
            ${'vibrate' in navigator ? toggle('haptics', 'רטט', 'רטט קל בלחיצות (בטלפון)', 'fa-mobile-screen-button', '#7c3aed') : ''}
        </div></div>
        <button class="btn soft block" data-act="set-notify-test"><i class="fa-solid fa-paper-plane"></i> שליחת התראת בדיקה</button>`;
    },

    recording() {
        return `${pageHead('הקלטה ושליחה')}
        <div class="set-group"><h4>בדיקת מיקרופון</h4><div class="set-list"><div class="set-block">
            <div class="mic-meter"><i id="s-mic"></i></div>
            <span class="hint" id="s-mic-t">דברו אחרי שתלחצו, ותראו את עוצמת הקול</span>
            <button class="btn soft block" data-act="set-mic"><i class="fa-solid fa-microphone"></i> התחלת בדיקה</button>
        </div></div></div>
        <div class="set-group"><div class="set-list">
            ${toggle('confirmSend', 'אישור לפני שליחה', 'שאלה "לשלוח?" לפני שההודעה עולה', 'fa-circle-question', '#2563eb')}
            ${toggle('tzintukPrompt', 'הצעה לשלוח צינתוק', 'אחרי שליחת הודעה, אפשרות לצנתק את כל המנויים', 'fa-phone-volume', '#16a34a')}
        </div></div>
        <div class="alert info"><i class="fa-solid fa-lock"></i><div>הרשאות: ${App.user.canRecord ? 'הקלטה ✓' : 'הקלטה ✗'} · ${App.user.canUpload ? 'העלאת קבצים ✓' : 'העלאת קבצים ✗'}. לשינוי פנו לצוות בצ׳אט.</div></div>`;
    },

    data() {
        return `${pageHead('נתונים ואיפוס')}
        <div class="set-group"><div class="set-list">
            ${item({ act: 'set-reset-prefs', icon: 'fa-rotate-left', color: '#ea580c', title: 'איפוס כל ההגדרות', sub: 'חזרה להגדרות ברירת המחדל בכל המכשירים' })}
            ${item({ act: 'set-clear-local', icon: 'fa-broom', color: '#64748b', title: 'ניקוי נתונים מהמכשיר', sub: 'מיקומי השמעה שמורים, מטמון האפליקציה' })}
            ${item({ act: 'set-logout-all', icon: 'fa-power-off', color: 'var(--bad)', title: 'ניתוק מכל המכשירים', sub: 'כולל המכשיר הזה', danger: true })}
        </div></div>`;
    },

    about() {
        return `${pageHead('עזרה וקיצורים')}
        <div class="set-group"><h4>מה חדש בגרסה 2</h4><div class="card" style="padding:16px;line-height:1.8;">
            🎧 נגן עם מהירות, דילוגים, השמעה רציפה ושליטה ממסך הנעילה<br>🎙️ הקלטה עם גל קול חי, השהיה והאזנה לפני שליחה<br>🔔 התראות על הודעות חדשות, עם שעות שקט<br>🌓 מצב כהה, 7 צבעים וגודל טקסט מותאם<br>💬 צ׳אט במסך מלא<br>📲 אפשר להתקין כאפליקציה
        </div></div>
        <div class="set-group"><h4>קיצורי מקלדת (במחשב)</h4><div class="set-list">
            <div class="set-item"><span class="tx"><b>השמעה / השהיה</b></span><span class="val mono">רווח</span></div>
            <div class="set-item"><span class="tx"><b>קדימה / אחורה</b></span><span class="val mono">← / →</span></div>
            <div class="set-item"><span class="tx"><b>ההודעה הבאה</b></span><span class="val mono">N</span></div>
            <div class="set-item"><span class="tx"><b>סגירת חלון</b></span><span class="val mono">Esc</span></div>
        </div></div>
        <div class="set-group"><div class="set-list">${item({ act: 'tab', icon: 'fa-comments', color: '#2563eb', title: 'צריכים עזרה? כתבו לנו', sub: 'הצוות עונה בצ׳אט' }).replace('data-act="tab"', 'data-act="tab" data-tab="chat"')}</div></div>`;
    },
};

function show(page) {
    S.page = page;
    S.root.innerHTML = `<div class="view-inner">${PAGES[page]()}</div>`;
    S.root.scrollTop = 0;
    if (page === 'devices') loadDevices();
    if (page === 'security') bindSecurity();
    if (page === 'appearance') bindAppearance();
    if (page === 'notifications') bindQuiet();
}

// ---------- מכשירים והיסטוריה ----------

async function loadDevices(extra = {}) {
    const r = await api('/account/security', extra);
    const box = $('#s-dev');
    if (!box) return;
    if (!r.ok) { box.innerHTML = `<div class="alert bad"><i class="fa-solid fa-circle-exclamation"></i><div>${esc(r.error)}</div></div>`; return; }
    const { sessions, history } = r.data;
    const icon = s => s.method === 'google' ? 'fa-brands fa-google' : s.method === 'email_link' ? 'fa-solid fa-envelope' : 'fa-solid fa-key';
    box.innerHTML = `<div class="set-group"><h4>מחובר עכשיו ב-${App.num(sessions.length)} מכשירים</h4><div class="card" style="padding:4px 16px;">
        ${sessions.map(s => `<div class="device"><span class="ic"><i class="${icon(s)}"></i></span><div class="tx"><b>${s.current ? 'המכשיר הזה' : s.method === 'email_link' ? 'כניסה מקישור במייל' : s.method === 'google' ? 'כניסה עם Google' : 'כניסה עם סיסמה'} ${s.current ? '<span class="badge good">עכשיו</span>' : ''} ${s.persistent ? '<span class="badge">קבוע</span>' : '<span class="badge">זמני</span>'}</b><small>התחבר ${esc(App.dateTime(s.createdAt))} · פעיל ${esc(App.rel(s.lastUsedAt))}${s.email ? ` · ${esc(s.email)}` : ''}</small></div>${s.current ? '' : `<button class="btn sm danger-soft" data-act="set-revoke" data-h="${esc(s.handle)}">ניתוק</button>`}</div>`).join('')}
        ${sessions.length > 1 ? '<div style="padding:12px 0;"><button class="btn danger-soft block" data-act="set-revoke-others"><i class="fa-solid fa-power-off"></i> ניתוק כל שאר המכשירים</button></div>' : ''}
    </div></div>
    <div class="set-group"><h4>פעילות אחרונה בחשבון</h4><div class="card" style="padding:4px 16px;">
        ${history.length ? history.map(h => { const [l, i] = EVENTS[h.action] || [h.action, 'fa-circle']; return `<div class="device"><span class="ic" style="${h.action === 'LOGIN_FAILED' ? 'background:var(--bad-soft);color:var(--bad);' : ''}"><i class="fa-solid ${i}"></i></span><div class="tx"><b>${esc(l)}</b><small>${esc(App.dateTime(h.createdAt))}${h.device ? ` · ${esc(h.device)}` : ''}${h.ip ? ` · <span class="ltr">${esc(h.ip)}</span>` : ''}</small></div></div>`; }).join('') : '<div class="empty">אין פעילות להצגה</div>'}
    </div></div>`;
}

// ---------- שמירות ----------

function askPassword() {
    return new Promise(resolve => {
        let done = false;
        const el = App.openSheet({
            title: 'אישור עם סיסמה', onClose: () => { if (!done) resolve(null); },
            body: `<div style="display:grid;gap:12px;"><p class="muted" style="margin:0;">לשמירת שינויים בחשבון, הזינו את הסיסמה שלכם</p><input class="input ltr" id="s-confirm-pass" type="password" inputmode="numeric" maxlength="10" autocomplete="current-password"><button class="btn primary block" id="s-confirm-go">אישור</button></div>`,
        });
        const go = () => { const v = el.querySelector('#s-confirm-pass').value; if (!v) return; done = true; App.closeSheet(); resolve(v); };
        el.querySelector('#s-confirm-go').addEventListener('click', go);
        el.querySelector('#s-confirm-pass').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
        setTimeout(() => el.querySelector('#s-confirm-pass').focus(), 320);
    });
}

async function updateProfile(fields, btn) {
    let password;
    if (App.user.authMethod === 'password') { password = await askPassword(); if (!password) return false; }
    App.busy(btn, true);
    const r = await api('/update-profile', { ...fields, password });
    App.busy(btn, false);
    if (!r.ok) { App.toast(r.error, 'bad'); return false; }
    App.toast(r.data.message || 'נשמר');
    await App.refreshUser();
    return true;
}

function bindSecurity() {
    const nw = $('#s-new');
    if (nw) nw.addEventListener('input', () => {
        const v = nw.value;
        let score = 0, text = '';
        if (/^\d{4,10}$/.test(v)) {
            score = Math.min(4, Math.floor(v.length / 2.5) + (new Set(v).size > 3 ? 1 : 0));
            if (/^(\d)\1+$/.test(v) || '0123456789'.includes(v) || '9876543210'.includes(v)) score = 0;
            text = ['חלשה מאוד', 'חלשה', 'סבירה', 'טובה', 'חזקה'][score];
        } else if (v) text = 'רק ספרות, 4 עד 10';
        $('#s-meter').style.width = v ? `${(score + 1) * 20}%` : '0';
        $('#s-meter').style.background = ['var(--bad)', 'var(--bad)', 'var(--warn)', 'var(--good)', 'var(--good)'][score];
        $('#s-meter-t').textContent = text;
    });
    const g = $('#s-google-only');
    g.addEventListener('change', async () => {
        const ok = await updateProfile({ googleLoginOnly: g.checked }, null);
        if (!ok) g.checked = !g.checked;
    });
}

function bindAppearance() {
    const f = $('#s-font');
    f.addEventListener('input', () => { App.setPref('fontScale', Number(f.value)); $('#s-font-v').textContent = `${Math.round(f.value * 100)}%`; });
}

function bindQuiet() {
    const save = () => { const a = $('#s-q1').value, b = $('#s-q2').value; if ((a && b) || (!a && !b)) { App.setPref('quietStart', a); App.setPref('quietEnd', b); if (a) App.toast(`שעות שקט: ${a}–${b}`); } };
    $('#s-q1').addEventListener('change', save);
    $('#s-q2').addEventListener('change', save);
}

let micStream = null;
async function micTest(btn) {
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; btn.innerHTML = '<i class="fa-solid fa-microphone"></i> התחלת בדיקה'; return; }
    try { micStream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { $('#s-mic-t').textContent = 'אין גישה למיקרופון. יש לאשר בהגדרות הדפדפן.'; return; }
    btn.innerHTML = '<i class="fa-solid fa-stop"></i> עצירה';
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const an = ctx.createAnalyser(); an.fftSize = 512;
    ctx.createMediaStreamSource(micStream).connect(an);
    const data = new Uint8Array(an.frequencyBinCount);
    let peak = 0;
    const loop = () => {
        if (!micStream || !$('#s-mic')) { ctx.close(); if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; } return; }
        an.getByteTimeDomainData(data);
        let sum = 0; for (const v of data) sum += ((v - 128) / 128) ** 2;
        const lvl = Math.min(1, Math.sqrt(sum / data.length) * 4);
        peak = Math.max(peak * 0.97, lvl);
        $('#s-mic').style.width = `${lvl * 100}%`;
        $('#s-mic-t').textContent = peak < 0.05 ? 'לא שומעים כלום… נסו לדבר קרוב יותר' : peak < 0.25 ? 'שומעים, אבל חלש. דברו קצת יותר חזק' : 'מעולה! המיקרופון עובד מצוין 👌';
        requestAnimationFrame(loop);
    };
    loop();
}

Object.assign(App.actions, {
    'set-page': el => { App.haptic(); show(el.dataset.page); },
    'set-theme': el => { App.setPref('theme', el.dataset.v); show('appearance'); },
    'set-accent': el => { App.setPref('accent', el.dataset.v); show('appearance'); App.haptic(); },
    'set-density': el => { App.setPref('density', el.dataset.v); show('appearance'); },
    'set-start': el => { App.setPref('startTab', el.dataset.v); show('appearance'); },
    'set-rate': el => { App.setPref('playbackRate', Number(el.dataset.v)); show('playback'); },
    'set-skip': el => { App.setPref('skipSeconds', Number(el.dataset.v)); show('playback'); },
    'set-quiet-clear': () => { App.setPref('quietStart', ''); App.setPref('quietEnd', ''); show('notifications'); },
    'set-notify-enable': async () => { if (await App.requestNotify()) { App.setPref('notifyChat', true); App.toast('ההתראות הופעלו 🔔'); } show('notifications'); },
    'set-notify-test': async () => {
        if (!App.canNotify()) { if (!await App.requestNotify()) return; show('notifications'); }
        App.notify('עכשיו סלומון', 'ככה תיראה התראה על הודעה חדשה 👋', { tag: 'salamon-test' }) ? App.toast('נשלחה התראת בדיקה') : App.toast('ההתראה לא נשלחה (אולי בשעות שקט?)', 'info');
    },
    'set-save-profile': async el => {
        const email = $('#s-email').value.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { App.toast('כתובת המייל לא תקינה', 'bad'); return; }
        await updateProfile({ newEmail: email, receiveEmails: $('#s-receive').checked }, el);
        show('profile');
    },
    'set-unblock': async el => { App.busy(el, true); const r = await api('/unblock-email'); App.busy(el, false); r.ok ? (App.toast(r.data.message || 'החסימה בוטלה'), await App.refreshUser(), show('profile')) : App.toast(r.error, 'bad'); },
    'set-change-pass': async el => {
        const o = $('#s-old').value, n = $('#s-new').value, n2 = $('#s-new2').value;
        if (!o || !n) { App.toast('מלאו את כל השדות', 'bad'); return; }
        if (n !== n2) { App.toast('הסיסמאות החדשות לא זהות', 'bad'); return; }
        App.busy(el, true);
        const all = $('#s-logout-all').checked;
        const r = await api('/change-password', { oldPassword: o, newPassword: n, newPasswordConfirm: n2, logoutAllDevices: all });
        App.busy(el, false);
        if (!r.ok) { App.toast(r.error, 'bad'); return; }
        App.toast(r.data.message || 'הסיסמה עודכנה');
        if (all) { App.logout(true); return; }
        show('security');
    },
    'set-revoke': async el => { App.busy(el, true); await loadDevices({ revoke: el.dataset.h }); App.toast('המכשיר נותק'); },
    'set-revoke-others': async () => { if (await App.confirm({ title: 'לנתק את כל שאר המכשירים?', text: 'תצטרכו להתחבר מחדש בכל מכשיר אחר.', ok: 'ניתוק', danger: true })) { await loadDevices({ revokeOthers: true }); App.toast('שאר המכשירים נותקו'); } },
    'set-logout': async () => { if (await App.confirm({ title: 'לצאת מהחשבון?', ok: 'יציאה', icon: 'fa-right-from-bracket' })) App.logout(); },
    'set-logout-all': async () => {
        if (!await App.confirm({ title: 'לנתק את כל המכשירים?', text: 'גם המכשיר הזה יתנתק, ותצטרכו להתחבר מחדש.', ok: 'ניתוק הכל', danger: true })) return;
        await api('/account/security', { revokeOthers: true });
        App.logout();
    },
    'set-reset-prefs': async () => {
        if (!await App.confirm({ title: 'לאפס את כל ההגדרות?', text: 'מראה, השמעה והתראות יחזרו לברירת המחדל.', ok: 'איפוס' })) return;
        App.prefs = { ...App.DEFAULT_PREFS, ...((App.config && App.config.defaults) || {}) };
        Object.keys(App.prefs).forEach(k => App.setPref(k, App.prefs[k], { silent: true }));
        await api('/v2/prefs', { prefs: App.prefs });
        App.toast('ההגדרות אופסו');
        show('home');
    },
    'set-clear-local': async () => {
        App.store.del('v2.pos');
        App.store.del('v2.bannerClosed');
        if ('caches' in window) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); }
        App.toast('הנתונים נוקו מהמכשיר');
    },
    'set-install': async () => {
        if (!App.installPrompt) return;
        App.installPrompt.prompt();
        const r = await App.installPrompt.userChoice;
        if (r.outcome === 'accepted') App.toast('האפליקציה הותקנה 🎉');
        App.installPrompt = null;
        show('home');
    },
    'set-ios-install': () => App.openSheet({ title: 'הוספה למסך הבית', body: `<div style="display:grid;gap:14px;line-height:1.7;"><div>1. לחצו על כפתור השיתוף <i class="fa-solid fa-arrow-up-from-bracket"></i> בתחתית Safari</div><div>2. בחרו <b>"הוספה למסך הבית"</b> <i class="fa-regular fa-square-plus"></i></div><div>3. לחצו <b>"הוספה"</b>. מעכשיו האתר ייפתח כמו אפליקציה, במסך מלא, עם התראות.</div></div>` }),
    'set-mic': el => micTest(el),
});

document.addEventListener('change', e => {
    const key = e.target.dataset && e.target.dataset.pref;
    if (!key) return;
    App.setPref(key, e.target.checked);
    App.haptic();
    if ((key === 'notifyNewMessages' || key === 'notifyChat') && e.target.checked && !App.canNotify()) App.requestNotify().then(() => S.page === 'notifications' && show('notifications'));
});

App.views.settings = {
    init(root) { S.root = root; },
    enter() { show(S.page === 'home' ? 'home' : S.page); },
    leave() { if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; } },
};
document.addEventListener('user', () => { if (App.tab === 'settings' && ['home', 'profile'].includes(S.page)) show(S.page); });
document.addEventListener('installable', () => { if (App.tab === 'settings' && S.page === 'home') show('home'); });
document.addEventListener('logout', () => { S.page = 'home'; if (App.views.settings) App.views.settings._init = false; });
})();
