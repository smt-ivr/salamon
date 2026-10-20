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

import v2Html from './v2/v2.html';
import v2Css from './v2/v2.css';
import v2Core from './v2/core.js';
import v2Auth from './v2/auth.js';
import v2Feed from './v2/feed.js';
import v2Record from './v2/record.js';
import v2Chat from './v2/chat.js';
import v2Settings from './v2/settings.js';
import v2Ads from './v2/ads.js';
import v2Boot from './v2/boot.js';
import v2Sw from './v2/sw.js';
import v2LinkJs from './client-v2-link.js';

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
    '/salamon/client-v2-link.js': [v2LinkJs, JS],
};

// הגרסה החדשה (/salamon/v2): קבצים נפרדים לגמרי מהאתר הוותיק
const V2_FILES = {
    '/salamon/v2/v2.css': [v2Css, 'text/css; charset=utf-8'],
    '/salamon/v2/core.js': [v2Core, JS],
    '/salamon/v2/auth.js': [v2Auth, JS],
    '/salamon/v2/feed.js': [v2Feed, JS],
    '/salamon/v2/record.js': [v2Record, JS],
    '/salamon/v2/chat.js': [v2Chat, JS],
    '/salamon/v2/settings.js': [v2Settings, JS],
    '/salamon/v2/ads.js': [v2Ads, JS],
    '/salamon/v2/boot.js': [v2Boot, JS],
    '/salamon/v2/sw.js': [v2Sw, JS],
};

const V2_MANIFEST = JSON.stringify({
    name: 'עכשיו סלומון', short_name: 'סלומון', lang: 'he', dir: 'rtl',
    start_url: '/salamon/v2', scope: '/salamon/v2/', display: 'standalone', orientation: 'portrait',
    background_color: '#0a0f1c', theme_color: '#16a34a',
    description: 'הודעות קוליות, הקלטה, צינתוקים וצ\'אט',
    icons: [
        { src: 'https://smt-tel-manager.netlify.app/salamon-logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'https://smt-tel-manager.netlify.app/salamon-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
});

// מדיניות אבטחה לגרסה החדשה: רק הסקריפטים שלנו ו-Google לכניסה
const V2_HEADERS = {
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' https://accounts.google.com/gsi/client",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://accounts.google.com/gsi/style",
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
        "img-src 'self' https: data: blob:",
        "media-src 'self' blob: https://smti.uk",
        "connect-src 'self' https://smti.uk https://accounts.google.com/gsi/",
        "frame-src https://accounts.google.com/gsi/",
        "worker-src 'self'",
        "manifest-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'none'",
        "form-action 'self'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'microphone=(self), camera=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
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
        "img-src 'self' https: data: blob:",
        "media-src 'self' blob:",
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
        if (path === '/salamon/v2') {
            return new Response(v2Html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', ...V2_HEADERS } });
        }
        if (url.pathname === '/salamon/v2/manifest.webmanifest') {
            return new Response(V2_MANIFEST, { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'no-cache' } });
        }
        if (V2_FILES[url.pathname]) {
            const [body, type] = V2_FILES[url.pathname];
            const extra = url.pathname.endsWith('/sw.js') ? { 'Service-Worker-Allowed': '/salamon/v2/' } : {};
            return new Response(body, { headers: { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', ...extra } });
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
