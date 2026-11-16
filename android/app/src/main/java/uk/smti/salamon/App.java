package uk.smti.salamon;

import android.app.Activity;
import android.app.Application;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;

import org.json.JSONObject;

import java.io.PrintWriter;
import java.io.StringWriter;

public class App extends Application {

    /** Screen lock: true when the app came to the front and must ask for the phone's lock. */
    public static boolean lockPending = true;
    /** Name of the screen on top (for crash reports). */
    public static String screen = "";
    private static int started;
    /** The activity on screen right now (for remote commands), or null. */
    public static java.lang.ref.WeakReference<Activity> top = new java.lang.ref.WeakReference<>(null);

    public static boolean visible() { return started > 0; }

    public static Activity topActivity() { return started > 0 ? top.get() : null; }
    private static long backgroundSince = 0;

    @Override
    public void onCreate() {
        super.onCreate();
        Store.init(this);
        Ui.init(this);
        Notifier.createChannels(this);
        installCrashReporter();
        sendPendingCrash();
        schedulePoll(this);

        registerActivityLifecycleCallbacks(new ActivityLifecycleCallbacks() {
            public void onActivityStarted(Activity a) {
                // returning from the phone's own lock screen is not "coming back to the app"
                if (started++ == 0 && backgroundSince > 0 && !BaseActivity.asking) {
                    long after = Math.max(0, Store.config().optInt("lockAfterMinutes", 0)) * 60_000L;
                    if (System.currentTimeMillis() - backgroundSince >= after) lockPending = true;
                }
            }

            public void onActivityStopped(Activity a) {
                if (--started == 0) backgroundSince = System.currentTimeMillis();
            }

            public void onActivityResumed(Activity a) { screen = a.getClass().getSimpleName(); top = new java.lang.ref.WeakReference<>(a); }
            public void onActivityCreated(Activity a, Bundle b) { }
            public void onActivityPaused(Activity a) { }
            public void onActivitySaveInstanceState(Activity a, Bundle b) { }
            public void onActivityDestroyed(Activity a) { }
        });
    }

    /** Background check every ~15 minutes (backup for push notifications). */
    public static void schedulePoll(Context ctx) {
        JobScheduler js = ctx.getSystemService(JobScheduler.class);
        if (js == null || js.getPendingJob(PollJob.ID) != null) return;
        js.schedule(new JobInfo.Builder(PollJob.ID, new ComponentName(ctx, PollJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(15 * 60 * 1000L)
                .setPersisted(true)
                .build());
    }

    // ------------------------------------------------------------------ crash reports

    private void installCrashReporter() {
        Thread.UncaughtExceptionHandler previous = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((t, e) -> {
            try {
                StringWriter sw = new StringWriter();
                e.printStackTrace(new PrintWriter(sw));
                getSharedPreferences("crash", MODE_PRIVATE).edit()
                        .putString("stack", sw.toString())
                        .putString("message", String.valueOf(e))
                        .putString("screen", screen)
                        .commit();
            } catch (Throwable ignored) {
            }
            if (previous != null) previous.uncaughtException(t, e);
        });
    }

    /** Sends the last crash (if any) to the server, where it shows in the control center. */
    private void sendPendingCrash() {
        SharedPreferences p = getSharedPreferences("crash", MODE_PRIVATE);
        String stack = p.getString("stack", null);
        if (stack == null) return;
        JSONObject b = new JSONObject();
        try {
            b.put("stack", stack);
            b.put("message", p.getString("message", ""));
            b.put("screen", p.getString("screen", ""));
            b.put("device", Sync.device());
        } catch (Exception ignored) {
        }
        Api.post("/app/crash", b, r -> {
            if (r.ok) p.edit().clear().apply();
        });
    }
}
