package uk.smti.salamon;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.PlaybackParams;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;

/** One shared player for voice messages (keeps playing while the screen is off). */
public final class Player {

    public interface Listener {
        void changed();
    }

    private static MediaPlayer mp;
    public static String fileId;
    public static String title = "";
    public static boolean preparing;
    public static Listener listener;
    private static final Handler h = new Handler(Looper.getMainLooper());
    private static final Runnable tick = new Runnable() {
        @Override
        public void run() {
            notifyChanged();
            if (isPlaying()) h.postDelayed(this, 400);
        }
    };

    private Player() {
    }

    public static void play(Context ctx, String id, String name) {
        if (id.equals(fileId) && mp != null && !preparing) {
            toggle();
            return;
        }
        stop();
        fileId = id;
        title = name == null ? "" : name;
        preparing = true;
        mp = new MediaPlayer();
        mp.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
        mp.setWakeMode(ctx.getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);
        try {
            mp.setDataSource(Api.streamUrl(id));
            mp.setOnPreparedListener(p -> {
                preparing = false;
                applySpeed();
                try { p.start(); } catch (Exception e) { stop(); return; }
                h.post(tick);
                notifyChanged();
            });
            mp.setOnCompletionListener(p -> notifyChanged());
            mp.setOnErrorListener((p, w, e) -> {
                preparing = false;
                stop();
                return true;
            });
            mp.prepareAsync();
        } catch (Exception e) {
            preparing = false;
            stop();
        }
        notifyChanged();
    }

    public static void toggle() {
        if (mp == null || preparing) return;
        try {
            if (mp.isPlaying()) mp.pause();
            else {
                mp.start();
                h.post(tick);
            }
        } catch (Exception e) {
            stop();
        }
        notifyChanged();
    }

    public static void seekBy(int ms) {
        if (mp == null || preparing) return;
        try { mp.seekTo(Math.max(0, Math.min(duration(), position() + ms))); } catch (Exception ignored) { }
        notifyChanged();
    }

    public static void seekTo(int ms) {
        if (mp == null || preparing) return;
        try { mp.seekTo(ms); } catch (Exception ignored) { }
        notifyChanged();
    }

    public static void cycleSpeed() {
        float[] speeds = {1f, 1.25f, 1.5f, 2f, 0.75f};
        float cur = Store.speed();
        int i = 0;
        for (int k = 0; k < speeds.length; k++) if (Math.abs(speeds[k] - cur) < 0.01) i = k;
        Store.setSpeed(speeds[(i + 1) % speeds.length]);
        applySpeed();
        notifyChanged();
    }

    private static void applySpeed() {
        if (mp == null || preparing) return;
        try {
            boolean was = mp.isPlaying();
            PlaybackParams pp = mp.getPlaybackParams().setSpeed(Store.speed());
            mp.setPlaybackParams(pp);
            if (!was) mp.pause();
        } catch (Exception ignored) {
        }
    }

    public static void stop() {
        if (mp != null) {
            try { mp.release(); } catch (Exception ignored) { }
        }
        mp = null;
        fileId = null;
        notifyChanged();
    }

    public static boolean active() { return fileId != null; }
    public static boolean isPlaying() { try { return mp != null && !preparing && mp.isPlaying(); } catch (Exception e) { return false; } }
    public static int position() { try { return mp == null || preparing ? 0 : mp.getCurrentPosition(); } catch (Exception e) { return 0; } }
    public static int duration() { try { return mp == null || preparing ? 0 : mp.getDuration(); } catch (Exception e) { return 0; } }

    private static void notifyChanged() {
        if (listener != null) listener.changed();
    }
}
