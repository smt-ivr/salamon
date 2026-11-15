package uk.smti.salamon;

import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

/** Chat with the Salamon team (the website's support chat). */
public class ChatPage extends Page {

    private ScrollView scroll;
    private LinearLayout list;
    private TextView typing, empty;
    private EditText input;
    private long lastId = -1;
    private final Handler h = new Handler(Looper.getMainLooper());
    private final Runnable poll = () -> {
        load(false);
        schedule();
    };

    public ChatPage(android.app.Activity a) {
        super(a);
    }

    @Override
    protected View build() {
        LinearLayout col = new LinearLayout(a);
        col.setOrientation(LinearLayout.VERTICAL);

        LinearLayout head = new LinearLayout(a);
        head.setGravity(Gravity.CENTER_VERTICAL);
        head.setPadding(Ui.dp(a, 16), Ui.dp(a, 2), Ui.dp(a, 16), Ui.dp(a, 8));
        head.addView(Ui.avatar(a, "צוות", 38));
        LinearLayout t = new LinearLayout(a);
        t.setOrientation(LinearLayout.VERTICAL);
        t.setPadding(Ui.dp(a, 10), 0, 0, 0);
        t.addView(Ui.text(a, "צוות עכשיו סלומון", 16, Ui.TEXT, 700));
        typing = Ui.text(a, "בדרך כלל עונים תוך זמן קצר", 12.5f, Ui.TEXT3, 400);
        t.addView(typing);
        head.addView(t);
        col.addView(head);

        scroll = new ScrollView(a);
        list = new LinearLayout(a);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setPadding(Ui.dp(a, 12), Ui.dp(a, 4), Ui.dp(a, 12), Ui.dp(a, 8));
        empty = Ui.muted(a, "טוען…");
        empty.setGravity(Gravity.CENTER);
        empty.setPadding(0, Ui.dp(a, 40), 0, 0);
        list.addView(empty, Ui.wide());
        scroll.addView(list);
        col.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        input = Ui.input(a, "כתבו הודעה…", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        col.addView(Bubbles.inputBar(a, input, v -> send()));
        return col;
    }

    @Override
    public void onShow() {
        load(true);
        schedule();
    }

    @Override
    public void onHide() {
        h.removeCallbacks(poll);
    }

    private void schedule() {
        h.removeCallbacks(poll);
        h.postDelayed(poll, 5000);
    }

    private void load(boolean force) {
        Api.post("/chat/list", new JSONObject(), r -> {
            if (!r.ok) {
                if (lastId < 0) empty.setText(r.error);
                return;
            }
            JSONArray arr = r.data.optJSONArray("messages");
            boolean adminTyping = r.data.optBoolean("adminTyping");
            typing.setText(adminTyping ? "מקליד/ה…" : "בדרך כלל עונים תוך זמן קצר");
            typing.setTextColor(adminTyping ? Ui.ACCENT : Ui.TEXT3);
            long newest = 0, newestAdmin = 0;
            int n = arr == null ? 0 : arr.length();
            for (int i = 0; i < n; i++) {
                JSONObject m = arr.optJSONObject(i);
                newest = Math.max(newest, m.optLong("id"));
                if ("admin".equals(m.optString("sender"))) newestAdmin = Math.max(newestAdmin, m.optLong("id"));
            }
            if (!force && newest == lastId) return;
            lastId = newest;
            render(arr);
            if (newestAdmin > 0) {
                Store.setMark("chat", Math.max(Store.mark("chat"), newestAdmin));
                Api.post("/chat/read", new JSONObject(), null);
                Notifier.cancel(a, "salamon-chat");
            }
        });
    }

    private void render(JSONArray arr) {
        list.removeAllViews();
        int n = arr == null ? 0 : arr.length();
        if (n == 0) {
            TextView hello = Ui.muted(a, "שלום! כתבו לנו כאן כל שאלה, והצוות יענה בהקדם.");
            hello.setGravity(Gravity.CENTER);
            hello.setPadding(Ui.dp(a, 20), Ui.dp(a, 40), Ui.dp(a, 20), 0);
            list.addView(hello, Ui.wide());
        }
        String lastDay = "";
        for (int i = 0; i < n; i++) {
            JSONObject m = arr.optJSONObject(i);
            String at = m.optString("createdAt");
            String day = at.length() >= 10 ? at.substring(0, 10) : "";
            if (!day.equals(lastDay)) {
                lastDay = day;
                list.addView(Bubbles.bubble(a, false, null, 0, Fmt.when(at).replaceAll(" \\d+:\\d+$", "").replace("לפני", "היום · לפני"), "", null, null, null, true));
            }
            boolean mine = "user".equals(m.optString("sender"));
            JSONObject file = m.optJSONObject("file");
            String fileName = file != null ? file.optString("name", "קובץ") : null;
            long id = m.optLong("id");
            View.OnClickListener open = file == null ? null : v -> openFile(id, file.optString("url", ""));
            String status = mine ? (m.optBoolean("isRead") ? "✓✓" : "✓") : null;
            String text = m.optBoolean("isDeleted") ? "ההודעה נמחקה" : m.optString("text", "");
            list.addView(Bubbles.bubble(a, mine, mine ? null : "צוות סלומון", Ui.ACCENT, text, Fmt.time(at), status, fileName, open, false));
        }
        scroll.post(() -> scroll.fullScroll(View.FOCUS_DOWN));
    }

    private void openFile(long messageId, String url) {
        if (!url.isEmpty() && url.startsWith("http")) {
            a.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            return;
        }
        JSONObject b = new JSONObject();
        try { b.put("messageId", messageId); } catch (Exception ignored) { }
        Api.post("/chat/file-link", b, r -> {
            String u = r.data.optString("url", "");
            if (r.ok && !u.isEmpty()) a.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(u.startsWith("http") ? u : "https://smti.uk" + u)));
            else Toast.makeText(a, r.ok ? "לא ניתן לפתוח את הקובץ" : r.error, Toast.LENGTH_SHORT).show();
        });
    }

    private void send() {
        String text = input.getText().toString().trim();
        if (text.isEmpty()) return;
        input.setText("");
        JSONObject b = new JSONObject();
        try { b.put("text", text); } catch (Exception ignored) { }
        Api.post("/chat/send", b, r -> {
            if (!r.ok) {
                input.setText(text);
                Toast.makeText(a, r.error, Toast.LENGTH_SHORT).show();
                return;
            }
            load(true);
        });
    }
}
