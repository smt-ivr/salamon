package uk.smti.salamon;

import android.Manifest;
import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * The app shell: checks the remote settings (maintenance, required update, website mode, user blocked),
 * asks for the screen lock when required, and shows the tabs with a mini player.
 */
public class MainActivity extends Activity {

    private static final int REQ_LOCK = 11;
    private static final int REQ_NOTIFY = 12;

    private static MainActivity current;
    private static boolean foreground;

    private FrameLayout root;
    private LinearLayout shell;
    private FrameLayout content;
    private LinearLayout tabBar;
    private TextView headerTitle, headerSub, announce;
    private LinearLayout playerBar;
    private TextView playerTitle, playerTime, playerSpeed;
    private ImageView playerBtn;
    private SeekBar playerSeek;

    private final List<Page> pages = new ArrayList<>();
    private final List<String> pageIds = new ArrayList<>();
    private final List<View> tabViews = new ArrayList<>();
    private int currentTab = -1;
    private boolean locked;
    private boolean started;
    private Intent pendingOpen;

    FeedPage feed;
    ChatPage chat;
    GroupsPage groups;
    SettingsPage settings;

    /** Is this screen open right now? (then a push for it is not shown as a notification) */
    public static boolean isShowing(String type, String groupId) {
        MainActivity m = current;
        if (m == null || !foreground || m.currentTab < 0 || m.locked) return false;
        String id = m.pageIds.get(m.currentTab);
        if ("chat".equals(type)) return "chat".equals(id);
        if ("feed".equals(type)) return "feed".equals(id);
        if ("group".equals(type)) return "groups".equals(id) && m.groups != null && m.groups.isOpen(groupId);
        return false;
    }

