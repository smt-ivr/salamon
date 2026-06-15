import htmlContent from './index.js';
import cssContent from './style.js';
import jsContent from './frontend.txt';
import tzintukJsContent from './admin-tzintuk.txt';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // נתיבים לממשק הראשי
        if (path === '/salamon' || path === '/salamon/' || path === '/salamon/admin' || path === '/salamon/admin/') {
            return new Response(htmlContent, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }
        
        // הגשת קבצי העיצוב והסקריפטים
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

        // הנתיב החדש עבור קובץ הניהול (מה שגרם ל-404)
        if (path === '/salamon/admin-tzintuk.txt') {
            return new Response(tzintukJsContent, {
                headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
            });
        }

        return new Response('Not Found', { status: 404 });
    }
};
