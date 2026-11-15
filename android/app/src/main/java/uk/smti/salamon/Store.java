package uk.smti.salamon;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.util.UUID;

/** Everything the app keeps on the phone: session, user, settings, remote config. */
public final class Store {

    private static SharedPreferences p;

    private Store() {
    }

    public static void init(Context ctx) {
        if (p == null) p = ctx.getApplicationContext().getSharedPreferences("salamon", Context.MODE_PRIVATE);
    }

    // ---------- session ----------
    public static String token() { return p.getString("token", ""); }
    public static boolean loggedIn() { return !token().isEmpty(); }
    public static void setSession(String token, JSONObject user) {
        p.edit().putString("token", token).putString("user", user == null ? "{}" : user.toString()).apply();
    }
    public static void clearSession() {
        p.edit().remove("token").remove("user").remove("last_feed").remove("last_chat").remove("last_groups").apply();
    }
    public static JSONObject user() {
        try { return new JSONObject(p.getString("user", "{}")); } catch (Exception e) { return new JSONObject(); }
    }
    public static void setUser(JSONObject u) { p.edit().putString("user", u.toString()).apply(); }

    // ---------- device ----------
    public static String deviceId() {
        String id = p.getString("device_id", "");
        if (id.isEmpty()) {
            id = UUID.randomUUID().toString();
            p.edit().putString("device_id", id).apply();
        }
        return id;
    }
    public static String pushToken() { return p.getString("push_token", ""); }
    public static void setPushToken(String t) { p.edit().putString("push_token", t == null ? "" : t).apply(); }

    // ---------- notification settings (sent to the server) ----------
    public static boolean notify(String kind) { return p.getBoolean("notify_" + kind, true); }
    public static void setNotify(String kind, boolean on) { p.edit().putBoolean("notify_" + kind, on).apply(); }

    // ---------- remote config ----------
    public static JSONObject config() {
        try { return new JSONObject(p.getString("config", "{}")); } catch (Exception e) { return new JSONObject(); }
    }
    public static void setConfig(JSONObject c) { p.edit().putString("config", c.toString()).apply(); }

    // ---------- screen lock ----------
    public static boolean lockByUser() { return p.getBoolean("lock_user", false); }
    public static void setLockByUser(boolean on) { p.edit().putBoolean("lock_user", on).apply(); }
    public static long lastUnlock() { return p.getLong("last_unlock", 0); }
    public static void setLastUnlock(long t) { p.edit().putLong("last_unlock", t).apply(); }

    // ---------- "already seen" markers for the background check ----------
    public static long mark(String k) { return p.getLong("last_" + k, 0); }
    public static void setMark(String k, long v) { p.edit().putLong("last_" + k, v).apply(); }

    // ---------- player ----------
    public static float speed() { return p.getFloat("speed", 1f); }
    public static void setSpeed(float s) { p.edit().putFloat("speed", s).apply(); }
}
