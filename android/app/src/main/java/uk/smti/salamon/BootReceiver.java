package uk.smti.salamon;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Makes sure the background check is scheduled after a restart or an update. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        Store.init(ctx);
        App.schedulePoll(ctx);
    }
}
