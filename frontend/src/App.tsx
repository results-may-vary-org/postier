import { HttpClient } from "./components/HttpClient";
import {Box, Theme} from "@radix-ui/themes";
import "./style.css";
import {ThemeProvider} from "next-themes";

function App() {
  return (
      // @ts-ignore
      <ThemeProvider attribute="class">
        <Theme accentColor="tomato" radius="small" style={{ width: '100vw' }}>
          <Box p="2">
            <HttpClient />
          </Box>
        </Theme>
      </ThemeProvider>
    )
}

export default App
