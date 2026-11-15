package uk.smti.salamon;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

/** Shows phone notifications, both for the web page (while open) and for server pushes. */
public final class Notifier {

    public static final String EXTRA_TAG = "notif_tag";
    public static final String EXTRA_URL = "notif_url";

    private static final String CH_MESSAGES = "messages";
    private static final String CH_CHAT = "chat";

    private Notifier() {
    }

    public static void createChannels(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        NotificationChannel a = new NotificationChannel(CH_MESSAGES,
                ctx.getString(R.string.channel_messages), NotificationManager.IMPORTANCE_HIGH);
        NotificationChannel b = new NotificationChannel(CH_CHAT,
                ctx.getString(R.string.channel_chat), NotificationManager.IMPORTANCE_HIGH);
        nm.createNotificationChannel(a);
        nm.createNotificationChannel(b);
    }

    public static boolean allowed(Context ctx) {
        if (Build.VERSION.SDK_INT >= 33
                && ctx.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        return ctx.getSystemService(NotificationManager.class).areNotificationsEnabled();
    }

    /**
     * @param tag  same tag replaces the previous notification (e.g. "salamon-chat")
     * @param url  page to open when tapped; null keeps the current page
     */
    public static void show(Context ctx, String title, String body, String tag, String url) {
        if (!allowed(ctx)) return;
        createChannels(ctx);
        if (tag == null || tag.isEmpty()) tag = "salamon";
        String channel = tag.contains("chat") || tag.contains("group") ? CH_CHAT : CH_MESSAGES;

        Intent open = new Intent(ctx, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(EXTRA_TAG, tag);
        if (url != null && !url.isEmpty()) open.putExtra(EXTRA_URL, url);
        PendingIntent pi = PendingIntent.getActivity(ctx, tag.hashCode(), open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(ctx, channel)
                : new Notification.Builder(ctx).setPriority(Notification.PRIORITY_HIGH)
                .setDefaults(Notification.DEFAULT_ALL);
        b.setSmallIcon(R.drawable.ic_notify)
                .setColor(ctx.getColor(R.color.brand))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setContentIntent(pi);
        ctx.getSystemService(NotificationManager.class).notify(tag, 1, b.build());
    }

    public static void cancel(Context ctx, String tag) {
        ctx.getSystemService(NotificationManager.class).cancel(tag == null || tag.isEmpty() ? "salamon" : tag, 1);
    }
}
