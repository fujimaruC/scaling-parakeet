plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
 namespace = "id.academicos.companion"
 compileSdk = 35
 defaultConfig { applicationId = "id.academicos.companion"; minSdk = 28; targetSdk = 35; versionCode = 1; versionName = "0.1-probe" }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget = "17" }
 lint { abortOnError = true; checkTestSources = true; fatal.addAll(listOf("NewApi", "InlinedApi")) }
}

// The pinned compiler checks all Kotlin against API 28, excluding host JDK APIs.
val verifyApi28 by tasks.registering(JavaExec::class) {
 classpath = configurations.getByName("kotlinCompilerClasspath")
 mainClass.set("org.jetbrains.kotlin.cli.jvm.K2JVMCompiler")
 val platform = File(android.sdkDirectory, "platforms/android-28/android.jar")
 doFirst {
  check(platform.isFile) { "Install platforms;android-28 before verifyApi28" }
  val output = layout.buildDirectory.dir("api28-surface").get().asFile
  output.deleteRecursively()
  args = listOf("-no-jdk", "-no-stdlib", "-no-reflect", "-jvm-target", "17", "-classpath",
   files(platform, configurations.getByName("debugCompileClasspath")).asPath,
   "-d", output.absolutePath) + fileTree("src/main/java") { include("**/*.kt") }.files.sorted().map { it.absolutePath }
 }
}
val testQueuePrivacy by tasks.registering(JavaExec::class) {
 dependsOn("compileDebugUnitTestKotlin")
 classpath = files(layout.buildDirectory.dir("tmp/kotlin-classes/debugUnitTest"),
  layout.buildDirectory.dir("tmp/kotlin-classes/debug"), configurations.getByName("debugUnitTestRuntimeClasspath"))
 mainClass.set("id.academicos.companion.QueuePrivacyTest")
}
tasks.matching { it.name == "assembleDebug" || it.name == "lint" || it.name == "lintDebug" }.configureEach { dependsOn(verifyApi28) }
tasks.withType<Test>().configureEach {
 dependsOn(verifyApi28, testQueuePrivacy)
 // Standalone main is not a JUnit class; future JUnit tests remain discoverable.
 exclude("**/QueuePrivacyTest*")
}
