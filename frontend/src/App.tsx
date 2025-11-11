import { HttpClient } from "./components/HttpClient";
import {Box, Theme} from "@radix-ui/themes";
import "./style.css";
import {ThemeProvider} from "next-themes";
import {Header} from "./components/Header";

function App() {
  return (
      // @ts-ignore
      <ThemeProvider attribute="class">
        <Theme accentColor="tomato" radius="small" style={{ width: '100vw' }}>
          <Box p="2">
            <Header />
            <HttpClient />
          </Box>
        </Theme>
      </ThemeProvider>
    )
}

export default App
