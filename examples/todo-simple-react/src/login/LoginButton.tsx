import { ButtonPrimary } from "@primer/react";
import { Dialog } from "@primer/react/lib/Dialog/Dialog";
import { Relay } from "nostr-tools";
import React from "react";
import LoginForm from "./LoginForm";
import { createNostrClient, LoginData } from "./utils";

export const LoginButton = ({
  isOpen,
  setIsOpen,
  onLogin,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onLogin: (loginData: LoginData, client: Relay) => void;
}) => {
  const [loginData, setLoginData] = React.useState<LoginData>();
  const [status, setStatus] = React.useState<"ok" | "loading" | "failed">("ok");
  const openDialog = React.useCallback(() => setIsOpen(true), [setIsOpen]);
  const closeDialog = React.useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const doLogin = React.useCallback(() => {
    setStatus("loading");
    (async () => {
      if (!loginData) {
        throw new Error("loginData should be set at this point");
      }
      try {
        const client = await createNostrClient(loginData!);

        setIsOpen(false);
        onLogin(loginData, client);
        setStatus("ok");
      } catch (e) {
        console.error(e);
        setStatus("failed");
      }
    })();
  }, [setIsOpen, loginData, onLogin]);

  return (
    <>
      <ButtonPrimary onClick={openDialog}>Connect with Nostr</ButtonPrimary>
      {isOpen && (
        <Dialog
          title="Connect with Nostr"
          //   subtitle={
          //     <>
          //       This is a <b>description</b> of the dialog.
          //     </>
          //   }
          renderFooter={(props) => (
            <Dialog.Footer>
              <Dialog.Buttons buttons={props.footerButtons!} />
            </Dialog.Footer>
          )}
          footerButtons={[
            {
              content: "Open room",
              buttonType: "primary",
              disabled: status === "loading",
              onClick: doLogin,
            },
          ]}
          onClose={closeDialog}>
          <LoginForm setLoginData={setLoginData} status={status} />
        </Dialog>
      )}
    </>
  );
};
