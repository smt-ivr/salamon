import htmlContent from './index.js';
import cssContent from './style.js';
import jsContent from './frontend.txt'; // זכור ששינינו ל-txt

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

        // =========================================================================
        // --- נתיב שרת חדש: קבלת רשימת הודעות קוליות מימות המשיח (לרשומים בלבד) ---
        // =========================================================================
        if (path === '/salamon/api/get-messages' && request.method === 'POST') {
            try {
                const body = await request.json();
                const userToken = body.userToken;

                // אבטחה: וידוא שהמשתמש רשום ומחובר (בדיקת נוכחות טוקן)
                if (!userToken) {
                    return new Response(JSON.stringify({ error: 'גישה נדחתה: משתמש אינו מחובר למערכת' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json; charset=utf-8' }
                    });
                }

                // הגדרת נתיב התיקייה בימות המשיח (ברירת מחדל ivrmenu)
                const folderPath = body.folderPath || 'ivrmenu';
                
                // שליפת הטוקן הסודי של ימות המשיח ממשתני הסביבה של Cloudflare
                const yemotToken = env.YEMOT_TOKEN;

                // מנגנון סימולציה לחוויית פיתוח חלקה במידה ועדיין לא הוגדר טוקן אמיתי בלוח הבקרה
                if (!yemotToken) {
                    const mockFiles = {
                        status: "OK",
                        files: [
                            { name: "הודעה ראשונה - ברוכים הבאים.wav", size: 245400, mtime: Math.floor(Date.now() / 1000) - 3600 },
                            { name: "עדכון מערכת דחוף לחברים.wav", size: 512000, mtime: Math.floor(Date.now() / 1000) - 86400 },
                            { name: "הקלטה קולית מהמערכת הטלפונית.mp3", size: 1024000, mtime: Math.floor(Date.now() / 1000) - 172800 }
                        ]
                    };
                    
                    const formattedMock = mockFiles.files.map(f => ({
                        name: f.name,
                        size: (f.size / 1024).toFixed(1) + " KB",
                        date: new Date(f.mtime * 1000).toLocaleString('he-IL'),
                        streamUrl: `/salamon/api/stream-message?path=${encodeURIComponent(folderPath + '/' + f.name)}&userToken=${encodeURIComponent(userToken)}&mock=true`
                    }));

                    return new Response(JSON.stringify({ status: "OK", messages: formattedMock, isMock: true }), {
                        headers: { 'Content-Type': 'application/json; charset=utf-8' }
                    });
                }

                // פנייה מאובטחת מאחורי הקלעים ל-API של ימות המשיח לשליפת רשימת הקבצים
                const yemotUrl = `https://www.call2all.co.il/ym/api/GetFilesList?token=${yemotToken}&path=${encodeURIComponent(folderPath)}`;
                const yemotRes = await fetch(yemotUrl);
                const yemotData = await yemotRes.json();

                if (yemotData.status !== 'OK') {
                    return new Response(JSON.stringify({ error: yemotData.message || 'שגיאה בקבלת נתונים משרת התקשורת' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json; charset=utf-8' }
                    });
                }

                // סינון ועיבוד הקבצים (הצגת קבצי שמע מסוג wav או mp3 בלבד)
                const audioFiles = (yemotData.files || [])
                    .filter(f => f.name.endsWith('.wav') || f.name.endsWith('.mp3'))
                    .map(f => ({
                        name: f.name,
                        size: (f.size / 1024).toFixed(1) + " KB",
                        date: new Date(f.mtime * 1000).toLocaleString('he-IL'),
                        streamUrl: `/salamon/api/stream-message?path=${encodeURIComponent(folderPath + '/' + f.name)}&userToken=${encodeURIComponent(userToken)}`
                    }));

                return new Response(JSON.stringify({ status: "OK", messages: audioFiles }), {
                    headers: { 'Content-Type': 'application/json; charset=utf-8' }
                });

            } catch (err) {
                return new Response(JSON.stringify({ error: 'שגיאת שרת פנימית: ' + err.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json; charset=utf-8' }
                });
            }
        }

        // =========================================================================
        // --- נתיב שרת חדש: הזרמת קובץ השמע (Streaming) בצורה מאובטחת לנגן ה-HTML ---
        // =========================================================================
        if (path === '/salamon/api/stream-message' && request.method === 'GET') {
            try {
                const filePath = url.searchParams.get('path');
                const userToken = url.searchParams.get('userToken');
                const isMock = url.searchParams.get('mock');

                // אבטחה: מניעת גישה למי שאינו מחובר או חסר פרמטרים
                if (!userToken || !filePath) {
                    return new Response('Unauthorized access or missing parameters', { status: 401 });
                }

                // אם אנחנו במצב סימולציה, נזרים קובץ שמע קצרצר וקבוע כדי שהנגן בדפדפן יעבוד חלק בבדיקות
                if (isMock === 'true') {
                    const buffer = new Uint8Array([
                        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
                        0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00,
                        0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00
                    ]);
                    return new Response(buffer, {
                        headers: { 'Content-Type': 'audio/wav', 'Content-Length': buffer.length.toString() }
                    });
                }

                const yemotToken = env.YEMOT_TOKEN;
                if (!yemotToken) {
                    return new Response('Yemot system token is not configured', { status: 500 });
                }

                // פנייה ישירה ומאובטחת להורדת הקובץ מימות המשיח
                const downloadUrl = `https://www.call2all.co.il/ym/api/DownloadFile?token=${yemotToken}&path=${encodeURIComponent(filePath)}`;
                const yemotRes = await fetch(downloadUrl);

                if (!yemotRes.ok) {
                    return new Response('Error retrieving audio from communication provider', { status: yemotRes.status });
                }

                // קביעת סוג התוכן הנכון להזרמה חלקה בנגן הדפדפן
                const contentType = filePath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
                
                // הזרמת ה-Stream (הנתונים הגולמיים) ישירות מהרשת אל הלקוח (נצרך פחות זיכרון ועובד מהר וחלק)
                return new Response(yemotRes.body, {
                    headers: {
                        'Content-Type': contentType,
                        'Cache-Control': 'no-cache',
                        'Content-Disposition': `inline; filename="${encodeURIComponent(filePath.split('/').pop())}"`
                    }
                });

            } catch (err) {
                return new Response('Streaming process error: ' + err.message, { status: 500 });
            }
        }

        return new Response('Not Found', { status: 404 });
    }
};
