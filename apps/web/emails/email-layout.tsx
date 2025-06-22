import { getServerUrl } from "@/lib/server-url";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";
import type { PropsWithChildren } from "react";

/**
 * EmailLayout is used to create a layout for your email.
 * @param props.children The children of the layout
 * @param props.disableTailwind If true, the children will be rendered without the Tailwind CSS. It's useful when you want use <Markdown /> tag.
 * @returns
 */
export const EmailLayout = (
  props: PropsWithChildren<{ disableTailwind?: boolean }>,
) => {
  let baseUrl = getServerUrl();

  // Email software can't handle localhost URL
  if (baseUrl.startsWith("http://localhost")) {
    baseUrl = "https://saveit.now";
  }

  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: "#ffffff",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
        }}
      >
        <Container
          style={{
            margin: "0 auto",
            backgroundSize: "contain",
            backgroundPosition: "bottom",
            backgroundRepeat: "no-repeat",
            padding: "1.5rem",
          }}
        >
          <Tailwind>
            <table cellPadding={0} cellSpacing={0}>
              <tr>
                <td className="pr-2">
                  <Img
                    src={`${baseUrl}/images/logo.png`}
                    height={32}
                    className="inline w-auto"
                    alt={`SaveIt.now's logo`}
                  />
                </td>
              </tr>
            </table>
            <Hr className="mt-3 mb-6 border-gray-300" />
          </Tailwind>
          {props.disableTailwind ? (
            props.children
          ) : (
            <Tailwind>{props.children}</Tailwind>
          )}
          <Tailwind>
            <Hr className="mt-12 mb-6 border-gray-300" />

            <Text className="text-sm text-gray-500">
              Melvyn, from SaveIt.now
            </Text>
          </Tailwind>
        </Container>
      </Body>
    </Html>
  );
};
