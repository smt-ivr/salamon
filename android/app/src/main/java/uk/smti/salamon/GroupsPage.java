package uk.smti.salamon;

import android.content.Intent;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

/** Group chats: the list of groups, and a conversation screen for each group. */
public class GroupsPage extends Page {

    private FrameLayout frame;
    private LinearLayout listCol;
    private TextView listEmpty;

    // conversation
    private String openId;
    private String openName = "";
    private LinearLayout convo;
    private ScrollView convoScroll;
    private LinearLayout convoList;
    private TextView convoSub;
    private EditText input;
    private LinearLayout inputBar;
    private TextView readOnly;
    private long lastId = -1;

    private final Handler h = new Handler(Looper.getMainLooper());
    private final Runnable poll = () -> {
        if (openId != null) loadMessages(false);
        else loadList();
        schedule();
    };

    public GroupsPage(MainActivity a) {
        super(a);
    }

    public boolean isOpen(String groupId) {
        return openId != null && openId.equals(groupId);
    }

    @Override
    protected View build() {
        frame = new FrameLayout(a);
        ScrollView scroll = new ScrollView(a);
        listCol = new LinearLayout(a);
        listCol.setOrientation(LinearLayout.VERTICAL);
        int p = Ui.dp(a, 16);
        listCol.setPadding(p, Ui.dp(a, 4), p, Ui.dp(a, 24));
        listEmpty = Ui.muted(a, "טוען קבוצות…");
        listEmpty.setGravity(Gravity.CENTER);
        listEmpty.setPadding(0, Ui.dp(a, 40), 0, 0);
        listCol.addView(listEmpty, Ui.wide());
        scroll.addView(listCol);
        frame.addView(scroll);
        return frame;
    }

    @Override
    public void onShow() {
        if (openId != null) loadMessages(true);
        else loadList();
        schedule();
    }

    @Override
    public void onHide() {
        h.removeCallbacks(poll);
    }

    @Override
    public boolean onBack() {
        if (openId != null) {
            closeGroup();
            return true;
        }
        return false;
    }

    private void schedule() {
        h.removeCallbacks(poll);
        h.postDelayed(poll, openId != null ? 4000 : 15000);
    }

    // ------------------------------------------------------------------ list

    private void loadList() {
        Api.post("/groups/me", new JSONObject(), r -> {
            if (!r.ok) {
                listEmpty.setText(r.error);
                return;
            }
            renderList(r.data.optJSONArray("groups"), r.data.optJSONArray("discover"));
        });
    }

    private void renderList(JSONArray groups, JSONArray discover) {
        listCol.removeAllViews();
        int total = 0;
        int n = groups == null ? 0 : groups.length();
        listCol.addView(Ui.text(a, "הקבוצות שלי", 18, Ui.TEXT, 700), Ui.wide(a, 0, 8));
        if (n == 0) {
            TextView e = Ui.muted(a, "עדיין לא הצטרפת לקבוצות.");
            e.setPadding(0, Ui.dp(a, 4), 0, Ui.dp(a, 12));
            listCol.addView(e);
        }
        for (int i = 0; i < n; i++) {
            JSONObject g = groups.optJSONObject(i);
            total += g.optInt("unread");
            listCol.addView(groupRow(g), Ui.wide(a, 0, 10));
        }
        a.setBadge("groups", total);
        int d = discover == null ? 0 : discover.length();
        if (d > 0) {
            listCol.addView(Ui.text(a, "קבוצות שאפשר להצטרף", 18, Ui.TEXT, 700), Ui.wide(a, 18, 8));
            for (int i = 0; i < d; i++) listCol.addView(discoverRow(discover.optJSONObject(i)), Ui.wide(a, 0, 10));
        }
    }

    private int groupColor(JSONObject g) {
        try { return Color.parseColor(g.optString("color", "#0b8043")); } catch (Exception e) { return Ui.ACCENT; }
    }

