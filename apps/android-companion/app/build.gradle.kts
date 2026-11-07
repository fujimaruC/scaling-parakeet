plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
 namespace = "id.academicos.companion"
 compileSdk = 35
 defaultConfig { applicationId = "id.academicos.companion"; minSdk = 28; targetSdk = 35; versionCode = 2; versionName = "0.2-native-preview" }
 bundle { language { enableSplit = false } }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget = "17" }
 lint { abortOnError = true; checkTestSources = true; fatal.addAll(listOf("NewApi", "InlinedApi")) }
}

// The pinned compiler checks all Kotlin against API 28, excluding host JDK APIs.
val verifyApi28 by tasks.registering(JavaExec::class) {
 dependsOn("processDebugResources")
 classpath = configurations.getByName("kotlinCompilerClasspath")
 mainClass.set("org.jetbrains.kotlin.cli.jvm.K2JVMCompiler")
 val platform = File(android.sdkDirectory, "platforms/android-28/android.jar")
 doFirst {
  check(platform.isFile) { "Install platforms;android-28 before verifyApi28" }
  val output = layout.buildDirectory.dir("api28-surface").get().asFile
  output.deleteRecursively()
  val production = fileTree("src/main") { include("**/*.kt") }.files
  val checked = fileTree("src/main/java") { include("**/*.kt") }.files
  check(production == checked) { "Production Kotlin outside src/main/java would escape verifyApi28" }
  val appResources = layout.buildDirectory.file("intermediates/compile_and_runtime_not_namespaced_r_class_jar/debug/processDebugResources/R.jar").get().asFile
  check(appResources.isFile) { "Generate application resource constants before verifyApi28" }
  args = listOf("-no-jdk", "-no-stdlib", "-no-reflect", "-jvm-target", "17", "-classpath",
   files(platform, appResources, configurations.getByName("debugCompileClasspath")).asPath,
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

// Build-declared provenance only: a dirty/untracked checkout never names a commit.
val evidenceAssets = layout.buildDirectory.dir("generated/evidenceAssets")
android.sourceSets.getByName("main").assets.srcDir(evidenceAssets)
val evidenceProvenance by tasks.registering {
 doLast {
  fun git(vararg arguments: String): String? = try {
   val process=ProcessBuilder(listOf("git")+arguments).directory(rootProject.projectDir.parentFile.parentFile).redirectError(ProcessBuilder.Redirect.DISCARD).start()
   val text=process.inputStream.bufferedReader().readText().trim()
   if(process.waitFor()==0)text else null
  } catch(_: Exception){null}
  val dirty=git("status","--porcelain")
  val commit=if(dirty=="")git("rev-parse","HEAD") else null
  val output=evidenceAssets.get().asFile;output.mkdirs()
  output.resolve("academic-os-build.json").writeText("{\"source_commit\":"+(commit?.let{"\"$it\""}?:"null")+",\"source_dirty\":"+(dirty!="")+"}")
 }
}
tasks.matching { it.name == "preBuild" }.configureEach { dependsOn(evidenceProvenance) }

// Production policy rules on the JVM, not an Android runtime or UI test.
val testNativePolicy by tasks.registering(JavaExec::class) {
 dependsOn("compileDebugUnitTestKotlin")
 classpath = files(layout.buildDirectory.dir("tmp/kotlin-classes/debugUnitTest"),layout.buildDirectory.dir("tmp/kotlin-classes/debug"),configurations.getByName("debugUnitTestRuntimeClasspath"))
 mainClass.set("id.academicos.companion.NativePolicyTest")
}
tasks.withType<Test>().configureEach { dependsOn(testNativePolicy); exclude("**/NativePolicyTest*") }
