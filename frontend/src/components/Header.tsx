import {Box, Flex, Select, Separator} from "@radix-ui/themes";
import {useTheme} from "next-themes";
import Logo from "../assets/images/postier.svg";

export type Theme = 'system' | 'dark' | 'light';

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <Box height="40px">

      <Flex gap="4" align="center">
        <img src={Logo} alt="Postier logo" height="40px" />

        <Select.Root defaultValue="system" value={theme} onValueChange={(value: Theme) => setTheme(value)}>
          <Select.Trigger />
          <Select.Content position="popper">
            <Select.Item value="system">System</Select.Item>
            <Select.Item value="dark">Dark</Select.Item>
            <Select.Item value="light">Light</Select.Item>
          </Select.Content>
        </Select.Root>

      </Flex>
      <Separator style={{ width: "100%" }}/>
    </Box>
  )
}