    // ------------------------------------------------------------------ lifecycle

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        current = this;
        Ui.init(this);
        getWindow().setStatusBarColor(Ui.BG);
        getWindow().setNavigationBarColor(Ui.CARD);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        if (Build.VERSION.SDK_INT >= 23 && !Ui.dark) getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);

        if (!Store.loggedIn()) {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return;
        }
        Api.onSessionLost = this::sessionLost;
        Api.onAppBlocked = () -> showMessage("אין גישה לאפליקציה", "הגישה שלך לאפליקציה נחסמה. לפרטים אפשר לפנות לצוות עכשיו סלומון.", null, null);

        root = new FrameLayout(this);
        root.setBackgroundColor(Ui.BG);
        setContentView(root);
        pendingOpen = getIntent();

        // Start with what we know (works offline), then refresh from the server.
        applyConfig(Store.config(), false);
        Push.getToken(this, t -> Sync.heartbeat(this, true, r -> {
            if (r.ok) applyConfig(r.data.optJSONObject("config"), r.data.optBoolean("blocked"));
            if (settings != null) settings.refresh();
        }));
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (started) openFrom(intent);
        else pendingOpen = intent;
    }

    @Override
    protected void onResume() {
        super.onResume();
        foreground = true;
        checkLock();
        if (started && !locked && currentTab >= 0) pages.get(currentTab).onShow();
    }

    @Override
    protected void onPause() {
        super.onPause();
        foreground = false;
        if (!locked) Store.setLastUnlock(System.currentTimeMillis());
        if (started && currentTab >= 0) pages.get(currentTab).onHide();
    }

    @Override
    protected void onDestroy() {
        if (current == this) current = null;
        Player.listener = null;
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (started && currentTab >= 0 && pages.get(currentTab).onBack()) return;
        if (started && currentTab > 0) {
            selectTab(0);
            return;
        }
        moveTaskToBack(true);
    }

    // ------------------------------------------------------------------ remote settings

    /** Decides what to show from the server's settings. */
    private void applyConfig(JSONObject cfg, boolean blocked) {
        if (cfg == null) cfg = new JSONObject();
        if (blocked) {
            showMessage("אין גישה לאפליקציה", "הגישה שלך לאפליקציה נחסמה. לפרטים אפשר לפנות לצוות עכשיו סלומון.", null, null);
            return;
        }
        if (cfg.optBoolean("maintenance")) {
            showMessage("האפליקציה בתחזוקה", cfg.optString("maintenanceMessage", "נחזור בקרוב."), "נסו שוב", v -> recreate());
            return;
        }
        if (cfg.optBoolean("mustUpdate")) {
            showMessage("צריך לעדכן את האפליקציה", cfg.optString("updateMessage", "יצאה גרסה חדשה. כדי להמשיך יש לעדכן."), "עדכון עכשיו", v -> {
                Button bt = (Button) v;
                bt.setEnabled(false);
                Updater.start(this, (pct, status) -> {
                    bt.setText(status);
                    if (pct < 0) bt.setEnabled(true);
                });
            });
            return;
        }
        if ("web".equals(cfg.optString("mode"))) {
            startActivity(new Intent(this, WebActivity.class).putExtra(WebActivity.EXTRA_URL, cfg.optString("webUrl", "https://smti.uk/salamon")));
            finish();
            return;
        }
        if (!started) buildShell(cfg);
        else updateHeader(cfg);
    }

    private void showMessage(String title, String text, String action, View.OnClickListener onAction) {
        started = false;
        root.removeAllViews();
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER);
        int p = Ui.dp(this, 28);
        col.setPadding(p, p, p, p);
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        col.addView(logo, new LinearLayout.LayoutParams(Ui.dp(this, 84), Ui.dp(this, 84)));
        TextView t = Ui.text(this, title, 22, Ui.TEXT, 700);
        t.setGravity(Gravity.CENTER);
        col.addView(t, Ui.wide(this, 18, 8));
        TextView s = Ui.text(this, text, 16, Ui.TEXT2, 400);
        s.setGravity(Gravity.CENTER);
        col.addView(s, Ui.wide(this, 0, 20));
        if (action != null) {
            Button bt = Ui.button(this, action, true);
            bt.setOnClickListener(onAction);
            col.addView(bt, Ui.wide());
        }
        root.addView(col, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private void sessionLost() {
        Store.clearSession();
        startActivity(new Intent(this, LoginActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK));
        finish();
    }

    // ------------------------------------------------------------------ screen lock

    private boolean lockRequired() {
        JSONObject cfg = Store.config();
        return cfg.optBoolean("requireLock") || Store.lockByUser();
    }

    private void checkLock() {
        if (!Store.loggedIn() || !lockRequired()) {
            locked = false;
            return;
        }
        long after = Math.max(0, Store.config().optInt("lockAfterMinutes", 5)) * 60_000L;
        if (System.currentTimeMillis() - Store.lastUnlock() < Math.max(after, 3000)) return;
        KeyguardManager km = getSystemService(KeyguardManager.class);
        if (km == null || !km.isDeviceSecure()) {
            // no lock on the phone: nothing to ask for
            locked = false;
            return;
        }
        Intent i = km.createConfirmDeviceCredentialIntent("עכשיו סלומון", "אישור כניסה לאפליקציה");
        if (i == null) return;
        locked = true;
        if (shell != null) shell.setVisibility(View.INVISIBLE);
        startActivityForResult(i, REQ_LOCK);
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code == REQ_LOCK) {
            if (result == RESULT_OK) {
                locked = false;
                Store.setLastUnlock(System.currentTimeMillis());
                if (shell != null) shell.setVisibility(View.VISIBLE);
                if (started && currentTab >= 0) pages.get(currentTab).onShow();
            } else {
                moveTaskToBack(true);
            }
        }
        if (feed != null) feed.onActivityResult(code, result, data);
    }

    // ------------------------------------------------------------------ shell

    private void buildShell(JSONObject cfg) {
        started = true;
        root.removeAllViews();
        shell = new LinearLayout(this);
        shell.setOrientation(LinearLayout.VERTICAL);
        root.addView(shell, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        if (locked) shell.setVisibility(View.INVISIBLE);

        // header
        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(Ui.dp(this, 18), Ui.dp(this, 14), Ui.dp(this, 18), Ui.dp(this, 10));
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        header.addView(logo, new LinearLayout.LayoutParams(Ui.dp(this, 40), Ui.dp(this, 40)));
        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        titles.setPadding(Ui.dp(this, 12), 0, Ui.dp(this, 12), 0);
        headerTitle = Ui.text(this, "עכשיו סלומון", 20, Ui.TEXT, 700);
        headerSub = Ui.oneLine(Ui.muted(this, ""));
        titles.addView(headerTitle);
        titles.addView(headerSub);
        header.addView(titles, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        shell.addView(header);

        announce = Ui.text(this, "", 14, Ui.INFO, 500);
        announce.setPadding(Ui.dp(this, 14), Ui.dp(this, 10), Ui.dp(this, 14), Ui.dp(this, 10));
        announce.setBackground(Ui.round(Ui.INFO_SOFT, Ui.dp(this, 14)));
        LinearLayout.LayoutParams alp = Ui.wide();
        alp.setMargins(Ui.dp(this, 16), 0, Ui.dp(this, 16), Ui.dp(this, 8));
        shell.addView(announce, alp);

        content = new FrameLayout(this);
        shell.addView(content, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        buildPlayerBar();
        shell.addView(playerBar);

        tabBar = new LinearLayout(this);
        tabBar.setBackgroundColor(Ui.CARD);
        tabBar.setElevation(Ui.dp(this, 8));
        tabBar.setPadding(Ui.dp(this, 6), Ui.dp(this, 6), Ui.dp(this, 6), Ui.dp(this, 6));
        shell.addView(tabBar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, Ui.dp(this, 66)));

        JSONObject f = cfg.optJSONObject("features");
        if (f == null) f = new JSONObject();
        if (f.optBoolean("feed", true)) addTab("feed", "הודעות", R.drawable.ic_feed, feed = new FeedPage(this));
        if (f.optBoolean("chat", true)) addTab("chat", "צ׳אט", R.drawable.ic_chat, chat = new ChatPage(this));
        if (f.optBoolean("groups", true)) addTab("groups", "קבוצות", R.drawable.ic_groups, groups = new GroupsPage(this));
        addTab("settings", "הגדרות", R.drawable.ic_settings, settings = new SettingsPage(this));

        updateHeader(cfg);
        selectTab(0);
        askNotificationPermission();
        if (pendingOpen != null) {
            openFrom(pendingOpen);
            pendingOpen = null;
        }
    }

    private void updateHeader(JSONObject cfg) {
        JSONObject u = Store.user();
        String name = u.optString("name", "");
        headerSub.setText(name.isEmpty() || "לא מזוהה".equals(name) ? u.optString("phone", "") : "שלום, " + name);
        String text = cfg.optString("announcement", "");
        if (cfg.optBoolean("shouldUpdate")) text = (text.isEmpty() ? "" : text + "\n") + "יש גרסה חדשה לאפליקציה. אפשר לעדכן בהגדרות.";
        announce.setText(text);
        announce.setVisibility(text.isEmpty() ? View.GONE : View.VISIBLE);
    }

    private void addTab(String id, String label, int icon, Page page) {
        int index = pages.size();
        pages.add(page);
        pageIds.add(id);
        LinearLayout t = new LinearLayout(this);
        t.setOrientation(LinearLayout.VERTICAL);
        t.setGravity(Gravity.CENTER);
        t.setBackground(Ui.ripple(null));
        ImageView ic = new ImageView(this);
        ic.setImageResource(icon);
        FrameLayout pill = new FrameLayout(this);
        pill.addView(ic, new FrameLayout.LayoutParams(Ui.dp(this, 22), Ui.dp(this, 22), Gravity.CENTER));
        TextView badge = Ui.chip(this, "", Color.WHITE, Ui.BAD);
        badge.setTextSize(10);
        badge.setVisibility(View.GONE);
        badge.setTag("badge");
        pill.addView(badge, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP | Gravity.END));
        t.addView(pill, new LinearLayout.LayoutParams(Ui.dp(this, 58), Ui.dp(this, 30)));
        TextView l = Ui.text(this, label, 12, Ui.TEXT3, 500);
        l.setGravity(Gravity.CENTER);
        t.addView(l);
        t.setOnClickListener(v -> selectTab(index));
        tabBar.addView(t, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1));
        tabViews.add(t);
    }

    public void selectTab(int index) {
        if (index < 0 || index >= pages.size()) return;
        if (currentTab == index) return;
        if (currentTab >= 0) pages.get(currentTab).onHide();
        currentTab = index;
        content.removeAllViews();
        content.addView(pages.get(index).view(), new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        for (int i = 0; i < tabViews.size(); i++) {
            LinearLayout t = (LinearLayout) tabViews.get(i);
            FrameLayout pill = (FrameLayout) t.getChildAt(0);
            ImageView ic = (ImageView) pill.getChildAt(0);
            TextView l = (TextView) t.getChildAt(1);
            boolean on = i == index;
            pill.setBackground(on ? Ui.round(Ui.ACCENT_SOFT, Ui.dp(this, 16)) : null);
            ic.setColorFilter(on ? Ui.ACCENT : Ui.TEXT3, PorterDuff.Mode.SRC_IN);
            l.setTextColor(on ? Ui.ACCENT : Ui.TEXT3);
            l.setTypeface(Ui.font(on ? 700 : 500));
        }
        if (!locked) pages.get(index).onShow();
    }

    public void selectTab(String id) {
        selectTab(pageIds.indexOf(id));
    }

    /** Small red number on a tab (0 hides it). */
    public void setBadge(String id, int n) {
        int i = pageIds.indexOf(id);
        if (i < 0) return;
        TextView badge = tabViews.get(i).findViewWithTag("badge");
        badge.setText(n > 99 ? "99+" : String.valueOf(n));
        badge.setVisibility(n > 0 ? View.VISIBLE : View.GONE);
    }

    /** From a notification: open the right tab (and group / message). */
    private void openFrom(Intent intent) {
        if (intent == null) return;
        String type = intent.getStringExtra(Notifier.EXTRA_TYPE);
        if (type == null) return;
        switch (type) {
            case "feed":
                selectTab("feed");
                break;
            case "chat":
                selectTab("chat");
                break;
            case "group":
                selectTab("groups");
                String g = intent.getStringExtra(Notifier.EXTRA_GROUP);
                if (groups != null && g != null) groups.openGroup(g, null);
                break;
            default:
                break;
        }
        intent.removeExtra(Notifier.EXTRA_TYPE);
    }

    private void askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFY);
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (feed != null) feed.onPermission(code, res);
        if (settings != null) settings.refresh();
    }

    // ------------------------------------------------------------------ mini player

    private void buildPlayerBar() {
        playerBar = new LinearLayout(this);
        playerBar.setOrientation(LinearLayout.VERTICAL);
        playerBar.setBackground(Ui.round(Ui.dark ? Ui.c("#17223a") : Ui.NAVY, Ui.dp(this, 18)));
        playerBar.setPadding(Ui.dp(this, 14), Ui.dp(this, 10), Ui.dp(this, 14), Ui.dp(this, 6));
        playerBar.setElevation(Ui.dp(this, 6));
        LinearLayout.LayoutParams lp = Ui.wide();
        lp.setMargins(Ui.dp(this, 12), Ui.dp(this, 6), Ui.dp(this, 12), Ui.dp(this, 8));
        playerBar.setLayoutParams(lp);

        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        playerBtn = new ImageView(this);
        playerBtn.setImageResource(R.drawable.ic_play);
        playerBtn.setColorFilter(Ui.NAVY, PorterDuff.Mode.SRC_IN);
        playerBtn.setBackground(Ui.circle(Color.WHITE));
        int pp = Ui.dp(this, 8);
        playerBtn.setPadding(pp, pp, pp, pp);
        playerBtn.setOnClickListener(v -> Player.toggle());
        row.addView(playerBtn, new LinearLayout.LayoutParams(Ui.dp(this, 42), Ui.dp(this, 42)));

        LinearLayout texts = new LinearLayout(this);
        texts.setOrientation(LinearLayout.VERTICAL);
        texts.setPadding(Ui.dp(this, 12), 0, Ui.dp(this, 8), 0);
        playerTitle = Ui.oneLine(Ui.text(this, "", 15, Color.WHITE, 700));
        playerTime = Ui.text(this, "", 12.5f, Ui.c("#B9C6DE"), 400);
        texts.addView(playerTitle);
        texts.addView(playerTime);
        row.addView(texts, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));

        ImageView back10 = iconBtn(R.drawable.ic_replay10, v -> Player.seekBy(-10000));
        ImageView fwd10 = iconBtn(R.drawable.ic_forward10, v -> Player.seekBy(10000));
        playerSpeed = Ui.text(this, "1×", 13, Color.WHITE, 700);
        playerSpeed.setGravity(Gravity.CENTER);
        playerSpeed.setBackground(Ui.round(0x33FFFFFF, Ui.dp(this, 10)));
        playerSpeed.setOnClickListener(v -> Player.cycleSpeed());
        ImageView close = iconBtn(R.drawable.ic_close, v -> Player.stop());
        row.addView(back10);
        row.addView(fwd10);
        row.addView(playerSpeed, new LinearLayout.LayoutParams(Ui.dp(this, 44), Ui.dp(this, 30)));
        row.addView(close);
        playerBar.addView(row);

        playerSeek = new SeekBar(this);
        playerSeek.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        playerSeek.getProgressDrawable().setColorFilter(Color.WHITE, PorterDuff.Mode.SRC_IN);
        playerSeek.getThumb().setColorFilter(Color.WHITE, PorterDuff.Mode.SRC_IN);
        playerSeek.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar s, int p, boolean user) {
                if (user) Player.seekTo(p);
            }

            public void onStartTrackingTouch(SeekBar s) {
            }

            public void onStopTrackingTouch(SeekBar s) {
            }
        });
        playerBar.addView(playerSeek);
        playerBar.setVisibility(View.GONE);
        Player.listener = this::updatePlayer;
    }

    private ImageView iconBtn(int icon, View.OnClickListener l) {
        ImageView b = new ImageView(this);
        b.setImageResource(icon);
        b.setColorFilter(Color.WHITE, PorterDuff.Mode.SRC_IN);
        int p = Ui.dp(this, 7);
        b.setPadding(p, p, p, p);
        b.setBackground(Ui.ripple(null));
        b.setOnClickListener(l);
        b.setLayoutParams(new LinearLayout.LayoutParams(Ui.dp(this, 38), Ui.dp(this, 38)));
        return b;
    }

    private void updatePlayer() {
        if (playerBar == null) return;
        playerBar.setVisibility(Player.active() ? View.VISIBLE : View.GONE);
        if (!Player.active()) {
            if (feed != null) feed.playerChanged();
            return;
        }
        playerTitle.setText(Player.title);
        int d = Player.duration(), p = Player.position();
        playerTime.setText(Player.preparing ? "טוען…" : Fmt.clock(p) + " / " + Fmt.clock(d));
        playerBtn.setImageResource(Player.isPlaying() ? R.drawable.ic_pause : R.drawable.ic_play);
        playerSeek.setMax(Math.max(1, d));
        playerSeek.setProgress(p);
        float s = Store.speed();
        playerSpeed.setText((s == (int) s ? String.valueOf((int) s) : String.valueOf(s)) + "×");
        if (feed != null) feed.playerChanged();
    }
}
