package uk.smti.salamon;

import android.Manifest;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.graphics.drawable.GradientDrawable;
import android.media.MediaPlayer;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The main screen, like the classic website: one WhatsApp-style conversation with all the voice
 * messages (each bubble has its own player), and the record / attach bar at the bottom.
 * After sending, "send a tzintuk now" is offered for 90 seconds, as on the site.
 */
public class MainActivity extends BaseActivity {

    private static final int REQ_MIC = 21;
    private static final int REQ_NOTIFY = 22;
    private static final int REQ_FILE = 23;
    private static final int PAGE = 40;

    private static MainActivity current;
    private static boolean foreground;

    private FrameLayout root;
    private TextView stats, chatBadge;
    private ImageView announceBtn, groupsBtn;
    private ScrollView scroll;
    private LinearLayout list;
    private LinearLayout bottom;
    private final Handler h = new Handler(Looper.getMainLooper());

    // messages
    private final List<JSONObject> items = new ArrayList<>();
    private String renderedHash = "";
    private int page = 1;
    private boolean loading, noMore;
    private Button moreBtn;

    /** Controls of each bubble's player, by file id. */
    private static final class Controls {
        ImageView btn;
        SeekBar seek;
        TextView cur;
        boolean outgoing;
    }

    private final Map<String, Controls> controls = new HashMap<>();
    private final Runnable auto = () -> {
        refresh(true);
        loadStatsHeader();
        loadUnread();
        scheduleAuto();
    };

    /** A push of this type would be on screen now → don't show it as a notification. */
    public static boolean isShowing(String type, String groupId) {
        if ("feed".equals(type)) return current != null && foreground;
        return PageActivity.isShowing(type, groupId);
    }

    // ------------------------------------------------------------------ lifecycle

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        current = this;
        if (!Store.loggedIn()) {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return;
        }
        Api.onSessionLost = this::sessionLost;
        Api.onAppBlocked = () -> showGate("אין גישה לאפליקציה", "הגישה שלך לאפליקציה נחסמה. לפרטים אפשר לפנות לצוות עכשיו סלומון.", null, null);
        root = new FrameLayout(this);
        root.setBackgroundColor(Ui.CHAT_BG);
        setContentView(root);

        applyConfig(Store.config(), false);
        Push.getToken(this, t -> Sync.heartbeat(this, true, r -> {
            if (r.ok) applyConfig(r.data.optJSONObject("config"), r.data.optBoolean("blocked"));
        }));
        openFrom(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        openFrom(intent);
    }

