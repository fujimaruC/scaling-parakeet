package id.academicos.companion.ledger

/** Platform-free conversation identity for the capture selector.
 *
 *  Identity = EXTRA_CONVERSATION_TITLE when present, else EXTRA_TITLE, with a
 *  "(N messages)" counter stripped because WhatsApp mutates it per message.
 *  Deliberately NOT truncated at ": ": a chat genuinely named "Ana: Maria"
 *  would otherwise collapse onto "Ana" and capture a different conversation.
 *  A title whose preview text mutates therefore fails to match, which is the
 *  fail-closed direction. Both sides go through this function, so the value
 *  describeActive() shows the owner is exactly the value compared at capture. */
object CaptureMatch {
 private val COUNT = Regex("\\(\\d+ messages?\\)")
 fun conversation(title: String?, conversationTitle: String?): String? {
  val raw = conversationTitle?.trim()?.takeIf { it.isNotEmpty() } ?: title?.trim()
  if (raw.isNullOrEmpty()) return null
  return COUNT.replace(raw, " ").trim().takeIf { it.isNotEmpty() }
 }
 fun matches(expected: String?, expectedGroup: String?, title: String?, conversationTitle: String?, groupKey: String?): Boolean {
  val want = conversation(expected, null)
  val group = expectedGroup?.trim()
  if (want.isNullOrEmpty() || group.isNullOrEmpty()) return false
  if (groupKey != group) return false
  return conversation(title, conversationTitle) == want
 }
}
