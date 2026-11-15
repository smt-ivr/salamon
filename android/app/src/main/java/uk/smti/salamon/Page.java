package uk.smti.salamon;

import android.app.Activity;
import android.view.View;

/** One tab of the app. */
public abstract class Page {
    protected final Activity a;
    private View view;

    protected Page(Activity a) {
        this.a = a;
    }

    public final View view() {
        if (view == null) view = build();
        return view;
    }

    protected abstract View build();

    /** Shown on screen (also when the app comes back to the front). */
    public void onShow() {
    }

    public void onHide() {
    }

    /** true = handled the back button. */
    public boolean onBack() {
        return false;
    }
}