    @Override
    protected void onResume() {
        super.onResume();
        foreground = true;
        if (list != null) {
            refresh(!items.isEmpty());
            loadStatsHeader();
            loadUnread();
            scheduleAuto();
            Notifier.cancel(this, "salamon-feed");
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        foreground = false;
        h.removeCallbacks(auto);
    }

    @Override
    protected void onDestroy() {
        if (current == this) current = null;
        if (Player.listener == playerListener) Player.listener = null;
        stopPreview();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (recState != RecState.IDLE) {
            cancelRecording();
            return;
        }
        moveTaskToBack(true);
    }

    private void scheduleAuto() {
        h.removeCallbacks(auto);
        h.postDelayed(auto, 20_000);
    }

    private void sessionLost() {
        Store.clearSession();
        startActivity(new Intent(this, LoginActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK));
        finish();
    }

    /** From a notification: open the right screen. */
    private void openFrom(Intent intent) {
        if (intent == null) return;
        String type = intent.getStringExtra(Notifier.EXTRA_TYPE);
        if (type == null) return;
        intent.removeExtra(Notifier.EXTRA_TYPE);
        if ("chat".equals(type)) PageActivity.open(this, "chat");
        else if ("group".equals(type)) {
            Intent i = new Intent(this, PageActivity.class).putExtra(PageActivity.EXTRA_PAGE, "groups");
            String g = intent.getStringExtra(Notifier.EXTRA_GROUP);
            if (g != null) i.putExtra(PageActivity.EXTRA_GROUP, g);
            startActivity(i);
        }
    }

    // ------------------------------------------------------------------ remote settings

    private boolean built;

    private void applyConfig(JSONObject cfg, boolean blocked) {
        if (cfg == null) cfg = new JSONObject();
        if (blocked) {
            showGate("אין גישה לאפליקציה", "הגישה שלך לאפליקציה נחסמה. לפרטים אפשר לפנות לצוות עכשיו סלומון.", null, null);
            return;
        }
        if (cfg.optBoolean("maintenance")) {
            showGate("האפליקציה בתחזוקה", cfg.optString("maintenanceMessage", "נחזור בקרוב."), "נסו שוב", v -> recreate());
            return;
        }
        if (cfg.optBoolean("mustUpdate")) {
            showGate("צריך לעדכן את האפליקציה", cfg.optString("updateMessage", "יצאה גרסה חדשה. כדי להמשיך יש לעדכן."), "עדכון עכשיו", v -> Updater.showDialog(this));
            return;
        }
        if ("web".equals(cfg.optString("mode"))) {
            startActivity(new Intent(this, WebActivity.class).putExtra(WebActivity.EXTRA_URL, cfg.optString("webUrl", "https://smti.uk/salamon")));
            finish();
            return;
        }
        if (!built) build();
        updateHeader(cfg);
        offerUpdate(cfg);
    }

    /** A newer version is published: ask once per version, like normal apps. */
    private void offerUpdate(JSONObject cfg) {
        int latest = cfg.optInt("latestVersionCode");
        if (!cfg.optBoolean("shouldUpdate") || latest <= BuildConfig.VERSION_CODE) return;
        if (Store.mark("offered_update") >= latest) return;
        Store.setMark("offered_update", latest);
        new AlertDialog.Builder(this)
                .setTitle("גרסה חדשה זמינה")
                .setMessage("יצאה גרסה " + cfg.optString("latestVersionName", "") + " של האפליקציה. לעדכן עכשיו?")
                .setPositiveButton("עדכון", (d, w) -> Updater.showDialog(this))
                .setNegativeButton("אחר כך", null)
                .show();
    }

    private void showGate(String title, String text, String action, View.OnClickListener onAction) {
        built = false;
        root.removeAllViews();
        root.setBackgroundColor(Ui.BG);
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

    // ------------------------------------------------------------------ layout

    private void build() {
        built = true;
        root.removeAllViews();
        root.setBackgroundColor(Ui.CHAT_BG);
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        root.addView(col, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // header (like .chat-header-fixed)
        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setBackgroundColor(Ui.HEADER);
        header.setElevation(Ui.dp(this, 2));
        header.setPadding(Ui.dp(this, 12), Ui.dp(this, 8), Ui.dp(this, 6), Ui.dp(this, 8));
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        header.addView(logo, new LinearLayout.LayoutParams(Ui.dp(this, 42), Ui.dp(this, 42)));
        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        titles.setPadding(Ui.dp(this, 10), 0, Ui.dp(this, 4), 0);
        titles.addView(Ui.text(this, "עכשיו סלומון", 17, Ui.TEXT, 700));
        stats = Ui.oneLine(Ui.text(this, "טוען משתתפים…", 12.5f, Ui.TEXT3, 400));
        titles.addView(stats);
        header.addView(titles, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));

        announceBtn = headerIcon(R.drawable.ic_megaphone, "מודעה", v -> showAnnouncement());
        announceBtn.setVisibility(View.GONE);
        header.addView(announceBtn);
        groupsBtn = headerIcon(R.drawable.ic_groups, "קבוצות", v -> PageActivity.open(this, "groups"));
        header.addView(groupsBtn);
        FrameLayout chatWrap = new FrameLayout(this);
        chatWrap.addView(headerIcon(R.drawable.ic_headset, "צ׳אט עם ההנהלה", v -> PageActivity.open(this, "chat")));
        chatBadge = Ui.chip(this, "", Color.WHITE, Ui.BAD);
        chatBadge.setTextSize(10);
        chatBadge.setVisibility(View.GONE);
        chatWrap.addView(chatBadge, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP | Gravity.END));
        header.addView(chatWrap);
        header.addView(headerIcon(R.drawable.ic_more, "תפריט", this::showMenu));
        col.addView(header, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        // messages (like #messages-container)
        scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setPadding(Ui.dp(this, 10), Ui.dp(this, 10), Ui.dp(this, 10), Ui.dp(this, 10));
        scroll.addView(list);
        col.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        showLoading("טוען הודעות…");

        // bottom bar (like #chat-upload-area)
        bottom = new LinearLayout(this);
        bottom.setOrientation(LinearLayout.VERTICAL);
        bottom.setBackgroundColor(Ui.HEADER);
        col.addView(bottom, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        renderBottom();

        Player.listener = playerListener;
        askNotificationPermission();
        refresh(false);
        loadStatsHeader();
        loadUnread();
        scheduleAuto();
    }

    private ImageView headerIcon(int icon, String label, View.OnClickListener l) {
        ImageView b = new ImageView(this);
        b.setImageResource(icon);
        b.setColorFilter(Ui.TEXT3, PorterDuff.Mode.SRC_IN);
        int p = Ui.dp(this, 10);
        b.setPadding(p, p, p, p);
        b.setBackground(Ui.ripple(null));
        b.setContentDescription(label);
        b.setOnClickListener(l);
        b.setLayoutParams(new LinearLayout.LayoutParams(Ui.dp(this, 44), Ui.dp(this, 44)));
        return b;
    }

    private void updateHeader(JSONObject cfg) {
        if (!built) return;
        JSONObject f = cfg.optJSONObject("features");
        groupsBtn.setVisibility(f == null || f.optBoolean("groups", true) ? View.VISIBLE : View.GONE);
        announceBtn.setVisibility(cfg.optString("announcement", "").isEmpty() ? View.GONE : View.VISIBLE);
    }

    private void showAnnouncement() {
        String text = Store.config().optString("announcement", "");
        if (text.isEmpty()) return;
        new AlertDialog.Builder(this).setTitle("מודעה").setMessage(text).setPositiveButton("סגירה", null).show();
    }

    private void showMenu(View anchor) {
        PopupMenu m = new PopupMenu(this, anchor);
        m.getMenu().add(0, 1, 0, "הגדרות");
        m.getMenu().add(0, 2, 1, "רענון");
        if (Store.config().optBoolean("shouldUpdate")) m.getMenu().add(0, 3, 2, "עדכון האפליקציה");
        m.setOnMenuItemClickListener(it -> {
            if (it.getItemId() == 1) PageActivity.open(this, "settings");
            else if (it.getItemId() == 2) {
                refresh(false);
                loadStatsHeader();
            } else if (it.getItemId() == 3) Updater.showDialog(this);
            return true;
        });
        m.show();
    }

    private void askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFY);
        }
    }

    // ------------------------------------------------------------------ header data

    private void loadStatsHeader() {
        Api.post("/stats/members", new JSONObject(), r -> {
            if (stats == null) return;
            JSONObject s = r.data.optJSONObject("stats");
            if (r.ok && s != null) {
                stats.setText("סה״כ " + s.optInt("total") + " משתתפים  |  📞 " + s.optInt("active") + "  🚫 " + s.optInt("blocked"));
            } else if (stats.getText().toString().startsWith("טוען")) {
                stats.setText("");
            }
        });
    }

