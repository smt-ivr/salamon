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
        String url = getIntent().getStringExtra(EXTRA_URL);
        web.loadUrl(url == null ? "https://smti.uk/salamon" : url);
        setContentView(web);
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
        if (web.canGoBack()) web.goBack();
        else moveTaskToBack(true);
    }
}
