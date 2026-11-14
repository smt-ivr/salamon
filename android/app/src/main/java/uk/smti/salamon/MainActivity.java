package uk.smti.salamon;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Collections;

public class MainActivity extends Activity {

    static final String HOME = "https://smti.uk/salamon/v2";
    private static final String HOST = "smti.uk";

    private static final int REQ_FILE = 1;
    private static final int REQ_MIC = 2;
    private static final int REQ_NOTIFY = 3;
    private static final int REQ_STORAGE = 4;

    private static MainActivity current;
    private static boolean foreground;

    private WebView web;
    private ProgressBar progress;
    private LinearLayout errorView;
    private String bridgeJs = "";
    private boolean documentStartScript;

    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingMic;
    private int pendingNotifyId;
    private DownloadManager.Request pendingDownload;
    private String pushToken = "";

    public static boolean isInForeground() {
        return foreground;
    }

    /** Firebase gave a new token: let the page know so it can register it with the server. */
    public static void onPushToken(String token) {
        MainActivity a = current;
        if (a == null) return;
        a.runOnUiThread(() -> {
            a.pushToken = token == null ? "" : token;
            a.web.evaluateJavascript("window.dispatchEvent(new Event('salamon-push-token'))", null);
        });
    }

    // ------------------------------------------------------------------ lifecycle

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        current = this;
        Notifier.createChannels(this);
        bridgeJs = readAsset("bridge.js");
        buildUi();
        Push.getToken(this, t -> runOnUiThread(() -> {
            pushToken = t == null ? "" : t;
            // If the page is already logged in it registers the token now; otherwise on login.
            if (!pushToken.isEmpty()) web.evaluateJavascript("window.dispatchEvent(new Event('salamon-push-token'))", null);
        }));

