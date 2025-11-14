import {Box, Flex, Select, Separator, IconButton, Popover, Text, Switch} from "@radix-ui/themes";
import {useTheme} from "next-themes";
import {MixerHorizontalIcon} from "@radix-ui/react-icons";
import Logo from "../assets/images/postier.svg";
import {useCollectionStore} from "../stores/store";
import {Theme} from "../types/common";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { autoSave, setAutoSave } = useCollectionStore();

  return (
    <Box height="40px">

      <Flex gap="4" align="center">
        <img src={Logo} alt="Postier logo" height="40px" />

        <Popover.Root>
          <Popover.Trigger>
            <IconButton variant="ghost">
              <MixerHorizontalIcon width="18" height="18" />
            </IconButton>
          </Popover.Trigger>
          <Popover.Content width="300px">
            <Flex direction="column" gap="3">
              <Text size="2" weight="bold">Settings</Text>

              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">Theme</Text>
                <Select.Root value={theme || 'system'} onValueChange={(value: Theme) => setTheme(value)}>
                  <Select.Trigger />
                  <Select.Content position="popper">
                    <Select.Item value="system">System</Select.Item>
                    <Select.Item value="dark">Dark</Select.Item>
                    <Select.Item value="light">Light</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>

              <Flex align="center" justify="between">
                <Text size="2">Auto-save on send</Text>
                <Switch checked={autoSave} onCheckedChange={setAutoSave} />
              </Flex>
            </Flex>
          </Popover.Content>
        </Popover.Root>

      </Flex>
      <Separator style={{ width: "100%" }}/>
    </Box>
  )
}
