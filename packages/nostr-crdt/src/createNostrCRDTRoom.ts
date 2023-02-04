import { toBase64 } from "lib0/buffer";

import {
  Event,
  getEventHash,
  getPublicKey,
  Relay,
  signEvent,
} from "nostr-tools";
import * as Y from "yjs";
import { NOSTR_CRDT_EVENT_TYPE } from "./constants";

export async function createNostrCRDTRoom(
  doc: Y.Doc,
  client: Relay,
  privateKey: string,
  appNameSpace: string
) {
  let initialLocalState = Y.encodeStateAsUpdate(doc);

  let event: Event = {
    kind: NOSTR_CRDT_EVENT_TYPE,
    created_at: Math.floor(Date.now() / 1000),
    // tags: [],
    tags: [["crdt", appNameSpace]],
    content: toBase64(initialLocalState),
    pubkey: getPublicKey(privateKey),
  };

  event.id = getEventHash(event);
  event.sig = signEvent(event, privateKey);

  console.log("create room", event.id);
  const pub = client.publish(event); //, relays);
  pub.on("ok", () => {
    console.log("ok");
  });
  pub.on("failed", () => {
    console.warn("failed");
  });
  pub.on("seen", () => {
    console.log("seen");
  });
  return event.id;
}
