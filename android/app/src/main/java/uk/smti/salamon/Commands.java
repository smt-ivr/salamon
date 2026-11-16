package uk.smti.salamon;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONObject;

import java.util.Map;

/**
 * Delivery receipts and remote commands from the control center.
 * Every push the phone receives is confirmed to the server ("received ✓" in the console),
 * and pushes of type "command" are run here: ping, refresh, restart, logout, update.
 */
public final class Commands {

    private Commands() {
    }

    /** Runs on the push service's background thread. */
    public static void ack(Context ctx, Map<String, String> d, String cmdId) {
        try {
            JSONObject b = new JSONObject();
            b.put("pushToken", Store.pushToken());
            b.put("pid", nz(d.get("pid")));
            b.put("type", nz(d.get("type")));
            b.put("title", nz(d.get("title")));
            if (cmdId != null) b.put("cmd", cmdId);
            Api.postNow("/app/ack", b);
        } catch (Exception ignored) {
        }
    }

    /** true = it was a command (handled here, no regular notification). */
    public static boolean handle(Context ctx, Map<String, String> d) {
        if (!"command".equals(d.get("type"))) return false;
        String cmd = nz(d.get("cmd"));
        String cid = d.get("cid");
        Handler ui = new Handler(Looper.getMainLooper());
        switch (cmd) {
            case "ping":
                Notifier.show(ctx, "announce", "בדיקת התראה ✓", "ההתראה הגיעה לטלפון. אפשר להתעלם מההודעה.", "salamon-ping", null, null);
                ack(ctx, d, cid);
                break;
            case "refresh":
                Api.Result r = Api.postNow("/app/heartbeat", Sync.body(ctx, false));
                Sync.apply(r);
                ack(ctx, d, cid);
                ui.post(() -> {
                    Activity a = App.topActivity();
                    if (a instanceof MainActivity) ((MainActivity) a).reloadFromRemote();
                });
                break;
            case "restart":
                ack(ctx, d, cid);
                ui.post(() -> restart(ctx));
                break;
            case "logout":
                ack(ctx, d, cid);
                Store.clearSession();
                ((NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE)).cancelAll();
                ui.post(() -> {
                    Activity a = App.topActivity();
                    if (a != null) {
                        a.startActivity(new Intent(a, LoginActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK));
                    }
                });
                break;
            case "update":
                ack(ctx, d, cid);
                ui.post(() -> {
                    Activity a = App.topActivity();
                    if (a != null) Updater.showDialog(a);
                    else Notifier.show(ctx, "announce", "עדכון לאפליקציה", "יש גרסה חדשה. פתחו את האפליקציה כדי לעדכן.", "salamon-update", null, null);
                });
                break;
            default:
                ack(ctx, d, cid);
        }
        return true;
    }

    /**
     * On screen: every screen is closed and the app starts again from the beginning (fresh settings and data).
     * In the background: the process is ended, so the next open is a clean start. Android does not let an app
     * open itself from the background, so it does not pop up by itself.
     */
    public static void restart(Context ctx) {
        Activity a = App.topActivity();
        if (a != null) {
            Intent i = new Intent(a, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            a.startActivity(i);
            a.overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
        } else {
            new Handler(Looper.getMainLooper()).postDelayed(() -> android.os.Process.killProcess(android.os.Process.myPid()), 500);
        }
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }
}
