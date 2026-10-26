import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// Minimalist pure-Node PNG encoder (RGBA 8-bit)
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodeRgbaPng(width, height, rgba) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0; // filter type 0
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Signed distance to a rounded rectangle centered at (cx, cy) with half-size (hx, hy) and radius r
function sdRoundedBox(px, py, cx, cy, hx, hy, r) {
  const qx = Math.abs(px - cx) - hx + r;
  const qy = Math.abs(py - cy) - hy + r;
  const outDist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inDist = Math.min(Math.max(qx, qy), 0);
  return outDist + inDist - r;
}

// Render the minimalist LaCarta Red & White icon at any resolution
function renderLaCartaIconPng(size, options = { circular: false, foregroundOnly: false }) {
  const rgba = Buffer.alloc(size * size * 4);
  const inv = 512 / size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) * inv;
      const py = (y + 0.5) * inv;

      // Background mask (squircle or circle)
      let bgDist = -100;
      if (!options.foregroundOnly) {
        if (options.circular) {
          bgDist = Math.hypot(px - 256, py - 256) - 240;
        } else {
          bgDist = sdRoundedBox(px, py, 256, 256, 236, 236, 104);
        }
      }

      const bgAlpha = options.foregroundOnly
        ? 0
        : Math.max(0, Math.min(1, 0.5 - bgDist / inv));

      // Gradient crimson red (#F43F5E -> #E11D48 -> #9F1239)
      const t = Math.max(0, Math.min(1, (px + py) / 1024));
      const bgR = Math.round(244 * (1 - t) + 159 * t);
      const bgG = Math.round(63 * (1 - t) + 18 * t);
      const bgB = Math.round(94 * (1 - t) + 57 * t);

      // Foreground symbol in normalized 512x512 space
      // Scale slightly smaller if rendering adaptive foreground (safe zone is center 66%)
      const sx = options.foregroundOnly ? (px - 256) * 1.45 + 256 : px;
      const sy = options.foregroundOnly ? (py - 256) * 1.45 + 256 : py;

      // 1. Top cloche handle circle
      const dHandle = Math.hypot(sx - 256, sy - 134) - 22;

      // 2. Cloche dome arch (semicircle above y=272, center 256,272, radius 126)
      const dCircleDome = Math.hypot(sx - 256, sy - 272) - 126;
      const dDome = Math.max(dCircleDome, sy - 272);

      // 3. Base platter line
      const dPlatter = sdRoundedBox(sx, sy, 256, 308, 146, 15, 15);

      // 4. Menu lines on bottom left
      const dLine1 = sdRoundedBox(sx, sy, 206, 360, 62, 11, 11);
      const dLine2 = sdRoundedBox(sx, sy, 186, 398, 42, 11, 11);

      // 5. QR finder square on bottom right (outer ring + center dot)
      const dQrOuter = sdRoundedBox(sx, sy, 340, 380, 34, 34, 12);
      const dQrInner = sdRoundedBox(sx, sy, 340, 380, 20, 20, 5);
      const dQrRing = Math.max(dQrOuter, -dQrInner);
      const dQrDot = sdRoundedBox(sx, sy, 340, 380, 9, 9, 3);

      const dSymbol = Math.min(
        dHandle,
        dDome,
        dPlatter,
        dLine1,
        dLine2,
        dQrRing,
        dQrDot
      );

      const fgAlpha = Math.max(0, Math.min(1, 0.5 - dSymbol / inv));

      const idx = (y * size + x) * 4;
      if (options.foregroundOnly) {
        rgba[idx] = 255;
        rgba[idx + 1] = 255;
        rgba[idx + 2] = 255;
        rgba[idx + 3] = Math.round(fgAlpha * 255);
      } else {
        const outR = Math.round(bgR * (1 - fgAlpha) + 255 * fgAlpha);
        const outG = Math.round(bgG * (1 - fgAlpha) + 255 * fgAlpha);
        const outB = Math.round(bgB * (1 - fgAlpha) + 255 * fgAlpha);
        rgba[idx] = outR;
        rgba[idx + 1] = outG;
        rgba[idx + 2] = outB;
        rgba[idx + 3] = Math.round(bgAlpha * 255);
      }
    }
  }

  return encodeRgbaPng(size, size, rgba);
}

const androidRoot = path.resolve("android/app/src/main");
if (!fs.existsSync(androidRoot)) {
  console.log("Android directory not found, skipping Android native patch.");
  process.exit(0);
}

// 1. Patch AndroidManifest.xml with Camera & GPS permissions
const manifestPath = path.join(androidRoot, "AndroidManifest.xml");
let manifestXml = fs.readFileSync(manifestPath, "utf8");
const permissionsBlock = `
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />`;

