package com.dangvq.vu_family;

import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Giữ màn hình luôn sáng khi ứng dụng đang mở (hữu ích cho cuộc gọi video)
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override
    public void onStart() {
        super.onStart();
        
        // Tối ưu hóa WebView cho các tính năng Media/WebRTC
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebSettings settings = this.bridge.getWebView().getSettings();
            
            // Cho phép tự động phát Audio/Video mà không cần người dùng click (quan trọng cho cuộc gọi đến)
            settings.setMediaPlaybackRequiresUserGesture(false);
            
            // Bật bộ nhớ đệm và các tính năng tăng tốc phần cứng
            settings.setDomStorageEnabled(true);
            settings.setJavaScriptEnabled(true);
        }
    }
}
