import { fromBase64, toBase64 } from "lib0/buffer";
import {
  Event,
  getEventHash,
  getPublicKey,
  Relay,
  signEvent,
  UnsignedEvent,
} from "nostr-tools";
import { event, lifecycle } from "vscode-lib";
import * as Y from "yjs";
import { NOSTR_CRDT_EVENT_TYPE } from "./constants";
import { arrayBuffersAreEqual } from "./util/binary";

export class NostrProvider extends lifecycle.Disposable {
  private disposed = false;

  private readonly _onDocumentAvailable: event.Emitter<void> = this._register(
    new event.Emitter<void>()
  );

  private readonly _onReceivedEvents: event.Emitter<void> = this._register(
    new event.Emitter<void>()
  );

  private publicKey: string;

  public readonly onDocumentAvailable: event.Event<void> =
    this._onDocumentAvailable.event;

  public readonly onReceivedEvents: event.Event<void> =
    this._onReceivedEvents.event;

  public totalEventsReceived = 0;

  public constructor(
    private doc: Y.Doc,
    private nostrRelayPoolClient: Relay,
    private privateKey: string,
    private roomId: string,
    private appNameSpace: string
  ) {
    super();

    this.publicKey = getPublicKey(privateKey);
    doc.on("update", this.documentUpdateListener);
  }

  private publishUpdate(update: Uint8Array) {
    let bareEvent: UnsignedEvent = {
      kind: NOSTR_CRDT_EVENT_TYPE,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["crdt", this.appNameSpace],
        ["e", this.roomId],
      ],
      content: toBase64(update),
      pubkey: this.publicKey,
    };

    let unsignedEvent: UnsignedEvent & { id: string } = {
      ...bareEvent,
      id: getEventHash(bareEvent),
    };
    let event: Event = {
      ...unsignedEvent,
      sig: signEvent(unsignedEvent, this.privateKey),
    };

    console.log("publish", event.id);
    const pub = this.nostrRelayPoolClient.publish(event); //, this.relays);

    console.log("send event", event.id);
    pub.on("ok", (e: any) => {
      console.log("ok");
    });
    pub.on("failed", (e: any) => {
      console.warn("failed");
    });
  }

  private pendingUpdates: Uint8Array[] = [];
  private sendPendingTimeout: any;

  /**
   * Listener for changes to the Yjs document.
   * Forwards changes to Nostr if applicable
   */
  private documentUpdateListener = async (update: Uint8Array, origin: any) => {
    if (origin === this) {
      // these are updates that came in from NostrProvider
      return;
    }
    if (origin?.provider) {
      // update from peer (e.g.: webrtc / websockets). Peer is responsible for sending to Nostr
      return;
    }

    this.pendingUpdates.push(update);

    if (this.sendPendingTimeout) {
      clearTimeout(this.sendPendingTimeout);
    }

    // buffer every 100ms
    this.sendPendingTimeout = setTimeout(() => {
      this.publishUpdate(Y.mergeUpdates(this.pendingUpdates));
      this.pendingUpdates = [];
    }, 100);
  };

  private updateFromEvents = (events: Event[]) => {
    // Create a yjs update from the events
    const updates = events.map((e) => new Uint8Array(fromBase64(e.content)));

    const update = Y.mergeUpdates(updates);
    return update;
  };

  /**
   * Handles incoming events from nostr
   */
  private processIncomingEvents = (events: Event[]) => {
    events.forEach((e) => {
      console.log("received", e.id, "from", e.pubkey, "(i am)", this.publicKey);
    });

    const update = this.updateFromEvents(events);

    const docBefore = this.doc.toJSON();
    Y.applyUpdate(this.doc, update, this);
    const docAfter = this.doc.toJSON();

    console.log(docBefore, "after", docAfter);
  };

  public async initialize() {
    try {
      console.log("create sub", this.roomId);

      let eoseSeen = false;
      let initialEvents: Event[] = [];

      const sub = this.nostrRelayPoolClient.sub([
        {
          ids: [this.roomId],
          // "#crdt": [this.appNameSpace],
          kinds: [NOSTR_CRDT_EVENT_TYPE],
          // since: 0,
          // limit: 1,
        },
        {
          // "#crdt": [this.appNameSpace],
          "#e": [this.roomId],
          kinds: [NOSTR_CRDT_EVENT_TYPE],
        },
      ]);
      sub.on("event", (e: any) => {
        console.log("incoming event", e.id);
        if (!eoseSeen) {
          initialEvents.push(e);
        } else {
          this.processIncomingEvents([e]);
        }
      });
      sub.on("eose", () => {
        eoseSeen = true;
        console.log("incoming eose");
        let initialLocalState = Y.encodeStateAsUpdate(this.doc);
        const initialLocalStateVector =
          Y.encodeStateVectorFromUpdate(initialLocalState);
        const deleteSetOnlyUpdate = Y.diffUpdate(
          initialLocalState,
          initialLocalStateVector
        );

        let oldSnapshot = Y.snapshot(this.doc);
        // This can fail because of no access to room. Because the room history should always be available,
        // we don't catch this event here
        const update = this.updateFromEvents(initialEvents);
        Y.applyUpdate(this.doc, update, this);

        this._onDocumentAvailable.fire();

        // Next, find if there are local changes that haven't been synced to the server
        const remoteStateVector = Y.encodeStateVectorFromUpdate(update);

        const missingOnServer = Y.diffUpdate(
          initialLocalState,
          remoteStateVector
        );

        // missingOnServer will always contain the entire deleteSet on startup.
        // Unfortunately diffUpdate doesn't work well with deletes. In the if-statement
        // below, we try to detect when missingOnServer only contains the deleteSet, with
        // deletes that already exist on the server
        if (
          arrayBuffersAreEqual(
            deleteSetOnlyUpdate.buffer,
            missingOnServer.buffer
          )
        ) {
          // TODO: instead of next 3 lines, we can probably get deleteSet directly from "update"
          let serverDoc = new Y.Doc();
          Y.applyUpdate(serverDoc, update);
          let serverSnapshot = Y.snapshot(serverDoc);
          // TODO: could also compare whether snapshot equal? instead of snapshotContainsAllDeletes?
          if (snapshotContainsAllDeletes(serverSnapshot, oldSnapshot)) {
            // missingOnServer only contains a deleteSet with items that are already in the deleteSet on server
            return;
          }
        }

        if (missingOnServer.length > 2) {
          this.publishUpdate(missingOnServer);
        }
      });
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  public dispose() {
    super.dispose();
    this.disposed = true;
    this.doc.off("update", this.documentUpdateListener);
  }
}

// adapted from yjs snapshot equals function
function snapshotContainsAllDeletes(
  newSnapshot: Y.Snapshot,
  oldSnapshot: Y.Snapshot
) {
  // only contains deleteSet
  for (const [client, dsitems1] of oldSnapshot.ds.clients.entries()) {
    const dsitems2 = newSnapshot.ds.clients.get(client) || [];
    if (dsitems1.length > dsitems2.length) {
      return false;
    }
    for (let i = 0; i < dsitems1.length; i++) {
      const dsitem1 = dsitems1[i];
      const dsitem2 = dsitems2[i];
      if (dsitem1.clock !== dsitem2.clock || dsitem1.len !== dsitem2.len) {
        return false;
      }
    }
  }
  return true;
}
