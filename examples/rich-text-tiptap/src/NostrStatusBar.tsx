import { Box, ChoiceInputField, Label, Radio } from "@primer/react";
import { Relay } from "nostr-tools";

import { createNostrCRDTRoom, NostrProvider } from "nostr-crdt";
import React, { useState } from "react";
import * as Y from "yjs";
import { LoginButton } from "./login/LoginButton";
import { LoginData } from "./login/utils";

/**
 * The Top Bar of the app that contains the sign in button and status of the NostrProvider
 */
export default function NostrStatusBar({ doc }: { doc: Y.Doc }) {
  const [isOpen, setIsOpen] = useState(false);
  const [nostrProvider, setNostrProvider] = useState<NostrProvider>();
  const [status, setStatus] = useState<
    "loading" | "failed" | "ok" | "disconnected"
  >();

  const [client, setClient] = useState<Relay>();
  const [loginData, setLoginData] = useState<LoginData>();

  async function createNostrYjsProvider(client: Relay, loginData: LoginData) {
    if (!client || !loginData || !loginData.roomId) {
      throw new Error("can't connect without client or loginData");
    }

    console.log(loginData.roomId);
    // This is the main code that sets up the connection between
    // yjs and Nostr. It creates a new NostrProvider and
    // registers it to the `doc`.
    const newNostrProvider = new NostrProvider(
      doc,
      client,
      loginData.privateKey,
      loginData.roomId,
      "nostrcrdtdemo"
    );
    setStatus("loading");
    await newNostrProvider.initialize();
    setStatus("ok");
    setNostrProvider(newNostrProvider);
  }

  const onNewLoginInfo = React.useCallback(
    async (loginData: LoginData, client: Relay) => {
      if (nostrProvider) {
        nostrProvider.dispose();
        setStatus("disconnected");
        setNostrProvider(undefined);
      }

      if (!loginData.roomId) {
        // create new room
        loginData.roomId = await createNostrCRDTRoom(
          doc,
          client,
          loginData.privateKey,
          "crdtdemo"
        );
      }
      window.history.replaceState(
        undefined,
        "",
        "#room=" +
          encodeURIComponent(loginData.roomId!) +
          "&relay=" +
          encodeURIComponent(loginData.relay)
      );

      console.log(loginData.roomId);
      // (optional) stored on state for easy disconnect + connect toggle
      setClient(client);
      setLoginData(loginData);

      // actually connect
      // createNostrYjsProvider(client, loginData);
    },
    [nostrProvider]
  );

  React.useEffect(() => {
    if (!client || !loginData) {
      return;
    }
    const connect = () => {
      createNostrYjsProvider(client, loginData);
    };

    client.on("connect", connect);

    return () => {
      client.off("connect", connect);
    };
  }, [client, loginData]);

  React.useEffect(() => {
    if (!client || !loginData) {
      return;
    }

    const disconnect = () => {
      if (nostrProvider) {
        nostrProvider.dispose();
        setStatus("disconnected");
        setNostrProvider(undefined);
      }
    };
    client.on("disconnect", disconnect);

    return () => {
      client.off("disconnect", disconnect);
    };
  }, [client, nostrProvider]);

  const onConnectChange = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!client || !loginData) {
        throw new Error("client, roomId and privateKey should be set");
      }

      if (e.target.value === "true") {
        await client.connect();
      } else {
        await client.close();
      }
    },
    [createNostrYjsProvider, client, nostrProvider, loginData]
  );

  return (
    <Box textAlign={"right"}>
      {/* TODO: add options to go offline / webrtc, snapshots etc */}
      {status === undefined && (
        <LoginButton
          onLogin={onNewLoginInfo}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />
      )}
      {client && (
        <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
          <ChoiceInputField>
            <ChoiceInputField.Label>Online</ChoiceInputField.Label>
            <Radio
              name="online"
              value="true"
              defaultChecked={true}
              onChange={onConnectChange}
            />
          </ChoiceInputField>
          <ChoiceInputField>
            <ChoiceInputField.Label>
              Offline (disable sync)
            </ChoiceInputField.Label>
            <Radio
              name="online"
              value="false"
              defaultChecked={false}
              onChange={onConnectChange}
            />
          </ChoiceInputField>
        </fieldset>
      )}
      {status === "loading" && (
        <Label variant="small" outline>
          Connecting with Nostr…
        </Label>
      )}
      {status === "disconnected" && (
        <Label variant="small" outline>
          Disconnected
        </Label>
      )}
      {status === "ok" && (
        <Label
          variant="small"
          outline
          sx={{ borderColor: "success.emphasis", color: "success.fg" }}>
          Connected with Nostr
        </Label>
      )}
      {status === "failed" && (
        <Label
          variant="small"
          outline
          sx={{ borderColor: "danger.emphasis", color: "danger.fg" }}>
          Failed to connect
        </Label>
      )}
      {loginData?.roomId && (
        <Label variant="small" outline>
          Room id: {loginData.roomId}
        </Label>
      )}
    </Box>
  );
}
