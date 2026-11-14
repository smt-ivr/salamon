package uk.smti.salamon;

import android.content.Context;

/** Built without Firebase: no push token, so the server can't reach a closed app. */
public final class Push {
    public interface Callback { void onToken(String token); }

    private Push() {
    }

    public static void getToken(Context ctx, Callback cb) {
        cb.onToken("");
    }
}
