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

    public static void heartbeat(Context ctx, boolean open, Api.Callback cb) {
        JSONObject b = new JSONObject();
        try {
            b.put("open", open);
            b.put("device", device());
            b.put("pushToken", Store.pushToken());
            b.put("notify", new JSONObject().put("feed", Store.notify("feed")).put("chat", Store.notify("chat")).put("groups", Store.notify("groups")));
        } catch (Exception ignored) {
        }
        Api.post("/app/heartbeat", b, r -> {
            if (r.ok) {
                JSONObject c = r.data.optJSONObject("config");
                if (c != null) Store.setConfig(c);
                JSONObject u = r.data.optJSONObject("user");
                if (u != null && open) {
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
            if (cb != null) cb.done(r);
        });
    }
}
