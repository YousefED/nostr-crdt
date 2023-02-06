import { Box, Checkbox, Heading, Text, TextInput } from "@primer/react";
import { getYjsValue } from "@syncedstore/core";
import { useSyncedStore } from "@syncedstore/react";
import * as Y from "yjs";
import NostrStatusBar from "./NostrStatusBar";
import { globalStore } from "./store";

export default function App() {
  const state = useSyncedStore(globalStore);

  return (
    <Box m={3} maxWidth={600} marginLeft={"auto"} marginRight={"auto"} p={3}>
      {/* This is the top bar with Sign in button and Nostr status
          It also takes care of hooking up the Y.Doc to Nostr.
      */}

      <Heading sx={{ mb: 2 }}>Todo items:</Heading>

      <NostrStatusBar doc={getYjsValue(state) as Y.Doc}>
        <TextInput
          block
          placeholder="Enter a todo item and hit enter"
          type="text"
          name="todo"
          sx={{ marginBottom: 2, marginTop: 2 }}
          onKeyPress={(event: any) => {
            if (event.key === "Enter" && event.target.value) {
              const target = event.target as HTMLInputElement;
              // Add a todo item using the text added in the textfield
              state.todos.push({ completed: false, title: target.value });
              target.value = "";
            }
          }}
        />

        {state.todos.map((todo, i) => {
          return (
            <Box
              as="form"
              sx={{ display: "flex", alignItems: "center" }}
              key={`cb-${i}`}>
              <Checkbox
                id={`cb-${i}`}
                checked={todo.completed}
                onChange={() => (todo.completed = !todo.completed)}
              />
              <Text
                as="label"
                htmlFor={`cb-${i}`}
                sx={{ fontSize: 3, marginLeft: 1 }}>
                {todo.title}
              </Text>
            </Box>
          );
        })}
      </NostrStatusBar>
    </Box>
  );
}
