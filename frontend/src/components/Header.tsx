import {Box, Flex, Select, Separator, IconButton, Popover, Text, Switch} from "@radix-ui/themes";
import {useTheme} from "next-themes";
import {useEffect, useState} from "react";
import {MixerHorizontalIcon} from "@radix-ui/react-icons";
import Logo from "../assets/images/postier.svg";

export type Theme = 'system' | 'dark' | 'light';
export const AUTO_SAVE_KEY = 'postier-auto-save';

export function Header() {
  const { theme, setTheme } = useTheme();
  const [autoSave, setAutoSave] = useState(true);

  useEffect(() => {
    const savedAutoSave = localStorage.getItem(AUTO_SAVE_KEY);
    if (savedAutoSave !== null) setAutoSave(JSON.parse(savedAutoSave));
  }, []);

  const handleAutoSaveChange = (checked: boolean) => {
    setAutoSave(checked);
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(checked));
  };

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
                <Switch checked={autoSave} onCheckedChange={handleAutoSaveChange} />
              </Flex>
            </Flex>
          </Popover.Content>
        </Popover.Root>

      </Flex>
      <Separator style={{ width: "100%" }}/>
    </Box>
  )
}
