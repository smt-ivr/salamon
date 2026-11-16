package uk.smti.salamon;

import android.app.job.JobParameters;
import android.app.job.JobService;

import org.json.JSONObject;

/**
 * Every ~15 minutes: asks the server what is new. Only notifies when push notifications
 * are not working (not configured on the server, or no push token on this phone),
 * so nobody gets the same notification twice.
 */
public class PollJob extends JobService {

    public static final int ID = 7101;

    @Override
    public boolean onStartJob(JobParameters params) {
        Store.init(this);
        if (!Store.loggedIn()) return false;
        new Thread(() -> {
            try {
                boolean pushWorks = Store.config().optBoolean("pushConfigured") && !Store.pushToken().isEmpty();
                JSONObject pb = new JSONObject();
                try { pb.put("pushToken", Store.pushToken()); } catch (Exception ignored) { }
                Api.Result r = Api.postNow("/app/poll", pb);
                if (r.ok) {
                    org.json.JSONArray pending = r.data.optJSONArray("pending");
                    if (pending != null && pending.length() > 0) {
                        new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> Commands.runPending(this, pending, App.topActivity()));
                    }
                    long feed = r.data.optLong("feedNewest");
                    long chatLast = r.data.optLong("chatLast"), groupsLast = r.data.optLong("groupsLast");
                    int chatUnread = r.data.optInt("chatUnread"), groupsUnread = r.data.optInt("groupsUnread");
                    if (!pushWorks) {
                        long seenFeed = Store.mark("feed");
                        if (seenFeed > 0 && feed > seenFeed && Store.notify("feed"))
                            Notifier.show(this, "feed", "עכשיו סלומון", "יש הודעה קולית חדשה", "salamon-feed", null, String.valueOf(feed));
                        if (chatUnread > 0 && chatLast > Store.mark("chat") && Store.notify("chat"))
                            Notifier.show(this, "chat", "תשובה חדשה מהצוות", chatUnread == 1 ? "יש הודעה חדשה בצ׳אט" : chatUnread + " הודעות חדשות בצ׳אט", "salamon-chat", null, null);
                        if (groupsUnread > 0 && groupsLast > Store.mark("groups") && Store.notify("groups"))
                            Notifier.show(this, "group", "קבוצות", groupsUnread == 1 ? "הודעה חדשה בקבוצה" : groupsUnread + " הודעות חדשות בקבוצות", "salamon-groups", null, null);
                    }
                    if (feed > 0) Store.setMark("feed", Math.max(feed, Store.mark("feed")));
                    if (chatLast > 0) Store.setMark("chat", chatLast);
                    if (groupsLast > 0) Store.setMark("groups", groupsLast);
                }
            } finally {
                jobFinished(params, false);
            }
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }
}