        String start = startUrl(getIntent());
        if (savedInstanceState != null && web.restoreState(savedInstanceState) != null && start == null) {
            return;
        }
        web.loadUrl(start != null ? start : HOME);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String url = startUrl(intent);
        String tag = intent.getStringExtra(Notifier.EXTRA_TAG);
        if (url != null && !url.equals(web.getUrl())) {
            web.loadUrl(url);
        } else if (tag != null) {
            // Same page is open: run the page's own click handler for that notification.
            web.evaluateJavascript("window.__salamonNotificationClick&&window.__salamonNotificationClick("
                    + jsString(tag) + ")", null);
        }
    }

    /** A notification or a smti.uk/salamon link asked for a specific page. */
    private String startUrl(Intent intent) {
        if (intent == null) return null;
        String u = intent.getStringExtra(Notifier.EXTRA_URL);
        if (u == null && Intent.ACTION_VIEW.equals(intent.getAction()) && intent.getData() != null) {
            u = intent.getData().toString();
        }
        return u != null && isInternal(Uri.parse(u)) ? u : null;
    }

    @Override
    protected void onResume() {
        super.onResume();
        foreground = true;
    }

    @Override
    protected void onPause() {
        super.onPause();
        foreground = false;
        CookieManager.getInstance().flush();
        // The WebView is deliberately NOT paused, so the site keeps checking for new
        // messages and can notify while the app is in the background.
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onDestroy() {
        if (current == this) current = null;
        web.destroy();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (errorView.getVisibility() == View.VISIBLE) {
            errorView.setVisibility(View.GONE);
        }
        if (web.canGoBack()) {
            web.goBack();
        } else {
            // Keep running in the background (for notifications) instead of closing.
            moveTaskToBack(true);
        }
    }

    // ------------------------------------------------------------------ UI

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void buildUi() {
        FrameLayout root = new FrameLayout(this);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportMultipleWindows(false);
        s.setUserAgentString(s.getUserAgentString() + " SalamonApp/" + BuildConfig.VERSION_NAME);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.addJavascriptInterface(new Bridge(), "SalamonNative");
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(web, bridgeJs, Collections.singleton("https://" + HOST));
            documentStartScript = true;
        }

        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        web.setDownloadListener(this::onDownload);
        root.addView(web, match());

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setVisibility(View.GONE);
        root.addView(progress, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3), Gravity.TOP));

        errorView = new LinearLayout(this);
        errorView.setOrientation(LinearLayout.VERTICAL);
        errorView.setGravity(Gravity.CENTER);
        errorView.setPadding(dp(24), dp(24), dp(24), dp(24));
        errorView.setBackgroundColor(getColor(R.color.bg));
        TextView t = new TextView(this);
        t.setText("אין חיבור לאינטרנט.\nבדקו את החיבור ונסו שוב.");
        t.setTextSize(18);
        t.setTextColor(Color.parseColor("#1B2430"));
        t.setGravity(Gravity.CENTER);
        errorView.addView(t);
        Button retry = new Button(this);
        retry.setText("נסו שוב");
        retry.setOnClickListener(v -> {
            errorView.setVisibility(View.GONE);
            web.reload();
        });
        errorView.addView(retry);
        errorView.setVisibility(View.GONE);
        root.addView(errorView, match());

        setContentView(root);
    }

    // ------------------------------------------------------------------ JS bridge

    private class Bridge {
        @JavascriptInterface
        public void notify(String title, String body, String tag) {
            Notifier.show(MainActivity.this, title, body, tag, null);
        }

        @JavascriptInterface
        public void cancel(String tag) {
            Notifier.cancel(MainActivity.this, tag);
        }

        @JavascriptInterface
        public String permission() {
            if (Notifier.allowed(MainActivity.this)) return "granted";
            if (Build.VERSION.SDK_INT >= 33 && getSharedPreferences("app", MODE_PRIVATE).getBoolean("notify_denied", false)
                    && !shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
                return "denied";
            }
            return Build.VERSION.SDK_INT >= 33 ? "default" : "denied";
        }

        @JavascriptInterface
        public void requestPermission(int id) {
            runOnUiThread(() -> {
                if (Notifier.allowed(MainActivity.this) || Build.VERSION.SDK_INT < 33) {
                    if (!Notifier.allowed(MainActivity.this)) openNotificationSettings();
                    resolveNotify(id);
                    return;
                }
                pendingNotifyId = id;
                requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFY);
            });
        }

        @JavascriptInterface
        public String pushToken() {
            return pushToken;
        }

        @JavascriptInterface
        public String version() {
            return BuildConfig.VERSION_NAME;
        }
    }

    private void resolveNotify(int id) {
        String p = Notifier.allowed(this) ? "granted" : "denied";
        web.evaluateJavascript("window.__salamonPermission&&window.__salamonPermission(" + id + ",'" + p + "')", null);
    }

    private void openNotificationSettings() {
        try {
            Intent i = new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, getPackageName());
            startActivity(i);
        } catch (Exception ignored) {
        }
    }

    // ------------------------------------------------------------------ navigation

    private static boolean isInternal(Uri u) {
        String scheme = u.getScheme();
        return HOST.equalsIgnoreCase(u.getHost()) && ("https".equals(scheme) || "http".equals(scheme))
                && u.getPath() != null && u.getPath().startsWith("/salamon");
    }

    /** Pages outside Salamon (Google sign-in, external links) open in the phone's browser. */
    private boolean openOutside(Uri u) {
        if (isInternal(u)) return false;
        String scheme = u.getScheme() == null ? "" : u.getScheme();
        if (scheme.equals("about") || scheme.equals("data") || scheme.equals("blob") || scheme.equals("javascript")) {
            return false;
        }
        try {
            Intent i = scheme.equals("intent")
                    ? Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME)
                    : new Intent(Intent.ACTION_VIEW, u);
            i.addCategory(Intent.CATEGORY_BROWSABLE);
            i.setComponent(null);
            i.setSelector(null);
            startActivity(i);
        } catch (ActivityNotFoundException | java.net.URISyntaxException e) {
            Toast.makeText(this, "לא נמצאה אפליקציה לפתיחת הקישור", Toast.LENGTH_SHORT).show();
        }
        return true;
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            if (!request.isForMainFrame()) return false;
            return openOutside(request.getUrl());
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            progress.setVisibility(View.VISIBLE);
            // Older WebViews without document-start scripts: inject as early as we can.
            if (!documentStartScript && isInternal(Uri.parse(url))) view.evaluateJavascript(bridgeJs, null);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            progress.setVisibility(View.GONE);
            if (!documentStartScript && isInternal(Uri.parse(url))) view.evaluateJavascript(bridgeJs, null);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                errorView.setVisibility(View.VISIBLE);
                progress.setVisibility(View.GONE);
            }
        }
    }

    private class Chrome extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int p) {
            progress.setProgress(p);
            if (p >= 100) progress.setVisibility(View.GONE);
        }

        /** The page asked for the microphone (recording a voice message). */
        @Override
        public void onPermissionRequest(PermissionRequest request) {
            runOnUiThread(() -> {
                boolean wantsAudio = false;
                for (String r : request.getResources()) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) wantsAudio = true;
                }
                if (!wantsAudio || !HOST.equalsIgnoreCase(request.getOrigin().getHost())) {
                    request.deny();
                    return;
                }
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                } else {
                    if (pendingMic != null) pendingMic.deny();
                    pendingMic = request;
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
                }
            });
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            try {
                Intent i = params.createIntent();
                if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }
                startActivityForResult(i, REQ_FILE);
                return true;
            } catch (Exception e) {
                fileCallback = null;
                return false;
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] perms, int[] results) {
        boolean ok = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (requestCode == REQ_MIC && pendingMic != null) {
            if (ok) pendingMic.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            else pendingMic.deny();
            pendingMic = null;
        } else if (requestCode == REQ_NOTIFY) {
            if (!ok) getSharedPreferences("app", MODE_PRIVATE).edit().putBoolean("notify_denied", true).apply();
            resolveNotify(pendingNotifyId);
        } else if (requestCode == REQ_STORAGE && pendingDownload != null) {
            if (ok) enqueue(pendingDownload);
            else Toast.makeText(this, "אין הרשאה לשמור קבצים", Toast.LENGTH_SHORT).show();
            pendingDownload = null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FILE || fileCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int n = data.getClipData().getItemCount();
                result = new Uri[n];
                for (int k = 0; k < n; k++) result[k] = data.getClipData().getItemAt(k).getUri();
            } else if (data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
        }
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    // ------------------------------------------------------------------ downloads

    private void onDownload(String url, String userAgent, String disposition, String mime, long length) {
        if (!url.startsWith("http")) {
            Toast.makeText(this, "לא ניתן להוריד קובץ זה", Toast.LENGTH_SHORT).show();
            return;
        }
        String name = URLUtil.guessFileName(url, disposition, mime);
        DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
        String cookies = CookieManager.getInstance().getCookie(url);
        if (cookies != null) r.addRequestHeader("Cookie", cookies);
        r.addRequestHeader("User-Agent", userAgent);
        r.setTitle(name);
        r.setMimeType(mime);
        r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
        if (Build.VERSION.SDK_INT <= 28
                && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            pendingDownload = r;
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_STORAGE);
            return;
        }
        enqueue(r);
    }

    private void enqueue(DownloadManager.Request r) {
        try {
            ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(r);
            Toast.makeText(this, "מוריד…", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "ההורדה נכשלה", Toast.LENGTH_SHORT).show();
        }
    }

    // ------------------------------------------------------------------ utils

    private String readAsset(String name) {
        try (InputStream in = getAssets().open(name)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        } catch (Exception e) {
            return "";
        }
    }

    private static String jsString(String s) {
        return "'" + s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n") + "'";
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    private static FrameLayout.LayoutParams match() {
        return new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
    }
}
