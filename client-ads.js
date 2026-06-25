document.addEventListener('DOMContentLoaded', () => {
    const adStyles = document.createElement('style');
    adStyles.innerHTML = `
        .mad-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(12px);
            z-index: 10000; display: flex; align-items: center; justify-content: center;
            opacity: 0; visibility: hidden; transition: all 0.4s ease;
        }
        .mad-overlay.active { opacity: 1; visibility: visible; }
        .mad-modal {
            position: relative; width: 90%; max-width: 500px;
            border-radius: 20px; overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            transform: scale(0.9); transition: transform 0.4s ease;
        }
        .mad-overlay.active .mad-modal { transform: scale(1); }
        .mad-close-btn {
            position: absolute; top: 15px; left: 15px; /* צד שמאל כי עברית */
            background: rgba(0,0,0,0.1); color: inherit; border: none;
            padding: 8px 15px; border-radius: 50px; font-weight: bold; cursor: pointer;
            backdrop-filter: blur(4px); display: flex; align-items: center; gap: 8px;
            z-index: 10; transition: all 0.2s;
        }
        .mad-close-btn:hover:not(:disabled) { background: rgba(0,0,0,0.2); transform: scale(1.05); }
        .mad-close-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        
        .mad-image { width: 100%; max-height: 200px; object-fit: cover; display: block; }
        .mad-body { padding: 40px 30px 30px; text-align: center; }
        .mad-title { font-size: 1.8rem; font-weight: 800; margin-bottom: 15px; }
        .mad-content { font-size: 1.1rem; line-height: 1.6; max-height: 40vh; overflow-y: auto; }
        
        .mad-stats-badge {
            display: inline-block; margin-top: 20px; padding: 5px 12px;
            background: rgba(0,0,0,0.05); border-radius: 50px; font-size: 0.85rem; font-weight: 600;
        }
        
        .regular-ad-box {
            padding: 15px; border-radius: 12px; margin-bottom: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08); position: relative; overflow: hidden;
        }
        .regular-ad-image { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; }
    `;
    document.head.appendChild(adStyles);
});

let mandatoryAdsQueue = [];
let isAdPlaying = false;

window.loadSystemMessage = async function() {
    try {
        const res = await fetch(`${API_BASE_URL}/system-message`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: state.userToken || localStorage.getItem('userToken') })
        });
        const data = await res.json();
        if (res.ok && data.success && data.messages) processAdvancedAds(data.messages);
    } catch (e) { console.error('Ads failed', e); }
};

function processAdvancedAds(messages) {
    const desktopBox = document.getElementById('desktop-announcement');
    const mobileBox = document.getElementById('mobile-announcement-content');
    
    let regularHtml = '';
    mandatoryAdsQueue = [];

    messages.forEach(msg => {
        if (msg.isMandatory) {
            mandatoryAdsQueue.push(msg);
        } else {
            const imgHtml = msg.imageUrl ? `<img src="${msg.imageUrl}" class="regular-ad-image">` : '';
            const statsHtml = msg.showViewCount ? `<div style="font-size:0.8rem; opacity:0.7; margin-top:8px;"><i class="fa-solid fa-eye"></i> נצפה ${msg.globalViews} פעמים</div>` : '';
            regularHtml += `
                <div class="regular-ad-box" style="background-color: ${msg.bgColor}; color: ${msg.textColor};">
                    ${imgHtml}
                    <h4 style="margin-bottom: 8px; font-size: 1.1rem; font-weight: 800;">${msg.title}</h4>
                    <div style="font-size: 0.95rem; line-height: 1.5;">${msg.htmlContent}</div>
                    ${statsHtml}
                </div>
            `;
        }
    });

    if (desktopBox) desktopBox.innerHTML = regularHtml;
    if (mobileBox) mobileBox.innerHTML = regularHtml;

    if (mandatoryAdsQueue.length > 0 && !isAdPlaying) showNextMandatoryAd();
}

function showNextMandatoryAd() {
    if (mandatoryAdsQueue.length === 0) { isAdPlaying = false; return; }
    isAdPlaying = true;
    const ad = mandatoryAdsQueue.shift();
    
    let modal = document.getElementById('mandatoryAdModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mandatoryAdModal';
        modal.className = 'mad-overlay';
        document.body.appendChild(modal);
    }
    
    const imgHtml = ad.imageUrl ? `<img src="${ad.imageUrl}" class="mad-image">` : '';
    const statsHtml = ad.showViewCount ? `<div class="mad-stats-badge"><i class="fa-solid fa-fire"></i> נצפה על ידי ${ad.globalViews} אנשים</div>` : '';
    
    modal.innerHTML = `
        <div class="mad-modal" style="background-color: ${ad.bgColor}; color: ${ad.textColor};">
            <button id="mad-x-btn" class="mad-close-btn" disabled>
                <span id="mad-x-timer" style="width:15px; display:inline-block; text-align:center;"></span> <i class="fa-solid fa-xmark"></i>
            </button>
            ${imgHtml}
            <div class="mad-body">
                <div class="mad-title">${ad.title}</div>
                <div class="mad-content">${ad.htmlContent}</div>
                ${statsHtml}
            </div>
        </div>
    `;
    
    const closeBtn = document.getElementById('mad-x-btn');
    const timerSpan = document.getElementById('mad-x-timer');
    modal.classList.add('active');
    
    let timeLeft = ad.closeCooldownSeconds || 0;
    
    if (timeLeft > 0) {
        timerSpan.innerText = timeLeft;
        const timerInt = setInterval(() => {
            timeLeft--;
            timerSpan.innerText = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timerInt);
                closeBtn.disabled = false;
                timerSpan.innerText = '';
            }
        }, 1000);
    } else {
        closeBtn.disabled = false;
        timerSpan.innerText = '';
    }
    
    closeBtn.onclick = () => {
        modal.classList.remove('active');
        setTimeout(showNextMandatoryAd, 500);
    };
}
