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
    private TextView typing, empty, uploading;
    private static final int REQ_FILE = 711;
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

        typing = a instanceof PageActivity && ((PageActivity) a).subtitle != null ? ((PageActivity) a).subtitle : Ui.text(a, "", 12.5f, Ui.TEXT3, 400);

        scroll = new ScrollView(a);
        list = new LinearLayout(a);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setPadding(Ui.dp(a, 8), Ui.dp(a, 6), Ui.dp(a, 8), Ui.dp(a, 8));
        empty = Ui.muted(a, "טוען…");
        empty.setGravity(Gravity.CENTER);
        empty.setPadding(0, Ui.dp(a, 40), 0, 0);
        list.addView(empty, Ui.wide());
        scroll.addView(list);
        col.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        input = Ui.input(a, "כתבו הודעה…", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        LinearLayout bar = Bubbles.inputBar(a, input, v -> send());
        Bubbles.addFieldIcon(bar, R.drawable.ic_attach, "צירוף קובץ", v -> pickFile());
        uploading = Ui.text(a, "", 13, Ui.ACCENT, 500);
        uploading.setPadding(Ui.dp(a, 18), Ui.dp(a, 4), Ui.dp(a, 18), 0);
        uploading.setVisibility(View.GONE);
        col.addView(uploading);
        col.addView(bar);
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
            typing.setTextColor(adminTyping ? Ui.c("#00a884") : Ui.TEXT3);
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
            TextView hello = Ui.text(a, "👋 שלום! כתבו לנו כאן כל שאלה או שלחו קובץ, והצוות יענה בהקדם.", 13.5f, Ui.dark ? Ui.c("#ffd279") : Ui.c("#54656f"), 500);
            hello.setGravity(Gravity.CENTER);
            hello.setPadding(Ui.dp(a, 16), Ui.dp(a, 10), Ui.dp(a, 16), Ui.dp(a, 10));
            hello.setBackground(Ui.round(Ui.dark ? Ui.c("#182229") : Ui.c("#fff3c4"), Ui.dp(a, 10)));
            LinearLayout.LayoutParams hp = Ui.wide(a, 24, 0);
            hp.leftMargin = hp.rightMargin = Ui.dp(a, 24);
            list.addView(hello, hp);
        }
        String lastDay = "";
        for (int i = 0; i < n; i++) {
            JSONObject m = arr.optJSONObject(i);
            String at = m.optString("createdAt");
            String day = at.length() >= 10 ? at.substring(0, 10) : "";
            if (!day.equals(lastDay)) {
                lastDay = day;
                list.addView(Bubbles.bubble(a, false, null, 0, dayLabel(day), "", null, null, null, true));
            }
            boolean mine = "user".equals(m.optString("sender"));
            JSONObject file = m.optJSONObject("file");
            long id = m.optLong("id");
            boolean image = file != null && file.optString("type").startsWith("image/") && file.optBoolean("available", true);
            String fileName = file == null ? null : (image ? null : fileLabel(file));
            View.OnClickListener open = file == null ? null : v -> openFile(id, file);
            String status = mine ? (m.optBoolean("isRead") ? "✓✓" : "✓") : null;
            String text = m.optBoolean("isDeleted") ? "ההודעה נמחקה" : m.optString("text", "");
            View row = Bubbles.bubble(a, mine, mine ? null : "צוות סלומון", Ui.ACCENT, text, Fmt.time(at), status, fileName, open, false);
            if (image) addPicture(row, mine, file, open);
            list.addView(row);
        }
        scroll.post(() -> scroll.fullScroll(View.FOCUS_DOWN));
    }

    /** "היום" / "אתמול" / weekday / date, like WhatsApp's date chips. */
    static String dayLabel(String ymd) {
        try {
            java.text.SimpleDateFormat f = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US);
            java.util.Date d = f.parse(ymd);
            String today = f.format(new java.util.Date());
            String yest = f.format(new java.util.Date(System.currentTimeMillis() - 86400000L));
            if (ymd.equals(today)) return "היום";
            if (ymd.equals(yest)) return "אתמול";
            if (System.currentTimeMillis() - d.getTime() < 6 * 86400000L) {
                String[] days = {"יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "שבת"};
                java.util.Calendar c = java.util.Calendar.getInstance();
                c.setTime(d);
                return days[c.get(java.util.Calendar.DAY_OF_WEEK) - 1];
            }
            return new java.text.SimpleDateFormat("dd.MM.yyyy", java.util.Locale.US).format(d);
        } catch (Exception e) {
            return ymd;
        }
    }

    private static String fileLabel(JSONObject f) {
        String t = f.optString("type");
        String icon = t.startsWith("audio/") ? "🎧 " : t.startsWith("video/") ? "🎬 " : t.contains("pdf") ? "📄 " : "";
        long size = f.optLong("size");
        String sz = size <= 0 ? "" : size < 1024 * 1024 ? "  ·  " + Math.max(1, size / 1024) + "KB" : String.format(java.util.Locale.US, "  ·  %.1fMB", size / 1048576.0);
        return icon + f.optString("name", "קובץ") + sz;
    }

    /** A picture inside the bubble (like WhatsApp); tap = full screen. */
    private void addPicture(View row, boolean mine, JSONObject file, View.OnClickListener open) {
        if (!(row instanceof LinearLayout) || ((LinearLayout) row).getChildCount() == 0) return;
        View inner = ((LinearLayout) row).getChildAt(0);
        if (!(inner instanceof LinearLayout)) return;
        LinearLayout b = (LinearLayout) inner;
        android.widget.ImageView img = new android.widget.ImageView(a);
        img.setScaleType(android.widget.ImageView.ScaleType.CENTER_CROP);
        img.setBackground(Ui.round(Ui.dark ? 0x22FFFFFF : 0x11000000, Ui.dp(a, 12)));
        img.setClipToOutline(true);
        img.setOnClickListener(open);
        int w = Ui.dp(a, 230);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(w, Ui.dp(a, 230));
        lp.bottomMargin = Ui.dp(a, 4);
        lp.topMargin = Ui.dp(a, 2);
        b.addView(img, mine ? 0 : Math.min(1, b.getChildCount()), lp);
        String thumb = file.optString("thumbUrl", "");
        Images.load(img, thumb.isEmpty() ? file.optString("url", "") : thumb, w);
    }

    private void openFile(long messageId, JSONObject file) {
        String url = file.optString("url", "");
        if (url.startsWith("http")) {
            show(file, url);
            return;
        }
        JSONObject b = new JSONObject();
        try { b.put("messageId", messageId); } catch (Exception ignored) { }
        Api.post("/chat/file-link", b, r -> {
            String u = r.data.optString("url", "");
            if (r.ok && !u.isEmpty()) show(file, u.startsWith("http") ? u : "https://smti.uk" + u);
            else Toast.makeText(a, r.ok ? "לא ניתן לפתוח את הקובץ" : r.error, Toast.LENGTH_SHORT).show();
        });
    }

    private void show(JSONObject file, String url) {
        if (file.optString("type").startsWith("image/")) Images.view(a, url);
        else Images.download(a, url, file.optString("name", "file"));
    }

    // ---------------------------------------------------------------- sending files

    private void pickFile() {
        Intent i = new Intent(Intent.ACTION_GET_CONTENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE);
        try {
            a.startActivityForResult(Intent.createChooser(i, "בחירת קובץ"), REQ_FILE);
        } catch (Exception e) {
            Toast.makeText(a, "לא נמצאה אפליקציה לבחירת קבצים", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onActivityResult(int code, int result, Intent data) {
        if (code != REQ_FILE || result != android.app.Activity.RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        String name = "file", mime = a.getContentResolver().getType(uri);
        long size = -1;
        try (android.database.Cursor c = a.getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int ni = c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME), si = c.getColumnIndex(android.provider.OpenableColumns.SIZE);
                if (ni >= 0) name = c.getString(ni);
                if (si >= 0) size = c.getLong(si);
            }
        } catch (Exception ignored) { }
        if (size > 20L * 1024 * 1024) {
            Toast.makeText(a, "הקובץ גדול מדי (עד 20MB)", Toast.LENGTH_LONG).show();
            return;
        }
        final String fName = name, fMime = mime == null ? "application/octet-stream" : mime;
        String caption = input.getText().toString().trim();
        new android.app.AlertDialog.Builder(a)
                .setTitle("לשלוח לצוות?")
                .setMessage("📎 " + fName + (caption.isEmpty() ? "" : "\n\nעם ההודעה: " + caption))
                .setPositiveButton("שליחה", (d, w) -> upload(uri, fName, fMime, caption))
                .setNegativeButton("ביטול", null)
                .show();
    }

    private void upload(Uri uri, String name, String mime, String caption) {
        uploading.setText("שולח את " + name + "…");
        uploading.setVisibility(View.VISIBLE);
        new Thread(() -> {
            java.io.File tmp = new java.io.File(a.getCacheDir(), "chat-upload");
            try (java.io.InputStream in = a.getContentResolver().openInputStream(uri); java.io.OutputStream out = new java.io.FileOutputStream(tmp)) {
                byte[] buf = new byte[65536];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            } catch (Exception e) {
                h.post(() -> {
                    uploading.setVisibility(View.GONE);
                    Toast.makeText(a, "לא ניתן לקרוא את הקובץ", Toast.LENGTH_SHORT).show();
                });
                return;
            }
            java.util.Map<String, String> f = new java.util.HashMap<>();
            if (!caption.isEmpty()) f.put("text", caption);
            h.post(() -> Api.uploadTo("/chat/send-file", tmp, name, mime, f, r -> {
                uploading.setVisibility(View.GONE);
                tmp.delete();
                if (!r.ok) {
                    Toast.makeText(a, r.error, Toast.LENGTH_LONG).show();
                    return;
                }
                if (!caption.isEmpty() && caption.equals(input.getText().toString().trim())) input.setText("");
                Toast.makeText(a, "הקובץ נשלח ✓", Toast.LENGTH_SHORT).show();
                load(true);
            }));
        }).start();
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
