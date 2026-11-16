package uk.smti.salamon;

import android.content.Context;
import android.content.res.ColorStateList;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.text.InputType;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * The app's design system, matching the website (v2): Rubik font, the same colours,
 * rounded cards and soft shadows, light and dark mode.
 */
public final class Ui {

    private static Typeface regular, medium, bold;

    // colours (set by init() for light / dark)
    public static int BG, BG2, CARD, TEXT, TEXT2, TEXT3, LINE, ACCENT, ACCENT2, ACCENT_INK, ACCENT_SOFT,
            GOOD, GOOD_SOFT, WARN, WARN_SOFT, BAD, BAD_SOFT, INFO, INFO_SOFT, BRAND, NAVY,
            // classic site (WhatsApp style)
            HEADER, CHAT_BG, BUBBLE_IN, BUBBLE_OUT, PLAY_IN, PLAY_OUT, NAME_IN, NAME_OUT, META, TRACK;
    public static boolean dark;

    private Ui() {
    }

    public static void init(Context ctx) {
        dark = (ctx.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        if (regular == null) {
            try {
                regular = Typeface.createFromAsset(ctx.getAssets(), "fonts/rubik_regular.ttf");
                medium = Typeface.createFromAsset(ctx.getAssets(), "fonts/rubik_medium.ttf");
                bold = Typeface.createFromAsset(ctx.getAssets(), "fonts/rubik_bold.ttf");
            } catch (Exception e) {
                regular = Typeface.DEFAULT;
                medium = Typeface.DEFAULT_BOLD;
                bold = Typeface.DEFAULT_BOLD;
            }
        }
        ACCENT = c("#16a34a");
        ACCENT2 = c("#0ea5e9");
        ACCENT_INK = Color.WHITE;
        BRAND = c("#ea580c");
        NAVY = c("#0b1f3a");
        PLAY_IN = c("#0284c7");
        PLAY_OUT = c("#16a34a");
        if (dark) {
            HEADER = c("#202c33"); CHAT_BG = c("#0b141a"); BUBBLE_IN = c("#202c33"); BUBBLE_OUT = c("#005c4b");
            NAME_IN = c("#53bdeb"); NAME_OUT = c("#7ee0b0"); META = c("#8696a0"); TRACK = c("#3b4a54");
        } else {
            HEADER = c("#f0f2f5"); CHAT_BG = c("#efeae2"); BUBBLE_IN = Color.WHITE; BUBBLE_OUT = c("#dcf8c6");
            NAME_IN = c("#0f766e"); NAME_OUT = c("#027eb5"); META = c("#667781"); TRACK = c("#cbd5e1");
        }
        if (dark) {
            BG = c("#111b21"); BG2 = c("#182229"); CARD = c("#202c33");
            TEXT = c("#e9edef"); TEXT2 = c("#d1d7db"); TEXT3 = c("#8696a0"); LINE = c("#2a3942");
            GOOD = c("#34d399"); WARN = c("#fbbf24"); BAD = c("#fb7185"); INFO = c("#60a5fa");
            GOOD_SOFT = c("#1A34D399"); WARN_SOFT = c("#24F59E0B"); BAD_SOFT = c("#24F43F5E"); INFO_SOFT = c("#293B82F6");
            ACCENT_SOFT = c("#2616A34A");
        } else {
            BG = c("#f0f2f5"); BG2 = c("#e9edef"); CARD = Color.WHITE;
            TEXT = c("#111b21"); TEXT2 = c("#3b4a54"); TEXT3 = c("#54656f"); LINE = c("#d1d7db");
            GOOD = c("#16a34a"); WARN = c("#c2760c"); BAD = c("#dc2645"); INFO = c("#2563eb");
            GOOD_SOFT = c("#e8f7ee"); WARN_SOFT = c("#fff4e2"); BAD_SOFT = c("#fdecef"); INFO_SOFT = c("#e9f0ff");
            ACCENT_SOFT = c("#2116A34A");
        }
    }

    public static int c(String hex) {
        return Color.parseColor(hex);
    }

    public static Typeface font(int weight) {
        return weight >= 700 ? bold : weight >= 500 ? medium : regular;
    }

    public static int dp(Context ctx, float v) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, ctx.getResources().getDisplayMetrics()));
    }

    // ---------------------------------------------------------------- shapes

    public static GradientDrawable round(int fill, float radiusPx) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(fill);
        d.setCornerRadius(radiusPx);
        return d;
    }

    public static GradientDrawable round(int fill, float radiusPx, int strokeColor, int strokePx) {
        GradientDrawable d = round(fill, radiusPx);
        d.setStroke(strokePx, strokeColor);
        return d;
    }

    public static GradientDrawable circle(int fill) {
        GradientDrawable d = new GradientDrawable();
        d.setShape(GradientDrawable.OVAL);
        d.setColor(fill);
        return d;
    }

    public static GradientDrawable gradient(int from, int to, float radiusPx) {
        GradientDrawable d = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{from, to});
        d.setCornerRadius(radiusPx);
        return d;
    }

    public static Drawable ripple(Drawable content) {
        return new RippleDrawable(ColorStateList.valueOf(dark ? 0x33FFFFFF : 0x1F000000), content, content == null ? null : content);
    }

    // ---------------------------------------------------------------- views

    public static TextView text(Context ctx, CharSequence s, float sp, int color, int weight) {
        TextView t = new TextView(ctx);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setTypeface(font(weight));
        t.setTextDirection(View.TEXT_DIRECTION_FIRST_STRONG_RTL);
        t.setLineSpacing(0, 1.12f);
        return t;
    }

    public static TextView title(Context ctx, CharSequence s) {
        return text(ctx, s, 22, TEXT, 700);
    }

    public static TextView muted(Context ctx, CharSequence s) {
        return text(ctx, s, 13.5f, TEXT3, 400);
    }

    public static TextView oneLine(TextView t) {
        t.setSingleLine(true);
        t.setEllipsize(TextUtils.TruncateAt.END);
        return t;
    }

    /** White card with rounded corners, a hairline and a soft shadow. */
    public static LinearLayout card(Context ctx) {
        LinearLayout l = new LinearLayout(ctx);
        l.setOrientation(LinearLayout.VERTICAL);
        int p = dp(ctx, 16);
        l.setPadding(p, p, p, p);
        l.setBackground(round(CARD, dp(ctx, 18), LINE, Math.max(1, dp(ctx, 1) / 2 + 0)));
        l.setElevation(dark ? 0 : dp(ctx, 1.5f));
        return l;
    }

    public static Button button(Context ctx, CharSequence label, boolean primary) {
        Button b = new Button(ctx);
        b.setText(label);
        b.setAllCaps(false);
        b.setTextSize(16);
        b.setTypeface(font(700));
        b.setStateListAnimator(null);
        b.setMinHeight(dp(ctx, 50));
        b.setPadding(dp(ctx, 18), 0, dp(ctx, 18), 0);
        if (primary) {
            b.setTextColor(ACCENT_INK);
            b.setBackground(ripple(gradient(ACCENT, blend(ACCENT, ACCENT2, 0.28f), dp(ctx, 14))));
            b.setElevation(dp(ctx, 3));
        } else {
            b.setTextColor(TEXT);
            b.setBackground(ripple(round(CARD, dp(ctx, 14), LINE, dp(ctx, 1))));
        }
        return b;
    }

    public static EditText input(Context ctx, String hint, int inputType) {
        EditText e = new EditText(ctx);
        e.setHint(hint);
        e.setInputType(inputType == 0 ? InputType.TYPE_CLASS_TEXT : inputType);
        e.setTextSize(16);
        e.setTypeface(font(400));
        e.setTextColor(TEXT);
        e.setHintTextColor(TEXT3);
        e.setPadding(dp(ctx, 14), dp(ctx, 12), dp(ctx, 14), dp(ctx, 12));
        e.setBackground(round(dark ? BG2 : c("#f7f8fc"), dp(ctx, 14), LINE, dp(ctx, 1)));
        e.setMinHeight(dp(ctx, 50));
        return e;
    }

    /** Small rounded label, e.g. "חדש". */
    public static TextView chip(Context ctx, String s, int fg, int bg) {
        TextView t = text(ctx, s, 11.5f, fg, 700);
        t.setPadding(dp(ctx, 8), dp(ctx, 2), dp(ctx, 8), dp(ctx, 3));
        t.setBackground(round(bg, dp(ctx, 999)));
        return t;
    }

    /** Coloured circle with the first letter of a name. */
    public static TextView avatar(Context ctx, String name, int sizeDp) {
        String s = name == null || name.trim().isEmpty() ? "?" : name.trim().substring(0, 1);
        TextView t = text(ctx, s, sizeDp * 0.42f, Color.WHITE, 700);
        t.setGravity(Gravity.CENTER);
        int[] palette = {c("#16a34a"), c("#0ea5e9"), c("#7c3aed"), c("#ea580c"), c("#db2777"), c("#0d9488"), c("#2563eb")};
        int h = name == null ? 0 : Math.abs(name.hashCode());
        t.setBackground(circle(palette[h % palette.length]));
        t.setLayoutParams(new LinearLayout.LayoutParams(dp(ctx, sizeDp), dp(ctx, sizeDp)));
        return t;
    }

    public static View space(Context ctx, int dpH) {
        View v = new View(ctx);
        v.setLayoutParams(new LinearLayout.LayoutParams(1, dp(ctx, dpH)));
        return v;
    }

    public static LinearLayout.LayoutParams wide() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    public static LinearLayout.LayoutParams wide(Context ctx, int topDp, int bottomDp) {
        LinearLayout.LayoutParams lp = wide();
        lp.topMargin = dp(ctx, topDp);
        lp.bottomMargin = dp(ctx, bottomDp);
        return lp;
    }

    public static int blend(int a, int b, float t) {
        int r = (int) (Color.red(a) + (Color.red(b) - Color.red(a)) * t);
        int g = (int) (Color.green(a) + (Color.green(b) - Color.green(a)) * t);
        int bl = (int) (Color.blue(a) + (Color.blue(b) - Color.blue(a)) * t);
        return Color.rgb(r, g, bl);
    }

    // ------------------------------------------------------------------ premium icons

    /** Icon in a soft tinted circle with a fine ring, the icon in the deep tone (header buttons). */
    public static android.widget.FrameLayout iconChip(Context ctx, int iconRes, int hue, int sizeDp) {
        android.widget.FrameLayout f = new android.widget.FrameLayout(ctx);
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TL_BR,
                new int[]{withAlpha(hue, dark ? 0.30f : 0.20f), withAlpha(hue, dark ? 0.14f : 0.07f)});
        bg.setShape(GradientDrawable.OVAL);
        bg.setStroke(Math.max(1, dp(ctx, 1)), withAlpha(hue, dark ? 0.40f : 0.22f));
        f.setBackground(new android.graphics.drawable.RippleDrawable(android.content.res.ColorStateList.valueOf(withAlpha(hue, 0.25f)), bg, null));
        android.widget.ImageView ic = new android.widget.ImageView(ctx);
        ic.setImageResource(iconRes);
        ic.setColorFilter(dark ? blend(hue, Color.WHITE, 0.25f) : blend(hue, Color.BLACK, 0.15f), android.graphics.PorterDuff.Mode.SRC_IN);
        int icon = Math.round(sizeDp * 0.5f);
        f.addView(ic, new android.widget.FrameLayout.LayoutParams(dp(ctx, icon), dp(ctx, icon), Gravity.CENTER));
        return f;
    }

    /** Solid gradient tile with a white icon and a soft shadow (menus, settings rows). */
    public static android.widget.FrameLayout iconTile(Context ctx, int iconRes, int hue, int sizeDp) {
        android.widget.FrameLayout f = new android.widget.FrameLayout(ctx);
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{blend(hue, Color.WHITE, 0.18f), blend(hue, Color.BLACK, 0.18f)});
        bg.setCornerRadius(dp(ctx, sizeDp * 0.32f));
        f.setBackground(bg);
        f.setElevation(dp(ctx, 3));
        android.widget.ImageView ic = new android.widget.ImageView(ctx);
        ic.setImageResource(iconRes);
        ic.setColorFilter(Color.WHITE, android.graphics.PorterDuff.Mode.SRC_IN);
        int icon = Math.round(sizeDp * 0.54f);
        f.addView(ic, new android.widget.FrameLayout.LayoutParams(dp(ctx, icon), dp(ctx, icon), Gravity.CENTER));
        return f;
    }

    public static int withAlpha(int color, float a) {
        return (Math.round(a * 255) << 24) | (color & 0x00FFFFFF);
    }

    // the app's icon palette
    public static final int HUE_GREEN = 0xFF16A34A, HUE_BLUE = 0xFF0284C7, HUE_TEAL = 0xFF0D9488, HUE_AMBER = 0xFFD97706,
            HUE_VIOLET = 0xFF7C3AED, HUE_ROSE = 0xFFE11D48, HUE_SLATE = 0xFF475569, HUE_GOLD = 0xFFB8860B, HUE_INDIGO = 0xFF4F46E5;

    /** A row of a sheet / settings: tile + title + subtitle. */
    public static LinearLayout iconRow(Context ctx, int iconRes, int hue, String title, String subtitle) {
        LinearLayout row = new LinearLayout(ctx);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(ctx, 16), dp(ctx, 10), dp(ctx, 16), dp(ctx, 10));
        row.setBackground(ripple(null));
        row.addView(iconTile(ctx, iconRes, hue, 40), new LinearLayout.LayoutParams(dp(ctx, 40), dp(ctx, 40)));
        LinearLayout t = new LinearLayout(ctx);
        t.setOrientation(LinearLayout.VERTICAL);
        t.setPadding(dp(ctx, 14), 0, 0, 0);
        t.addView(text(ctx, title, 15.5f, TEXT, 600));
        if (subtitle != null && !subtitle.isEmpty()) t.addView(text(ctx, subtitle, 12.5f, TEXT3, 400));
        row.addView(t, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        return row;
    }

    /** Bottom sheet with rounded top corners. */
    public static android.app.Dialog sheet(android.app.Activity a, String title, android.view.View content) {
        android.app.Dialog d = new android.app.Dialog(a);
        d.requestWindowFeature(android.view.Window.FEATURE_NO_TITLE);
        LinearLayout box = new LinearLayout(a);
        box.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable bg = new GradientDrawable();
        float r = dp(a, 22);
        bg.setCornerRadii(new float[]{r, r, r, r, 0, 0, 0, 0});
        bg.setColor(CARD);
        box.setBackground(bg);
        box.setPadding(0, dp(a, 10), 0, dp(a, 14));
        android.view.View grip = new android.view.View(a);
        grip.setBackground(round(LINE, dp(a, 3)));
        LinearLayout.LayoutParams gp = new LinearLayout.LayoutParams(dp(a, 40), dp(a, 5));
        gp.gravity = Gravity.CENTER_HORIZONTAL;
        gp.bottomMargin = dp(a, 8);
        box.addView(grip, gp);
        if (title != null) {
            TextView t = text(a, title, 17, TEXT, 700);
            t.setPadding(dp(a, 20), dp(a, 4), dp(a, 20), dp(a, 8));
            box.addView(t);
        }
        box.addView(content);
        d.setContentView(box);
        android.view.Window w = d.getWindow();
        if (w != null) {
            w.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
            w.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            w.setGravity(Gravity.BOTTOM);
            w.setWindowAnimations(android.R.style.Animation_InputMethod);
        }
        return d;
    }
}
