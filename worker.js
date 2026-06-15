import htmlContent from './index.js';
import cssContent from './style.js';
import jsContent from './frontend.txt'; // הקובץ הקיים
import messagesJsContent from './messages-client.js'; // הקובץ החדש שהוספנו!

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // טעינת האפליקציה גם בנתיב הרגיל וגם בנתיב הניהול
        if (path === '/salamon' || path === '/salamon/' || path === '/salamon/admin' || path === '/salamon/admin/') {
            return new Response(htmlContent, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }
        
        if (path === '/salamon/style.css') {
            return new Response(cssContent, {
                headers: { 'Content-Type': 'text/css; charset=utf-8' }
            });
        }
        
        if (path === '/salamon/frontend.js') {
            return new Response(jsContent, {
                headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
            });
        }

        // הנתיב החדש עבור קובץ הלוגיקה של ההודעות
        if (path === '/salamon/messages.js') {
            return new Response(messagesJsContent, {
                headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
            });
        }

        return new Response('Not Found', { status: 404 });
    }
};
