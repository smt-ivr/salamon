package uk.smti.salamon;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PixelFormat;
import android.graphics.PorterDuff;
import android.graphics.RectF;
import android.graphics.drawable.Drawable;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

/** WhatsApp-style chat bubbles, wallpaper and message input, shared by the support chat and the groups. */
public final class Bubbles {

    public static final int TICK_READ = 0xFF53BDEB;

    private Bubbles() {
    }

    /**
     * @param mine   my message (right side, green)
     * @param sender name shown above the text (groups), or null
     * @param file   file name, or null
     */
    public static View bubble(Context ctx, boolean mine, String sender, int senderColor, String text, String time,
                              String status, String file, View.OnClickListener onFile, boolean system) {
        LinearLayout row = new LinearLayout(ctx);
        row.setGravity(system ? Gravity.CENTER : (mine ? Gravity.START : Gravity.END));
        row.setPadding(0, Ui.dp(ctx, 2), 0, Ui.dp(ctx, 2));
        if (system) {
            // date chip, like WhatsApp
            TextView t = Ui.text(ctx, text, 12.5f, Ui.dark ? Ui.c("#8696a0") : Ui.c("#54656f"), 500);
            t.setGravity(Gravity.CENTER);
            t.setPadding(Ui.dp(ctx, 12), Ui.dp(ctx, 5), Ui.dp(ctx, 12), Ui.dp(ctx, 5));
            t.setBackground(Ui.round(Ui.dark ? Ui.c("#182229") : Ui.c("#ffffff"), Ui.dp(ctx, 8)));
            t.setElevation(Ui.dp(ctx, 1));
            row.setPadding(0, Ui.dp(ctx, 8), 0, Ui.dp(ctx, 8));
            row.addView(t);
            return row;
        }
        int tail = Ui.dp(ctx, 8);
        LinearLayout b = new LinearLayout(ctx);
        b.setOrientation(LinearLayout.VERTICAL);
        // RTL: "mine" is on the right, the tail points right
        boolean tailRight = mine;
        b.setPadding(Ui.dp(ctx, 9) + (tailRight ? 0 : tail), Ui.dp(ctx, 6), Ui.dp(ctx, 9) + (tailRight ? tail : 0), Ui.dp(ctx, 5));
        b.setBackground(new TailBubble(mine ? Ui.BUBBLE_OUT : Ui.BUBBLE_IN, Ui.dp(ctx, 9), tail, tailRight));
        b.setElevation(Ui.dp(ctx, 0.8f));
        if (sender != null && !sender.isEmpty() && !mine) {
            TextView s = Ui.text(ctx, sender, 13, senderColor, 700);
            s.setPadding(0, 0, 0, Ui.dp(ctx, 2));
            b.addView(s);
        }
        if (file != null) {
            LinearLayout f = new LinearLayout(ctx);
            f.setGravity(Gravity.CENTER_VERTICAL);
            f.setPadding(Ui.dp(ctx, 10), Ui.dp(ctx, 9), Ui.dp(ctx, 12), Ui.dp(ctx, 9));
            f.setBackground(Ui.round(Ui.dark ? 0x26000000 : 0x0D000000, Ui.dp(ctx, 8)));
            FrameLayout tile = Ui.iconTile(ctx, R.drawable.ic_file, Ui.HUE_BLUE, 36);
            tile.setElevation(0);
            f.addView(tile, new LinearLayout.LayoutParams(Ui.dp(ctx, 36), Ui.dp(ctx, 36)));
            TextView fn = Ui.text(ctx, file, 14, Ui.TEXT, 500);
            fn.setMaxLines(2);
            fn.setEllipsize(android.text.TextUtils.TruncateAt.MIDDLE);
            fn.setPadding(Ui.dp(ctx, 10), 0, 0, 0);
            f.addView(fn, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
            if (onFile != null) {
                f.setOnClickListener(onFile);
                f.setForeground(Ui.ripple(null));
            }
            b.addView(f, Ui.wide(ctx, 2, 4));
        }
        if (text != null && !text.isEmpty()) {
            TextView t = Ui.text(ctx, text, 15.5f, Ui.TEXT, 400);
            t.setTextIsSelectable(true);
            t.setLineSpacing(0, 1.08f);
            android.text.util.Linkify.addLinks(t, android.text.util.Linkify.WEB_URLS | android.text.util.Linkify.PHONE_NUMBERS);
            t.setLinkTextColor(Ui.dark ? TICK_READ : Ui.c("#027eb5"));
            b.addView(t);
        }
        // time + ticks, small, at the bottom corner
        String meta = time + (status == null ? "" : "  " + status);
        SpannableString sp = new SpannableString(meta);
        if (status != null && status.equals("✓✓")) {
            sp.setSpan(new ForegroundColorSpan(TICK_READ), meta.length() - 2, meta.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        }
        TextView m = Ui.text(ctx, sp, 11, Ui.META, 400);
        m.setGravity(Gravity.END);
        m.setPadding(Ui.dp(ctx, 16), Ui.dp(ctx, 1), 0, 0);
        b.addView(m, Ui.wide());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        if (mine) lp.setMarginEnd(Ui.dp(ctx, 40)); else lp.setMarginStart(Ui.dp(ctx, 40));
        row.addView(b, lp);
        b.setMinimumWidth(Ui.dp(ctx, 84));
        int max = (int) (ctx.getResources().getDisplayMetrics().widthPixels * 0.82);
        b.post(() -> {
            if (b.getWidth() > max) {
                ViewGroup.LayoutParams p = b.getLayoutParams();
                p.width = max;
                b.setLayoutParams(p);
            }
        });
        return row;
    }

    /** WhatsApp-style input: a rounded field (with room for icons inside) and a round green send button. */
    public static LinearLayout inputBar(Context ctx, EditText input, View.OnClickListener onSend) {
        LinearLayout bar = new LinearLayout(ctx);
        bar.setGravity(Gravity.BOTTOM);
        bar.setPadding(Ui.dp(ctx, 8), Ui.dp(ctx, 6), Ui.dp(ctx, 8), Ui.dp(ctx, 8));
        bar.setBackgroundColor(Color.TRANSPARENT);
        LinearLayout field = new LinearLayout(ctx);
        field.setGravity(Gravity.CENTER_VERTICAL);
        field.setBackground(Ui.round(Ui.dark ? Ui.c("#2a3942") : Color.WHITE, Ui.dp(ctx, 24)));
        field.setElevation(Ui.dp(ctx, 1));
        field.setMinimumHeight(Ui.dp(ctx, 48));
        field.setTag("field");
        input.setMaxLines(6);
        input.setBackground(null);
        input.setPadding(Ui.dp(ctx, 16), Ui.dp(ctx, 10), Ui.dp(ctx, 8), Ui.dp(ctx, 10));
        field.addView(input, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        bar.addView(field, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        FrameLayout send = new FrameLayout(ctx);
        send.setBackground(Ui.gradient(Ui.c("#00a884"), Ui.c("#008069"), Ui.dp(ctx, 999)));
        send.setElevation(Ui.dp(ctx, 2));
        send.setForeground(Ui.ripple(null));
        ImageView ic = new ImageView(ctx);
        ic.setImageResource(R.drawable.ic_send);
        ic.setColorFilter(Color.WHITE, PorterDuff.Mode.SRC_IN);
        ic.setRotationY(180); // points left in RTL
        send.addView(ic, new FrameLayout.LayoutParams(Ui.dp(ctx, 22), Ui.dp(ctx, 22), Gravity.CENTER));
        send.setOnClickListener(onSend);
        send.setContentDescription("שליחה");
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(Ui.dp(ctx, 48), Ui.dp(ctx, 48));
        sp.setMarginStart(Ui.dp(ctx, 6));
        bar.addView(send, sp);
        return bar;
    }

    /** Adds an icon button inside the rounded field of an input bar (at the end, like WhatsApp's 📎). */
    public static void addFieldIcon(LinearLayout bar, int iconRes, String label, View.OnClickListener l) {
        View fv = bar.findViewWithTag("field");
        if (!(fv instanceof LinearLayout)) return;
        Context ctx = bar.getContext();
        ImageView ic = new ImageView(ctx);
        ic.setImageResource(iconRes);
        ic.setColorFilter(Ui.META, PorterDuff.Mode.SRC_IN);
        int p = Ui.dp(ctx, 10);
        ic.setPadding(p, p, p, p);
        ic.setBackground(Ui.ripple(null));
        ic.setContentDescription(label);
        ic.setOnClickListener(l);
        ((LinearLayout) fv).addView(ic, new LinearLayout.LayoutParams(Ui.dp(ctx, 44), Ui.dp(ctx, 44)));
    }

    public static int senderColor(String key) {
        int[] palette = {Ui.c("#16a34a"), Ui.c("#0284c7"), Ui.c("#7c3aed"), Ui.c("#ea580c"), Ui.c("#db2777"), Ui.c("#0d9488"), Ui.c("#2563eb")};
        return palette[Math.abs(key == null ? 0 : key.hashCode()) % palette.length];
    }

    // ------------------------------------------------------------------ drawing

    /** Rounded bubble with the small pointed corner at the top, like WhatsApp. */
    static final class TailBubble extends Drawable {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final float r, tail;
        private final boolean right;
        private final Path path = new Path();

        TailBubble(int color, float radius, float tail, boolean right) {
            paint.setColor(color);
            this.r = radius;
            this.tail = tail;
            this.right = right;
        }

        @Override
        protected void onBoundsChange(android.graphics.Rect b) {
            path.reset();
            float l = b.left + (right ? 0 : tail), t = b.top, rr = b.right - (right ? tail : 0), bt = b.bottom;
            RectF body = new RectF(l, t, rr, bt);
            float[] radii = right ? new float[]{r, r, 0, 0, r, r, r, r} : new float[]{0, 0, r, r, r, r, r, r};
            path.addRoundRect(body, radii, Path.Direction.CW);
            Path tip = new Path();
            if (right) {
                tip.moveTo(rr - 1, t);
                tip.lineTo(b.right, t);
                tip.quadTo(b.right - tail * 0.35f, t + tail * 0.3f, rr - 1, t + tail * 1.25f);
            } else {
                tip.moveTo(l + 1, t);
                tip.lineTo(b.left, t);
                tip.quadTo(b.left + tail * 0.35f, t + tail * 0.3f, l + 1, t + tail * 1.25f);
            }
            tip.close();
            path.op(tip, Path.Op.UNION);
        }

        @Override
        public void draw(Canvas c) {
            c.drawPath(path, paint);
        }

        @Override
        public void getOutline(android.graphics.Outline outline) {
            android.graphics.Rect b = getBounds();
            outline.setRoundRect(b.left + (right ? 0 : (int) tail), b.top, b.right - (right ? (int) tail : 0), b.bottom, r);
        }

        @Override
        public void setAlpha(int a) {
            paint.setAlpha(a);
        }

        @Override
        public void setColorFilter(ColorFilter cf) {
            paint.setColorFilter(cf);
        }

        @Override
        public int getOpacity() {
            return PixelFormat.TRANSLUCENT;
        }
    }

    /** The chat wallpaper: the classic background with faint doodle icons. */
    public static Drawable wallpaper(Context ctx) {
        return new Wallpaper(ctx);
    }

    static final class Wallpaper extends Drawable {
        private final Drawable[] icons;
        private final int cell, size, bg;

        Wallpaper(Context ctx) {
            int[] res = {R.drawable.ic_chat, R.drawable.ic_bell, R.drawable.ic_mic, R.drawable.ic_megaphone, R.drawable.ic_headset, R.drawable.ic_phone, R.drawable.ic_groups};
            icons = new Drawable[res.length];
            int tint = Ui.dark ? 0x10FFFFFF : 0x12000000;
            for (int i = 0; i < res.length; i++) {
                icons[i] = ctx.getDrawable(res[i]).mutate();
                icons[i].setColorFilter(tint, PorterDuff.Mode.SRC_IN);
            }
            cell = Ui.dp(ctx, 64);
            size = Ui.dp(ctx, 20);
            bg = Ui.CHAT_BG;
        }

        @Override
        public void draw(Canvas c) {
            c.drawColor(bg);
            android.graphics.Rect b = getBounds();
            int n = 0;
            for (int y = b.top - cell / 2, row = 0; y < b.bottom + cell; y += cell, row++) {
                for (int x = b.left + (row % 2 == 0 ? 0 : cell / 2); x < b.right + cell; x += cell) {
                    Drawable d = icons[(n++ * 3 + row) % icons.length];
                    c.save();
                    c.rotate(((n * 37) % 50) - 25, x + size / 2f, y + size / 2f);
                    d.setBounds(x, y, x + size, y + size);
                    d.draw(c);
                    c.restore();
                }
            }
        }

        @Override
        public void setAlpha(int a) {
        }

        @Override
        public void setColorFilter(ColorFilter cf) {
        }

        @Override
        public int getOpacity() {
            return PixelFormat.OPAQUE;
        }
    }
}
