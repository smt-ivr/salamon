package uk.smti.salamon;

import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/** Everyone registered in the system, with search. Managers also see phone numbers. */
public class MembersPage extends Page {

    private final List<JSONObject> all = new ArrayList<>(), shown = new ArrayList<>();
    private TextView count;
    private android.widget.BaseAdapter adapter;
    private boolean phones;

    public MembersPage(android.app.Activity a) {
        super(a);
    }

    @Override
    protected View build() {
        LinearLayout col = new LinearLayout(a);
        col.setOrientation(LinearLayout.VERTICAL);

        LinearLayout top = new LinearLayout(a);
        top.setOrientation(LinearLayout.VERTICAL);
        top.setPadding(Ui.dp(a, 14), Ui.dp(a, 10), Ui.dp(a, 14), Ui.dp(a, 6));
        LinearLayout search = new LinearLayout(a);
        search.setGravity(Gravity.CENTER_VERTICAL);
        search.setBackground(Ui.round(Ui.CARD, Ui.dp(a, 24), Ui.LINE, Ui.dp(a, 1)));
        search.setPadding(Ui.dp(a, 14), 0, Ui.dp(a, 8), 0);
        ImageView si = new ImageView(a);
        si.setImageResource(R.drawable.ic_search);
        si.setColorFilter(Ui.TEXT3, android.graphics.PorterDuff.Mode.SRC_IN);
        search.addView(si, new LinearLayout.LayoutParams(Ui.dp(a, 20), Ui.dp(a, 20)));
        EditText q = new EditText(a);
        q.setHint("חיפוש שם…");
        q.setInputType(InputType.TYPE_CLASS_TEXT);
        q.setBackground(null);
        q.setTextSize(15);
        q.setTextColor(Ui.TEXT);
        q.setHintTextColor(Ui.TEXT3);
        q.setTypeface(Ui.font(400));
        q.setSingleLine(true);
        q.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int a1, int b, int c) { }
            public void onTextChanged(CharSequence s, int a1, int b, int c) { filter(s.toString()); }
            public void afterTextChanged(Editable e) { }
        });
        search.addView(q, new LinearLayout.LayoutParams(0, Ui.dp(a, 46), 1));
        top.addView(search);
        count = Ui.text(a, "טוען את רשימת המשתתפים…", 13, Ui.TEXT3, 500);
        count.setPadding(Ui.dp(a, 6), Ui.dp(a, 10), Ui.dp(a, 6), 0);
        top.addView(count);
        col.addView(top);

        ListView lv = new ListView(a);
        lv.setDivider(null);
        lv.setClipToPadding(false);
        lv.setPadding(0, 0, 0, Ui.dp(a, 16));
        lv.setFastScrollEnabled(true);
        adapter = new android.widget.BaseAdapter() {
            public int getCount() { return shown.size(); }
            public Object getItem(int i) { return shown.get(i); }
            public long getItemId(int i) { return i; }

            public View getView(int i, View v, ViewGroup parent) {
                Row r = v == null ? new Row() : (Row) v.getTag();
                JSONObject m = shown.get(i);
                String name = m.optString("name");
                r.bind(name, phones ? m.optString("phone") : null);
                return r.root;
            }
        };
        lv.setAdapter(adapter);
        col.addView(lv, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        return col;
    }

    private final class Row {
        final LinearLayout root = new LinearLayout(a);
        final LinearLayout avatarBox = new LinearLayout(a);
        final TextView name = Ui.text(a, "", 15.5f, Ui.TEXT, 500);
        final TextView sub = Ui.text(a, "", 12.5f, Ui.TEXT3, 400);

        Row() {
            root.setGravity(Gravity.CENTER_VERTICAL);
            root.setPadding(Ui.dp(a, 16), Ui.dp(a, 8), Ui.dp(a, 16), Ui.dp(a, 8));
            root.addView(avatarBox, new LinearLayout.LayoutParams(Ui.dp(a, 42), Ui.dp(a, 42)));
            LinearLayout t = new LinearLayout(a);
            t.setOrientation(LinearLayout.VERTICAL);
            t.setPadding(Ui.dp(a, 12), 0, 0, 0);
            t.addView(name);
            t.addView(sub);
            sub.setTextDirection(View.TEXT_DIRECTION_RTL);
            root.addView(t, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
            root.setTag(this);
        }

        void bind(String n, String phone) {
            avatarBox.removeAllViews();
            avatarBox.addView(Ui.avatar(a, n, 42));
            name.setText(n);
            sub.setVisibility(phone == null || phone.isEmpty() ? View.GONE : View.VISIBLE);
            if (phone != null) sub.setText(phone);
        }
    }

    @Override
    public void onShow() {
        if (!all.isEmpty()) return;
        Api.post("/app/members", new JSONObject(), r -> {
            if (!r.ok) {
                count.setText(r.error);
                return;
            }
            phones = r.data.optBoolean("withPhones");
            JSONArray arr = r.data.optJSONArray("members");
            all.clear();
            for (int i = 0; arr != null && i < arr.length(); i++) all.add(arr.optJSONObject(i));
            filter("");
        });
    }

    private void filter(String q) {
        q = q.trim();
        shown.clear();
        for (JSONObject m : all) {
            if (q.isEmpty() || m.optString("name").contains(q) || m.optString("phone").contains(q)) shown.add(m);
        }
        count.setText(q.isEmpty() ? all.size() + " משתתפים רשומים" : shown.size() + " מתוך " + all.size());
        if (adapter != null) adapter.notifyDataSetChanged();
    }
}