    private View groupRow(JSONObject g) {
        LinearLayout card = Ui.card(a);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(Ui.dp(a, 14), Ui.dp(a, 12), Ui.dp(a, 14), Ui.dp(a, 12));
        card.setForeground(Ui.ripple(null));
        String name = g.optString("name");
        TextView av = Ui.text(a, name.isEmpty() ? "?" : name.substring(0, 1), 19, Color.WHITE, 700);
        av.setGravity(Gravity.CENTER);
        av.setBackground(Ui.round(groupColor(g), Ui.dp(a, 14)));
        card.addView(av, new LinearLayout.LayoutParams(Ui.dp(a, 46), Ui.dp(a, 46)));

        LinearLayout texts = new LinearLayout(a);
        texts.setOrientation(LinearLayout.VERTICAL);
        texts.setPadding(Ui.dp(a, 12), 0, Ui.dp(a, 10), 0);
        texts.addView(Ui.oneLine(Ui.text(a, name, 16, Ui.TEXT, 700)));
        String status = g.optString("status");
        JSONObject last = g.optJSONObject("last");
        String sub;
        if ("pending".equals(status)) sub = "ממתין לאישור הצטרפות";
        else if ("banned".equals(status)) sub = "אין לך גישה לקבוצה הזו";
        else if (last != null) sub = (last.optString("sender").isEmpty() ? "" : last.optString("sender") + ": ") + last.optString("text");
        else sub = g.optString("description", "");
        texts.addView(Ui.oneLine(Ui.text(a, sub, 13.5f, Ui.TEXT3, 400)));
        card.addView(texts, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));

