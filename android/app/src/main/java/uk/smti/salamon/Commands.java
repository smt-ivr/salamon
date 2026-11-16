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
     * Messages from the control center that did not arrive as a push (phone off, battery saver...).
     * The server keeps them until confirmed; they come back with the heartbeat / background check.
     * With an activity: announcements are shown as a window, commands run (an update opens right away).
     * Without one (background): shown as notifications.
     */
    public static void runPending(Context ctx, org.json.JSONArray pending, Activity a) {
        if (pending == null || pending.length() == 0) return;
        for (int i = 0; i < pending.length(); i++) {
            JSONObject p = pending.optJSONObject(i);
            if (p == null) continue;
            java.util.Map<String, String> d = new java.util.HashMap<>();
            d.put("pid", p.optString("pid"));
            d.put("type", p.optString("type"));
            d.put("title", p.optString("title"));
            d.put("body", p.optString("body"));
            String cmd = p.optString("cmd", ""), cid = p.optString("cid", "");
            boolean command = "command".equals(p.optString("type"));
            new Thread(() -> ack(ctx, d, command ? cid : null)).start();
            if (command) {
                // the app was just opened, so a "restart" / "refresh" already happened by itself
                if ("logout".equals(cmd)) {
                    Store.clearSession();
                    if (a != null) a.startActivity(new Intent(a, LoginActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK));
                    return;
                }
                if ("update".equals(cmd)) {
                    if (a != null) Updater.checkAndUpdate(a);
                    else Notifier.show(ctx, "announce", "עדכון לאפליקציה", "יש גרסה חדשה. פתחו את האפליקציה כדי לעדכן.", "salamon-update", null, null);
                }
                continue;
            }
            String title = p.optString("title", "עכשיו סלומון"), body = p.optString("body", "");
            if (a != null && !a.isFinishing()) {
                new android.app.AlertDialog.Builder(a)
                        .setTitle("📣 " + title)
                        .setMessage(body + "\n\n" + Fmt.when(p.optString("createdAt")))
                        .setPositiveButton("הבנתי", null)
                        .show();
            } else {
                Notifier.show(ctx, "announce", title, body, "salamon-pending-" + p.optString("pid"), null, null);
            }
        }
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
