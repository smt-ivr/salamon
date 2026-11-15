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
            GOOD, GOOD_SOFT, WARN, WARN_SOFT, BAD, BAD_SOFT, INFO, INFO_SOFT, BRAND, NAVY;
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
        if (dark) {
            BG = c("#0a0f1c"); BG2 = c("#0f1626"); CARD = c("#121a2c");
            TEXT = c("#eef2fb"); TEXT2 = c("#b7c1d6"); TEXT3 = c("#7d89a3"); LINE = c("#222d45");
            GOOD = c("#34d399"); WARN = c("#fbbf24"); BAD = c("#fb7185"); INFO = c("#60a5fa");
            GOOD_SOFT = c("#1A34D399"); WARN_SOFT = c("#24F59E0B"); BAD_SOFT = c("#24F43F5E"); INFO_SOFT = c("#293B82F6");
            ACCENT_SOFT = c("#2616A34A");
        } else {
            BG = c("#f4f6fb"); BG2 = c("#eceff6"); CARD = Color.WHITE;
            TEXT = c("#0d1324"); TEXT2 = c("#3c465c"); TEXT3 = c("#7a849a"); LINE = c("#e4e8f0");
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
}