if (!manifestXml.includes("android.permission.CAMERA")) {
  manifestXml = manifestXml.replace(
    '<uses-permission android:name="android.permission.INTERNET" />',
    '<uses-permission android:name="android.permission.INTERNET" />' +
      permissionsBlock
  );
  fs.writeFileSync(manifestPath, manifestXml, "utf8");
  console.log("Patched AndroidManifest.xml with CAMERA and LOCATION permissions.");
}

// 2. Patch MainActivity.java to request runtime permissions and grant WebView GPS + Camera
const mainActivityPath = path.join(
  androidRoot,
  "java/com/lacarta/app/MainActivity.java"
);
const mainActivityJava = `package com.lacarta.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private static final int REQ_PERMISSIONS_STARTUP = 1001;
    private static final int REQ_LOCATION_WEBVIEW = 1002;
    private static final int REQ_CAMERA_WEBVIEW = 1003;

    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;
    private PermissionRequest pendingCameraRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureWebViewPermissions();
        requestInitialPermissionsIfNeeded();
    }

    private void requestInitialPermissionsIfNeeded() {
        boolean hasCamera = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        boolean hasFineLoc = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;

        if (!hasCamera || !hasFineLoc) {
            ActivityCompat.requestPermissions(
                this,
                new String[] {
                    Manifest.permission.CAMERA,
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                },
                REQ_PERMISSIONS_STARTUP
            );
        }
    }

    private void configureWebViewPermissions() {
        if (this.bridge == null || this.bridge.getWebView() == null) {
            return;
        }
        WebView webView = this.bridge.getWebView();
        WebSettings settings = webView.getSettings();
        settings.setGeolocationEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        webView.setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                boolean hasLocation =
                    ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                    ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;

                if (hasLocation) {
                    callback.invoke(origin, true, false);
                } else {
                    pendingGeoOrigin = origin;
                    pendingGeoCallback = callback;
                    ActivityCompat.requestPermissions(
                        MainActivity.this,
                        new String[] {
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        },
                        REQ_LOCATION_WEBVIEW
                    );
                }
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                boolean wantsCamera = false;
                for (String res : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) {
                        wantsCamera = true;
                        break;
                    }
                }

                if (!wantsCamera) {
                    request.grant(request.getResources());
                    return;
                }

                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(request.getResources());
                } else {
                    pendingCameraRequest = request;
                    ActivityCompat.requestPermissions(
                        MainActivity.this,
                        new String[] { Manifest.permission.CAMERA },
                        REQ_CAMERA_WEBVIEW
                    );
                }
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == REQ_LOCATION_WEBVIEW && pendingGeoCallback != null) {
            boolean granted = false;
            for (int res : grantResults) {
                if (res == PackageManager.PERMISSION_GRANTED) {
                    granted = true;
                    break;
                }
            }
            pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        } else if (requestCode == REQ_CAMERA_WEBVIEW && pendingCameraRequest != null) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (granted) {
                pendingCameraRequest.grant(pendingCameraRequest.getResources());
            } else {
                pendingCameraRequest.deny();
            }
            pendingCameraRequest = null;
        }
    }
}
`;

fs.mkdirSync(path.dirname(mainActivityPath), { recursive: true });
fs.writeFileSync(mainActivityPath, mainActivityJava, "utf8");
console.log("Wrote MainActivity.java with native WebView GPS & Camera bridges.");

// 3. Generate minimalist crimson-red launcher icons across all Android mipmap folders
const mipmapSpecs = [
  { folder: "mipmap-mdpi", size: 48, fgSize: 108 },
  { folder: "mipmap-hdpi", size: 72, fgSize: 162 },
  { folder: "mipmap-xhdpi", size: 96, fgSize: 216 },
  { folder: "mipmap-xxhdpi", size: 144, fgSize: 324 },
  { folder: "mipmap-xxxhdpi", size: 192, fgSize: 432 },
];

const resDir = path.join(androidRoot, "res");
for (const spec of mipmapSpecs) {
  const dir = path.join(resDir, spec.folder);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(
    path.join(dir, "ic_launcher.png"),
    renderLaCartaIconPng(spec.size, { circular: false, foregroundOnly: false })
  );
  fs.writeFileSync(
    path.join(dir, "ic_launcher_round.png"),
    renderLaCartaIconPng(spec.size, { circular: true, foregroundOnly: false })
  );
  fs.writeFileSync(
    path.join(dir, "ic_launcher_foreground.png"),
    renderLaCartaIconPng(spec.fgSize, { circular: false, foregroundOnly: true })
  );
}

// Update adaptive launcher background color to crimson red (#E11D48)
const bgXmlPath = path.join(resDir, "values/ic_launcher_background.xml");
const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#E11D48</color>
</resources>
`;
fs.mkdirSync(path.dirname(bgXmlPath), { recursive: true });
fs.writeFileSync(bgXmlPath, bgXml, "utf8");
console.log("Generated minimalist red LaCarta launcher icons for Android.");
