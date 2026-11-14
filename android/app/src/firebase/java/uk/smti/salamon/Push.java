package uk.smti.salamon;

import android.content.Context;

import com.google.firebase.messaging.FirebaseMessaging;

/** The Firebase token the server uses to send notifications to this phone. */
public final class Push {
    public interface Callback { void onToken(String token); }

    private Push() {
    }

    public static void getToken(Context ctx, Callback cb) {
        try {
            FirebaseMessaging.getInstance().getToken()
                    .addOnCompleteListener(t -> cb.onToken(t.isSuccessful() && t.getResult() != null ? t.getResult() : ""));
        } catch (Exception e) {
            cb.onToken("");
        }
    }
}
