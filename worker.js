import htmlContent from './index.js';
import cssContent from './style.js';
import mainJsContent from './main.js';
import authJsContent from './auth.js';
import messagesJsContent from './messages.js';
import audioActionsJsContent from './audio-actions.js';
import settingsJsContent from './settings.js';
import adminJsContent from './admin.js';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // נתיבים לממשק הראשי ולפאנל הניהול (HTML)
        if (path === '/salamon' || path === '/salamon/' || path === '/salamon/admin' || path === '/salamon/admin/') {
            return new Response(htmlContent, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }
        
        // הגשת קובץ העיצוב (CSS)
        if (path === '/salamon/style.css') {
            return new Response(cssContent, {
                headers: { 'Content-Type': 'text/css; charset=utf-8' }
            });
        }
        
        // הגשת קבצי הסקריפט המודולריים (JavaScript)
        if (path === '/salamon/main.js') {
            return new Response(mainJsContent, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/salamon/auth.js') {
            return new Response(authJsContent, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/salamon/messages.js') {
            return new Response(messagesJsContent, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/salamon/audio-actions.js') {
            return new Response(audioActionsJsContent, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/salamon/settings.js') {
            return new Response(settingsJsContent, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/salamon/admin.js') {
            return new Response(adminJsContent, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }

        // אם הנתיב לא נמצא
        return new Response('Not Found', { status: 404 });
    }
};
