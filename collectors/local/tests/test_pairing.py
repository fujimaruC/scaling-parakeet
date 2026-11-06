import tempfile,unittest,uuid,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from academic_os.core import Store,Invalid
from academic_os.pairing import Pairing
class PairingTests(unittest.TestCase):
 def test_one_device_invite_idempotence_and_revocation_ack(self):
  with tempfile.TemporaryDirectory() as temp:
   store=Store(temp);source=str(uuid.uuid4());store.enroll(source);pair=Pairing(store);invite=pair.invite(source);device=str(uuid.uuid4());result=pair.accept(invite['token'],device)
   self.assertEqual(pair.accept(invite['token'],device),result)
   with self.assertRaises(Invalid):pair.accept(invite['token'],str(uuid.uuid4()))
   self.assertNotIn('secret',pair.status(device));self.assertFalse(pair.status(device)['revoked']);store.purge(source);self.assertTrue(pair.status(device)['revoked']);self.assertTrue(pair.acknowledge_purge(device,2)['acknowledged'])
   with self.assertRaises(Invalid):pair.accept(invite['token'],device)
   store.db.close()
 def test_expired_invite_does_not_create_device(self):
  with tempfile.TemporaryDirectory() as temp:
   store=Store(temp);source=str(uuid.uuid4());store.enroll(source);pair=Pairing(store);invite=pair.invite(source)
   with store.db:store.db.execute('UPDATE pairing_invites SET expires_at=0')
   with self.assertRaises(Invalid):pair.accept(invite['token'],str(uuid.uuid4()))
   self.assertEqual(store.db.execute('SELECT count(*) FROM devices').fetchone()[0],0);store.db.close()