    private void loadUnread() {
        Api.post("/chat/unread", new JSONObject(), r -> {
            if (chatBadge == null || !r.ok) return;
            int n = r.data.optInt("unreadCount");
            chatBadge.setText(n > 99 ? "99+" : String.valueOf(n));
            chatBadge.setVisibility(n > 0 ? View.VISIBLE : View.GONE);
        });
    }

    // ------------------------------------------------------------------ messages

    private void showLoading(String text) {
        list.removeAllViews();
        controls.clear();
        TextView t = Ui.text(this, text, 14, Ui.TEXT3, 500);
        t.setGravity(Gravity.CENTER);
        t.setPadding(Ui.dp(this, 16), Ui.dp(this, 10), Ui.dp(this, 16), Ui.dp(this, 10));
        t.setBackground(Ui.round(Ui.dark ? Ui.HEADER : 0xE6FFFFFF, Ui.dp(this, 10)));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.gravity = Gravity.CENTER_HORIZONTAL;
        lp.topMargin = Ui.dp(this, 30);
        list.addView(t, lp);
    }

    /** Reloads the first page. Silent refreshes skip while something is playing, like the site. */
    private void refresh(boolean silent) {
        if (loading || list == null) return;
        if (silent && Player.isPlaying()) return;
        loading = true;
        JSONObject b = new JSONObject();
        try {
            b.put("filesLimit", PAGE);
            b.put("filesFrom", 0);
            b.put("page", 1);
        } catch (Exception ignored) {
        }
        Api.post("/messages/list", b, r -> {
            loading = false;
            if (list == null) return;
            if (!r.ok) {
                if (items.isEmpty()) showLoading(r.error);
                else if (!silent) Toast.makeText(this, r.error, Toast.LENGTH_SHORT).show();
                return;
            }
            JSONArray arr = r.data.optJSONArray("messages");
            List<JSONObject> fresh = new ArrayList<>();
            if (arr != null) for (int i = 0; i < arr.length(); i++) fresh.add(arr.optJSONObject(i));
            StringBuilder hash = new StringBuilder();
            for (JSONObject m : fresh) hash.append(m.optString("name")).append('|');
            if (silent && hash.toString().equals(renderedHash)) {
                loadMessageStats(fresh);
                return;
            }
            boolean first = renderedHash.isEmpty();
            renderedHash = hash.toString();
            page = 1;
            noMore = fresh.size() < PAGE;
            items.clear();
            items.addAll(fresh);
            render(first || !silent ? Scroll.BOTTOM : Scroll.KEEP_BOTTOM_IF_NEAR);
            if (!fresh.isEmpty()) {
                long newest = idNum(fresh.get(0));
                if (newest > Store.mark("feed")) Store.setMark("feed", newest);
            }
        });
    }

    private void loadMore() {
        if (loading || noMore) return;
        loading = true;
        if (moreBtn != null) moreBtn.setText("טוען הודעות קודמות…");
        JSONObject b = new JSONObject();
        try {
            b.put("filesLimit", PAGE);
            b.put("filesFrom", page * PAGE);
            b.put("page", page + 1);
        } catch (Exception ignored) {
        }
        Api.post("/messages/list", b, r -> {
            loading = false;
            if (!r.ok) {
                if (moreBtn != null) moreBtn.setText("שגיאה, נסו שוב");
                return;
            }
            JSONArray arr = r.data.optJSONArray("messages");
            int n = arr == null ? 0 : arr.length();
            for (int i = 0; i < n; i++) items.add(arr.optJSONObject(i));
            page++;
            noMore = n < PAGE;
            render(Scroll.KEEP_POSITION);
        });
    }

    private static String fileId(JSONObject m) {
        String name = m.optString("name");
        int dot = name.indexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

    private static long idNum(JSONObject m) {
        try { return Long.parseLong(fileId(m)); } catch (Exception e) { return 0; }
    }

    /** How the list should scroll after rendering. */
    private enum Scroll { BOTTOM, KEEP_BOTTOM_IF_NEAR, KEEP_POSITION }

    /** Like WhatsApp: oldest at the top, newest at the bottom; "load older" at the top. */
    private void render(Scroll mode) {
        boolean nearBottom = scroll.getChildCount() > 0
                && scroll.getScrollY() + scroll.getHeight() >= list.getHeight() - Ui.dp(this, 120);
        int oldHeight = list.getHeight(), oldY = scroll.getScrollY();
        list.removeAllViews();
        controls.clear();
        if (items.isEmpty()) {
            showLoading(Store.user().optBoolean("canListen", true) ? "אין הודעות להצגה כרגע." : "ההאזנה להודעות לא פעילה בחשבון שלך.");
            return;
        }
        moreBtn = null;
        if (!noMore) {
            moreBtn = Ui.button(this, "טען הודעות קודמות", false);
            moreBtn.setTextSize(14);
            moreBtn.setOnClickListener(v -> loadMore());
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, Ui.dp(this, 42));
            lp.gravity = Gravity.CENTER_HORIZONTAL;
            lp.bottomMargin = Ui.dp(this, 6);
            list.addView(moreBtn, lp);
        }
        String lastDate = null;
        for (int i = items.size() - 1; i >= 0; i--) {
            JSONObject m = items.get(i);
            String mtime = m.optString("mtime", "");
            String date = mtime.contains(" ") ? mtime.substring(0, mtime.indexOf(' ')) : mtime;
            if (!date.equals(lastDate)) list.addView(divider(date));
            lastDate = date;
            list.addView(bubble(m));
        }
        playerChanged();
        loadMessageStats(items);
        scroll.post(() -> {
            if (mode == Scroll.BOTTOM || (mode == Scroll.KEEP_BOTTOM_IF_NEAR && nearBottom)) scroll.fullScroll(View.FOCUS_DOWN);
            else scroll.scrollTo(0, oldY + (list.getHeight() - oldHeight));
        });
    }

