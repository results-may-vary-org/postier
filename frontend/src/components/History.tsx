import {Box, Flex} from "@radix-ui/themes";
import {Separator} from "@radix-ui/themes/dist/esm";

export function History() {
  return (
    <Flex direction="row" height="100%">
      <Box height="100%" width="95%">
        <h1>History</h1>
      </Box>

      <Box height="100%" width="1px">
        <Separator orientation="vertical" style={{ width: "100%", height: "100%" }}/>
      </Box>
    </Flex>
  )
}
