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

    /** Details for the control center: battery, network, screen, permissions, storage. Each part is optional. */
    public static JSONObject info(Context ctx) {
        JSONObject i = new JSONObject();
        try { i.put("brand", Build.BRAND); i.put("manufacturer", Build.MANUFACTURER); i.put("model", Build.MODEL); i.put("device", Build.DEVICE); } catch (Exception ignored) { }
        try { i.put("android", Build.VERSION.RELEASE); i.put("sdk", Build.VERSION.SDK_INT); } catch (Exception ignored) { }
        try {
            android.util.DisplayMetrics m = ctx.getResources().getDisplayMetrics();
            i.put("screen", m.widthPixels + "×" + m.heightPixels);
            i.put("dpi", m.densityDpi);
        } catch (Exception ignored) { }
        try { i.put("language", java.util.Locale.getDefault().toLanguageTag()); i.put("timezone", java.util.TimeZone.getDefault().getID()); } catch (Exception ignored) { }
        try {
            android.os.BatteryManager bm = (android.os.BatteryManager) ctx.getSystemService(Context.BATTERY_SERVICE);
            i.put("battery", bm.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY));
            if (Build.VERSION.SDK_INT >= 23) i.put("charging", bm.isCharging());
        } catch (Exception ignored) { }
        try {
            android.os.PowerManager pm = (android.os.PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            i.put("batteryOptimized", !pm.isIgnoringBatteryOptimizations(ctx.getPackageName()));
            i.put("powerSave", pm.isPowerSaveMode());
        } catch (Exception ignored) { }
        try {
            android.net.ConnectivityManager cm = (android.net.ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
            android.net.NetworkCapabilities nc = cm.getNetworkCapabilities(cm.getActiveNetwork());
            String net = nc == null ? "none" : nc.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI) ? "wifi"
                    : nc.hasTransport(android.net.NetworkCapabilities.TRANSPORT_CELLULAR) ? "cellular" : "other";
            i.put("network", net);
        } catch (Exception ignored) { }
        try { i.put("notifications", Notifier.allowed(ctx)); } catch (Exception ignored) { }
        try { i.put("canInstall", Updater.canInstall(ctx)); } catch (Exception ignored) { }
        try {
            android.app.KeyguardManager km = (android.app.KeyguardManager) ctx.getSystemService(Context.KEYGUARD_SERVICE);
            i.put("screenLock", km != null && km.isDeviceSecure());
            i.put("appLock", Store.lockByUser() || Store.config().optBoolean("requireLock"));
        } catch (Exception ignored) { }
        try {
            android.os.StatFs fs = new android.os.StatFs(ctx.getFilesDir().getAbsolutePath());
            i.put("storageFreeMb", fs.getAvailableBytes() / 1048576);
            i.put("storageTotalMb", fs.getTotalBytes() / 1048576);
            android.app.ActivityManager.MemoryInfo mi = new android.app.ActivityManager.MemoryInfo();
            ((android.app.ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE)).getMemoryInfo(mi);
            i.put("ramMb", mi.totalMem / 1048576);
        } catch (Exception ignored) { }
        try {
            android.content.pm.PackageInfo pi = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            i.put("installedAt", pi.firstInstallTime);
            i.put("updatedAt", pi.lastUpdateTime);
        } catch (Exception ignored) { }
        try { i.put("pushToken", !Store.pushToken().isEmpty()); } catch (Exception ignored) { }
        return i;
    }

    public static JSONObject body(Context ctx, boolean open) {
        JSONObject b = new JSONObject();
        try {
            b.put("open", open);
            b.put("device", device());
            b.put("info", info(ctx));
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
