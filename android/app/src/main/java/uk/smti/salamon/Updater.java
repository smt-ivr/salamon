package uk.smti.salamon;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.widget.Toast;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Updates the app from inside the app: downloads the new APK from smti.uk and hands it to
 * Android's installer (the user taps "Update" once). Uses PackageInstaller, no file sharing needed.
 */
public final class Updater {

    public interface Progress {
        void update(int percent, String status);
    }

    public static final String URL = "https://smti.uk/salamon/app/download";
    private static boolean running;

    private Updater() {
    }

    /** Android 8+: the user must allow this app to install updates (once). */
    public static boolean canInstall(Context ctx) {
        return Build.VERSION.SDK_INT < 26 || ctx.getPackageManager().canRequestPackageInstalls();
    }

    public static void openInstallPermission(Activity a) {
        if (Build.VERSION.SDK_INT >= 26) {
            a.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + a.getPackageName())));
            Toast.makeText(a, "אשרו \"התרה ממקור זה\" וחזרו לאפליקציה", Toast.LENGTH_LONG).show();
        }
    }

    public static void start(Activity a, Progress p) {
        if (running) return;
        if (!canInstall(a)) {
            openInstallPermission(a);
            p.update(-1, "צריך לאשר התקנת עדכונים, ואז ללחוץ שוב");
            return;
        }
        running = true;
        Handler ui = new Handler(Looper.getMainLooper());
        new Thread(() -> {
            HttpURLConnection c = null;
            PackageInstaller.Session session = null;
            try {
                c = (HttpURLConnection) new URL(URL).openConnection();
                c.setRequestProperty("User-Agent", Api.userAgent());
                c.setInstanceFollowRedirects(true);
                c.setConnectTimeout(20000);
                c.setReadTimeout(60000);
                int total = c.getContentLength();
                PackageInstaller installer = a.getPackageManager().getPackageInstaller();
                PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                params.setAppPackageName(a.getPackageName());
                int id = installer.createSession(params);
                session = installer.openSession(id);
                long done = 0;
                try (InputStream in = c.getInputStream(); OutputStream out = session.openWrite("salamon.apk", 0, total > 0 ? total : -1)) {
                    byte[] buf = new byte[65536];
                    int n, lastPct = -1;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        done += n;
                        int pct = total > 0 ? (int) (done * 100 / total) : -1;
                        if (pct != lastPct) {
                            lastPct = pct;
                            final int fp = pct;
                            ui.post(() -> p.update(fp, fp >= 0 ? "מוריד… " + fp + "%" : "מוריד…"));
                        }
                    }
                    session.fsync(out);
                }
                Intent done2 = new Intent(a, InstallReceiver.class);
                PendingIntent pi = PendingIntent.getBroadcast(a, id, done2,
                        PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0));
                session.commit(pi.getIntentSender());
                session.close();
                ui.post(() -> p.update(100, "פותח את ההתקנה…"));
            } catch (Exception e) {
                if (session != null) session.abandon();
                ui.post(() -> p.update(-1, "העדכון נכשל. בדקו את החיבור ונסו שוב."));
            } finally {
                if (c != null) c.disconnect();
                running = false;
            }
        }).start();
    }

    /** A proper update window: progress bar, status, and the Android install screen at the end. */
    public static void showDialog(Activity a) {
        android.widget.LinearLayout box = new android.widget.LinearLayout(a);
        box.setOrientation(android.widget.LinearLayout.VERTICAL);
        int p = Ui.dp(a, 22);
        box.setPadding(p, Ui.dp(a, 8), p, 0);
        android.widget.TextView status = Ui.text(a, "מכין את העדכון…", 15, Ui.TEXT2, 500);
        box.addView(status);
        android.widget.ProgressBar bar = new android.widget.ProgressBar(a, null, android.R.attr.progressBarStyleHorizontal);
        bar.setMax(100);
        bar.setIndeterminate(true);
        box.addView(bar, Ui.wide(a, 12, 4));
        android.widget.TextView note = Ui.muted(a, "העדכון לא נשמר בטלפון: הוא עובר ישר להתקנה. בסוף לוחצים \"עדכון\" במסך של אנדרואיד.");
        box.addView(note, Ui.wide(a, 6, 0));
        android.app.AlertDialog d = new android.app.AlertDialog.Builder(a)
                .setTitle("עדכון האפליקציה")
                .setView(box)
                .setNegativeButton("סגירה", null)
                .setCancelable(false)
                .create();
        d.show();
        start(a, (pct, text) -> {
            status.setText(text);
            if (pct >= 0) {
                bar.setIndeterminate(false);
                bar.setProgress(pct);
            }
            if (pct < 0) bar.setIndeterminate(false);
            if (pct >= 100) status.postDelayed(d::dismiss, 1500);
        });
    }

    /** Android asks the user to confirm the install; this shows that screen. */
    public static class InstallReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context ctx, Intent intent) {
            int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
            if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
                if (confirm != null) {
                    confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(confirm);
                }
            } else if (status != PackageInstaller.STATUS_SUCCESS) {
                Toast.makeText(ctx, "ההתקנה לא הושלמה", Toast.LENGTH_LONG).show();
            }
        }
    }
}
