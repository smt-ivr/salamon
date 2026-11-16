package uk.smti.salamon;

import android.content.Context;
import android.content.Intent;
import android.graphics.PorterDuff;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

/** A secondary screen with a back arrow: chat with management, groups, settings. */
public class PageActivity extends BaseActivity {

    public static final String EXTRA_PAGE = "page";
    public static final String EXTRA_GROUP = "group";

    private Page page;
    /** Status line under the title (the chat shows "typing…" here). */
    public TextView subtitle;
    private static PageActivity current;
    private static boolean foreground;
    private String kind;

    public static void open(Context ctx, String kind) {
        ctx.startActivity(new Intent(ctx, PageActivity.class).putExtra(EXTRA_PAGE, kind));
    }

    /** Is this screen (and group) open right now? Then a push for it is not shown. */
    public static boolean isShowing(String type, String groupId) {
        PageActivity p = current;
        if (p == null || !foreground) return false;
        if ("chat".equals(type)) return "chat".equals(p.kind);
        if ("group".equals(type)) return "groups".equals(p.kind) && p.page instanceof GroupsPage && ((GroupsPage) p.page).isOpen(groupId);
        return false;
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        current = this;
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        kind = getIntent().getStringExtra(EXTRA_PAGE);
        if (kind == null) kind = "settings";
        String title;
        switch (kind) {
            case "chat": page = new ChatPage(this); title = "צ׳אט עם ההנהלה"; break;
            case "groups": page = new GroupsPage(this); title = "קבוצות"; break;
            case "members": page = new MembersPage(this); title = "משתתפים"; break;
            default: page = new SettingsPage(this); title = "הגדרות"; break;
        }

        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        if ("settings".equals(kind) || "members".equals(kind)) col.setBackgroundColor(Ui.BG);
        else col.setBackground(Bubbles.wallpaper(this));

        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setBackgroundColor(Ui.HEADER);
        bar.setPadding(Ui.dp(this, 6), 0, Ui.dp(this, 16), 0);
        bar.setElevation(Ui.dp(this, 2));
        ImageView back = new ImageView(this);
        back.setImageResource(R.drawable.ic_back);
        back.setColorFilter(Ui.TEXT, PorterDuff.Mode.SRC_IN);
        back.setRotationY(180);
        int p = Ui.dp(this, 12);
        back.setPadding(p, p, p, p);
        back.setBackground(Ui.ripple(null));
        back.setContentDescription("חזרה");
        back.setOnClickListener(v -> onBackPressed());
        bar.addView(back, new LinearLayout.LayoutParams(Ui.dp(this, 48), Ui.dp(this, 48)));
        if ("chat".equals(kind)) {
            // like a WhatsApp conversation header: picture, name, status line
            bar.addView(Ui.avatar(this, "צוות סלומון", 40));
            LinearLayout tt = new LinearLayout(this);
            tt.setOrientation(LinearLayout.VERTICAL);
            tt.setPadding(Ui.dp(this, 10), 0, 0, 0);
            tt.addView(Ui.text(this, "צוות עכשיו סלומון", 16.5f, Ui.TEXT, 700));
            subtitle = Ui.text(this, "בדרך כלל עונים תוך זמן קצר", 12.5f, Ui.TEXT3, 400);
            tt.addView(subtitle);
            bar.addView(tt);
        } else {
            TextView t = Ui.text(this, title, 18, Ui.TEXT, 700);
            bar.addView(t);
        }
        col.addView(bar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, Ui.dp(this, 58)));

        FrameLayout content = new FrameLayout(this);
        content.addView(page.view());
        col.addView(content, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(col);

        String g = getIntent().getStringExtra(EXTRA_GROUP);
        if (g != null && page instanceof GroupsPage) ((GroupsPage) page).openGroup(g, null);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String g = intent.getStringExtra(EXTRA_GROUP);
        if (g != null && page instanceof GroupsPage) ((GroupsPage) page).openGroup(g, null);
    }

    @Override
    protected void onResume() {
        super.onResume();
        foreground = true;
        page.onShow();
    }

    @Override
    protected void onPause() {
        super.onPause();
        foreground = false;
        page.onHide();
    }

    @Override
    protected void onDestroy() {
        if (current == this) current = null;
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (!page.onBack()) finish();
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        page.onActivityResult(code, result, data);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (page instanceof SettingsPage) ((SettingsPage) page).refresh();
    }
}
