package uk.smti.salamon;

import android.content.Context;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Chat bubbles and the message input, shared by the support chat and the groups. */
public final class Bubbles {

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
        row.setPadding(0, Ui.dp(ctx, 3), 0, Ui.dp(ctx, 3));
        if (system) {
            TextView t = Ui.text(ctx, text, 12.5f, Ui.TEXT3, 500);
            t.setGravity(Gravity.CENTER);
            t.setPadding(Ui.dp(ctx, 12), Ui.dp(ctx, 5), Ui.dp(ctx, 12), Ui.dp(ctx, 5));
            t.setBackground(Ui.round(Ui.BG2, Ui.dp(ctx, 999)));
            row.addView(t);
            return row;
        }
        LinearLayout b = new LinearLayout(ctx);
        b.setOrientation(LinearLayout.VERTICAL);
        b.setPadding(Ui.dp(ctx, 13), Ui.dp(ctx, 9), Ui.dp(ctx, 13), Ui.dp(ctx, 7));
        float r = Ui.dp(ctx, 18), small = Ui.dp(ctx, 5);
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        // RTL: "mine" sits on the right (start); its corner near the edge is small
        bg.setCornerRadii(mine ? new float[]{r, r, small, small, r, r, r, r} : new float[]{small, small, r, r, r, r, r, r});
        bg.setColor(mine ? (Ui.dark ? Ui.c("#14532d") : Ui.c("#dcf8e4")) : Ui.CARD);
        if (!mine) bg.setStroke(Math.max(1, Ui.dp(ctx, 1) / 2 + 0), Ui.LINE);
        b.setBackground(bg);
        if (sender != null && !sender.isEmpty() && !mine) {
            b.addView(Ui.text(ctx, sender, 13, senderColor, 700));
        }
        if (file != null) {
            LinearLayout f = new LinearLayout(ctx);
            f.setGravity(Gravity.CENTER_VERTICAL);
            f.setPadding(Ui.dp(ctx, 10), Ui.dp(ctx, 8), Ui.dp(ctx, 10), Ui.dp(ctx, 8));
            f.setBackground(Ui.round(Ui.dark ? 0x22FFFFFF : 0x0F000000, Ui.dp(ctx, 12)));
            ImageView ic = new ImageView(ctx);
            ic.setImageResource(R.drawable.ic_attach);
            ic.setColorFilter(Ui.ACCENT, PorterDuff.Mode.SRC_IN);
            f.addView(ic, new LinearLayout.LayoutParams(Ui.dp(ctx, 20), Ui.dp(ctx, 20)));
            TextView fn = Ui.oneLine(Ui.text(ctx, file, 14, Ui.TEXT, 500));
            fn.setPadding(Ui.dp(ctx, 8), 0, 0, 0);
            f.addView(fn);
            if (onFile != null) f.setOnClickListener(onFile);
            b.addView(f, Ui.wide(ctx, 2, 4));
        }
        if (text != null && !text.isEmpty()) {
            TextView t = Ui.text(ctx, text, 15.5f, Ui.TEXT, 400);
            t.setTextIsSelectable(true);
            b.addView(t);
        }
        TextView meta = Ui.text(ctx, time + (status == null ? "" : "  " + status), 11, Ui.TEXT3, 400);
        meta.setGravity(Gravity.END);
        b.addView(meta, Ui.wide());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        row.addView(b, lp);
        b.setMinimumWidth(Ui.dp(ctx, 80));
        int max = (int) (ctx.getResources().getDisplayMetrics().widthPixels * 0.8);
        b.post(() -> {
            if (b.getWidth() > max) {
                ViewGroup.LayoutParams p = b.getLayoutParams();
                p.width = max;
                b.setLayoutParams(p);
            }
        });
        return row;
    }

    /** Text field + round send button. */
    public static LinearLayout inputBar(Context ctx, EditText input, View.OnClickListener onSend) {
        LinearLayout bar = new LinearLayout(ctx);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(Ui.dp(ctx, 12), Ui.dp(ctx, 8), Ui.dp(ctx, 12), Ui.dp(ctx, 8));
        bar.setBackgroundColor(Ui.BG);
        input.setMaxLines(5);
        input.setBackground(Ui.round(Ui.CARD, Ui.dp(ctx, 24), Ui.LINE, Ui.dp(ctx, 1)));
        input.setPadding(Ui.dp(ctx, 16), Ui.dp(ctx, 10), Ui.dp(ctx, 16), Ui.dp(ctx, 10));
        bar.addView(input, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        FrameLayout send = new FrameLayout(ctx);
        send.setBackground(Ui.gradient(Ui.ACCENT, Ui.blend(Ui.ACCENT, Ui.ACCENT2, 0.3f), Ui.dp(ctx, 999)));
        ImageView ic = new ImageView(ctx);
        ic.setImageResource(R.drawable.ic_send);
        ic.setColorFilter(Color.WHITE, PorterDuff.Mode.SRC_IN);
        ic.setRotationY(180); // points left in RTL
        send.addView(ic, new FrameLayout.LayoutParams(Ui.dp(ctx, 22), Ui.dp(ctx, 22), Gravity.CENTER));
        send.setOnClickListener(onSend);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(Ui.dp(ctx, 48), Ui.dp(ctx, 48));
        sp.setMarginStart(Ui.dp(ctx, 8));
        bar.addView(send, sp);
        return bar;
    }

    public static int senderColor(String key) {
        int[] palette = {Ui.c("#16a34a"), Ui.c("#0284c7"), Ui.c("#7c3aed"), Ui.c("#ea580c"), Ui.c("#db2777"), Ui.c("#0d9488"), Ui.c("#2563eb")};
        return palette[Math.abs(key == null ? 0 : key.hashCode()) % palette.length];
    }
}
