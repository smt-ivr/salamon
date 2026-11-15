package uk.smti.salamon;

import android.app.Application;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;

public class App extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        Store.init(this);
        Ui.init(this);
        Notifier.createChannels(this);
        schedulePoll(this);
    }

    /** Background check every ~15 minutes (backup for push notifications). */
    public static void schedulePoll(Context ctx) {
        JobScheduler js = ctx.getSystemService(JobScheduler.class);
        if (js == null) return;
        if (js.getPendingJob(PollJob.ID) != null) return;
        JobInfo job = new JobInfo.Builder(PollJob.ID, new ComponentName(ctx, PollJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(15 * 60 * 1000L)
                .setPersisted(true)
                .build();
        js.schedule(job);
    }
}
