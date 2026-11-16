package uk.smti.salamon;

import android.app.Activity;
import android.app.Dialog;
import android.app.DownloadManager;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.util.LruCache;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Chat pictures: loads them with the app's account, shows them full screen, and saves other files to the phone. */
public final class Images {

    private static final ExecutorService pool = Executors.newFixedThreadPool(3);
    private static final Handler ui = new Handler(Looper.getMainLooper());
    private static final LruCache<String, Bitmap> cache = new LruCache<String, Bitmap>(24 * 1024 * 1024) {
        @Override
        protected int sizeOf(String k, Bitmap b) {
            return b.getByteCount();
        }
    };

    private Images() {
    }

    /** The file links check the site's sign-in cookie; the app sends its own account the same way. */
    private static String cookie() {
        return "sal_s=" + Store.token();
    }

    public static void load(ImageView v, String url, int maxPx) {
        if (url == null || url.isEmpty()) return;
        String key = url + "@" + maxPx;
        Bitmap hit = cache.get(key);
        v.setTag(key);
        if (hit != null) {
            v.setImageBitmap(hit);
            return;
        }
        pool.execute(() -> {
            Bitmap b = fetch(url, maxPx);
            if (b != null) cache.put(key, b);
            ui.post(() -> {
                if (key.equals(v.getTag()) && b != null) v.setImageBitmap(b);
            });
        });
    }

    private static Bitmap fetch(String url, int maxPx) {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(url).openConnection();
            c.setRequestProperty("User-Agent", Api.userAgent());
            c.setRequestProperty("Cookie", cookie());
            c.setConnectTimeout(15000);
            c.setReadTimeout(30000);
            if (c.getResponseCode() >= 400) return null;
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (InputStream in = c.getInputStream()) {
                byte[] buf = new byte[16384];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            byte[] data = out.toByteArray();
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(data, 0, data.length, o);
            int sample = 1;
            while (Math.max(o.outWidth, o.outHeight) / (sample * 2) >= maxPx) sample *= 2;
            o = new BitmapFactory.Options();
            o.inSampleSize = sample;
            return BitmapFactory.decodeByteArray(data, 0, data.length, o);
        } catch (Throwable e) {
            return null;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    /** Full-screen picture; tap to close. */
    public static void view(Activity a, String url) {
        Dialog d = new Dialog(a, android.R.style.Theme_Black_NoTitleBar_Fullscreen);
        FrameLayout box = new FrameLayout(a);
        box.setBackgroundColor(Color.BLACK);
        ProgressBar spin = new ProgressBar(a);
        box.addView(spin, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        ImageView img = new ImageView(a);
        img.setScaleType(ImageView.ScaleType.FIT_CENTER);
        box.addView(img, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        box.setOnClickListener(v -> d.dismiss());
        img.setOnClickListener(v -> d.dismiss());
        d.setContentView(box);
        d.show();
        int max = Math.max(a.getResources().getDisplayMetrics().widthPixels, a.getResources().getDisplayMetrics().heightPixels);
        pool.execute(() -> {
            Bitmap b = fetch(url, max);
            ui.post(() -> {
                spin.setVisibility(android.view.View.GONE);
                if (b != null) img.setImageBitmap(b);
                else Toast.makeText(a, "לא ניתן לטעון את התמונה", Toast.LENGTH_SHORT).show();
            });
        });
    }

    /** Any other file: saved by Android's download manager (a notification opens it when done). */
    public static void download(Context ctx, String url, String name) {
        try {
            DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
            r.addRequestHeader("Cookie", cookie());
            r.addRequestHeader("User-Agent", Api.userAgent());
            r.setTitle(name);
            r.setDescription("עכשיו סלומון");
            r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            r.setDestinationInExternalFilesDir(ctx, Environment.DIRECTORY_DOWNLOADS, name.replaceAll("[\\\\/:*?\"<>|]", "_"));
            ((DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(r);
            Toast.makeText(ctx, "מוריד את הקובץ… תופיע התראה כשיסתיים", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Toast.makeText(ctx, "לא ניתן להוריד את הקובץ", Toast.LENGTH_SHORT).show();
        }
    }
}
