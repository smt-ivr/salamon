package uk.smti.salamon;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;

/** Every screen: asks for the phone's screen lock when the app comes to the front (if required). */
public abstract class BaseActivity extends Activity {

    private static final int REQ_LOCK = 901;
    static boolean asking;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Ui.init(this);
        getWindow().setStatusBarColor(Ui.HEADER);
        getWindow().setNavigationBarColor(Ui.HEADER);
        if (Build.VERSION.SDK_INT >= 23 && !Ui.dark) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                    | (Build.VERSION.SDK_INT >= 26 ? View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : 0));
        }
    }

    public static boolean lockRequired() {
        return Store.config().optBoolean("requireLock") || Store.lockByUser();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (!Store.loggedIn() || !lockRequired()) {
            App.lockPending = false;
            return;
        }
        if (!App.lockPending || asking) return;
        KeyguardManager km = getSystemService(KeyguardManager.class);
        if (km == null || !km.isDeviceSecure()) {
            App.lockPending = false;
            return;
        }
        Intent i = km.createConfirmDeviceCredentialIntent("עכשיו סלומון", "אישור כניסה לאפליקציה");
        if (i == null) {
            App.lockPending = false;
            return;
        }
        asking = true;
        getWindow().getDecorView().setVisibility(View.INVISIBLE);
        startActivityForResult(i, REQ_LOCK);
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code == REQ_LOCK) {
            asking = false;
            if (result == RESULT_OK) {
                App.lockPending = false;
                getWindow().getDecorView().setVisibility(View.VISIBLE);
            } else {
                moveTaskToBack(true);
            }
        }
    }
}
