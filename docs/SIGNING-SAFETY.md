# Preserve the existing phone installation

The delivered APK's public signing-certificate SHA-256 is
`3b761748804cc037f8d22e7cafc46c47b163566b1a16d9c4be722045ba6e3838`.
It differs from the owner's existing key. This is an APK certificate identifier,
not a key or message-content hash. Do not install around that mismatch by
uninstalling, clearing app data, changing package identity, or forcing a downgrade.
Queue/key/pairing state may exist even when the last recorded queue count was zero.

**Chosen path: sign the updated APK with the original owner key.** This preserves
Android's update identity. No key, password, keystore or private signing config
belongs in Git, chat, assets, an archive or a log. A new debug key with the same
certificate name is still a different identity. Exact certificate equality is
checked; signing-key rotation/multiple signers are deliberately not guessed.

## Owner-local preparation

Use the merged source, rather than trusting the old APK's unresolvable embedded
commit string. In a clean owner checkout, build using the already verified SDK/
JDK and the owner's original debug keystore if that is the installed identity:

```bash
cd apps/android-companion
export PATH="$HOME/.local/opt/jdk-17.0.21+9/bin:$PATH"
env ANDROID_HOME=/home/riko/Android/Sdk ./gradlew assembleDebug --no-daemon \
  -Dorg.gradle.java.home="$HOME/.local/opt/jdk-17.0.21+9"
```

This session does not rebuild the existing application. The command is for the
owner's later local signing/update preparation. Default debug signing is suitable
**only if** its certificate matches the installed APK; the preflight decides.

If the original identity is in a separate private keystore, a trusted owner can
sign the built, aligned APK locally, without changing checked-in Gradle config:

```bash
/home/riko/Android/Sdk/build-tools/35.0.0/apksigner sign \
  --ks /private/original-owner.keystore --ks-key-alias ORIGINAL_ALIAS \
  --out /private/owner-signed.apk app/build/outputs/apk/debug/app-debug.apk
```

Substitute local paths/alias only. Let the tool prompt privately for passwords;
do not put them in command arguments, logs or shared environment files. Do not
modify the APK after signing. Run the owner procedure's read-only preflight and
then its explicit install. Platform documentation for these options:
[Android apksigner](https://developer.android.com/tools/apksigner).

## What the preflight proves and refuses

It uses existing SDK 35.0.0 `aapt` and `apksigner`, rather than inventing an APK
manifest/signature parser. It verifies the candidate package/signature, queries
Package Manager including retained/uninstalled records, pulls **only the installed
APK**, and compares the verified single signing certificates. APK readback is
code inspection, not a data-directory backup. No raw queue, private DB or key is
read or copied. General subprocess/ADB output stays in memory and is not printed.

An existing package requires an inspectable base APK and identical signer.
Signature mismatch is a hard block. Missing SDK tools, ambiguous/split packages,
retained data without a readable APK, invalid signatures and unknown package
queries also block. The install function itself repeats the guard; an earlier
successful CLI check is not a permanent authorization. Android Package Manager
still makes the final update decision, and installed-byte readback must match
before launch is credited. There is no uninstall, clear, backup, permission-grant
or downgrade command.

A genuine first install is permitted only when successful package inventory
including retained records and the package-path check agree there is no package.
It is **not** a fallback for a mismatched existing install. Absence is an OS
observation, not a claim about data outside Package Manager's inventory. If the
original key is lost or those observations are unavailable, no preservation-safe
update is claimed: leave the existing installation alone and resolve signing
locally. Never infer safety from a historical zero count.

After installation, owner status/count/pairing checks remain necessary. Matching
certificates and unchanged counts alone do not prove key or pairing preservation.
Real SDK output, signature compatibility and state preservation on the OPPO are
unverified until the owner runs the procedure.
