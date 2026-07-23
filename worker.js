// worker.js
import htmlContent from './index.html';
import cssContent from './style.css';
import mainJs from './client-main.js';
import authJs from './client-auth.js';
import messagesJs from './client-messages.js';
import audioJs from './client-audio.js';
import settingsJs from './client-settings.js';
import adminJs from './client-admin.js';
import adsJs from './client-ads.js';
import adminAdsJs from './client-admin-ads.js';
import adminAdvancedJs from './client-admin-advanced.js';
import adminChatJs from './client-admin-chat.js';
import userChatJs from './client-user-chat.js';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        if (path === '/salamon' || path === '/salamon/' || path === '/salamon/admin' || path === '/salamon/admin/' || path === '/salamon/unsubscribe' || path === '/salamon/unsubscribe/') {
            return new Response(htmlContent, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
        if (path === '/salamon/style.css') {
            return new Response(cssContent, { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
        }
        if (path === '/salamon/client-main.js') {
            return new Response(mainJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/salamon/client-auth.js') {
            return new Response(authJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/salamon/client-messages.js') {
            return new Response(messagesJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/salamon/client-audio.js') {
            return new Response(audioJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/salamon/client-settings.js') {
            return new Response(settingsJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/salamon/client-admin.js') {
            return new Response(adminJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/salamon/client-admin-advanced.js') {
            return new Response(adminAdvancedJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/salamon/client-ads.js') {
            return new Response(adsJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/salamon/client-admin-ads.js') {
            return new Response(adminAdsJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/salamon/client-admin-chat.js') {
            return new Response(adminChatJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }
        if (path === '/salamon/client-user-chat.js') {
            return new Response(userChatJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
        }

        return new Response('Not Found', { status: 404 });
    }
};
