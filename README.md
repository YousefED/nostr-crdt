# Nostr CRDT

[![npm version](https://badge.fury.io/js/nostr-crdt.svg)](https://badge.fury.io/js/nostr-crdt) [![Coverage Status](https://coveralls.io/repos/github/YousefED/nostr-crdt/badge.svg?branch=main)](https://coveralls.io/github/YousefED/nostr-crdt?branch=main)

**nostr-crdt** is an experiment to run collaborative (multiplayer) apps over [nostr](https://github.com/nostr-protocol/). CRDT application updates are sent as Nostr events.

The NostrProvider is a sync provider for [Yjs](https://github.com/yjs/yjs), a proven, high performance CRDT implementation.

## TL;DR

Create apps like this:

![screencapture](examples/rich-text-tiptap/richtext.gif)

And connect [Nostr](https://github.com/nostr-protocol/) as transport + storage. Instead of social updates or chat messages, we send an event stream of data model updates (for the rich-text demo for example, these are _document edits_) to Nostr.

## Live demo

In the [examples](examples) directory, you'll find some live examples:

- [Collaborative Todo list](examples/todo-simple-react)
- [Collaborative rich text editing](examples/rich-text-tiptap)

## Motivation

[CRDTs](https://crdt.tech/) (_Conflict-free Replicated Data Types_) make it easy to build **decentralized**, **fast**, **collaborative** **local-first** applications.

> Read more about [the benefits of Local-first software in this essay](https://www.inkandswitch.com/local-first.html)

When building local-first software on top of CRDTs, you probably still need a backend so users can access their data across devices and collaborate with each other.

# Usage

nostr-crdt currently works with [Yjs](https://github.com/yjs/yjs) or [SyncedStore](https://www.syncedstore.org).

## Usage with Yjs

To setup nostr-crdt, 3 steps are needed:

- Create a [Yjs](https://github.com/yjs/yjs) `Y.Doc`
- Connect to a relay using [nostr-tools](https://github.com/nbd-wtf/nostr-tools)
- Create and initialize your nostr-crdt `NostrProvider`

```typescript
import { NostrProvider, createNostrCRDTRoom } from "nostr-crdt";
import { generatePrivateKey, relayInit } from "nostr-tools";
import * as Y from "yjs";

const nostrClient = relayInit("wss://nostr-url");
await nostrClient.connect();
const key = generatePrivateKey();
const ydoc = new Y.Doc();

// Send a first event using Nostr to create a new "room"
const roomId = await createNostrCRDTRoom(doc, nostrClient, key, "demo");

// Create a new Y.Doc and connect the NostrProvider
const nostrProprovidervider = new NostrProvider(
  doc,
  client,
  key,
  roomId,
  "demo"
);
await provider.initialize();

// array of numbers which produce a sum
const yarray = ydoc.getArray("count");

// observe changes of the sum
yarray.observe((event) => {
  // print updates when the data changes
  console.log("new sum: " + yarray.toArray().reduce((a, b) => a + b));
});

// add 1 to the sum
yarray.push([1]); // => "new sum: 1"
```
