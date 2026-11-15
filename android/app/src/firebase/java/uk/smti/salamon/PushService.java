package uk.smti.salamon;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Receives pushes from the Salamon server. The server sends data-only messages
 * (title, body, tag, url), so they are shown the same way whether the app is open or closed.
 */
public class PushService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage msg) {
        Map<String, String> d = msg.getData();
        String title = d.get("title");
        String body = d.get("body");
        if (title == null && msg.getNotification() != null) {
            title = msg.getNotification().getTitle();
            body = msg.getNotification().getBody();
        }
        if (title == null) return;
        // While the app is on screen the page shows its own notifications; avoid doubles.
        if (MainActivity.isInForeground()) return;
        Notifier.show(this, title, body == null ? "" : body, d.get("tag"), d.get("url"));
    }

    @Override
    public void onNewToken(String token) {
        MainActivity.onPushToken(token);
    }
}
