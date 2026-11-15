package uk.smti.salamon;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONObject;

/** Sign in once; the app stays connected permanently. */
public class LoginActivity extends Activity {

    private static final String WEB_LOGIN = "https://smti.uk/salamon/app/login";

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Ui.init(this);
        getWindow().setStatusBarColor(Ui.BG);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Ui.BG);
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER_HORIZONTAL);
        int p = Ui.dp(this, 24);
        col.setPadding(p, Ui.dp(this, 48), p, p);
        scroll.addView(col);

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        logo.setElevation(Ui.dp(this, 6));
        col.addView(logo, new LinearLayout.LayoutParams(Ui.dp(this, 96), Ui.dp(this, 96)));

        TextView t = Ui.text(this, "ברוכים הבאים", 26, Ui.TEXT, 700);
        t.setGravity(Gravity.CENTER);
        col.addView(t, Ui.wide(this, 18, 4));
        TextView s = Ui.muted(this, "נכנסים פעם אחת, ונשארים מחוברים.\nאותם פרטים כמו באתר עכשיו סלומון.");
        s.setGravity(Gravity.CENTER);
        s.setTextSize(15);
        col.addView(s, Ui.wide(this, 0, 22));

        LinearLayout card = Ui.card(this);
        card.setPadding(Ui.dp(this, 18), Ui.dp(this, 20), Ui.dp(this, 18), Ui.dp(this, 20));
        col.addView(card, Ui.wide());

        card.addView(Ui.text(this, "טלפון או אימייל", 14, Ui.TEXT2, 500));
        EditText id = Ui.input(this, "050-0000000", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        id.setTextDirection(View.TEXT_DIRECTION_LTR);
        card.addView(id, Ui.wide(this, 6, 14));
        card.addView(Ui.text(this, "סיסמה", 14, Ui.TEXT2, 500));
        EditText pw = Ui.input(this, "", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        pw.setTextDirection(View.TEXT_DIRECTION_LTR);
        card.addView(pw, Ui.wide(this, 6, 6));

        TextView err = Ui.text(this, "", 14, Ui.BAD, 500);
        err.setVisibility(View.GONE);
        card.addView(err, Ui.wide(this, 8, 0));

        Button go = Ui.button(this, "כניסה", true);
        card.addView(go, Ui.wide(this, 16, 0));

        // Google / an existing website session: done in the browser, then back to the app
        TextView or = Ui.text(this, "או", 14, Ui.TEXT3, 500);
        or.setGravity(Gravity.CENTER);
        col.addView(or, Ui.wide(this, 18, 8));
        Button google = Ui.button(this, "  כניסה עם Google", false);
        android.graphics.drawable.Drawable gd = getDrawable(R.drawable.ic_google).mutate();
        gd.setTint(Ui.c("#4285F4"));
        gd.setBounds(0, 0, Ui.dp(this, 20), Ui.dp(this, 20));
        google.setCompoundDrawablesRelative(gd, null, null, null);
        google.setOnClickListener(v -> openWebLogin());
        col.addView(google, Ui.wide());
        Button site = Ui.button(this, "  כניסה עם החשבון שמחובר באתר", false);
        android.graphics.drawable.Drawable ld = getDrawable(R.drawable.ic_link).mutate();
        ld.setTint(Ui.TEXT3);
        ld.setBounds(0, 0, Ui.dp(this, 20), Ui.dp(this, 20));
        site.setCompoundDrawablesRelative(ld, null, null, null);
        site.setOnClickListener(v -> openWebLogin());
        col.addView(site, Ui.wide(this, 10, 0));

        TextView forgot = Ui.text(this, "שכחתם סיסמה? אין לכם חשבון? היכנסו לאתר", 14, Ui.ACCENT, 500);
        forgot.setGravity(Gravity.CENTER);
        forgot.setPadding(0, Ui.dp(this, 16), 0, 0);
        forgot.setOnClickListener(v -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://smti.uk/salamon"))));
        col.addView(forgot, Ui.wide());

        go.setOnClickListener(v -> {
            err.setVisibility(View.GONE);
            String ident = id.getText().toString().trim().replace("-", "").replace(" ", "");
            if (ident.contains("@")) ident = id.getText().toString().trim();
            if (ident.isEmpty() || pw.getText().length() == 0) {
                err.setText("נא למלא טלפון או אימייל וסיסמה");
                err.setVisibility(View.VISIBLE);
                return;
            }
            go.setEnabled(false);
            go.setText("מתחבר…");
            JSONObject body = new JSONObject();
            try {
                body.put("identifier", ident);
                body.put("password", pw.getText().toString());
                body.put("device", Sync.device());
            } catch (Exception ignored) {
            }
            Api.post("/app/login", body, r -> {
                go.setEnabled(true);
                go.setText("כניסה");
                if (!r.ok) {
                    err.setText(r.error);
                    err.setVisibility(View.VISIBLE);
                    return;
                }
                Store.setSession(r.data.optString("token"), r.data.optJSONObject("user"));
                App.lockPending = false;
                startActivity(new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK));
                finish();
            });
        });
        setContentView(scroll);
        handleLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleLink(intent);
    }

    private void openWebLogin() {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(WEB_LOGIN)));
        } catch (Exception e) {
            android.widget.Toast.makeText(this, "לא נמצא דפדפן בטלפון", android.widget.Toast.LENGTH_LONG).show();
        }
    }

    /** salamon://login?token=… — coming back from the browser after signing in. */
    private void handleLink(Intent intent) {
        Uri u = intent == null ? null : intent.getData();
        if (u == null || !"salamon".equals(u.getScheme())) return;
        String token = u.getQueryParameter("token");
        if (token == null || token.isEmpty()) return;
        Store.setSession(token, new JSONObject());
        Sync.heartbeat(this, true, r -> {
            if (!r.ok) {
                Store.clearSession();
                android.widget.Toast.makeText(this, r.error == null ? "הכניסה נכשלה" : r.error, android.widget.Toast.LENGTH_LONG).show();
                return;
            }
            App.lockPending = false;
            startActivity(new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK));
            finish();
        });
    }
}
