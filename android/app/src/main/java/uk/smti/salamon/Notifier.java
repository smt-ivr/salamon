package uk.smti.salamon;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.RemoteInput;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Shader;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.Icon;
import android.os.Build;

import org.json.JSONObject;

import java.util.Calendar;

/**
 * Phone notifications in the style of a messaging app: sender picture, the message, the Salamon colour,
 * and "reply" right from the notification for the team chat. Respects the user's quiet hours / mute /
 * sound settings from the app (quiet = still shown, without sound).
 */
public final class Notifier {

    public static final String EXTRA_TYPE = "notif_type";
    public static final String EXTRA_GROUP = "notif_group";
    public static final String EXTRA_FILE = "notif_file";
    static final String KEY_REPLY = "reply_text";

    private Notifier() {
    }

    public static void createChannels(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel("feed", "הודעות קוליות חדשות", NotificationManager.IMPORTANCE_HIGH));
        nm.createNotificationChannel(new NotificationChannel("chat", "תשובות מהצוות", NotificationManager.IMPORTANCE_HIGH));
        nm.createNotificationChannel(new NotificationChannel("group", "הודעות בקבוצות", NotificationManager.IMPORTANCE_HIGH));
        nm.createNotificationChannel(new NotificationChannel("announce", "הודעות מהנהלת סלומון", NotificationManager.IMPORTANCE_HIGH));
        nm.createNotificationChannel(new NotificationChannel("admin_chat", "ניהול: הודעות מלקוחות", NotificationManager.IMPORTANCE_HIGH));
        NotificationChannel vib = new NotificationChannel("vibrate", "רטט בלבד", NotificationManager.IMPORTANCE_HIGH);
        vib.setSound(null, null);
        vib.enableVibration(true);
        nm.createNotificationChannel(vib);
        NotificationChannel quiet = new NotificationChannel("quiet", "שקט (שעות שקטות)", NotificationManager.IMPORTANCE_LOW);
        quiet.setSound(null, null);
        quiet.enableVibration(false);
        nm.createNotificationChannel(quiet);
    }

    public static boolean allowed(Context ctx) {
        if (Build.VERSION.SDK_INT >= 33
                && ctx.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        return ctx.getSystemService(NotificationManager.class).areNotificationsEnabled();
    }

    // ------------------------------------------------------------------ the user's settings

    /** Inside the quiet hours or a "mute for…" period. */
    public static boolean quietNow() {
        if (Store.muteUntil() > System.currentTimeMillis()) return true;
        if (!Store.quietOn()) return false;
        Calendar c = Calendar.getInstance();
        int now = c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE);
        int from = Store.quietFrom(), to = Store.quietTo();
        return from <= to ? now >= from && now < to : now >= from || now < to;
    }

    private static String channelFor(String type) {
        if (quietNow()) return "quiet";
        String sound = Store.soundMode();
        if ("silent".equals(sound)) return "quiet";
        if ("vibrate".equals(sound)) return "vibrate";
        return type.equals("feed") || type.equals("chat") || type.equals("group") || type.equals("admin_chat") ? type : "announce";
    }

    private static String label(String type) {
        switch (type) {
            case "feed": return "הודעה קולית";
            case "chat": return "צ׳אט עם ההנהלה";
            case "group": return "קבוצות";
            case "admin_chat": return "ניהול · תיבת תמיכה";
            case "test": return "בדיקה";
            default: return "עכשיו סלומון";
        }
    }

    /**
     * @param type feed | chat | group | announce | admin_chat | test
     * @param tag  same tag replaces the previous notification
     */
    public static void show(Context ctx, String type, String title, String body, String tag, String groupId, String fileId) {
        if (!allowed(ctx)) return;
        createChannels(ctx);
        if (type == null || type.isEmpty()) type = "announce";
        if (tag == null || tag.isEmpty()) tag = "salamon-" + type;
        if (body == null) body = "";
        if (!Store.showPreview() && !"announce".equals(type) && !"test".equals(type)) body = "הודעה חדשה";

        Intent open = new Intent(ctx, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(EXTRA_TYPE, type);
        if (groupId != null) open.putExtra(EXTRA_GROUP, groupId);
        if (fileId != null) open.putExtra(EXTRA_FILE, fileId);
        PendingIntent pi = PendingIntent.getActivity(ctx, tag.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String channel = channelFor(type);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, channel)
                : new Notification.Builder(ctx).setPriority(quietNow() ? Notification.PRIORITY_LOW : Notification.PRIORITY_HIGH)
                .setDefaults(quietNow() ? 0 : Notification.DEFAULT_ALL);
        int brand = ctx.getColor(R.color.brand);
        String sender = senderOf(type, title);
        b.setSmallIcon(R.drawable.ic_notify)
                .setColor(brand)
                .setContentTitle(title)
                .setContentText(body)
                .setSubText(label(type))
                .setLargeIcon(type.equals("feed") || type.equals("announce") || type.equals("test") ? appIcon(ctx) : avatar(ctx, sender, colorFor(type)))
                .setAutoCancel(true)
                .setShowWhen(true)
                .setCategory(type.equals("announce") ? Notification.CATEGORY_RECOMMENDATION : Notification.CATEGORY_MESSAGE)
                .setGroup("salamon-" + type)
                .setContentIntent(pi);

        if (Build.VERSION.SDK_INT >= 28 && (type.equals("chat") || type.equals("group") || type.equals("admin_chat"))) {
            android.app.Person me = new android.app.Person.Builder().setName("אני").build();
            android.app.Person from = new android.app.Person.Builder().setName(sender)
                    .setIcon(Icon.createWithBitmap(avatar(ctx, sender, colorFor(type)))).build();
            Notification.MessagingStyle ms = new Notification.MessagingStyle(me);
            if (type.equals("group")) ms.setConversationTitle(title).setGroupConversation(true);
            ms.addMessage(body, System.currentTimeMillis(), from);
            b.setStyle(ms);
        } else {
            b.setStyle(new Notification.BigTextStyle().bigText(body));
        }

        // reply to the team straight from the notification
        if (type.equals("chat") && Build.VERSION.SDK_INT >= 24) {
            RemoteInput ri = new RemoteInput.Builder(KEY_REPLY).setLabel("כתבו תשובה…").build();
            PendingIntent rp = PendingIntent.getBroadcast(ctx, 4401, new Intent(ctx, ReplyReceiver.class).putExtra("tag", tag),
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0));
            b.addAction(new Notification.Action.Builder(Icon.createWithResource(ctx, R.drawable.ic_reply), "השב", rp).addRemoteInput(ri).build());
        }
        ctx.getSystemService(NotificationManager.class).notify(tag, 1, b.build());
    }

    public static void cancel(Context ctx, String tag) {
        ctx.getSystemService(NotificationManager.class).cancel(tag, 1);
    }

    // ------------------------------------------------------------------ pictures

    private static String senderOf(String type, String title) {
        if ("chat".equals(type)) return "צוות סלומון";
        String t = title == null ? "" : title.replace("💬", "").replace("הודעה חדשה מ", "").trim();
        return t.isEmpty() ? "סלומון" : t;
    }

    private static int colorFor(String type) {
        switch (type) {
            case "chat": return Ui.HUE_BLUE;
            case "group": return Ui.HUE_TEAL;
            case "admin_chat": return Ui.HUE_GOLD;
            default: return Ui.HUE_GREEN;
        }
    }

    /** Round picture with the sender's initials on a rich gradient. */
    static Bitmap avatar(Context ctx, String name, int hue) {
        int size = (int) (ctx.getResources().getDisplayMetrics().density * 64);
        Bitmap bm = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bm);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setShader(new LinearGradient(0, 0, size, size, Ui.blend(hue, Color.WHITE, 0.2f), Ui.blend(hue, Color.BLACK, 0.25f), Shader.TileMode.CLAMP));
        c.drawCircle(size / 2f, size / 2f, size / 2f, p);
        Paint t = new Paint(Paint.ANTI_ALIAS_FLAG);
        t.setColor(Color.WHITE);
        t.setTextSize(size * 0.38f);
        t.setTextAlign(Paint.Align.CENTER);
        t.setTypeface(Ui.font(700));
        String init = initials(name);
        Paint.FontMetrics fm = t.getFontMetrics();
        c.drawText(init, size / 2f, size / 2f - (fm.ascent + fm.descent) / 2, t);
        return bm;
    }

    private static String initials(String name) {
        String[] parts = (name == null ? "" : name.trim()).split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String s : parts) {
            if (!s.isEmpty() && sb.length() < 2) sb.append(s.charAt(0));
        }
        return sb.length() == 0 ? "ס" : sb.toString();
    }

    private static Bitmap appIcon(Context ctx) {
        try {
            Drawable d = ctx.getPackageManager().getApplicationIcon(ctx.getPackageName());
            int size = (int) (ctx.getResources().getDisplayMetrics().density * 64);
            Bitmap bm = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas c = new Canvas(bm);
            d.setBounds(0, 0, size, size);
            d.draw(c);
            return bm;
        } catch (Throwable e) {
            return null;
        }
    }

    /** "Reply" typed in the notification: sent to the team chat, then the notification says it was sent. */
    public static class ReplyReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context ctx, Intent intent) {
            android.os.Bundle in = RemoteInput.getResultsFromIntent(intent);
            CharSequence text = in == null ? null : in.getCharSequence(KEY_REPLY);
            String tag = intent.getStringExtra("tag");
            if (text == null || text.toString().trim().isEmpty()) return;
            Store.init(ctx);
            PendingResult pr = goAsync();
            new Thread(() -> {
                boolean ok = false;
                try {
                    JSONObject b = new JSONObject();
                    b.put("text", text.toString().trim());
                    ok = Api.postNow("/chat/send", b).ok;
                } catch (Exception ignored) {
                }
                createChannels(ctx);
                Notification.Builder nb = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, "quiet") : new Notification.Builder(ctx);
                nb.setSmallIcon(R.drawable.ic_notify).setColor(ctx.getColor(R.color.brand))
                        .setContentTitle(ok ? "התשובה נשלחה ✓" : "השליחה נכשלה")
                        .setContentText(ok ? text.toString() : "פתחו את האפליקציה ונסו שוב")
                        .setTimeoutAfter(ok ? 4000 : 0)
                        .setAutoCancel(true);
                ctx.getSystemService(NotificationManager.class).notify(tag == null ? "salamon-chat" : tag, 1, nb.build());
                pr.finish();
            }).start();
        }
    }
}
