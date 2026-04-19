# Osioloc — Production Release Checklist

## Android Release Keystore

**File location:** `~/Desktop/osioloc-release.keystore` (NOT in git — keep this file safe)

| Field | Value |
|---|---|
| Keystore path | `frontend/android/app/osioloc-release.keystore` |
| Keystore password | `osioloc2024` |
| Key alias | `osioloc` |
| Key password | `osioloc2024` |
| Validity | 10,000 days |
| Algorithm | RSA 2048 |

> **IMPORTANT:** Never lose this keystore file. Google Play locks your app to it permanently — if you lose it you cannot push updates to the same Play Store listing. Back it up to a password manager or secure cloud storage.

To build a signed release APK:
```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
cd frontend/android
./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file=app/osioloc-release.keystore \
  -Pandroid.injected.signing.store.password=osioloc2024 \
  -Pandroid.injected.signing.key.alias=osioloc \
  -Pandroid.injected.signing.key.password=osioloc2024
```

---

## TODO Before App Store Submission

### App Icons + Splash Screen

- [ ] Create a **1024×1024px PNG** — place at `frontend/resources/icon.png`
- [ ] Create a **2732×2732px PNG** — place at `frontend/resources/splash.png`
- [ ] Then run:
  ```bash
  cd frontend
  npx @capacitor/assets generate
  ```
  This auto-generates all required icon and splash sizes for both iOS and Android.

> Design tip: Icon should be the Osioloc logo on a `#82A098` (teal-green) background. No transparency. No rounded corners — the OS applies rounding automatically.

### Apple App Store

- [ ] Apple Developer account enrolled ($99/year at developer.apple.com)
- [ ] App record created in App Store Connect
- [ ] Bundle ID `com.osioloc.app` registered
- [ ] App Privacy details filled in (no data sold, health data collected)
- [ ] At least 3 screenshots per device size (iPhone 6.7", iPhone 6.5", iPad 12.9")
- [ ] Age rating set (4+)
- [ ] Submit for review

### Google Play Store

- [ ] Google Play Console account ($25 one-time at play.google.com/console)
- [ ] App created, package name `com.osioloc.app`
- [ ] Signed AAB uploaded (use `bundleRelease` command above)
- [ ] Store listing: description, screenshots, feature graphic (1024×500px)
- [ ] Data safety form filled (patients enter health data)
- [ ] Target API level 34+ confirmed
- [ ] Submit for review

### Both Stores — Legal Requirements

- [ ] Privacy Policy URL added (required for health apps)
- [ ] Terms of Service URL added
- [ ] `DELETE /api/users/me` endpoint live on production (already built in Phase 11)
- [ ] Delete Account button visible in Account page (already built in Phase 11)

---

## Phase 12 Pre-Flight (AWS Deployment)

- [ ] AWS account created, free tier active
- [ ] `aws configure` done with admin credentials
- [ ] Run `bash scripts/bootstrap-aws.sh` — creates S3 bucket + IAM user + lifecycle policy
- [ ] Firebase service account JSON downloaded → `backend/firebase-service-account.json`
- [ ] All env vars in `backend/.env`
- [ ] EC2 t2.micro + RDS db.t3.micro provisioned (both free for 12 months)
- [ ] `REACT_APP_BACKEND_URL` updated to production EC2 URL in `frontend/.env.local`
- [ ] iOS: `GoogleService-Info.plist` already placed at `frontend/ios/App/App/GoogleService-Info.plist` ✅
- [ ] Android: `google-services.json` already placed at `frontend/android/app/google-services.json` ✅
