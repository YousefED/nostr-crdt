import { Relay, relayInit } from "nostr-tools";

export type LoginData = {
  relay: string;
  roomId?: string;
  privateKey: string;
};

export async function createNostrClient(data: LoginData) {
  const relay = relayInit(data.relay);

  const ret = new Promise<Relay>((resolve, reject) => {
    relay.on("connect", () => {
      console.log("connected");
      resolve(relay);
    });
    relay.on("disconnect", () => {
      console.log("disconnected");
    });
    relay.on("error", () => {
      console.warn("error");
      reject("err");
    });
    relay.on("notice", () => {
      console.warn("notice");
    });
  });
  await relay.connect();
  return ret;
}
