package uk.smti.salamon;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** When the control center sets the app to "open the website". */
public class WebActivity extends Activity {

    public static final String EXTRA_URL = "url";
    public static final String EXTRA_ADMIN = "admin";
    public static final String EXTRA_PHONE = "phone";
    private boolean admin;

    /** The control center inside the app, already signed in with the app's account (managers only). */
    public static void openAdmin(Activity a) {
        openAdmin(a, null);
    }

    /** phone = open that customer's conversation in the support inbox. */
    public static void openAdmin(Activity a, String phone) {
        if (!Sync.isAdmin()) {
            android.widget.Toast.makeText(a, "לחשבון הזה אין הרשאות ניהול", android.widget.Toast.LENGTH_SHORT).show();
            return;
        }
        Intent i = new Intent(a, WebActivity.class).putExtra(EXTRA_ADMIN, true).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (phone != null && !phone.isEmpty()) i.putExtra(EXTRA_PHONE, phone.replaceAll("\\D", ""));
        a.startActivity(i);
    }
    private WebView web;
    private PermissionRequest pendingMic;
    private ValueCallback<Uri[]> fileCb;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Ui.init(this);
        getWindow().setStatusBarColor(Ui.BG);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString().replace("; wv)", ")") + " " + Api.userAgent());
        CookieManager.getInstance().setAcceptCookie(true);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("smti.uk".equalsIgnoreCase(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest req) {
                runOnUiThread(() -> {
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        req.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    } else {
                        pendingMic = req;
                        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 1);
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                fileCb = cb;
                try { startActivityForResult(p.createIntent(), 2); return true; } catch (Exception e) { fileCb = null; return false; }
            }
        });
        admin = getIntent().getBooleanExtra(EXTRA_ADMIN, false);
        if (admin) {
            getWindow().setStatusBarColor(Ui.HEADER);
            // the control center signs in from the site account saved in the browser: hand it the app's account
            String token = org.json.JSONObject.quote(Store.token());
            String boot = "<!doctype html><meta charset=utf-8><body style='font-family:sans-serif;text-align:center;padding-top:40vh;color:#667'>"
                    + "פותח את מרכז השליטה…<script>try{localStorage.setItem('userToken'," + token + ");}catch(e){}"
                    + "location.replace('https://smti.uk/salamon/admin" + adminHash(getIntent()) + "');</script>";
            web.loadDataWithBaseURL("https://smti.uk/salamon/", boot, "text/html", "utf-8", null);
        } else {
            String url = getIntent().getStringExtra(EXTRA_URL);
            web.loadUrl(url == null ? "https://smti.uk/salamon" : url);
        }
        setContentView(web);
    }

    private static String adminHash(Intent i) {
        String p = i.getStringExtra(EXTRA_PHONE);
        return p == null || p.isEmpty() ? "" : "#chat/" + p;
    }

    /** Already open: a new notification moves straight to that conversation. */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String hash = adminHash(intent);
        if (admin && !hash.isEmpty() && web != null) web.evaluateJavascript("location.hash='" + hash + "'", null);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        if (code == 1 && pendingMic != null) {
            if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) pendingMic.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            else pendingMic.deny();
            pendingMic = null;
        }
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        if (code == 2 && fileCb != null) {
            fileCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            fileCb = null;
        }
    }

    @Override
    public void onBackPressed() {
        String cur = web.getUrl();
        if (web.canGoBack() && (cur == null || !cur.contains("/salamon/admin"))) web.goBack();
        else if (admin) finish();
        else if (web.canGoBack()) web.goBack();
        else moveTaskToBack(true);
    }
}
