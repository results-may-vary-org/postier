import { HttpClient } from "./components/HttpClient";
import {Box, Flex, Theme} from "@radix-ui/themes";
import "./style.css";
import {ThemeProvider} from "next-themes";
import {Header} from "./components/Header";
import {FileTree} from "./components/FileTree";

function App() {
  return (
    // @ts-ignore
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      storageKey="postier-theme"
    >
      <Theme accentColor="tomato" radius="small" style={{ width: '100vw' }}>
        <Header/>
        <Flex>
          <Box width="200px">
            <FileTree/>
          </Box>
          <Box width="100%" p="2">
            <HttpClient/>
          </Box>
        </Flex>
      </Theme>
    </ThemeProvider>
    )
}

export default App
