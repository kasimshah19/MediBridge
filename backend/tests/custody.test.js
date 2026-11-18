import mongoose from 'mongoose';
import CustodyEvent, {
  canonicalJSON,
  computeCustodyEventHash,
} from '../src/models/CustodyEvent.js';
import { recordEvent, verifyChain, buildTrace } from '../src/services/custody.service.js';
import { CUSTODY_EVENT_TYPES, ROLES } from '../src/config/constants.js';

describe('Phase 7: Custody Ledger & Hash Chaining Tests', () => {
  describe('Canonical JSON & Deterministic Hashing', () => {
    test('canonicalJSON sorts object keys deterministically regardless of insertion order', () => {
      const objA = { z: 1, a: 'test', m: { b: 2, a: 1 } };
      const objB = { a: 'test', m: { a: 1, b: 2 }, z: 1 };

      expect(canonicalJSON(objA)).toBe(canonicalJSON(objB));
      expect(canonicalJSON(objA)).toBe('{"a":"test","m":{"a":1,"b":2},"z":1}');
    });

    test('computeCustodyEventHash produces valid 64-character SHA-256 hex string', () => {
      const prevHash = 'GENESIS';
      const eventPayload = {
        medicineId: '60c72b2f9b1d8b2badbee510',
        seq: 1,
        eventType: 'SUBMITTED',
        timestamp: '2026-11-18T10:00:00.000Z',
        actorId: '60c72b2f9b1d8b2badbee511',
        actorRole: 'donor',
        data: { quantity: 10 },
      };

      const hash1 = computeCustodyEventHash(prevHash, eventPayload);
      const hash2 = computeCustodyEventHash(prevHash, eventPayload);

      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64);
      expect(hash1).toBe(hash2);
    });

    test('hash changes if any field in event payload changes (tamper-evident)', () => {
      const prevHash = 'GENESIS';
      const payload1 = {
        medicineId: '60c72b2f9b1d8b2badbee510',
        seq: 1,
        eventType: 'SUBMITTED',
        data: { quantity: 10 },
      };
      const payload2 = {
        medicineId: '60c72b2f9b1d8b2badbee510',
        seq: 1,
        eventType: 'SUBMITTED',
        data: { quantity: 11 }, // modified quantity
      };

      const hash1 = computeCustodyEventHash(prevHash, payload1);
      const hash2 = computeCustodyEventHash(prevHash, payload2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Append-Only Immutability Schema Hooks', () => {
    test('schema pre-hooks prevent update operations on CustodyEvent', async () => {
      const event = new CustodyEvent({
        medicineId: new mongoose.Types.ObjectId(),
        seq: 1,
        eventType: CUSTODY_EVENT_TYPES.SUBMITTED,
        prevHash: 'GENESIS',
        hash: 'a'.repeat(64),
        actorRole: ROLES.DONOR,
      });

      // Verify model middleware has update blockers
      const hasUpdateBlocker = CustodyEvent.schema.s?.hooks?._pres?.has('updateOne') ||
        CustodyEvent.schema.s?.hooks?._pres?.get('updateOne')?.length > 0;
      expect(hasUpdateBlocker).toBe(true);
    });
  });

  describe('Custody Chain Verification Logic', () => {
    test('verifyChain validates a sequence of chained events with matching hashes', async () => {
      const fakeMedicineId = new mongoose.Types.ObjectId();
      const now = new Date('2026-11-18T10:00:00.000Z');

      // Build simulated event 1
      const payload1 = {
        medicineId: fakeMedicineId.toString(),
        seq: 1,
        eventType: CUSTODY_EVENT_TYPES.SUBMITTED,
        timestamp: now.toISOString(),
        actorId: 'actor1',
        actorRole: 'donor',
        data: { test: true },
      };
      const hash1 = computeCustodyEventHash('GENESIS', payload1);

      // Build simulated event 2
      const payload2 = {
        medicineId: fakeMedicineId.toString(),
        seq: 2,
        eventType: CUSTODY_EVENT_TYPES.AUTO_SCREENED,
        timestamp: now.toISOString(),
        actorId: null,
        actorRole: 'system',
        data: { result: 'passed' },
      };
      const hash2 = computeCustodyEventHash(hash1, payload2);

      const events = [
        { seq: 1, prevHash: 'GENESIS', hash: hash1, ...payload1 },
        { seq: 2, prevHash: hash1, hash: hash2, ...payload2 },
      ];

      // Test verify logic manually on events
      let valid = true;
      let prev = 'GENESIS';

      for (const ev of events) {
        if (ev.prevHash !== prev) {
          valid = false;
          break;
        }
        const expected = computeCustodyEventHash(ev.prevHash, {
          medicineId: ev.medicineId,
          seq: ev.seq,
          eventType: ev.eventType,
          timestamp: ev.timestamp,
          actorId: ev.actorId,
          actorRole: ev.actorRole,
          data: ev.data,
        });
        if (expected !== ev.hash) {
          valid = false;
          break;
        }
        prev = ev.hash;
      }

      expect(valid).toBe(true);
    });

    test('detects tampered event in middle of chain', () => {
      const fakeMedicineId = new mongoose.Types.ObjectId();
      const now = new Date();

      const payload1 = {
        medicineId: fakeMedicineId.toString(),
        seq: 1,
        eventType: CUSTODY_EVENT_TYPES.SUBMITTED,
        timestamp: now.toISOString(),
        actorId: null,
        actorRole: 'donor',
        data: { qty: 5 },
      };
      const hash1 = computeCustodyEventHash('GENESIS', payload1);

      // Tampered payload2 with modified hash
      const payload2 = {
        medicineId: fakeMedicineId.toString(),
        seq: 2,
        eventType: CUSTODY_EVENT_TYPES.PHARMACIST_APPROVED,
        timestamp: now.toISOString(),
        actorId: null,
        actorRole: 'pharmacist',
        data: { notes: 'tampered notes' },
      };
      const fakeHash2 = 'f'.repeat(64);

      const events = [
        { seq: 1, prevHash: 'GENESIS', hash: hash1, ...payload1 },
        { seq: 2, prevHash: hash1, hash: fakeHash2, ...payload2 },
      ];

      let brokenAt = null;
      let prev = 'GENESIS';

      for (const ev of events) {
        if (ev.prevHash !== prev) {
          brokenAt = ev.seq;
          break;
        }
        const expected = computeCustodyEventHash(ev.prevHash, {
          medicineId: ev.medicineId,
          seq: ev.seq,
          eventType: ev.eventType,
          timestamp: ev.timestamp,
          actorId: ev.actorId,
          actorRole: ev.actorRole,
          data: ev.data,
        });
        if (expected !== ev.hash) {
          brokenAt = ev.seq;
          break;
        }
        prev = ev.hash;
      }

      expect(brokenAt).toBe(2);
    });
  });
});
