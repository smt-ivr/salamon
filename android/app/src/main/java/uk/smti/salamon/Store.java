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

    // notification preferences
    public static boolean quietOn() { return p.getBoolean("quiet_on", false); }
    public static void setQuietOn(boolean on) { p.edit().putBoolean("quiet_on", on).apply(); }
    /** minutes from midnight */
    public static int quietFrom() { return p.getInt("quiet_from", 22 * 60); }
    public static int quietTo() { return p.getInt("quiet_to", 7 * 60); }
    public static void setQuiet(int from, int to) { p.edit().putInt("quiet_from", from).putInt("quiet_to", to).apply(); }
    public static long muteUntil() { return p.getLong("mute_until", 0); }
    public static void setMuteUntil(long t) { p.edit().putLong("mute_until", t).apply(); }
    /** sound | vibrate | silent */
    public static String soundMode() { return p.getString("sound_mode", "sound"); }
    public static void setSoundMode(String m) { p.edit().putString("sound_mode", m).apply(); }
    public static boolean showPreview() { return p.getBoolean("show_preview", true); }
    public static void setShowPreview(boolean on) { p.edit().putBoolean("show_preview", on).apply(); }
}
