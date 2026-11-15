package uk.smti.salamon;

import android.content.Context;

import com.google.firebase.messaging.FirebaseMessaging;

/** The Firebase token the server uses to reach this phone. */
public final class Push {
    public interface Callback { void onToken(String token); }

    private Push() {
    }

    public static void getToken(Context ctx, Callback cb) {
        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(t -> {
                String tok = t.isSuccessful() && t.getResult() != null ? t.getResult() : "";
                if (!tok.isEmpty()) Store.setPushToken(tok);
                cb.onToken(tok);
            });
        } catch (Exception e) {
            cb.onToken("");
        }
    }
}
