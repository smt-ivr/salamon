// client-ads.js

document.addEventListener('DOMContentLoaded', () => {
    // הזרקת עיצוב מתקדם למודעות מבלי לגעת בקובץ ה-style.css המקורי
    const adStyles = document.createElement('style');
    adStyles.innerHTML = `
        .regular-ad-box {
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-right: 4px solid var(--secondary);
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            margin-bottom: 15px;
        }
        .mad-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.85);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(8px);
            opacity: 0;
            visibility: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mad-overlay.active {
            opacity: 1;
            visibility: visible;
        }
        .mad-modal {
            background: #fff;
            width: 90%;
            max-width: 500px;
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            transform: scale(0.9);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mad-overlay.active .mad-modal {
            transform: scale(1);
        }
        .mad-header {
            background: linear-gradient(135deg, var(--danger) 0%, #b91c1c 100%);
            color: white;
            padding: 30px 20px 20px;
            text-align: center;
            position: relative;
        }
        .mad-header-icon {
            font-size: 3.5rem;
            margin-bottom: 10px;
            animation: pulse-ad 2s infinite;
        }
        .mad-title {
            font-size: 1.6rem;
            font-weight: 800;
            margin: 0;
        }
        .mad-body {
            padding: 35px 30px;
            font-size: 1.1rem;
            color: var(--text-main);
            line-height: 1.6;
            text-align: center;
            max-height: 50vh;
            overflow-y: auto;
        }
        .mad-footer {
            padding: 20px 30px 25px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            text-align: center;
        }
        .btn-mad-close {
            background: var(--play-out);
            color: white;
            border: none;
            padding: 16px 35px;
            font-size: 1.1rem;
            font-weight: bold;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(22, 163, 74, 0.3);
            display: inline-flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            justify-content: center;
        }
        .btn-mad-close:hover:not(:disabled) {
            background: #15803d;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(22, 163, 74, 0.4);
        }
        .btn-mad-close:disabled {
            background: #cbd5e1;
            color: #64748b;
            box-shadow: none;
            cursor: not-allowed;
            transform: none;
        }
        @keyframes pulse-ad {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(adStyles);
});

let mandatoryAdsQueue = [];
let isAdPlaying = false;

// דריסת הפונקציה הישנה (מבלי למחוק אותה מקובץ המקור) כדי לתמוך במערך מודעות
window.loadSystemMessage = async function() {
    try {
        const res = await fetch(`${API_BASE_URL}/system-message`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken || localStorage.getItem('userToken') })
        });
        const data = await res.json();
        
        if (res.ok && data.success && data.messages) {
            processAdvancedAds(data.messages);
        }
    } catch (e) {
        console.error('Failed to load system messages', e);
    }
};

function processAdvancedAds(messages) {
    const desktopBox = document.getElementById('desktop-announcement');
    const mobileBox = document.getElementById('mobile-announcement-content');
    const mobileBtn = document.getElementById('mobile-announcement-btn-id');
    
    let regularHtml = '';
    mandatoryAdsQueue = [];

    // מיון המודעות לפי סוג
    messages.forEach(msg => {
        if (msg.isMandatory) {
            mandatoryAdsQueue.push(msg);
        } else {
            regularHtml += `
                <div class="regular-ad-box">
                    <h4 style="color: var(--secondary); margin-bottom: 8px; font-size: 1.1rem;"><i class="fa-solid fa-bell"></i> ${msg.title}</h4>
                    <div style="font-size: 0.95rem; line-height: 1.5; color: var(--text-main);">${msg.htmlContent}</div>
                </div>
            `;
        }
    });

    // הצגת מודעות רגילות
    if (regularHtml) {
        if(desktopBox) desktopBox.innerHTML = regularHtml;
        if(mobileBox) mobileBox.innerHTML = regularHtml;
        if(mobileBtn) mobileBtn.classList.add('active-btn');
    } else {
        if(desktopBox) desktopBox.innerHTML = '';
        if(mobileBox) mobileBox.innerHTML = '';
        if(mobileBtn) mobileBtn.classList.remove('active-btn');
    }

    // הפעלת פופאפ מודעות חובה
    if (mandatoryAdsQueue.length > 0 && !isAdPlaying) {
        showNextMandatoryAd();
    }
}

function showNextMandatoryAd() {
    if (mandatoryAdsQueue.length === 0) {
        isAdPlaying = false;
        return;
    }
    isAdPlaying = true;
    const ad = mandatoryAdsQueue.shift();
    
    let modal = document.getElementById('mandatoryAdModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mandatoryAdModal';
        modal.className = 'mad-overlay';
        modal.innerHTML = `
            <div class="mad-modal">
                <div class="mad-header">
                    <div class="mad-header-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <h2 class="mad-title" id="mad-title">הודעת מערכת</h2>
                </div>
                <div class="mad-body" id="mad-content"></div>
                <div class="mad-footer">
                    <button id="mad-close-btn" class="btn-mad-close" disabled>
                        סגור והמשך לאתר <span id="mad-timer-wrap">(<span id="mad-timer"></span>)</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('mad-title').innerText = ad.title;
    document.getElementById('mad-content').innerHTML = ad.htmlContent;
    
    const closeBtn = document.getElementById('mad-close-btn');
    const timerWrap = document.getElementById('mad-timer-wrap');
    const timerSpan = document.getElementById('mad-timer');
    
    modal.classList.add('active');
    
    let timeLeft = ad.closeCooldownSeconds || 0;
    
    if (timeLeft > 0) {
        closeBtn.disabled = true;
        timerWrap.style.display = 'inline';
        timerSpan.innerText = timeLeft;
        
        const timerInt = setInterval(() => {
            timeLeft--;
            timerSpan.innerText = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timerInt);
                enableAdCloseBtn(closeBtn, timerWrap);
            }
        }, 1000);
    } else {
        enableAdCloseBtn(closeBtn, timerWrap);
    }
    
    closeBtn.onclick = () => {
        modal.classList.remove('active');
        // המתנה קלה ואז בדיקה אם יש עוד מודעה בתור
        setTimeout(showNextMandatoryAd, 600);
    };
}

function enableAdCloseBtn(btn, wrap) {
    btn.disabled = false;
    wrap.style.display = 'none';
    btn.innerHTML = 'הבנתי, המשך לאתר <i class="fa-solid fa-arrow-left"></i>';
}
