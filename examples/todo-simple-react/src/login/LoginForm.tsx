import { Box, Flash, FormGroup, InputField, TextInput } from "@primer/react";
import { generatePrivateKey } from "nostr-tools";
import React, { useState } from "react";
import { LoginData } from "./utils";
export default function LoginForm({
  setLoginData,
  status,
}: {
  setLoginData: (data: LoginData) => void;
  status: "loading" | "failed" | "ok";
}) {
  const params = Object.fromEntries(
    new URLSearchParams((window.location.hash || "#").substring(1))
  );

  const [relay, setRelay] = useState(params.relay || "wss://noster.online");
  const [privateKey, setPrivateKey] = useState(generatePrivateKey());
  const [roomId, setRoomId] = useState(params.room || "");

  React.useEffect(() => {
    setLoginData({
      relay,
      privateKey,
      roomId,
    });
  }, [setLoginData, relay, privateKey, roomId]);

  return (
    <div>
      <Box sx={{ maxWidth: 400 }}>
        {status === "failed" && <Flash variant="danger">Sign in failed</Flash>}
        <FormGroup>
          <InputField required>
            <InputField.Label>Relay:</InputField.Label>
            <TextInput
              onChange={(e: any) => setRelay(e.target.value)}
              defaultValue={relay}
            />
          </InputField>
        </FormGroup>
        <FormGroup>
          <InputField required>
            <InputField.Label>User private key:</InputField.Label>
            <TextInput
              onChange={(e: any) => setPrivateKey(e.target.value)}
              defaultValue={privateKey}
            />
          </InputField>
        </FormGroup>
        <FormGroup>
          <InputField>
            <InputField.Label>Event id of "room":</InputField.Label>
            <TextInput
              onChange={(e: any) => setRoomId(e.target.value)}
              defaultValue={roomId}
              placeholder="leave empty to create a new room"
            />
            <InputField.Caption>
              The id of an event that started a collaborative session
            </InputField.Caption>
          </InputField>
        </FormGroup>
      </Box>
    </div>
  );
}
