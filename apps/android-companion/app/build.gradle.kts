plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
 namespace = "id.academicos.companion"
 compileSdk = 35
 defaultConfig { applicationId = "id.academicos.companion"; minSdk = 28; targetSdk = 35; versionCode = 1; versionName = "0.1-probe" }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget = "17" }
}
