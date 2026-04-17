import {Box, Button, Flex, Select, Separator, IconButton, Popover, Text, Switch} from "@radix-ui/themes";
import {ExternalLinkIcon, UpdateIcon, MixerHorizontalIcon} from "@radix-ui/react-icons";
import Logo from "../assets/images/postier.svg";
import {useCollectionStore} from "../stores/store";
import {BUILTIN_THEMES} from "../themes";
import type {PostierTheme} from "../themes";
import {GetThemesDir, OpenInFileManager} from "../../wailsjs/go/main/App";

interface HeaderProps {
  userThemes: PostierTheme[];
  onReloadThemes: () => void;
}

export function Header({ userThemes, onReloadThemes }: HeaderProps) {
  const { autoSave, setAutoSave, selectedThemeId, setSelectedThemeId } = useCollectionStore();

  const handleOpenThemesFolder = async () => {
    const dir = await GetThemesDir();
    await OpenInFileManager(dir);
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
                <Select.Root value={selectedThemeId} onValueChange={setSelectedThemeId}>
                  <Select.Trigger />
                  <Select.Content position="popper">
                    <Select.Group>
                      <Select.Label>Built-in</Select.Label>
                      {BUILTIN_THEMES.map(t => (
                        <Select.Item key={t.id} value={t.id}>{t.name}</Select.Item>
                      ))}
                    </Select.Group>
                    {userThemes.length > 0 && (
                      <Select.Group>
                        <Select.Label>Custom</Select.Label>
                        {userThemes.map(t => (
                          <Select.Item key={t.id} value={t.id}>{t.name}</Select.Item>
                        ))}
                      </Select.Group>
                    )}
                  </Select.Content>
                </Select.Root>

                <Flex gap="2">
                  <Button size="1" variant="soft" onClick={handleOpenThemesFolder}>
                    <ExternalLinkIcon /> Open folder
                  </Button>
                  <Button size="1" variant="soft" onClick={onReloadThemes}>
                    <UpdateIcon /> Reload
                  </Button>
                </Flex>
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
