import htmlContent from './index.html';
import cssContent from './style.css';
import jsContent from './frontend.js';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // טעינת עמוד הבית (HTML)
        if (path === '/salamon' || path === '/salamon/') {
            return new Response(htmlContent, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }
        
        // טעינת קובץ העיצוב (CSS)
        if (path === '/salamon/style.css') {
            return new Response(cssContent, {
                headers: { 'Content-Type': 'text/css; charset=utf-8' }
            });
        }
        
        // טעינת קובץ הלוגיקה (JavaScript)
        if (path === '/salamon/frontend.js') {
            return new Response(jsContent, {
                headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
            });
        }

        // אם הנתיב לא תואם (ה-API יטופל אוטומטית ע"י הוורקר השני של ה-API)
        return new Response('Not Found', { status: 404 });
    }
};
