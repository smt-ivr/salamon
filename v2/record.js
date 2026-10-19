// record.js — הקלטה והעלאת הודעות: גל קול חי, השהיה, האזנה לפני שליחה, העלאה עם התקדמות,
// ואחרי השליחה - הצעה לשלוח צינתוק למנויים עם ספירה לאחור.

(() => {
'use strict';
const { $, esc } = App;

const R = { stream: null, rec: null, chunks: [], blob: null, fileName: '', type: 'record', seconds: 0, timer: null, analyser: null, raf: null, ctx: null, url: null, el: null, tzTimer: null };

function canRecord() { return App.user && App.user.canRecord; }
function canUpload() { return App.user && App.user.canUpload; }

function cleanup() {
    clearInterval(R.timer); clearInterval(R.tzTimer);
    cancelAnimationFrame(R.raf);
    if (R.rec && R.rec.state !== 'inactive') try { R.rec.stop(); } catch (e) {}
    if (R.stream) R.stream.getTracks().forEach(t => t.stop());
    if (R.ctx) try { R.ctx.close(); } catch (e) {}
    if (R.url) URL.revokeObjectURL(R.url);
    Object.assign(R, { stream: null, rec: null, chunks: [], blob: null, analyser: null, ctx: null, url: null, el: null });
}

function open() {
    if (!canRecord() && !canUpload()) { App.toast('אין לך הרשאה להקליט או להעלות הודעות', 'bad'); return; }
    const feedAudio = $('#audio'); if (feedAudio && !feedAudio.paused) feedAudio.pause();
    R.el = App.openSheet({ title: 'הודעה חדשה', body: '<div class="rec" id="rec"></div>', onClose: cleanup });
    startScreen();
}

function startScreen() {
    const box = $('#rec');
    box.innerHTML = `
        ${canRecord() ? `<button class="rec-btn go" data-act="rec-start" aria-label="התחלת הקלטה"><i class="fa-solid fa-microphone"></i></button>
        <div><b style="font-size:1.1rem;">לחצו כדי להתחיל להקליט</b><div class="muted" style="font-size:.9rem;margin-top:4px;">אפשר לעצור באמצע, להאזין ולהקליט מחדש לפני השליחה</div></div>` : ''}
        ${canUpload() ? `${canRecord() ? '<div class="or" style="width:100%;">או</div>' : ''}
        <label class="btn ${canRecord() ? '' : 'primary lg'} block" style="cursor:pointer;"><i class="fa-solid fa-file-arrow-up"></i> העלאת קובץ שמע<input type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm" id="rec-file" hidden></label>` : ''}`;
    const f = $('#rec-file');
    if (f) f.addEventListener('change', e => { const file = e.target.files[0]; if (file) review(file, file.name, 'file'); });
}

async function start() {
    try {
        R.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
        $('#rec').innerHTML = `<div class="alert bad" style="text-align:start;"><i class="fa-solid fa-microphone-slash"></i><div><b>אין גישה למיקרופון</b><br>יש לאשר גישה למיקרופון בהגדרות הדפדפן (בדרך כלל דרך סמל המנעול ליד כתובת האתר) ולנסות שוב.</div></div><button class="btn soft" data-act="rec-start"><i class="fa-solid fa-rotate-right"></i> לנסות שוב</button>`;
        return;
    }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
    R.rec = new MediaRecorder(R.stream, mime ? { mimeType: mime } : undefined);
    R.chunks = [];
    R.rec.ondataavailable = e => { if (e.data.size) R.chunks.push(e.data); };
    R.rec.onstop = () => {
        const type = R.rec.mimeType || mime || 'audio/webm';
        const blob = new Blob(R.chunks, { type });
        const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm';
        if (R.stream) R.stream.getTracks().forEach(t => t.stop());
        cancelAnimationFrame(R.raf);
        if (blob.size < 800) { App.toast('ההקלטה קצרה מדי', 'bad'); startScreen(); return; }
        review(blob, `recording.${ext}`, 'record');
    };
    R.rec.start(250);
    R.seconds = 0;
    App.sound('start'); App.haptic(20);
    $('#rec').innerHTML = `
        <div class="rec-state" id="rec-state"><span class="live"></span><span>מקליט</span></div>
        <div class="rec-time" id="rec-time">0:00</div>
        <canvas id="rec-canvas" width="600" height="120" aria-hidden="true"></canvas>
        <div class="rec-ctrls">
            <button class="rec-btn" data-act="rec-cancel" aria-label="ביטול"><i class="fa-solid fa-trash"></i></button>
            <button class="rec-btn stop" data-act="rec-stop" aria-label="סיום"><i class="fa-solid fa-stop"></i></button>
            <button class="rec-btn" data-act="rec-pause" id="rec-pause" aria-label="השהיה"><i class="fa-solid fa-pause"></i></button>
        </div>`;
    R.timer = setInterval(() => { if (R.rec && R.rec.state === 'recording') { R.seconds++; $('#rec-time') && ($('#rec-time').textContent = App.clock(R.seconds)); } }, 1000);
    visualize();
}

function visualize() {
    try {
        R.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = R.ctx.createMediaStreamSource(R.stream);
        R.analyser = R.ctx.createAnalyser();
        R.analyser.fftSize = 256;
        src.connect(R.analyser);
    } catch (e) { return; }
    const canvas = $('#rec-canvas');
    const g = canvas.getContext('2d');
    const data = new Uint8Array(R.analyser.frequencyBinCount);
    const hist = new Array(60).fill(2);
    const color = getComputedStyle(document.documentElement).getPropertyValue('--a').trim() || '#16a34a';
    let frame = 0;
    const draw = () => {
        R.raf = requestAnimationFrame(draw);
        if (!canvas.isConnected) return;
        frame++;
        if (R.rec && R.rec.state === 'recording' && frame % 3 === 0) {
            R.analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
            const rms = Math.sqrt(sum / data.length);
            hist.push(Math.max(2, Math.min(1, rms * 3.2) * canvas.height * 0.9));
            hist.shift();
        }
        g.clearRect(0, 0, canvas.width, canvas.height);
        const w = canvas.width / hist.length;
        hist.forEach((h, i) => {
            g.fillStyle = color;
            g.globalAlpha = 0.35 + 0.65 * (i / hist.length);
            const x = canvas.width - (i + 1) * w;
            g.beginPath();
            if (g.roundRect) g.roundRect(x + w * 0.2, (canvas.height - h) / 2, w * 0.6, h, 4); else g.rect(x + w * 0.2, (canvas.height - h) / 2, w * 0.6, h);
            g.fill();
        });
        g.globalAlpha = 1;
    };
    draw();
}

function togglePause(btn) {
    if (!R.rec) return;
    const st = $('#rec-state');
    if (R.rec.state === 'recording') {
        R.rec.pause();
        btn.innerHTML = '<i class="fa-solid fa-microphone"></i>'; btn.setAttribute('aria-label', 'המשך');
        st.classList.add('paused'); st.lastElementChild.textContent = 'מושהה';
    } else if (R.rec.state === 'paused') {
        R.rec.resume();
        btn.innerHTML = '<i class="fa-solid fa-pause"></i>'; btn.setAttribute('aria-label', 'השהיה');
        st.classList.remove('paused'); st.lastElementChild.textContent = 'מקליט';
    }
    App.haptic();
}

function stop() {
    clearInterval(R.timer);
    App.sound('stop'); App.haptic(20);
    if (R.rec && R.rec.state !== 'inactive') R.rec.stop();
}

function review(blob, name, type) {
    R.blob = blob; R.fileName = name; R.type = type;
    if (R.url) URL.revokeObjectURL(R.url);
    R.url = URL.createObjectURL(blob);
    const kb = blob.size / 1024;
    $('#rec').innerHTML = `<div class="rec-review">
        <div class="rec-file"><i class="fa-solid ${type === 'file' ? 'fa-file-audio' : 'fa-microphone-lines'}"></i><div style="flex:1;min-width:0;"><b>${type === 'file' ? esc(name) : 'ההקלטה שלך'}</b><small>${type === 'record' ? `${App.clock(R.seconds)} · ` : ''}${kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb.toFixed(0) + ' KB'}</small></div></div>
        <audio controls src="${R.url}" style="width:100%;" id="rec-preview"></audio>
        <div class="upload-bar" id="rec-progress" hidden><i></i></div>
        <div style="display:flex;gap:10px;">
            <button class="btn" data-act="${type === 'record' ? 'rec-again' : 'rec-restart'}"><i class="fa-solid ${type === 'record' ? 'fa-rotate-left' : 'fa-xmark'}"></i> ${type === 'record' ? 'להקליט מחדש' : 'קובץ אחר'}</button>
            <button class="btn primary" style="flex:1;" data-act="rec-send" id="rec-send"><i class="fa-solid fa-paper-plane"></i> שליחה</button>
        </div></div>`;
}

function upload() {
    return new Promise(resolve => {
        const fd = new FormData();
        fd.append('userToken', App.token);
        fd.append('file', R.blob, R.fileName);
        fd.append('uploadType', R.type);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${App.API}/messages/upload`);
        const bar = $('#rec-progress');
        bar.hidden = false;
        xhr.upload.onprogress = e => { if (e.lengthComputable) bar.firstElementChild.style.width = `${Math.round(e.loaded / e.total * 100)}%`; };
        xhr.onload = () => { let d = {}; try { d = JSON.parse(xhr.responseText); } catch (e) {} resolve({ ok: xhr.status < 400 && d.success, data: d }); };
        xhr.onerror = () => resolve({ ok: false, data: { error: 'אין תקשורת עם השרת' } });
        xhr.send(fd);
    });
}

async function send(btn) {
    if (App.prefs.confirmSend && !await App.confirm({ title: 'לשלוח את ההודעה?', text: 'ההודעה תופיע לכל המשתתפים במערכת.', ok: 'שליחה', icon: 'fa-paper-plane' })) return;
    const prev = $('#rec-preview'); if (prev) prev.pause();
    App.busy(btn, true, 'שולח…');
    const r = await upload();
    if (!r.ok) { App.busy(btn, false); $('#rec-progress').hidden = true; App.toast(r.data.message || r.data.error || 'השליחה נכשלה', 'bad'); App.sound('error'); return; }
    App.sound('sent'); App.haptic(30);
    document.dispatchEvent(new Event('uploaded'));
    if (App.prefs.tzintukPrompt) tzintukScreen(); else { App.closeSheet(); App.toast('ההודעה נשלחה ✓'); }
}

function tzintukScreen() {
    let left = 90;
    const C = 2 * Math.PI * 52;
    $('#rec').innerHTML = `<div class="success-mark"><i class="fa-solid fa-check"></i></div>
        <div><b style="font-size:1.2rem;">ההודעה נשלחה!</b><div class="muted">לשלוח צינתוק לכל המנויים, כדי שיידעו שיש הודעה חדשה?</div></div>
        <div class="ring"><svg width="120" height="120"><circle cx="60" cy="60" r="52" stroke="var(--panel-3)" stroke-width="8" fill="none"/><circle id="tz-ring" cx="60" cy="60" r="52" stroke="var(--a)" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><b id="tz-left">1:30</b></div>
        <div style="display:flex;gap:10px;width:100%;" id="tz-actions">
            <button class="btn" style="flex:1;" data-act="sheet-close">לא עכשיו</button>
            <button class="btn primary" style="flex:1.4;" data-act="rec-tzintuk"><i class="fa-solid fa-phone-volume"></i> שליחת צינתוק</button>
        </div>
        <div id="tz-status"></div>`;
    R.tzTimer = setInterval(() => {
        left--;
        const t = $('#tz-left'), ring = $('#tz-ring');
        if (!t) { clearInterval(R.tzTimer); return; }
        t.textContent = App.clock(left);
        ring.setAttribute('stroke-dashoffset', String(C * (1 - left / 90)));
        if (left <= 10) ring.setAttribute('stroke', 'var(--bad)');
        if (left <= 0) { clearInterval(R.tzTimer); App.closeSheet(); }
    }, 1000);
}

async function tzintuk(btn) {
    clearInterval(R.tzTimer);
    App.busy(btn, true, 'שולח…');
    const r = await App.api('/messages/tzintuk');
    $('#tz-actions').hidden = true;
    $('#tz-status').innerHTML = `<div class="alert ${r.ok ? 'good' : 'bad'}"><i class="fa-solid ${r.ok ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i><div>${esc(r.ok ? (r.data.message || 'הצינתוק נשלח') : r.error)}</div></div>`;
    if (r.ok) App.haptic(30);
    setTimeout(() => { if (R.el && R.el.isConnected) App.closeSheet(); }, 3500);
}

Object.assign(App.actions, {
    'record': open,
    'rec-start': start,
    'rec-stop': stop,
    'rec-pause': el => togglePause(el),
    'rec-cancel': async () => { if (R.seconds > 3 && !await App.confirm({ title: 'למחוק את ההקלטה?', ok: 'מחיקה', danger: true })) return; App.closeSheet(); },
    'rec-again': () => { if (R.url) URL.revokeObjectURL(R.url); if (R.ctx) try { R.ctx.close(); } catch (e) {} Object.assign(R, { url: null, blob: null, ctx: null }); start(); },
    'rec-restart': () => { R.blob = null; startScreen(); },
    'rec-send': el => send(el),
    'rec-tzintuk': el => tzintuk(el),
});
})();
