async function silentLogin(token) {
    // חסימה ומחיקה של משתמשים עם פורמט הסיסמאות הישן
    if (token.includes(':')) {
        logout();
        return;
    }

    try {
        // פנייה ישירה ונמוקה אך ורק לאימות הטוקן
        const res = await fetch(`${API_BASE_URL}/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: token })
        });
        const data = await res.json();
        
        if (res.ok && data.user) {
            state.userToken = token;
            state.currentUser = data.user;

            if(typeof updateDashboardUI === 'function') updateDashboardUI();
            showView('user-dash-view');
            if(typeof loadMessages === 'function') loadMessages();
            if(typeof loadSystemMessage === 'function') loadSystemMessage(); 
            startPolling(); 
        } else {
            logout(); // הטוקן פג תוקף או שגוי
        }
    } catch (err) {
        logout(); // שגיאת רשת
    }
}
