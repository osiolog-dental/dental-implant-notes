package com.osioloc.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Enable Chrome DevTools remote debugging for all debug builds.
        // Connect via chrome://inspect on your Mac after running:
        //   adb forward tcp:9222 localabstract:chrome_devtools_remote
        WebView.setWebContentsDebuggingEnabled(true);
    }
}
