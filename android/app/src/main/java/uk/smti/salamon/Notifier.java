package uk.smti.salamon;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

/** Phone notifications, one channel per kind so the user can tune each in Android settings too. */
public final class Notifier {

    public static final String EXTRA_TYPE = "notif_type";
    public static final String EXTRA_GROUP = "notif_group";
    public static final String EXTRA_FILE = "notif_file";

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
    }

    public static boolean allowed(Context ctx) {
        if (Build.VERSION.SDK_INT >= 33
                && ctx.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        return ctx.getSystemService(NotificationManager.class).areNotificationsEnabled();
    }

    /**
     * @param type feed | chat | group | announce | test
     * @param tag  same tag replaces the previous notification
     */
    public static void show(Context ctx, String type, String title, String body, String tag, String groupId, String fileId) {
        if (!allowed(ctx)) return;
        createChannels(ctx);
        if (type == null || type.isEmpty()) type = "announce";
        String channel = type.equals("feed") || type.equals("chat") || type.equals("group") || type.equals("admin_chat") ? type : "announce";
        if (tag == null || tag.isEmpty()) tag = "salamon-" + type;

        Intent open = new Intent(ctx, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(EXTRA_TYPE, type);
        if (groupId != null) open.putExtra(EXTRA_GROUP, groupId);
        if (fileId != null) open.putExtra(EXTRA_FILE, fileId);
        PendingIntent pi = PendingIntent.getActivity(ctx, tag.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, channel)
                : new Notification.Builder(ctx).setPriority(Notification.PRIORITY_HIGH).setDefaults(Notification.DEFAULT_ALL);
        b.setSmallIcon(R.drawable.ic_notify)
                .setColor(ctx.getColor(R.color.brand))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setShowWhen(true)
                .setContentIntent(pi);
        ctx.getSystemService(NotificationManager.class).notify(tag, 1, b.build());
    }

    public static void cancel(Context ctx, String tag) {
        ctx.getSystemService(NotificationManager.class).cancel(tag, 1);
    }
}