        LinearLayout side = new LinearLayout(a);
        side.setOrientation(LinearLayout.VERTICAL);
        side.setGravity(Gravity.CENTER);
        if (last != null) side.addView(Ui.text(a, Fmt.when(last.optString("at")), 11.5f, Ui.TEXT3, 400));
        int unread = g.optInt("unread");
        if (unread > 0) {
            TextView u = Ui.chip(a, unread > 99 ? "99+" : String.valueOf(unread), Color.WHITE, Ui.ACCENT);
            side.addView(u);
        }
        card.addView(side);
        if ("active".equals(status)) card.setOnClickListener(v -> openGroup(String.valueOf(g.optLong("id")), name));
        return card;
    }

    private View discoverRow(JSONObject g) {
        LinearLayout card = Ui.card(a);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(Ui.dp(a, 14), Ui.dp(a, 12), Ui.dp(a, 12), Ui.dp(a, 12));
        String name = g.optString("name");
        TextView av = Ui.text(a, name.isEmpty() ? "?" : name.substring(0, 1), 19, Color.WHITE, 700);
        av.setGravity(Gravity.CENTER);
        av.setBackground(Ui.round(groupColor(g), Ui.dp(a, 14)));
        card.addView(av, new LinearLayout.LayoutParams(Ui.dp(a, 46), Ui.dp(a, 46)));
        LinearLayout texts = new LinearLayout(a);
        texts.setOrientation(LinearLayout.VERTICAL);
        texts.setPadding(Ui.dp(a, 12), 0, Ui.dp(a, 10), 0);
        texts.addView(Ui.oneLine(Ui.text(a, name, 16, Ui.TEXT, 700)));
        texts.addView(Ui.oneLine(Ui.text(a, g.optInt("members") + " חברים" + (g.optString("description").isEmpty() ? "" : " · " + g.optString("description")), 13, Ui.TEXT3, 400)));
        card.addView(texts, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        boolean request = "request".equals(g.optString("join"));
        Button join = Ui.button(a, request ? "בקשה" : "הצטרפות", !request);
        join.setTextSize(14);
        join.setMinHeight(Ui.dp(a, 40));
        join.setOnClickListener(v -> {
            join.setEnabled(false);
            JSONObject b = new JSONObject();
            try { b.put("groupId", g.optLong("id")); } catch (Exception ignored) { }
            Api.post("/groups/join", b, r -> {
                Toast.makeText(a, r.ok ? (request ? "הבקשה נשלחה" : "הצטרפת לקבוצה") : r.error, Toast.LENGTH_SHORT).show();
                loadList();
            });
        });
        card.addView(join, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, Ui.dp(a, 40)));
        return card;
    }

    // ------------------------------------------------------------------ conversation

    public void openGroup(String id, String name) {
        if (frame == null) view();
        openId = id;
        openName = name == null ? "קבוצה" : name;
        lastId = -1;
        if (convo != null) frame.removeView(convo);
        convo = new LinearLayout(a);
        convo.setOrientation(LinearLayout.VERTICAL);
        convo.setBackgroundColor(Ui.BG);
        convo.setClickable(true);

        LinearLayout head = new LinearLayout(a);
        head.setGravity(Gravity.CENTER_VERTICAL);
        head.setPadding(Ui.dp(a, 8), 0, Ui.dp(a, 16), Ui.dp(a, 8));
        ImageView back = new ImageView(a);
        back.setImageResource(R.drawable.ic_back);
        back.setColorFilter(Ui.TEXT, PorterDuff.Mode.SRC_IN);
        back.setRotationY(180);
        int bp = Ui.dp(a, 10);
        back.setPadding(bp, bp, bp, bp);
        back.setBackground(Ui.ripple(null));
        back.setOnClickListener(v -> closeGroup());
        head.addView(back, new LinearLayout.LayoutParams(Ui.dp(a, 44), Ui.dp(a, 44)));
        LinearLayout t = new LinearLayout(a);
        t.setOrientation(LinearLayout.VERTICAL);
        TextView title = Ui.oneLine(Ui.text(a, openName, 17, Ui.TEXT, 700));
        title.setTag("title");
        t.addView(title);
        convoSub = Ui.oneLine(Ui.text(a, "", 12.5f, Ui.TEXT3, 400));
        t.addView(convoSub);
        head.addView(t, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        convo.addView(head);

        convoScroll = new ScrollView(a);
        convoList = new LinearLayout(a);
        convoList.setOrientation(LinearLayout.VERTICAL);
        convoList.setPadding(Ui.dp(a, 12), Ui.dp(a, 4), Ui.dp(a, 12), Ui.dp(a, 8));
        TextView loading = Ui.muted(a, "טוען…");
        loading.setGravity(Gravity.CENTER);
        loading.setPadding(0, Ui.dp(a, 40), 0, 0);
        convoList.addView(loading, Ui.wide());
        convoScroll.addView(convoList);
        convo.addView(convoScroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        readOnly = Ui.text(a, "", 13.5f, Ui.TEXT3, 500);
        readOnly.setGravity(Gravity.CENTER);
        readOnly.setPadding(Ui.dp(a, 16), Ui.dp(a, 12), Ui.dp(a, 16), Ui.dp(a, 12));
        readOnly.setVisibility(View.GONE);
        convo.addView(readOnly, Ui.wide());
        input = Ui.input(a, "הודעה לקבוצה…", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        inputBar = Bubbles.inputBar(a, input, v -> send());
        convo.addView(inputBar);

        frame.addView(convo, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        JSONObject b = new JSONObject();
        try { b.put("groupId", Long.parseLong(id)); } catch (Exception ignored) { }
        Api.post("/groups/open", b, r -> {
            JSONObject g = r.data.optJSONObject("group");
            if (g != null && !g.optString("name").isEmpty()) {
                openName = g.optString("name");
                title.setText(openName);
            }
        });
        loadMessages(true);
        schedule();
    }

    private void closeGroup() {
        openId = null;
        if (convo != null) frame.removeView(convo);
        convo = null;
        loadList();
        schedule();
    }

    private void loadMessages(boolean force) {
        if (openId == null) return;
        final String gid = openId;
        JSONObject b = new JSONObject();
        try { b.put("groupId", Long.parseLong(gid)); } catch (Exception ignored) { }
        Api.post("/groups/messages", b, r -> {
            if (!gid.equals(openId)) return;
            if (!r.ok) {
                convoSub.setText(r.error);
                return;
            }
            JSONArray arr = r.data.optJSONArray("messages");
            JSONArray typing = r.data.optJSONArray("typing");
            if (typing != null && typing.length() > 0) {
                convoSub.setText(typing.optString(0) + (typing.length() > 1 ? " ועוד" : "") + " מקליד/ה…");
                convoSub.setTextColor(Ui.ACCENT);
            } else {
                convoSub.setText("");
                convoSub.setTextColor(Ui.TEXT3);
            }
            JSONObject perms = r.data.optJSONObject("perms");
            boolean canPost = perms == null || perms.optBoolean("post", true);
            inputBar.setVisibility(canPost ? View.VISIBLE : View.GONE);
            readOnly.setVisibility(canPost ? View.GONE : View.VISIBLE);
            if (!canPost) {
                String why = "בקבוצה הזו רק המפקחים כותבים";
                if (perms != null && !perms.isNull("muted") && !perms.optString("muted").isEmpty()) why = "הושתקת בקבוצה הזו עד " + perms.optString("muted");
                JSONObject hours = perms == null ? null : perms.optJSONObject("hours");
                if (hours != null && !hours.optBoolean("open", true)) why = "הכתיבה בקבוצה סגורה עכשיו";
                readOnly.setText(why);
            }
            long newest = 0;
            int n = arr == null ? 0 : arr.length();
            for (int i = 0; i < n; i++) newest = Math.max(newest, arr.optJSONObject(i).optLong("id"));
            if (!force && newest == lastId) return;
            lastId = newest;
            render(arr);
            if (newest > 0) {
                JSONObject rb = new JSONObject();
                try {
                    rb.put("groupId", Long.parseLong(gid));
                    rb.put("lastId", newest);
                } catch (Exception ignored) {
                }
                Api.post("/groups/read", rb, null);
                Notifier.cancel(a, "salamon-group-" + gid);
            }
        });
    }

    private void render(JSONArray arr) {
        convoList.removeAllViews();
        int n = arr == null ? 0 : arr.length();
        if (n == 0) {
            TextView e = Ui.muted(a, "אין עדיין הודעות בקבוצה.");
            e.setGravity(Gravity.CENTER);
            e.setPadding(0, Ui.dp(a, 40), 0, 0);
            convoList.addView(e, Ui.wide());
        }
        String lastDay = "";
        for (int i = 0; i < n; i++) {
            JSONObject m = arr.optJSONObject(i);
            String at = m.optString("at");
            String day = at.length() >= 10 ? at.substring(0, 10) : "";
            if (!day.equals(lastDay)) {
                lastDay = day;
                String label = Fmt.when(at).replaceAll(" \\d+:\\d+$", "");
                convoList.addView(Bubbles.bubble(a, false, null, 0, label, "", null, null, null, true));
            }
            if ("system".equals(m.optString("kind"))) {
                convoList.addView(Bubbles.bubble(a, false, null, 0, m.optString("text"), "", null, null, null, true));
                continue;
            }
            boolean mine = m.optBoolean("mine");
            JSONObject file = m.optJSONObject("file");
            String fileName = file != null ? file.optString("name", "קובץ") : null;
            View.OnClickListener open = null;
            if (file != null) {
                String url = file.optString("url", file.optString("link", ""));
                if (!url.isEmpty()) {
                    String full = url.startsWith("http") ? url : "https://smti.uk" + url;
                    open = v -> a.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(full)));
                }
            }
            String text = m.optBoolean("deleted") ? "ההודעה נמחקה" : m.optString("text", "");
            String role = m.optString("senderRole");
            String sender = m.optString("sender") + ("moderator".equals(role) ? " · מפקח" : "admin".equals(role) ? " · הנהלה" : "");
            String status = mine && m.has("readBy") ? "נקרא ע״י " + m.optInt("readBy") : null;
            convoList.addView(Bubbles.bubble(a, mine, sender, Bubbles.senderColor(m.optString("senderKey")), text, Fmt.time(at), status, fileName, open, false));
        }
        convoScroll.post(() -> convoScroll.fullScroll(View.FOCUS_DOWN));
    }

    private void send() {
        if (openId == null) return;
        String text = input.getText().toString().trim();
        if (text.isEmpty()) return;
        input.setText("");
        JSONObject b = new JSONObject();
        try {
            b.put("groupId", Long.parseLong(openId));
            b.put("text", text);
        } catch (Exception ignored) {
        }
        Api.post("/groups/send", b, r -> {
            if (!r.ok) {
                input.setText(text);
                Toast.makeText(a, r.error, Toast.LENGTH_LONG).show();
                return;
            }
            loadMessages(true);
        });
    }
}
