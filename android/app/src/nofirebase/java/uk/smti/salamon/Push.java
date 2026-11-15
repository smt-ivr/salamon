package uk.smti.salamon;

import android.content.Context;

/** Built without Firebase: no push token; the background check still runs. */
public final class Push {
    public interface Callback { void onToken(String token); }

    private Push() {
    }

    public static void getToken(Context ctx, Callback cb) {
        cb.onToken("");
    }
}
