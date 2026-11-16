package uk.smti.salamon;

import android.content.Context;
import android.os.Build;

import org.json.JSONObject;

/** Reports the device to the server and gets back the remote config and the user's status. */
public final class Sync {

    private Sync() {
    }

    public static JSONObject device() {
        JSONObject d = new JSONObject();
        try {
            d.put("id", Store.deviceId());
            d.put("model", Build.MANUFACTURER + " " + Build.MODEL);
            d.put("os", "Android " + Build.VERSION.RELEASE);
            d.put("versionCode", BuildConfig.VERSION_CODE);
            d.put("versionName", BuildConfig.VERSION_NAME);
        } catch (Exception ignored) {
        }
        return d;
    }

    public static JSONObject body(Context ctx, boolean open) {
        JSONObject b = new JSONObject();
        try {
            b.put("open", open);
            b.put("device", device());
            b.put("pushToken", Store.pushToken());
            b.put("notify", new JSONObject().put("feed", Store.notify("feed")).put("chat", Store.notify("chat")).put("groups", Store.notify("groups")));
        } catch (Exception ignored) {
        }
        return b;
    }

    /** Saves the config and the user's details (permissions, admin) from a heartbeat answer. */
    public static void apply(Api.Result r) {
        if (r == null || !r.ok || r.data == null) return;
        JSONObject c = r.data.optJSONObject("config");
        if (c != null) Store.setConfig(c);
        JSONObject u = r.data.optJSONObject("user");
        if (u != null) {
            JSONObject saved = Store.user();
            try {
                for (java.util.Iterator<String> it = u.keys(); it.hasNext(); ) {
                    String k = it.next();
                    if (!u.isNull(k)) saved.put(k, u.get(k));
                }
            } catch (Exception ignored) {
            }
            Store.setUser(saved);
        }
    }

    public static void heartbeat(Context ctx, boolean open, Api.Callback cb) {
        Api.post("/app/heartbeat", body(ctx, open), r -> {
            apply(r);
            if (cb != null) cb.done(r);
        });
    }

    public static boolean isAdmin() {
        JSONObject u = Store.user();
        return u.optBoolean("isAdmin") || u.optBoolean("isSuperAdmin");
    }
}
