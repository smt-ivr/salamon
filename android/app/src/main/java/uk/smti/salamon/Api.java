package uk.smti.salamon;

import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Talks to the Salamon server (smti.uk/salamon/api). Calls run in the background, results on the UI thread. */
public final class Api {

    public static final String BASE = "https://smti.uk/salamon/api";

    public interface Callback {
        void done(Result r);
    }

    public static final class Result {
        public final boolean ok;
        public final int status;
        public final JSONObject data;
        public final String error;

        Result(boolean ok, int status, JSONObject data, String error) {
            this.ok = ok;
            this.status = status;
            this.data = data == null ? new JSONObject() : data;
            this.error = error;
        }

        public boolean appBlocked() { return data.optBoolean("appBlocked"); }
        public boolean relogin() { return status == 401 || data.optBoolean("relogin"); }
    }

    private static final ExecutorService pool = Executors.newFixedThreadPool(4);
    private static final Handler main = new Handler(Looper.getMainLooper());
    /** Called on the UI thread when the server says the session or access is gone. */
    public static Runnable onSessionLost;
    public static Runnable onAppBlocked;

    private Api() {
    }

    public static String userAgent() {
        return "SalamonApp/" + BuildConfig.VERSION_NAME + " (native; Android " + Build.VERSION.RELEASE + "; " + Build.MODEL + ")";
    }

    /** POST JSON. The user's token is added automatically. */
    public static void post(String path, JSONObject body, Callback cb) {
        final JSONObject b = body == null ? new JSONObject() : body;
        try {
            if (!b.has("userToken") && Store.loggedIn()) b.put("userToken", Store.token());
        } catch (Exception ignored) {
        }
        pool.execute(() -> deliver(cb, request("POST", path, b.toString().getBytes(StandardCharsets.UTF_8), "application/json")));
    }

    public static void get(String path, Callback cb) {
        pool.execute(() -> deliver(cb, request("GET", path, null, null)));
    }

    /** Synchronous POST, for background jobs. */
    public static Result postNow(String path, JSONObject body) {
        try {
            if (!body.has("userToken") && Store.loggedIn()) body.put("userToken", Store.token());
        } catch (Exception ignored) {
        }
        return request("POST", path, body.toString().getBytes(StandardCharsets.UTF_8), "application/json");
    }

    /** Uploads a recorded voice message (multipart, like the website). */
    public static void uploadRecording(File file, Callback cb) {
        upload(file, "recording.m4a", "audio/mp4", "record", cb);
    }

    /** Uploads an audio file. uploadType: "record" (recorded in the app) or "file" (chosen from the phone). */
    public static void upload(File file, String fileName, String mime, String uploadType, Callback cb) {
        pool.execute(() -> {
            String boundary = "----salamon" + System.currentTimeMillis();
            try {
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                DataOutputStream out = new DataOutputStream(buf);
                field(out, boundary, "userToken", Store.token());
                field(out, boundary, "uploadType", uploadType);
                out.writeBytes("--" + boundary + "\r\n");
                out.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + fileName.replace("\"", "") + "\"\r\n").getBytes(StandardCharsets.UTF_8));
                out.writeBytes("Content-Type: " + mime + "\r\n\r\n");
                try (InputStream in = new FileInputStream(file)) {
                    byte[] b = new byte[8192];
                    int n;
                    while ((n = in.read(b)) > 0) out.write(b, 0, n);
                }
                out.writeBytes("\r\n--" + boundary + "--\r\n");
                out.flush();
                deliver(cb, request("POST", "/messages/upload", buf.toByteArray(), "multipart/form-data; boundary=" + boundary));
            } catch (Exception e) {
                deliver(cb, new Result(false, 0, null, "ההעלאה נכשלה"));
            }
        });
    }

    private static void field(DataOutputStream out, String boundary, String name, String value) throws Exception {
        out.writeBytes("--" + boundary + "\r\n");
        out.writeBytes("Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n");
        out.write(value.getBytes(StandardCharsets.UTF_8));
        out.writeBytes("\r\n");
    }

    /** Address of a voice message for the player. */
    public static String streamUrl(String fileId) {
        try {
            return BASE + "/messages/stream?userToken=" + URLEncoder.encode(Store.token(), "UTF-8") + "&fileId=" + URLEncoder.encode(fileId, "UTF-8");
        } catch (Exception e) {
            return BASE + "/messages/stream";
        }
    }

    private static Result request(String method, String path, byte[] body, String contentType) {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(path.startsWith("http") ? path : BASE + path).openConnection();
            c.setRequestMethod(method);
            c.setConnectTimeout(15000);
            c.setReadTimeout(30000);
            c.setRequestProperty("User-Agent", userAgent());
            c.setRequestProperty("Accept", "application/json");
            if (body != null) {
                c.setDoOutput(true);
                c.setRequestProperty("Content-Type", contentType);
                try (OutputStream o = c.getOutputStream()) {
                    o.write(body);
                }
            }
            int status = c.getResponseCode();
            InputStream in = status >= 400 ? c.getErrorStream() : c.getInputStream();
            String text = in == null ? "" : readAll(in);
            JSONObject data;
            try {
                data = text.isEmpty() ? new JSONObject() : new JSONObject(text);
            } catch (Exception e) {
                data = new JSONObject();
            }
            boolean ok = status >= 200 && status < 300 && data.optBoolean("success", true);
            String err = ok ? null : data.optString("error", data.optString("message", status == 0 ? "אין חיבור לאינטרנט" : "משהו השתבש, נסו שוב"));
            return new Result(ok, status, data, err);
        } catch (Exception e) {
            return new Result(false, 0, null, "אין חיבור לאינטרנט");
        } finally {
            if (c != null) c.disconnect();
        }
    }

    private static void deliver(Callback cb, Result r) {
        main.post(() -> {
            if (r.appBlocked() && onAppBlocked != null) onAppBlocked.run();
            else if (r.status == 401 && Store.loggedIn() && onSessionLost != null) onSessionLost.run();
            if (cb != null) cb.done(r);
        });
    }

    private static String readAll(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] b = new byte[8192];
        int n;
        while ((n = in.read(b)) > 0) out.write(b, 0, n);
        in.close();
        return out.toString("UTF-8");
    }
}
