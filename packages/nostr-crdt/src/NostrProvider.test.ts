import { generatePrivateKey, relayInit } from "nostr-tools";
import { beforeAll, expect, it } from "vitest";
import "websocket-polyfill";
import * as Y from "yjs";
import { createNostrCRDTRoom } from "./createNostrCRDTRoom";
import { InMemoryRelayServer } from "./InMemoryRelayServer";
import { NostrProvider } from "./NostrProvider";

const APP_NAMESPACE = "nostrcrdttest";
// const relays = ["wss://nostr.bongbong.com"];
// const relays = ["ws://localhost:8084"];
const relays = ["wss://nos.lol"];

let _relayServer: InMemoryRelayServer;

beforeAll(() => {
  _relayServer = new InMemoryRelayServer(8084);
});

async function getRoomAndTwoUsers() {
  const alice = {
    privateKey: generatePrivateKey(),
    doc: new Y.Doc(),
    relays,
    client: relayInit(relays[0]),
  };
  await alice.client.connect();
  const roomId = await createNostrCRDTRoom(
    alice.doc,
    alice.client,
    alice.privateKey,
    APP_NAMESPACE
  );

  const bob = {
    privateKey: generatePrivateKey(),
    doc: new Y.Doc(),
    relays,
    client: relayInit(relays[0]),
  };
  await bob.client.connect();
  return {
    roomId,
    alice: {
      ...alice,
      provider: new NostrProvider(
        alice.doc,
        alice.client,
        alice.privateKey,
        roomId,
        APP_NAMESPACE
      ),
    },
    bob: {
      ...bob,
      provider: new NostrProvider(
        bob.doc,
        bob.client,
        bob.privateKey,
        roomId,
        APP_NAMESPACE
      ),
    },
  };
}

it("syncs public room guest", async () => {
  const { alice, bob } = await getRoomAndTwoUsers();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await alice.provider.initialize();
  await bob.provider.initialize();

  alice.doc.getMap("test").set("contents", new Y.Text("hello"));

  //   alice.provider.initialize();
  //   await alice.provider.waitForFlush();
  //   await new Promise((resolve) => setTimeout(resolve, 2000));
  //   bob.provider.initialize();

  await new Promise((resolve) => setTimeout(resolve, 2000));
  // validate initial state
  //   await event.Event.toPromise(bob.provider.onDocumentAvailable);
  expect((bob.doc.getMap("test").get("contents") as any).toJSON()).toEqual(
    "hello"
  );
  expect(bob.doc.getMap("test2")).toBeUndefined;

  // send an update from provider and validate sync
  console.log("Alice sending change");

  alice.doc.getMap("test2").set("key", 1);

  await new Promise((resolve) => setTimeout(resolve, 5000));
  //   await alice.provider.waitForFlush();
  //   await event.Event.toPromise(bob.provider.onReceivedEvents);
  expect(bob.doc.getMap("test2").get("key")).toBe(1);

  // validate bob can write
  console.log("Bob sending change");
  //   expect(bob.provider.canWrite).toBe(true);
  bob.doc.getMap("test3").set("key", 1);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  //   await bob.provider.waitForFlush();
  //   await event.Event.toPromise(alice.provider.onReceivedEvents);
  expect(alice.doc.getMap("test3").get("key")).toBe(1);
  //   expect(bob.provider.canWrite).toBe(true);

  alice.provider.dispose();
  bob.provider.dispose();

  //     const users = await getRoomAndTwoUsers({
  //       bobIsGuest: true,
  //       roomAccess: "public-read-write",
  //     });
  //     await validateOneWaySync(users);
  //   }, 30000);
  //   it("syncs write-only access", async () => {
  //     const users = await getRoomAndTwoUsers({
  //       bobIsGuest: false,
  //       roomAccess: "public-read",
  //     });
  //     await validateOneWaySync(users);
  //   }, 30000);
  //   it("syncs two users writing ", async () => {
  //     const users = await getRoomAndTwoUsers({
  //       bobIsGuest: false,
  //       roomAccess: "public-read-write",
  //     });
  //     await validateTwoWaySync(users);
  //   }, 30000);
  //   it("syncs with intermediate snapshots ", async () => {
  //     const users = await getRoomAndTwoUsers({
  //       bobIsGuest: false,
  //       roomAccess: "public-read-write",
  //     });
  //     const { alice, bob } = users;
  //     const text = new Y.Text("hello");
  //     alice.doc.getMap("test").set("contents", text);
  //     await alice.provider.initialize();
  //     for (let i = 0; i < 100; i++) {
  //       text.insert(text.length, "-" + i);
  //       await alice.provider.waitForFlush();
  //     }
  //     await new Promise((resolve) => setTimeout(resolve, 2000));
  //     await bob.provider.initialize();
  //     const val = bob.doc.getMap("test").get("contents") as any;
  //     expect(val.toJSON()).toEqual(text.toJSON());
  //     expect(bob.provider.totalEventsReceived).toBeLessThan(20);
  //     alice.provider.dispose();
  //     bob.provider.dispose();
}, 300000);
