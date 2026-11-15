package uk.smti.salamon;

import android.Manifest;
import android.app.Dialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.graphics.drawable.ColorDrawable;
import android.media.MediaRecorder;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Voice messages: the list with playback, recording and sending, and the tzintuk button. */
public class FeedPage extends Page {

    private static final int REQ_MIC = 31;
    private static final int PAGE_SIZE = 30;

    private LinearLayout list;
    private TextView empty;
    private Button more;
    private final List<JSONObject> items = new ArrayList<>();
    private final Map<String, ImageView> playButtons = new HashMap<>();
    private int page = 1;
    private boolean loading;
    private final Handler h = new Handler(Looper.getMainLooper());
    private final Runnable auto = () -> {
        refresh(true);
        scheduleAuto();
    };

    public FeedPage(MainActivity a) {
        super(a);
    }

    @Override
    protected View build() {
        ScrollView scroll = new ScrollView(a);
        scroll.setClipToPadding(false);
        LinearLayout col = new LinearLayout(a);
        col.setOrientation(LinearLayout.VERTICAL);
        int p = Ui.dp(a, 16);
        col.setPadding(p, Ui.dp(a, 4), p, Ui.dp(a, 24));
        scroll.addView(col);

        // actions
        JSONObject f = Store.config().optJSONObject("features");
        boolean canRecord = (f == null || f.optBoolean("record", true)) && Store.user().optBoolean("canRecord", true);
        boolean canTz = (f == null || f.optBoolean("tzintuk", true)) && Store.user().optBoolean("canTzintuk", true);
        if (canRecord || canTz) {
            LinearLayout actions = new LinearLayout(a);
            actions.setGravity(Gravity.CENTER_VERTICAL);
            if (canRecord) {
                Button rec = Ui.button(a, "  הקלטת הודעה", true);
                rec.setCompoundDrawablesRelativeWithIntrinsicBounds(tinted(R.drawable.ic_mic, Color.WHITE), null, null, null);
                rec.setOnClickListener(v -> startRecording());
                actions.addView(rec, new LinearLayout.LayoutParams(0, Ui.dp(a, 54), 1));
            }
            if (canRecord && canTz) actions.addView(new View(a), new LinearLayout.LayoutParams(Ui.dp(a, 10), 1));
            if (canTz) {
                Button tz = Ui.button(a, "  צינתוק", false);
                tz.setCompoundDrawablesRelativeWithIntrinsicBounds(tinted(R.drawable.ic_bolt, Ui.WARN), null, null, null);
                tz.setOnClickListener(v -> tzintuk(tz));
                actions.addView(tz, new LinearLayout.LayoutParams(canRecord ? ViewGroup.LayoutParams.WRAP_CONTENT : 0, Ui.dp(a, 54), canRecord ? 0 : 1));
            }
            col.addView(actions, Ui.wide(a, 4, 14));
        }

        LinearLayout head = new LinearLayout(a);
        head.setGravity(Gravity.CENTER_VERTICAL);
        head.addView(Ui.text(a, "הודעות קוליות", 18, Ui.TEXT, 700), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        ImageView refresh = new ImageView(a);
        refresh.setImageResource(R.drawable.ic_refresh);
        refresh.setColorFilter(Ui.TEXT3, PorterDuff.Mode.SRC_IN);
        int rp = Ui.dp(a, 8);
        refresh.setPadding(rp, rp, rp, rp);
        refresh.setBackground(Ui.ripple(null));
        refresh.setOnClickListener(v -> refresh(false));
        head.addView(refresh, new LinearLayout.LayoutParams(Ui.dp(a, 40), Ui.dp(a, 40)));
        col.addView(head, Ui.wide(a, 0, 6));

        list = new LinearLayout(a);
        list.setOrientation(LinearLayout.VERTICAL);
        col.addView(list, Ui.wide());

        empty = Ui.muted(a, "טוען הודעות…");
        empty.setGravity(Gravity.CENTER);
        empty.setPadding(0, Ui.dp(a, 30), 0, Ui.dp(a, 30));
        col.addView(empty, Ui.wide());

        more = Ui.button(a, "הודעות קודמות", false);
        more.setVisibility(View.GONE);
        more.setOnClickListener(v -> loadMore());
        col.addView(more, Ui.wide(a, 8, 0));
        return scroll;
    }

    private android.graphics.drawable.Drawable tinted(int res, int color) {
        android.graphics.drawable.Drawable d = a.getDrawable(res).mutate();
        d.setTint(color);
        d.setBounds(0, 0, Ui.dp(a, 20), Ui.dp(a, 20));
        return d;
    }

    @Override
    public void onShow() {
        refresh(!items.isEmpty());
        scheduleAuto();
    }

    @Override
    public void onHide() {
        h.removeCallbacks(auto);
    }

    private void scheduleAuto() {
        h.removeCallbacks(auto);
        h.postDelayed(auto, 30_000);
    }

    // ------------------------------------------------------------------ list

    private void refresh(boolean quiet) {
        if (loading) return;
        loading = true;
        if (!quiet && items.isEmpty()) empty.setText("טוען הודעות…");
        JSONObject b = new JSONObject();
        try {
            b.put("page", 1);
            b.put("filesLimit", PAGE_SIZE);
        } catch (Exception ignored) {
        }
        Api.post("/messages/list", b, r -> {
            loading = false;
            if (!r.ok) {
                if (items.isEmpty()) empty.setText(r.error);
                else if (!quiet) Toast.makeText(a, r.error, Toast.LENGTH_SHORT).show();
                return;
            }
            JSONArray arr = r.data.optJSONArray("messages");
            List<JSONObject> fresh = new ArrayList<>();
            if (arr != null) for (int i = 0; i < arr.length(); i++) fresh.add(arr.optJSONObject(i));
            page = 1;
            items.clear();
            items.addAll(fresh);
            render();
            more.setVisibility(fresh.size() >= PAGE_SIZE ? View.VISIBLE : View.GONE);
            if (!fresh.isEmpty()) {
                long newest = idNum(fresh.get(0));
                if (newest > Store.mark("feed")) Store.setMark("feed", newest);
                Notifier.cancel(a, "salamon-feed");
            }
        });
    }

    private void loadMore() {
        if (loading) return;
        loading = true;
        more.setText("טוען…");
        JSONObject b = new JSONObject();
        try {
            b.put("page", page + 1);
            b.put("filesLimit", PAGE_SIZE);
        } catch (Exception ignored) {
        }
        Api.post("/messages/list", b, r -> {
            loading = false;
            more.setText("הודעות קודמות");
            if (!r.ok) return;
            JSONArray arr = r.data.optJSONArray("messages");
            int n = arr == null ? 0 : arr.length();
            for (int i = 0; i < n; i++) items.add(arr.optJSONObject(i));
            page++;
            render();
            more.setVisibility(n >= PAGE_SIZE ? View.VISIBLE : View.GONE);
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

    private void render() {
        list.removeAllViews();
        playButtons.clear();
        empty.setVisibility(items.isEmpty() ? View.VISIBLE : View.GONE);
        if (items.isEmpty()) empty.setText(Store.user().optBoolean("canListen", true) ? "אין הודעות עדיין" : "ההאזנה להודעות לא פעילה בחשבון שלך");
        for (JSONObject m : items) list.addView(row(m), Ui.wide(a, 0, 10));
        playerChanged();
    }

    private View row(JSONObject m) {
        String id = fileId(m);
        String name = m.optString("valName", "הודעה");
        LinearLayout card = Ui.card(a);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(Ui.dp(a, 14), Ui.dp(a, 12), Ui.dp(a, 12), Ui.dp(a, 12));
        card.setForeground(Ui.ripple(null));
        card.setOnClickListener(v -> Player.play(a, id, name));

        card.addView(Ui.avatar(a, name, 44));

        LinearLayout texts = new LinearLayout(a);
        texts.setOrientation(LinearLayout.VERTICAL);
        texts.setPadding(Ui.dp(a, 12), 0, Ui.dp(a, 10), 0);
        LinearLayout top = new LinearLayout(a);
        top.setGravity(Gravity.CENTER_VERTICAL);
        top.addView(Ui.oneLine(Ui.text(a, name, 16, Ui.TEXT, 700)), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        boolean mine = m.optBoolean("isOutgoing");
        if (mine) top.addView(Ui.chip(a, "שלך", Ui.INFO, Ui.INFO_SOFT));
        else if (!m.optBoolean("heardByMe", true)) top.addView(Ui.chip(a, "חדש", Ui.GOOD, Ui.GOOD_SOFT));
        texts.addView(top);
        String dur = m.optString("durationStr", "");
        String sub = Fmt.when(m.optString("mtime", "")) + (dur.isEmpty() ? "" : "  ·  " + dur);
        texts.addView(Ui.text(a, sub, 13, Ui.TEXT3, 400));
        card.addView(texts, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));

        ImageView play = new ImageView(a);
        play.setImageResource(R.drawable.ic_play);
        play.setColorFilter(Color.WHITE, PorterDuff.Mode.SRC_IN);
        int pp = Ui.dp(a, 10);
        play.setPadding(pp, pp, pp, pp);
        play.setBackground(Ui.gradient(Ui.ACCENT, Ui.blend(Ui.ACCENT, Ui.ACCENT2, 0.3f), Ui.dp(a, 999)));
        play.setOnClickListener(v -> Player.play(a, id, name));
        card.addView(play, new LinearLayout.LayoutParams(Ui.dp(a, 44), Ui.dp(a, 44)));
        playButtons.put(id, play);
        return card;
    }

    /** The player changed: show pause on the message that is playing. */
    public void playerChanged() {
        for (Map.Entry<String, ImageView> e : playButtons.entrySet()) {
            boolean on = e.getKey().equals(Player.fileId) && (Player.isPlaying() || Player.preparing);
            e.getValue().setImageResource(on ? R.drawable.ic_pause : R.drawable.ic_play);
        }
    }

    // ------------------------------------------------------------------ tzintuk

    private void tzintuk(Button b) {
        b.setEnabled(false);
        Api.post("/messages/tzintuk", new JSONObject(), r -> {
            b.setEnabled(true);
            String msg = r.ok ? r.data.optString("message", "הצינתוק נשלח") : r.error;
            Toast.makeText(a, msg, Toast.LENGTH_LONG).show();
        });
    }

    // ------------------------------------------------------------------ recording

    private MediaRecorder recorder;
    private File recFile;
    private long recStart;
    private Dialog recDialog;
    private TextView recTime;
    private final Runnable recTick = new Runnable() {
        @Override
        public void run() {
            if (recorder == null || recTime == null) return;
            long ms = System.currentTimeMillis() - recStart;
            recTime.setText(Fmt.clock((int) ms));
            if (ms >= 5 * 60_000) stopRecording(true);
            else h.postDelayed(this, 250);
        }
    };

    private void startRecording() {
        if (a.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            a.requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
            return;
        }
        Player.stop();
        recFile = new File(a.getCacheDir(), "recording.m4a");
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
            recStart = System.currentTimeMillis();
        } catch (Exception e) {
            recorder = null;
            Toast.makeText(a, "לא ניתן להתחיל הקלטה", Toast.LENGTH_SHORT).show();
            return;
        }
        showRecordDialog();
        h.post(recTick);
    }

    private void showRecordDialog() {
        recDialog = new Dialog(a);
        recDialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        recDialog.setCancelable(false);
        LinearLayout box = Ui.card(a);
        box.setGravity(Gravity.CENTER_HORIZONTAL);
        box.setPadding(Ui.dp(a, 24), Ui.dp(a, 26), Ui.dp(a, 24), Ui.dp(a, 22));

        FrameLayout dot = new FrameLayout(a);
        ImageView mic = new ImageView(a);
        mic.setImageResource(R.drawable.ic_mic);
        mic.setColorFilter(Color.WHITE, PorterDuff.Mode.SRC_IN);
        dot.setBackground(Ui.circle(Ui.BAD));
        int mp = Ui.dp(a, 22);
        mic.setPadding(mp, mp, mp, mp);
        dot.addView(mic, new FrameLayout.LayoutParams(Ui.dp(a, 84), Ui.dp(a, 84)));
        box.addView(dot, new LinearLayout.LayoutParams(Ui.dp(a, 84), Ui.dp(a, 84)));
        dot.animate().scaleX(1.08f).scaleY(1.08f).setDuration(700).withEndAction(new Runnable() {
            boolean up = true;

            @Override
            public void run() {
                if (recorder == null) return;
                up = !up;
                dot.animate().scaleX(up ? 1.08f : 1f).scaleY(up ? 1.08f : 1f).setDuration(700).withEndAction(this).start();
            }
        }).start();

        TextView t = Ui.text(a, "מקליט…", 18, Ui.TEXT, 700);
        t.setGravity(Gravity.CENTER);
        box.addView(t, Ui.wide(a, 16, 0));
        recTime = Ui.text(a, "0:00", 34, Ui.TEXT, 700);
        recTime.setGravity(Gravity.CENTER);
        box.addView(recTime, Ui.wide());
        TextView hint = Ui.muted(a, "עד 5 דקות. בסיום לוחצים \"שליחה\".");
        hint.setGravity(Gravity.CENTER);
        box.addView(hint, Ui.wide(a, 0, 18));

        Button send = Ui.button(a, "שליחה", true);
        send.setOnClickListener(v -> stopRecording(true));
        box.addView(send, Ui.wide());
        Button cancel = Ui.button(a, "ביטול", false);
        cancel.setOnClickListener(v -> stopRecording(false));
        box.addView(cancel, Ui.wide(a, 10, 0));

        recDialog.setContentView(box);
        if (recDialog.getWindow() != null) {
            recDialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            recDialog.getWindow().setLayout((int) (a.getResources().getDisplayMetrics().widthPixels * 0.88), ViewGroup.LayoutParams.WRAP_CONTENT);
        }
        recDialog.show();
    }

    private void stopRecording(boolean send) {
        h.removeCallbacks(recTick);
        long ms = System.currentTimeMillis() - recStart;
        try {
            if (recorder != null) recorder.stop();
        } catch (Exception ignored) {
            send = false;
        }
        if (recorder != null) recorder.release();
        recorder = null;
        if (recDialog != null) recDialog.dismiss();
        recDialog = null;
        if (!send) return;
        if (ms < 1000) {
            Toast.makeText(a, "ההקלטה קצרה מדי", Toast.LENGTH_SHORT).show();
            return;
        }
        Toast.makeText(a, "שולח את ההודעה…", Toast.LENGTH_SHORT).show();
        Api.uploadRecording(recFile, r -> {
            Toast.makeText(a, r.ok ? "ההודעה נשלחה ✓" : r.error, Toast.LENGTH_LONG).show();
            if (r.ok) h.postDelayed(() -> refresh(true), 4000);
        });
    }

    public void onPermission(int code, int[] res) {
        if (code == REQ_MIC) {
            if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) startRecording();
            else Toast.makeText(a, "בלי הרשאת מיקרופון אי אפשר להקליט", Toast.LENGTH_LONG).show();
        }
    }

    public void onActivityResult(int code, int result, Intent data) {
    }
}
