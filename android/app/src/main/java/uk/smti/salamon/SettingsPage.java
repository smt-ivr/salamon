package uk.smti.salamon;

import android.app.AlertDialog;
import android.app.KeyguardManager;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

/** Profile, notifications, screen lock, version and update, sign out. */
public class SettingsPage extends Page {

    private LinearLayout col;

    public SettingsPage(android.app.Activity a) {
        super(a);
    }

    @Override
    protected View build() {
        ScrollView scroll = new ScrollView(a);
        col = new LinearLayout(a);
        col.setOrientation(LinearLayout.VERTICAL);
        int p = Ui.dp(a, 16);
        col.setPadding(p, Ui.dp(a, 4), p, Ui.dp(a, 28));
        scroll.addView(col);
        fill();
        return scroll;
    }

    @Override
    public void onShow() {
        refresh();
    }

    public void refresh() {
        if (col != null) fill();
    }

    private void fill() {
        col.removeAllViews();
        JSONObject u = Store.user();
        JSONObject cfg = Store.config();

        // ---- profile ----
        LinearLayout prof = Ui.card(a);
        prof.setOrientation(LinearLayout.HORIZONTAL);
        prof.setGravity(Gravity.CENTER_VERTICAL);
        String name = u.optString("name", "");
        if ("לא מזוהה".equals(name)) name = "";
        prof.addView(Ui.avatar(a, name.isEmpty() ? u.optString("phone", "?") : name, 54));
        LinearLayout pt = new LinearLayout(a);
        pt.setOrientation(LinearLayout.VERTICAL);
        pt.setPadding(Ui.dp(a, 14), 0, 0, 0);
        pt.addView(Ui.text(a, name.isEmpty() ? "החשבון שלי" : name, 18, Ui.TEXT, 700));
        TextView ph = Ui.text(a, u.optString("phone", ""), 14, Ui.TEXT3, 400);
        ph.setTextDirection(View.TEXT_DIRECTION_LTR);
        ph.setGravity(Gravity.START);
        pt.addView(ph);
        if (!u.optString("email").isEmpty()) pt.addView(Ui.text(a, u.optString("email"), 13, Ui.TEXT3, 400));
        prof.addView(pt, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        col.addView(prof, Ui.wide(a, 4, 16));

        // ---- notifications ----
        col.addView(section("התראות"));
        LinearLayout n = Ui.card(a);
        boolean allowed = Notifier.allowed(a);
        boolean server = cfg.optBoolean("pushConfigured");
        boolean token = !Store.pushToken().isEmpty();
        String state;
        int stateColor;
        if (!allowed) { state = "ההתראות חסומות בטלפון. לחצו \"הגדרות התראות\" כדי לאפשר."; stateColor = Ui.BAD; }
        else if (server && token) { state = "פעיל: ההתראות מגיעות גם כשהאפליקציה סגורה."; stateColor = Ui.GOOD; }
        else { state = "פעיל בבדיקה תקופתית (כל כרבע שעה)."; stateColor = Ui.WARN; }
        TextView st = Ui.text(a, state, 14, stateColor, 500);
        n.addView(st, Ui.wide(a, 0, 6));
        n.addView(toggle("הודעות קוליות חדשות", "feed"));
        n.addView(toggle("תשובות מהצוות בצ׳אט", "chat"));
        n.addView(toggle("הודעות בקבוצות", "groups"));
        LinearLayout btns = new LinearLayout(a);
        Button test = Ui.button(a, "שליחת התראת בדיקה", false);
        test.setTextSize(14);
        test.setOnClickListener(v -> {
            test.setEnabled(false);
            Api.post("/app/test-push", new JSONObject(), r -> {
                test.setEnabled(true);
                Toast.makeText(a, r.ok ? "נשלחה. היא אמורה להופיע בעוד רגע." : r.error, Toast.LENGTH_LONG).show();
            });
        });
        btns.addView(test, new LinearLayout.LayoutParams(0, Ui.dp(a, 46), 1));
        btns.addView(new View(a), new LinearLayout.LayoutParams(Ui.dp(a, 8), 1));
        Button sys = Ui.button(a, "הגדרות התראות", false);
        sys.setTextSize(14);
        sys.setOnClickListener(v -> {
            Intent i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, a.getPackageName());
            try { a.startActivity(i); } catch (Exception ignored) { }
        });
        btns.addView(sys, new LinearLayout.LayoutParams(0, Ui.dp(a, 46), 1));
        n.addView(btns, Ui.wide(a, 12, 0));
        col.addView(n, Ui.wide(a, 0, 16));

        // ---- when and how ----
        col.addView(section("מתי ואיך"));
        LinearLayout when = Ui.card(a);
        when.setPadding(0, Ui.dp(a, 6), 0, Ui.dp(a, 6));

        // mute for a while
        long mute = Store.muteUntil();
        boolean muted = mute > System.currentTimeMillis();
        LinearLayout muteRow = Ui.iconRow(a, R.drawable.ic_bell, muted ? Ui.HUE_ROSE : Ui.HUE_AMBER, muted ? "ההתראות מושתקות" : "השתקה זמנית",
                muted ? "עד " + new java.text.SimpleDateFormat("HH:mm", java.util.Locale.US).format(new java.util.Date(mute)) + " · לחצו לביטול" : "לשעה, ל-8 שעות או עד הבוקר");
        muteRow.setOnClickListener(v -> {
            if (Store.muteUntil() > System.currentTimeMillis()) {
                Store.setMuteUntil(0);
                fill();
                return;
            }
            String[] opts = {"שעה", "8 שעות", "עד הבוקר (07:00)", "24 שעות"};
            new AlertDialog.Builder(a).setTitle("להשתיק התראות ל…").setItems(opts, (d, which) -> {
                long now = System.currentTimeMillis(), until;
                if (which == 0) until = now + 3600_000L;
                else if (which == 1) until = now + 8 * 3600_000L;
                else if (which == 3) until = now + 24 * 3600_000L;
                else {
                    java.util.Calendar c = java.util.Calendar.getInstance();
                    c.set(java.util.Calendar.HOUR_OF_DAY, 7);
                    c.set(java.util.Calendar.MINUTE, 0);
                    c.set(java.util.Calendar.SECOND, 0);
                    if (c.getTimeInMillis() <= now) c.add(java.util.Calendar.DAY_OF_MONTH, 1);
                    until = c.getTimeInMillis();
                }
                Store.setMuteUntil(until);
                fill();
            }).show();
        });
        when.addView(muteRow);

        // quiet hours
        LinearLayout quiet = Ui.iconRow(a, R.drawable.ic_moon, Ui.HUE_INDIGO, "שעות שקטות",
                Store.quietOn() ? "פעיל · " + hhmm(Store.quietFrom()) + " עד " + hhmm(Store.quietTo()) + " (בלי צליל)" : "כבוי · ההתראות מגיעות בכל שעה");
        Switch qs = new Switch(a);
        qs.setChecked(Store.quietOn());
        qs.setOnCheckedChangeListener((b, on) -> {
            Store.setQuietOn(on);
            fill();
        });
        quiet.addView(qs);
        when.addView(quiet);
        if (Store.quietOn()) {
            LinearLayout times = new LinearLayout(a);
            times.setPadding(Ui.dp(a, 70), 0, Ui.dp(a, 16), Ui.dp(a, 8));
            Button from = Ui.button(a, "מ-" + hhmm(Store.quietFrom()), false);
            Button to = Ui.button(a, "עד " + hhmm(Store.quietTo()), false);
            from.setTextSize(14);
            to.setTextSize(14);
            from.setOnClickListener(v -> pickTime(Store.quietFrom(), m -> { Store.setQuiet(m, Store.quietTo()); fill(); }));
            to.setOnClickListener(v -> pickTime(Store.quietTo(), m -> { Store.setQuiet(Store.quietFrom(), m); fill(); }));
            times.addView(from, new LinearLayout.LayoutParams(0, Ui.dp(a, 42), 1));
            times.addView(new View(a), new LinearLayout.LayoutParams(Ui.dp(a, 8), 1));
            times.addView(to, new LinearLayout.LayoutParams(0, Ui.dp(a, 42), 1));
            when.addView(times);
        }

        // sound
        String mode = Store.soundMode();
        String modeLabel = "vibrate".equals(mode) ? "רטט בלבד" : "silent".equals(mode) ? "שקט (בלי צליל ורטט)" : "צליל ורטט";
        LinearLayout soundRow = Ui.iconRow(a, R.drawable.ic_megaphone, Ui.HUE_VIOLET, "צליל ההתראות", modeLabel);
        soundRow.setOnClickListener(v -> {
            String[] keys = {"sound", "vibrate", "silent"};
            String[] labels = {"צליל ורטט", "רטט בלבד", "שקט (בלי צליל ורטט)"};
            int cur = java.util.Arrays.asList(keys).indexOf(Store.soundMode());
            new AlertDialog.Builder(a).setTitle("צליל ההתראות").setSingleChoiceItems(labels, Math.max(0, cur), (d, which) -> {
                Store.setSoundMode(keys[which]);
                d.dismiss();
                fill();
            }).show();
        });
        when.addView(soundRow);

        // preview
        LinearLayout prev = Ui.iconRow(a, R.drawable.ic_lock, Ui.HUE_SLATE, "הצגת תוכן ההודעה",
                Store.showPreview() ? "רואים בהתראה מה נכתב" : "מוצג רק \"הודעה חדשה\" (פרטיות)");
        Switch ps = new Switch(a);
        ps.setChecked(Store.showPreview());
        ps.setOnCheckedChangeListener((b, on) -> {
            Store.setShowPreview(on);
            fill();
        });
        prev.addView(ps);
        when.addView(prev);

        // battery saver (the most common reason notifications are late)
        try {
            android.os.PowerManager pm = (android.os.PowerManager) a.getSystemService(android.content.Context.POWER_SERVICE);
            if (!pm.isIgnoringBatteryOptimizations(a.getPackageName())) {
                LinearLayout bat = Ui.iconRow(a, R.drawable.ic_bolt, Ui.HUE_ROSE, "חיסכון בסוללה מעכב התראות",
                        "לחצו כדי לאשר לאפליקציה לקבל התראות תמיד בזמן");
                bat.setOnClickListener(v -> {
                    try {
                        a.startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, android.net.Uri.parse("package:" + a.getPackageName())));
                    } catch (Exception e) {
                        try { a.startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)); } catch (Exception ignored) { }
                    }
                });
                when.addView(bat);
            }
        } catch (Exception ignored) { }
        col.addView(when, Ui.wide(a, 0, 16));

        // ---- security ----
        col.addView(section("אבטחה"));
        LinearLayout sec = Ui.card(a);
        boolean forced = cfg.optBoolean("requireLock");
        Switch lock = sw("נעילה בכניסה (טביעת אצבע / קוד הטלפון)", forced || Store.lockByUser());
        lock.setEnabled(!forced);
        lock.setOnCheckedChangeListener((b, on) -> {
            KeyguardManager km = a.getSystemService(KeyguardManager.class);
            if (on && (km == null || !km.isDeviceSecure())) {
                b.setChecked(false);
                Toast.makeText(a, "קודם צריך להגדיר נעילת מסך בטלפון", Toast.LENGTH_LONG).show();
                return;
            }
            Store.setLockByUser(on);
        });
        sec.addView(lock);
        if (forced) sec.addView(Ui.muted(a, "הנעילה הופעלה על ידי הנהלת סלומון."));
        col.addView(sec, Ui.wide(a, 0, 16));

        // ---- management (managers only) ----
        if (Sync.isAdmin()) {
            col.addView(section("ניהול"));
            LinearLayout adm = Ui.card(a);
            adm.addView(Ui.text(a, "🛡️ מרכז השליטה", 15, Ui.TEXT, 700));
            adm.addView(Ui.muted(a, "ניהול מלא מתוך האפליקציה: לקוחות, צ׳אט, מכשירים, שליחת התראות ושליטה מרחוק."), Ui.wide(a, 4, 0));
            Button go = Ui.button(a, "פתיחת מרכז השליטה", true);
            go.setOnClickListener(v -> WebActivity.openAdmin(a));
            adm.addView(go, Ui.wide(a, 12, 0));
            col.addView(adm, Ui.wide(a, 0, 16));
        }

        // ---- version ----
        col.addView(section("גרסה"));
        LinearLayout ver = Ui.card(a);
        int latestCode = cfg.optInt("latestVersionCode");
        String latestName = cfg.optString("latestVersionName", "");
        boolean newer = latestCode > BuildConfig.VERSION_CODE;
        ver.addView(Ui.text(a, "מותקנת: " + BuildConfig.VERSION_NAME, 15, Ui.TEXT, 500));
        if (!latestName.isEmpty()) {
            TextView l = Ui.text(a, newer ? "יש גרסה חדשה: " + latestName : "זו הגרסה העדכנית ✓", 14, newer ? Ui.WARN : Ui.GOOD, 500);
            ver.addView(l, Ui.wide(a, 4, 0));
        }
        Button upd = Ui.button(a, newer ? "עדכון עכשיו" : "בדיקה ועדכון", newer);
        upd.setOnClickListener(v -> Updater.checkAndUpdate(a));
        ver.addView(upd, Ui.wide(a, 12, 0));
        col.addView(ver, Ui.wide(a, 0, 16));

        // ---- sign out ----
        Button out = Ui.button(a, "יציאה מהחשבון", false);
        out.setTextColor(Ui.BAD);
        out.setOnClickListener(v -> new AlertDialog.Builder(a)
                .setMessage("לצאת מהחשבון באפליקציה? ההתראות יפסיקו להגיע לטלפון הזה.")
                .setPositiveButton("יציאה", (d, w) -> logout())
                .setNegativeButton("ביטול", null)
                .show());
        col.addView(out, Ui.wide(a, 4, 8));
        TextView foot = Ui.muted(a, "עכשיו סלומון · " + Build.MANUFACTURER + " " + Build.MODEL);
        foot.setGravity(Gravity.CENTER);
        col.addView(foot, Ui.wide(a, 8, 0));
    }

    private TextView section(String s) {
        TextView t = Ui.text(a, s, 14, Ui.TEXT3, 700);
        t.setPadding(Ui.dp(a, 4), 0, 0, Ui.dp(a, 6));
        return t;
    }

    private Switch sw(String label, boolean checked) {
        Switch s = new Switch(a);
        s.setText(label);
        s.setTextSize(15.5f);
        s.setTypeface(Ui.font(500));
        s.setTextColor(Ui.TEXT);
        s.setChecked(checked);
        s.setPadding(0, Ui.dp(a, 10), 0, Ui.dp(a, 10));
        return s;
    }

    private Switch toggle(String label, String kind) {
        Switch s = sw(label, Store.notify(kind));
        s.setOnCheckedChangeListener((b, on) -> {
            Store.setNotify(kind, on);
            Sync.heartbeat(a, false, null);
        });
        return s;
    }

    private static String hhmm(int minutes) {
        return String.format(java.util.Locale.US, "%02d:%02d", minutes / 60, minutes % 60);
    }

    private void pickTime(int minutes, java.util.function.IntConsumer done) {
        new android.app.TimePickerDialog(a, (tp, h, m) -> done.accept(h * 60 + m), minutes / 60, minutes % 60, true).show();
    }

    private void logout() {
        JSONObject b = new JSONObject();
        try { b.put("pushToken", Store.pushToken()); } catch (Exception ignored) { }
        Api.post("/app/logout", b, null);
        Player.stop();
        Store.clearSession();
        a.startActivity(new Intent(a, LoginActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK));
        a.finish();
    }
}
