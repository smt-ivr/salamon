package uk.smti.salamon;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/** Notifications from the Salamon server. Data-only, so they look the same whether the app is open or closed. */
public class PushService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage msg) {
        Store.init(this);
        if (!Store.loggedIn()) return;
        Map<String, String> d = msg.getData();
        if (Commands.handle(this, d)) return;
        // delivery receipt: the control center sees that this phone really got the notification
        Commands.ack(this, d, null);
        String title = d.get("title");
        if (title == null) return;
        String type = d.get("type");
        // the screen the message belongs to is open right now: it updates itself, no notification
        if (MainActivity.isShowing(type, d.get("groupId"))) return;
        Notifier.show(this, type, title, d.get("body") == null ? "" : d.get("body"), d.get("tag"),
                "admin_chat".equals(type) ? d.get("phone") : d.get("groupId"), d.get("fileId"));
        if ("feed".equals(type) && d.get("fileId") != null) {
            try { Store.setMark("feed", Long.parseLong(d.get("fileId"))); } catch (Exception ignored) { }
        }
    }

    @Override
    public void onNewToken(String token) {
        Store.init(this);
        Store.setPushToken(token);
        if (Store.loggedIn()) Sync.heartbeat(this, false, null);
    }
}
