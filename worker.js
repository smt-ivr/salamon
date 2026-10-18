// worker.js
import htmlContent from './index.html';
import cssContent from './style.css';
import mainJs from './client-main.js';
import authJs from './client-auth.js';
import messagesJs from './client-messages.js';
import audioJs from './client-audio.js';
import settingsJs from './client-settings.js';
import adsJs from './client-ads.js';
import userChatJs from './client-user-chat.js';
import staffLinkJs from './client-staff-link.js';

import controlHtml from './control.html';
import controlCss from './control.css';
import controlJs from './client-control.js';

const JS = 'application/javascript; charset=utf-8';

const PUBLIC_FILES = {
    '/salamon/style.css': [cssContent, 'text/css; charset=utf-8'],
    '/salamon/client-main.js': [mainJs, JS],
    '/salamon/client-auth.js': [authJs, JS],
    '/salamon/client-messages.js': [messagesJs, JS],
    '/salamon/client-audio.js': [audioJs, JS],
    '/salamon/client-settings.js': [settingsJs, JS],
    '/salamon/client-ads.js': [adsJs, JS],
    '/salamon/client-user-chat.js': [userChatJs, JS],
    '/salamon/client-staff-link.js': [staffLinkJs, JS],
};

const CONTROL_FILES = {
    '/salamon/control.css': [controlCss, 'text/css; charset=utf-8'],
    '/salamon/client-control.js': [controlJs, JS],
};

// Strict policy for the admin console: only our own script may run, so injected markup cannot execute.
const CONTROL_HEADERS = {
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
        "img-src 'self' https: data:",
        "connect-src 'self' https://smti.uk",
        "frame-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'none'",
        "form-action 'self'",
    ].join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
};

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname.replace(/\/+$/, '') || '/';

        if (path === '/salamon' || path === '/salamon/unsubscribe') {
            return new Response(htmlContent, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
        if (path === '/salamon/control') {
            return Response.redirect(`${url.origin}/salamon/admin`, 301);
        }
        if (path === '/salamon/admin') {
            return new Response(controlHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8', ...CONTROL_HEADERS } });
        }
        if (PUBLIC_FILES[url.pathname]) {
            const [body, type] = PUBLIC_FILES[url.pathname];
            return new Response(body, { headers: { 'Content-Type': type } });
        }
        if (CONTROL_FILES[url.pathname]) {
            const [body, type] = CONTROL_FILES[url.pathname];
            return new Response(body, { headers: { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' } });
        }

        return new Response('Not Found', { status: 404 });
    }
};