    private View divider(String date) {
        TextView t = Ui.text(this, date, 12.5f, Ui.TEXT3, 500);
        t.setTextDirection(View.TEXT_DIRECTION_LTR);
        t.setPadding(Ui.dp(this, 12), Ui.dp(this, 4), Ui.dp(this, 12), Ui.dp(this, 4));
        t.setBackground(Ui.round(Ui.dark ? Ui.HEADER : 0xF2E1F2FB, Ui.dp(this, 8)));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.gravity = Gravity.CENTER_HORIZONTAL;
        lp.setMargins(0, Ui.dp(this, 10), 0, Ui.dp(this, 10));
        t.setLayoutParams(lp);
        return t;
    }

    private View bubble(JSONObject m) {
        String id = fileId(m);
        boolean out = m.optBoolean("isOutgoing");
        String sender = m.optString("valName", "מערכת");
        String fromWeb = m.optString("fromWebType", "");
        if ("false".equals(fromWeb)) fromWeb = "";

        LinearLayout b = new LinearLayout(this);
        b.setOrientation(LinearLayout.VERTICAL);
        b.setPadding(Ui.dp(this, 10), Ui.dp(this, 7), Ui.dp(this, 10), Ui.dp(this, 6));
        GradientDrawable bg = new GradientDrawable();
        float r = Ui.dp(this, 9);
        // RTL: incoming on the right with its top-right corner square, outgoing on the left
        bg.setCornerRadii(out ? new float[]{0, 0, r, r, r, r, r, r} : new float[]{r, r, 0, 0, r, r, r, r});
        bg.setColor(out ? Ui.BUBBLE_OUT : Ui.BUBBLE_IN);
        b.setBackground(bg);
        b.setElevation(Ui.dp(this, 0.8f));

        // top: sender + source | ID (+ delete)
        LinearLayout top = new LinearLayout(this);
        top.setGravity(Gravity.CENTER_VERTICAL);
        TextView name = Ui.oneLine(Ui.text(this, sender, 14.5f, out ? Ui.NAME_OUT : Ui.NAME_IN, 700));
        top.addView(name, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        ImageView src = new ImageView(this);
        src.setImageResource(fromWeb.isEmpty() ? R.drawable.ic_phone : R.drawable.ic_globe);
        src.setColorFilter(Ui.META, PorterDuff.Mode.SRC_IN);
        src.setContentDescription(fromWeb.isEmpty() ? "הוקלטה בטלפון" : "הועלתה דרך האתר");
        int sp = Ui.dp(this, 3);
        src.setPadding(sp, sp, sp, sp);
        src.setBackground(Ui.circle(Ui.dark ? 0x22FFFFFF : 0xFFF1F5F9));
        LinearLayout.LayoutParams slp = new LinearLayout.LayoutParams(Ui.dp(this, 20), Ui.dp(this, 20));
        slp.setMarginStart(Ui.dp(this, 6));
        slp.setMarginEnd(Ui.dp(this, 10));
        top.addView(src, slp);
        TextView idv = Ui.text(this, "ID: " + id, 11.5f, Ui.META, 400);
        idv.setTextDirection(View.TEXT_DIRECTION_LTR);
        top.addView(idv);
        if (out || canDeleteAll()) {
            ImageView del = new ImageView(this);
            del.setImageResource(R.drawable.ic_trash);
            del.setColorFilter(Ui.c("#ef4444"), PorterDuff.Mode.SRC_IN);
            int dp = Ui.dp(this, 5);
            del.setPadding(dp, dp, dp, dp);
            del.setAlpha(0.75f);
            del.setContentDescription("מחיקת הודעה");
            del.setOnClickListener(v -> attemptDelete(m.optString("name"), id, del));
            LinearLayout.LayoutParams dlp = new LinearLayout.LayoutParams(Ui.dp(this, 28), Ui.dp(this, 28));
            dlp.setMarginStart(Ui.dp(this, 4));
            top.addView(del, dlp);
        }
        b.addView(top);

        // player
        LinearLayout player = new LinearLayout(this);
        player.setGravity(Gravity.CENTER_VERTICAL);
        player.setPadding(0, Ui.dp(this, 6), 0, 0);
        Controls c = new Controls();
        c.outgoing = out;
        c.btn = new ImageView(this);
        c.btn.setImageResource(R.drawable.ic_play);
        c.btn.setColorFilter(Color.WHITE, PorterDuff.Mode.SRC_IN);
        int pp = Ui.dp(this, 9);
        c.btn.setPadding(pp, pp, pp, pp);
        c.btn.setBackground(Ui.circle(out ? Ui.PLAY_OUT : Ui.PLAY_IN));
        c.btn.setContentDescription("השמעה");
        c.btn.setOnClickListener(v -> Player.play(this, id, sender));
        player.addView(c.btn, new LinearLayout.LayoutParams(Ui.dp(this, 40), Ui.dp(this, 40)));
        LinearLayout track = new LinearLayout(this);
        track.setOrientation(LinearLayout.VERTICAL);
        c.seek = new SeekBar(this);
        c.seek.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        c.seek.setMax(1000);
        int tint = out ? Ui.PLAY_OUT : Ui.PLAY_IN;
        c.seek.getProgressDrawable().setColorFilter(tint, PorterDuff.Mode.SRC_IN);
        c.seek.getThumb().setColorFilter(tint, PorterDuff.Mode.SRC_IN);
        c.seek.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar s, int p, boolean user) {
                if (user && id.equals(Player.fileId) && Player.duration() > 0) Player.seekTo((int) ((long) Player.duration() * p / 1000));
            }

            public void onStartTrackingTouch(SeekBar s) {
            }

            public void onStopTrackingTouch(SeekBar s) {
            }
        });
        track.addView(c.seek);
        LinearLayout times = new LinearLayout(this);
        times.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        times.setPadding(Ui.dp(this, 14), 0, Ui.dp(this, 14), 0);
        c.cur = Ui.text(this, "0:00", 11.5f, Ui.META, 400);
        times.addView(c.cur, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        times.addView(Ui.text(this, m.optString("durationStr", "00:00"), 11.5f, Ui.META, 400));
        track.addView(times);
        player.addView(track, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        b.addView(player);
        controls.put(id, c);

        // bottom: listens (web | phone) and time
        LinearLayout bot = new LinearLayout(this);
        bot.setGravity(Gravity.CENTER_VERTICAL);
        bot.setPadding(Ui.dp(this, 2), Ui.dp(this, 4), Ui.dp(this, 2), 0);
        TextView st = Ui.text(this, "טוען צפיות…", 11.5f, Ui.META, 500);
        st.setTag("stats-" + id);
        st.setPadding(Ui.dp(this, 8), Ui.dp(this, 2), Ui.dp(this, 8), Ui.dp(this, 2));
        st.setBackground(Ui.round(Ui.dark ? 0x22FFFFFF : 0x0D000000, Ui.dp(this, 999)));
        bot.addView(st);
        bot.addView(new View(this), new LinearLayout.LayoutParams(0, 1, 1));
        TextView time = Ui.text(this, m.optString("mtime", ""), 11.5f, Ui.META, 400);
        time.setTextDirection(View.TEXT_DIRECTION_LTR);
        bot.addView(time);
        if (out) {
            ImageView ok = new ImageView(this);
            ok.setImageResource(R.drawable.ic_doublecheck);
            ok.setColorFilter(Ui.PLAY_OUT, PorterDuff.Mode.SRC_IN);
            LinearLayout.LayoutParams olp = new LinearLayout.LayoutParams(Ui.dp(this, 16), Ui.dp(this, 16));
            olp.setMarginStart(Ui.dp(this, 4));
            bot.addView(ok, olp);
        }
        b.addView(bot);

        // row: incoming on the right (start in RTL), outgoing on the left
        LinearLayout row = new LinearLayout(this);
        row.setGravity(out ? Gravity.END : Gravity.START);
        int max = (int) (getResources().getDisplayMetrics().widthPixels * 0.86);
        LinearLayout.LayoutParams blp = new LinearLayout.LayoutParams(Math.min(max, Ui.dp(this, 360)), ViewGroup.LayoutParams.WRAP_CONTENT);
        row.addView(b, blp);
        row.setPadding(0, Ui.dp(this, 3), 0, Ui.dp(this, 3));
        return row;
    }

    private boolean canDeleteAll() {
        JSONObject u = Store.user();
        return u.optBoolean("isAdmin") && (u.optString("adminPermissions").contains("all") || u.optString("adminPermissions").contains("delete_messages"));
    }

    /** Web and phone listens for each message, 5 at a time like the site. */
    private void loadMessageStats(List<JSONObject> msgs) {
        List<String> ids = new ArrayList<>();
        for (JSONObject m : msgs) ids.add(fileId(m));
        loadStatsBatch(ids, 0);
    }

    private void loadStatsBatch(List<String> ids, int from) {
        if (from >= ids.size() || list == null) return;
        int to = Math.min(ids.size(), from + 5);
        final int[] left = {to - from};
        for (int i = from; i < to; i++) {
            String id = ids.get(i);
            JSONObject b = new JSONObject();
            try { b.put("fileId", id); } catch (Exception ignored) { }
            Api.post("/messages/stats", b, r -> {
                TextView st = list == null ? null : list.findViewWithTag("stats-" + id);
                JSONObject s = r.data.optJSONObject("stats");
                if (st != null && r.ok && s != null) st.setText("🌐 " + s.optInt("webListens") + "  |  📞 " + s.optInt("phoneListens"));
                else if (st != null && st.getText().toString().startsWith("טוען")) st.setText("—");
                if (--left[0] == 0) loadStatsBatch(ids, to);
            });
        }
    }

    private void attemptDelete(String fileName, String id, View btn) {
        btn.setEnabled(false);
        JSONObject b = new JSONObject();
        try { b.put("fileName", fileName); } catch (Exception ignored) { }
        Api.post("/messages/check-delete", b, r -> {
            btn.setEnabled(true);
            if (!r.ok) {
                new AlertDialog.Builder(this).setTitle("פעולה נדחתה").setMessage(r.data.optString("message", r.error)).setPositiveButton("סגירה", null).show();
                return;
            }
            new AlertDialog.Builder(this)
                    .setTitle("מחיקת הודעה")
                    .setMessage("למחוק את ההודעה ID " + id + "? אי אפשר לשחזר.")
                    .setPositiveButton("מחיקה", (d, w) -> Api.post("/messages/delete", b, r2 -> {
                        Toast.makeText(this, r2.ok ? "ההודעה נמחקה" : r2.data.optString("message", r2.error), Toast.LENGTH_LONG).show();
                        if (r2.ok) {
                            if (id.equals(Player.fileId)) Player.stop();
                            refresh(false);
                        }
                    }))
                    .setNegativeButton("ביטול", null)
                    .show();
        });
    }

    // ------------------------------------------------------------------ player ↔ bubbles

    private final Player.Listener playerListener = this::playerChanged;

    private void playerChanged() {
        for (Map.Entry<String, Controls> e : controls.entrySet()) {
            Controls c = e.getValue();
            boolean active = e.getKey().equals(Player.fileId);
            boolean playing = active && Player.isPlaying();
            c.btn.setImageResource(playing || (active && Player.preparing) ? R.drawable.ic_pause : R.drawable.ic_play);
            if (active) {
                int d = Player.duration(), p = Player.position();
                c.seek.setProgress(d > 0 ? (int) ((long) p * 1000 / d) : 0);
                c.cur.setText(Player.preparing ? "טוען…" : Fmt.clock(p));
            } else if (c.seek.getProgress() != 0) {
                c.seek.setProgress(0);
                c.cur.setText("0:00");
            }
        }
    }

    // ------------------------------------------------------------------ record / attach bar

    private enum RecState { IDLE, RECORDING, PAUSED, REVIEW, UPLOADING, SENT }

    private RecState recState = RecState.IDLE;
    private MediaRecorder recorder;
    private File recFile;
    private long recElapsed, recStartedAt;
    private TextView recTimer;
    private MediaPlayer preview;
    private int tzLeft;
    private final Runnable recTick = new Runnable() {
        @Override
        public void run() {
            if (recState != RecState.RECORDING || recTimer == null) return;
            long ms = recElapsed + System.currentTimeMillis() - recStartedAt;
            recTimer.setText(Fmt.clock((int) ms));
            if (ms >= 5 * 60_000) {
                stopForReview();
                return;
            }
            h.postDelayed(this, 250);
        }
    };
    private final Runnable tzTick = new Runnable() {
        @Override
        public void run() {
            if (recState != RecState.SENT) return;
            tzLeft--;
            if (tzLeft <= 0) {
                recState = RecState.IDLE;
                renderBottom();
                return;
            }
            if (recTimer != null) recTimer.setText(String.format(java.util.Locale.US, "%02d:%02d", tzLeft / 60, tzLeft % 60));
            h.postDelayed(this, 1000);
        }
    };

    private void renderBottom() {
        if (bottom == null) return;
        bottom.removeAllViews();
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(Ui.dp(this, 10), Ui.dp(this, 8), Ui.dp(this, 10), Ui.dp(this, 8));
        JSONObject f = Store.config().optJSONObject("features");
        boolean recordOn = (f == null || f.optBoolean("record", true)) && Store.user().optBoolean("canRecord", true);

        switch (recState) {
            case IDLE: {
                TextView status = Ui.oneLine(Ui.text(this, recordOn ? "הקלט או בחר קובץ להעלאה" : "ההקלטה לא פעילה בחשבון שלך", 14.5f, Ui.TEXT3, 400));
                status.setPadding(Ui.dp(this, 16), 0, Ui.dp(this, 8), 0);
                status.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
                LinearLayout pill = new LinearLayout(this);
                pill.setGravity(Gravity.CENTER_VERTICAL);
                pill.setBackground(Ui.round(Ui.dark ? Ui.c("#2a3942") : Color.WHITE, Ui.dp(this, 24)));
                pill.addView(status, new LinearLayout.LayoutParams(0, Ui.dp(this, 48), 1));
                if (Store.user().optBoolean("canUpload")) {
                    ImageView attach = roundIcon(R.drawable.ic_attach, Ui.TEXT3, 0, "בחירת קובץ מהמכשיר");
                    attach.setOnClickListener(v -> pickFile());
                    pill.addView(attach, new LinearLayout.LayoutParams(Ui.dp(this, 46), Ui.dp(this, 46)));
                }
                row.addView(pill, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
                ImageView mic = roundIcon(R.drawable.ic_mic, Color.WHITE, Ui.PLAY_OUT, "הקלטת הודעה");
                mic.setEnabled(recordOn);
                mic.setAlpha(recordOn ? 1f : 0.4f);
                mic.setOnClickListener(v -> startRecording());
                LinearLayout.LayoutParams mlp = new LinearLayout.LayoutParams(Ui.dp(this, 50), Ui.dp(this, 50));
                mlp.setMarginStart(Ui.dp(this, 8));
                row.addView(mic, mlp);
                bottom.addView(row);
                break;
            }
            case RECORDING:
            case PAUSED: {
                boolean paused = recState == RecState.PAUSED;
                ImageView cancel = roundIcon(R.drawable.ic_trash, Ui.c("#ef4444"), 0, "ביטול");
                cancel.setOnClickListener(v -> cancelRecording());
                row.addView(cancel, new LinearLayout.LayoutParams(Ui.dp(this, 46), Ui.dp(this, 46)));
                View dot = new View(this);
                dot.setBackground(Ui.circle(paused ? Ui.META : Ui.c("#ef4444")));
                LinearLayout.LayoutParams dlp = new LinearLayout.LayoutParams(Ui.dp(this, 10), Ui.dp(this, 10));
                dlp.setMarginStart(Ui.dp(this, 8));
                row.addView(dot, dlp);
                recTimer = Ui.text(this, Fmt.clock((int) recElapsed), 18, Ui.TEXT, 700);
                recTimer.setPadding(Ui.dp(this, 8), 0, 0, 0);
                row.addView(recTimer);
                row.addView(Ui.text(this, paused ? "  מושהה" : "  מקליט…", 14, Ui.TEXT3, 500), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
                if (Build.VERSION.SDK_INT >= 24) {
                    ImageView pause = roundIcon(paused ? R.drawable.ic_mic : R.drawable.ic_pause, Ui.TEXT2, 0, paused ? "המשך הקלטה" : "השהיה");
                    pause.setOnClickListener(v -> togglePause());
                    row.addView(pause, new LinearLayout.LayoutParams(Ui.dp(this, 46), Ui.dp(this, 46)));
                }
                ImageView stop = roundIcon(R.drawable.ic_check, Color.WHITE, Ui.PLAY_OUT, "סיום הקלטה");
                stop.setOnClickListener(v -> stopForReview());
                LinearLayout.LayoutParams slp = new LinearLayout.LayoutParams(Ui.dp(this, 50), Ui.dp(this, 50));
                slp.setMarginStart(Ui.dp(this, 6));
                row.addView(stop, slp);
                bottom.addView(row);
                break;
            }
            case REVIEW: {
                ImageView cancel = roundIcon(R.drawable.ic_trash, Ui.c("#ef4444"), 0, "מחיקת ההקלטה");
                cancel.setOnClickListener(v -> cancelRecording());
                row.addView(cancel, new LinearLayout.LayoutParams(Ui.dp(this, 46), Ui.dp(this, 46)));
                ImageView play = roundIcon(R.drawable.ic_play, Color.WHITE, Ui.PLAY_IN, "השמעת ההקלטה");
                play.setOnClickListener(v -> togglePreview((ImageView) v));
                LinearLayout.LayoutParams plp = new LinearLayout.LayoutParams(Ui.dp(this, 42), Ui.dp(this, 42));
                plp.setMarginStart(Ui.dp(this, 6));
                row.addView(play, plp);
                TextView info = Ui.text(this, "  הקלטה מוכנה · " + Fmt.clock((int) recElapsed), 14.5f, Ui.TEXT2, 500);
                row.addView(info, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
                Button send = Ui.button(this, "שליחה", true);
                send.setTextSize(15);
                send.setMinHeight(Ui.dp(this, 44));
                send.setOnClickListener(v -> upload(recFile, "recording.m4a", "audio/mp4", "record"));
                row.addView(send, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, Ui.dp(this, 44)));
                bottom.addView(row);
                break;
            }
            case UPLOADING: {
                TextView t = Ui.text(this, "מעלה את ההודעה…", 15, Ui.TEXT2, 500);
                t.setGravity(Gravity.CENTER);
                t.setPadding(0, Ui.dp(this, 14), 0, Ui.dp(this, 14));
                bottom.addView(t, Ui.wide());
                break;
            }
            case SENT: {
                LinearLayout box = new LinearLayout(this);
                box.setOrientation(LinearLayout.VERTICAL);
                box.setPadding(Ui.dp(this, 14), Ui.dp(this, 10), Ui.dp(this, 14), Ui.dp(this, 10));
                LinearLayout top = new LinearLayout(this);
                top.setGravity(Gravity.CENTER_VERTICAL);
                top.addView(Ui.text(this, "✓ ההודעה הועלתה בהצלחה", 15.5f, Ui.PLAY_OUT, 700), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
                recTimer = Ui.text(this, String.format(java.util.Locale.US, "%02d:%02d", tzLeft / 60, tzLeft % 60), 14, Ui.TEXT3, 700);
                top.addView(recTimer);
                box.addView(top);
                JSONObject ff = Store.config().optJSONObject("features");
                boolean tzOn = (ff == null || ff.optBoolean("tzintuk", true)) && Store.user().optBoolean("canTzintuk", true);
                LinearLayout btns = new LinearLayout(this);
                btns.setPadding(0, Ui.dp(this, 8), 0, 0);
                if (tzOn) {
                    Button tz = Ui.button(this, "📞 שלח צינתוק עכשיו", true);
                    tz.setTextSize(15);
                    tz.setOnClickListener(v -> sendTzintuk(tz));
                    btns.addView(tz, new LinearLayout.LayoutParams(0, Ui.dp(this, 46), 1));
                    btns.addView(new View(this), new LinearLayout.LayoutParams(Ui.dp(this, 8), 1));
                }
                Button close = Ui.button(this, "סגירה", false);
                close.setTextSize(15);
                close.setOnClickListener(v -> {
                    recState = RecState.IDLE;
                    renderBottom();
                });
                btns.addView(close, new LinearLayout.LayoutParams(tzOn ? ViewGroup.LayoutParams.WRAP_CONTENT : 0, Ui.dp(this, 46), tzOn ? 0 : 1));
                box.addView(btns);
                bottom.addView(box, Ui.wide());
                break;
            }
        }
    }

    private ImageView roundIcon(int icon, int tint, int bg, String label) {
        ImageView b = new ImageView(this);
        b.setImageResource(icon);
        b.setColorFilter(tint, PorterDuff.Mode.SRC_IN);
        int p = Ui.dp(this, 12);
        b.setPadding(p, p, p, p);
        b.setBackground(bg == 0 ? Ui.ripple(null) : Ui.ripple(Ui.circle(bg)));
        b.setContentDescription(label);
        return b;
    }

    private void startRecording() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
            return;
        }
        Player.stop();
        stopPreview();
        recFile = new File(getCacheDir(), "recording.m4a");
        try {
            recorder = new MediaRecorder();
            recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setAudioSamplingRate(44100);
            recorder.setAudioEncodingBitRate(96000);
            recorder.setOutputFile(recFile.getAbsolutePath());
            recorder.prepare();
            recorder.start();
        } catch (Exception e) {
            releaseRecorder();
            Toast.makeText(this, "לא ניתן להתחיל הקלטה", Toast.LENGTH_SHORT).show();
            return;
        }
        recElapsed = 0;
        recStartedAt = System.currentTimeMillis();
        recState = RecState.RECORDING;
        renderBottom();
        h.post(recTick);
    }

    private void togglePause() {
        if (recorder == null || Build.VERSION.SDK_INT < 24) return;
        try {
            if (recState == RecState.RECORDING) {
                recorder.pause();
                recElapsed += System.currentTimeMillis() - recStartedAt;
                recState = RecState.PAUSED;
            } else {
                recorder.resume();
                recStartedAt = System.currentTimeMillis();
                recState = RecState.RECORDING;
                h.post(recTick);
            }
        } catch (Exception ignored) {
        }
        renderBottom();
    }

    private void stopForReview() {
        if (recState == RecState.RECORDING) recElapsed += System.currentTimeMillis() - recStartedAt;
        boolean ok = true;
        try {
            if (recorder != null) recorder.stop();
        } catch (Exception e) {
            ok = false;
        }
        releaseRecorder();
        h.removeCallbacks(recTick);
        if (!ok || recElapsed < 800) {
            Toast.makeText(this, "ההקלטה קצרה מדי", Toast.LENGTH_SHORT).show();
            recState = RecState.IDLE;
        } else {
            recState = RecState.REVIEW;
        }
        renderBottom();
    }

    private void cancelRecording() {
        h.removeCallbacks(recTick);
        h.removeCallbacks(tzTick);
        try {
            if (recorder != null) recorder.stop();
        } catch (Exception ignored) {
        }
        releaseRecorder();
        stopPreview();
        recState = RecState.IDLE;
        renderBottom();
    }

    private void releaseRecorder() {
        if (recorder != null) {
            try { recorder.release(); } catch (Exception ignored) { }
        }
        recorder = null;
    }

    private void togglePreview(ImageView btn) {
        if (preview != null) {
            stopPreview();
            btn.setImageResource(R.drawable.ic_play);
            return;
        }
        try {
            preview = new MediaPlayer();
            preview.setDataSource(recFile.getAbsolutePath());
            preview.setOnCompletionListener(p -> {
                stopPreview();
                btn.setImageResource(R.drawable.ic_play);
            });
            preview.prepare();
            preview.start();
            btn.setImageResource(R.drawable.ic_pause);
        } catch (Exception e) {
            stopPreview();
        }
    }

    private void stopPreview() {
        if (preview != null) {
            try { preview.release(); } catch (Exception ignored) { }
        }
        preview = null;
    }

    private void pickFile() {
        Intent i = new Intent(Intent.ACTION_GET_CONTENT).setType("audio/*").addCategory(Intent.CATEGORY_OPENABLE);
        try {
            startActivityForResult(Intent.createChooser(i, "בחירת קובץ שמע"), REQ_FILE);
        } catch (Exception e) {
            Toast.makeText(this, "לא נמצאה אפליקציה לבחירת קבצים", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code != REQ_FILE || result != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        String name = "file.mp3";
        try (Cursor c = getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) name = c.getString(idx);
            }
        } catch (Exception ignored) {
        }
        File f = new File(getCacheDir(), "upload.bin");
        try (InputStream in = getContentResolver().openInputStream(uri); OutputStream out = new FileOutputStream(f)) {
            byte[] buf = new byte[65536];
            int n;
            long total = 0;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
                total += n;
                if (total > 50L * 1024 * 1024) throw new Exception("too big");
            }
        } catch (Exception e) {
            Toast.makeText(this, "לא ניתן לקרוא את הקובץ", Toast.LENGTH_SHORT).show();
            return;
        }
        String mime = getContentResolver().getType(uri);
        String finalName = name;
        new AlertDialog.Builder(this)
                .setTitle("העלאת קובץ")
                .setMessage("להעלות את \"" + finalName + "\" למערכת?")
                .setPositiveButton("העלאה", (d, w) -> upload(f, finalName, mime == null ? "audio/mpeg" : mime, "file"))
                .setNegativeButton("ביטול", null)
                .show();
    }

    private void upload(File f, String name, String mime, String type) {
        stopPreview();
        recState = RecState.UPLOADING;
        renderBottom();
        Api.upload(f, name, mime, type, r -> {
            if (!r.ok) {
                Toast.makeText(this, r.error, Toast.LENGTH_LONG).show();
                recState = "record".equals(type) ? RecState.REVIEW : RecState.IDLE;
                renderBottom();
                return;
            }
            recState = RecState.SENT;
            tzLeft = 90;
            renderBottom();
            h.removeCallbacks(tzTick);
            h.postDelayed(tzTick, 1000);
            h.postDelayed(() -> refresh(false), 3000);
        });
    }

    private void sendTzintuk(Button b) {
        b.setEnabled(false);
        b.setText("שולח…");
        Api.post("/messages/tzintuk", new JSONObject(), r -> {
            h.removeCallbacks(tzTick);
            String msg = r.ok ? r.data.optString("message", "הצינתוק נשלח בהצלחה") : r.error;
            Toast.makeText(this, msg, Toast.LENGTH_LONG).show();
            recState = RecState.IDLE;
            renderBottom();
        });
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code == REQ_MIC) {
            if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) startRecording();
            else Toast.makeText(this, "בלי הרשאת מיקרופון אי אפשר להקליט", Toast.LENGTH_LONG).show();
        }
    }
}
