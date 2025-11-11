import { HttpClient } from "./components/HttpClient";
import {Box, Theme} from "@radix-ui/themes";
import "./style.css";

function App() {
    return (
      <Theme accentColor="tomato" radius="small" style={{ width: '100vw', height: '100vh' }}>
        <Box p="2">
          <HttpClient />
        </Box>
      </Theme>
    )
}

export default App
