package uk.smti.salamon;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;

/** Placeholder so the manifest entry resolves when the app is built without Firebase. */
public class PushService extends Service {
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
